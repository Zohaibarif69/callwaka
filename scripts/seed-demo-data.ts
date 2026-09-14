/**
 * Seeds the real database (local file, or Turso if TURSO_DATABASE_URL is
 * set) with the same 3 demo cases that `src/services/mockApi.ts` uses.
 *
 * Why this exists: mockApi.ts only lives in memory and is used purely as a
 * fallback when the real backend is unreachable. Once Turso is connected,
 * the hybrid `services/api.ts` layer starts reading real (empty) data and
 * the demo cases disappear from Overview/Cases/Calls/Commitments/Activity.
 *
 * Running this script once writes the exact same 3 cases as real rows, so
 * they show up through the real backend too and survive restarts/redeploys
 * — no more "vanishing" once Turso is connected.
 *
 * Safe to run multiple times: every insert uses INSERT OR IGNORE keyed on
 * the same fixed ids used below, so re-running is a no-op if already seeded.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-data.ts
 *
 * Point it at Turso by setting TURSO_DATABASE_URL / TURSO_AUTH_TOKEN first,
 * exactly like the app itself does (see src/lib/db.ts).
 */
import { getDb } from "../src/lib/db";

async function main() {
  const db = await getDb();

  // --- Case 1: ISP Technician Appointment ---------------------------------
  await db.execute({
    sql: `INSERT OR IGNORE INTO cases
      (id, title, description, status, counterparty_name, counterparty_phone, user_phone, reference_number, escalation_count, escalation_limit, created_at, updated_at)
      VALUES (@id, @title, @description, @status, @counterparty_name, @counterparty_phone, @user_phone, @reference_number, @escalation_count, @escalation_limit, @created_at, @updated_at)`,
    args: {
      id: "case_001",
      title: "ISP Technician Appointment",
      description:
        "My ISP promised a technician Friday between 9 AM and 1 PM. Make sure they actually show up.",
      status: "tracking",
      counterparty_name: "ISP Support",
      counterparty_phone: "+1 (800) 555-0199",
      user_phone: null,
      reference_number: "88213",
      escalation_count: 0,
      escalation_limit: 3,
      created_at: "2026-09-10T14:32:00-05:00",
      updated_at: "2026-09-10T15:08:00-05:00",
    },
  });

  await db.execute({
    sql: `INSERT OR IGNORE INTO commitments
      (id, case_id, source_call_id, description, due_at, status, verification_method, sequence, created_at, updated_at)
      VALUES (@id, @case_id, @source_call_id, @description, @due_at, @status, @verification_method, @sequence, @created_at, @updated_at)`,
    args: {
      id: "commit_001",
      case_id: "case_001",
      source_call_id: "call_001",
      description: "Technician visit",
      due_at: "2026-09-13T14:00:00-05:00",
      status: "pending",
      verification_method: "user_confirm",
      sequence: 1,
      created_at: "2026-09-10T14:44:00-05:00",
      updated_at: "2026-09-10T14:44:00-05:00",
    },
  });

  await db.execute({
    sql: `INSERT OR IGNORE INTO calls
      (id, case_id, commitment_id, purpose, calle_call_id, to_phone, status, outcome, summary, transcript, structured_result, started_at, completed_at, duration_seconds)
      VALUES (@id, @case_id, @commitment_id, @purpose, @calle_call_id, @to_phone, @status, @outcome, @summary, @transcript, @structured_result, @started_at, @completed_at, @duration_seconds)`,
    args: {
      id: "call_001",
      case_id: "case_001",
      commitment_id: "commit_001",
      purpose: "initial",
      calle_call_id: "demo_call_001",
      to_phone: "+1 (800) 555-0199",
      status: "completed",
      outcome: "commitment_secured",
      summary:
        "Reached tier-2 support after an 8-minute hold. Agent confirmed a technician appointment for Saturday, September 13, between 2:00 PM and 4:00 PM. Ticket #88213 created.",
      transcript:
        "Agent: Thank you for calling ISP Support, my name is Marcus. How can I help?\nCallwaka: Hi, I need to schedule a technician visit. My internet has been down since Tuesday.\nAgent: I can see your account. We have availability Saturday the 13th, 2 to 4 PM. Does that work?\nCallwaka: Yes, please confirm that in writing.\nAgent: I'll create ticket 88213. A technician will arrive Saturday between 2 and 4 PM.",
      structured_result: JSON.stringify({
        promise_text: "Technician visit",
        due_at: "Saturday, Sep 13 · 2:00 PM – 4:00 PM",
        reference_number: "88213",
      }),
      started_at: "2026-09-10T14:40:00-05:00",
      completed_at: "2026-09-10T14:44:18-05:00",
      duration_seconds: 258,
    },
  });

  for (const evt of [
    {
      id: "evt_001",
      call_id: null,
      type: "case_created",
      timestamp: "2026-09-10T14:32:00-05:00",
      title: "Case created",
      description: "ISP Technician Appointment case opened.",
    },
    {
      id: "evt_002",
      call_id: "call_001",
      type: "call_completed",
      timestamp: "2026-09-10T14:40:00-05:00",
      title: "Initial call completed",
      description: "Reached ISP Support after 1 hold.",
    },
    {
      id: "evt_003",
      call_id: null,
      type: "commitment_created",
      timestamp: "2026-09-10T14:44:00-05:00",
      title: "Commitment recorded",
      description: "Technician visit confirmed for Saturday, 2:00 PM – 4:00 PM. Ticket #88213.",
    },
  ]) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO events (id, case_id, call_id, type, timestamp, title, description)
            VALUES (@id, @case_id, @call_id, @type, @timestamp, @title, @description)`,
      args: { ...evt, case_id: "case_001" },
    });
  }

  // --- Case 2: Insurance Refund Request -----------------------------------
  await db.execute({
    sql: `INSERT OR IGNORE INTO cases
      (id, title, description, status, counterparty_name, counterparty_phone, user_phone, reference_number, escalation_count, escalation_limit, created_at, updated_at)
      VALUES (@id, @title, @description, @status, @counterparty_name, @counterparty_phone, @user_phone, @reference_number, @escalation_count, @escalation_limit, @created_at, @updated_at)`,
    args: {
      id: "case_002",
      title: "Insurance Refund Request",
      description:
        "National Health Insurance owes me a $340 refund for a double charge. They promised to process it within 10 business days.",
      status: "attention",
      counterparty_name: "National Health Insurance",
      counterparty_phone: "+1 (888) 422-0011",
      user_phone: null,
      reference_number: "REF-2024-8812",
      escalation_count: 1,
      escalation_limit: 3,
      created_at: "2026-08-29T09:15:00-05:00",
      updated_at: "2026-09-10T08:30:00-05:00",
    },
  });

  await db.execute({
    sql: `INSERT OR IGNORE INTO commitments
      (id, case_id, source_call_id, description, due_at, status, verification_method, sequence, created_at, updated_at)
      VALUES (@id, @case_id, @source_call_id, @description, @due_at, @status, @verification_method, @sequence, @created_at, @updated_at)`,
    args: {
      id: "commit_002",
      case_id: "case_002",
      source_call_id: "call_002",
      description: "$340 refund to account ending 4421",
      due_at: "2026-09-08T17:00:00-05:00",
      status: "overdue",
      verification_method: "bank_confirm",
      sequence: 1,
      created_at: "2026-08-29T09:28:00-05:00",
      updated_at: "2026-09-10T08:30:00-05:00",
    },
  });

  await db.execute({
    sql: `INSERT OR IGNORE INTO calls
      (id, case_id, commitment_id, purpose, calle_call_id, to_phone, status, outcome, summary, transcript, structured_result, started_at, completed_at, duration_seconds)
      VALUES (@id, @case_id, @commitment_id, @purpose, @calle_call_id, @to_phone, @status, @outcome, @summary, @transcript, @structured_result, @started_at, @completed_at, @duration_seconds)`,
    args: {
      id: "call_002",
      case_id: "case_002",
      commitment_id: "commit_002",
      purpose: "initial",
      calle_call_id: "demo_call_002",
      to_phone: "+1 (888) 422-0011",
      status: "completed",
      outcome: "commitment_secured",
      summary:
        "Connected to billing department. Agent confirmed the double charge from August 15th. Approved refund of $340 within 10 business days to account ending 4421. Reference REF-2024-8812.",
      transcript: null,
      structured_result: JSON.stringify({
        promise_text: "$340 refund to account ending 4421",
        due_at: "Within 10 business days (by Sep 12)",
        reference_number: "REF-2024-8812",
      }),
      started_at: "2026-08-29T09:22:00-05:00",
      completed_at: "2026-08-29T09:28:14-05:00",
      duration_seconds: 374,
    },
  });

  for (const evt of [
    {
      id: "evt_010",
      call_id: null,
      type: "case_created",
      timestamp: "2026-08-29T09:15:00-05:00",
      title: "Case created",
      description: "Insurance Refund Request case opened.",
    },
    {
      id: "evt_011",
      call_id: "call_002",
      type: "call_completed",
      timestamp: "2026-08-29T09:22:00-05:00",
      title: "Initial call completed",
      description: "Spoke with billing department. Refund approved in system.",
    },
    {
      id: "evt_012",
      call_id: null,
      type: "commitment_created",
      timestamp: "2026-08-29T09:28:00-05:00",
      title: "Commitment recorded",
      description: "$340 refund promised within 10 business days. Reference REF-2024-8812.",
    },
    {
      id: "evt_013",
      call_id: null,
      type: "commitment_broken",
      timestamp: "2026-09-10T08:30:00-05:00",
      title: "Promise broken",
      description: "No refund appeared in account after 10 business days. Deadline passed.",
    },
  ]) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO events (id, case_id, call_id, type, timestamp, title, description)
            VALUES (@id, @case_id, @call_id, @type, @timestamp, @title, @description)`,
      args: { ...evt, case_id: "case_002" },
    });
  }

  // --- Case 3: Streaming Service Cancellation -----------------------------
  await db.execute({
    sql: `INSERT OR IGNORE INTO cases
      (id, title, description, status, counterparty_name, counterparty_phone, user_phone, reference_number, escalation_count, escalation_limit, created_at, updated_at)
      VALUES (@id, @title, @description, @status, @counterparty_name, @counterparty_phone, @user_phone, @reference_number, @escalation_count, @escalation_limit, @created_at, @updated_at)`,
    args: {
      id: "case_003",
      title: "Streaming Service Cancellation",
      description:
        "StreamPlus is still charging me after I cancelled. They promised to stop all future charges and refund the last month.",
      status: "resolved",
      counterparty_name: "StreamPlus Support",
      counterparty_phone: "+1 (877) 600-7700",
      user_phone: null,
      reference_number: "SP-CXL-40921",
      escalation_count: 0,
      escalation_limit: 3,
      created_at: "2026-09-03T11:00:00-05:00",
      updated_at: "2026-09-07T14:20:00-05:00",
    },
  });

  await db.execute({
    sql: `INSERT OR IGNORE INTO commitments
      (id, case_id, source_call_id, description, due_at, status, verification_method, sequence, created_at, updated_at)
      VALUES (@id, @case_id, @source_call_id, @description, @due_at, @status, @verification_method, @sequence, @created_at, @updated_at)`,
    args: {
      id: "commit_003",
      case_id: "case_003",
      source_call_id: "call_003",
      description: "Subscription cancelled, no further charges",
      due_at: "2026-09-05T23:59:00-05:00",
      status: "fulfilled",
      verification_method: "bank_confirm",
      sequence: 1,
      created_at: "2026-09-03T11:12:00-05:00",
      updated_at: "2026-09-07T14:15:00-05:00",
    },
  });

  await db.execute({
    sql: `INSERT OR IGNORE INTO calls
      (id, case_id, commitment_id, purpose, calle_call_id, to_phone, status, outcome, summary, transcript, structured_result, started_at, completed_at, duration_seconds)
      VALUES (@id, @case_id, @commitment_id, @purpose, @calle_call_id, @to_phone, @status, @outcome, @summary, @transcript, @structured_result, @started_at, @completed_at, @duration_seconds)`,
    args: {
      id: "call_003",
      case_id: "case_003",
      commitment_id: "commit_003",
      purpose: "initial",
      calle_call_id: "demo_call_003",
      to_phone: "+1 (877) 600-7700",
      status: "completed",
      outcome: "commitment_secured",
      summary:
        "Agent confirmed cancellation of subscription effective immediately. Refund of $14.99 for the September charge approved, expected within 5 business days. Reference SP-CXL-40921.",
      transcript: null,
      structured_result: JSON.stringify({
        promise_text: "Subscription cancelled + $14.99 refund",
        due_at: "Within 5 business days",
        reference_number: "SP-CXL-40921",
      }),
      started_at: "2026-09-03T11:08:00-05:00",
      completed_at: "2026-09-03T11:11:33-05:00",
      duration_seconds: 213,
    },
  });

  for (const evt of [
    {
      id: "evt_020",
      call_id: null,
      type: "case_created",
      timestamp: "2026-09-03T11:00:00-05:00",
      title: "Case created",
      description: "Streaming Service Cancellation case opened.",
    },
    {
      id: "evt_021",
      call_id: "call_003",
      type: "call_completed",
      timestamp: "2026-09-03T11:08:00-05:00",
      title: "Call completed",
      description: "StreamPlus confirmed cancellation and promised refund of last charge.",
    },
    {
      id: "evt_022",
      call_id: null,
      type: "commitment_created",
      timestamp: "2026-09-03T11:12:00-05:00",
      title: "Commitment recorded",
      description: "No further charges and $14.99 refund within 5 business days.",
    },
    {
      id: "evt_023",
      call_id: null,
      type: "commitment_fulfilled",
      timestamp: "2026-09-07T14:15:00-05:00",
      title: "Promise fulfilled",
      description: "$14.99 refund confirmed in account. No charges since cancellation.",
    },
    {
      id: "evt_024",
      call_id: null,
      type: "case_resolved",
      timestamp: "2026-09-07T14:20:00-05:00",
      title: "Case resolved",
      description: "Subscription successfully cancelled. All charges stopped.",
    },
  ]) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO events (id, case_id, call_id, type, timestamp, title, description)
            VALUES (@id, @case_id, @call_id, @type, @timestamp, @title, @description)`,
      args: { ...evt, case_id: "case_003" },
    });
  }

  console.log("✅ Seeded 3 demo cases (case_001, case_002, case_003) with their commitments, calls, and timeline events.");
  console.log("   Re-run anytime — existing rows are left untouched (INSERT OR IGNORE).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
