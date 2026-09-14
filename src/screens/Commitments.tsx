import { useEffect, useState } from "react";
import { Target, ChevronRight } from "lucide-react";
import type { CommitmentStatus, CommitmentWithCase, NavigateFn } from "../types";
import { CommitmentService } from "../services/api";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonList } from "../components/ui/Skeleton";
import { formatShortDate, formatTimestamp } from "../lib/utils";

type Filter = "all" | CommitmentStatus | "due_soon";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Due soon", value: "due_soon" },
  { label: "Broken", value: "broken" },
  { label: "Fulfilled", value: "fulfilled" },
];

interface Props {
  navigate: NavigateFn;
}

export default function Commitments({ navigate }: Props) {
  const [commitments, setCommitments] = useState<CommitmentWithCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    CommitmentService.getCommitments().then((c) => {
      setCommitments(c);
      setLoading(false);
    });
  }, []);

  const now = Date.now();
  const dueSoonThreshold = now + 48 * 60 * 60 * 1000;

  const filtered = commitments.filter((c) => {
    if (filter === "all") return true;
    if (filter === "due_soon") {
      const due = new Date(c.due_at).getTime();
      return c.status === "pending" && due > now && due < dueSoonThreshold;
    }
    return c.status === filter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Commitments</h1>
        <p className="text-sm text-gray-500 mt-1">Every promise Callwaka is tracking.</p>
      </div>

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
          icon={<Target className="size-8" />}
          title="No commitments yet"
          description="Once Callwaka secures a promise during a call, it will appear here."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            <table className="w-full" aria-label="Commitments list">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Commitment</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Case</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Due</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Next action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`group hover:bg-slate-50 transition-colors cursor-pointer ${i !== 0 ? "border-t border-gray-100" : ""}`}
                    onClick={() => navigate({ page: "case-detail", params: { id: c.case_id } })}
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      navigate({ page: "case-detail", params: { id: c.case_id } })
                    }
                    role="button"
                    aria-label={`View case for commitment: ${c.description}`}
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{c.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.counterparty_name}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-700">{c.case_title}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-700">{formatShortDate(c.due_at)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatTimestamp(c.due_at).split(" · ")[1]}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-gray-700">{c.next_action_description}</p>
                        <ChevronRight className="size-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate({ page: "case-detail", params: { id: c.case_id } })}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={`View case for: ${c.description}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-gray-900">{c.description}</p>
                  <StatusBadge status={c.status} size="sm" />
                </div>
                <p className="text-xs text-gray-500 mb-1">{c.counterparty_name}</p>
                <p className="text-xs text-gray-400 mb-1">
                  Due {formatShortDate(c.due_at)}
                </p>
                <p className="text-xs text-blue-600 mt-2">View case →</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
