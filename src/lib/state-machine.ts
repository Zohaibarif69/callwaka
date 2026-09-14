import { randomUUID } from "node:crypto";
import * as repo from "./repo";
import * as calle from "./calle";
import type { CallOutcome, CallStatus } from "../types";

/**
 * Call 1 — Initial Engagement.
 * User hands Callwaka a problem; Callwaka opens a Case and places the first CALL-E
 * call to the counterparty to secure a specific commitment.
 */
export async function startCase(input: {
  title: string;
  description: string;
  counterpartyName: string;
  counterpartyPhone: string;
  userPhone?: string;
}) {
  const caseRow = await repo.insertCase(input);

  await repo.insertEvent({
    caseId: caseRow.id,
    type: "case_created",
    title: "Case created",
    description: input.description,
  });

  const { task, resultSchema } = calle.buildInitialCallTask({
    problemDescription: input.description,
    counterpartyName: input.counterpartyName,
  });

  const calleCall = await calle.createCall({
    task,
    phone: input.counterpartyPhone,
    resultSchema,
    metadata: { case_id: caseRow.id, purpose: "initial" },
    idempotencyKey: `${caseRow.id}_initial_${randomUUID().slice(0, 8)}`,
  });

  const callRow = await repo.insertCall({
    caseId: caseRow.id,
    purpose: "initial",
    toPhone: input.counterpartyPhone,
    calleCallId: calleCall.id,
  });

  await repo.insertEvent({
    caseId: caseRow.id,
    callId: callRow.id,
    type: "call_started",
    title: `Calling ${input.counterpartyName}`,
    description: "Callwaka is on the phone securing a commitment.",
  });

  const finalCaseRow = await repo.getCaseRow(caseRow.id);
  return { case: finalCaseRow!, call: callRow };
}

/**
 * Alternate path into a Case: the user already knows what was promised
 * (e.g. they already had the call themselves) and just wants Callwaka to track
 * and enforce it — no initial CALL-E call needed, go straight to "waiting".
 */
export async function startCaseWithKnownCommitment(input: {
  title: string;
  description: string;
  counterpartyName: string;
  counterpartyPhone: string;
  userPhone?: string;
  referenceNumber?: string;
  commitmentDescription: string;
  dueAt: string;
}) {
  const caseRow = await repo.insertCase(input);
  await repo.updateCase(caseRow.id, { reference_number: input.referenceNumber ?? "" });

  await repo.insertEvent({
    caseId: caseRow.id,
    type: "case_created",
    title: "Case created",
    description: input.description,
  });

  const commitment = await repo.insertCommitment({
    caseId: caseRow.id,
    description: input.commitmentDescription,
    dueAt: input.dueAt,
    verificationMethod: "user_confirm",
  });

  await repo.insertEvent({
    caseId: caseRow.id,
    type: "commitment_created",
    title: "Commitment recorded",
    description: `${commitment.description} — due ${commitment.due_at}. Callwaka will verify once this comes due.`,
  });

  const finalCaseRow = await repo.getCaseRow(caseRow.id);
  return finalCaseRow!;
}

/**
 * Call 2 — Verification.
 * Fires when a commitment's due_at is reached. Calls the user by default
 * (they can see the outcome directly, e.g. "did the technician show up?");
 * falls back to the counterparty when verification_method says so.
 */
export async function verifyCommitment(caseId: string) {
  const caseRow = await repo.getCaseRow(caseId);
  const commitment = await repo.getLatestCommitment(caseId);
  if (!caseRow || !commitment || commitment.status !== "pending") return null;

  const askingCounterparty = commitment.verification_method !== "user_confirm" || !caseRow.user_phone;
  const toPhone = askingCounterparty ? caseRow.counterparty_phone : caseRow.user_phone!;

  const { task, resultSchema } = calle.buildVerificationCallTask({
    promiseText: commitment.description,
    dueAt: commitment.due_at,
    askingCounterparty,
    counterpartyName: caseRow.counterparty_name,
  });

  const calleCall = await calle.createCall({
    task,
    phone: toPhone,
    resultSchema,
    metadata: { case_id: caseId, purpose: "verification", commitment_id: commitment.id },
    idempotencyKey: `${caseId}_verify_${commitment.id}`,
  });

  const callRow = await repo.insertCall({
    caseId,
    commitmentId: commitment.id,
    purpose: "verification",
    toPhone,
    calleCallId: calleCall.id,
  });

  await repo.insertEvent({
    caseId,
    callId: callRow.id,
    type: "verification_started",
    title: "Verifying commitment",
    description: `Checking whether "${commitment.description}" was fulfilled.`,
  });

  return callRow;
}

/**
 * Call 3 — Escalation.
 * Fires automatically when verification comes back broken. References the
 * prior ticket/commitment and works toward a replacement commitment.
 */
export async function escalateCase(caseId: string) {
  const caseRow = await repo.getCaseRow(caseId);
  const brokenCommitment = await repo.getLatestCommitment(caseId);
  if (!caseRow || !brokenCommitment) return null;
  if (caseRow.status === "cancelled") return null;

  if (caseRow.escalation_count >= caseRow.escalation_limit) {
    await repo.updateCase(caseId, { status: "failed" });
    await repo.insertEvent({
      caseId,
      type: "human_intervention_required",
      title: "Escalation limit reached",
      description: `Callwaka escalated ${caseRow.escalation_limit} times without resolution. This case needs a human.`,
    });
    return null;
  }

  const nextAttempt = caseRow.escalation_count + 1;

  const { task, resultSchema } = calle.buildEscalationCallTask({
    counterpartyName: caseRow.counterparty_name,
    referenceNumber: caseRow.reference_number || "(no reference number on file)",
    brokenPromiseText: brokenCommitment.description,
    brokenDueAt: brokenCommitment.due_at,
    escalationAttempt: nextAttempt,
  });

  const calleCall = await calle.createCall({
    task,
    phone: caseRow.counterparty_phone,
    resultSchema,
    metadata: { case_id: caseId, purpose: "escalation" },
    idempotencyKey: `${caseId}_escalate_${nextAttempt}`,
  });

  const callRow = await repo.insertCall({
    caseId,
    purpose: "escalation",
    toPhone: caseRow.counterparty_phone,
    calleCallId: calleCall.id,
  });

  await repo.updateCase(caseId, { escalation_count: nextAttempt, status: "attention" });

  await repo.insertEvent({
    caseId,
    callId: callRow.id,
    type: "escalation_started",
    title: `Escalation call #${nextAttempt}`,
    description: `Calling ${caseRow.counterparty_name} back — referencing the missed commitment.`,
  });

  return callRow;
}

/**
 * Called from the webhook (or the cron fallback poller) once a CALL-E call
 * reaches a terminal status. Routes to the right branch of the state machine
 * based on which purpose the call was for.
 */
export async function handleCallResult(
  callRow: repo.CallRow,
  result: calle.CalleCallResult
) {
  const structured = result.recipients?.[0]?.structured_result ?? result.structured_result ?? {};
  const transcriptTurns = result.recipients?.[0]?.attempts?.[0]?.transcript_turns ?? [];
  const transcript = transcriptTurns.map((t) => `${t.speaker}: ${t.text}`).join("\n");
  const outcome = mapOutcome(result.status, result.task_completed);

  await repo.updateCall(callRow.id, {
    status: mapCallStatus(result.status),
    outcome,
    summary: result.evidence?.join(" ") ?? "",
    transcript,
    structured_result: JSON.stringify(structured),
    completed_at: new Date().toISOString(),
  });

  await repo.insertEvent({
    caseId: callRow.case_id,
    callId: callRow.id,
    type: "call_completed",
    title: "Call finished",
    description: result.evidence?.join(" ") ?? `Call ended with status: ${result.status}`,
  });

  // A call can still be in flight (or its result still in transit) after the
  // person cancels the case. We still record what happened above for the
  // audit trail, but we must not let it trigger anything further — no new
  // commitment, no escalation call — for a case the person explicitly told
  // Callwaka to stop working on.
  const caseRow = await repo.getCaseRow(callRow.case_id);
  if (caseRow?.status === "cancelled") {
    await repo.insertEvent({
      caseId: callRow.case_id,
      callId: callRow.id,
      type: "call_completed",
      title: "Result ignored — case is cancelled",
      description: "This case was cancelled before this call's result came back, so no further action was taken.",
    });
    return;
  }

  if (callRow.purpose === "initial") {
    await onInitialCallResult(callRow, structured, outcome);
  } else if (callRow.purpose === "verification") {
    await onVerificationResult(callRow, structured, outcome);
  } else if (callRow.purpose === "escalation") {
    await onEscalationResult(callRow, structured, outcome);
  }
}

/**
 * Stops Callwaka from doing anything further on a case: no more verification
 * calls, no more escalation calls. Any pending commitment is marked
 * "cancelled" too, so the due-commitment scheduler naturally skips it from
 * here on — no separate check needed in checkDueCommitments. This does not
 * (and cannot) hang up a call that's already in progress; it just guarantees
 * nothing new gets started, and handleCallResult above makes sure a
 * still-in-flight call's result can't restart the loop either.
 */
export async function cancelCase(caseId: string) {
  const caseRow = await repo.getCaseRow(caseId);
  if (!caseRow) throw new Error("Case not found");
  if (caseRow.status === "cancelled") return caseRow;

  const wasAlreadyTerminal = caseRow.status === "resolved" || caseRow.status === "failed";

  await repo.updateCase(caseId, { status: "cancelled" });

  const commitments = await repo.listCommitmentsForCase(caseId);
  for (const c of commitments) {
    if (c.status === "pending" || c.status === "broken") {
      await repo.updateCommitment(c.id, { status: "cancelled" });
    }
  }

  await repo.insertEvent({
    caseId,
    type: "case_cancelled",
    title: "Case cancelled",
    description: wasAlreadyTerminal
      ? "Case cancelled after it was already resolved/failed — no active commitments to stop."
      : "Case cancelled by the user. Any pending commitment was stopped; no further verification or escalation calls will be placed.",
  });

  return repo.getCaseRow(caseId);
}

async function onInitialCallResult(
  callRow: repo.CallRow,
  structured: Record<string, unknown>,
  outcome: CallOutcome
) {
  const caseId = callRow.case_id;

  if (outcome !== "commitment_secured" || !structured.commitment_secured) {
    // No answer / voicemail / refused — surface it, don't silently stall.
    await repo.updateCase(caseId, { status: "attention" });
    await repo.insertEvent({
      caseId,
      callId: callRow.id,
      type: "call_failed",
      title: "Could not secure a commitment",
      description: `Call outcome: ${outcome}. Callwaka needs another attempt or human input.`,
    });
    return;
  }

  const dueAt = String(structured.due_at ?? new Date(Date.now() + 24 * 3600 * 1000).toISOString());
  const commitment = await repo.insertCommitment({
    caseId,
    description: String(structured.promise_text ?? ""),
    dueAt,
    verificationMethod: "user_confirm",
    sourceCallId: callRow.id,
  });

  await repo.updateCase(caseId, {
    status: "tracking",
    reference_number: String(structured.reference_number ?? ""),
  });

  await repo.insertEvent({
    caseId,
    callId: callRow.id,
    type: "commitment_created",
    title: "Commitment secured",
    description: `${commitment.description} — due ${commitment.due_at}.`,
  });
}

async function onVerificationResult(
  callRow: repo.CallRow,
  structured: Record<string, unknown>,
  _outcome: CallOutcome
) {
  const caseId = callRow.case_id;
  const commitment = await repo.getLatestCommitment(caseId);
  if (!commitment) return;

  const fulfilled = structured.fulfilled === "yes";

  if (fulfilled) {
    await repo.updateCommitment(commitment.id, { status: "fulfilled" });
    await repo.updateCase(caseId, { status: "resolved" });
    await repo.insertEvent({
      caseId,
      callId: callRow.id,
      type: "case_resolved",
      title: "Case resolved",
      description: `Confirmed: "${commitment.description}" was fulfilled. ${structured.detail ?? ""}`.trim(),
    });
    return;
  }

  await repo.updateCommitment(commitment.id, { status: "broken" });
  await repo.insertEvent({
    caseId,
    callId: callRow.id,
    type: "commitment_broken",
    title: "Commitment broken",
    description: `"${commitment.description}" was not fulfilled. Callwaka is escalating automatically.`,
  });

  // Autonomous follow-through: broken promise -> escalate immediately, no human click required.
  try {
    await escalateCase(caseId);
  } catch (err) {
    // Don't let a dialing failure take down the webhook handler — surface it
    // on the case instead. The cron poller / a manual retry can pick this up.
    const message = err instanceof Error ? err.message : "Unknown error";
    await repo.insertEvent({
      caseId,
      type: "human_intervention_required",
      title: "Escalation call could not be placed",
      description: message,
    });
    await repo.updateCase(caseId, { status: "attention" });
  }
}

async function onEscalationResult(
  callRow: repo.CallRow,
  structured: Record<string, unknown>,
  outcome: CallOutcome
) {
  const caseId = callRow.case_id;

  if (outcome !== "commitment_secured" || !structured.commitment_secured) {
    await repo.insertEvent({
      caseId,
      callId: callRow.id,
      type: "escalation_completed",
      title: "Escalation did not secure a new commitment",
      description: `Outcome: ${outcome}. Callwaka will retry escalation on the next cycle.`,
    });
    return;
  }

  const dueAt = String(structured.due_at ?? new Date(Date.now() + 24 * 3600 * 1000).toISOString());
  const commitment = await repo.insertCommitment({
    caseId,
    description: String(structured.promise_text ?? ""),
    dueAt,
    verificationMethod: "user_confirm",
    sourceCallId: callRow.id,
  });

  await repo.updateCase(caseId, { status: "tracking" });

  await repo.insertEvent({
    caseId,
    callId: callRow.id,
    type: "escalation_completed",
    title: "New commitment secured",
    description: `${commitment.description} — due ${commitment.due_at}.`,
  });
}

function mapCallStatus(status: string): CallStatus {
  const map: Record<string, CallStatus> = {
    completed: "completed",
    failed: "failed",
    no_answer: "no_answer",
    busy: "busy",
    voicemail: "voicemail",
  };
  return map[status] ?? "completed";
}

function mapOutcome(status: string, taskCompleted: boolean): CallOutcome {
  if (status === "no_answer") return "no_answer";
  if (status === "busy") return "busy";
  if (status === "voicemail") return "voicemail";
  if (status === "failed") return "failed";
  return taskCompleted ? "commitment_secured" : "failed";
}

/** Cron fallback: for any local/dev setup where CALL-E can't reach a webhook, poll open calls directly. */
export async function pollOpenCalls() {
  const allCalls = await repo.listAllCalls();
  const openCalls = allCalls.filter(
    (c) => !["completed", "failed", "no_answer", "busy", "voicemail"].includes(c.status)
  );

  for (const call of openCalls) {
    if (!call.calle_call_id) continue;
    try {
      const result = await calle.getCall(call.calle_call_id);
      if (calle.isTerminal(result.status)) {
        await handleCallResult(call, result);
      }
    } catch {
      // Leave it for the next poll.
    }
  }
}

/** Cron entry point: find commitments whose due_at has passed and kick off verification. */
export async function checkDueCommitments() {
  const due = await repo.listDueCommitments(new Date().toISOString());
  const results = [];
  for (const commitment of due) {
    await repo.updateCommitment(commitment.id, { status: "overdue" });
    try {
      const call = await verifyCommitment(commitment.case_id);
      results.push({ caseId: commitment.case_id, commitmentId: commitment.id, callId: call?.id });
    } catch (err) {
      // One bad call shouldn't stall verification for every other case.
      const message = err instanceof Error ? err.message : "Unknown error";
      await repo.insertEvent({
        caseId: commitment.case_id,
        type: "human_intervention_required",
        title: "Verification call could not be placed",
        description: message,
      });
      results.push({ caseId: commitment.case_id, commitmentId: commitment.id, error: message });
    }
  }
  return results;
}
