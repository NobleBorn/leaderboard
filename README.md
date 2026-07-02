# 🏆 Summer Games Leaderboard

An internal leaderboard for a summer tournament of daily puzzle games (Wordle,
Connections, and any others you enable) — colleagues manually enter their own
results, and the app tracks scores, rankings, and daily results.

No scraping or automation of NYT games — results are entered by hand.

## Stack

- **Frontend:** Vue 3 + Vite (`frontend/`)
- **Backend:** Node/Express + Node's built-in `node:sqlite` (`backend/`) — requires **Node ≥ 22.5**
- Data is stored in a local SQLite file at `backend/data/leaderboard.db` (git-ignored — it's runtime data, not source).

## Project structure

```
backend/
  src/
    server.js          Express app entry point
    db.js               Schema + game seeding
    scoring.js          Per-game scoring rules
    routes/             REST endpoints (participants, games, submissions, leaderboard, tournament)
    tournament.json     Tournament name/dates/enabled games
  data/                 SQLite database (git-ignored)

frontend/
  src/
    views/               One component per page (Home, Submit, Leaderboard, Daily, Participants, Admin)
    components/          Shared UI (ThemedSelect, etc.)
    api/index.js         Thin fetch wrapper for the backend API
    scoring.js           Mirrors backend scoring for live previews
```

## Running locally

Two servers, run in separate terminals:

```bash
cd backend && npm install && npm start      # http://localhost:3001
cd frontend && npm install && npm run dev   # http://localhost:5173
```

The frontend dev server proxies `/api/*` to `http://localhost:3001` (see
`frontend/vite.config.js`), so you don't need to configure anything locally.

### Admin page

`/admin` (not linked in the nav bar — visit the URL directly) lets you remove
players, enable/disable games, and edit submitted results. It's gated by a
simple pincode check in `AdminView.vue`. This is a client-side-only gate for
casual protection, **not real access control** — the backend API itself has
no authentication.

## Deploying

### Frontend → Vercel

This part is straightforward:

1. Import this repo into Vercel.
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Vite** (build command `npm run build`, output directory `dist`).
4. Add an environment variable **`VITE_API_URL`** pointing at wherever you deploy the backend (see below), e.g.:
   ```
   VITE_API_URL=https://leaderboard-api.onrender.com
   ```
   Leave it unset only if the backend is also somehow reachable at the same origin — in practice you'll want it set.

### Backend → NOT Vercel

The backend **can't run as Vercel serverless functions** the way it's built:
it keeps its data in a local SQLite file on disk, and Vercel's serverless
functions have an ephemeral, per-invocation filesystem — writes don't
reliably persist between requests, let alone deployments. Deploying it to
Vercel as-is would mean scores randomly disappearing.

Instead, deploy the backend somewhere that runs it as a normal long-lived
process with persistent disk — for example:

- **Render** or **Railway** (free/cheap tiers, easy Node deploys — just be sure to attach a persistent disk/volume for `backend/data`, since default ephemeral storage on some free tiers resets on redeploy/restart)
- **Fly.io** (has a straightforward persistent volumes story)
- Any small VPS

Whichever you pick:
- Root/service directory: `backend`
- Build: `npm install`
- Start command: `npm start`
- Make sure the Node version is **≥ 22.5** (see `backend/package.json`'s `engines` field)
- Mount persistent storage at `backend/data` if the platform's disk is otherwise ephemeral
- No environment variables are required beyond an optional `PORT` (most platforms set this automatically)

Once the backend is deployed, put its URL into `VITE_API_URL` on the Vercel
project and redeploy the frontend.

### If you outgrow SQLite-on-a-server

If persistence keeps being annoying, or you'd rather run everything on
Vercel, the real fix is swapping the storage layer for a hosted database
(e.g. Vercel Postgres, Turso, Supabase) instead of a local SQLite file — that
would let the backend run as serverless functions too. That's a bigger change
than what's here today, so it's not done unless/until it's actually needed.
