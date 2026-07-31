import type { CaseStatus, CommitmentStatus } from "../../types";

type Status = CaseStatus | CommitmentStatus | "escalating";

interface Config {
  label: string;
  dot: string;
  badge: string;
}

const CONFIG: Record<Status, Config> = {
  tracking: {
    label: "Tracking",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700",
  },
  waiting: {
    label: "Waiting",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700",
  },
  attention: {
    label: "Needs attention",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700",
  },
  resolved: {
    label: "Resolved",
    dot: "bg-green-600",
    badge: "bg-green-50 text-green-700",
  },
  failed: {
    label: "Failed",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-gray-400",
    badge: "bg-gray-100 text-gray-600",
  },
  pending: {
    label: "Pending",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700",
  },
  overdue: {
    label: "Overdue",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700",
  },
  fulfilled: {
    label: "Fulfilled",
    dot: "bg-green-600",
    badge: "bg-green-50 text-green-700",
  },
  broken: {
    label: "Broken",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700",
  },
  escalating: {
    label: "Escalating",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700",
  },
};

interface Props {
  status: Status;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: Props) {
  const cfg = CONFIG[status] ?? CONFIG.tracking;
  const textSize = size === "sm" ? "text-xs" : "text-xs";
  const px = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${textSize} ${px} ${cfg.badge}`}
      aria-label={cfg.label}
    >
      <span className={`size-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
