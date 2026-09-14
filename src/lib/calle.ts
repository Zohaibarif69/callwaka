/**
 * Thin wrapper around the CALL-E Developer API (https://docs.heycall-e.com).
 *
 * We talk to the raw REST API rather than the SDK's blocking `createAndWait`
 * helper, because a Next.js API route (especially on Vercel) shouldn't sit
 * open for the minutes a real phone call can take. Instead every call is
 * created with a `webhook_url`, CALL-E dials in the background, and
 * `/api/calle/webhook` receives the terminal result and drives the state
 * machine forward. This mirrors the doc's "Callwaka enters a wait state" model.
 */

const CALLE_BASE_URL = process.env.CALLE_BASE_URL ?? "https://api.heycall-e.com";
const CALLE_API_KEY = process.env.CALLE_API_KEY;
const APP_BASE_URL = process.env.APP_BASE_URL; // e.g. https://callwaka.vercel.app

export interface CreateCallParams {
  task: string;
  phone: string;
  region?: string;
  resultSchema: Record<string, unknown>;
  /** Arbitrary metadata echoed back on the webhook so we know which case/commitment this call belongs to. */
  metadata: Record<string, string>;
  idempotencyKey: string;
}

export interface CalleCallResult {
  status: string;
  task_completed: boolean;
  completion_confidence?: { score: number; label: string };
  evidence?: string[];
  structured_result?: Record<string, unknown>;
  recipients?: Array<{
    structured_result?: Record<string, unknown>;
    attempts?: Array<{
      transcript_turns?: Array<{ offset_seconds: number; speaker: string; text: string }>;
    }>;
  }>;
}

function assertConfigured() {
  if (!CALLE_API_KEY) {
    throw new Error(
      "CALLE_API_KEY is not set. Get one from https://dashboard.heycall-e.com/account/api-keys and add it to .env.local"
    );
  }
}

/** Creates an outbound call task. Returns immediately (call_id) — result arrives via webhook. */
export async function createCall(params: CreateCallParams): Promise<{ id: string }> {
  assertConfigured();

  const body: Record<string, unknown> = {
    task: params.task,
    recipients: [
      {
        phones: [params.phone],
        region: params.region ?? "US",
        locale: "en-US",
      },
    ],
    recipient_result_schema: params.resultSchema,
    metadata: params.metadata,
  };

  if (APP_BASE_URL) {
    body.webhook_url = `${APP_BASE_URL}/api/calle/webhook`;
  }

  const res = await fetch(`${CALLE_BASE_URL}/v1/calls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CALLE_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CALL-E create call failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return { id: data.id ?? data.call_id };
}

/** Polls a call's current status/result. Used by the cron fallback when webhooks aren't reachable (e.g. local dev). */
export async function getCall(callId: string): Promise<CalleCallResult> {
  assertConfigured();
  const res = await fetch(`${CALLE_BASE_URL}/v1/calls/${callId}`, {
    headers: { Authorization: `Bearer ${CALLE_API_KEY}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CALL-E get call failed (${res.status}): ${text}`);
  }
  return res.json();
}

const TERMINAL_STATUSES = new Set(["completed", "failed", "no_answer", "busy", "voicemail"]);
export function isTerminal(status: string) {
  return TERMINAL_STATUSES.has(status);
}

// ---------------------------------------------------------------------------
// Task builders — one per call type in the project doc (Section 6)
// ---------------------------------------------------------------------------

const COMMITMENT_RESULT_SCHEMA = {
  type: "object",
  required: ["commitment_secured", "promise_text", "due_at", "reference_number"],
  properties: {
    commitment_secured: { type: "boolean" },
    promise_text: { type: "string", description: "Plain-language summary of what was promised, e.g. 'Technician will arrive Friday 9am-1pm'" },
    due_at: { type: "string", description: "ISO 8601 timestamp for when the commitment is due" },
    reference_number: { type: "string", description: "Ticket/confirmation/reference number given by the counterparty, empty string if none" },
  },
} as const;

/** Call 1 — Initial Engagement: get a specific, confirmed commitment from the counterparty. */
export function buildInitialCallTask(input: {
  problemDescription: string;
  counterpartyName: string;
}) {
  return {
    task: [
      `You are calling ${input.counterpartyName} on behalf of a customer with this problem:`,
      `"${input.problemDescription}"`,
      ``,
      `Your goal is to secure ONE specific, concrete commitment: what will happen, on what date, during what time window, and get a reference or ticket number.`,
      `Before ending the call, read the commitment back to confirm it explicitly (e.g. "So to confirm: a technician will arrive Friday the 12th between 9am and 1pm, and the ticket number is 88213. Is that correct?").`,
      `If the representative cannot commit to a specific date/time, keep pressing politely for one — do not accept a vague answer like "someone will be in touch."`,
    ].join("\n"),
    resultSchema: COMMITMENT_RESULT_SCHEMA,
  };
}

/** Call 2 — Verification: check whether a commitment was actually fulfilled. */
export function buildVerificationCallTask(input: {
  promiseText: string;
  dueAt: string;
  askingCounterparty: boolean;
  counterpartyName: string;
}) {
  const who = input.askingCounterparty ? input.counterpartyName : "the customer";
  return {
    task: [
      `You are calling ${who} to verify whether a commitment was fulfilled.`,
      `The commitment was: "${input.promiseText}", due at ${input.dueAt}.`,
      input.askingCounterparty
        ? `Ask directly whether this was completed on their end.`
        : `Ask directly: did this happen as promised? Get a clear yes or no, plus any relevant detail (e.g. what time it actually happened, if anything was different from what was promised).`,
    ].join("\n"),
    resultSchema: {
      type: "object",
      required: ["fulfilled"],
      properties: {
        fulfilled: { type: "string", enum: ["yes", "no", "unknown"] },
        detail: { type: "string", description: "Any extra detail the person gave about what happened" },
      },
    },
  };
}

/** Call 3 — Escalation: a promise was broken; reference the ticket and demand a new commitment. */
export function buildEscalationCallTask(input: {
  counterpartyName: string;
  referenceNumber: string;
  brokenPromiseText: string;
  brokenDueAt: string;
  escalationAttempt: number;
}) {
  const target =
    input.escalationAttempt === 1
      ? "a support representative"
      : input.escalationAttempt === 2
        ? "the escalations department, and ask to be transferred there if you reach a general queue"
        : "a supervisor — explicitly request one if the representative cannot resolve this";

  return {
    task: [
      `You are calling ${input.counterpartyName}, escalation attempt #${input.escalationAttempt}. Ask for ${target}.`,
      `Reference ticket/reference number "${input.referenceNumber}".`,
      `Explain: the customer was promised "${input.brokenPromiseText}" (due ${input.brokenDueAt}), and this was NOT fulfilled.`,
      `Your goal is to secure a NEW specific, concrete commitment to replace the broken one — a new date and time window. Read it back to confirm before ending the call, just as with the original commitment.`,
      `Be firm but polite: this is a follow-up on a missed commitment, not a first request.`,
    ].join("\n"),
    resultSchema: COMMITMENT_RESULT_SCHEMA,
  };
}
