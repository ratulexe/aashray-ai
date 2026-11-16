import { FakeAdapter, type ChannelAdapter } from "@hope/channels";
import type { Db, Queryable } from "@hope/db";
import { HopeError } from "@hope/shared";

export interface Config {
  port: number;
  host: string;
  mode: "demo" | "production";
  databaseUrl?: string;
  dataDir?: string;
  citizenOrigin: string;
  consoleOrigin: string;
  cookieSecure: boolean;
}

export function loadConfig(env = process.env): Config {
  const mode = env.HOPE_MODE === "production" ? "production" : "demo";
  return {
    port: Number(env.PORT ?? 4000),
    host: env.HOST ?? "127.0.0.1",
    mode,
    databaseUrl: env.DATABASE_URL || undefined,
    dataDir: env.HOPE_DATA_DIR || undefined,
    citizenOrigin: env.CITIZEN_ORIGIN ?? "http://localhost:5173",
    consoleOrigin: env.CONSOLE_ORIGIN ?? "http://localhost:5174",
    cookieSecure: env.COOKIE_SECURE === "true" || mode === "production",
  };
}

/**
 * Application clock. In demo mode the story runs on a shifted clock that
 * the presenter can fast-forward; in production it is always real time.
 */
export class Clock {
  private offsetMs = 0;

  constructor(private readonly mode: Config["mode"]) {}

  async load(db: Queryable) {
    if (this.mode !== "demo") return;
    const [row] = await db.query<{ value: { offsetMs: number } }>(`SELECT value FROM app_state WHERE key = 'clock'`);
    this.offsetMs = row?.value.offsetMs ?? 0;
  }

  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }

  async advance(db: Queryable, minutes: number) {
    if (this.mode !== "demo") throw new HopeError("NOT_ALLOWED", "The clock can only be changed in demo mode", 403);
    this.offsetMs += minutes * 60_000;
    await db.query(
      `INSERT INTO app_state (key, value) VALUES ('clock', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify({ offsetMs: this.offsetMs })],
    );
  }
}

export interface App {
  db: Db;
  config: Config;
  clock: Clock;
  adapter: ChannelAdapter;
  /** Message prefix shown on every citizen message. */
  prefix: string;
  /** Set while the demo is being reset; background jobs pause. */
  paused: boolean;
}

export function createApp(db: Db, config: Config): App {
  const clock = new Clock(config.mode);
  const app: App = {
    db,
    config,
    clock,
    prefix: config.mode === "demo" ? "[HOPE DEMO]" : "[HOPE]",
    paused: false,
    adapter: new FakeAdapter(async (m) => {
      const [row] = await db.query<{ id: number }>(
        `INSERT INTO outbound_messages (channel, phone, body, kind, alert_id, segments, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [m.channel, m.phone, m.body, m.kind, m.alertId ?? null, m.segments, clock.now()],
      );
      return String(row!.id);
    }),
  };
  return app;
}

export async function audit(
  q: Queryable,
  now: Date,
  actor: { type: "staff" | "citizen" | "system"; id?: string | null },
  action: string,
  entity: string,
  entityId: string | null,
  detail?: unknown,
) {
  await q.query(
    `INSERT INTO audit_log (actor_type, actor_id, action, entity, entity_id, detail, at) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
    [actor.type, actor.id ?? null, action, entity, entityId, detail === undefined ? null : JSON.stringify(detail), now],
  );
}

export function formatTime(d: Date): string {
  // Citizen-facing times are always shown in IST.
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
}
