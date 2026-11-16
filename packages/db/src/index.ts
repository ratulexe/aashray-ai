/**
 * Database access for HOPE.
 *
 * - Demo / development: PGlite (real PostgreSQL compiled to WebAssembly,
 *   running inside Node) with the PostGIS extension. Nothing to install.
 * - Production: a normal PostgreSQL 16 + PostGIS server via `DATABASE_URL`.
 *
 * Both expose the same tiny interface, and all SQL is plain PostgreSQL.
 */
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  readonly kind: "pglite" | "postgres";
  /** Runs `fn` in a transaction; rolls back if it throws. */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  /** Runs a multi-statement SQL script (no parameters). */
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, "../../..");
const MIGRATIONS_DIR = resolve(here, "../migrations");

export interface DbOptions {
  /** postgres://… — when set, use a real PostgreSQL server. */
  url?: string;
  /** PGlite data directory; "memory" for an in-memory database (tests). */
  dataDir?: string;
}

export async function createDb(options: DbOptions = {}): Promise<Db> {
  if (options.url) return createPostgres(options.url);
  return createPglite(options.dataDir ?? join(REPO_ROOT, ".data", "pglite"));
}

async function createPglite(dataDir: string): Promise<Db> {
  const { PGlite, types } = await import("@electric-sql/pglite");
  const { postgis } = await import("@electric-sql/pglite-postgis");
  let releaseLock = () => {};
  if (dataDir !== "memory") {
    mkdirSync(dataDir, { recursive: true });
    releaseLock = lockDataDir(dataDir);
  }
  const pg = await PGlite.create(dataDir === "memory" ? undefined : dataDir, {
    extensions: { postgis },
    // Return int8 / numeric as JS numbers, matching the postgres driver setup below.
    parsers: {
      [types.INT8]: (v: string) => Number(v),
      [types.NUMERIC]: (v: string) => Number(v),
    },
  });

  const query = async <T>(q: { query: typeof pg.query }, sql: string, params?: unknown[]) =>
    (await q.query<T>(sql, params as unknown[])).rows;

  return {
    kind: "pglite",
    query: (sql, params) => query(pg, sql, params),
    tx: (fn) => pg.transaction((t) => fn({ query: (sql, params) => query(t, sql, params) })),
    exec: async (sql) => {
      await pg.exec(sql);
    },
    close: async () => {
      await pg.close();
      releaseLock();
    },
  };
}

/**
 * OneDrive (and some sync tools) set the Windows "Read-only" flag on folders.
 * Windows ignores it for folders, but PGlite's WebAssembly file layer reads it
 * as "no write permission" and refuses to create files ("Permission denied").
 * Clearing it is harmless: on Windows, chmod only toggles that flag.
 */
function clearReadOnlyDirs(dir: string) {
  if (process.platform !== "win32") return;
  if ((statSync(dir).mode & 0o200) === 0) chmodSync(dir, 0o755);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) clearReadOnlyDirs(join(dir, entry.name));
  }
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * PGlite is single-process: two processes on one data folder corrupt it.
 * We keep our own lock file holding the real process id (PGlite's own
 * postmaster.pid always says -42, so it can't tell a live owner from a dead
 * one). If the owner is gone, the previous run was killed: clear its stale
 * postmaster.pid here, because PGlite's WebAssembly file layer can fail to
 * delete it on Windows/OneDrive ("could not remove old lock file").
 */
function lockDataDir(dataDir: string): () => void {
  const lockFile = `${dataDir}.lock`;
  if (existsSync(lockFile)) {
    const pid = Number(readFileSync(lockFile, "utf8").trim());
    if (pid && pid !== process.pid && isRunning(pid)) {
      throw new Error(
        `The demo database at ${dataDir} is already in use by process ${pid}. ` +
          `Stop the other HOPE API first (or end that process), then try again.`,
      );
    }
  }
  rmSync(join(dataDir, "postmaster.pid"), { force: true });
  clearReadOnlyDirs(dataDir);
  writeFileSync(lockFile, String(process.pid));
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    rmSync(lockFile, { force: true });
  };
  process.once("exit", release);
  return release;
}

async function createPostgres(url: string): Promise<Db> {
  const pgModule = await import("pg");
  const pg = pgModule.default;
  pg.types.setTypeParser(20, (v: string) => Number(v)); // int8
  pg.types.setTypeParser(1700, (v: string) => Number(v)); // numeric
  const pool = new pg.Pool({ connectionString: url, max: 10 });

  return {
    kind: "postgres",
    query: async (sql, params) => (await pool.query(sql, params as unknown[])).rows,
    tx: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn({ query: async (sql, params) => (await client.query(sql, params as unknown[])).rows });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    exec: async (sql) => {
      await pool.query(sql);
    },
    close: () => pool.end(),
  };
}

/** Applies any migrations in packages/db/migrations that haven't run yet. */
export async function migrate(db: Db): Promise<string[]> {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const done = new Set((await db.query<{ name: string }>("SELECT name FROM schema_migrations")).map((r) => r.name));
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    await db.exec(`BEGIN;\n${sql}\nINSERT INTO schema_migrations (name) VALUES ('${file.replace(/'/g, "''")}');\nCOMMIT;`);
    applied.push(file);
  }
  return applied;
}

/**
 * Drops HOPE's tables and re-creates them. Demo and tests only.
 * The PostGIS extension is kept: dropping and re-creating it on a live
 * connection leaves PostGIS with stale internal ids ("no spatial operator found").
 */
export async function resetSchema(db: Db): Promise<void> {
  await db.exec(`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'spatial_ref_sys' LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
      END LOOP;
    END $$;`);
  await migrate(db);
}

/** Small helper for building `IN (...)`-free array parameters portably. */
export function jsonParam(value: unknown): string {
  return JSON.stringify(value);
}

export * from "./passwords";
