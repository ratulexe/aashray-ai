import type { Queryable } from "@hope/db";
import type { App } from "../context";
import { currentIncident } from "./incidents";

/** Static map data for the console: areas, outline, shelters, households. */
export async function mapData(q: Queryable) {
  const areas = await q.query<{ id: number; level: string; name: unknown; geojson: string; households: number; vulnerable: number; people: number }>(
    `SELECT a.id, a.level, a.name, ST_AsGeoJSON(a.geom, 5) AS geojson,
            count(c.id)::int AS households,
            count(c.id) FILTER (WHERE h.elderly > 0 OR h.needs_mobility_help)::int AS vulnerable,
            coalesce(sum(h.adults + h.children + h.elderly), 0)::int AS people
       FROM admin_areas a
       LEFT JOIN citizens c ON c.home_area_id = a.id AND c.opted_out_at IS NULL
       LEFT JOIN households h ON h.citizen_id = c.id
      WHERE a.level IN ('block', 'gram_panchayat')
      GROUP BY a.id ORDER BY a.id`,
  );
  const households = await q.query<{ lng: number; lat: number; v: boolean }>(
    `SELECT round(ST_X(c.home_point::geometry)::numeric, 5) AS lng, round(ST_Y(c.home_point::geometry)::numeric, 5) AS lat,
            (h.elderly > 0 OR h.needs_mobility_help) AS v
       FROM citizens c JOIN households h ON h.citizen_id = c.id
      WHERE c.home_point IS NOT NULL AND c.opted_out_at IS NULL`,
  );
  return {
    areas: areas.map((a) => ({ ...a, geometry: JSON.parse(a.geojson) as unknown, geojson: undefined })),
    households: households.map((h) => [h.lng, h.lat, h.v ? 1 : 0]),
  };
}

export async function overview(app: App) {
  const q = app.db;
  const incident = await currentIncident(q);
  const now = app.clock.now();
  if (!incident) return { now, mode: app.config.mode, incident: null };

  const [zones, shelters, alerts, bookingStats, rescueStats, households, timing] = await Promise.all([
    q.query<{ area_id: number; level: string }>(`SELECT area_id, level FROM incident_zones WHERE incident_id = $1`, [incident.id]),
    q.query(
      `SELECT s.id, s.code, s.name, s.kind, ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng,
              s.accessible, s.safe_for, s.safety_score, s.facilities, s.area_id,
              c.status, c.capacity, c.reserved, c.occupied,
              (SELECT count(*)::int FROM bookings b WHERE b.shelter_id = s.id AND b.incident_id = $1 AND b.status = 'held') AS expected_families
         FROM shelters s JOIN shelter_incident_capacity c ON c.shelter_id = s.id AND c.incident_id = $1
        ORDER BY s.code`,
      [incident.id],
    ),
    q.query(
      `SELECT a.id, a.kind, a.level, a.status, a.recipients, a.created_at, a.approved_at, a.sent_at,
              cb.name AS created_by_name, ab.name AS approved_by_name, a.created_by,
              count(d.id) FILTER (WHERE d.status = 'delivered')::int AS delivered,
              count(d.id) FILTER (WHERE d.status = 'failed')::int AS failed,
              count(d.id) FILTER (WHERE d.status = 'queued')::int AS queued,
              coalesce(sum(d.est_cost_paise), 0)::int AS est_cost_paise
         FROM alerts a
         JOIN staff cb ON cb.id = a.created_by
         LEFT JOIN staff ab ON ab.id = a.approved_by
         LEFT JOIN deliveries d ON d.alert_id = a.id
        WHERE a.incident_id = $1 AND a.status <> 'cancelled'
        GROUP BY a.id, cb.name, ab.name
        ORDER BY a.created_at DESC`,
      [incident.id],
    ),
    q.query<{ status: string; n: number; people: number }>(
      `SELECT status, count(*)::int AS n, coalesce(sum(people), 0)::int AS people FROM bookings WHERE incident_id = $1 GROUP BY status`,
      [incident.id],
    ),
    q.query<{ status: string; n: number }>(
      `SELECT status, count(*)::int AS n FROM rescue_requests WHERE incident_id = $1 GROUP BY status`,
      [incident.id],
    ),
    q.query<{ total: number; vulnerable: number; people: number }>(
      `SELECT count(*)::int AS total, count(*) FILTER (WHERE h.elderly > 0 OR h.needs_mobility_help)::int AS vulnerable,
              coalesce(sum(h.adults + h.children + h.elderly), 0)::int AS people
         FROM citizens c JOIN households h ON h.citizen_id = c.id WHERE c.opted_out_at IS NULL`,
    ),
    q.query<{ median_min: number | null; walk_ins: number }>(
      `SELECT (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM b.created_at - first.at) / 60)
                 FROM bookings b,
                      (SELECT min(approved_at) AS at FROM alerts WHERE incident_id = $1 AND kind <> 'all_clear' AND approved_at IS NOT NULL) first
                WHERE b.incident_id = $1 AND first.at IS NOT NULL) AS median_min,
              (SELECT coalesce(sum(people), 0)::int FROM walk_ins WHERE incident_id = $1) AS walk_ins`,
      [incident.id],
    ),
  ]);

  const byStatus = Object.fromEntries(bookingStats.map((b) => [b.status, { families: b.n, people: b.people }]));
  return {
    now,
    mode: app.config.mode,
    incident,
    zones,
    shelters,
    alerts,
    bookings: byStatus,
    rescue: Object.fromEntries(rescueStats.map((r) => [r.status, r.n])),
    households: households[0],
    metrics: {
      medianMinutesToBook: timing[0]?.median_min != null ? Math.round(timing[0].median_min) : null,
      walkIns: timing[0]?.walk_ins ?? 0,
    },
  };
}
