import { useEffect, useState } from "react";
import { Plus, Search, Briefcase } from "lucide-react";
import type { Case, CaseStatus, NavigateFn } from "../types";
import { CaseService } from "../services/api";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonList } from "../components/ui/Skeleton";
import NewCaseModal from "../components/cases/NewCaseModal";
import { formatTimestamp, formatShortDate } from "../lib/utils";

type Filter = "all" | CaseStatus;

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "tracking" },
  { label: "Needs attention", value: "attention" },
  { label: "Waiting", value: "waiting" },
  { label: "Resolved", value: "resolved" },
  { label: "Cancelled", value: "cancelled" },
];

interface Props {
  navigate: NavigateFn;
  demoCase: Case | null;
  onCaseCreated: (c: Case) => void;
}

export default function Cases({ navigate, demoCase, onCaseCreated }: Props) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    CaseService.getCases().then((c) => {
      setCases(c);
      setLoading(false);
    });
  }, []);

  const allCases = demoCase
    ? [demoCase, ...cases.filter((c) => c.id !== demoCase.id)]
    : cases;

  const filtered = allCases.filter((c) => {
    const matchFilter = filter === "all" || c.status === filter;
    const q = query.toLowerCase();
    const matchSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.counterparty.name.toLowerCase().includes(q) ||
      c.reference_number.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const handleCreated = (c: Case) => {
    setCases((prev) => [c, ...prev]);
    setShowModal(false);
    onCaseCreated(c);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cases</h1>
          <p className="text-sm text-gray-500 mt-1">Track every problem Kept is working on.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 h-10 px-4 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Plus className="size-4" />
          New case
        </button>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col gap-3">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] w-max sm:w-auto">
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
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases…"
            aria-label="Search cases"
            className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          />
        </div>
      </div>

      {/* Cases */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <SkeletonList count={4} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="size-8" />}
          title="No cases yet"
          description="Give Kept a problem to handle and it will track the follow-through for you."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 h-10 px-4 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="size-4" />
              Create your first case
            </button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            <table className="w-full" aria-label="Cases list">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Case</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3 hidden lg:table-cell">Commitment</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3 hidden lg:table-cell">Next action</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`group hover:bg-slate-50 transition-colors cursor-pointer ${i !== 0 ? "border-t border-gray-100" : ""}`}
                    onClick={() => navigate({ page: "case-detail", params: { id: c.id } })}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && navigate({ page: "case-detail", params: { id: c.id } })}
                    aria-label={`Open case: ${c.title}`}
                    role="button"
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                        {c.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.counterparty.name}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <p className="text-sm text-gray-700">
                        {c.current_commitment?.description ?? "—"}
                      </p>
                      {c.current_commitment?.due_at && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatShortDate(c.current_commitment.due_at)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <p className="text-sm text-gray-700">
                        {c.next_action?.description ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-gray-400">
                        {formatTimestamp(c.updated_at)}
                      </p>
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
                onClick={() => navigate({ page: "case-detail", params: { id: c.id } })}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={`View case: ${c.title}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                  <StatusBadge status={c.status} size="sm" />
                </div>
                <p className="text-xs text-gray-500 mb-2">{c.counterparty.name}</p>
                {c.current_commitment && (
                  <p className="text-xs text-gray-600">
                    Due: {c.current_commitment.description}
                  </p>
                )}
                <p className="text-xs text-blue-600 mt-2">View case →</p>
              </button>
            ))}
          </div>
        </>
      )}

      <NewCaseModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
