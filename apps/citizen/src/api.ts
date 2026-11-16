import type { LocalizedText } from "@hope/shared";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/v1/public${path}`, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    credentials: "same-origin",
    headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? "ERROR", data?.error?.message ?? "Something went wrong");
  return data as T;
}

export interface Me {
  now: string;
  mode: "demo" | "production";
  citizen: { name: string | null; phone: string; lang: "bn" | "en" | "hi"; channel: string; landmark: string | null; area: LocalizedText | null; location: { lat: number; lng: number } | null };
  household: { adults: number; children: number; elderly: number; pregnant: number; disabled: number; needsMobilityHelp: boolean; size: number };
  warning: null | {
    incidentId: string; hazard: string; title: string; source: string; summary: string | null; incidentStatus: string;
    level: "watch" | "warning" | "evacuate" | null; alertKind: string; at: string;
  };
  booking: null | {
    code: string; status: "held" | "checked_in" | "expired" | "cancelled" | "moved"; people: number; holdUntil: string; checkedInAt: string | null; createdAt: string;
    shelter: { id: string; name: LocalizedText; kind: string; location: { lat: number; lng: number }; facilities: Record<string, boolean>; accessible: boolean; distanceKm: number | null };
  };
  rescue: null | { ref: string; status: "new" | "triaged" | "assigned" | "rescued" | "closed"; people: number; assignedTo: string | null; createdAt: string; landmark: string | null };
}

export interface ShelterListItem {
  id: string; name: LocalizedText; kind: string; accessible: boolean; facilities: Record<string, boolean>;
  lat: number; lng: number; status: string; available: number; capacity: number; distance_km: number; safe_for_hazard: boolean;
}
