import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { DEMO_PERSONAS, DEMO_STAFF } from "@hope/db/seed";
import { HopeError, RESCUE_STATUSES, normalizePhone, type StaffRole } from "@hope/shared";
import { severitySchema } from "@hope/shared/schemas";
import type { App } from "../context";
import { STAFF_COOKIE, parse, setSessionCookie } from "../server";
import { createStaffSession, endStaffSession, hasRole, staffFromToken, staffLogin, type StaffSession } from "../services/auth";
import { checkIn, recordWalkIn } from "../services/bookings";
import { assertDemo, crowdStatus, resetDemo, startCrowd } from "../services/demo";
import { handleInbound } from "../services/inbound";
import { approveAlert, cancelAlert, currentIncident, draftAlert, previewAlert, setZones } from "../services/incidents";
import { mapData, overview } from "../services/overview";
import { createRescue, updateRescue } from "../services/rescue";

const SESSION_SECONDS = 12 * 3600;
const uuid = z.string().uuid();

export async function staffRoutes(server: FastifyInstance, app: App, hooks: { waitForJobs: () => Promise<void> }) {
  /** Every staff route except login requires a session; `roles` narrows it further. */
  const auth = async (request: FastifyRequest, ...roles: StaffRole[]): Promise<StaffSession> => {
    const staff = await staffFromToken(app, request.cookies[STAFF_COOKIE]);
    if (!staff) throw new HopeError("UNAUTHENTICATED", "Please sign in", 401);
    if (roles.length && !hasRole(staff, ...roles)) {
      throw new HopeError("FORBIDDEN", "Your role doesn't allow this action", 403);
    }
    return staff;
  };

  // ── Session ──
  server.post("/auth/login", async (request, reply) => {
    const { email, password } = parse(z.object({ email: z.string().email(), password: z.string().min(1).max(200) }), request.body);
    const token = await staffLogin(app, email, password);
    setSessionCookie(app, reply, STAFF_COOKIE, token, "/v1/staff", SESSION_SECONDS);
    return { ok: true };
  });

  server.post("/auth/logout", async (request, reply) => {
    await endStaffSession(app, request.cookies[STAFF_COOKIE]);
    reply.clearCookie(STAFF_COOKIE, { path: "/v1/staff" });
    return { ok: true };
  });

  server.get("/me", async (request) => {
    const staff = await auth(request);
    return { staff, mode: app.config.mode };
  });

  // ── Read models ──
  server.get("/overview", async (request) => {
    await auth(request);
    return overview(app);
  });

  server.get("/map", async (request) => {
    await auth(request);
    return mapData(app.db);
  });

  // ── Incident & alerts (coordinator drafts, approver approves) ──
  server.put("/incidents/:id/zones", async (request) => {
    const staff = await auth(request, "coordinator", "admin");
    const { id } = parse(z.object({ id: uuid }), request.params);
    const { zones } = parse(z.object({ zones: z.array(z.object({ areaId: z.number().int(), level: severitySchema })).max(500) }), request.body);
    await setZones(app, staff.id, id, zones);
    return { ok: true };
  });

  server.post("/incidents/:id/alerts", async (request) => {
    const staff = await auth(request, "coordinator");
    const { id } = parse(z.object({ id: uuid }), request.params);
    const body = parse(z.object({ kind: z.enum(["warning", "evacuate", "all_clear"]), level: severitySchema.default("warning") }), request.body);
    const alertId = await draftAlert(app, staff.id, id, body.kind, body.level);
    return { id: alertId };
  });

  server.get("/alerts/:id/preview", async (request) => {
    await auth(request);
    const { id } = parse(z.object({ id: uuid }), request.params);
    return previewAlert(app, id);
  });

  server.post("/alerts/:id/approve", async (request) => {
    const staff = await auth(request, "approver");
    const { id } = parse(z.object({ id: uuid }), request.params);
    return approveAlert(app, staff.id, id);
  });

  server.post("/alerts/:id/cancel", async (request) => {
    const staff = await auth(request, "coordinator", "approver");
    const { id } = parse(z.object({ id: uuid }), request.params);
    await cancelAlert(app, staff.id, id);
    return { ok: true };
  });

  // ── Shelter operations ──
  server.post("/checkin", async (request) => {
    const staff = await auth(request, "shelter_operator");
    const { code, shelterId } = parse(z.object({ code: z.string().min(4).max(12), shelterId: uuid }), request.body);
    return checkIn(app, staff.id, code, shelterId);
  });

  server.post("/walkins", async (request) => {
    const staff = await auth(request, "shelter_operator");
    const { shelterId, people } = parse(z.object({ shelterId: uuid, people: z.number().int().min(1).max(100) }), request.body);
    await recordWalkIn(app, staff.id, shelterId, people);
    return { ok: true };
  });

  server.get("/shelters/:id/arrivals", async (request) => {
    await auth(request, "shelter_operator", "coordinator");
    const { id } = parse(z.object({ id: uuid }), request.params);
    const rows = await app.db.query(
      `SELECT b.code, b.people, b.household, b.status, b.hold_expires_at, b.checked_in_at, b.created_at
         FROM bookings b JOIN incidents i ON i.id = b.incident_id AND i.status = 'active'
        WHERE b.shelter_id = $1 AND b.status IN ('held', 'checked_in')
        ORDER BY (b.status = 'held') DESC, b.hold_expires_at
        LIMIT 200`,
      [id],
    );
    return { arrivals: rows };
  });

  // ── Rescue desk ──
  server.get("/rescue", async (request) => {
    await auth(request, "rescue_desk", "coordinator");
    const incident = await currentIncident(app.db);
    if (!incident) return { requests: [] };
    const rows = await app.db.query(
      `SELECT r.id, r.ref, r.people, r.vulnerable, r.priority, r.status, r.assigned_to, r.landmark, r.channel, r.created_at, r.updated_at,
              r.phone, a.name AS area, ST_Y(r.point::geometry) AS lat, ST_X(r.point::geometry) AS lng
         FROM rescue_requests r LEFT JOIN admin_areas a ON a.id = r.area_id
        WHERE r.incident_id = $1
        ORDER BY (r.status IN ('rescued','closed')), r.priority, r.created_at`,
      [incident.id],
    );
    return { requests: rows };
  });

  server.post("/rescue/:id", async (request) => {
    const staff = await auth(request, "rescue_desk");
    const { id } = parse(z.object({ id: uuid }), request.params);
    const body = parse(z.object({ status: z.enum(RESCUE_STATUSES), team: z.string().trim().max(60).optional() }), request.body);
    await updateRescue(app, staff.id, id, body);
    return { ok: true };
  });

  // ── Audit ──
  server.get("/audit", async (request) => {
    await auth(request, "admin", "coordinator");
    const rows = await app.db.query(
      `SELECT l.id, l.actor_type, l.action, l.entity, l.entity_id, l.detail, l.at, s.name AS actor_name
         FROM audit_log l LEFT JOIN staff s ON l.actor_type = 'staff' AND s.id::text = l.actor_id
        ORDER BY l.id DESC LIMIT 200`,
    );
    return { entries: rows };
  });

  /** Lets the login page know whether to offer demo accounts. No data, no auth. */
  server.get("/config", async () => ({ mode: app.config.mode }));

  // ── Demo mode only ──────────────────────────────────────────────────────
  server.get("/demo/info", async (request) => {
    await auth(request);
    assertDemo(app);
    const bookings = await app.db.query<{ demo_persona: string; code: string; status: string; shelter_id: string; shelter_code: string }>(
      `SELECT DISTINCT ON (c.demo_persona) c.demo_persona, b.code, b.status, b.shelter_id, s.code AS shelter_code
         FROM citizens c JOIN bookings b ON b.citizen_id = c.id JOIN shelters s ON s.id = b.shelter_id
        WHERE c.demo_persona IS NOT NULL ORDER BY c.demo_persona, b.created_at DESC`,
    );
    return {
      staff: DEMO_STAFF.map((s) => ({ key: s.key, name: s.name, email: s.email, roles: s.roles })),
      personas: DEMO_PERSONAS.map((p) => {
        const b = bookings.find((x) => x.demo_persona === p.key);
        return {
          key: p.key, name: p.name, phone: p.phone, lang: p.lang, channel: p.channel, landmark: p.landmark,
          booking: b ? { code: b.code, status: b.status, shelterId: b.shelter_id, shelterCode: b.shelter_code } : null,
        };
      }),
      crowd: crowdStatus(),
      now: app.clock.now(),
    };
  });

  /** Guided tour shortcut: a persona asks for rescue (same service the PWA uses). */
  server.post("/demo/personas/:key/rescue", async (request) => {
    assertDemo(app);
    await auth(request);
    const { key } = parse(z.object({ key: z.enum(["rina", "arjun", "salma"]) }), request.params);
    const { people } = parse(z.object({ people: z.number().int().min(1).max(30).default(5) }), request.body);
    const [c] = await app.db.query<{ id: string }>(`SELECT id FROM citizens WHERE demo_persona = $1`, [key]);
    return createRescue(app, { citizenId: c!.id, people, landmark: null, channel: "pwa" });
  });

  /** Role switcher for the presenter. Demo only — production staff log in individually. */
  server.post("/demo/switch", async (request, reply) => {
    assertDemo(app);
    await auth(request);
    const { key } = parse(z.object({ key: z.enum(DEMO_STAFF.map((s) => s.key) as [string, ...string[]]) }), request.body);
    const email = DEMO_STAFF.find((s) => s.key === key)!.email;
    const [target] = await app.db.query<{ id: string }>(`SELECT id FROM staff WHERE email = $1`, [email]);
    if (!target) throw new HopeError("NOT_FOUND", "Demo account missing; reset the demo", 404);
    await endStaffSession(app, request.cookies[STAFF_COOKIE]);
    const token = await createStaffSession(app, target.id);
    setSessionCookie(app, reply, STAFF_COOKIE, token, "/v1/staff", SESSION_SECONDS);
    return { ok: true };
  });

  server.post("/demo/reset", async (request, reply) => {
    assertDemo(app);
    await auth(request);
    await resetDemo(app, hooks.waitForJobs);
    // Sessions were wiped with the database: sign the presenter back in as coordinator.
    const [coordinator] = await app.db.query<{ id: string }>(`SELECT id FROM staff WHERE email = 'coordinator@demo.hope'`);
    const token = await createStaffSession(app, coordinator!.id);
    setSessionCookie(app, reply, STAFF_COOKIE, token, "/v1/staff", SESSION_SECONDS);
    return { ok: true, now: app.clock.now() };
  });

  server.post("/demo/clock", async (request) => {
    assertDemo(app);
    await auth(request);
    const { minutes } = parse(z.object({ minutes: z.number().int().min(1).max(24 * 60) }), request.body);
    await app.clock.advance(app.db, minutes);
    return { now: app.clock.now() };
  });

  server.post("/demo/crowd", async (request) => {
    assertDemo(app);
    const staff = await auth(request);
    const { size } = parse(z.object({ size: z.number().int().min(1).max(1000).default(500) }), request.body);
    return startCrowd(app, staff.id, size);
  });

  /** Phone simulator: the conversation thread of a demo number. */
  server.get("/demo/phones/:phone/messages", async (request) => {
    assertDemo(app);
    await auth(request);
    const phone = normalizePhone(parse(z.object({ phone: z.string() }), request.params).phone);
    if (!phone) throw new HopeError("INVALID_INPUT", "Invalid phone");
    const rows = await app.db.query(
      `SELECT * FROM (
         SELECT 'out' AS dir, id::text AS id, channel, body, kind, segments, created_at FROM outbound_messages WHERE phone = $1
         UNION ALL
         SELECT 'in' AS dir, 'in-' || id::text AS id, channel, body, intent AS kind, 1 AS segments, received_at AS created_at FROM inbound_messages WHERE phone = $1
       ) t ORDER BY created_at, id LIMIT 200`,
      [phone],
    );
    return { messages: rows };
  });

  /** Phone simulator: the persona types a reply (SMS or WhatsApp). */
  server.post("/demo/phones/:phone/reply", async (request) => {
    assertDemo(app);
    await auth(request);
    const phone = normalizePhone(parse(z.object({ phone: z.string() }), request.params).phone);
    if (!phone) throw new HopeError("INVALID_INPUT", "Invalid phone");
    const { text, channel } = parse(z.object({ text: z.string().trim().min(1).max(320), channel: z.enum(["sms", "whatsapp"]) }), request.body);
    return handleInbound(app, channel, phone, text);
  });
}
