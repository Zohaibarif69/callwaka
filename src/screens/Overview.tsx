import { useEffect, useState } from "react";
import {
  Briefcase,
  Target,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Play,
} from "lucide-react";
import type { Case, NavigateFn } from "../types";
import { CaseService, ActivityService } from "../services/api";
import StatusBadge from "../components/ui/StatusBadge";
import { SkeletonCard, SkeletonList } from "../components/ui/Skeleton";
import { formatTimestamp } from "../lib/utils";
import type { ActivityEvent } from "../types";

interface Props {
  navigate: NavigateFn;
  demoMode: boolean;
  demoStage: number;
  demoCase: Case | null;
  onRunDemo: () => void;
}

interface KPICardProps {
  label: string;
  value: number | string;
  delta?: string;
  icon: React.ReactNode;
  accent?: string;
}

function KPICard({ label, value, delta, icon, accent = "text-gray-900" }: KPICardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <span className="text-gray-300">{icon}</span>
      </div>
      <p className={`text-3xl font-semibold ${accent} leading-none mb-1`}>{value}</p>
      {delta && <p className="text-xs text-gray-400">{delta}</p>}
    </div>
  );
}

export default function Overview({ navigate, demoMode, demoStage, demoCase, onRunDemo }: Props) {
  const [cases, setCases] = useState<Case[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([CaseService.getCases(), ActivityService.getActivity()]).then(
      ([c, a]) => {
        setCases(c);
        setActivity(a);
        setLoading(false);
      }
    );
  }, []);

  const allCases = demoCase
    ? [demoCase, ...cases.filter((c) => c.id !== demoCase.id)]
    : cases;

  const active = allCases.filter((c) => c.status === "tracking" || c.status === "waiting").length;
  const pending = allCases.reduce((n, c) => n + (c.current_commitment?.status === "pending" ? 1 : 0), 0);
  const attention = allCases.filter((c) => c.status === "attention").length;
  const resolved = allCases.filter((c) => c.status === "resolved").length;

  const attentionCases = allCases.filter((c) => c.status === "attention");
  const activeCases = allCases.filter((c) => c.status === "tracking" || c.status === "waiting").slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{greeting}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {demoMode && demoStage > 0
              ? "Walkthrough in progress — watching the case lifecycle unfold."
              : "Here's what's happening with your cases."}
          </p>
        </div>
        {!demoMode && (
          <button
            onClick={onRunDemo}
            className="flex items-center gap-2 h-9 px-4 text-sm font-medium text-white bg-gray-900 border border-gray-900 rounded-lg hover:bg-gray-800 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label="Preview the full case lifecycle"
          >
            <Play className="size-3.5 text-white/80" />
            Preview walkthrough
          </button>
        )}
      </div>

      {/* KPI row */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Active cases"
            value={active}
            delta="+1 this week"
            icon={<Briefcase className="size-4" />}
            accent="text-blue-600"
          />
          <KPICard
            label="Pending commitments"
            value={pending}
            icon={<Target className="size-4" />}
            accent="text-amber-600"
          />
          <KPICard
            label="Needs attention"
            value={attention}
            icon={<AlertTriangle className="size-4" />}
            accent={attention > 0 ? "text-red-600" : "text-gray-900"}
          />
          <KPICard
            label="Resolved"
            value={resolved}
            delta="all time"
            icon={<CheckCircle className="size-4" />}
            accent="text-green-600"
          />
        </div>
      )}

      {/* Needs attention */}
      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="text-sm font-semibold text-gray-900 mb-3">
          Needs attention
        </h2>
        {loading ? (
          <SkeletonCard />
        ) : attentionCases.length === 0 ? (
          <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-4 flex items-center gap-3">
            <CheckCircle className="size-4 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Nothing needs your attention</p>
              <p className="text-xs text-green-600 mt-0.5">Callwaka is handling everything on track.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {attentionCases.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate({ page: "case-detail", params: { id: c.id } })}
                className="w-full text-left bg-red-50 border border-red-100 rounded-xl px-5 py-4 hover:border-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label={`View case: ${c.title}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="size-2 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.title}</p>
                    </div>
                    <p className="text-xs text-red-600 mb-1">
                      {c.current_commitment?.status === "overdue"
                        ? "Promise overdue"
                        : "Promise broken"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {c.counterparty.name}
                      {c.reference_number && ` · Ticket #${c.reference_number}`}
                    </p>
                    {c.next_action && (
                      <p className="text-xs text-gray-600 mt-1.5">
                        Callwaka is{" "}
                        {c.next_action.type === "escalate"
                          ? "preparing an escalation call."
                          : `scheduling a ${c.next_action.type}.`}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="size-4 text-red-400 mt-0.5 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Active cases */}
      <section aria-labelledby="cases-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="cases-heading" className="text-sm font-semibold text-gray-900">
            Active cases
          </h2>
          <button
            onClick={() => navigate({ page: "cases" })}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium focus:outline-none"
          >
            View all →
          </button>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <SkeletonList count={3} />
          </div>
        ) : activeCases.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400">No active cases. Create one to get started.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            {activeCases.map((c, i) => (
              <button
                key={c.id}
                onClick={() => navigate({ page: "case-detail", params: { id: c.id } })}
                className={`w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                  i !== 0 ? "border-t border-gray-100" : ""
                }`}
                aria-label={`View case: ${c.title}`}
              >
                <span
                  className={`size-2 rounded-full shrink-0 ${
                    c.status === "tracking" ? "bg-blue-500" : "bg-amber-500"
                  }`}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.counterparty.name}
                    {c.current_commitment &&
                      ` · ${c.current_commitment.description}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={c.status} size="sm" />
                  {c.next_action && (
                    <p className="text-xs text-gray-400 mt-1">
                      Next: {c.next_action.description.slice(0, 24)}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section aria-labelledby="activity-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="activity-heading" className="text-sm font-semibold text-gray-900">
            Recent activity
          </h2>
          <button
            onClick={() => navigate({ page: "activity" })}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium focus:outline-none"
          >
            View all →
          </button>
        </div>
        <div className="space-y-1">
          {activity.slice(0, 5).map((a) => (
            <div key={a.id} className="flex items-start gap-3 py-2.5">
              <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5 leading-relaxed">
                {formatTimestamp(a.timestamp).split(" · ")[1] ?? formatTimestamp(a.timestamp)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 font-medium leading-snug">{a.title}</p>
                <p className="text-xs text-gray-400">{a.case_title}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
