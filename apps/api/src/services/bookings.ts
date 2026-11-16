import { randomInt } from "node:crypto";
import { allocate, type AllocationResult, type ShelterCandidate } from "@hope/allocation";
import type { Queryable } from "@hope/db";
import type { MessageKey, Vars } from "@hope/i18n";
import {
  CODE_ALPHABET,
  HopeError,
  formatBookingCode,
  normalizeBookingCode,
  pickLang,
  type CheckinResult,
  type Hazard,
  type Lang,
  type LocalizedText,
} from "@hope/shared";
import { audit, formatTime, type App } from "../context";
import { notifyCitizen } from "./messaging";

/** Walking speed assumed for hold times, km/h (families, at night, bad weather). */
const WALK_KMH = 3;
const HOLD_BUFFER_MIN = 60;
const HOLD_MIN_MIN = 90;
const HOLD_MAX_MIN = 360;
const REMIND_BEFORE_MIN = 30;

export function holdMinutes(distanceKm: number): number {
  const travel = (distanceKm / WALK_KMH) * 60;
  return Math.round(Math.min(HOLD_MAX_MIN, Math.max(HOLD_MIN_MIN, travel + HOLD_BUFFER_MIN)));
}

export function newBookingCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

interface CitizenForBooking {
  id: string;
  lang: Lang;
  channel: string;
  lat: number;
  lng: number;
  adults: number;
  children: number;
  elderly: number;
  needs_mobility_help: boolean;
}

async function citizenForBooking(q: Queryable, citizenId: string): Promise<CitizenForBooking> {
  const [row] = await q.query<CitizenForBooking>(
    `SELECT c.id, c.lang, c.channel,
            ST_Y(coalesce(c.home_point::geometry, ST_PointOnSurface(a.geom))) AS lat,
            ST_X(coalesce(c.home_point::geometry, ST_PointOnSurface(a.geom))) AS lng,
            h.adults, h.children, h.elderly, h.needs_mobility_help
       FROM citizens c
       JOIN households h ON h.citizen_id = c.id
       LEFT JOIN admin_areas a ON a.id = c.home_area_id
      WHERE c.id = $1`,
    [citizenId],
  );
  if (!row) throw new HopeError("NOT_FOUND", "Citizen not found", 404);
  return row;
}

export async function shelterCandidates(q: Queryable, incidentId: string, lock = false): Promise<ShelterCandidate[]> {
  const rows = await q.query<{
    id: string; name: LocalizedText; lat: number; lng: number; status: string; capacity: number; reserved: number;
    occupied: number; safe_for: Hazard[]; safety_score: number; accessible: boolean; facilities: Record<string, boolean>;
  }>(
    `SELECT s.id, s.name, ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng,
            c.status, c.capacity, c.reserved, c.occupied, s.safe_for, s.safety_score, s.accessible, s.facilities
       FROM shelter_incident_capacity c
       JOIN shelters s ON s.id = c.shelter_id
      WHERE c.incident_id = $1 AND s.active
      ORDER BY s.code
      ${lock ? "FOR UPDATE OF c" : ""}`,
    [incidentId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name.en,
    location: { lat: r.lat, lng: r.lng },
    status: r.status,
    capacity: r.capacity,
    reserved: r.reserved,
    occupied: r.occupied,
    safeFor: r.safe_for,
    safetyScore: r.safety_score,
    accessible: r.accessible,
    facilities: r.facilities,
  }));
}

export type BookOutcome =
  | { status: "booked"; bookingId: string; code: string; shelterId: string; shelterName: LocalizedText; people: number; holdUntil: Date; allocation: AllocationResult }
  | { status: "already_booked"; code: string; shelterName: LocalizedText; holdUntil: Date }
  | { status: "no_shelter"; allocation: AllocationResult }
  | { status: "no_incident" };

/**
 * Books the best shelter for a household in one transaction.
 * Capacity rows for the incident are locked, so concurrent bookings can never over-book.
 */
export async function book(
  app: App,
  input: { citizenId: string; people: number; needsMobilityHelp: boolean; channel: string },
): Promise<BookOutcome> {
  const now = app.clock.now();
  return app.db.tx(async (q) => {
    const [incident] = await q.query<{ id: string; hazard: Hazard }>(
      `SELECT id, hazard FROM incidents WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`,
    );
    if (!incident) return { status: "no_incident" } as const;

    const [existing] = await q.query<{ code: string; name: LocalizedText; hold_expires_at: Date }>(
      `SELECT b.code, s.name, b.hold_expires_at FROM bookings b JOIN shelters s ON s.id = b.shelter_id
        WHERE b.citizen_id = $1 AND b.incident_id = $2 AND b.status = 'held'`,
      [input.citizenId, incident.id],
    );
    if (existing) {
      return { status: "already_booked", code: existing.code, shelterName: existing.name, holdUntil: existing.hold_expires_at } as const;
    }

    const citizen = await citizenForBooking(q, input.citizenId);
    const candidates = await shelterCandidates(q, incident.id, true);
    const allocation = allocate(candidates, {
      hazard: incident.hazard,
      people: input.people,
      needsMobilityHelp: input.needsMobilityHelp,
      from: { lat: citizen.lat, lng: citizen.lng },
    });
    if (!allocation.best) return { status: "no_shelter", allocation } as const;

    const best = allocation.best;
    const holdUntil = new Date(now.getTime() + holdMinutes(best.distanceKm) * 60_000);
    const household = {
      adults: citizen.adults,
      children: citizen.children,
      elderly: citizen.elderly,
      needsMobilityHelp: input.needsMobilityHelp,
    };

    let bookingId = "";
    let code = "";
    for (let attempt = 0; attempt < 5 && !bookingId; attempt++) {
      code = newBookingCode();
      const rows = await q.query<{ id: string }>(
        `INSERT INTO bookings (code, incident_id, shelter_id, citizen_id, people, household, score, channel, hold_expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
         ON CONFLICT (code) DO NOTHING RETURNING id`,
        [code, incident.id, best.shelterId, input.citizenId, input.people, JSON.stringify(household),
          JSON.stringify({ score: best.score, breakdown: best.breakdown, distanceKm: best.distanceKm }), input.channel, holdUntil, now],
      );
      bookingId = rows[0]?.id ?? "";
    }
    if (!bookingId) throw new HopeError("CODE_COLLISION", "Could not create a booking code, try again", 500);

    await q.query(
      `UPDATE shelter_incident_capacity SET reserved = reserved + $3, updated_at = $4 WHERE shelter_id = $1 AND incident_id = $2`,
      [best.shelterId, incident.id, input.people, now],
    );
    await q.query(
      `UPDATE shelter_incident_capacity SET status = 'full', updated_at = $3
        WHERE shelter_id = $1 AND incident_id = $2 AND status = 'open' AND capacity - reserved - occupied <= 0`,
      [best.shelterId, incident.id, now],
    );
    await audit(q, now, { type: "citizen", id: input.citizenId }, "booking.create", "booking", bookingId, {
      shelterId: best.shelterId, people: input.people, score: best.score,
    });
    const [shelter] = await q.query<{ name: LocalizedText }>(`SELECT name FROM shelters WHERE id = $1`, [best.shelterId]);
    return {
      status: "booked", bookingId, code, shelterId: best.shelterId, shelterName: shelter!.name,
      people: input.people, holdUntil, allocation,
    } as const;
  });
}

/** Renders a booking outcome as the citizen's reply. */
export function bookingReply(outcome: BookOutcome, lang: Lang): { key: MessageKey; vars: Vars } {
  switch (outcome.status) {
    case "booked":
      return { key: "booked" as const, vars: { shelter: pickLang(outcome.shelterName, lang), n: outcome.people, code: formatBookingCode(outcome.code), time: formatTime(outcome.holdUntil) } };
    case "already_booked":
      return { key: "already_booked" as const, vars: { shelter: pickLang(outcome.shelterName, lang), code: formatBookingCode(outcome.code), time: formatTime(outcome.holdUntil) } };
    case "no_shelter":
      return { key: "book_none" as const, vars: {} };
    case "no_incident":
      return { key: "no_active_incident" as const, vars: {} };
  }
}

export async function cancelBooking(app: App, citizenId: string): Promise<{ code: string } | null> {
  const now = app.clock.now();
  return app.db.tx(async (q) => {
    const [b] = await q.query<{ id: string; code: string; shelter_id: string; incident_id: string; people: number }>(
      `SELECT id, code, shelter_id, incident_id, people FROM bookings WHERE citizen_id = $1 AND status = 'held' FOR UPDATE`,
      [citizenId],
    );
    if (!b) return null;
    await q.query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1`, [b.id]);
    await releaseCapacity(q, b.shelter_id, b.incident_id, b.people, now);
    await audit(q, now, { type: "citizen", id: citizenId }, "booking.cancel", "booking", b.id);
    return { code: b.code };
  });
}

async function releaseCapacity(q: Queryable, shelterId: string, incidentId: string, people: number, now: Date) {
  await q.query(
    `UPDATE shelter_incident_capacity
        SET reserved = reserved - $3,
            status = CASE WHEN status = 'full' AND capacity - (reserved - $3) - occupied > 0 THEN 'open' ELSE status END,
            updated_at = $4
      WHERE shelter_id = $1 AND incident_id = $2`,
    [shelterId, incidentId, people, now],
  );
}

export interface CheckinOutcome {
  result: CheckinResult;
  booking?: {
    code: string; people: number; household: unknown; shelterId: string; shelterName: LocalizedText; status: string;
    holdUntil: Date; checkedInAt: Date | null;
  };
}

/** Shelter operator checks a family in by booking code. */
export async function checkIn(app: App, staffId: string | null, rawCode: string, shelterId: string): Promise<CheckinOutcome> {
  const code = normalizeBookingCode(rawCode);
  const now = app.clock.now();
  const outcome: CheckinOutcome & { citizenId?: string } = await app.db.tx(async (q) => {
    const [b] = await q.query<{
      id: string; code: string; status: string; shelter_id: string; incident_id: string; people: number; household: unknown;
      hold_expires_at: Date; checked_in_at: Date | null; citizen_id: string; name: LocalizedText; incident_status: string;
    }>(
      `SELECT b.*, s.name, i.status AS incident_status
         FROM bookings b JOIN shelters s ON s.id = b.shelter_id JOIN incidents i ON i.id = b.incident_id
        WHERE b.code = $1 FOR UPDATE OF b`,
      [code],
    );
    if (!b) return { result: "NOT_FOUND" as const };
    const booking = {
      code: b.code, people: b.people, household: b.household, shelterId: b.shelter_id, shelterName: b.name,
      status: b.status, holdUntil: b.hold_expires_at, checkedInAt: b.checked_in_at,
    };
    if (b.incident_status !== "active") return { result: "WRONG_INCIDENT" as const, booking };
    if (b.shelter_id !== shelterId) return { result: "WRONG_SHELTER" as const, booking };
    if (b.status === "checked_in") return { result: "ALREADY_CHECKED_IN" as const, booking };
    if (b.status === "cancelled" || b.status === "moved") return { result: "CANCELLED" as const, booking };
    if (b.status === "expired" || b.hold_expires_at.getTime() < now.getTime()) {
      return { result: "EXPIRED" as const, booking };
    }
    await q.query(`UPDATE bookings SET status = 'checked_in', checked_in_at = $2, checked_in_by = $3 WHERE id = $1`, [b.id, now, staffId]);
    await q.query(
      `UPDATE shelter_incident_capacity SET reserved = reserved - $3, occupied = occupied + $3, updated_at = $4
        WHERE shelter_id = $1 AND incident_id = $2`,
      [b.shelter_id, b.incident_id, b.people, now],
    );
    await audit(q, now, { type: staffId ? "staff" : "system", id: staffId }, "booking.checkin", "booking", b.id, { shelterId });
    return { result: "CHECKED_IN" as const, booking: { ...booking, status: "checked_in", checkedInAt: now }, citizenId: b.citizen_id };
  });

  // Messages go out only after the transaction has committed.
  if (outcome.result === "CHECKED_IN" && outcome.citizenId && outcome.booking) {
    const [c] = await app.db.query<{ lang: Lang }>(`SELECT lang FROM citizens WHERE id = $1`, [outcome.citizenId]);
    await notifyCitizen(app, outcome.citizenId, "checked_in", { shelter: pickLang(outcome.booking.shelterName, c?.lang ?? "en") });
  }
  return { result: outcome.result, booking: outcome.booking };
}

/** People who arrive without a booking still take space. */
export async function recordWalkIn(app: App, staffId: string, shelterId: string, people: number) {
  const now = app.clock.now();
  return app.db.tx(async (q) => {
    const [incident] = await q.query<{ id: string }>(`SELECT id FROM incidents WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`);
    if (!incident) throw new HopeError("NO_ACTIVE_INCIDENT", "There is no active incident");
    const [cap] = await q.query<{ capacity: number; reserved: number; occupied: number }>(
      `SELECT capacity, reserved, occupied FROM shelter_incident_capacity WHERE shelter_id = $1 AND incident_id = $2 FOR UPDATE`,
      [shelterId, incident.id],
    );
    if (!cap) throw new HopeError("NOT_FOUND", "Shelter is not part of this incident", 404);
    if (cap.reserved + cap.occupied + people > cap.capacity) {
      throw new HopeError("OVER_CAPACITY", "This would exceed the shelter's capacity. Ask a coordinator to raise capacity or redirect people.", 409);
    }
    await q.query(`INSERT INTO walk_ins (incident_id, shelter_id, people, recorded_by, created_at) VALUES ($1, $2, $3, $4, $5)`, [incident.id, shelterId, people, staffId, now]);
    await q.query(
      `UPDATE shelter_incident_capacity
          SET occupied = occupied + $3, updated_at = $4,
              status = CASE WHEN capacity - reserved - (occupied + $3) <= 0 AND status = 'open' THEN 'full' ELSE status END
        WHERE shelter_id = $1 AND incident_id = $2`,
      [shelterId, incident.id, people, now],
    );
    await audit(q, now, { type: "staff", id: staffId }, "shelter.walk_in", "shelter", shelterId, { people });
  });
}

/** Releases expired holds and sends reminders. Runs every few seconds. */
export async function runHoldJobs(app: App) {
  const now = app.clock.now();
  const expired = await app.db.tx(async (q) => {
    const rows = await q.query<{ id: string; citizen_id: string; code: string; shelter_id: string; incident_id: string; people: number }>(
      `UPDATE bookings SET status = 'expired'
        WHERE status = 'held' AND hold_expires_at < $1
        RETURNING id, citizen_id, code, shelter_id, incident_id, people`,
      [now],
    );
    for (const b of rows) {
      await releaseCapacity(q, b.shelter_id, b.incident_id, b.people, now);
      await audit(q, now, { type: "system" }, "booking.expire", "booking", b.id);
    }
    return rows;
  });
  for (const b of expired) await notifyCitizen(app, b.citizen_id, "expired", { code: formatBookingCode(b.code) });

  const due = await app.db.query<{ id: string; citizen_id: string; code: string; name: LocalizedText; hold_expires_at: Date; lang: Lang }>(
    `UPDATE bookings b SET reminded_at = $1
       FROM shelters s, citizens c
      WHERE s.id = b.shelter_id AND c.id = b.citizen_id
        AND b.status = 'held' AND b.reminded_at IS NULL
        AND b.hold_expires_at - make_interval(mins => $2) < $1
        AND b.created_at < $1 - make_interval(mins => 5)
      RETURNING b.id, b.citizen_id, b.code, s.name, b.hold_expires_at, c.lang`,
    [now, REMIND_BEFORE_MIN],
  );
  for (const b of due) {
    await notifyCitizen(app, b.citizen_id, "hold_reminder", {
      shelter: pickLang(b.name, b.lang), time: formatTime(b.hold_expires_at), code: formatBookingCode(b.code),
    });
  }
  return { expired: expired.length, reminded: due.length };
}
