import { randomInt } from "node:crypto";
import { randomToken, sha256, verifyPassword } from "@hope/db";
import { HopeError, type StaffRole } from "@hope/shared";
import { audit, type App } from "../context";
import { sendMessage } from "./messaging";

const STAFF_SESSION_HOURS = 12;
const CITIZEN_SESSION_DAYS = 30;
const OTP_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;

export interface StaffSession {
  id: string;
  name: string;
  email: string;
  roles: { role: StaffRole; areaId: number | null; shelterId: string | null }[];
}

// Sessions use real time, not the demo clock, so fast-forwarding never logs people out.
const realNow = () => new Date();

export async function staffLogin(app: App, email: string, password: string) {
  const [staff] = await app.db.query<{ id: string; password_hash: string; active: boolean }>(
    `SELECT id, password_hash, active FROM staff WHERE lower(email) = lower($1)`,
    [email],
  );
  // Same work and same error whether or not the account exists.
  const ok = staff ? await verifyPassword(password, staff.password_hash) : await verifyPassword(password, "scrypt$AAAA$AAAA");
  if (!staff || !ok || !staff.active) throw new HopeError("INVALID_LOGIN", "Email or password is incorrect", 401);
  return createStaffSession(app, staff.id);
}

export async function createStaffSession(app: App, staffId: string) {
  const token = randomToken();
  await app.db.query(`INSERT INTO staff_sessions (token_hash, staff_id, expires_at) VALUES ($1, $2, $3)`, [
    sha256(token), staffId, new Date(realNow().getTime() + STAFF_SESSION_HOURS * 3_600_000),
  ]);
  await audit(app.db, app.clock.now(), { type: "staff", id: staffId }, "staff.login", "staff", staffId);
  return token;
}

export async function staffFromToken(app: App, token: string | undefined): Promise<StaffSession | null> {
  if (!token) return null;
  const rows = await app.db.query<{ id: string; name: string; email: string; role: StaffRole | null; area_id: number | null; shelter_id: string | null }>(
    `SELECT s.id, s.name, s.email, r.role, r.area_id, r.shelter_id
       FROM staff_sessions ss
       JOIN staff s ON s.id = ss.staff_id AND s.active
       LEFT JOIN staff_roles r ON r.staff_id = s.id
      WHERE ss.token_hash = $1 AND ss.expires_at > $2`,
    [sha256(token), realNow()],
  );
  const first = rows[0];
  if (!first) return null;
  return {
    id: first.id,
    name: first.name,
    email: first.email,
    roles: rows.filter((r) => r.role).map((r) => ({ role: r.role!, areaId: r.area_id, shelterId: r.shelter_id })),
  };
}

export async function endStaffSession(app: App, token: string | undefined) {
  if (token) await app.db.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [sha256(token)]);
}

export function hasRole(staff: StaffSession, ...roles: StaffRole[]) {
  return staff.roles.some((r) => roles.includes(r.role));
}

// ── Citizens: phone + one-time code ──────────────────────────────────────

export async function requestOtp(app: App, phone: string) {
  const [citizen] = await app.db.query<{ id: string; lang: "bn" | "en" | "hi"; channel: "sms" | "whatsapp" | "pwa" }>(
    `SELECT id, lang, channel FROM citizens WHERE phone = $1`,
    [phone],
  );
  // Don't reveal whether a number is registered.
  if (!citizen) return { sent: true as const, demoCode: undefined };

  const [recent] = await app.db.query<{ expires_at: Date }>(`SELECT expires_at FROM otp_codes WHERE phone = $1`, [phone]);
  if (recent && recent.expires_at.getTime() - realNow().getTime() > (OTP_MINUTES * 60 - 30) * 1000) {
    throw new HopeError("TOO_SOON", "Please wait 30 seconds before asking for another code", 429);
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await app.db.query(
    `INSERT INTO otp_codes (phone, code_hash, expires_at, attempts) VALUES ($1, $2, $3, 0)
     ON CONFLICT (phone) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0`,
    [phone, sha256(`${phone}:${code}`), new Date(realNow().getTime() + OTP_MINUTES * 60_000)],
  );
  // OTP goes by SMS even for PWA users (that's how they prove they own the number).
  await sendMessage(app, { phone, lang: citizen.lang, channel: "sms" }, "otp", { otp: code }, "otp");
  // In demo mode the code is also returned, so presenters aren't blocked by the simulator.
  return { sent: true as const, demoCode: app.config.mode === "demo" ? code : undefined };
}

export async function verifyOtp(app: App, phone: string, code: string) {
  const [otp] = await app.db.query<{ code_hash: string; expires_at: Date; attempts: number }>(
    `SELECT code_hash, expires_at, attempts FROM otp_codes WHERE phone = $1`,
    [phone],
  );
  if (!otp || otp.expires_at.getTime() < realNow().getTime() || otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new HopeError("CODE_EXPIRED", "This code has expired. Ask for a new one.", 401);
  }
  if (otp.code_hash !== sha256(`${phone}:${code}`)) {
    await app.db.query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = $1`, [phone]);
    throw new HopeError("WRONG_CODE", "That code is not correct", 401);
  }
  await app.db.query(`DELETE FROM otp_codes WHERE phone = $1`, [phone]);
  const [citizen] = await app.db.query<{ id: string }>(`SELECT id FROM citizens WHERE phone = $1`, [phone]);
  if (!citizen) throw new HopeError("WRONG_CODE", "That code is not correct", 401);
  const token = randomToken();
  await app.db.query(`INSERT INTO citizen_sessions (token_hash, citizen_id, expires_at) VALUES ($1, $2, $3)`, [
    sha256(token), citizen.id, new Date(realNow().getTime() + CITIZEN_SESSION_DAYS * 86_400_000),
  ]);
  await app.db.query(`UPDATE citizens SET phone_verified_at = coalesce(phone_verified_at, $2) WHERE id = $1`, [citizen.id, app.clock.now()]);
  return token;
}

export async function citizenFromToken(app: App, token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const [row] = await app.db.query<{ citizen_id: string }>(
    `SELECT citizen_id FROM citizen_sessions WHERE token_hash = $1 AND expires_at > $2`,
    [sha256(token), realNow()],
  );
  return row?.citizen_id ?? null;
}

export async function endCitizenSession(app: App, token: string | undefined) {
  if (token) await app.db.query(`DELETE FROM citizen_sessions WHERE token_hash = $1`, [sha256(token)]);
}
