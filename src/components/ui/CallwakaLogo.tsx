import { PhoneCall } from "lucide-react";

interface Props {
  size?: number;
  wordmark?: boolean;
}

/**
 * Callwaka logomark: dark rounded-square badge (same treatment the old
 * "kept" mark used) with a phone-call glyph — reuses lucide-react, which
 * the rest of the app's icon set already comes from, so it renders crisp
 * and stays visually consistent with the nav icons instead of introducing
 * a one-off hand-drawn shape.
 */
export default function CallwakaLogo({ size = 22, wordmark = true }: Props) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex items-center justify-center shrink-0 rounded-[6px] bg-gray-900"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <PhoneCall
          width={Math.round(size * 0.58)}
          height={Math.round(size * 0.58)}
          color="white"
          strokeWidth={2.25}
        />
      </span>

      {wordmark && (
        <span className="text-lg font-semibold tracking-tight text-gray-900">
          callwaka
        </span>
      )}
    </span>
  );
}
