import { describe, expect, it } from "vitest";
import { LANGS } from "@hope/shared";
import { HAZARD_NAMES, LEVEL_NAMES, MESSAGES, normalizeReply, parseCount, parseYesNo, render, smsSegments, type MessageKey } from "./index";

// Realistic worst-case values for the longest placeholders.
const LONG_VARS = {
  hazard: "Cyclone",
  level: "warning",
  source: "IMD",
  area: "Fraserganj",
  shelter: "Moushuni Cyclone Shelter",
  n: 12,
  code: "K7Q-M3P",
  time: "18:30",
  ref: "R-4821",
  team: "NDRF Team 2",
  status: "assigned",
  otp: "123456",
  text: "Shelter at Namkhana school is now open.",
};

describe("message catalogue", () => {
  it("has every message in every language", () => {
    for (const key of Object.keys(MESSAGES) as MessageKey[]) {
      for (const lang of LANGS) expect(MESSAGES[key][lang], `${key}.${lang}`).toBeTruthy();
    }
  });

  it("fits alerts in 2 SMS segments in every language", () => {
    for (const lang of LANGS) {
      for (const level of ["watch", "warning", "evacuate"] as const) {
        const text = render("alert", lang, {
          ...LONG_VARS,
          hazard: HAZARD_NAMES.cyclone[lang],
          level: LEVEL_NAMES[level][lang],
        }, "[HOPE DEMO]");
        expect(smsSegments(text).segments, `${lang}/${level}: ${text}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("fits every other message in 3 segments", () => {
    for (const key of Object.keys(MESSAGES) as MessageKey[]) {
      if (key === "update") continue; // free text, checked at send time
      for (const lang of LANGS) {
        const text = render(key, lang, LONG_VARS, "[HOPE DEMO]");
        expect(smsSegments(text).segments, `${key}.${lang}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it("leaves no unfilled placeholders", () => {
    expect(render("booked", "en", LONG_VARS)).not.toMatch(/\{\w+\}/);
  });
});

describe("smsSegments", () => {
  it("counts GSM-7 and Unicode correctly", () => {
    expect(smsSegments("a".repeat(160))).toMatchObject({ encoding: "GSM-7", segments: 1 });
    expect(smsSegments("a".repeat(161)).segments).toBe(2);
    expect(smsSegments("আ".repeat(70))).toMatchObject({ encoding: "UCS-2", segments: 1 });
    expect(smsSegments("আ".repeat(71)).segments).toBe(2);
  });
});

describe("reply parsing", () => {
  it("understands Bengali and Devanagari digits", () => {
    expect(normalizeReply(" ৪ ")).toBe("4");
    expect(parseCount("१२")).toBe(12);
    expect(parseCount("0")).toBeNull();
    expect(parseCount("abc")).toBeNull();
  });

  it("understands yes / no in three languages", () => {
    expect(parseYesNo("হ্যাঁ")).toBe(true);
    expect(parseYesNo("नहीं")).toBe(false);
    expect(parseYesNo("1")).toBe(true);
    expect(parseYesNo("maybe")).toBeNull();
  });
});
