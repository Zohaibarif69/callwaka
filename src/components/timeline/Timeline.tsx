import {
  Plus,
  Phone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Shield,
  CheckSquare,
  Clock,
  Ban,
} from "lucide-react";
import type { TimelineEvent, TimelineEventType } from "../../types";
import { formatTimestamp } from "../../lib/utils";

interface EventConfig {
  icon: React.ReactNode;
  dotColor: string;
  iconColor: string;
}

function getConfig(type: TimelineEventType): EventConfig {
  switch (type) {
    case "case_created":
      return { icon: <Plus className="size-3" />, dotColor: "bg-gray-400", iconColor: "text-white" };
    case "call_started":
    case "call_connected":
      return { icon: <Phone className="size-3" />, dotColor: "bg-blue-500", iconColor: "text-white" };
    case "call_completed":
      return { icon: <Phone className="size-3" />, dotColor: "bg-blue-600", iconColor: "text-white" };
    case "call_failed":
      return { icon: <XCircle className="size-3" />, dotColor: "bg-red-500", iconColor: "text-white" };
    case "commitment_created":
    case "commitment_updated":
      return { icon: <CheckSquare className="size-3" />, dotColor: "bg-blue-500", iconColor: "text-white" };
    case "commitment_fulfilled":
      return { icon: <CheckCircle className="size-3" />, dotColor: "bg-green-600", iconColor: "text-white" };
    case "commitment_broken":
      return { icon: <AlertTriangle className="size-3" />, dotColor: "bg-red-500", iconColor: "text-white" };
    case "verification_started":
    case "verification_completed":
      return { icon: <Shield className="size-3" />, dotColor: "bg-amber-500", iconColor: "text-white" };
    case "escalation_started":
    case "escalation_completed":
      return { icon: <Zap className="size-3" />, dotColor: "bg-red-500", iconColor: "text-white" };
    case "case_resolved":
      return { icon: <CheckCircle className="size-3" />, dotColor: "bg-green-600", iconColor: "text-white" };
    case "case_cancelled":
      return { icon: <Ban className="size-3" />, dotColor: "bg-gray-500", iconColor: "text-white" };
    case "human_intervention_required":
      return { icon: <AlertTriangle className="size-3" />, dotColor: "bg-amber-500", iconColor: "text-white" };
    default:
      return { icon: <Clock className="size-3" />, dotColor: "bg-gray-400", iconColor: "text-white" };
  }
}

interface Props {
  events: TimelineEvent[];
  onCallClick?: (callId: string) => void;
}

export default function Timeline({ events, onCallClick }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4">No events yet.</p>
    );
  }

  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <ol className="relative" aria-label="Case timeline">
      {sorted.map((event, i) => {
        const cfg = getConfig(event.type);
        const isLast = i === sorted.length - 1;

        return (
          <li key={event.id} className="flex gap-4 pb-6 relative">
            {/* Vertical connector line */}
            {!isLast && (
              <span
                className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-100"
                aria-hidden="true"
              />
            )}

            {/* Dot */}
            <div
              className={`relative z-10 flex shrink-0 items-center justify-center size-[22px] rounded-full ${cfg.dotColor} ${cfg.iconColor} mt-0.5`}
              aria-hidden="true"
            >
              {cfg.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <time
                className="text-xs text-gray-400 leading-none block mb-1"
                dateTime={event.timestamp}
              >
                {formatTimestamp(event.timestamp)}
              </time>
              <p className="text-sm font-semibold text-gray-900 leading-snug">
                {event.title}
              </p>
              {event.description && (
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                  {event.description}
                </p>
              )}
              {event.call_id && onCallClick && (
                <button
                  onClick={() => onCallClick(event.call_id!)}
                  className="mt-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline"
                >
                  View call details →
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
