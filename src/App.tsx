"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "./components/layout/AppShell";
import ToastContainer from "./components/ui/Toast";
import ConnectionStatusBadge from "./components/ui/ConnectionStatusBadge";
import ActiveCallModal from "./components/ActiveCallModal";
import Overview from "./screens/Overview";
import Cases from "./screens/Cases";
import CaseDetail from "./screens/CaseDetail";
import Calls from "./screens/Calls";
import Commitments from "./screens/Commitments";
import Activity from "./screens/Activity";
import Settings from "./screens/Settings";
import { CallService } from "./services/api";
import { isActiveCallStatus } from "./lib/utils";
import type { Route, ToastItem, Case, Call, NavigateFn } from "./types";

// ─── Demo lifecycle ───────────────────────────────────────────────────────────

const DEMO_STAGES: Array<{
  durationMs: number;
  toast?: { message: string; type: ToastItem["type"] };
  showCall?: boolean;
  isEscalation?: boolean;
}> = [
  // 0 idle
  { durationMs: 0 },
  // 1 case created
  { durationMs: 3500, toast: { message: "Case created: ISP Technician Appointment", type: "success" } },
  // 2 calling ISP
  { durationMs: 6000, toast: { message: "Callwaka is calling ISP Support…", type: "info" }, showCall: true },
  // 3 commitment recorded
  { durationMs: 3500, toast: { message: "Commitment recorded: Saturday 2–4 PM, Ticket #88213", type: "success" } },
  // 4 waiting
  { durationMs: 3000, toast: { message: "Waiting for appointment window.", type: "info" } },
  // 5 verifying
  { durationMs: 3000, toast: { message: "Verifying appointment…", type: "info" } },
  // 6 promise broken
  { durationMs: 3000, toast: { message: "Promise broken — technician did not arrive.", type: "error" } },
  // 7 escalating
  { durationMs: 6000, toast: { message: "Escalating with ISP Support…", type: "info" }, showCall: true, isEscalation: true },
  // 8 new commitment
  { durationMs: 3500, toast: { message: "New commitment secured: Saturday 2–4 PM", type: "success" } },
  // 9 resolved
  { durationMs: 0, toast: { message: "Case resolved — technician arrived. Internet restored.", type: "success" } },
];

function buildDemoCase(stage: number): Case {
  const base: Case = {
    id: "preview_001",
    title: "ISP Technician Appointment",
    description: "My ISP promised a technician Friday between 9 AM and 1 PM. Make sure they actually show up.",
    counterparty: { name: "ISP Support", phone: "+1 (800) 555-0199" },
    reference_number: "88213",
    escalation_count: stage >= 7 ? 1 : 0,
    created_at: new Date(Date.now() - 86400000 * 0.5).toISOString(),
    updated_at: new Date().toISOString(),
    current_commitment: null,
    next_action: null,
    timeline: [],
    status: "tracking",
  };

  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000 * 0.5).toISOString();

  if (stage === 1) {
    return {
      ...base,
      status: "tracking",
      timeline: [
        { id: "d1", case_id: "preview_001", type: "case_created", timestamp: now, title: "Case created", description: "ISP Technician Appointment case opened." },
      ],
    };
  }

  if (stage === 2) {
    return {
      ...base,
      status: "tracking",
      timeline: [
        { id: "d1", case_id: "preview_001", type: "case_created", timestamp: yesterday, title: "Case created", description: "ISP Technician Appointment case opened." },
        { id: "d2", case_id: "preview_001", type: "call_started", timestamp: now, title: "Call in progress", description: "Reaching ISP Support to secure a commitment." },
      ],
    };
  }

  if (stage === 3) {
    return {
      ...base,
      status: "tracking",
      current_commitment: { id: "dc1", description: "Technician visit", due_at: new Date(Date.now() + 86400000 * 2).toISOString(), status: "pending", verification_method: "user_confirm" },
      next_action: { type: "verify", scheduled_at: new Date(Date.now() + 86400000 * 2 + 3600000 * 4).toISOString(), description: "Verify technician arrival" },
      timeline: [
        { id: "d1", case_id: "preview_001", type: "case_created", timestamp: yesterday, title: "Case created", description: "ISP Technician Appointment case opened." },
        { id: "d2", case_id: "preview_001", type: "call_completed", timestamp: now, title: "Initial call completed", description: "ISP Support confirmed appointment.", call_id: "call_001" },
        { id: "d3", case_id: "preview_001", type: "commitment_created", timestamp: now, title: "Commitment recorded", description: "Technician visit Saturday 2–4 PM. Ticket #88213." },
      ],
    };
  }

  if (stage === 4) {
    return {
      ...base,
      status: "waiting",
      current_commitment: { id: "dc1", description: "Technician visit", due_at: new Date(Date.now() + 3600000).toISOString(), status: "pending", verification_method: "user_confirm" },
      next_action: { type: "verify", scheduled_at: new Date(Date.now() + 3600000 * 2).toISOString(), description: "Verify technician arrival" },
      timeline: [
        { id: "d1", case_id: "preview_001", type: "case_created", timestamp: yesterday, title: "Case created", description: "ISP Technician Appointment case opened." },
        { id: "d2", case_id: "preview_001", type: "call_completed", timestamp: yesterday, title: "Initial call completed", description: "ISP Support confirmed appointment.", call_id: "call_001" },
        { id: "d3", case_id: "preview_001", type: "commitment_created", timestamp: yesterday, title: "Commitment recorded", description: "Technician visit Saturday 2–4 PM." },
      ],
    };
  }

  if (stage === 5) {
    return {
      ...base,
      status: "tracking",
      current_commitment: { id: "dc1", description: "Technician visit", due_at: new Date().toISOString(), status: "pending", verification_method: "user_confirm" },
      next_action: { type: "verify", scheduled_at: new Date().toISOString(), description: "Verify technician arrival" },
      timeline: [
        { id: "d1", case_id: "preview_001", type: "case_created", timestamp: yesterday, title: "Case created", description: "ISP Technician Appointment case opened." },
        { id: "d2", case_id: "preview_001", type: "call_completed", timestamp: yesterday, title: "Initial call completed", description: "ISP Support confirmed appointment.", call_id: "call_001" },
        { id: "d3", case_id: "preview_001", type: "commitment_created", timestamp: yesterday, title: "Commitment recorded", description: "Technician visit Saturday 2–4 PM." },
        { id: "d4", case_id: "preview_001", type: "verification_started", timestamp: now, title: "Verification started", description: "Callwaka is checking whether the technician arrived." },
      ],
    };
  }

  if (stage === 6) {
    return {
      ...base,
      status: "attention",
      current_commitment: { id: "dc1", description: "Technician visit", due_at: new Date(Date.now() - 3600000).toISOString(), status: "broken", verification_method: "user_confirm" },
      next_action: { type: "escalate", scheduled_at: new Date().toISOString(), description: "Escalation call to ISP Support" },
      timeline: [
        { id: "d1", case_id: "preview_001", type: "case_created", timestamp: yesterday, title: "Case created", description: "ISP Technician Appointment case opened." },
        { id: "d2", case_id: "preview_001", type: "call_completed", timestamp: yesterday, title: "Initial call completed", description: "ISP Support confirmed appointment.", call_id: "call_001" },
        { id: "d3", case_id: "preview_001", type: "commitment_created", timestamp: yesterday, title: "Commitment recorded", description: "Technician visit Saturday 2–4 PM." },
        { id: "d4", case_id: "preview_001", type: "commitment_broken", timestamp: now, title: "Promise broken", description: "Technician did not arrive during the promised window." },
      ],
    };
  }

  if (stage === 7) {
    return {
      ...base,
      status: "attention",
      escalation_count: 1,
      current_commitment: { id: "dc1", description: "Technician visit", due_at: new Date(Date.now() - 3600000).toISOString(), status: "broken", verification_method: "user_confirm" },
      next_action: { type: "escalate", scheduled_at: new Date().toISOString(), description: "Escalation call in progress" },
      timeline: [
        { id: "d1", case_id: "preview_001", type: "case_created", timestamp: yesterday, title: "Case created", description: "ISP Technician Appointment case opened." },
        { id: "d2", case_id: "preview_001", type: "call_completed", timestamp: yesterday, title: "Initial call completed", description: "ISP Support confirmed appointment.", call_id: "call_001" },
        { id: "d3", case_id: "preview_001", type: "commitment_created", timestamp: yesterday, title: "Commitment recorded", description: "Technician visit Saturday 2–4 PM." },
        { id: "d4", case_id: "preview_001", type: "commitment_broken", timestamp: yesterday, title: "Promise broken", description: "Technician did not arrive during the promised window." },
        { id: "d5", case_id: "preview_001", type: "escalation_started", timestamp: now, title: "Escalation call started", description: "Callwaka is contacting ISP Support and referencing ticket #88213 and the missed appointment." },
      ],
    };
  }

  if (stage === 8) {
    return {
      ...base,
      status: "tracking",
      escalation_count: 1,
      current_commitment: { id: "dc2", description: "Replacement technician visit", due_at: new Date(Date.now() + 86400000).toISOString(), status: "pending", verification_method: "user_confirm" },
      next_action: { type: "verify", scheduled_at: new Date(Date.now() + 86400000 + 3600000 * 4).toISOString(), description: "Verify replacement technician arrival" },
      timeline: [
        { id: "d1", case_id: "preview_001", type: "case_created", timestamp: yesterday, title: "Case created", description: "ISP Technician Appointment case opened." },
        { id: "d2", case_id: "preview_001", type: "call_completed", timestamp: yesterday, title: "Initial call completed", description: "ISP Support confirmed appointment.", call_id: "call_001" },
        { id: "d3", case_id: "preview_001", type: "commitment_created", timestamp: yesterday, title: "Commitment recorded", description: "Technician visit Saturday 2–4 PM." },
        { id: "d4", case_id: "preview_001", type: "commitment_broken", timestamp: yesterday, title: "Promise broken", description: "Technician did not arrive during the promised window." },
        { id: "d5", case_id: "preview_001", type: "escalation_started", timestamp: yesterday, title: "Escalation call started", description: "Callwaka is contacting ISP Support." },
        { id: "d6", case_id: "preview_001", type: "escalation_completed", timestamp: now, title: "Escalation resolved", description: "New appointment secured after escalation." },
        { id: "d7", case_id: "preview_001", type: "commitment_created", timestamp: now, title: "New commitment recorded", description: "Replacement technician visit Saturday 2–4 PM. Reference #88213." },
      ],
    };
  }

  if (stage === 9) {
    return {
      ...base,
      status: "resolved",
      escalation_count: 1,
      current_commitment: { id: "dc2", description: "Replacement technician visit", due_at: new Date(Date.now() - 3600000 * 2).toISOString(), status: "fulfilled", verification_method: "user_confirm" },
      next_action: null,
      timeline: [
        { id: "d1", case_id: "preview_001", type: "case_created", timestamp: yesterday, title: "Case created", description: "ISP Technician Appointment case opened." },
        { id: "d2", case_id: "preview_001", type: "call_completed", timestamp: yesterday, title: "Initial call completed", description: "ISP Support confirmed appointment.", call_id: "call_001" },
        { id: "d3", case_id: "preview_001", type: "commitment_created", timestamp: yesterday, title: "Commitment recorded", description: "Technician visit Saturday 2–4 PM." },
        { id: "d4", case_id: "preview_001", type: "commitment_broken", timestamp: yesterday, title: "Promise broken", description: "Technician did not arrive during the promised window." },
        { id: "d5", case_id: "preview_001", type: "escalation_started", timestamp: yesterday, title: "Escalation call started", description: "Callwaka contacted ISP Support." },
        { id: "d6", case_id: "preview_001", type: "escalation_completed", timestamp: yesterday, title: "Escalation resolved", description: "New appointment secured." },
        { id: "d7", case_id: "preview_001", type: "commitment_created", timestamp: yesterday, title: "New commitment recorded", description: "Replacement technician Saturday 2–4 PM." },
        { id: "d8", case_id: "preview_001", type: "commitment_fulfilled", timestamp: now, title: "Promise fulfilled", description: "Technician arrived at 2:18 PM. Internet service restored." },
        { id: "d9", case_id: "preview_001", type: "case_resolved", timestamp: now, title: "Case resolved", description: "ISP Technician Appointment — Callwaka followed through." },
      ],
    };
  }

  return base;
}

// ─── App ─────────────────────────────────────────────────────────────────────

let toastCounter = 0;
function makeToast(message: string, type: ToastItem["type"]): ToastItem {
  return { id: String(++toastCounter), message, type };
}

export default function App() {
  const [route, setRoute] = useState<Route>({ page: "overview" });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [demoStage, setDemoStage] = useState(0);
  const [demoCase, setDemoCase] = useState<Case | null>(null);
  const [showCall, setShowCall] = useState(false);
  const [isEscalationCall, setIsEscalationCall] = useState(false);
  const [liveCall, setLiveCall] = useState<Call | null>(null);

  const navigate: NavigateFn = useCallback((r) => setRoute(r), []);

  // Poll for a real CALL-E call in progress (kicked off by creating a case,
  // an escalation, or the cron verification job) so the "calling…" popup
  // shows up for actual live calls, not just the scripted demo.
  const pollLiveCall = useCallback(async () => {
    try {
      const calls = await CallService.getCalls();
      const active = calls.find((c) => isActiveCallStatus(c.status)) ?? null;
      setLiveCall(active);
    } catch {
      // Best-effort — leave whatever we last knew about alone.
    }
  }, []);

  useEffect(() => {
    if (demoMode) {
      setLiveCall(null);
      return;
    }
    pollLiveCall();
    const interval = setInterval(pollLiveCall, 3000);
    return () => clearInterval(interval);
  }, [demoMode, pollLiveCall]);

  const addToast = useCallback((message: string, type: ToastItem["type"] = "info") => {
    setToasts((t) => [...t, makeToast(message, type)]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // Demo progression
  const advanceDemo = useCallback(
    (stage: number) => {
      if (stage > 9) {
        setDemoMode(false);
        return;
      }
      const cfg = DEMO_STAGES[stage];
      const caseState = buildDemoCase(stage);
      setDemoStage(stage);
      setDemoCase(caseState);

      if (cfg.toast) {
        addToast(cfg.toast.message, cfg.toast.type);
      }

      if (cfg.showCall) {
        setIsEscalationCall(cfg.isEscalation ?? false);
        setShowCall(true);
        // Call modal will auto-close after durationMs and trigger next stage
      } else if (cfg.durationMs > 0) {
        setTimeout(() => advanceDemo(stage + 1), cfg.durationMs);
      }
    },
    [addToast]
  );

  const runDemo = useCallback(() => {
    setDemoMode(true);
    setDemoStage(0);
    setRoute({ page: "overview" });
    setTimeout(() => advanceDemo(1), 500);
  }, [advanceDemo]);

  const handleCallDone = useCallback(() => {
    setShowCall(false);
    const nextStage = demoStage + 1;
    setTimeout(() => advanceDemo(nextStage), 400);
  }, [demoStage, advanceDemo]);

  const demoBanner = demoMode ? (
    <div
      className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-3 shrink-0"
      role="status"
      aria-live="polite"
    >
      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
        Preview
      </span>
      <span className="text-xs text-amber-600">
        {demoStage === 0 && "Starting…"}
        {demoStage === 1 && "Case created — ISP Technician Appointment"}
        {demoStage === 2 && "Calling ISP Support to secure a commitment…"}
        {demoStage === 3 && "Commitment recorded — Saturday 2–4 PM"}
        {demoStage === 4 && "Waiting for appointment window…"}
        {demoStage === 5 && "Verifying whether the technician arrived…"}
        {demoStage === 6 && "Promise broken — technician did not arrive"}
        {demoStage === 7 && "Escalating with ISP Support…"}
        {demoStage === 8 && "New commitment secured — Saturday 2–4 PM"}
        {demoStage === 9 && "Case resolved — Callwaka followed through."}
      </span>
      {demoStage === 9 && (
        <button
          onClick={() => { setDemoMode(false); setDemoCase(null); setDemoStage(0); }}
          className="ml-auto text-xs font-medium text-amber-700 hover:text-amber-900 focus:outline-none"
        >
          Exit preview
        </button>
      )}
    </div>
  ) : undefined;

  const renderPage = () => {
    switch (route.page) {
      case "overview":
        return (
          <Overview
            navigate={navigate}
            demoMode={demoMode}
            demoStage={demoStage}
            demoCase={demoCase}
            onRunDemo={runDemo}
          />
        );
      case "cases":
        return (
          <Cases
            navigate={navigate}
            demoCase={demoCase}
            onCaseCreated={(c) => {
              addToast(`Case created: ${c.title}`, "success");
              // Don't wait for the next 3s tick — the initial call was just
              // kicked off server-side, so it should already exist.
              pollLiveCall();
            }}
          />
        );
      case "case-detail":
        return (
          <CaseDetail
            caseId={route.params?.id ?? ""}
            navigate={navigate}
            demoCase={demoCase}
          />
        );
      case "calls":
        return <Calls navigate={navigate} />;
      case "commitments":
        return <Commitments navigate={navigate} />;
      case "activity":
        return <Activity navigate={navigate} />;
      case "settings":
        return <Settings />;
      default:
        return <Overview navigate={navigate} demoMode={demoMode} demoStage={demoStage} demoCase={demoCase} onRunDemo={runDemo} />;
    }
  };

  return (
    <>
      <AppShell
        currentPage={route.page}
        navigate={navigate}
        demoBanner={demoBanner}
        notificationCount={demoStage === 6 ? 1 : 0}
      >
        {renderPage()}
      </AppShell>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConnectionStatusBadge />

      {showCall ? (
        <ActiveCallModal
          open={showCall}
          counterparty="ISP Support"
          caseRef="Case #88213"
          isEscalation={isEscalationCall}
          onDone={handleCallDone}
          durationMs={5500}
        />
      ) : (
        <ActiveCallModal
          open={!!liveCall}
          counterparty={liveCall?.counterparty.name ?? ""}
          caseRef={liveCall?.case_title ?? ""}
          onDone={() => setLiveCall(null)}
          live={
            liveCall
              ? { status: liveCall.status, startedAt: liveCall.timestamp, purpose: liveCall.purpose }
              : undefined
          }
        />
      )}
    </>
  );
}
