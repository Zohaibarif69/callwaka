import { NextRequest, NextResponse } from "next/server";
import * as repo from "@/src/lib/repo";
import * as sm from "@/src/lib/state-machine";
import type { CalleCallResult } from "@/src/lib/calle";

/**
 * CALL-E posts here when a call reaches a terminal state (completed, failed,
 * no_answer, busy, voicemail). This is the moment Callwaka's state machine
 * actually advances: initial call -> commitment; verification -> resolve or
 * escalate; escalation -> new commitment.
 *
 * NOTE: verify the exact webhook payload/signature scheme against
 * https://docs.heycall-e.com/#/api-reference before going to production —
 * this reads the fields documented in the CALL-E integrations README and is
 * intentionally defensive about exact shape.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | (CalleCallResult & { id?: string; call_id?: string; metadata?: Record<string, string> })
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const calleCallId = body.id ?? body.call_id;
  let callRow = calleCallId ? await repo.getCallByCalleId(calleCallId) : undefined;

  // Fallback: some webhook configs only echo metadata, not the call id directly.
  if (!callRow && body.metadata?.case_id) {
    const candidates = (await repo.listCallsForCase(body.metadata.case_id)).filter(
      (c) => c.purpose === body.metadata!.purpose
    );
    callRow = candidates[candidates.length - 1];
  }

  if (!callRow) {
    return NextResponse.json({ error: "No matching call found for this webhook" }, { status: 404 });
  }

  try {
    await sm.handleCallResult(callRow, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
