import type {
  Case,
  Call,
  CommitmentWithCase,
  ActivityEvent,
} from "../types";

const CASES: Case[] = [
  {
    id: "case_001",
    title: "ISP Technician Appointment",
    description: "My ISP promised a technician Friday between 9 AM and 1 PM. Make sure they actually show up.",
    status: "tracking",
    counterparty: { name: "ISP Support", phone: "+1 (800) 555-0199" },
    reference_number: "88213",
    current_commitment: {
      id: "commit_001",
      description: "Technician visit",
      due_at: "2026-09-13T14:00:00-05:00",
      status: "pending",
      verification_method: "user_confirm",
    },
    next_action: {
      type: "verify",
      scheduled_at: "2026-09-13T16:00:00-05:00",
      description: "Verify whether the technician arrived",
    },
    escalation_count: 0,
    created_at: "2026-09-10T14:32:00-05:00",
    updated_at: "2026-09-10T15:08:00-05:00",
    timeline: [
      {
        id: "evt_001",
        case_id: "case_001",
        type: "case_created",
        timestamp: "2026-09-10T14:32:00-05:00",
        title: "Case created",
        description: "ISP Technician Appointment case opened.",
      },
      {
        id: "evt_002",
        case_id: "case_001",
        type: "call_completed",
        timestamp: "2026-09-10T14:40:00-05:00",
        title: "Initial call completed",
        description: "Reached ISP Support after 1 hold.",
        call_id: "call_001",
      },
      {
        id: "evt_003",
        case_id: "case_001",
        type: "commitment_created",
        timestamp: "2026-09-10T14:44:00-05:00",
        title: "Commitment recorded",
        description: "Technician visit confirmed for Saturday, 2:00 PM – 4:00 PM. Ticket #88213.",
      },
    ],
  },
  {
    id: "case_002",
    title: "Insurance Refund Request",
    description: "National Health Insurance owes me a $340 refund for a double charge. They promised to process it within 10 business days.",
    status: "attention",
    counterparty: { name: "National Health Insurance", phone: "+1 (888) 422-0011" },
    reference_number: "REF-2024-8812",
    current_commitment: {
      id: "commit_002",
      description: "$340 refund to account ending 4421",
      due_at: "2026-09-08T17:00:00-05:00",
      status: "overdue",
      verification_method: "bank_confirm",
    },
    next_action: {
      type: "escalate",
      scheduled_at: "2026-09-11T10:00:00-05:00",
      description: "Escalation call to supervisor line",
    },
    escalation_count: 1,
    created_at: "2026-08-29T09:15:00-05:00",
    updated_at: "2026-09-10T08:30:00-05:00",
    timeline: [
      {
        id: "evt_010",
        case_id: "case_002",
        type: "case_created",
        timestamp: "2026-08-29T09:15:00-05:00",
        title: "Case created",
        description: "Insurance Refund Request case opened.",
      },
      {
        id: "evt_011",
        case_id: "case_002",
        type: "call_completed",
        timestamp: "2026-08-29T09:22:00-05:00",
        title: "Initial call completed",
        description: "Spoke with billing department. Refund approved in system.",
        call_id: "call_002",
      },
      {
        id: "evt_012",
        case_id: "case_002",
        type: "commitment_created",
        timestamp: "2026-08-29T09:28:00-05:00",
        title: "Commitment recorded",
        description: "$340 refund promised within 10 business days. Reference REF-2024-8812.",
      },
      {
        id: "evt_013",
        case_id: "case_002",
        type: "commitment_broken",
        timestamp: "2026-09-10T08:30:00-05:00",
        title: "Promise broken",
        description: "No refund appeared in account after 10 business days. Deadline passed.",
      },
    ],
  },
  {
    id: "case_003",
    title: "Streaming Service Cancellation",
    description: "StreamPlus is still charging me after I cancelled. They promised to stop all future charges and refund the last month.",
    status: "resolved",
    counterparty: { name: "StreamPlus Support", phone: "+1 (877) 600-7700" },
    reference_number: "SP-CXL-40921",
    current_commitment: {
      id: "commit_003",
      description: "Subscription cancelled, no further charges",
      due_at: "2026-09-05T23:59:00-05:00",
      status: "fulfilled",
      verification_method: "bank_confirm",
    },
    next_action: null,
    escalation_count: 0,
    created_at: "2026-09-03T11:00:00-05:00",
    updated_at: "2026-09-07T14:20:00-05:00",
    timeline: [
      {
        id: "evt_020",
        case_id: "case_003",
        type: "case_created",
        timestamp: "2026-09-03T11:00:00-05:00",
        title: "Case created",
        description: "Streaming Service Cancellation case opened.",
      },
      {
        id: "evt_021",
        case_id: "case_003",
        type: "call_completed",
        timestamp: "2026-09-03T11:08:00-05:00",
        title: "Call completed",
        description: "StreamPlus confirmed cancellation and promised refund of last charge.",
        call_id: "call_003",
      },
      {
        id: "evt_022",
        case_id: "case_003",
        type: "commitment_created",
        timestamp: "2026-09-03T11:12:00-05:00",
        title: "Commitment recorded",
        description: "No further charges and $14.99 refund within 5 business days.",
      },
      {
        id: "evt_023",
        case_id: "case_003",
        type: "commitment_fulfilled",
        timestamp: "2026-09-07T14:15:00-05:00",
        title: "Promise fulfilled",
        description: "$14.99 refund confirmed in account. No charges since cancellation.",
      },
      {
        id: "evt_024",
        case_id: "case_003",
        type: "case_resolved",
        timestamp: "2026-09-07T14:20:00-05:00",
        title: "Case resolved",
        description: "Subscription successfully cancelled. All charges stopped.",
      },
    ],
  },
];

const CALLS: Call[] = [
  {
    id: "call_001",
    case_id: "case_001",
    case_title: "ISP Technician Appointment",
    counterparty: { name: "ISP Support", phone: "+1 (800) 555-0199" },
    timestamp: "2026-09-10T14:40:00-05:00",
    duration_seconds: 258,
    status: "completed",
    outcome: "commitment_secured",
    summary:
      "Reached tier-2 support after an 8-minute hold. Agent confirmed a technician appointment for Saturday, September 13, between 2:00 PM and 4:00 PM. Ticket #88213 created.",
    extracted_commitment: {
      what: "Technician visit",
      when: "Saturday, Sep 13 · 2:00 PM – 4:00 PM",
      reference: "88213",
    },
    transcript:
      "Agent: Thank you for calling ISP Support, my name is Marcus. How can I help?\nKept: Hi, I need to schedule a technician visit. My internet has been down since Tuesday.\nAgent: I can see your account. We have availability Saturday the 13th, 2 to 4 PM. Does that work?\nKept: Yes, please confirm that in writing.\nAgent: I'll create ticket 88213. A technician will arrive Saturday between 2 and 4 PM.",
  },
  {
    id: "call_002",
    case_id: "case_002",
    case_title: "Insurance Refund Request",
    counterparty: { name: "National Health Insurance", phone: "+1 (888) 422-0011" },
    timestamp: "2026-08-29T09:22:00-05:00",
    duration_seconds: 374,
    status: "completed",
    outcome: "commitment_secured",
    summary:
      "Connected to billing department. Agent confirmed the double charge from August 15th. Approved refund of $340 within 10 business days to account ending 4421. Reference REF-2024-8812.",
    extracted_commitment: {
      what: "$340 refund to account ending 4421",
      when: "Within 10 business days (by Sep 12)",
      reference: "REF-2024-8812",
    },
  },
  {
    id: "call_003",
    case_id: "case_003",
    case_title: "Streaming Service Cancellation",
    counterparty: { name: "StreamPlus Support", phone: "+1 (877) 600-7700" },
    timestamp: "2026-09-03T11:08:00-05:00",
    duration_seconds: 213,
    status: "completed",
    outcome: "commitment_secured",
    summary:
      "Agent confirmed cancellation of subscription effective immediately. Refund of $14.99 for the September charge approved, expected within 5 business days. Reference SP-CXL-40921.",
    extracted_commitment: {
      what: "Subscription cancelled + $14.99 refund",
      when: "Within 5 business days",
      reference: "SP-CXL-40921",
    },
  },
];

const COMMITMENTS: CommitmentWithCase[] = [
  {
    id: "commit_001",
    description: "Technician visit",
    due_at: "2026-09-13T14:00:00-05:00",
    status: "pending",
    case_id: "case_001",
    case_title: "ISP Technician Appointment",
    counterparty_name: "ISP Support",
    next_action_description: "Verify arrival at 4:00 PM",
  },
  {
    id: "commit_002",
    description: "$340 refund to account ending 4421",
    due_at: "2026-09-08T17:00:00-05:00",
    status: "overdue",
    case_id: "case_002",
    case_title: "Insurance Refund Request",
    counterparty_name: "National Health Insurance",
    next_action_description: "Escalation call",
  },
  {
    id: "commit_003",
    description: "Subscription cancelled, no further charges",
    due_at: "2026-09-05T23:59:00-05:00",
    status: "fulfilled",
    case_id: "case_003",
    case_title: "Streaming Service Cancellation",
    counterparty_name: "StreamPlus Support",
    next_action_description: "—",
  },
];

const ACTIVITY: ActivityEvent[] = [
  {
    id: "act_001",
    case_id: "case_002",
    case_title: "Insurance Refund Request",
    type: "commitment_broken",
    timestamp: "2026-09-10T08:30:00-05:00",
    title: "Promise broken",
    description: "Refund deadline passed with no payment received.",
  },
  {
    id: "act_002",
    case_id: "case_001",
    case_title: "ISP Technician Appointment",
    type: "commitment_created",
    timestamp: "2026-09-10T14:44:00-05:00",
    title: "Commitment recorded",
    description: "Technician visit Saturday 2–4 PM. Ticket #88213.",
  },
  {
    id: "act_003",
    case_id: "case_001",
    case_title: "ISP Technician Appointment",
    type: "call_completed",
    timestamp: "2026-09-10T14:40:00-05:00",
    title: "Call completed",
    description: "ISP Support · commitment secured.",
  },
  {
    id: "act_004",
    case_id: "case_001",
    case_title: "ISP Technician Appointment",
    type: "case_created",
    timestamp: "2026-09-10T14:32:00-05:00",
    title: "Case created",
    description: "ISP Technician Appointment",
  },
  {
    id: "act_005",
    case_id: "case_003",
    case_title: "Streaming Service Cancellation",
    type: "case_resolved",
    timestamp: "2026-09-07T14:20:00-05:00",
    title: "Case resolved",
    description: "Subscription cancelled, refund confirmed.",
  },
  {
    id: "act_006",
    case_id: "case_003",
    case_title: "Streaming Service Cancellation",
    type: "commitment_fulfilled",
    timestamp: "2026-09-07T14:15:00-05:00",
    title: "Promise fulfilled",
    description: "$14.99 refund confirmed in account.",
  },
];

function delay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((res) => setTimeout(() => res(data), ms));
}

export const CaseService = {
  getCases: () => delay([...CASES]),
  getCase: (id: string) => {
    const c = CASES.find((c) => c.id === id) ?? null;
    return delay(c);
  },
  createCase: (data: {
    description: string;
    phone: string;
    reference?: string;
    commitment?: string;
    deadline?: string;
    userPhone?: string;
  }): Promise<Case> => {
    const newCase: Case = {
      id: `case_${Date.now()}`,
      title: "New Case",
      description: data.description,
      status: "tracking",
      counterparty: { name: "Contact", phone: data.phone },
      reference_number: data.reference ?? "",
      current_commitment: data.commitment
        ? {
            id: `commit_${Date.now()}`,
            description: data.commitment,
            due_at: data.deadline ?? new Date().toISOString(),
            status: "pending",
            verification_method: "user_confirm",
          }
        : null,
      next_action: null,
      escalation_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      timeline: [
        {
          id: `evt_${Date.now()}`,
          case_id: `case_${Date.now()}`,
          type: "case_created",
          timestamp: new Date().toISOString(),
          title: "Case created",
          description: data.description,
        },
      ],
    };
    CASES.unshift(newCase);
    return delay(newCase, 800);
  },
  cancelCase: (id: string): Promise<Case> => {
    const idx = CASES.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Case not found");
    const updated: Case = {
      ...CASES[idx],
      status: "cancelled",
      updated_at: new Date().toISOString(),
      timeline: [
        {
          id: `evt_${Date.now()}`,
          case_id: id,
          type: "case_cancelled",
          timestamp: new Date().toISOString(),
          title: "Case cancelled",
          description: "Case cancelled by the user. No further calls will be placed.",
        },
        ...CASES[idx].timeline,
      ],
    };
    CASES[idx] = updated;
    return delay(updated);
  },
};

export const CallService = {
  getCalls: () => delay([...CALLS]),
  getCall: (id: string) => {
    const c = CALLS.find((c) => c.id === id) ?? null;
    return delay(c);
  },
};

export const CommitmentService = {
  getCommitments: () => delay([...COMMITMENTS]),
};

export const ActivityService = {
  getActivity: () => delay([...ACTIVITY]),
};
