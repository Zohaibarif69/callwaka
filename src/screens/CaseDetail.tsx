import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Hash,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Ban,
} from "lucide-react";
import type { Case, Call, NavigateFn } from "../types";
import { CaseService, CallService } from "../services/api";
import StatusBadge from "../components/ui/StatusBadge";
import MaskedPhone from "../components/ui/MaskedPhone";
import Timeline from "../components/timeline/Timeline";
import CallDrawer from "../components/CallDrawer";
import { formatDate, formatShortDate } from "../lib/utils";

interface Props {
  caseId: string;
  navigate: NavigateFn;
  demoCase: Case | null;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  );
}

export default function CaseDetail({ caseId, navigate, demoCase }: Props) {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openCallId, setOpenCallId] = useState<string | null>(null);
  const [openCall, setOpenCall] = useState<Call | null>(null);
  const [autoVerify, setAutoVerify] = useState(true);
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    if (demoCase && demoCase.id === caseId) {
      setCaseData(demoCase);
      setLoading(false);
      return;
    }
    CaseService.getCase(caseId).then((c) => {
      if (!c) setError(true);
      else setCaseData(c);
      setLoading(false);
    });
  }, [caseId, demoCase]);

  useEffect(() => {
    if (demoCase && demoCase.id === caseId) {
      setCaseData(demoCase);
    }
  }, [demoCase]);

  useEffect(() => {
    if (!openCallId) {
      setOpenCall(null);
      return;
    }
    CallService.getCall(openCallId).then(setOpenCall);
  }, [openCallId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" aria-hidden="true" />
        <div className="h-8 w-72 bg-gray-100 rounded animate-pulse" aria-hidden="true" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" aria-hidden="true" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="size-8 text-gray-300 mb-3" aria-hidden="true" />
        <p className="text-sm font-semibold text-gray-900 mb-1">
          We couldn't load this case.
        </p>
        <p className="text-sm text-gray-500 mb-5">
          Please try again. Your case data is safe.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="h-9 px-4 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Try again
        </button>
      </div>
    );
  }

  const c = caseData;
  const commitment = c.current_commitment;
  const nextAction = c.next_action;
  const isDemoCase = !!demoCase && demoCase.id === caseId;
  const isTerminal = c.status === "resolved" || c.status === "failed" || c.status === "cancelled";

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError("");
    try {
      const updated = await CaseService.cancelCase(c.id);
      setCaseData(updated);
      setConfirmingCancel(false);
    } catch {
      setCancelError("Couldn't cancel this case — the real case is likely still active. Try again in a moment.");
    } finally {
      setCancelling(false);
    }
  };
  const isResolved = c.status === "resolved";
  const isBroken = commitment?.status === "broken" || commitment?.status === "overdue";

  return (
    <div className="space-y-7">
      {/* Back */}
      <button
        onClick={() => navigate({ page: "cases" })}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
        aria-label="Back to cases list"
      >
        <ArrowLeft className="size-4" />
        Cases
      </button>

      {/* Header */}
      <div>
        <div className="flex flex-wrap items-start gap-3 mb-2">
          <h1 className="text-2xl font-semibold text-gray-900 flex-1 min-w-0">
            {c.title}
          </h1>
          <StatusBadge status={c.status} />
          {!isTerminal && !isDemoCase && !confirmingCancel && (
            <button
              onClick={() => setConfirmingCancel(true)}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <Ban className="size-3.5" />
              Cancel case
            </button>
          )}
        </div>

        {confirmingCancel && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800 flex-1 min-w-[200px]">
              Stop tracking this case? Kept won't place any more verification or
              escalation calls for it. This can't be undone.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmingCancel(false)}
                disabled={cancelling}
                className="h-8 px-3 text-xs font-medium text-gray-600 hover:text-gray-800 focus:outline-none disabled:opacity-50"
              >
                Never mind
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="h-8 px-3 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                {cancelling ? "Cancelling…" : "Yes, cancel it"}
              </button>
            </div>
          </div>
        )}
        {cancelError && (
          <p className="mb-3 text-sm text-red-600">{cancelError}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-gray-500 mt-0.5">
          <span className="flex items-center gap-1.5">
            <Phone className="size-3.5 text-gray-400" aria-hidden="true" />
            {c.counterparty.name}
          </span>
          {c.reference_number && (
            <span className="flex items-center gap-1.5">
              <Hash className="size-3.5 text-gray-400" aria-hidden="true" />
              {c.reference_number}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5 text-gray-400" aria-hidden="true" />
            Created {formatDate(c.created_at)}
          </span>
        </div>
      </div>

      {/* Broken promise banner */}
      {isBroken && !isResolved && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-red-500 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-red-900 mb-1">Promise broken</p>
              <p className="text-sm text-red-700 leading-relaxed">
                {commitment?.description} was not fulfilled by the deadline.
              </p>
              {c.escalation_count > 0 && (
                <p className="text-sm text-red-600 mt-2 font-medium">Kept is handling this.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resolved banner */}
      {isResolved && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <CheckCircle className="size-5 text-green-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-green-900">Case resolved</p>
              <p className="text-sm text-green-700 mt-0.5">
                Commitment fulfilled. Case closed {formatDate(c.updated_at)}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Two-column layout: main + rail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Current commitment */}
        <div
          className={`bg-white border rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
            isBroken ? "border-red-200" : isResolved ? "border-green-200" : "border-gray-200"
          }`}
        >
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Current commitment
          </p>
          {commitment ? (
            <div className="space-y-3">
              <p className="text-base font-semibold text-gray-900">{commitment.description}</p>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Clock className="size-3.5 text-gray-400" aria-hidden="true" />
                {formatShortDate(commitment.due_at)}
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Promised by</p>
                <p className="text-sm text-gray-900">{c.counterparty.name}</p>
              </div>
              {c.reference_number && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Reference</p>
                  <p className="text-sm text-gray-900">#{c.reference_number}</p>
                </div>
              )}
              <div className="pt-1">
                <StatusBadge status={commitment.status} size="sm" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No commitment yet. Kept will secure one on the next call.</p>
          )}
        </div>

        {/* Next action */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Next action
          </p>
          {nextAction ? (
            <div className="space-y-3">
              <p className="text-base font-semibold text-gray-900">{nextAction.description}</p>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Clock className="size-3.5 text-gray-400" aria-hidden="true" />
                {formatShortDate(nextAction.scheduled_at)}
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                {nextAction.type === "verify"
                  ? "Kept will check whether the promise was kept."
                  : nextAction.type === "escalate"
                  ? "Kept will escalate because the previous commitment was broken."
                  : `Kept will perform a ${nextAction.type}.`}
              </p>
              <span className="inline-flex items-center text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                Scheduled
              </span>
            </div>
          ) : isResolved ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="size-4 text-green-500" aria-hidden="true" />
              No further action needed.
            </div>
          ) : (
            <p className="text-sm text-gray-400">Kept will determine the next action after the current commitment resolves.</p>
          )}
        </div>

        {/* Counterparty + automation */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Counterparty
            </p>
            <div className="space-y-2.5">
              <InfoRow label="Organization">{c.counterparty.name}</InfoRow>
              <InfoRow label="Phone"><MaskedPhone phone={c.counterparty.phone} /></InfoRow>
              {c.reference_number && (
                <InfoRow label="Reference">#{c.reference_number}</InfoRow>
              )}
              {c.escalation_count > 0 && (
                <InfoRow label="Escalations">{c.escalation_count}</InfoRow>
              )}
              <InfoRow label="Verification calls go to">
                {c.user_phone ? (
                  <span>
                    You (<MaskedPhone phone={c.user_phone} />)
                  </span>
                ) : (
                  <span>{c.counterparty.name} <span className="text-gray-400">— no number on file for you</span></span>
                )}
              </InfoRow>
            </div>
          </div>

          {/* Automation */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Automation
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Automatic verification</span>
                <button
                  onClick={() => setAutoVerify((v) => !v)}
                  aria-pressed={autoVerify}
                  aria-label={`Automatic verification is ${autoVerify ? "on" : "off"}`}
                  className="text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                >
                  {autoVerify ? (
                    <ToggleRight className="size-6 text-blue-600" />
                  ) : (
                    <ToggleLeft className="size-6 text-gray-300" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Automatic escalation</span>
                <button
                  onClick={() => setAutoEscalate((v) => !v)}
                  aria-pressed={autoEscalate}
                  aria-label={`Automatic escalation is ${autoEscalate ? "on" : "off"}`}
                  className="text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                >
                  {autoEscalate ? (
                    <ToggleRight className="size-6 text-blue-600" />
                  ) : (
                    <ToggleLeft className="size-6 text-gray-300" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <section aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="text-sm font-semibold text-gray-900 mb-5">
          Timeline
        </h2>
        <Timeline
          events={c.timeline}
          onCallClick={(id) => setOpenCallId(id)}
        />
      </section>

      <CallDrawer call={openCall} onClose={() => setOpenCallId(null)} />
    </div>
  );
}
