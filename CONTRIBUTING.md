# Contributing to HOPE

Thanks for helping. HOPE is a life-safety project, so we favour clarity, tests and small changes over speed.

## Prerequisites

- Node.js 22 or newer (npm comes with it)
- Git

That's all. Development and the demo use **PGlite**: real PostgreSQL + PostGIS compiled to WebAssembly and running inside Node. Data is stored in `.data/pglite` (git-ignored).

To use a real PostgreSQL 16 + PostGIS server instead, set `DATABASE_URL=postgres://…` before starting the API.

> **Tip (Windows):** keep the project outside OneDrive or other synced folders. Syncing `node_modules` slows installs and can cause random "UNKNOWN: read" errors.

## Getting started

```bash
git clone <repo-url> hope
cd hope
npm install
npm run demo
```

- Citizen app: http://localhost:5173
- Staff console: http://localhost:5174 (demo accounts, password `hope-demo`)
- API: http://localhost:4000

All messaging uses the `fake` adapter: no SMS is sent and nothing costs money.

## Commands

| Command | What it does |
|---|---|
| `npm run demo` | API + citizen app + console together |
| `npm run dev:api` / `dev:citizen` / `dev:console` | One of them |
| `npm test` | Unit and integration tests (in-memory Postgres + PostGIS) |
| `npm run typecheck` | TypeScript across all workspaces |
| `npm run build` | Production builds of both web apps |
| `npm run db:reset` | Wipe and re-seed the demo database |

## Workspace layout

```
apps/api        Fastify API, background jobs (in-process for now)
apps/citizen    public PWA
apps/console    staff console (separate origin, login wall)
packages/db           schema (SQL migrations), client, demo seed
packages/allocation   deterministic shelter scoring
packages/conversation SMS / WhatsApp state machine
packages/i18n         message catalogue (bn / en / hi), SMS segment counting
packages/channels     channel adapters (fake now; real providers in Phase 2)
packages/shared       types, helpers; zod schemas in @hope/shared/schemas
packages/ui           shadcn/ui components, theme tokens, Logo, Motion presets
legacy/v1             the original hackathon prototype (not part of the build)
```

### Adding shadcn/ui components

```bash
cd packages/ui
npx shadcn@latest add <component>
```

Then check that imports use `@hope/ui/lib/utils` (the CLI sometimes writes `from "cn"`).

## Ground rules

1. **Read the docs first:** [VISION](docs/VISION.md), [ARCHITECTURE](docs/ARCHITECTURE.md), [SECURITY_PRIVACY](docs/SECURITY_PRIVACY.md).
2. **SMS must keep working.** Any citizen feature needs an SMS path, or a clear reason why not.
3. **No AI in decisions.** AI may parse and translate; never allocate, alert, or check in.
4. **Rules live in the backend and database**, not in the UI.
5. **Every message template** has bn / en / hi versions and passes the segment-length test.
6. **Capacity, booking and alert code** must come with tests, including concurrency where relevant.
7. **No real personal data** in issues, fixtures, screenshots or logs. Demo numbers use the reserved `+91 00000 xxxxx` range.

## Branches and commits

- Branch from `main`: `feat/…`, `fix/…`, `docs/…`.
- Conventional commits: `feat: add hold expiry job`, `fix: …`, `docs: …`.
- Pull requests should be small, describe what changed and how it was tested, and pass tests and type checks.

## Translations

Bengali and Hindi copy must be reviewed by a native speaker before it's used in a drill. Unreviewed strings are marked `TODO(review-bn)` / `TODO(review-hi)`.

## Reporting security issues

See [SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md#reporting-a-vulnerability). Please don't open public issues for vulnerabilities.
