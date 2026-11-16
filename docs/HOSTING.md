# Hosting the demo (free)

The hosted demo is the same build as `npm run demo`, split over three free services:

```
 Citizen app (Vercel)  ── /v1/public ──┐
 gethope.vercel.app                    │
                                       ├──> HOPE API (Render, free) ──> PostgreSQL + PostGIS (Neon, free)
 Staff console (Vercel) ── /v1/staff ──┘     hope-demo-api.onrender.com
 hope-console.vercel.app
```

- **Neon** hosts the database. Free, no expiry date, supports PostGIS.
- **Render** runs the API. The free instance sleeps after ~15 minutes without visitors and takes **about a minute to wake up**. Every time it starts, the demo is reset to step 1 (`HOPE_RESET_ON_START`).
- **Vercel** hosts the two apps as static sites and forwards their `/v1/...` requests to the API. To the browser, each app and its API share one address, so the strict cookies and the "console is separate" rules work exactly as on a laptop.

Why not one service: the API must run all the time (background jobs send alerts and expire bookings), which Vercel can't do; and the built-in database (PGlite) needs ~700 MB of memory, more than Render's free 512 MB. With Neon the API uses ~100 MB.

Everything runs in **demo mode**: only fictional demo phone numbers can receive messages, and nothing real is ever sent.

## One-time setup (about 20 minutes)

The API deploys from the `main` branch, so merge the hosting changes first.

### 1. Database — Neon

1. Sign up at [neon.tech](https://neon.tech) (signing in with GitHub is easiest).
2. Create a project: name `hope`, region **AWS Asia Pacific (Singapore)**.
3. On the project dashboard click **Connect**, turn **Connection pooling off**, and copy the connection string (`postgresql://…neon.tech/neondb?sslmode=require`).

HOPE creates its tables and the PostGIS extension itself on first start.

### 2. API — Render

1. Sign up at [render.com](https://render.com) with GitHub.
2. **New → Blueprint**, pick the `hope` repository. Render reads [`render.yaml`](../render.yaml) and proposes the `hope-demo-api` service.
3. Fill in the three values it asks for:
   - `DATABASE_URL`: the Neon connection string
   - `CITIZEN_ORIGIN`: `https://gethope.vercel.app`
   - `CONSOLE_ORIGIN`: `https://hope-console.vercel.app`
4. Deploy. When it's live, `https://hope-demo-api.onrender.com/health` shows `{"ok":true,"mode":"demo",…}`.

If Render gives the service a different address (the name was taken), put that address in both `apps/citizen/vercel.json` and `apps/console/vercel.json`.

### 3. Apps — Vercel (two projects)

Citizen app:
1. **Add New → Project**, import `hope`.
2. Project name `gethope`; **Root Directory** `apps/citizen`. Leave the other settings; they come from `apps/citizen/vercel.json`.
3. Deploy.

Staff console:
1. **Add New → Project**, import `hope` again.
2. Project name `hope-console`; **Root Directory** `apps/console`.
3. Environment variable `VITE_CITIZEN_URL` = `https://gethope.vercel.app` (Salma's phone in the demo shows the citizen app from this address).
4. Deploy.

If Vercel gives either project a different address, update `CITIZEN_ORIGIN` / `CONSOLE_ORIGIN` on Render (and `VITE_CITIZEN_URL`) to match exactly, with no trailing slash.

### 4. Tidy up

- The old `aashray-ai` Vercel project still builds the repo the v1 way and fails. Delete it (Settings → Advanced → Delete Project), or disconnect its Git repository. Deleting it also takes down the old v1 link.
- Adobe Fonts: add `gethope.vercel.app` and `hope-console.vercel.app` to the web project's domains, or the HOPE logo falls back to a standard serif font there.

## Before presenting

Open the console **a minute early** so the API wakes up. The first requests may fail while it starts; the pages retry by themselves.

Sign in with a demo account (password `hope-demo`) and choose **Demo presenter**. Anyone with the link can also press **Reset**; that's expected for a public demo.

## Updating

Push to `main`: Render and both Vercel projects redeploy automatically. Vercel preview deployments of other branches load, but their API calls are refused (their address isn't an allowed origin), which is intended.

## Testing against a PostgreSQL server locally

The end-to-end test can run against any PostgreSQL + PostGIS server (it wipes the database first):

```bash
TEST_DATABASE_URL=postgres://… npx vitest run apps/api/src/flow.test.ts
```
