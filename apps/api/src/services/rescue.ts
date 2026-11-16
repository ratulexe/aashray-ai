import { randomInt } from "node:crypto";
import type { Queryable } from "@hope/db";
import { RESCUE_STATUS_NAMES } from "@hope/i18n";
import { HopeError, type Lang, type RescueStatus } from "@hope/shared";
import { audit, type App } from "../context";
import { notifyCitizen } from "./messaging";

export interface RescueInput {
  citizenId: string;
  people: number;
  landmark: string | null;
  channel: string;
  point?: { lat: number; lng: number } | null;
}

/**
 * Priority 1 (most urgent) … 5. Deterministic and explainable:
 * start at 3, one step more urgent for vulnerable people, one more inside an evacuate zone.
 */
export function rescuePriority(input: { vulnerable: boolean; inEvacuateZone: boolean }): number {
  let p = 3;
  if (input.vulnerable) p -= 1;
  if (input.inEvacuateZone) p -= 1;
  return Math.max(1, p);
}

export async function createRescue(app: App, input: RescueInput) {
  const now = app.clock.now();
  const result = await app.db.tx(async (q) => {
    const [incident] = await q.query<{ id: string }>(`SELECT id FROM incidents WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`);
    if (!incident) throw new HopeError("NO_ACTIVE_INCIDENT", "There is no active incident");

    const [open] = await q.query<{ ref: string; status: RescueStatus }>(
      `SELECT ref, status FROM rescue_requests WHERE citizen_id = $1 AND incident_id = $2 AND status IN ('new','triaged','assigned')`,
      [input.citizenId, incident.id],
    );
    if (open) return { ref: open.ref, existing: true };

    const [c] = await q.query<{ phone: string; home_area_id: number | null; elderly: number; disabled: number; needs_mobility_help: boolean; children: number; landmark: string | null }>(
      `SELECT c.phone, c.home_area_id, c.landmark, h.elderly, h.disabled, h.needs_mobility_help, h.children
         FROM citizens c JOIN households h ON h.citizen_id = c.id WHERE c.id = $1`,
      [input.citizenId],
    );
    if (!c) throw new HopeError("NOT_FOUND", "Citizen not found", 404);
    const [zone] = await q.query<{ level: string }>(
      `SELECT z.level FROM incident_zones z JOIN citizens c ON c.id = $2
        WHERE z.incident_id = $1 AND (z.area_id = c.home_area_id OR ST_Intersects(c.home_point::geometry, z.geom))
        ORDER BY CASE z.level WHEN 'evacuate' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END LIMIT 1`,
      [incident.id, input.citizenId],
    );
    const vulnerable = { elderly: c.elderly, disabled: c.disabled, children: c.children, mobility: c.needs_mobility_help };
    const priority = rescuePriority({
      vulnerable: c.elderly > 0 || c.disabled > 0 || c.needs_mobility_help,
      inEvacuateZone: zone?.level === "evacuate",
    });

    let ref = "";
    for (let i = 0; i < 5 && !ref; i++) {
      const candidate = `R-${randomInt(1000, 10000)}`;
      const [taken] = await q.query(`SELECT 1 FROM rescue_requests WHERE ref = $1`, [candidate]);
      if (!taken) ref = candidate;
    }
    const pointSql = input.point ? `ST_SetSRID(ST_MakePoint($10, $11), 4326)::geography` : `(SELECT home_point FROM citizens WHERE id = $2)`;
    const params: unknown[] = [ref, input.citizenId, incident.id, c.phone, c.home_area_id, input.landmark ?? c.landmark,
      input.people, JSON.stringify(vulnerable), priority];
    if (input.point) params.push(input.point.lng, input.point.lat);
    params.push(input.channel, now);
    const chanIdx = params.length - 1;
    const nowIdx = params.length;
    const [row] = await q.query<{ id: string }>(
      `INSERT INTO rescue_requests (ref, citizen_id, incident_id, phone, area_id, landmark, people, vulnerable, priority, point, channel, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, ${pointSql}, $${chanIdx}, $${nowIdx}, $${nowIdx}) RETURNING id`,
      params,
    );
    await audit(q, now, { type: "citizen", id: input.citizenId }, "rescue.create", "rescue_request", row!.id, { priority, people: input.people });
    return { ref, existing: false };
  });
  return result;
}

export async function updateRescue(app: App, staffId: string, id: string, update: { status: RescueStatus; team?: string }) {
  const now = app.clock.now();
  const row = await app.db.tx(async (q) => {
    const [r] = await q.query<{ id: string; ref: string; citizen_id: string | null; status: RescueStatus }>(
      `SELECT id, ref, citizen_id, status FROM rescue_requests WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!r) throw new HopeError("NOT_FOUND", "Rescue request not found", 404);
    if (update.status === "assigned" && !update.team) throw new HopeError("TEAM_REQUIRED", "Choose a team to assign");
    await q.query(
      `UPDATE rescue_requests SET status = $2, assigned_to = coalesce($3, assigned_to), updated_at = $4 WHERE id = $1`,
      [id, update.status, update.team ?? null, now],
    );
    await audit(q, now, { type: "staff", id: staffId }, "rescue.update", "rescue_request", id, update);
    return r;
  });
  if (row.citizen_id) {
    if (update.status === "assigned") await notifyCitizen(app, row.citizen_id, "rescue_assigned", { team: update.team ?? "" });
    else if (update.status === "rescued") await notifyCitizen(app, row.citizen_id, "rescue_done", { ref: row.ref });
  }
}

export async function rescueStatusText(q: Queryable, citizenId: string, lang: Lang) {
  const [r] = await q.query<{ ref: string; status: string }>(
    `SELECT r.ref, r.status FROM rescue_requests r JOIN incidents i ON i.id = r.incident_id
      WHERE r.citizen_id = $1 AND i.status = 'active' ORDER BY r.created_at DESC LIMIT 1`,
    [citizenId],
  );
  if (!r) return null;
  return { ref: r.ref, status: RESCUE_STATUS_NAMES[r.status]?.[lang] ?? r.status };
}
