# HOPE

**Hazard Outreach, Protection & Evacuation**

> From warning to safe shelter — for everyone, on any phone.

HOPE is an open-source disaster early-warning and shelter-coordination platform. It warns people in an affected area before a disaster, lets them book a place in a safe shelter or ask for rescue over **SMS, WhatsApp, the web or an app**, and gives shelter operators and authorities a live picture of who is coming and where space is left.

HOPE is being built first for **West Bengal, India**, and designed so that a government department or a large organisation can adopt it and run it at scale.

> **Status:** Phase 0 — **concept demo** running on fictional data ([docs/DEMO.md](docs/DEMO.md)). The earlier hackathon prototype (*Aashray AI*) is kept in [`legacy/v1`](legacy/v1) and documented in [docs/legacy/v1-prototype.md](docs/legacy/v1-prototype.md).

## Run the demo

Needs Node.js 22+. No Docker or database install: the demo runs real PostgreSQL + PostGIS inside Node (PGlite).

```bash
npm install
npm run demo
```

| App | URL | Who |
|---|---|---|
| Citizen app (PWA) | http://localhost:5173 | Public. On the welcome screen, open as Rina, Arjun or Salma |
| Staff console | http://localhost:5174 | Staff only. Use a demo account; *Demo presenter* has the guided 10-step tour |
| API | http://localhost:4000 | `/v1/public/*` for citizens, `/v1/staff/*` for staff |

Demo staff accounts use the password `hope-demo` (fictional; demo mode only). Everything is fictional and no real message is ever sent.

```bash
npm test          # unit + integration tests (real Postgres + PostGIS in memory)
npm run typecheck
npm run db:reset  # wipe and re-seed the demo database
```

---

## Why HOPE exists

During cyclones and floods, many people never find a safe place to stay:

- **They don't hear about the disaster in time.**
- **When they do, they can't reach help** — so they wait.
- The people most at risk often have a basic phone, little data and no English.

Everyone deserves to be safe. HOPE closes the gap between an official warning and a family reaching a shelter. Read the full problem statement in [docs/VISION.md](docs/VISION.md).

## How it works

1. **Register before the season** — by missed call, SMS, WhatsApp, the web, or with a volunteer's help. Only a phone number and village or ward are needed; GPS is optional.
2. **Official warning arrives** (IMD, CWC, SACHET). A district coordinator marks the affected area and, with a second person's approval, sends the alert.
3. **Everyone registered in that area gets it** in their language, on their channel:
   ```
   [HOPE] Cyclone warning (source: IMD). Your area: Namkhana.
   Reply 1 to book shelter, 2 if you need rescue.
   ```
4. **Reply to book.** HOPE picks the safest suitable shelter with space, holds the places, and sends a booking code.
5. **Shelter operators check people in** by code or QR scan. Walk-ins are counted too, so capacity stays accurate.
6. **Rescue requests** go to a prioritised rescue desk.
7. **All clear** is broadcast when the incident ends.

## Principles

- **SMS first.** Every citizen flow works by plain text on a basic phone.
- **Relay, don't predict.** HOPE only passes on official warnings, with the source named. It never forecasts disasters itself.
- **Two people approve every alert.**
- **AI assists, never decides.** AI may read free-text replies and translate. Shelter allocation is deterministic and explainable.
- **Local language first:** Bengali, English and Hindi to start.
- **Privacy by design** under India's DPDP Act 2023.
- **Open and adoptable:** open standards (CAP, LGD codes), swappable SMS providers, one-command deployment.

## Documentation

| Document | What it covers |
|---|---|
| [VISION.md](docs/VISION.md) | Problem, users, goals, non-goals, West Bengal context |
| [DEMO.md](docs/DEMO.md) | The concept demo: screen, 5-minute script, demo data |
| [HOSTING.md](docs/HOSTING.md) | Free hosted demo: Vercel + Render + Neon, step by step |
| [DESIGN.md](docs/DESIGN.md) | Design system: shadcn/ui, Motion, typography, logo, colour, screens |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, tech stack, repo layout, key flows |
| [DATA_MODEL.md](docs/DATA_MODEL.md) | PostgreSQL + PostGIS schema and core transactions |
| [CHANNELS.md](docs/CHANNELS.md) | SMS, WhatsApp, missed call, web: conversation design and message copy |
| [SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md) | Roles, alert safeguards, data protection, threat model |
| [ROADMAP.md](docs/ROADMAP.md) | Phases and deliverables |
| [BUDGET.md](docs/BUDGET.md) | What it costs to build, and what it costs an adopter to run |
| [ADOPTION.md](docs/ADOPTION.md) | How HOPE gets handed over to government and organisations |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to set up and contribute |

## Tech at a glance

TypeScript monorepo (npm workspaces) · Fastify API · **PostgreSQL + PostGIS** (PGlite in demo, PostgreSQL server in production) · React 19 + Tailwind v4 + **shadcn/ui** + **Motion** · citizen PWA (public) and staff console (separate, login-only) · MapLibre + OpenStreetMap · SMS / WhatsApp adapters.

## License

Planned: Apache-2.0.

## Disclaimer

HOPE is not an official warning service. It relays warnings issued by authorised agencies. Until adopted by an authority, it must only be used for demonstrations and drills.
