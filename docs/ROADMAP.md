# Roadmap

Plan for one developer working part-time. **First we build a showable concept on demo data**, then harden it into the real product. Each phase ends with something that can be demonstrated.

## Phase 0 — Concept demo (3–4 weeks)

**Goal:** the full story runs on demo data and can be shown to anyone. Details in [DEMO.md](DEMO.md).

This is a thin slice of the real architecture, not a throwaway mock-up.

- [x] Monorepo (npm workspaces, TypeScript, Vitest) — ESLint still to add
- [x] Database without Docker: PGlite (Postgres + PostGIS in-process); `DATABASE_URL` for a real server — `infra/docker-compose.yml` still to add
- [x] `packages/db`: core tables from [DATA_MODEL.md](DATA_MODEL.md) (areas, citizens, households, shelters, capacity, incidents, zones, alerts, deliveries, bookings, rescue requests, conversations)
- [x] Demo seed: Namkhana block, 8 shelters, 500 synthetic households, demo staff, fixed random seed
- [x] `packages/allocation`: v1 scoring ported, with unit tests
- [x] Bookings: create, cancel, check-in, walk-ins, hold expiry
- [x] Who-is-affected query; alert draft → second-person approval → fan-out
- [x] Conversation engine for booking, rescue and keywords (bn, en and hi)
- [x] `fake` channel adapter
- [x] `packages/ui`: Tailwind v4 + shadcn/ui, HOPE tokens, The Henston + Inter + Noto fonts, `Logo`, Motion presets ([DESIGN.md](DESIGN.md))
- [x] `apps/citizen` PWA (public) and `apps/console` (staff only, login wall, separate origin), with `/v1/public` and `/v1/staff` API groups
- [x] Demo screen inside the console: coordinator, approver, operator, rescue desk + three phone simulators
- [x] Crowd simulator, demo clock (fast-forward), reset, guided tour
- [x] `npm run demo` one-command start; DEMO banner everywhere
- [x] Hosting setup for free tiers: Vercel (apps) + Render (API) + Neon (database) — [HOSTING.md](HOSTING.md)
- [ ] Hosted copy live; 3-minute walkthrough video

**Status:** built and verified end to end in the browser (Nov 2026). Remaining: going live on the free tiers, and the video.

**Show it to:** teachers, friends in tech, a local NGO. Collect feedback before Phase 1.

## Phase 1 — Production foundation (3–5 weeks)

**Goal:** make the slice safe and solid enough for real users.

- [ ] Staff auth (password + TOTP 2FA), scoped roles, permission checks on every endpoint
- [ ] Audit log, insert-only
- [ ] Concurrency test: 200 parallel bookings never over-book
- [ ] Citizen phone OTP
- [ ] Full registration flows (SMS, WhatsApp, volunteer)
- [ ] Hindi everywhere; segment-length tests for all templates
- [ ] Retention jobs, consent records
- [ ] CI: lint, typecheck, unit and integration tests on every PR

## Phase 2 — Real channels (3–4 weeks)

**Goal:** real phones, at zero cost to us.

- [ ] `android-gw` adapter: real two-way SMS for demos and drills (≤ 100 people)
- [ ] `whatsapp-cloud` adapter on Meta's test number
- [ ] `msg91` / `gupshup` adapters with DLT-format templates (tested against a mock, switched off)
- [ ] Throttling, retries, WhatsApp → SMS fallback, delivery receipts
- [ ] Optional AI parser for free-text replies, with rules fallback

**Demo:** a real basic phone in the room receives the alert and books by replying `1`.

## Phase 3 — Full console and citizen PWA (4–6 weeks)

- [ ] Coordinator map: draw / select zones on real boundaries, shelter management
- [ ] Live dashboard, kill switch, correction alerts
- [ ] Shelter operator app: QR scan, walk-ins, status (mobile-first)
- [ ] Rescue desk: queue, priority, assignment
- [ ] Volunteer assisted registration
- [ ] Citizen PWA: OTP login, alerts, book, rescue, offline cache, Bengali-first
- [ ] Accessibility check

## Phase 4 — Adoption kit (3–4 weeks)

- [ ] SACHET CAP ingestion → draft incidents; CAP export
- [ ] Deploy guide (VM / government cloud), backup and restore runbook, load test report
- [ ] Operations guide for district teams
- [ ] Small real drill (≤ 100 people) with a local partner; written results
- [ ] Apache-2.0 licence, code of conduct, security contact
- [ ] Digital Public Goods registration; pitch deck — see [ADOPTION.md](ADOPTION.md)

## Phase 5 — Scale (on the adopter's budget)

- Production SMS and WhatsApp with DLT registration; missed-call number
- IVR voice alerts in Bengali and Hindi
- Nepali and Santali
- Road-condition-aware routing
- More districts and hazards (CWC flood gauges)
- Integration with state emergency control rooms

## Out of scope for now

- Native Android / iOS apps (the PWA covers this)
- Disaster prediction
- Payments or relief-material logistics
