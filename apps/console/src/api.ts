import type { LocalizedText, StaffRole } from "@hope/shared";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/v1/staff${path}`, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    credentials: "same-origin",
    headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? "ERROR", data?.error?.message ?? "Something went wrong");
  return data as T;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  roles: { role: StaffRole; areaId: number | null; shelterId: string | null }[];
}

export type Level = "watch" | "warning" | "evacuate";

export interface ShelterRow {
  id: string; code: string; name: LocalizedText; kind: string; lat: number; lng: number; accessible: boolean;
  safe_for: string[]; safety_score: number; facilities: Record<string, boolean>; area_id: number;
  status: "open" | "full" | "closed" | "unsafe"; capacity: number; reserved: number; occupied: number; expected_families: number;
}

export interface AlertSummary {
  id: string; kind: string; level: Level; status: string; recipients: number | null; created_at: string;
  approved_at: string | null; sent_at: string | null; created_by_name: string; approved_by_name: string | null; created_by: string;
  delivered: number; failed: number; queued: number; est_cost_paise: number;
}

export interface Overview {
  now: string;
  mode: "demo" | "production";
  incident: null | {
    id: string; hazard: string; title: string; status: "draft" | "active" | "resolved" | "cancelled"; source: string;
    source_ref: string; summary: string | null; is_drill: boolean; created_at: string;
  };
  zones: { area_id: number; level: Level }[];
  shelters: ShelterRow[];
  alerts: AlertSummary[];
  bookings: Record<string, { families: number; people: number }>;
  rescue: Record<string, number>;
  households: { total: number; vulnerable: number; people: number };
  metrics: { medianMinutesToBook: number | null; walkIns: number };
}

export interface MapArea {
  id: number; level: "block" | "gram_panchayat"; name: LocalizedText; households: number; vulnerable: number; people: number;
  geometry: GeoJSON.MultiPolygon;
}

export interface MapData {
  areas: MapArea[];
  households: [number, number, 0 | 1][];
}

export interface Preview {
  alert: { id: string; kind: string; level: Level; status: string; created_by: string };
  total: number;
  groups: { channel: string; lang: string; level: Level; n: number }[];
  texts: { lang: "bn" | "en" | "hi"; level: Level | null; text: string; encoding: string; length: number; segments: number }[];
  estCostPaise: number;
}

export interface RescueRow {
  id: string; ref: string; people: number; vulnerable: Record<string, number | boolean>; priority: number;
  status: "new" | "triaged" | "assigned" | "rescued" | "closed"; assigned_to: string | null; landmark: string | null;
  channel: string; created_at: string; updated_at: string; phone: string; area: LocalizedText | null; lat: number | null; lng: number | null;
}

export interface DemoInfo {
  staff: { key: string; name: string; email: string; roles: string[] }[];
  personas: {
    key: "rina" | "arjun" | "salma"; name: string; phone: string; lang: string; channel: "sms" | "whatsapp" | "pwa"; landmark: string;
    booking: { code: string; status: string; shelterId: string; shelterCode: string } | null;
  }[];
  crowd: { running: boolean; total: number; processed: number; arrivalsPlanned: number };
  now: string;
}

export interface PhoneMessage {
  dir: "in" | "out"; id: string; channel: string; body: string; kind: string | null; segments: number; created_at: string;
}

export const en = (t: LocalizedText | null | undefined) => t?.en ?? "";
