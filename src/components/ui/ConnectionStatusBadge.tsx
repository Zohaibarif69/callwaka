"use client";

import { useEffect, useState } from "react";
import { getConnectionState, subscribeConnectionState, type ConnectionState } from "../../services/connectionStatus";

export default function ConnectionStatusBadge() {
  const [state, setState] = useState<ConnectionState>("unknown");
  const [reason, setReason] = useState<string | undefined>(undefined);

  useEffect(() => {
    const initial = getConnectionState();
    setState(initial.state);
    setReason(initial.reason);
    return subscribeConnectionState((s, r) => {
      setState(s);
      setReason(r);
    });
  }, []);

  if (state === "unknown") return null;

  const isLive = state === "live";

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm ${
        isLive
          ? "bg-emerald-50/95 border-emerald-200 text-emerald-700"
          : "bg-amber-50/95 border-amber-200 text-amber-700"
      }`}
      role="status"
      aria-live="polite"
      title={!isLive && reason ? `Live connection failed: ${reason}` : undefined}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />
      {isLive ? "Live — connected to CALL-E" : "Preview data"}
    </div>
  );
}
