import { createDb, migrate } from "@hope/db";
import { seedDemo } from "@hope/db/seed";
import { createApp, loadConfig, type App } from "./context";
import { buildServer } from "./server";
import { runHoldJobs } from "./services/bookings";
import { runSimulatedArrivals } from "./services/demo";
import { dispatchBatch } from "./services/incidents";

const config = loadConfig();
const db = await createDb({ url: config.databaseUrl, dataDir: config.dataDir });
await migrate(db);

if (config.mode === "demo") {
  const [{ n } = { n: 0 }] = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM staff`);
  if (n === 0) {
    const r = await seedDemo(db);
    console.log(`Seeded demo data: ${r.citizens} households, ${r.shelters} shelters.`);
  }
}

const app = createApp(db, config);
await app.clock.load(db);

// ── Background jobs (in-process for Phase 0; moves to apps/worker later) ──
const running = new Set<Promise<unknown>>();

function every(ms: number, name: string, job: (app: App) => Promise<unknown>) {
  let busy = false;
  setInterval(() => {
    if (busy || app.paused) return;
    busy = true;
    const p = job(app)
      .catch((error) => console.error(`[job:${name}]`, error))
      .finally(() => {
        busy = false;
        running.delete(p);
      });
    running.add(p);
  }, ms).unref();
}

every(200, "dispatch", (a) => dispatchBatch(a));
every(2000, "holds", runHoldJobs);
every(2000, "arrivals", runSimulatedArrivals);

const server = await buildServer(app, {
  waitForJobs: async () => {
    await Promise.allSettled([...running]);
  },
});

await server.listen({ port: config.port, host: config.host });
console.log(`HOPE API (${config.mode} mode, ${db.kind}) on http://${config.host}:${config.port}`);

const shutdown = async () => {
  await server.close();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
