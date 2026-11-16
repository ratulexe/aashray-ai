/** Zod schemas (server + forms). Kept apart so browser bundles that only need types/helpers stay small. */
import { z } from "zod";
import { HAZARDS, LANGS, SEVERITIES, normalizeBookingCode, normalizePhone } from "./index";

export const langSchema = z.enum(LANGS);

export const hazardSchema = z.enum(HAZARDS);

export const severitySchema = z.enum(SEVERITIES);

export const householdSchema = z.object({
  adults: z.number().int().min(0).max(50),
  children: z.number().int().min(0).max(50),
  elderly: z.number().int().min(0).max(50),
  pregnant: z.number().int().min(0).max(10).default(0),
  disabled: z.number().int().min(0).max(50).default(0),
  needsMobilityHelp: z.boolean(),
});

export const bookingCodeSchema = z
  .string()
  .transform(normalizeBookingCode)
  .pipe(z.string().regex(/^[0-9A-HJKMNP-TV-Z]{6}$/, "Invalid booking code"));

export const phoneSchema = z
  .string()
  .transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Enter a 10-digit mobile number" });
      return z.NEVER;
    }
    return p;
  });
