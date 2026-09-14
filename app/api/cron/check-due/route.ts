import { NextRequest, NextResponse } from "next/server";
import * as sm from "@/src/lib/state-machine";

/**
 * This is Callwaka's "scheduler / wait state" from the project doc — the thing
 * that notices a commitment's due_at has arrived and calls to verify it,
 * without a human clicking anything. Wire it up as a Vercel Cron job
 * (see vercel.json) hitting this route on a schedule, e.g. every 15 minutes.
 *
 * It also polls any still-open calls directly — a safety net for local dev
 * or any environment where CALL-E can't reach APP_BASE_URL's webhook.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dueResults] = await Promise.all([sm.checkDueCommitments(), sm.pollOpenCalls()]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    verificationCallsTriggered: dueResults,
  });
}
