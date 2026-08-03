export type ConnectionState = "unknown" | "live" | "fallback";

type Listener = (state: ConnectionState, reason?: string) => void;

let state: ConnectionState = "unknown";
let reason: string | undefined;
const listeners = new Set<Listener>();

export function setConnectionState(next: ConnectionState, nextReason?: string) {
  if (state === next && reason === nextReason) return;
  state = next;
  reason = nextReason;
  listeners.forEach((l) => l(state, reason));
}

export function getConnectionState(): { state: ConnectionState; reason?: string } {
  return { state, reason };
}

export function subscribeConnectionState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
