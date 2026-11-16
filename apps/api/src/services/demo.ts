/**
 * Demo-only services: reset, crowd simulator and simulated arrivals.
 * Every function here refuses to run unless HOPE_MODE=demo.
 */
import { resetSchema } from "@hope/db";
import { DEMO_SEED, rng, seedDemo } from "@hope/db/seed";
import { HopeError } from "@hope/shared";
import { audit, type App } from "../context";
import { checkIn } from "./bookings";
import { handleInbound } from "./inbound";

export function assertDemo(app: App) {
  if (app.config.mode !== "demo") throw new HopeError("NOT_FOUND", "Not found", 404);
}

interface CrowdState {
  running: boolean;
  total: number;
  processed: number;
  /** citizenId → minutes after booking when the family arrives (absent = no-show). */
  arrivals: Map<string, number>;
}

const crowd: CrowdState = { running: false, total: 0, processed: 0, arrivals: new Map() };

export function crowdStatus() {
  return { running: crowd.running, total: crowd.total, processed: crowd.processed, arrivalsPlanned: crowd.arrivals.size };
}

export async function resetDemo(app: App, waitForJobs: () => Promise<void>) {
  assertDemo(app);
  app.paused = true;
  crowd.running = false;
  try {
    await waitForJobs();
    await resetSchema(app.db);
    await seedDemo(app.db);
    await app.clock.load(app.db);
    crowd.total = 0;
    crowd.processed = 0;
    crowd.arrivals.clear();
  } finally {
    app.paused = false;
  }
}

/**
 * Simulates every alerted household replying over ~25 seconds.
 * Each reply goes through the real conversation engine and booking logic.
 *
 * Behaviour (fixed seed): ~60% book, ~5% ask for rescue, the rest don't reply.
 * Of those who book, ~85% arrive 20–110 demo-minutes later; ~15% never show (their hold expires).
 */
export async function startCrowd(app: App, staffId: string, size = 500) {
  assertDemo(app);
  if (crowd.running) throw new HopeError("ALREADY_RUNNING", "The crowd simulator is already running", 409);
  const people = await app.db.query<{ id: string; phone: string; channel: "sms" | "whatsapp" | "pwa"; needs: boolean }>(
    `SELECT DISTINCT c.id, c.phone, c.channel, h.needs_mobility_help AS needs
       FROM citizens c
       JOIN households h ON h.citizen_id = c.id
       JOIN deliveries d ON d.citizen_id = c.id AND d.status = 'delivered'
       JOIN alerts a ON a.id = d.alert_id
       JOIN incidents i ON i.id = a.incident_id AND i.status = 'active'
      WHERE c.demo_persona IS NULL
      ORDER BY c.phone`,
  );
  if (people.length === 0) throw new HopeError("NO_RECIPIENTS", "Send an alert first: the crowd replies to it");

  const random = rng(DEMO_SEED + 7);
  // Deterministic shuffle so replies arrive from all areas at once, like a real alert.
  const shuffled = people.map((p) => ({ p, k: random() })).sort((a, b) => a.k - b.k).map((x) => x.p);
  const plan = shuffled.slice(0, size).map((p) => {
    const r = random();
    const action = r < 0.6 ? "book" : r < 0.65 ? "rescue" : "silent";
    const arrives = random() < 0.85;
    const delay = 20 + Math.floor(random() * 90);
    const rescuePeople = 1 + Math.floor(random() * 5);
    return { ...p, action, arrives, delay, rescuePeople };
  }).filter((p) => p.action !== "silent");

  crowd.running = true;
  crowd.total = plan.length;
  crowd.processed = 0;
  await audit(app.db, app.clock.now(), { type: "staff", id: staffId }, "demo.crowd.start", "incident", null, { size: plan.length });

  const spacingMs = Math.max(30, Math.floor(25_000 / Math.max(1, plan.length)));
  void (async () => {
    for (const p of plan) {
      if (!crowd.running || app.paused) break;
      const channel = p.channel === "whatsapp" ? "whatsapp" : "sms";
      try {
        if (p.action === "book") {
          await handleInbound(app, channel, p.phone, "1");
          await handleInbound(app, channel, p.phone, "1");
          await handleInbound(app, channel, p.phone, p.needs ? "1" : "2");
          if (p.arrives) crowd.arrivals.set(p.id, p.delay);
        } else {
          await handleInbound(app, channel, p.phone, "2");
          await handleInbound(app, channel, p.phone, String(p.rescuePeople));
          await handleInbound(app, channel, p.phone, "1");
        }
      } catch (error) {
        // A failed simulated reply shouldn't stop the demo.
        console.error("crowd reply failed", error);
      }
      crowd.processed += 1;
      await new Promise((r) => setTimeout(r, spacingMs));
    }
    crowd.running = false;
  })();

  return { started: plan.length };
}

/** Checks in simulated families whose arrival time has passed (stands in for shelter operators). */
export async function runSimulatedArrivals(app: App) {
  if (app.config.mode !== "demo" || crowd.arrivals.size === 0) return 0;
  const now = app.clock.now();
  const held = await app.db.query<{ citizen_id: string; code: string; shelter_id: string; created_at: Date }>(
    `SELECT b.citizen_id, b.code, b.shelter_id, b.created_at
       FROM bookings b JOIN incidents i ON i.id = b.incident_id AND i.status = 'active'
      WHERE b.status = 'held'`,
  );
  let n = 0;
  for (const b of held) {
    const delay = crowd.arrivals.get(b.citizen_id);
    if (delay === undefined) continue;
    if (b.created_at.getTime() + delay * 60_000 <= now.getTime()) {
      const result = await checkIn(app, null, b.code, b.shelter_id);
      if (result.result === "CHECKED_IN") n += 1;
      crowd.arrivals.delete(b.citizen_id);
    }
  }
  return n;
}
