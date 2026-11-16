import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { haversineKm } from "@hope/allocation";
import { HopeError, householdSize, isDemoPhone, type LocalizedText } from "@hope/shared";
import { langSchema, phoneSchema } from "@hope/shared/schemas";
import type { App } from "../context";
import { CITIZEN_COOKIE, parse, setSessionCookie } from "../server";
import { citizenFromToken, endCitizenSession, requestOtp, verifyOtp } from "../services/auth";
import { book, bookingReply, cancelBooking } from "../services/bookings";
import { assertDemo } from "../services/demo";
import { sendMessage, recipientForCitizen } from "../services/messaging";
import { createRescue } from "../services/rescue";
import { randomToken, sha256 } from "@hope/db";

const SESSION_SECONDS = 30 * 86_400;

export async function publicRoutes(server: FastifyInstance, app: App) {
  /**
   * Session token from the cookie, or (demo mode only) a Bearer header: the
   * console shows the citizen app in a cross-site iframe, where browsers block
   * SameSite=Strict cookies.
   */
  const sessionToken = (request: FastifyRequest) => {
    const cookieToken = request.cookies[CITIZEN_COOKIE];
    if (cookieToken || app.config.mode !== "demo") return cookieToken;
    const auth = request.headers.authorization;
    return auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  };

  const requireCitizen = async (request: FastifyRequest) => {
    const id = await citizenFromToken(app, sessionToken(request));
    if (!id) throw new HopeError("UNAUTHENTICATED", "Please sign in", 401);
    return id;
  };

  // ── Sign in with phone + one-time code ──
  server.post("/auth/otp", async (request) => {
    const { phone } = parse(z.object({ phone: phoneSchema }), request.body);
    // Demo: say plainly that real numbers can't sign in (nothing is stored or sent).
    if (app.config.mode === "demo" && !isDemoPhone(phone)) {
      throw new HopeError("DEMO_ONLY", "This is a demo: only the fictional demo numbers can sign in.", 400);
    }
    const result = await requestOtp(app, phone);
    return { sent: true, demoCode: result.demoCode };
  });

  server.post("/auth/verify", async (request, reply) => {
    const { phone, code } = parse(z.object({ phone: phoneSchema, code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") }), request.body);
    const token = await verifyOtp(app, phone, code);
    setSessionCookie(app, reply, CITIZEN_COOKIE, token, "/v1/public", SESSION_SECONDS);
    return { ok: true };
  });

  server.post("/auth/logout", async (request, reply) => {
    await endCitizenSession(app, sessionToken(request));
    reply.clearCookie(CITIZEN_COOKIE, { path: "/v1/public" });
    return { ok: true };
  });

  /** Demo only: sign in as one of the fictional personas without a code. */
  server.post("/demo/login", async (request, reply) => {
    assertDemo(app);
    const { persona } = parse(z.object({ persona: z.enum(["rina", "arjun", "salma"]) }), request.body);
    const [c] = await app.db.query<{ id: string }>(`SELECT id FROM citizens WHERE demo_persona = $1`, [persona]);
    if (!c) throw new HopeError("NOT_FOUND", "Persona not found", 404);
    const token = randomToken();
    await app.db.query(`INSERT INTO citizen_sessions (token_hash, citizen_id, expires_at) VALUES ($1, $2, now() + interval '1 day')`, [sha256(token), c.id]);
    setSessionCookie(app, reply, CITIZEN_COOKIE, token, "/v1/public", 86_400);
    // Also returned so the app can send it as a header inside the console's iframe.
    return { ok: true, token };
  });

  server.get("/config", async () => ({ mode: app.config.mode, now: app.clock.now() }));

  // ── The citizen's whole situation in one call ──
  server.get("/me", async (request) => {
    const citizenId = await requireCitizen(request);
    const [c] = await app.db.query<{
      phone: string; lang: string; channel: string; display_name: string | null; landmark: string | null;
      area: LocalizedText | null; area_id: number | null; adults: number; children: number; elderly: number; pregnant: number;
      disabled: number; needs_mobility_help: boolean; lat: number | null; lng: number | null;
    }>(
      `SELECT c.phone, c.lang, c.channel, c.display_name, c.landmark, a.name AS area, c.home_area_id AS area_id,
              h.adults, h.children, h.elderly, h.pregnant, h.disabled, h.needs_mobility_help,
              ST_Y(coalesce(c.home_point::geometry, ST_PointOnSurface(a.geom))) AS lat,
              ST_X(coalesce(c.home_point::geometry, ST_PointOnSurface(a.geom))) AS lng
         FROM citizens c JOIN households h ON h.citizen_id = c.id LEFT JOIN admin_areas a ON a.id = c.home_area_id
        WHERE c.id = $1`,
      [citizenId],
    );
    if (!c) throw new HopeError("UNAUTHENTICATED", "Please sign in", 401);

    const [incident] = await app.db.query<{ id: string; hazard: string; title: string; source: string; summary: string | null; status: string }>(
      `SELECT id, hazard, title, source, summary, status FROM incidents WHERE status IN ('active','resolved') ORDER BY created_at DESC LIMIT 1`,
    );
    let warning = null;
    if (incident) {
      const [zone] = await app.db.query<{ level: string }>(
        `SELECT z.level FROM incident_zones z JOIN citizens c ON c.id = $2
          WHERE z.incident_id = $1 AND (z.area_id = c.home_area_id OR ST_Intersects(c.home_point::geometry, z.geom))
          ORDER BY CASE z.level WHEN 'evacuate' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END LIMIT 1`,
        [incident.id, citizenId],
      );
      const [lastAlert] = await app.db.query<{ kind: string; sent_at: Date | null; approved_at: Date }>(
        `SELECT a.kind, a.sent_at, a.approved_at FROM alerts a
          JOIN deliveries d ON d.alert_id = a.id AND d.citizen_id = $2
         WHERE a.incident_id = $1 ORDER BY a.approved_at DESC LIMIT 1`,
        [incident.id, citizenId],
      );
      if (lastAlert) {
        warning = {
          incidentId: incident.id, hazard: incident.hazard, title: incident.title, source: incident.source, summary: incident.summary,
          incidentStatus: incident.status, level: zone?.level ?? null, alertKind: lastAlert.kind, at: lastAlert.approved_at,
        };
      }
    }

    const [b] = await app.db.query<{
      code: string; status: string; people: number; hold_expires_at: Date; checked_in_at: Date | null; created_at: Date;
      shelter_id: string; name: LocalizedText; kind: string; lat: number; lng: number; facilities: Record<string, boolean>; accessible: boolean;
    }>(
      `SELECT b.code, b.status, b.people, b.hold_expires_at, b.checked_in_at, b.created_at, s.id AS shelter_id, s.name, s.kind,
              ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng, s.facilities, s.accessible
         FROM bookings b JOIN shelters s ON s.id = b.shelter_id
        WHERE b.citizen_id = $1 ORDER BY b.created_at DESC LIMIT 1`,
      [citizenId],
    );
    const [r] = await app.db.query<{ ref: string; status: string; people: number; assigned_to: string | null; created_at: Date; landmark: string | null }>(
      `SELECT ref, status, people, assigned_to, created_at, landmark FROM rescue_requests WHERE citizen_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [citizenId],
    );

    return {
      now: app.clock.now(),
      mode: app.config.mode,
      citizen: {
        name: c.display_name, phone: c.phone, lang: c.lang, channel: c.channel, landmark: c.landmark, area: c.area,
        location: c.lat != null && c.lng != null ? { lat: c.lat, lng: c.lng } : null,
      },
      household: {
        adults: c.adults, children: c.children, elderly: c.elderly, pregnant: c.pregnant, disabled: c.disabled,
        needsMobilityHelp: c.needs_mobility_help, size: householdSize(c),
      },
      warning,
      booking: b ? {
        code: b.code, status: b.status, people: b.people, holdUntil: b.hold_expires_at, checkedInAt: b.checked_in_at, createdAt: b.created_at,
        shelter: {
          id: b.shelter_id, name: b.name, kind: b.kind, location: { lat: b.lat, lng: b.lng }, facilities: b.facilities, accessible: b.accessible,
          distanceKm: c.lat != null && c.lng != null ? Math.round(haversineKm({ lat: c.lat, lng: c.lng }, { lat: b.lat, lng: b.lng }) * 10) / 10 : null,
        },
      } : null,
      rescue: r ? { ref: r.ref, status: r.status, people: r.people, assignedTo: r.assigned_to, createdAt: r.created_at, landmark: r.landmark } : null,
    };
  });

  server.patch("/me", async (request) => {
    const citizenId = await requireCitizen(request);
    const body = parse(z.object({ lang: langSchema.optional() }), request.body);
    if (body.lang) await app.db.query(`UPDATE citizens SET lang = $2 WHERE id = $1`, [citizenId, body.lang]);
    return { ok: true };
  });

  /** Shelters open for the active incident, nearest first. */
  server.get("/shelters", async (request) => {
    const citizenId = await requireCitizen(request);
    const rows = await app.db.query(
      `SELECT s.id, s.name, s.kind, s.accessible, s.facilities, s.safe_for, ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng,
              cap.status, greatest(cap.capacity - cap.reserved - cap.occupied, 0) AS available, cap.capacity,
              round((ST_Distance(s.location, coalesce(c.home_point, ST_PointOnSurface(a.geom)::geography)) / 1000)::numeric, 1) AS distance_km,
              (i.hazard = ANY(s.safe_for)) AS safe_for_hazard
         FROM incidents i
         JOIN shelter_incident_capacity cap ON cap.incident_id = i.id
         JOIN shelters s ON s.id = cap.shelter_id
         JOIN citizens c ON c.id = $1
         LEFT JOIN admin_areas a ON a.id = c.home_area_id
        WHERE i.status = 'active'
        ORDER BY distance_km
        LIMIT 10`,
      [citizenId],
    );
    return { shelters: rows };
  });

  server.post("/book", async (request) => {
    const citizenId = await requireCitizen(request);
    const body = parse(z.object({ people: z.number().int().min(1).max(30), needsMobilityHelp: z.boolean() }), request.body);
    const outcome = await book(app, { citizenId, people: body.people, needsMobilityHelp: body.needsMobilityHelp, channel: "pwa" });
    const to = await recipientForCitizen(app, citizenId);
    if (to && (outcome.status === "booked")) {
      const reply = bookingReply(outcome, to.lang);
      await sendMessage(app, to, reply.key, reply.vars, "system");
    }
    if (outcome.status === "booked") {
      return { status: outcome.status, code: outcome.code, holdUntil: outcome.holdUntil, shelterName: outcome.shelterName, score: outcome.allocation.best };
    }
    if (outcome.status === "no_shelter") return { status: outcome.status, rejected: outcome.allocation.rejected };
    return outcome;
  });

  server.post("/booking/cancel", async (request) => {
    const citizenId = await requireCitizen(request);
    const cancelled = await cancelBooking(app, citizenId);
    if (!cancelled) throw new HopeError("NO_BOOKING", "You have no active booking", 404);
    return { ok: true };
  });

  server.post("/rescue", async (request) => {
    const citizenId = await requireCitizen(request);
    const body = parse(z.object({
      people: z.number().int().min(1).max(30),
      landmark: z.string().trim().max(160).optional(),
      location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullish(),
    }), request.body);
    const result = await createRescue(app, { citizenId, people: body.people, landmark: body.landmark || null, channel: "pwa", point: body.location });
    return result;
  });

  /** Notifications sent to this citizen in the app (alerts, booking updates). */
  server.get("/messages", async (request) => {
    const citizenId = await requireCitizen(request);
    const rows = await app.db.query(
      `SELECT m.id, m.body, m.kind, m.created_at FROM outbound_messages m JOIN citizens c ON c.phone = m.phone
        WHERE c.id = $1 AND m.channel = 'pwa' ORDER BY m.id DESC LIMIT 30`,
      [citizenId],
    );
    return { messages: rows };
  });
}
