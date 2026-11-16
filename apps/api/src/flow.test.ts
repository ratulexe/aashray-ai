/**
 * End-to-end flow against a real PostgreSQL + PostGIS (PGlite, in memory):
 * seed → zones → draft → two-person approval → dispatch → SMS booking →
 * concurrency → check-in (wrong shelter, success) → expiry → rescue → all clear.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, migrate, type Db } from "@hope/db";
import { DEMO_PERSONAS, seedDemo } from "@hope/db/seed";
import { createApp, loadConfig, type App } from "./context";
import { book, checkIn, runHoldJobs } from "./services/bookings";
import { handleInbound } from "./services/inbound";
import { approveAlert, dispatchBatch, draftAlert, previewAlert, setZones } from "./services/incidents";
import { createRescue } from "./services/rescue";

let db: Db;
let app: App;
let incidentId: string;
const staff: Record<string, string> = {};
const rina = DEMO_PERSONAS[0].phone;

async function drain() {
  while ((await dispatchBatch(app, 200)) > 0) { /* keep sending */ }
}

async function capacity() {
  return db.query<{ code: string; capacity: number; reserved: number; occupied: number; status: string }>(
    `SELECT s.code, c.capacity, c.reserved, c.occupied, c.status FROM shelter_incident_capacity c JOIN shelters s ON s.id = c.shelter_id ORDER BY s.code`,
  );
}

async function lastReply(phone: string) {
  const [m] = await db.query<{ body: string }>(`SELECT body FROM outbound_messages WHERE phone = $1 ORDER BY id DESC LIMIT 1`, [phone]);
  return m?.body ?? "";
}

beforeAll(async () => {
  db = await createDb({ dataDir: "memory" });
  await migrate(db);
  const seeded = await seedDemo(db);
  incidentId = seeded.incidentId;
  app = createApp(db, loadConfig({ HOPE_MODE: "demo" }));
  await app.clock.load(db);
  for (const r of await db.query<{ id: string; email: string }>(`SELECT id, email FROM staff`)) staff[r.email.split("@")[0]!] = r.id;
});

afterAll(async () => {
  await db?.close();
});

describe("demo seed", () => {
  it("creates 7 gram panchayats inside the block, shelters and households", async () => {
    const [areas] = await db.query<{ n: number; inside: number }>(
      `SELECT count(*)::int AS n,
              count(*) FILTER (WHERE ST_CoveredBy(gp.geom, ST_Buffer(b.geom, 0.0001)))::int AS inside
         FROM admin_areas gp, admin_areas b WHERE gp.level = 'gram_panchayat' AND b.level = 'block'`,
    );
    expect(areas).toEqual({ n: 7, inside: 7 });
    const [c] = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM citizens`);
    expect(c?.n).toBe(503);
    expect((await capacity()).length).toBe(8);
  });

  it("only uses the reserved demo phone range", async () => {
    const [bad] = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM citizens WHERE phone !~ '^\\+9100000\\d{5}$'`);
    expect(bad?.n).toBe(0);
  });
});

describe("alerting", () => {
  it("refuses to draft before zones are chosen", async () => {
    await expect(draftAlert(app, staff.coordinator!, incidentId, "warning", "warning")).rejects.toThrow(/affected areas/);
  });

  it("enforces the two-person rule and delivers to everyone in the zones", async () => {
    const gps = await db.query<{ id: number; name: { en: string } }>(`SELECT id, name FROM admin_areas WHERE level = 'gram_panchayat'`);
    const coastal = ["Fraserganj", "Moushuni", "Haripur"];
    await setZones(app, staff.coordinator!, incidentId, gps.map((g) => ({
      areaId: g.id, level: coastal.includes(g.name.en) ? "evacuate" as const : "warning" as const,
    })));

    const alertId = await draftAlert(app, staff.coordinator!, incidentId, "warning", "warning");
    const preview = await previewAlert(app, alertId);
    expect(preview.total).toBe(503);
    for (const t of preview.texts) expect(t.segments).toBeLessThanOrEqual(2);

    await expect(approveAlert(app, staff.coordinator!, alertId)).rejects.toThrow(/different person/);
    const { recipients } = await approveAlert(app, staff.approver!, alertId);
    expect(recipients).toBe(503);
    await drain();

    const [d] = await db.query<{ delivered: number }>(`SELECT count(*) FILTER (WHERE status = 'delivered')::int AS delivered FROM deliveries`);
    expect(d?.delivered).toBe(503);
    // Each household gets its own area's level: Rina (Namkhana) a warning, Salma (Fraserganj) evacuate now.
    expect(await lastReply(rina)).toMatch(/^\[HOPE DEMO\] ঘূর্ণিঝড় সতর্কতা/);
    expect(await lastReply(DEMO_PERSONAS[2].phone)).toContain("तुरंत निकलें");
    const [inc] = await db.query<{ status: string }>(`SELECT status FROM incidents WHERE id = $1`, [incidentId]);
    expect(inc?.status).toBe("active");
  });
});

describe("booking by SMS", () => {
  it("books Rina in Bengali through the conversation engine", async () => {
    await handleInbound(app, "sms", rina, "1");
    expect(await lastReply(rina)).toContain("4 জনের");
    await handleInbound(app, "sms", rina, "১"); // Bengali digit "1" = yes, 4 people
    await handleInbound(app, "sms", rina, "1"); // needs mobility help
    const reply = await lastReply(rina);
    expect(reply).toMatch(/বুকিং হয়েছে/);
    expect(reply).toMatch(/[0-9A-Z]{3}-[0-9A-Z]{3}/);
    const [b] = await db.query<{ people: number; code: string }>(
      `SELECT b.people, s.code FROM bookings b JOIN shelters s ON s.id = b.shelter_id JOIN citizens c ON c.id = b.citizen_id WHERE c.phone = $1`,
      [rina],
    );
    // Needs mobility help → only accessible shelters; nearest strong one is Namkhana A.
    expect(b).toEqual({ people: 4, code: "NMK-A" });
  });

  it("never over-books under concurrent requests", async () => {
    const citizens = await db.query<{ id: string }>(
      `SELECT id FROM citizens WHERE demo_persona IS NULL ORDER BY phone LIMIT 120`,
    );
    // Shrink every shelter so demand exceeds supply.
    await db.query(`UPDATE shelter_incident_capacity SET capacity = greatest(reserved + occupied + 10, 10)`);
    const results = await Promise.all(
      citizens.map((c) => book(app, { citizenId: c.id, people: 3, needsMobilityHelp: false, channel: "sms" })),
    );
    const booked = results.filter((r) => r.status === "booked").length;
    const none = results.filter((r) => r.status === "no_shelter").length;
    expect(booked + none).toBe(120);
    expect(none).toBeGreaterThan(0);
    for (const s of await capacity()) expect(s.reserved + s.occupied).toBeLessThanOrEqual(s.capacity);
    const [sum] = await db.query<{ people: number }>(`SELECT coalesce(sum(people), 0)::int AS people FROM bookings WHERE status = 'held'`);
    const reserved = (await capacity()).reduce((a, s) => a + s.reserved, 0);
    expect(reserved).toBe(sum?.people);
  });
});

describe("check-in", () => {
  it("rejects the wrong shelter, then checks in at the right one", async () => {
    const [b] = await db.query<{ code: string; shelter_id: string }>(
      `SELECT b.code, b.shelter_id FROM bookings b JOIN citizens c ON c.id = b.citizen_id WHERE c.phone = $1`,
      [rina],
    );
    const [other] = await db.query<{ id: string }>(`SELECT id FROM shelters WHERE id <> $1 LIMIT 1`, [b!.shelter_id]);
    expect((await checkIn(app, staff.operator!, b!.code, other!.id)).result).toBe("WRONG_SHELTER");

    const before = (await capacity()).find((s) => s.code === "NMK-A")!;
    const pretty = `${b!.code.slice(0, 3).toLowerCase()}-${b!.code.slice(3).toLowerCase()}`;
    expect((await checkIn(app, staff.operator!, pretty, b!.shelter_id)).result).toBe("CHECKED_IN");
    const after = (await capacity()).find((s) => s.code === "NMK-A")!;
    expect(after.reserved).toBe(before.reserved - 4);
    expect(after.occupied).toBe(before.occupied + 4);
    expect((await checkIn(app, staff.operator!, b!.code, b!.shelter_id)).result).toBe("ALREADY_CHECKED_IN");
  });
});

describe("hold expiry", () => {
  it("releases capacity when holds expire", async () => {
    const reservedBefore = (await capacity()).reduce((a, s) => a + s.reserved, 0);
    expect(reservedBefore).toBeGreaterThan(0);
    await app.clock.advance(db, 7 * 60);
    const { expired } = await runHoldJobs(app);
    expect(expired).toBeGreaterThan(0);
    expect((await capacity()).reduce((a, s) => a + s.reserved, 0)).toBe(0);
  });
});

describe("rescue", () => {
  it("prioritises vulnerable households in evacuate zones", async () => {
    const [salma] = await db.query<{ id: string }>(`SELECT id FROM citizens WHERE demo_persona = 'salma'`);
    const r = await createRescue(app, { citizenId: salma!.id, people: 5, landmark: null, channel: "pwa" });
    const [row] = await db.query<{ priority: number; landmark: string }>(`SELECT priority, landmark FROM rescue_requests WHERE ref = $1`, [r.ref]);
    expect(row).toEqual({ priority: 1, landmark: "Near the old jetty" });
    // A second request returns the open one instead of duplicating.
    expect((await createRescue(app, { citizenId: salma!.id, people: 5, landmark: null, channel: "pwa" })).existing).toBe(true);
  });
});

describe("all clear", () => {
  it("resolves the incident", async () => {
    const id = await draftAlert(app, staff.coordinator!, incidentId, "all_clear", "watch");
    await approveAlert(app, staff.approver!, id);
    await drain();
    const [inc] = await db.query<{ status: string }>(`SELECT status FROM incidents WHERE id = $1`, [incidentId]);
    expect(inc?.status).toBe("resolved");
    expect(await lastReply(rina)).toMatch(/বিপদ কেটে গেছে/);
  });
});
