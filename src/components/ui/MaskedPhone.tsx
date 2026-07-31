import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { maskPhone } from "../../lib/utils";

interface Props {
  phone: string;
  className?: string;
}

/**
 * Shows a phone number masked (e.g. "+1 ••• ••• 0199") by default, with a
 * small toggle to reveal the real number when you actually need it — e.g.
 * to dial it yourself, or double-check it's the right contact. Masked by
 * default so a screen-share, screenshot, or someone glancing at your screen
 * doesn't leak a full phone number for no reason.
 */
export default function MaskedPhone({ phone, className = "" }: Props) {
  const [revealed, setRevealed] = useState(false);

  if (!phone) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="tabular-nums">{revealed ? phone : maskPhone(phone)}</span>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        aria-label={revealed ? "Hide phone number" : "Show phone number"}
        title={revealed ? "Hide phone number" : "Show phone number"}
      >
        {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </span>
  );
}
