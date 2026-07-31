import { useEffect } from "react";
import { Check, AlertCircle, Info, X } from "lucide-react";
import type { ToastItem } from "../../types";

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const ICONS = {
  success: <Check className="size-4" />,
  error: <AlertCircle className="size-4" />,
  info: <Info className="size-4" />,
};

const STYLES = {
  success: "bg-gray-900 text-white",
  error: "bg-red-600 text-white",
  info: "bg-gray-900 text-white",
};

function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium min-w-64 max-w-sm animate-in slide-in-from-bottom-2 ${STYLES[toast.type]}`}
      role="status"
      aria-live="polite"
    >
      <span className="shrink-0 opacity-80">{ICONS[toast.type]}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
