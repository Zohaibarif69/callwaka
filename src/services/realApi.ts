import type { Case, Call, CommitmentWithCase, ActivityEvent } from "../types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with ${res.status}`);
  }
  return res.json();
}

export const CaseService = {
  getCases: async (): Promise<Case[]> => {
    const { cases } = await json<{ cases: Case[] }>(await fetch("/api/cases"));
    return cases;
  },

  getCase: async (id: string): Promise<Case | null> => {
    const res = await fetch(`/api/cases/${id}`);
    if (res.status === 404) return null;
    const { case: c } = await json<{ case: Case }>(res);
    return c;
  },

  /** Same signature as mockApi's CaseService.createCase — the NewCaseModal needs no changes. */
  createCase: async (data: {
    description: string;
    phone: string;
    reference?: string;
    commitment?: string;
    deadline?: string;
    userPhone?: string;
  }): Promise<Case> => {
    const { case: c } = await json<{ case: Case }>(
      await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    );
    return c;
  },

  cancelCase: async (id: string): Promise<Case> => {
    const { case: c } = await json<{ case: Case }>(
      await fetch(`/api/cases/${id}/cancel`, { method: "POST" })
    );
    return c;
  },
};

export const CallService = {
  getCalls: async (): Promise<Call[]> => {
    const { calls } = await json<{ calls: Call[] }>(await fetch("/api/calls"));
    return calls;
  },
  getCall: async (id: string): Promise<Call | null> => {
    const calls = await CallService.getCalls();
    return calls.find((c) => c.id === id) ?? null;
  },
};

export const CommitmentService = {
  getCommitments: async (): Promise<CommitmentWithCase[]> => {
    const { commitments } = await json<{ commitments: CommitmentWithCase[] }>(
      await fetch("/api/commitments")
    );
    return commitments;
  },
};

export const ActivityService = {
  getActivity: async (): Promise<ActivityEvent[]> => {
    const { events } = await json<{ events: ActivityEvent[] }>(await fetch("/api/activity"));
    return events;
  },
};
