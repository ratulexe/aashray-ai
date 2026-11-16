// ── Enumerations ────────────────────────────────────────────────────────────

export const LANGS = ["bn", "en", "hi"] as const;
export type Lang = (typeof LANGS)[number];

export const HAZARDS = ["cyclone", "flood", "landslide", "lightning", "heatwave", "other"] as const;
export type Hazard = (typeof HAZARDS)[number];

/** Ordered from least to most severe. */
export const SEVERITIES = ["watch", "warning", "evacuate"] as const;
export type Severity = (typeof SEVERITIES)[number];

/** All severity levels at or above `min`. */
export function severitiesAtLeast(min: Severity): Severity[] {
  return SEVERITIES.slice(SEVERITIES.indexOf(min));
}

export const ALERT_KINDS = ["warning", "evacuate", "update", "correction", "all_clear", "test"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export const ALERT_STATUSES = ["draft", "approved", "sending", "sent", "cancelled"] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const BOOKING_STATUSES = ["held", "checked_in", "expired", "cancelled", "moved"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const RESCUE_STATUSES = ["new", "triaged", "assigned", "rescued", "closed"] as const;
export type RescueStatus = (typeof RESCUE_STATUSES)[number];

export const STAFF_ROLES = ["admin", "coordinator", "approver", "shelter_operator", "rescue_desk", "volunteer"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const CHANNELS = ["sms", "whatsapp", "pwa"] as const;
export type Channel = (typeof CHANNELS)[number];

// ── Household ───────────────────────────────────────────────────────────────

export interface Household {
  adults: number;
  children: number;
  elderly: number;
  pregnant: number;
  disabled: number;
  needsMobilityHelp: boolean;
}

export function householdSize(h: Pick<Household, "adults" | "children" | "elderly">): number {
  return h.adults + h.children + h.elderly;
}

// ── Booking codes ───────────────────────────────────────────────────────────

/** Crockford base32 without I, L, O, U — easy to read aloud and type. */
export const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function formatBookingCode(code: string): string {
  const c = normalizeBookingCode(code);
  return c.length === 6 ? `${c.slice(0, 3)}-${c.slice(3)}` : c;
}

/** Accepts "k7q-m3p", "K7Q M3P", "k7qm3p"; maps confusable letters (O→0, I/L→1). */
export function normalizeBookingCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}


// ── Phone numbers ───────────────────────────────────────────────────────────

/** Normalises Indian numbers to E.164 (+91XXXXXXXXXX). */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  if (/^\+91\d{10}$/.test(digits)) return digits;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  if (/^0?\d{10}$/.test(digits)) return `+91${digits.slice(-10)}`;
  return null;
}


/**
 * Demo numbers live in a reserved fictional range so the demo can never
 * message a real person: +91 00000 xxxxx (no Indian mobile starts with 0).
 */
export function isDemoPhone(phone: string): boolean {
  return /^\+9100000\d{5}$/.test(phone);
}

// ── API error codes ─────────────────────────────────────────────────────────

export const CHECKIN_RESULTS = [
  "CHECKED_IN",
  "NOT_FOUND",
  "WRONG_SHELTER",
  "WRONG_INCIDENT",
  "EXPIRED",
  "ALREADY_CHECKED_IN",
  "CANCELLED",
] as const;
export type CheckinResult = (typeof CHECKIN_RESULTS)[number];

export class HopeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

// ── Facilities ──────────────────────────────────────────────────────────────

export const FACILITIES = ["water", "toilets", "power", "medical", "food", "womens_space"] as const;
export type Facility = (typeof FACILITIES)[number];
export type Facilities = Partial<Record<Facility, boolean>>;

export type LocalizedText = Partial<Record<Lang, string>> & { en: string };

export function pickLang(text: LocalizedText, lang: Lang): string {
  return text[lang] ?? text.en;
}
