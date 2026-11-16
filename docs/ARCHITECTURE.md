# Architecture

## Overview

HOPE is **one backend with thin channels**. All rules — who is affected, which shelter, how much capacity is left, who may send an alert — live in the API and the database. SMS, WhatsApp, the citizen PWA and the staff console are just different ways of talking to the same backend, so they always behave the same.

```
             ┌──────────────── Warning sources ─────────────────┐
             │ SACHET CAP feed · IMD / CWC bulletins (import)     │
             │ Staff console (official source + 2-person approval)│
             └────────────────────────┬──────────────────────────┘
                                      v
┌─────────────────────────────── Core (TypeScript) ────────────────────────────────┐
│ apps/api  (Fastify)                          apps/worker  (pg-boss)               │
│ • Incidents & affected zones                 • Alert fan-out, retries, throttling │
│ • Who-is-affected (PostGIS)                  • Hold-expiry sweeper (every minute) │
│ • Shelter allocation (deterministic)         • Delivery receipts                  │
│ • Bookings (row-locked transactions)         • SACHET feed polling                │
│ • Rescue requests                            • Data retention / deletion          │
│ • Conversation engine (SMS / WhatsApp)                                            │
│ • Auth, roles, audit log                                                          │
└──────────────┬──────────────────────────────────────────────────┬─────────────────┘
               │                                                  │
     PostgreSQL 16 + PostGIS                              Channel adapters
     (single source of truth)                  ┌──────────────────────────────────┐
                                               │ fake        (dev + simulator)    │
                                               │ android-gw  (demos, drills)      │
                                               │ msg91 / gupshup (production SMS) │
                                               │ whatsapp-cloud (Meta API)        │
                                               │ missed-call (provider webhook)   │
                                               └──────────────────────────────────┘
Clients (separate builds, separate domains)
• apps/citizen  — Public PWA, Bengali / English / Hindi, works offline
                  hope.example          → /v1/public/*
• apps/console  — Staff only, login required: coordinator map, alert approval,
                  shelter check-in, rescue desk, volunteer registration
                  console.hope.example  → /v1/staff/*
```

## Phase 0 as built

The concept demo implements this architecture with a few simplifications, to be replaced as the roadmap progresses:

| Planned | Phase 0 (now) | Why |
|---|---|---|
| pnpm + Turborepo | npm workspaces | Nothing extra to install |
| PostgreSQL server (Docker) | **PGlite** in-process (real Postgres 17 + PostGIS 3.6 in WebAssembly); `DATABASE_URL` switches to a real server | Demo runs on any laptop, offline |
| Drizzle ORM | Plain SQL migrations (`packages/db/migrations`) + a tiny typed query layer | Same SQL runs on PGlite and PostgreSQL; PostGIS needs raw SQL anyway |
| `apps/worker` with pg-boss | In-process jobs in `apps/api` (dispatch every 200 ms, holds and arrivals every 2 s) | One process for the demo |
| TanStack Router, i18next | React Router 7, small typed dictionaries | Smaller citizen bundle (146 KB gzipped first load) |
| Staff 2FA (TOTP) | Password only | Phase 1 |

## Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript (Node 22) | One language across API, worker and UIs; shared types |
| Monorepo | pnpm workspaces + Turborepo | Shared packages, fast builds |
| API | Fastify + Zod, OpenAPI generated from schemas | Fast, schema-first, self-documenting |
| Database | **PostgreSQL 16 + PostGIS** | Transactions and row locks for capacity; `CHECK` constraints; spatial queries; mature tooling and backups |
| DB access | Drizzle ORM + plain SQL migrations | Typed queries; raw SQL where PostGIS needs it |
| Jobs | pg-boss (queue stored in Postgres) | Retries, cron, scheduling — no Redis to run |
| UI foundation | React 19 + Vite + Tailwind CSS v4 + **shadcn/ui** (Radix) + **Motion** + lucide-react, shared in `packages/ui` | Accessible, clean components we own; small, purposeful animations. See [DESIGN.md](DESIGN.md) |
| Citizen UI | PWA (vite-plugin-pwa / Workbox), TanStack Query + Router, React Hook Form + Zod | Installable, offline cache, small bundle (target ≤ 150 KB JS gzipped) |
| Staff UI | Same foundation + shadcn Data Table / Charts + MapLibre GL + OpenStreetMap (self-hosted PMTiles) | Data-heavy screens and maps with no paid API |
| Fonts | The Henston (Adobe Fonts) for logo and headings; Inter, Noto Sans Bengali, Noto Sans Devanagari self-hosted for body | Brand character plus readability in all three scripts |
| Auth | Citizens: phone OTP. Staff: email + password (argon2) + TOTP 2FA | Basic-phone friendly; staff accounts protected |
| i18n | ICU message files in `packages/i18n` | Bengali, English, Hindi from day one |
| AI | Optional provider behind `packages/ai`, with a rules fallback | Parsing free text, translation; HOPE works with AI switched off |
| Tests | Vitest (unit), Testcontainers Postgres (integration), Playwright (UI) | Capacity and allocation logic must be proven |
| Deployment | Docker Compose; any Linux VM or government cloud | One command to run everything |
| Monitoring | Structured JSON logs, Sentry, health endpoints | Know when alerts fail |

## Repository layout

```
hope/
├── apps/
│   ├── api/            REST API + channel webhooks
│   ├── worker/         background jobs
│   ├── citizen/        citizen PWA (public)
│   └── console/        staff app (login required, separate domain)
├── packages/
│   ├── ui/             shadcn/ui components, HOPE theme tokens, Logo, motion presets
│   ├── db/             schema, migrations, seed data (WB boundaries, sample shelters)
│   ├── allocation/     deterministic shelter scoring
│   ├── channels/       channel adapter interface + implementations
│   ├── conversation/   SMS / WhatsApp state machine
│   ├── i18n/           message catalogues (bn, en, hi)
│   ├── ai/             optional text understanding, with fallback
│   └── shared/         Zod schemas, types, constants
├── infra/
│   ├── docker-compose.yml
│   └── deploy/         VM / cloud deployment scripts
└── docs/
```

## Key flows

### 1. Declaring an incident and sending an alert

1. Coordinator creates an **incident** from an official bulletin (source and reference are required).
2. Coordinator selects affected **areas** (blocks, gram panchayats, wards) or draws a polygon. These become **incident zones**.
3. Coordinator drafts the **alert** text in each language (templates pre-filled).
4. A **second staff member** approves it. The database refuses approval by the author.
5. The worker finds affected citizens with a PostGIS query, then queues one delivery per citizen per channel, throttled to the provider's limits.
6. Delivery receipts update each delivery's status; the console shows sent / delivered / failed live.

### 2. Booking a shelter

1. Citizen replies `1` (SMS / WhatsApp) or taps *Book* (PWA).
2. The conversation engine collects the number of people and any special needs, skipping questions already answered at registration.
3. **Allocation** filters shelters (open, safe for this hazard, enough space, accessible if needed) and scores them deterministically. See [Allocation](#allocation).
4. In one transaction the API locks the shelter's capacity row, re-checks space, inserts the booking and increases `reserved`.
5. Citizen receives the booking code and hold expiry time.
6. If the hold expires, the worker marks it `expired`, releases the places and offers to rebook.

### 3. Check-in

1. Operator scans the QR code or types the booking code.
2. API checks: right shelter, right incident, still `held`. Explicit errors otherwise (`WRONG_SHELTER`, `EXPIRED`, `ALREADY_CHECKED_IN`, `CANCELLED`, `NOT_FOUND`).
3. In one transaction: booking → `checked_in`, `reserved −= n`, `occupied += n`.
4. **Walk-ins** without a booking: operator adds a count, `occupied += n`.

### 4. Rescue request

1. Citizen replies `2` or taps *Need rescue*.
2. Engine asks for number of people and a landmark; location from registration is attached.
3. Request enters the rescue desk queue, prioritised by vulnerability and hazard level.
4. Desk assigns a team and updates status; citizen gets an SMS at each change.

## Allocation

Ported from the v1 prototype and moved to `packages/allocation`, with unit tests.

**Hard filters** — a shelter is excluded if it is:
- not open for this incident, or marked full / unsafe,
- not safe for this hazard type,
- short of space for the whole household,
- not accessible when the household needs mobility help.

**Score** (0–100):

| Factor | Weight |
|---|---:|
| Safety for this hazard | 40% |
| Free capacity | 25% |
| Distance (road distance when available, else straight line) | 20% |
| Accessibility | 10% |
| Facilities (water, toilets, power, medical, women's space) | 5% |

The score breakdown is stored with each booking so any decision can be explained later.

## Channel adapters

Every channel implements the same interface in `packages/channels`:

```ts
interface ChannelAdapter {
  name: 'fake' | 'android-gw' | 'msg91' | 'gupshup' | 'whatsapp-cloud';
  send(msg: OutboundMessage): Promise<SendResult>;          // provider id, segments, cost
  parseInbound(req: WebhookRequest): InboundMessage[];      // normalise replies
  parseReceipt(req: WebhookRequest): DeliveryReceipt[];     // delivered / failed
  limits: { perSecond: number; perDay?: number };
}
```

The active adapters are chosen by configuration, so an adopting organisation switches to its own provider without touching code. See [CHANNELS.md](CHANNELS.md).

## Environments

| Environment | Database | Messaging |
|---|---|---|
| Local dev | Docker Postgres + PostGIS | `fake` adapter + phone simulator |
| Demo | Free-tier VM | `fake` + `android-gw` + WhatsApp test number |
| Production (adopter) | Managed Postgres in India, daily backups, point-in-time recovery | Provider SMS (DLT registered) + WhatsApp Cloud API |

## Non-functional targets

- An approved alert reaches the provider for 10,000 recipients within 5 minutes (rate limits permitting).
- Booking API p95 under 300 ms.
- No over-booking under concurrent load (proven by an integration test with parallel bookings).
- Citizen PWA usable on 2G and on low-end Android phones.
- Core flows keep working if the AI provider is down.
