import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import type {
  Case,
  Call,
  Commitment,
  CommitmentWithCase,
  ActivityEvent,
  TimelineEvent,
  CaseStatus,
  CommitmentStatus,
  CallStatus,
  CallOutcome,
  TimelineEventType,
} from "../types";

// --- Row shapes -------------------------------------------------------------

interface CaseRow {
  id: string;
  title: string;
  description: string;
  status: CaseStatus;
  counterparty_name: string;
  counterparty_phone: string;
  user_phone: string | null;
  reference_number: string;
  escalation_count: number;
  escalation_limit: number;
  created_at: string;
  updated_at: string;
}

interface CommitmentRow {
  id: string;
  case_id: string;
  source_call_id: string | null;
  description: string;
  due_at: string;
  status: CommitmentStatus;
  verification_method: string;
  sequence: number;
  created_at: string;
  updated_at: string;
}

interface CallRow {
  id: string;
  case_id: string;
  commitment_id: string | null;
  purpose: "initial" | "verification" | "escalation";
  calle_call_id: string | null;
  to_phone: string;
  status: CallStatus;
  outcome: CallOutcome | null;
  summary: string | null;
  transcript: string | null;
  structured_result: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

interface EventRow {
  id: string;
  case_id: string;
  call_id: string | null;
  type: TimelineEventType;
  timestamp: string;
  title: string;
  description: string;
}

// --- Cases -------------------------------------------------------------

export async function insertCase(input: {
  title: string;
  description: string;
  counterpartyName: string;
  counterpartyPhone: string;
  userPhone?: string;
  escalationLimit?: number;
}): Promise<CaseRow> {
  const db = await getDb();
  const now = new Date().toISOString();
  const row: CaseRow = {
    id: `case_${randomUUID().slice(0, 8)}`,
    title: input.title,
    description: input.description,
    status: "tracking",
    counterparty_name: input.counterpartyName,
    counterparty_phone: input.counterpartyPhone,
    user_phone: input.userPhone ?? null,
    reference_number: "",
    escalation_count: 0,
    escalation_limit: input.escalationLimit ?? 3,
    created_at: now,
    updated_at: now,
  };
  await db.execute({
    sql: `INSERT INTO cases (id, title, description, status, counterparty_name, counterparty_phone, user_phone, reference_number, escalation_count, escalation_limit, created_at, updated_at)
          VALUES (@id, @title, @description, @status, @counterparty_name, @counterparty_phone, @user_phone, @reference_number, @escalation_count, @escalation_limit, @created_at, @updated_at)`,
    args: row as unknown as Record<string, string | number | null>,
  });
  return row;
}

export async function getCaseRow(id: string): Promise<CaseRow | undefined> {
  const db = await getDb();
  const res = await db.execute({ sql: `SELECT * FROM cases WHERE id = @id`, args: { id } });
  return res.rows[0] as unknown as CaseRow | undefined;
}

export async function listCaseRows(): Promise<CaseRow[]> {
  const db = await getDb();
  const res = await db.execute(`SELECT * FROM cases ORDER BY updated_at DESC`);
  return res.rows as unknown as CaseRow[];
}

export async function updateCase(id: string, patch: Partial<CaseRow>): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(patch);
  if (fields.length === 0) return;
  const set = fields.map((f) => `${f} = @${f}`).join(", ");
  await db.execute({
    sql: `UPDATE cases SET ${set}, updated_at = @updated_at WHERE id = @id`,
    args: { ...patch, id, updated_at: new Date().toISOString() } as unknown as Record<string, string | number | null>,
  });
}

// --- Commitments -------------------------------------------------------------

export async function insertCommitment(input: {
  caseId: string;
  description: string;
  dueAt: string;
  verificationMethod: string;
  sourceCallId?: string;
}): Promise<CommitmentRow> {
  const db = await getDb();
  const now = new Date().toISOString();
  const countRes = await db.execute({
    sql: `SELECT COUNT(*) as n FROM commitments WHERE case_id = @caseId`,
    args: { caseId: input.caseId },
  });
  const prevCount = countRes.rows[0] as unknown as { n: number };
  const row: CommitmentRow = {
    id: `commit_${randomUUID().slice(0, 8)}`,
    case_id: input.caseId,
    source_call_id: input.sourceCallId ?? null,
    description: input.description,
    due_at: input.dueAt,
    status: "pending",
    verification_method: input.verificationMethod,
    sequence: Number(prevCount.n) + 1,
    created_at: now,
    updated_at: now,
  };
  await db.execute({
    sql: `INSERT INTO commitments (id, case_id, source_call_id, description, due_at, status, verification_method, sequence, created_at, updated_at)
          VALUES (@id, @case_id, @source_call_id, @description, @due_at, @status, @verification_method, @sequence, @created_at, @updated_at)`,
    args: row as unknown as Record<string, string | number | null>,
  });
  return row;
}

export async function updateCommitment(id: string, patch: Partial<CommitmentRow>): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(patch);
  if (fields.length === 0) return;
  const set = fields.map((f) => `${f} = @${f}`).join(", ");
  await db.execute({
    sql: `UPDATE commitments SET ${set}, updated_at = @updated_at WHERE id = @id`,
    args: { ...patch, id, updated_at: new Date().toISOString() } as unknown as Record<string, string | number | null>,
  });
}

export async function getLatestCommitment(caseId: string): Promise<CommitmentRow | undefined> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT * FROM commitments WHERE case_id = @caseId ORDER BY sequence DESC LIMIT 1`,
    args: { caseId },
  });
  return res.rows[0] as unknown as CommitmentRow | undefined;
}

export async function listCommitmentsForCase(caseId: string): Promise<CommitmentRow[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT * FROM commitments WHERE case_id = @caseId ORDER BY sequence ASC`,
    args: { caseId },
  });
  return res.rows as unknown as CommitmentRow[];
}

export async function listDueCommitments(nowIso: string): Promise<CommitmentRow[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT * FROM commitments WHERE status = 'pending' AND due_at <= @now`,
    args: { now: nowIso },
  });
  return res.rows as unknown as CommitmentRow[];
}

// --- Calls -------------------------------------------------------------

export async function insertCall(input: {
  caseId: string;
  commitmentId?: string;
  purpose: "initial" | "verification" | "escalation";
  toPhone: string;
  calleCallId: string;
}): Promise<CallRow> {
  const db = await getDb();
  const row: CallRow = {
    id: `call_${randomUUID().slice(0, 8)}`,
    case_id: input.caseId,
    commitment_id: input.commitmentId ?? null,
    purpose: input.purpose,
    calle_call_id: input.calleCallId,
    to_phone: input.toPhone,
    status: "calling",
    outcome: null,
    summary: null,
    transcript: null,
    structured_result: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    duration_seconds: null,
  };
  await db.execute({
    sql: `INSERT INTO calls (id, case_id, commitment_id, purpose, calle_call_id, to_phone, status, outcome, summary, transcript, structured_result, started_at, completed_at, duration_seconds)
          VALUES (@id, @case_id, @commitment_id, @purpose, @calle_call_id, @to_phone, @status, @outcome, @summary, @transcript, @structured_result, @started_at, @completed_at, @duration_seconds)`,
    args: row as unknown as Record<string, string | number | null>,
  });
  return row;
}

export async function updateCall(id: string, patch: Partial<CallRow>): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(patch);
  if (fields.length === 0) return;
  const set = fields.map((f) => `${f} = @${f}`).join(", ");
  await db.execute({
    sql: `UPDATE calls SET ${set} WHERE id = @id`,
    args: { ...patch, id } as unknown as Record<string, string | number | null>,
  });
}

export async function getCallByCalleId(calleCallId: string): Promise<CallRow | undefined> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT * FROM calls WHERE calle_call_id = @calleCallId`,
    args: { calleCallId },
  });
  return res.rows[0] as unknown as CallRow | undefined;
}

export async function listCallsForCase(caseId: string): Promise<CallRow[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT * FROM calls WHERE case_id = @caseId ORDER BY started_at ASC`,
    args: { caseId },
  });
  return res.rows as unknown as CallRow[];
}

export async function listAllCalls(): Promise<CallRow[]> {
  const db = await getDb();
  const res = await db.execute(`SELECT * FROM calls ORDER BY started_at DESC`);
  return res.rows as unknown as CallRow[];
}

// --- Events (timeline / activity) -------------------------------------------------------------

export async function insertEvent(input: {
  caseId: string;
  callId?: string;
  type: TimelineEventType;
  title: string;
  description: string;
}): Promise<EventRow> {
  const db = await getDb();
  const row: EventRow = {
    id: `event_${randomUUID().slice(0, 8)}`,
    case_id: input.caseId,
    call_id: input.callId ?? null,
    type: input.type,
    timestamp: new Date().toISOString(),
    title: input.title,
    description: input.description,
  };
  await db.execute({
    sql: `INSERT INTO events (id, case_id, call_id, type, timestamp, title, description)
          VALUES (@id, @case_id, @call_id, @type, @timestamp, @title, @description)`,
    args: row as unknown as Record<string, string | number | null>,
  });
  return row;
}

export async function listEventsForCase(caseId: string): Promise<EventRow[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT * FROM events WHERE case_id = @caseId ORDER BY timestamp ASC`,
    args: { caseId },
  });
  return res.rows as unknown as EventRow[];
}

export async function listAllEvents(): Promise<EventRow[]> {
  const db = await getDb();
  const res = await db.execute(`SELECT * FROM events ORDER BY timestamp DESC`);
  return res.rows as unknown as EventRow[];
}

// --- Serializers: DB rows -> the exact frontend types -------------------------------------------------------------

export async function serializeCase(row: CaseRow): Promise<Case> {
  const commitmentRow = await getLatestCommitment(row.id);
  const timelineRows = await listEventsForCase(row.id);
  const timeline = timelineRows.map(serializeTimelineEvent);
  const commitment: Commitment | null = commitmentRow
    ? {
        id: commitmentRow.id,
        description: commitmentRow.description,
        due_at: commitmentRow.due_at,
        status: commitmentRow.status,
        verification_method: commitmentRow.verification_method,
      }
    : null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    counterparty: { name: row.counterparty_name, phone: row.counterparty_phone },
    reference_number: row.reference_number,
    user_phone: row.user_phone ?? undefined,
    current_commitment: commitment,
    next_action: deriveNextAction(row, commitmentRow),
    escalation_count: row.escalation_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
    timeline,
  };
}

function deriveNextAction(row: CaseRow, commitment: CommitmentRow | undefined) {
  if (!commitment || row.status === "resolved" || row.status === "failed" || row.status === "cancelled")
    return null;
  if (commitment.status === "pending") {
    return {
      type: "verification_call",
      scheduled_at: commitment.due_at,
      description: `Kept will verify whether "${commitment.description}" was fulfilled once it comes due.`,
    };
  }
  if (commitment.status === "broken") {
    return {
      type: "escalation_call",
      scheduled_at: new Date().toISOString(),
      description: `Kept will call ${row.counterparty_name} to escalate the broken commitment and secure a new one.`,
    };
  }
  return null;
}

export function serializeTimelineEvent(row: EventRow): TimelineEvent {
  return {
    id: row.id,
    case_id: row.case_id,
    type: row.type,
    timestamp: row.timestamp,
    title: row.title,
    description: row.description,
    call_id: row.call_id ?? undefined,
  };
}

export function serializeCall(row: CallRow, caseTitle: string, counterparty: { name: string; phone: string }): Call {
  const structured = row.structured_result ? JSON.parse(row.structured_result) : null;
  return {
    id: row.id,
    case_id: row.case_id,
    case_title: caseTitle,
    counterparty,
    timestamp: row.started_at,
    duration_seconds: row.duration_seconds ?? 0,
    status: row.status,
    outcome: row.outcome,
    purpose: row.purpose,
    summary: row.summary ?? "",
    extracted_commitment:
      structured && structured.promise_text
        ? {
            what: structured.promise_text,
            when: structured.due_at ?? "",
            reference: structured.reference_number ?? "",
          }
        : null,
    transcript: row.transcript ?? undefined,
  };
}

export function serializeCommitmentWithCase(row: CommitmentRow, caseRow: CaseRow): CommitmentWithCase {
  return {
    id: row.id,
    description: row.description,
    due_at: row.due_at,
    status: row.status,
    case_id: caseRow.id,
    case_title: caseRow.title,
    counterparty_name: caseRow.counterparty_name,
    next_action_description:
      row.status === "pending"
        ? `Verification call scheduled once due`
        : row.status === "broken"
          ? `Escalation in progress`
          : row.status === "cancelled"
            ? `Cancelled`
            : `Resolved`,
  };
}

export function serializeActivityEvent(row: EventRow, caseTitle: string): ActivityEvent {
  return {
    id: row.id,
    case_id: row.case_id,
    case_title: caseTitle,
    type: row.type,
    timestamp: row.timestamp,
    title: row.title,
    description: row.description,
  };
}

export type { CaseRow, CommitmentRow, CallRow, EventRow };
