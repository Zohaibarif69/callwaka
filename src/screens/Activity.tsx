import { useEffect, useState } from "react";
import {
  Activity as ActivityIcon,
  Phone,
  CheckCircle,
  AlertTriangle,
  Plus,
  Zap,
  CheckSquare,
} from "lucide-react";
import type { ActivityEvent, NavigateFn, TimelineEventType } from "../types";
import { ActivityService } from "../services/api";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonList } from "../components/ui/Skeleton";
import { formatTimestamp } from "../lib/utils";

interface EventMeta {
  icon: React.ReactNode;
  color: string;
}

function getEventMeta(type: TimelineEventType): EventMeta {
  switch (type) {
    case "case_created":
      return { icon: <Plus className="size-3.5" />, color: "text-gray-500 bg-gray-100" };
    case "call_completed":
      return { icon: <Phone className="size-3.5" />, color: "text-blue-600 bg-blue-50" };
    case "call_failed":
      return { icon: <Phone className="size-3.5" />, color: "text-red-500 bg-red-50" };
    case "commitment_created":
    case "commitment_updated":
      return { icon: <CheckSquare className="size-3.5" />, color: "text-blue-600 bg-blue-50" };
    case "commitment_fulfilled":
      return { icon: <CheckCircle className="size-3.5" />, color: "text-green-600 bg-green-50" };
    case "commitment_broken":
      return { icon: <AlertTriangle className="size-3.5" />, color: "text-red-500 bg-red-50" };
    case "escalation_started":
    case "escalation_completed":
      return { icon: <Zap className="size-3.5" />, color: "text-amber-600 bg-amber-50" };
    case "case_resolved":
      return { icon: <CheckCircle className="size-3.5" />, color: "text-green-600 bg-green-50" };
    default:
      return { icon: <ActivityIcon className="size-3.5" />, color: "text-gray-500 bg-gray-100" };
  }
}

function groupByDate(events: ActivityEvent[]): Array<{ label: string; events: ActivityEvent[] }> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;

  const groups: Map<string, ActivityEvent[]> = new Map();

  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  for (const evt of sorted) {
    const d = new Date(evt.timestamp);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    let label: string;
    if (day === today) label = "Today";
    else if (day === yesterday) label = "Yesterday";
    else
      label = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(evt);
  }

  return Array.from(groups.entries()).map(([label, events]) => ({ label, events }));
}

interface Props {
  navigate: NavigateFn;
}

export default function Activity({ navigate }: Props) {
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ActivityService.getActivity().then((a) => {
      setActivity(a);
      setLoading(false);
    });
  }, []);

  const groups = groupByDate(activity);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Activity</h1>
        <p className="text-sm text-gray-500 mt-1">
          Every action Kept has taken, in order.
        </p>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <SkeletonList count={5} />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<ActivityIcon className="size-8" />}
          title="No activity yet"
          description="Activity from cases, calls, and commitments will appear here."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label} aria-labelledby={`group-${group.label}`}>
              <h2
                id={`group-${group.label}`}
                className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3"
              >
                {group.label}
              </h2>
              <div className="bg-white border border-gray-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
                {group.events.map((evt, i) => {
                  const meta = getEventMeta(evt.type);
                  return (
                    <div
                      key={evt.id}
                      className={`flex items-start gap-4 px-5 py-4 ${i !== 0 ? "border-t border-gray-100" : ""}`}
                    >
                      <div
                        className={`size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${meta.color}`}
                        aria-hidden="true"
                      >
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{evt.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{evt.description}</p>
                          </div>
                          <time
                            className="text-xs text-gray-400 shrink-0 mt-0.5"
                            dateTime={evt.timestamp}
                          >
                            {formatTimestamp(evt.timestamp).split(" · ")[1] ??
                              formatTimestamp(evt.timestamp)}
                          </time>
                        </div>
                        <button
                          onClick={() =>
                            navigate({ page: "case-detail", params: { id: evt.case_id } })
                          }
                          className="text-xs text-blue-600 hover:text-blue-700 mt-1 font-medium focus:outline-none"
                        >
                          {evt.case_title} →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
