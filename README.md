# Callwaka

An autonomous phone agent that turns a verbal promise ("a technician will arrive Friday 9am-1pm") into a tracked **Case** — calling, verifying, escalating, and following up until the promise is actually kept.

Built with Next.js (App Router), React 19, TypeScript, Tailwind CSS v4, [Turso](https://turso.tech/) (libSQL) for storage, and [CALL-E](https://www.heycall-e.com/) for the real phone calls.

This implements the state machine from the project doc:

```
Extract -> Store -> Wait -> Verify -> Escalate -> Repeat -> Resolve
```

## Getting started

```bash
npm install
cp .env.example .env.local   # then add your CALLE_API_KEY
npm run dev
```

Open http://localhost:3000.

### Get a CALL-E API key

1. Sign up at [heycall-e.com](https://www.heycall-e.com/) — new accounts get 20 free calls.
2. Grab a key from [dashboard.heycall-e.com/account/api-keys](https://dashboard.heycall-e.com/account/api-keys).
3. Put it in `.env.local` as `CALLE_API_KEY`.

Without a key, everything still runs — case creation, the dashboard, the "known commitment" flow — except the two routes that place real phone calls (`POST /api/cases` without a pre-known commitment, `POST /api/cases/[id]/verify`, `POST /api/cases/[id]/escalate`) will return a clear error instead of dialing.

### Storage: same code, locally and in production

`src/lib/db.ts` uses [Turso](https://turso.tech/)'s client (libSQL), which can point at either a local file or a real cloud database — same SQL, same API, zero code differences:

- **No `TURSO_DATABASE_URL` set** (the default) → writes to a local file (`./data/callwaka.db`). This is what local dev and `npm run test:state-machine` use — no Turso account, no network call, nothing to sign up for.
- **`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` set** → writes to your real Turso database instead, so data survives Vercel redeploys.

This means testing locally is testing the *real* database code, not a stand-in — the only thing that changes between your laptop and production is which file/URL it's pointed at.

## How the loop actually works

1. **Case created** — either with a commitment you already know (`commitment` + `deadline` fields), which skips straight to "waiting", or with just a problem description, which places a real CALL-E call to go secure one.
2. **CALL-E calls the counterparty**, gets a specific promise (what, when, reference number), and reads it back to confirm before hanging up.
3. **Callwaka waits.** A commitment is stored with a `due_at`. Nothing happens until that time arrives.
4. **Scheduler wakes up** (`/api/cron/check-due`, wired to Vercel Cron every 15 minutes in `vercel.json`) and finds commitments whose deadline has passed.
5. **Verification call** goes out — usually to the user ("did the technician show up?"), asking for a plain yes/no.
6. **Branch:**
   - Fulfilled → case closes, marked `resolved`.
   - Broken → commitment marked `broken`, and Callwaka **automatically** places an escalation call — no human has to click anything.
7. **Escalation call** references the prior ticket number and the broken promise, and works toward a *new* commitment, which restarts the loop from step 3.
8. This repeats until resolved or the escalation limit (`escalation_limit`, defaults to 3) is hit — at which point the case is marked `failed` and flagged for a human.

Every call result comes back **asynchronously** via `/api/calle/webhook` (CALL-E posts the terminal result there), not by blocking the request that started the call — real phone calls can take minutes, so nothing in this app sits waiting on one.

## Live data, with an automatic demo fallback

Every page now reads from `src/services/api.ts` — a hybrid layer that:

1. Tries the real backend first (Turso + CALL-E, via `realApi.ts`).
2. If that throws for **any** reason — server not deployed yet, database unreachable, CALL-E API key missing, a network hiccup mid-hackathon-demo — it transparently falls back to the same in-memory demo data the UI always used (`mockApi.ts`), so the dashboard never shows a blank or broken screen.
3. Shows a small floating badge (bottom-right, on every page) so it's always visible which one is currently active: 🟢 **Live — connected to CALL-E** or 🟡 **Showing sample data**.

This is a demo safety net, not a sync layer — if a request fails after real cases already exist, the fallback shows the mock seed data, not a merge of the two. It exists so that a flaky connection, an expired API key, or a not-yet-deployed backend during a hackathon demo degrades gracefully instead of showing an error screen.

On top of that, the **"Run Demo" button** on the Overview page (the scripted PROMISE → BROKEN → ESCALATE → RESOLVED walkthrough) still works exactly as it always did, completely independent of any of this — it's local component state, not a network call. That's your guaranteed-to-work backup if you want a deterministic demo regardless of backend state.

**Verified, not just claimed:** `scripts/test-ui-fallback.ts` runs the actual `api.ts` code against a real dev server for the "live" path, then against an unreachable port for the "fallback" path, and asserts both work and that it recovers automatically — see [Testing](#testing) below.

## Project structure

```
app/
  page.tsx                     — mounts the existing dashboard UI (unchanged)
  api/
    cases/route.ts             — POST create case (+ place initial call, or register a known commitment)
    cases/route.ts (GET)       — list cases
    cases/[id]/route.ts        — case detail (calls, commitments, timeline)
    cases/[id]/verify/route.ts — manually trigger a verification call
    cases/[id]/escalate/route.ts — manually trigger an escalation call
    calle/webhook/route.ts     — receives terminal call results from CALL-E, drives the state machine
    cron/check-due/route.ts    — scheduler: finds due commitments, triggers verification
    calls/, commitments/, activity/route.ts — read endpoints for those pages

src/
  lib/
    db.ts             — Turso/libSQL schema + connection (cases, commitments, calls, events)
    repo.ts            — data access + serializers into the exact frontend types
    calle.ts           — CALL-E REST API wrapper + task/schema builders for each call type
    state-machine.ts   — the actual Extract/Store/Wait/Verify/Escalate/Resolve logic
  services/
    mockApi.ts         — original in-memory fake demo data
    realApi.ts         — same function signatures, backed by the live API routes above
    api.ts             — what every page actually imports: tries realApi, falls back to
                         mockApi on any failure, reports which one is active
    connectionStatus.ts — tiny pub-sub so any component can show live/fallback status
  screens/, components/, types/ — unchanged UI layer (now importing services/api instead of mockApi)

scripts/
  test-state-machine.ts — end-to-end test of the whole loop without touching the network:
                          injects fake call results and asserts every transition
  test-ui-fallback.ts    — proves the live/fallback service switch actually works, against
                          a real running dev server
```

## Keeping the demo data even after Turso is connected

By default the 3 demo cases (ISP technician, insurance refund, StreamPlus
cancellation) only exist as **in-memory fallback data** in
`src/services/mockApi.ts`. They show up whenever `realApi.ts` fails (no
Turso, no data yet, etc.) — but the instant a real backend responds
successfully, `services/api.ts` switches to it, and since a fresh database
starts empty, all 5 screens (Overview, Cases, Calls, Commitments, Activity)
go blank.

To make these 3 cases **real, persistent rows** instead of a fallback —
so they're still there once Turso is connected, and survive restarts and
redeploys — run:

```bash
npm run seed
```

This writes the exact same 3 cases (same ids, titles, commitments, calls,
and timeline events as `mockApi.ts`) straight into whichever database
`src/lib/db.ts` is currently pointed at:

- No `TURSO_DATABASE_URL` set → seeds your local file (`./data/callwaka.db`).
- `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` set → seeds your real Turso database.

It's safe to run more than once — every insert is `INSERT OR IGNORE` keyed
on the same fixed ids, so re-running is a no-op if the rows already exist.
Typical flow when setting up Turso for the first time:

```bash
turso db create callwaka
turso db show callwaka --url            # -> TURSO_DATABASE_URL
turso db tokens create callwaka         # -> TURSO_AUTH_TOKEN
# put both in .env.local, then:
npm run seed
```

## Testing

```bash
npm run test:state-machine
```

This runs the whole PROMISE → WAIT → VERIFY → BROKEN → ESCALATE → NEW PROMISE → VERIFY → RESOLVED cycle from the project doc's demo scenario against a real local database (a plain file, no Turso account needed), using fabricated (but realistically shaped) CALL-E responses — no API key or phone calls required. It's the fastest way to confirm the backend logic is correct before wiring in real calls.

```bash
npm run dev &
npx tsx scripts/test-ui-fallback.ts 3000
```

This proves the live/fallback UI switch actually works: it points the real `api.ts` code at your running dev server (should return real data, state = `live`), then at an unreachable port (should transparently return the mock demo data, state = `fallback`), then back at the dev server (should recover to `live`).

## Going live on Vercel

1. Push this repo, import it into Vercel.
2. Set `CALLE_API_KEY` and `APP_BASE_URL` (your deployed URL) as environment variables.
3. `vercel.json` already schedules `/api/cron/check-due` every 15 minutes — Vercel Cron picks it up automatically on a Pro plan (or trigger it manually / via an external cron on Hobby).
4. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` so your data survives redeploys — without them, storage falls back to a local file that's **wiped on every deploy** on Vercel (`/tmp` is ephemeral). Get both in about a minute:
   ```bash
   npm install -g @turso/cli   # or: curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login
   turso db create callwaka
   turso db show callwaka --url          # -> TURSO_DATABASE_URL
   turso db tokens create callwaka       # -> TURSO_AUTH_TOKEN
   ```
   Same code, same SQL, both locally and in production — `src/lib/db.ts` just points at a local file when these two env vars are unset, and at your real Turso database when they're set.

## Wiring the UI to real data

The dashboard currently reads from `src/services/mockApi.ts` (untouched, so the UI behaves exactly as it did before). To make a page use real cases:

```diff
- import { CaseService } from "../services/mockApi";
+ import { CaseService } from "../services/realApi";
```

Both export the same functions with the same signatures, so no other code changes are needed per page.
