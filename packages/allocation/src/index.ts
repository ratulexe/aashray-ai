/**
 * Deterministic shelter allocation.
 *
 * Ported from the v1 prototype. AI never takes part in this decision:
 * the same inputs always give the same, explainable result.
 */
import type { Facilities, Hazard } from "@hope/shared";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ShelterCandidate {
  id: string;
  name: string;
  location: LatLng;
  /** open | full | closed | unsafe — for this incident */
  status: string;
  capacity: number;
  reserved: number;
  occupied: number;
  safeFor: Hazard[];
  /** Structural safety rating 0–100 from the shelter survey. */
  safetyScore: number;
  accessible: boolean;
  facilities: Facilities;
}

export interface AllocationRequest {
  hazard: Hazard;
  people: number;
  needsMobilityHelp: boolean;
  from: LatLng;
}

export interface ScoreBreakdown {
  safety: number;
  capacity: number;
  distance: number;
  accessibility: number;
  facilities: number;
}

export interface RankedShelter {
  shelterId: string;
  name: string;
  distanceKm: number;
  available: number;
  score: number;
  breakdown: ScoreBreakdown;
}

export type RejectionReason =
  | "NOT_OPEN"
  | "NOT_SAFE_FOR_HAZARD"
  | "NOT_ENOUGH_SPACE"
  | "NOT_ACCESSIBLE";

export interface RejectedShelter {
  shelterId: string;
  name: string;
  distanceKm: number;
  reason: RejectionReason;
}

export interface AllocationResult {
  best: RankedShelter | null;
  ranked: RankedShelter[];
  rejected: RejectedShelter[];
}

export const WEIGHTS = {
  safety: 40,
  capacity: 25,
  distance: 20,
  accessibility: 10,
  facilities: 5,
} as const;

/** Beyond this distance a shelter gets no distance points (still eligible). */
export const MAX_USEFUL_DISTANCE_KM = 12;
/** Free capacity at which a shelter gets full capacity points. */
export const FULL_CAPACITY_POINTS_AT = 150;

const SCORED_FACILITIES = ["water", "toilets", "power", "medical", "food"] as const;

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const round1 = (v: number) => Math.round(v * 10) / 10;

export function available(s: Pick<ShelterCandidate, "capacity" | "reserved" | "occupied">): number {
  return Math.max(0, s.capacity - s.reserved - s.occupied);
}

function rejectionReason(s: ShelterCandidate, req: AllocationRequest): RejectionReason | null {
  if (s.status !== "open") return "NOT_OPEN";
  if (!s.safeFor.includes(req.hazard)) return "NOT_SAFE_FOR_HAZARD";
  if (available(s) < req.people) return "NOT_ENOUGH_SPACE";
  if (req.needsMobilityHelp && !s.accessible) return "NOT_ACCESSIBLE";
  return null;
}

export function scoreShelter(s: ShelterCandidate, distanceKm: number): { score: number; breakdown: ScoreBreakdown } {
  const free = available(s);
  const facilityCount = SCORED_FACILITIES.filter((f) => s.facilities[f]).length;
  const breakdown: ScoreBreakdown = {
    safety: round1((Math.min(100, Math.max(0, s.safetyScore)) / 100) * WEIGHTS.safety),
    capacity: round1(Math.min(free / FULL_CAPACITY_POINTS_AT, 1) * WEIGHTS.capacity),
    distance: round1(Math.max(0, 1 - distanceKm / MAX_USEFUL_DISTANCE_KM) * WEIGHTS.distance),
    accessibility: s.accessible ? WEIGHTS.accessibility : 0,
    facilities: round1((facilityCount / SCORED_FACILITIES.length) * WEIGHTS.facilities),
  };
  const score = round1(
    breakdown.safety + breakdown.capacity + breakdown.distance + breakdown.accessibility + breakdown.facilities,
  );
  return { score, breakdown };
}

export function allocate(shelters: ShelterCandidate[], req: AllocationRequest): AllocationResult {
  const ranked: RankedShelter[] = [];
  const rejected: RejectedShelter[] = [];

  for (const s of shelters) {
    const distanceKm = round1(haversineKm(req.from, s.location));
    const reason = rejectionReason(s, req);
    if (reason) {
      rejected.push({ shelterId: s.id, name: s.name, distanceKm, reason });
      continue;
    }
    const { score, breakdown } = scoreShelter(s, distanceKm);
    ranked.push({ shelterId: s.id, name: s.name, distanceKm, available: available(s), score, breakdown });
  }

  // Highest score first; ties go to the nearer shelter, then by id for stability.
  ranked.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm || a.shelterId.localeCompare(b.shelterId));
  rejected.sort((a, b) => a.distanceKm - b.distanceKm);

  return { best: ranked[0] ?? null, ranked, rejected };
}
