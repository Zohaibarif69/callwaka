# Callwaka

> AI-powered follow-up for promises made over the phone.

Callwaka turns a verbal promise into a tracked case, follows its timeline, and automatically checks whether the promise was kept. When it was not, Callwaka calls back with the original ticket or reference number and works toward a new commitment.

The goal is simple: hold the other side accountable without making someone remember the deadline, place another call, or explain the whole story again.

## The Workflow

```text
Create case -> Secure commitment -> Wait -> Verify -> Resolve or escalate
```

1. **Create a case** with the counterparty, phone number, issue, and any ticket or reference number.
2. **Secure a commitment** through an outbound CALL-E voice call. The commitment includes what will happen and when.
3. **Wait until it is due.** A scheduled check finds commitments that are ready for verification.
4. **Verify the outcome** with a follow-up call.
5. **Resolve or escalate.** A kept promise closes the case. A broken promise triggers an escalation call that references the original case.
6. **Repeat when necessary** until the case is resolved or needs human attention.

Call results are processed asynchronously through a webhook. Local development also supports polling open calls when a public webhook URL is not available.

## Features

- Case dashboard with active, pending, attention, and resolved counts
- Commitment tracking with due dates and next actions
- Call history and activity timeline for every case
- Automatic verification of due commitments
- Automatic escalation after a broken promise
- Ticket and reference number tracking across follow-up calls
- Live call status and in-progress call modal
- Guided demo walkthrough of the complete case lifecycle
- Local SQLite development with an optional Turso database for production
- Vercel Cron support for scheduled checks

## Demo

Run the app locally and select **Preview walkthrough** from the overview screen to see a case move through the full lifecycle:

```text
Created -> Calling -> Commitment recorded -> Waiting -> Verifying
-> Promise broken -> Escalating -> New commitment -> Resolved
```

## Tech Stack

- [Next.js](https://nextjs.org/) 15 with the App Router
- [React](https://react.dev/) 19
- TypeScript
- Tailwind CSS
- [CALL-E](https://www.heycall-e.com/) for outbound voice calls
- SQLite locally and [Turso](https://turso.tech/) libSQL in production
- Vercel Cron for scheduled commitment checks

## Getting Started

### Prerequisites

- Node.js 20 or later
- A CALL-E API key for placing real calls

### Install and run

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use this instead of `cp`:

```powershell
Copy-Item .env.example .env.local
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Without a CALL-E key, the dashboard, local database, demo walkthrough, and state machine tests still work. Real outbound calls require `CALLE_API_KEY`.

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