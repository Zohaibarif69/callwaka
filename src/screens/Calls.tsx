import { useEffect, useState } from "react";
import { Phone, CheckCircle, XCircle, Clock } from "lucide-react";
import type { Call, CallStatus, NavigateFn } from "../types";
import { CallService } from "../services/api";
import EmptyState from "../components/ui/EmptyState";
import MaskedPhone from "../components/ui/MaskedPhone";
import { SkeletonList } from "../components/ui/Skeleton";
import CallDrawer from "../components/CallDrawer";
import { formatTimestamp, formatDuration } from "../lib/utils";

type Filter = "all" | CallStatus;

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
  { label: "No answer", value: "no_answer" },
  { label: "Voicemail", value: "voicemail" },
];

const OUTCOME_LABELS: Record<string, string> = {
  commitment_secured: "Commitment secured",
  commitment_updated: "Commitment updated",
  escalation_completed: "Escalation resolved",
  no_answer: "No answer",
  voicemail: "Voicemail",
  busy: "Busy",
  failed: "Call failed",
};

interface Props {
  navigate: NavigateFn;
}

export default function Calls({ navigate }: Props) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [openCall, setOpenCall] = useState<Call | null>(null);

  useEffect(() => {
    CallService.getCalls().then((c) => {
      setCalls(c);
      setLoading(false);
    });
  }, []);

  const filtered = calls.filter((c) => filter === "all" || c.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Calls</h1>
        <p className="text-sm text-gray-500 mt-1">
          Every conversation Kept has had on your behalf.
        </p>
      </div>

      {/* Filters */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 w-max shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap ${
              filter === f.value
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            aria-pressed={filter === f.value}
          >
            {f.label}
          </button>
        ))}
      </div>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <SkeletonList count={3} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Phone className="size-8" />}
          title="No calls yet"
          description="Calls made by Kept will appear here."
        />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            <table className="w-full" aria-label="Calls list">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Counterparty</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Duration</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Outcome</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Case</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((call, i) => {
                  const isSuccess =
                    call.outcome === "commitment_secured" ||
                    call.outcome === "commitment_updated" ||
                    call.outcome === "escalation_completed";
                  return (
                    <tr
                      key={call.id}
                      className={`group hover:bg-slate-50 transition-colors cursor-pointer ${i !== 0 ? "border-t border-gray-100" : ""}`}
                      onClick={() => setOpenCall(call)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setOpenCall(call)}
                      role="button"
                      aria-label={`View call details for ${call.counterparty.name}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <Phone className="size-3.5 text-gray-500" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{call.counterparty.name}</p>
                            <p className="text-xs text-gray-400"><MaskedPhone phone={call.counterparty.phone} /></p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-gray-700">{formatTimestamp(call.timestamp)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <Clock className="size-3.5 text-gray-400" aria-hidden="true" />
                          <span className="font-mono">{formatDuration(call.duration_seconds)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {isSuccess ? (
                            <CheckCircle className="size-4 text-green-600 shrink-0" aria-hidden="true" />
                          ) : (
                            <XCircle className="size-4 text-red-500 shrink-0" aria-hidden="true" />
                          )}
                          <span className="text-sm text-gray-700">
                            {call.outcome ? OUTCOME_LABELS[call.outcome] ?? call.outcome : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({ page: "case-detail", params: { id: call.case_id } });
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 hover:underline focus:outline-none"
                        >
                          {call.case_title}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((call) => {
              const isSuccess =
                call.outcome === "commitment_secured" ||
                call.outcome === "commitment_updated" ||
                call.outcome === "escalation_completed";
              return (
                <button
                  key={call.id}
                  onClick={() => setOpenCall(call)}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`View call details for ${call.counterparty.name}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">{call.counterparty.name}</p>
                    <div className="flex items-center gap-1.5">
                      {isSuccess ? (
                        <CheckCircle className="size-4 text-green-600" aria-hidden="true" />
                      ) : (
                        <XCircle className="size-4 text-red-500" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{formatTimestamp(call.timestamp)}</p>
                  <p className="text-xs text-gray-500 font-mono">{formatDuration(call.duration_seconds)}</p>
                  <p className="text-xs text-gray-400 mt-1">{call.case_title}</p>
                </button>
              );
            })}
          </div>
        </>
      )}

      <CallDrawer call={openCall} onClose={() => setOpenCall(null)} />
    </div>
  );
}
