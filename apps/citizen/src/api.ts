import type { LocalizedText } from "@hope/shared";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/**
 * Demo persona sessions also travel as a header. The console shows this app
 * inside an iframe on another site, where browsers block our SameSite=Strict
 * cookie; tab-scoped storage still works there. Real logins use the cookie only.
 */
const DEMO_TOKEN_KEY = "hope_demo_token";

function demoToken(): string | null {
  try {
    return sessionStorage.getItem(DEMO_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setDemoToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(DEMO_TOKEN_KEY, token);
    else sessionStorage.removeItem(DEMO_TOKEN_KEY);
  } catch {
    // Storage unavailable: the cookie still works outside iframes.
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["content-type"] = "application/json";
  const token = demoToken();
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`/v1/public${path}`, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    credentials: "same-origin",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (path === "/auth/logout") setDemoToken(null);
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
