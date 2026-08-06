/**
 * Standalone integration test for the Extract -> Store -> Wait -> Verify ->
 * Escalate -> Resolve loop. Doesn't touch the network — it inserts call rows
 * directly (as if CALL-E had already placed them) and feeds handleCallResult
 * fabricated terminal payloads shaped exactly like CALL-E's documented
 * response, to prove the state machine transitions correctly end to end.
 *
 * Run with: npx tsx scripts/test-state-machine.ts
 */
import * as repo from "../src/lib/repo";
import * as sm from "../src/lib/state-machine";
import type { CalleCallResult } from "../src/lib/calle";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`OK:   ${msg}`);
  }
}

async function main() {
  // --- 1. Case created with a known commitment (skips the initial call) ---
  const caseRow = await sm.startCaseWithKnownCommitment({
    title: "ISP Technician Appointment",
    description: "ISP promised a technician Friday 9am-1pm.",
    counterpartyName: "ISP Support",
    counterpartyPhone: "+15550199000",
    referenceNumber: "88213",
    commitmentDescription: "Technician will arrive Friday 9am-1pm",
    dueAt: new Date(Date.now() - 1000).toISOString(), // already due
  });

  let commitment = (await repo.getLatestCommitment(caseRow.id))!;
  assert(commitment.status === "pending", "commitment starts pending");
  assert(caseRow.status === "tracking", "case starts tracking");

  // --- 2. Simulate CALL-E placing + completing a verification call, broken outcome ---
  const verifyCall = await repo.insertCall({
    caseId: caseRow.id,
    commitmentId: commitment.id,
    purpose: "verification",
    toPhone: "+15550199000",
    calleCallId: "calle_fake_verify_1",
  });

  const brokenResult: CalleCallResult = {
    status: "completed",
    task_completed: true,
    evidence: ["The customer said the technician never arrived."],
    recipients: [
      {
        structured_result: { fulfilled: "no", detail: "No technician showed up." },
        attempts: [
          {
            transcript_turns: [
              { offset_seconds: 0, speaker: "bot", text: "Did the technician arrive?" },
              { offset_seconds: 3, speaker: "user", text: "No, nobody came." },
            ],
          },
        ],
      },
    ],
  };

  await sm.handleCallResult(verifyCall, brokenResult);

  commitment = (await repo.getLatestCommitment(caseRow.id))!;
  const caseAfterBreak = (await repo.getCaseRow(caseRow.id))!;
  assert(commitment.status === "broken", "commitment becomes broken after failed verification");
  assert(
    caseAfterBreak.status === "attention",
    "case flips to attention (escalation call could not be dialed — no CALLE_API_KEY in this test env, which is expected)"
  );

  const events = await repo.listEventsForCase(caseRow.id);
  assert(
    events.some((e) => e.type === "commitment_broken"),
    "a commitment_broken event was recorded"
  );
  assert(
    events.some((e) => e.type === "human_intervention_required"),
    "escalation dial failure was captured as an event instead of crashing"
  );

  // --- 3. Now simulate the escalation call actually going through (as if CALLE_API_KEY were set) ---
  const escalationCall = await repo.insertCall({
    caseId: caseRow.id,
    purpose: "escalation",
    toPhone: "+15550199000",
    calleCallId: "calle_fake_escalate_1",
  });
  await repo.updateCase(caseRow.id, { escalation_count: 1, status: "attention" });

  const newCommitmentResult: CalleCallResult = {
    status: "completed",
    task_completed: true,
    evidence: ["Rep apologized and rebooked for Saturday 2-4pm."],
    recipients: [
      {
        structured_result: {
          commitment_secured: true,
          promise_text: "Technician will arrive Saturday 2pm-4pm",
          due_at: new Date(Date.now() + 3600_000).toISOString(),
          reference_number: "88213",
        },
      },
    ],
  };

  await sm.handleCallResult(escalationCall, newCommitmentResult);

  const commitmentsAfterEscalation = await repo.listCommitmentsForCase(caseRow.id);
  const caseAfterEscalation = (await repo.getCaseRow(caseRow.id))!;
  assert(commitmentsAfterEscalation.length === 2, "a second commitment was created after escalation");
  assert(
    commitmentsAfterEscalation[1].description === "Technician will arrive Saturday 2pm-4pm",
    "the new commitment reflects the rebooked appointment"
  );
  assert(caseAfterEscalation.status === "tracking", "case goes back to tracking with the new commitment");

  // --- 4. Simulate the second commitment being verified as FULFILLED -> case resolves ---
  const verifyCall2 = await repo.insertCall({
    caseId: caseRow.id,
    commitmentId: commitmentsAfterEscalation[1].id,
    purpose: "verification",
    toPhone: "+15550199000",
    calleCallId: "calle_fake_verify_2",
  });

  const fulfilledResult: CalleCallResult = {
    status: "completed",
    task_completed: true,
    evidence: ["Customer confirmed the technician arrived and fixed the issue."],
    recipients: [{ structured_result: { fulfilled: "yes", detail: "Arrived at 2:10pm, fixed by 2:45pm." } }],
  };

  await sm.handleCallResult(verifyCall2, fulfilledResult);

  const finalCommitment = (await repo.getLatestCommitment(caseRow.id))!;
  const finalCase = (await repo.getCaseRow(caseRow.id))!;
  assert(finalCommitment.status === "fulfilled", "second commitment marked fulfilled");
  assert(finalCase.status === "resolved", "case marked resolved");

  const finalEvents = await repo.listEventsForCase(caseRow.id);
  console.log(`\nFull timeline for ${caseRow.id}:`);
  for (const e of finalEvents) {
    console.log(`  [${e.type}] ${e.title} — ${e.description}`);
  }

  console.log(`\nDone. Case ${caseRow.id} exit status: ${finalCase.status}`);
}

main().then(() => {
  if (process.exitCode === 1) {
    console.error("\nSome assertions FAILED.");
  } else {
    console.log("\nAll assertions PASSED.");
  }
});
