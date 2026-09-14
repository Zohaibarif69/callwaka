import { useEffect, useState } from "react";
import { PhoneCall } from "lucide-react";
import type { CallStatus } from "../types";

interface LiveCallInfo {
  /** Current status straight from CALL-E, e.g. "ringing", "in_conversation". */
  status: CallStatus;
  /** ISO timestamp the call was created — used to compute a real elapsed timer. */
  startedAt: string;
  /** What kind of call this is, so the header/footer copy matches reality. */
  purpose?: "initial" | "verification" | "escalation";
}

interface Props {
  open: boolean;
  counterparty: string;
  caseRef: string;
  isEscalation?: boolean;
  onDone: () => void;
  durationMs?: number;
  /**
   * When provided, the modal renders a real live call driven by actual
   * CALL-E status (polled by the parent) instead of the scripted demo
   * timeline. No "DEMO MODE" badge, no auto-advancing script — the parent
   * is responsible for closing the modal once the call reaches a terminal
   * status.
   */
  live?: LiveCallInfo;
  /**
   * Safety net for live calls: if the elapsed time (measured from
   * live.startedAt) ever exceeds this, the modal force-closes itself and
   * calls onDone, even though the parent hasn't seen a terminal status yet.
   * This covers the case where CALL-E's webhook never reaches the app
   * (e.g. APP_BASE_URL misconfigured, or the cron safety net hasn't run
   * yet) — real phone calls basically never run this long, so it's safe to
   * assume something has gone wrong and stop showing "calling…" forever.
   * Defaults to 10 minutes.
   */
  maxLiveMs?: number;
}

const INITIAL_EVENTS = ["Connected", "Ticket number identified", "Checking appointment availability…"];
const ESCALATION_EVENTS = ["Connected", "Referenced ticket #88213", "Explained missed appointment", "Securing new appointment…"];

// Order mirrors the real lifecycle of a CALL-E call. Terminal statuses
// (completed, failed, no_answer, busy, voicemail) aren't listed here — the
// parent closes the modal as soon as one of those is reached.
const LIVE_STATUS_STEPS: { status: CallStatus; label: string }[] = [
  { status: "preparing", label: "Preparing call" },
  { status: "calling", label: "Dialing" },
  { status: "ringing", label: "Ringing" },
  { status: "connected", label: "Connected" },
  { status: "in_conversation", label: "In conversation" },
  { status: "processing", label: "Wrapping up" },
];

export default function ActiveCallModal({
  open,
  counterparty,
  caseRef,
  isEscalation = false,
  onDone,
  durationMs = 5000,
  live,
  maxLiveMs = 10 * 60 * 1000,
}: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [visibleEvents, setVisibleEvents] = useState(1);

  const events = live
    ? LIVE_STATUS_STEPS.map((s) => s.label)
    : isEscalation
    ? ESCALATION_EVENTS
    : INITIAL_EVENTS;

  // Scripted demo progression.
  useEffect(() => {
    if (live) return; // live calls are driven by the effect below instead
    if (!open) {
      setElapsed(0);
      setVisibleEvents(1);
      return;
    }

    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    const eventTimers = events.map((_, i) =>
      setTimeout(() => setVisibleEvents(i + 2), ((i + 1) * durationMs) / (events.length + 1))
    );
    const done = setTimeout(onDone, durationMs);

    return () => {
      clearInterval(interval);
      eventTimers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [open, live]);

  // Real live call: tick a real elapsed timer off the actual start time, and
  // derive progress from the actual status rather than a fixed schedule.
  useEffect(() => {
    if (!live || !open) return;

    const startedAtMs = new Date(live.startedAt).getTime();
    const tick = () => {
      const elapsedMs = Date.now() - startedAtMs;
      setElapsed(Math.max(0, Math.floor(elapsedMs / 1000)));
      // Backend never reported a terminal status (missed/misconfigured
      // webhook, cron hasn't caught up yet) — stop trusting it and close.
      if (elapsedMs > maxLiveMs) onDone();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [live, open, maxLiveMs, onDone]);

  useEffect(() => {
    if (!live) return;
    const idx = LIVE_STATUS_STEPS.findIndex((s) => s.status === live.status);
    // If the status isn't one of the in-progress steps (e.g. it's already
    // terminal), show every step as complete — the parent will close the
    // modal momentarily.
    setVisibleEvents(idx === -1 ? LIVE_STATUS_STEPS.length : idx + 1);
  }, [live?.status]);

  if (!open) return null;

  const purpose = live?.purpose ?? (isEscalation ? "escalation" : "initial");
  const headerLabel =
    purpose === "escalation" ? "Escalation call" : purpose === "verification" ? "Verification call" : "Calling";
  const footerText =
    purpose === "escalation"
      ? "Callwaka is escalating because the previous commitment was broken."
      : purpose === "verification"
      ? "Callwaka is checking whether the commitment was fulfilled."
      : "Callwaka is securing a specific, trackable commitment.";

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-sm p-8 flex flex-col items-center text-center">
        {/* Preview badge — only for the scripted walkthrough, never for a real call */}
        {!live && (
          <span className="absolute top-4 right-4 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
            PREVIEW
          </span>
        )}

        {/* Icon */}
        <div className="relative mb-5">
          <div className="size-16 bg-blue-50 rounded-full flex items-center justify-center">
            <PhoneCall className="size-7 text-blue-600" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 size-4 bg-green-500 rounded-full border-2 border-white animate-pulse" aria-hidden="true" />
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
          {headerLabel}
        </p>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{counterparty}</h2>
        <p className="text-xs text-gray-400 mb-4">{caseRef}</p>

        <p className="text-3xl font-mono font-light text-gray-900 mb-6 tabular-nums">
          {timeStr}
        </p>

        {/* Event feed */}
        <div className="w-full text-left bg-slate-50 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Call activity
          </p>
          {events.map((event, i) => {
            const visible = i < visibleEvents;
            const isLast = i === visibleEvents - 1;
            if (!visible) return null;
            return (
              <div key={event} className="flex items-center gap-2.5 text-sm">
                {isLast ? (
                  <span className="size-1.5 rounded-full bg-blue-500 shrink-0 animate-pulse" aria-hidden="true" />
                ) : (
                  <span className="size-1.5 rounded-full bg-green-500 shrink-0" aria-hidden="true" />
                )}
                <span className={isLast ? "text-gray-700" : "text-gray-500"}>
                  {event}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-gray-400">{footerText}</p>
      </div>
    </div>
  );
}
