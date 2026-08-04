import { X, Phone, Clock, CheckCircle, XCircle } from "lucide-react";
import type { Call } from "../types";
import { formatDatetime, formatDuration } from "../lib/utils";
import MaskedPhone from "./ui/MaskedPhone";

interface Props {
  call: Call | null;
  onClose: () => void;
}

const OUTCOME_LABELS: Record<string, string> = {
  commitment_secured: "Commitment secured",
  commitment_updated: "Commitment updated",
  escalation_completed: "Escalation resolved",
  no_answer: "No answer",
  voicemail: "Voicemail",
  busy: "Busy",
  failed: "Call failed",
};

export default function CallDrawer({ call, onClose }: Props) {
  if (!call) return null;

  const isSuccess = call.outcome === "commitment_secured" || call.outcome === "commitment_updated" || call.outcome === "escalation_completed";

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed right-0 top-0 bottom-0 z-40 w-full sm:max-w-md bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.08)] overflow-y-auto flex flex-col"
        role="complementary"
        aria-label="Call details"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Call details</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close call details"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-6">
          {/* Caller info */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center size-10 rounded-full bg-gray-100">
                <Phone className="size-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {call.counterparty.name}
                </p>
                <p className="text-xs text-gray-400"><MaskedPhone phone={call.counterparty.phone} /></p>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Date</p>
              <p className="text-sm text-gray-900">{formatDatetime(call.timestamp)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Clock className="size-3 text-gray-400" />
                <p className="text-xs text-gray-400">Duration</p>
              </div>
              <p className="text-sm font-mono text-gray-900">
                {formatDuration(call.duration_seconds)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Case</p>
              <p className="text-sm text-gray-900">{call.case_title}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Outcome</p>
              <div className="flex items-center gap-1.5">
                {isSuccess ? (
                  <CheckCircle className="size-3.5 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="size-3.5 text-red-500 shrink-0" />
                )}
                <p className="text-sm text-gray-900">
                  {call.outcome ? OUTCOME_LABELS[call.outcome] ?? call.outcome : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Summary
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">{call.summary}</p>
          </div>

          {/* Extracted commitment */}
          {call.extracted_commitment && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Extracted commitment
              </h3>
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs text-green-600 font-medium mb-0.5">What</p>
                  <p className="text-sm text-gray-900">{call.extracted_commitment.what}</p>
                </div>
                <div>
                  <p className="text-xs text-green-600 font-medium mb-0.5">When</p>
                  <p className="text-sm text-gray-900">{call.extracted_commitment.when}</p>
                </div>
                <div>
                  <p className="text-xs text-green-600 font-medium mb-0.5">Reference</p>
                  <p className="text-sm text-gray-900">#{call.extracted_commitment.reference}</p>
                </div>
              </div>
            </div>
          )}

          {/* Transcript */}
          {call.transcript && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Transcript
              </h3>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 max-h-56 overflow-y-auto">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {call.transcript}
                </pre>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
