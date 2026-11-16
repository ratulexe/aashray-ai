import { describe, expect, it } from "vitest";
import { allocate, haversineKm, type ShelterCandidate } from "./index";

const base: ShelterCandidate = {
  id: "s1",
  name: "Shelter 1",
  location: { lat: 21.77, lng: 88.23 },
  status: "open",
  capacity: 200,
  reserved: 0,
  occupied: 0,
  safeFor: ["cyclone", "flood"],
  safetyScore: 90,
  accessible: true,
  facilities: { water: true, toilets: true, power: true, medical: true, food: true },
};

const req = { hazard: "cyclone" as const, people: 4, needsMobilityHelp: false, from: { lat: 21.77, lng: 88.23 } };

describe("allocate", () => {
  it("gives a perfect nearby shelter the full score", () => {
    const r = allocate([{ ...base, capacity: 400, safetyScore: 100 }], req);
    expect(r.best?.score).toBe(100);
  });

  it("rejects shelters with explicit reasons", () => {
    const r = allocate(
      [
        { ...base, id: "closed", status: "closed" },
        { ...base, id: "flood-only", safeFor: ["flood"] },
        { ...base, id: "full", reserved: 150, occupied: 48 },
        { ...base, id: "stairs", accessible: false },
      ],
      { ...req, needsMobilityHelp: true },
    );
    expect(r.best).toBeNull();
    expect(Object.fromEntries(r.rejected.map((x) => [x.shelterId, x.reason]))).toEqual({
      closed: "NOT_OPEN",
      "flood-only": "NOT_SAFE_FOR_HAZARD",
      full: "NOT_ENOUGH_SPACE",
      stairs: "NOT_ACCESSIBLE",
    });
  });

  it("accepts a non-accessible shelter when no mobility help is needed", () => {
    const r = allocate([{ ...base, accessible: false }], req);
    expect(r.best?.shelterId).toBe("s1");
    expect(r.best?.breakdown.accessibility).toBe(0);
  });

  it("prefers safer shelters over slightly closer ones", () => {
    const r = allocate(
      [
        { ...base, id: "near-weak", safetyScore: 40 },
        { ...base, id: "far-strong", safetyScore: 95, location: { lat: 21.79, lng: 88.23 } },
      ],
      req,
    );
    expect(r.best?.shelterId).toBe("far-strong");
  });

  it("counts reserved and occupied places against capacity", () => {
    const r = allocate([{ ...base, capacity: 10, reserved: 3, occupied: 3 }], { ...req, people: 5 });
    expect(r.rejected[0]?.reason).toBe("NOT_ENOUGH_SPACE");
  });

  it("is deterministic for equal scores", () => {
    const a = { ...base, id: "b" };
    const b = { ...base, id: "a" };
    expect(allocate([a, b], req).best?.shelterId).toBe("a");
    expect(allocate([b, a], req).best?.shelterId).toBe("a");
  });
});

describe("haversineKm", () => {
  it("measures roughly 7.6 km for 0.05° diagonal near Namkhana", () => {
    expect(haversineKm({ lat: 21.7, lng: 88.2 }, { lat: 21.75, lng: 88.25 })).toBeCloseTo(7.6, 0);
  });
});
