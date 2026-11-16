import { HAZARD_NAMES, LEVEL_NAMES, render, smsSegments } from "@hope/i18n";
import { estimateCostPaise } from "@hope/channels";
import type { Queryable } from "@hope/db";
import { HopeError, LANGS, SEVERITIES, severitiesAtLeast, type Hazard, type Lang, type LocalizedText, type Severity } from "@hope/shared";
import { audit, type App } from "../context";

export interface IncidentRow {
  id: string;
  hazard: Hazard;
  title: string;
  status: "draft" | "active" | "resolved" | "cancelled";
  source: string;
  source_ref: string;
  summary: string | null;
  is_drill: boolean;
  starts_at: Date | null;
  created_at: Date;
}

/** The incident the console works on: latest one that isn't cancelled. */
export async function currentIncident(q: Queryable): Promise<IncidentRow | null> {
  const [row] = await q.query<IncidentRow>(
    `SELECT id, hazard, title, status, source, source_ref, summary, is_drill, starts_at, created_at
       FROM incidents WHERE status <> 'cancelled' ORDER BY created_at DESC LIMIT 1`,
  );
  return row ?? null;
}

export async function getIncident(q: Queryable, id: string): Promise<IncidentRow> {
  const [row] = await q.query<IncidentRow>(
    `SELECT id, hazard, title, status, source, source_ref, summary, is_drill, starts_at, created_at FROM incidents WHERE id = $1`,
    [id],
  );
  if (!row) throw new HopeError("NOT_FOUND", "Incident not found", 404);
  return row;
}

/** Sets the affected zones for an incident from a list of gram panchayats / wards. */
export async function setZones(app: App, staffId: string, incidentId: string, zones: { areaId: number; level: Severity }[]) {
  const incident = await getIncident(app.db, incidentId);
  if (incident.status === "resolved") throw new HopeError("INCIDENT_RESOLVED", "This incident is already resolved");
  await app.db.tx(async (q) => {
    await q.query(`DELETE FROM incident_zones WHERE incident_id = $1`, [incidentId]);
    for (const z of zones) {
      await q.query(
        `INSERT INTO incident_zones (incident_id, level, area_id, geom)
         SELECT $1, $2, id, geom FROM admin_areas WHERE id = $3`,
        [incidentId, z.level, z.areaId],
      );
    }
    await audit(q, app.clock.now(), { type: "staff", id: staffId }, "incident.zones.set", "incident", incidentId, { zones });
  });
}

/** Citizens who should receive an alert at `minLevel` or above, with their zone. */
export function recipientsSql(withSelect: string) {
  return `
    WITH targets AS (
      SELECT DISTINCT ON (c.id) c.id AS citizen_id, c.phone, c.lang, c.channel, z.level AS zone_level,
             a.name AS area_name, h.elderly, h.needs_mobility_help
        FROM citizens c
        JOIN households h ON h.citizen_id = c.id
        JOIN incident_zones z ON z.incident_id = $1 AND z.level = ANY($2::text[])
        LEFT JOIN admin_areas a ON a.id = c.home_area_id
       WHERE c.opted_out_at IS NULL
         AND c.phone_verified_at IS NOT NULL
         AND (z.area_id = c.home_area_id
              OR (c.home_point IS NOT NULL AND ST_Intersects(c.home_point::geometry, z.geom)))
       ORDER BY c.id, CASE z.level WHEN 'evacuate' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END
    )
    ${withSelect}`;
}

/** Every affected area receives an alert; each household gets the wording for its own area's level. */
const ALL_LEVELS = `{${severitiesAtLeast("watch").join(",")}}`;

export async function countRecipients(q: Queryable, incidentId: string) {
  return q.query<{ channel: string; lang: Lang; level: Severity; n: number }>(
    recipientsSql(`SELECT channel, lang, zone_level AS level, count(*)::int AS n FROM targets GROUP BY channel, lang, zone_level`),
    [incidentId, ALL_LEVELS],
  );
}

export type AlertKindInput = "warning" | "evacuate" | "all_clear";

export interface AlertRow {
  id: string;
  incident_id: string;
  kind: string;
  level: Severity;
  status: string;
  recipients: number | null;
  created_by: string;
  created_at: Date;
  approved_by: string | null;
  approved_at: Date | null;
  sent_at: Date | null;
}

/** Text of an alert for one recipient. */
export function alertText(prefix: string, incident: Pick<IncidentRow, "hazard" | "source">, kind: string, level: Severity, lang: Lang, areaName: string) {
  if (kind === "all_clear") return render("all_clear", lang, { area: areaName, source: incident.source }, prefix);
  return render("alert", lang, {
    hazard: HAZARD_NAMES[incident.hazard][lang],
    level: LEVEL_NAMES[level][lang],
    source: incident.source,
    area: areaName,
  }, prefix);
}

export async function draftAlert(app: App, staffId: string, incidentId: string, kind: AlertKindInput, level: Severity) {
  const incident = await getIncident(app.db, incidentId);
  if (incident.status === "resolved") throw new HopeError("INCIDENT_RESOLVED", "This incident is already resolved");
  const zones = await app.db.query<{ level: Severity }>(`SELECT DISTINCT level FROM incident_zones WHERE incident_id = $1`, [incidentId]);
  if (!zones.length) throw new HopeError("NO_ZONES", "Select the affected areas before drafting an alert");
  // The alert's headline level is the most severe level among its areas.
  const highest = SEVERITIES.filter((s) => zones.some((z) => z.level === s)).at(-1)!;
  const effectiveLevel: Severity = kind === "evacuate" ? "evacuate" : kind === "warning" ? highest : level;
  return app.db.tx(async (q) => {
    // Only one open draft per incident keeps the approval queue simple.
    await q.query(`UPDATE alerts SET status = 'cancelled' WHERE incident_id = $1 AND status = 'draft'`, [incidentId]);
    const [row] = await q.query<{ id: string }>(
      `INSERT INTO alerts (incident_id, kind, level, created_by, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [incidentId, kind, kind === "all_clear" ? "watch" : effectiveLevel, staffId, app.clock.now()],
    );
    await audit(q, app.clock.now(), { type: "staff", id: staffId }, "alert.draft", "alert", row!.id, { kind, level: effectiveLevel });
    return row!.id;
  });
}

export async function getAlert(q: Queryable, id: string): Promise<AlertRow> {
  const [row] = await q.query<AlertRow>(`SELECT * FROM alerts WHERE id = $1`, [id]);
  if (!row) throw new HopeError("NOT_FOUND", "Alert not found", 404);
  return row;
}

/** What the approver sees: who receives it, the text in each language, segments and cost. */
export async function previewAlert(app: App, alertId: string) {
  const alert = await getAlert(app.db, alertId);
  const incident = await getIncident(app.db, alert.incident_id);
  const groups = await countRecipients(app.db, alert.incident_id);
  // One sample text per (level, language), using a real area name of that level.
  const samples = await app.db.query<{ level: Severity; name: LocalizedText }>(
    `SELECT DISTINCT ON (z.level) z.level, a.name FROM incident_zones z JOIN admin_areas a ON a.id = z.area_id
      WHERE z.incident_id = $1 ORDER BY z.level, a.id`,
    [alert.incident_id],
  );
  const levels = alert.kind === "all_clear" ? samples.slice(0, 1) : [...samples].sort((a, b) => SEVERITIES.indexOf(b.level) - SEVERITIES.indexOf(a.level));
  const texts = levels.flatMap((s) =>
    LANGS.map((lang) => {
      const text = alertText(app.prefix, incident, alert.kind, s.level, lang, s.name[lang] ?? s.name.en);
      return { lang, level: alert.kind === "all_clear" ? null : s.level, text, ...smsSegments(text) };
    }),
  );
  const total = groups.reduce((s, g) => s + g.n, 0);
  const estCostPaise = groups.reduce((sum, g) => {
    const t = texts.find((x) => x.lang === g.lang && (x.level === null || x.level === g.level))?.text ?? "";
    return sum + g.n * estimateCostPaise(g.channel === "whatsapp" ? "whatsapp" : g.channel === "sms" ? "sms" : "pwa", t);
  }, 0);
  return { alert, incident, total, groups, texts, estCostPaise };
}

/** Second person approves; deliveries are queued for the dispatcher. */
export async function approveAlert(app: App, staffId: string, alertId: string) {
  const now = app.clock.now();
  return app.db.tx(async (q) => {
    const [alert] = await q.query<AlertRow>(`SELECT * FROM alerts WHERE id = $1 FOR UPDATE`, [alertId]);
    if (!alert) throw new HopeError("NOT_FOUND", "Alert not found", 404);
    if (alert.status !== "draft") throw new HopeError("NOT_DRAFT", "This alert is no longer a draft");
    if (alert.created_by === staffId) {
      throw new HopeError("TWO_PERSON_RULE", "A different person must approve this alert", 403);
    }
    await q.query(`UPDATE alerts SET status = 'sending', approved_by = $2, approved_at = $3 WHERE id = $1`, [alertId, staffId, now]);
    const inserted = await q.query<{ n: number }>(
      recipientsSql(`
        , ins AS (
          INSERT INTO deliveries (alert_id, citizen_id, channel, level, provider, priority, created_at, updated_at)
          SELECT $3, citizen_id, channel, zone_level, 'fake',
                 CASE WHEN needs_mobility_help OR elderly > 0 THEN 1 WHEN zone_level = 'evacuate' THEN 2 ELSE 5 END,
                 $4, $4
            FROM targets
          ON CONFLICT DO NOTHING
          RETURNING 1)
        SELECT count(*)::int AS n FROM ins`),
      [alert.incident_id, ALL_LEVELS, alertId, now],
    );
    const recipients = inserted[0]?.n ?? 0;
    await q.query(`UPDATE alerts SET recipients = $2 WHERE id = $1`, [alertId, recipients]);
    if (alert.kind === "all_clear") {
      await q.query(`UPDATE incidents SET status = 'resolved', ends_at = $2 WHERE id = $1`, [alert.incident_id, now]);
      // Open holds are released when the incident ends.
      await releaseAllHolds(q, alert.incident_id, now);
    } else {
      await q.query(`UPDATE incidents SET status = 'active' WHERE id = $1 AND status = 'draft'`, [alert.incident_id]);
    }
    await audit(q, now, { type: "staff", id: staffId }, "alert.approve", "alert", alertId, { recipients });
    return { recipients };
  });
}

async function releaseAllHolds(q: Queryable, incidentId: string, now: Date) {
  await q.query(
    `WITH done AS (
       UPDATE bookings SET status = 'cancelled' WHERE incident_id = $1 AND status = 'held'
       RETURNING shelter_id, people),
     totals AS (SELECT shelter_id, sum(people)::int AS n FROM done GROUP BY shelter_id)
     UPDATE shelter_incident_capacity c SET reserved = c.reserved - t.n, updated_at = $2
       FROM totals t WHERE c.shelter_id = t.shelter_id AND c.incident_id = $1`,
    [incidentId, now],
  );
}

export async function cancelAlert(app: App, staffId: string, alertId: string) {
  const now = app.clock.now();
  await app.db.tx(async (q) => {
    const [alert] = await q.query<AlertRow>(`SELECT * FROM alerts WHERE id = $1 FOR UPDATE`, [alertId]);
    if (!alert) throw new HopeError("NOT_FOUND", "Alert not found", 404);
    if (alert.status === "draft") {
      await q.query(`UPDATE alerts SET status = 'cancelled' WHERE id = $1`, [alertId]);
    } else if (alert.status === "sending") {
      // Kill switch: stop what hasn't gone out yet.
      await q.query(`UPDATE deliveries SET status = 'failed', error = 'STOPPED_BY_STAFF', updated_at = $2 WHERE alert_id = $1 AND status = 'queued'`, [alertId, now]);
      await q.query(`UPDATE alerts SET status = 'sent', sent_at = $2 WHERE id = $1`, [alertId, now]);
    } else {
      throw new HopeError("CANNOT_CANCEL", "This alert has already been sent");
    }
    await audit(q, now, { type: "staff", id: staffId }, "alert.cancel", "alert", alertId, { previous: alert.status });
  });
}

/** Background dispatcher: sends queued deliveries, most vulnerable first. */
export async function dispatchBatch(app: App, batchSize = 40): Promise<number> {
  const rows = await app.db.query<{
    id: number; alert_id: string; phone: string; lang: Lang; channel: "sms" | "whatsapp" | "pwa";
    kind: string; level: Severity; hazard: Hazard; source: string; area_name: LocalizedText | null;
  }>(
    `SELECT d.id, d.alert_id, c.phone, c.lang, d.channel, al.kind, d.level, i.hazard, i.source, ar.name AS area_name
       FROM deliveries d
       JOIN alerts al ON al.id = d.alert_id
       JOIN incidents i ON i.id = al.incident_id
       JOIN citizens c ON c.id = d.citizen_id
       LEFT JOIN admin_areas ar ON ar.id = c.home_area_id
      WHERE d.status = 'queued'
      ORDER BY d.priority, d.id
      LIMIT $1`,
    [batchSize],
  );
  for (const r of rows) {
    const area = r.area_name ? (r.area_name[r.lang] ?? r.area_name.en) : "";
    const body = alertText(app.prefix, { hazard: r.hazard, source: r.source }, r.kind, r.level, r.lang, area);
    const result = await app.adapter.send({ channel: r.channel, phone: r.phone, body, kind: "alert", alertId: r.alert_id });
    await app.db.query(
      `UPDATE deliveries SET status = $2, provider_msg_id = $3, segments = $4, est_cost_paise = $5, error = $6, updated_at = $7 WHERE id = $1`,
      [r.id, result.ok ? "delivered" : "failed", result.providerMessageId, result.segments, estimateCostPaise(r.channel, body), result.error ?? null, app.clock.now()],
    );
  }
  // Mark alerts with nothing left in the queue as sent.
  await app.db.query(
    `UPDATE alerts a SET status = 'sent', sent_at = $1
      WHERE status = 'sending' AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.alert_id = a.id AND d.status = 'queued')`,
    [app.clock.now()],
  );
  return rows.length;
}
