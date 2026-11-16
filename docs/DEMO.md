# HOPE concept demo

The first thing we build is a **showable concept**: HOPE running end to end on **demo data only**, so it can be shown to anyone — a teacher, an NGO, a district officer — in about five minutes, without paying for anything or sending a single real SMS.

## Goals

- Tell the whole story in **5 minutes**: warning → alert → reply → booked shelter → check-in → rescue → all clear.
- **Runs on a laptop with no internet** (local Docker), so a weak connection never ruins a presentation. A hosted link is a bonus.
- **Repeatable:** same data and same result every time; one click resets everything.
- **Honest:** a permanent `DEMO — fictional data` banner. No real people, no real phone numbers, no real warnings.
- **Built on the real architecture** (Postgres + PostGIS, API, conversation engine, allocation) — a thin slice of the product, not a throwaway mock-up.

## What is real and what is simulated

| Part | In the demo |
|---|---|
| Database, booking transactions, capacity, hold expiry | **Real** (Postgres + PostGIS) |
| Shelter allocation scoring | **Real** |
| Conversation engine (replies `1`, `2`, `9`…) | **Real** |
| Alert approval (two people) | **Real**, with two demo staff accounts |
| Who-is-affected map query | **Real** PostGIS query on demo data |
| Official warning | **Simulated** demo bulletin, labelled as such |
| SMS / WhatsApp delivery | **Simulated** on on-screen phones (`fake` adapter) |
| Hundreds of citizens replying | **Simulated** by a crowd simulator with a fixed random seed |
| Time passing (holds expiring, cyclone approaching) | **Simulated** with a demo clock you can fast-forward |

Optional for in-person demos: plug in the `android-gw` adapter so a **real basic phone** in the room receives the alert and books by replying `1`.

## The demo screen

One page, split in two, designed for a laptop or projector:

```
┌──────────────────────────── DEMO — fictional data ─── clock 14:05 ⏩ ─ Reset ─┐
│                                               │  ┌────────┐ ┌────────┐ ┌──────┐ │
│   CONSOLE (coordinator / operator / rescue)   │  │ Basic  │ │WhatsApp│ │ PWA  │ │
│                                               │  │ phone  │ │ style  │ │      │ │
│   Map: Namkhana block, GPs, shelters,         │  │ (SMS)  │ │        │ │      │ │
│   households heat-map, capacity bars          │  │ Rina   │ │ Arjun  │ │Salma │ │
│                                               │  └────────┘ └────────┘ └──────┘ │
│   Live counters: alerts sent / delivered,     │                                 │
│   bookings, rescue requests                   │   Crowd simulator: ▶ 300 people │
├───────────────────────────────────────────────┴─────────────────────────────────┤
│  Guided tour:  ◀ Back   Step 4 of 10 — "Citizens reply to book"   Next ▶          │
└────────────────────────────────────────────────────────────────────────────────┘
```

- **Where it lives:** this presenter screen is part of the **staff console app** (`/demo`), behind a demo login. It is never part of the public citizen PWA. The citizen PWA can still be opened on its own (or on a real phone) in demo mode.
- **Console** switches between roles with a dropdown (Coordinator, Approver, Shelter operator, Rescue desk). This role switcher exists only in demo mode.
- **Phones** render the real citizen screens inside device frames (PWA), plus an SMS-style thread and a WhatsApp-style thread, all built with the same shadcn/ui components and Motion transitions as the product ([DESIGN.md](DESIGN.md)).
- **Phones** are three demo citizens with different needs (names and numbers are fictional):
  - **Rina** — basic phone, SMS in Bengali, household of 4 with an elderly parent.
  - **Arjun** — WhatsApp style, English, household of 3.
  - **Salma** — PWA, Hindi, needs rescue (water rising, can't leave).
- **Guided tour** bar walks the presenter through the script; each step can also be done by hand.
- **Demo clock** with ⏩ to jump forward 30 or 60 minutes.

## Demo script (about 5 minutes)

| # | Step | What the audience sees |
|---|---|---|
| 1 | **The area** | Map of Namkhana block: gram panchayats, 8 shelters with capacity, 500 registered households, vulnerable households highlighted |
| 2 | **Warning arrives** | A demo bulletin card: "Cyclone *DEMO-1*, landfall expected in 18 hours (DEMO SOURCE)". HOPE creates a draft incident |
| 3 | **Coordinator targets the alert** | Marks the coastal GPs *Evacuate* and the rest *Warning*; preview shows 503 households and the text for each level in 3 languages, all within 2 SMS segments |
| 4 | **Second person approves** | The coordinator (also an approver) tries to approve their own draft and is blocked by the two-person rule; the approver approves |
| 5 | **Alert goes out** | Delivery counter climbs; the three phones buzz in Bengali, English and Hindi |
| 6 | **Rina books by SMS** | Types `1` → confirms 4 people → elderly `1` → gets `Booked: … Code K7Q-M3P` |
| 7 | **The crowd replies** | Every alerted household replies (simulated, ~30 s): capacity bars fill; Moushuni Cyclone Shelter C fills and later bookings go to the next best shelter |
| 8 | **Salma asks for rescue** | Replies `2` on the PWA; request appears on the rescue desk at priority 1; desk assigns a team; Salma gets an update |
| 9 | **Check-in at the shelter** | Switch to Shelter operator → enter Rina's code. First try at the wrong shelter shows `WRONG_SHELTER`; correct shelter checks her in, `reserved → occupied` |
| 10 | **Time passes, all clear** | ⏩ 2 hours: unused holds expire and capacity is released; send *All clear*; summary: alerts delivered, people sheltered, rescues, average time from alert to booking |

A 1-minute version uses steps 1, 5, 6, 7 and 10.

## Demo data

All data is generated by the seed in `packages/db/src/seed/demo.ts` with a fixed random seed (`npm run db:reset`, or *Reset demo* in the console).

| Data | Contents |
|---|---|
| Area | South 24 Parganas → Kakdwip subdivision → Namkhana block → its 7 gram panchayats (real names; approximate locations; boundaries simplified as Voronoi cells; LGD codes to be added) |
| Shelters | 8 fictional shelters (e.g. "Cyclone Shelter A", "Primary School B") at plausible locations, capacities 80–400, mix of accessible / not, hazard-safe flags |
| Households | 500 synthetic households spread over the GPs; ~20% with elderly, ~5% needing mobility help; languages ~80% bn, 10% hi, 10% en; channels ~60% SMS, 40% WhatsApp |
| Phone numbers | Clearly fake numbers from a reserved demo range, never real ones; the `fake` adapter refuses to send to anything else |
| Staff | `coordinator@demo.hope` (coordinator + approver), `approver@demo.hope`, `operator@demo.hope`, `rescue@demo.hope`, `admin@demo.hope`; password `hope-demo` |
| Incident | Cyclone `DEMO-1` with a fictional bulletin, flagged `is_drill = true` |
| Crowd behaviour | ~60% book, ~5% ask for rescue, ~35% don't reply; of those who book ~85% arrive 20–110 demo-minutes later and ~15% never show (their hold expires) |

## Demo mode rules

- Enabled by `HOPE_MODE=demo`. In this mode only the `fake` (and optionally `android-gw`) adapters can load.
- Every page shows the DEMO banner; every message starts with `[HOPE DEMO]`.
- `Reset` truncates incident data and re-runs the seed in under 10 seconds.
- The demo clock only exists in demo mode; production always uses real time.

## Running it

```bash
npm install
npm run demo     # API (with in-process Postgres + PostGIS, seeded on first run) + citizen app + console
```

Then open the console at http://localhost:5174, sign in with a demo account and choose **Demo presenter**.

Hosted version: the same build on a free-tier server, reset automatically every night.

## Done when

- [ ] From a cold laptop, `pnpm demo` is ready in under 2 minutes, with no internet needed after install.
- [x] All 10 steps work through the guided tour (verified in the browser, Nov 2026).
- [x] Reset returns to step 1 with identical data (fixed seed; booking codes are random by design).
- [ ] Works on a 1366×768 projector and a phone screen (for sharing the hosted link).
- [ ] A recorded 3-minute walkthrough video.
