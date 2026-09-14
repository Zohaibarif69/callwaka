/**
 * This is what every page actually imports. It tries the real backend
 * (SQLite + CALL-E, via realApi.ts) first. If that throws for any reason —
 * server not deployed, database not reachable, CALL-E API key missing,
 * network hiccup, whatever — it transparently falls back to the same
 * in-memory demo data the UI always used (mockApi.ts), so the dashboard
 * never shows a broken screen.
 *
 * `connectionStatus` is updated on every call so the UI can show a small
 * "Live" vs "Showing sample data" indicator (see ConnectionStatusBadge).
 *
 * NOTE: this is a demo-safety net, not a sync layer — if a request happens
 * to fail after some real cases already exist, the fallback shows the
 * mock seed data, not a merge of the two. Good enough for "don't show a
 * blank/broken screen mid-hackathon-demo"; not a substitute for real
 * offline support.
 */
import type { Case, Call, CommitmentWithCase, ActivityEvent } from "../types";
import * as real from "./realApi";
import * as mock from "./mockApi";
import { setConnectionState, getConnectionState } from "./connectionStatus";

async function withFallback<T>(label: string, live: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    const result = await live();
    setConnectionState("live");
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Callwaka] Live "${label}" failed, falling back to sample data:`, message);
    }
    setConnectionState("fallback", message);
    return fallback();
  }
}

export const CaseService = {
  getCases: (): Promise<Case[]> =>
    withFallback("getCases", real.CaseService.getCases, mock.CaseService.getCases),

  getCase: (id: string): Promise<Case | null> =>
    withFallback(
      "getCase",
      () => real.CaseService.getCase(id),
      () => mock.CaseService.getCase(id)
    ),

  createCase: (data: {
    description: string;
    phone: string;
    reference?: string;
    commitment?: string;
    deadline?: string;
    userPhone?: string;
  }): Promise<Case> =>
    withFallback(
      "createCase",
      () => real.CaseService.createCase(data),
      () => mock.CaseService.createCase(data)
    ),

  cancelCase: async (id: string): Promise<Case> => {
    // Cancel is deliberately NOT run through withFallback like the reads
    // above. Silently "succeeding" via the in-memory mock while a real case
    // is still active on the real backend would be the worst possible
    // failure mode here — the person would believe Callwaka stopped calling
    // when it didn't. If we're already in demo/fallback mode (no real
    // backend at all this session), cancelling the mock case is correct and
    // safe; otherwise a failure needs to surface as a real error.
    if (getConnectionState().state === "fallback") {
      return mock.CaseService.cancelCase(id);
    }
    return real.CaseService.cancelCase(id);
  },
};

export const CallService = {
  getCalls: (): Promise<Call[]> =>
    withFallback("getCalls", real.CallService.getCalls, mock.CallService.getCalls),

  getCall: (id: string): Promise<Call | null> =>
    withFallback(
      "getCall",
      () => real.CallService.getCall(id),
      () => mock.CallService.getCall(id)
    ),
};

export const CommitmentService = {
  getCommitments: (): Promise<CommitmentWithCase[]> =>
    withFallback("getCommitments", real.CommitmentService.getCommitments, mock.CommitmentService.getCommitments),
};

export const ActivityService = {
  getActivity: (): Promise<ActivityEvent[]> =>
    withFallback("getActivity", real.ActivityService.getActivity, mock.ActivityService.getActivity),
};
