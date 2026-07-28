export type CaseStatus = "tracking" | "waiting" | "attention" | "resolved" | "failed" | "cancelled";
export type CommitmentStatus = "pending" | "overdue" | "fulfilled" | "broken" | "cancelled";
export type CallOutcome =
  | "commitment_secured"
  | "commitment_updated"
  | "escalation_completed"
  | "no_answer"
  | "voicemail"
  | "busy"
  | "failed";
export type CallStatus =
  | "preparing"
  | "calling"
  | "ringing"
  | "connected"
  | "in_conversation"
  | "processing"
  | "completed"
  | "no_answer"
  | "busy"
  | "voicemail"
  | "failed";

export type TimelineEventType =
  | "case_created"
  | "call_started"
  | "call_connected"
  | "call_completed"
  | "call_failed"
  | "commitment_created"
  | "commitment_updated"
  | "commitment_fulfilled"
  | "commitment_broken"
  | "verification_started"
  | "verification_completed"
  | "escalation_started"
  | "escalation_completed"
  | "case_resolved"
  | "case_cancelled"
  | "human_intervention_required";

export interface Counterparty {
  name: string;
  phone: string;
}

export interface Commitment {
  id: string;
  description: string;
  due_at: string;
  status: CommitmentStatus;
  verification_method: string;
}

export interface NextAction {
  type: string;
  scheduled_at: string;
  description: string;
}

export interface TimelineEvent {
  id: string;
  case_id: string;
  type: TimelineEventType;
  timestamp: string;
  title: string;
  description: string;
  call_id?: string;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  status: CaseStatus;
  counterparty: Counterparty;
  reference_number: string;
  user_phone?: string;
  current_commitment: Commitment | null;
  next_action: NextAction | null;
  escalation_count: number;
  created_at: string;
  updated_at: string;
  timeline: TimelineEvent[];
}

export interface Call {
  id: string;
  case_id: string;
  case_title: string;
  counterparty: Counterparty;
  timestamp: string;
  duration_seconds: number;
  status: CallStatus;
  outcome: CallOutcome | null;
  purpose?: "initial" | "verification" | "escalation";
  summary: string;
  extracted_commitment: {
    what: string;
    when: string;
    reference: string;
  } | null;
  transcript?: string;
}

export interface CommitmentWithCase {
  id: string;
  description: string;
  due_at: string;
  status: CommitmentStatus;
  case_id: string;
  case_title: string;
  counterparty_name: string;
  next_action_description: string;
}

export interface ActivityEvent {
  id: string;
  case_id: string;
  case_title: string;
  type: TimelineEventType;
  timestamp: string;
  title: string;
  description: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export type PageName =
  | "overview"
  | "cases"
  | "case-detail"
  | "calls"
  | "commitments"
  | "activity"
  | "settings";

export interface Route {
  page: PageName;
  params?: Record<string, string>;
}

export type NavigateFn = (route: Route) => void;
