/**
 * Demo seed: Namkhana block, South 24 Parganas, West Bengal.
 *
 * - Gram panchayat names are real; boundaries are SIMPLIFIED (Voronoi cells
 *   around approximate village locations, clipped to a rough block outline).
 * - Shelters, households, people, phone numbers and the cyclone are FICTIONAL.
 * - Everything is generated from a fixed seed, so every reset is identical.
 */
import type { Db } from "../index";
import { hashPassword } from "../passwords";

export const DEMO_SEED = 20261024;
/** Demo story starts at 14:00 IST on 24 Oct 2026 (fictional cyclone DEMO-1). */
export const DEMO_START = new Date("2026-10-24T08:30:00.000Z");
export const DEMO_PASSWORD = "hope-demo";

export const DEMO_STAFF = [
  { key: "coordinator", name: "Ananya (Coordinator)", email: "coordinator@demo.hope", roles: ["coordinator", "approver"] },
  { key: "approver", name: "Rahul (Approver)", email: "approver@demo.hope", roles: ["approver"] },
  { key: "operator", name: "Mitali (Shelter operator)", email: "operator@demo.hope", roles: ["shelter_operator"] },
  { key: "rescue", name: "Imran (Rescue desk)", email: "rescue@demo.hope", roles: ["rescue_desk"] },
  { key: "admin", name: "Demo Admin", email: "admin@demo.hope", roles: ["admin"] },
] as const;

interface GP {
  key: string;
  name: { en: string; bn: string; hi: string };
  lat: number;
  lng: number;
  households: number;
}

// Approximate village locations. Namkhana and Narayanpur from Wikipedia; others approximate.
const GPS: GP[] = [
  { key: "budhakhali", name: { en: "Budhakhali", bn: "বুধাখালি", hi: "बुधाखाली" }, lat: 21.842, lng: 88.214, households: 55 },
  { key: "namkhana", name: { en: "Namkhana", bn: "নামখানা", hi: "नामखाना" }, lat: 21.7699, lng: 88.2315, households: 70 },
  { key: "narayanpur", name: { en: "Narayanpur", bn: "নারায়ণপুর", hi: "नारायणपुर" }, lat: 21.7708, lng: 88.251, households: 50 },
  { key: "shibrampur", name: { en: "Shibrampur", bn: "শিবরামপুর", hi: "शिबरामपुर" }, lat: 21.728, lng: 88.262, households: 60 },
  { key: "haripur", name: { en: "Haripur", bn: "হরিপুর", hi: "हरिपुर" }, lat: 21.676, lng: 88.276, households: 70 },
  { key: "moushuni", name: { en: "Moushuni", bn: "মৌসুনী", hi: "मौसुनी" }, lat: 21.655, lng: 88.196, households: 90 },
  { key: "fraserganj", name: { en: "Fraserganj", bn: "ফ্রেজারগঞ্জ", hi: "फ्रेज़रगंज" }, lat: 21.586, lng: 88.248, households: 105 },
];

/** Rough outline of the block (lng lat), simplified for the demo. */
const BLOCK_OUTLINE =
  "POLYGON((88.175 21.875, 88.255 21.875, 88.300 21.800, 88.315 21.700, 88.300 21.600, 88.275 21.560, 88.215 21.560, 88.165 21.610, 88.160 21.700, 88.180 21.780, 88.175 21.875))";

interface ShelterSeed {
  code: string;
  gp: string;
  name: { en: string; bn: string; hi: string };
  kind: "cyclone_shelter" | "school" | "community_hall";
  lat: number;
  lng: number;
  capacity: number;
  safeFor: string[];
  safety: number;
  accessible: boolean;
  facilities: Record<string, boolean>;
}

const ALL = { water: true, toilets: true, power: true, medical: true, food: true, womens_space: true };

const SHELTERS: ShelterSeed[] = [
  { code: "NMK-A", gp: "namkhana", name: { en: "Namkhana Cyclone Shelter A", bn: "নামখানা সাইক্লোন শেল্টার A", hi: "नामखाना साइक्लोन शेल्टर A" }, kind: "cyclone_shelter", lat: 21.7725, lng: 88.2285, capacity: 400, safeFor: ["cyclone", "flood", "heatwave"], safety: 92, accessible: true, facilities: ALL },
  { code: "NRP-S", gp: "narayanpur", name: { en: "Narayanpur Primary School", bn: "নারায়ণপুর প্রাথমিক বিদ্যালয়", hi: "नारायणपुर प्राथमिक विद्यालय" }, kind: "school", lat: 21.7745, lng: 88.2545, capacity: 150, safeFor: ["cyclone", "flood"], safety: 70, accessible: false, facilities: { water: true, toilets: true } },
  { code: "BDK-H", gp: "budhakhali", name: { en: "Budhakhali Community Hall", bn: "বুধাখালি কমিউনিটি হল", hi: "बुधाखाली सामुदायिक भवन" }, kind: "community_hall", lat: 21.8385, lng: 88.2185, capacity: 120, safeFor: ["cyclone", "flood"], safety: 66, accessible: true, facilities: { water: true, toilets: true, power: true } },
  { code: "SBR-B", gp: "shibrampur", name: { en: "Shibrampur Cyclone Shelter B", bn: "শিবরামপুর সাইক্লোন শেল্টার B", hi: "शिबरामपुर साइक्लोन शेल्टर B" }, kind: "cyclone_shelter", lat: 21.7315, lng: 88.2585, capacity: 300, safeFor: ["cyclone", "flood", "heatwave"], safety: 90, accessible: true, facilities: ALL },
  { code: "HRP-S", gp: "haripur", name: { en: "Haripur High School", bn: "হরিপুর উচ্চ বিদ্যালয়", hi: "हरिपुर उच्च विद्यालय" }, kind: "school", lat: 21.6795, lng: 88.2725, capacity: 200, safeFor: ["cyclone", "flood"], safety: 74, accessible: false, facilities: { water: true, toilets: true, power: true, food: true } },
  { code: "MSN-C", gp: "moushuni", name: { en: "Moushuni Cyclone Shelter C", bn: "মৌসুনী সাইক্লোন শেল্টার C", hi: "मौसुनी साइक्लोन शेल्टर C" }, kind: "cyclone_shelter", lat: 21.6585, lng: 88.1995, capacity: 250, safeFor: ["cyclone", "flood"], safety: 88, accessible: true, facilities: { water: true, toilets: true, power: true, medical: true, food: true } },
  { code: "FRG-H", gp: "fraserganj", name: { en: "Fraserganj Community Hall", bn: "ফ্রেজারগঞ্জ কমিউনিটি হল", hi: "फ्रेज़रगंज सामुदायिक भवन" }, kind: "community_hall", lat: 21.5835, lng: 88.2445, capacity: 100, safeFor: ["flood", "heatwave"], safety: 45, accessible: true, facilities: { water: true, toilets: true } },
  { code: "FRG-D", gp: "fraserganj", name: { en: "Fraserganj Cyclone Shelter D", bn: "ফ্রেজারগঞ্জ সাইক্লোন শেল্টার D", hi: "फ्रेज़रगंज साइक्लोन शेल्टर D" }, kind: "cyclone_shelter", lat: 21.5905, lng: 88.2535, capacity: 110, safeFor: ["cyclone", "flood"], safety: 86, accessible: true, facilities: { water: true, toilets: true, power: true, medical: true, food: true } },
];

export const DEMO_PERSONAS = [
  {
    key: "rina", name: "Rina", phone: "+910000000001", lang: "bn", channel: "sms", gp: "namkhana",
    lat: 21.7662, lng: 88.2348, landmark: "Near Namkhana bus stand",
    household: { adults: 2, children: 1, elderly: 1, needs_mobility_help: true },
  },
  {
    key: "arjun", name: "Arjun", phone: "+910000000002", lang: "en", channel: "whatsapp", gp: "shibrampur",
    lat: 21.7262, lng: 88.2655, landmark: "Behind Shibrampur market",
    household: { adults: 2, children: 1, elderly: 0, needs_mobility_help: false },
  },
  {
    key: "salma", name: "Salma", phone: "+910000000003", lang: "hi", channel: "pwa", gp: "fraserganj",
    lat: 21.5812, lng: 88.2395, landmark: "Near the old jetty",
    household: { adults: 2, children: 2, elderly: 1, needs_mobility_help: true },
  },
] as const;

/** mulberry32 — tiny deterministic PRNG. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeedResult {
  incidentId: string;
  blockId: number;
  citizens: number;
  shelters: number;
}

export async function seedDemo(db: Db): Promise<SeedResult> {
  const random = rng(DEMO_SEED);
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const t0 = DEMO_START.toISOString();

  return db.tx(async (q) => {
    // ── Clock: the demo story starts at DEMO_START ──
    await q.query(
      `INSERT INTO app_state (key, value) VALUES ('clock', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify({ offsetMs: DEMO_START.getTime() - Date.now() })],
    );

    // ── Areas: state → district → subdivision → block → gram panchayats ──
    const block = `ST_SetSRID(ST_GeomFromText('${BLOCK_OUTLINE}'), 4326)`;
    const insertArea = async (level: string, name: object, parentId: number | null, geomSql: string) => {
      const [row] = await q.query<{ id: number }>(
        `INSERT INTO admin_areas (level, name, parent_id, geom) VALUES ($1, $2::jsonb, $3, ST_Multi(${geomSql})) RETURNING id`,
        [level, JSON.stringify(name), parentId],
      );
      return row!.id;
    };
    const stateId = await insertArea("state", { en: "West Bengal", bn: "পশ্চিমবঙ্গ", hi: "पश्चिम बंगाल" }, null, `ST_Buffer(${block}, 0.6)`);
    const districtId = await insertArea("district", { en: "South 24 Parganas", bn: "দক্ষিণ ২৪ পরগনা", hi: "दक्षिण 24 परगना" }, stateId, `ST_Buffer(${block}, 0.3)`);
    const subdivisionId = await insertArea("subdivision", { en: "Kakdwip", bn: "কাকদ্বীপ", hi: "काकद्वीप" }, districtId, `ST_Buffer(${block}, 0.1)`);
    const blockId = await insertArea("block", { en: "Namkhana", bn: "নামখানা", hi: "नामखाना" }, subdivisionId, block);

    const gpIds: Record<string, number> = {};
    const points = GPS.map((g) => `ST_SetSRID(ST_MakePoint(${g.lng}, ${g.lat}), 4326)`).join(", ");
    for (const gp of GPS) {
      // Voronoi cell around this GP's village, clipped to the block outline.
      gpIds[gp.key] = await insertArea(
        "gram_panchayat",
        gp.name,
        blockId,
        `(SELECT ST_Intersection(cell, ${block})
            FROM (SELECT (ST_Dump(ST_VoronoiPolygons(ST_Collect(ARRAY[${points}])))).geom AS cell) v
           WHERE ST_Contains(cell, ST_SetSRID(ST_MakePoint(${gp.lng}, ${gp.lat}), 4326))
           LIMIT 1)`,
      );
    }

    // ── Staff ──
    const staffIds: Record<string, string> = {};
    for (const s of DEMO_STAFF) {
      const [row] = await q.query<{ id: string }>(
        `INSERT INTO staff (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
        [s.name, s.email, passwordHash],
      );
      staffIds[s.key] = row!.id;
      for (const role of s.roles) {
        await q.query(`INSERT INTO staff_roles (staff_id, role, area_id) VALUES ($1, $2, $3)`, [row!.id, role, blockId]);
      }
    }

    // ── Shelters ──
    const shelterIds: string[] = [];
    for (const s of SHELTERS) {
      const [row] = await q.query<{ id: string }>(
        `INSERT INTO shelters (code, name, kind, area_id, location, capacity, safe_for, safety_score, accessible, facilities, contact_phone)
         VALUES ($1, $2::jsonb, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7, $8::text[], $9, $10, $11::jsonb, $12)
         RETURNING id`,
        [s.code, JSON.stringify(s.name), s.kind, gpIds[s.gp], s.lng, s.lat, s.capacity, `{${s.safeFor.join(",")}}`, s.safety, s.accessible, JSON.stringify(s.facilities), null],
      );
      shelterIds.push(row!.id);
    }

    // ── Personas ──
    for (const p of DEMO_PERSONAS) {
      const [row] = await q.query<{ id: string }>(
        `INSERT INTO citizens (phone, phone_verified_at, lang, channel, display_name, home_area_id, home_point, landmark,
                               consent_at, consent_version, registered_via, demo_persona, is_synthetic, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography, $9, $2, 'v1', 'web', $10, true, $2)
         RETURNING id`,
        [p.phone, t0, p.lang, p.channel, p.name, gpIds[p.gp], p.lng, p.lat, p.landmark, p.key],
      );
      const h = p.household;
      await q.query(
        `INSERT INTO households (citizen_id, adults, children, elderly, needs_mobility_help) VALUES ($1, $2, $3, $4, $5)`,
        [row!.id, h.adults, h.children, h.elderly, h.needs_mobility_help],
      );
    }

    // ── Synthetic households, spread inside each GP with PostGIS ──
    let n = 0;
    for (const [gpIndex, gp] of GPS.entries()) {
      const pts = await q.query<{ lng: number; lat: number }>(
        `SELECT ST_X(g.geom) AS lng, ST_Y(g.geom) AS lat
           FROM admin_areas a, ST_Dump(ST_GeneratePoints(a.geom, $2, $3)) g
          WHERE a.id = $1`,
        [gpIds[gp.key], gp.households, DEMO_SEED + gpIndex],
      );
      for (const pt of pts) {
        n += 1;
        const r = random();
        const lang = r < 0.8 ? "bn" : r < 0.9 ? "hi" : "en";
        const channel = random() < 0.6 ? "sms" : "whatsapp";
        const adults = 1 + Math.floor(random() * 3);
        const children = Math.floor(random() * 3);
        const elderly = random() < 0.22 ? 1 + Math.floor(random() * 2) : 0;
        const needsHelp = elderly > 0 ? random() < 0.25 : random() < 0.02;
        const phone = `+9100000${String(10000 + n).padStart(5, "0")}`;
        const [row] = await q.query<{ id: string }>(
          `INSERT INTO citizens (phone, phone_verified_at, lang, channel, home_area_id, home_point,
                                 consent_at, consent_version, registered_via, is_synthetic, created_at)
           VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography, $2, 'v1', $8, true, $2)
           RETURNING id`,
          [phone, t0, lang, channel, gpIds[gp.key], pt.lng, pt.lat, random() < 0.3 ? "volunteer" : channel],
        );
        await q.query(
          `INSERT INTO households (citizen_id, adults, children, elderly, needs_mobility_help) VALUES ($1, $2, $3, $4, $5)`,
          [row!.id, adults, children, elderly, needsHelp],
        );
      }
    }

    // ── The fictional incident, waiting as a draft from a demo bulletin ──
    const [incident] = await q.query<{ id: string }>(
      `INSERT INTO incidents (hazard, title, status, source, source_ref, summary, is_drill, starts_at, created_by, created_at)
       VALUES ('cyclone', 'Cyclone DEMO-1', 'draft', 'DEMO', 'DEMO-BULLETIN-01',
               'Severe cyclonic storm DEMO-1 is expected to cross the coast near Fraserganj in about 18 hours. Wind 110–120 km/h, storm surge 1–1.5 m in low-lying areas. (Fictional bulletin for demonstration.)',
               true, $1, $2, $1)
       RETURNING id`,
      [t0, staffIds.coordinator],
    );
    for (const [i, id] of shelterIds.entries()) {
      await q.query(
        `INSERT INTO shelter_incident_capacity (shelter_id, incident_id, capacity, updated_at) VALUES ($1, $2, $3, $4)`,
        [id, incident!.id, SHELTERS[i]!.capacity, t0],
      );
    }

    await q.query(
      `INSERT INTO audit_log (actor_type, action, entity, entity_id, detail, at) VALUES ('system', 'demo.seed', 'incident', $1, $2::jsonb, $3)`,
      [incident!.id, JSON.stringify({ citizens: n + DEMO_PERSONAS.length, shelters: SHELTERS.length }), t0],
    );

    return { incidentId: incident!.id, blockId, citizens: n + DEMO_PERSONAS.length, shelters: SHELTERS.length };
  });
}
