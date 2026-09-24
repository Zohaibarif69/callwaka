# Callwaka

## The Problem

Companies make verbal promises over the phone all the time — "a technician will arrive Friday 9am-1pm," "your refund will be processed in 3 days," "we'll call you back by Tuesday." Once the call ends, that promise is unenforced. Nobody follows up when it's broken; the person just has to notice, remember, and call back themselves, often re-explaining the whole issue from scratch.

## What This Does

Callwaka turns a verbal promise into a tracked **Case**. It calls the other party to pin down a specific, confirmed commitment, waits until it's due, calls again to check whether it was actually kept, and if it wasn't, calls back on its own — referencing the original ticket — to demand a new commitment. It repeats this until the promise is fulfilled, or escalation stops making progress and a human needs to step in.

The goal isn't to summarize a call. It's to hold the other side accountable for what they said, without a person having to babysit the timeline.

## How It Works

```
Extract → Store → Wait → Verify → Escalate → Resolve
```

1. **Extract** — CALL-E calls the counterparty to secure a specific commitment (what will happen, on what date, in what window, plus a reference number), and reads it back to confirm before hanging up.
2. **Store** — the commitment is saved with a due date. Nothing happens until that date arrives.
3. **Wait** — a scheduled job checks periodically for commitments that have come due.
4. **Verify** — a call goes out (usually to the user) to confirm whether the promise was kept.
5. **Resolve or Escalate** — fulfilled closes the case. Broken triggers an automatic follow-up call that references the original ticket and works toward a new commitment.
6. **Repeat** — this cycle continues until the case resolves, or an escalation limit is reached and the case is flagged for a human to take over.

Call results come back asynchronously through a webhook rather than blocking a request, since a real phone call can take minutes to finish.

## Stack

- Next.js (App Router) + React + TypeScript
- Turso (libSQL) for storage — same code path locally and in production
- [CALL-E](https://www.heycall-e.com/) for the outbound phone calls

## Setup

```bash
npm install
cp .env.example .env.local   # add your CALLE_API_KEY
npm run dev
```

Open http://localhost:3000.

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `CALLE_API_KEY` | Yes | Needed to place real calls. Without it, everything else still works. |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | No | Falls back to a local SQLite file if unset. |
| `APP_BASE_URL` | Yes in production | Where CALL-E sends call results. |

## Project Structure

```
app/api/         — API routes: cases, calls, webhook, scheduled checks
src/lib/          — database, CALL-E client, the state machine itself
src/services/     — data layer used by the UI
src/screens/      — pages (Overview, Cases, Calls, Commitments, Activity)
```