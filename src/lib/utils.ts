export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (d.getTime() === today.getTime()) return `Today · ${time}`;
  if (d.getTime() === today.getTime() - 86400000) return `Yesterday · ${time}`;
  const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${monthDay} · ${time}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Call statuses that mean "still on the phone" — anything not in here is terminal. */
const ACTIVE_CALL_STATUSES = new Set([
  "preparing",
  "calling",
  "ringing",
  "connected",
  "in_conversation",
  "processing",
]);

export function isActiveCallStatus(status: string): boolean {
  return ACTIVE_CALL_STATUSES.has(status);
}

/**
 * Cleans up a human-typed phone number into E.164 format (e.g. "+18005550199"),
 * which is what CALL-E's API requires. Strips spaces, parens, dashes, dots —
 * whatever someone typed — and adds a "+" if it's missing. Assumes a US/Canada
 * number (adds "+1") when the person just typed 10 digits with no country code,
 * since that's the overwhelmingly common case for this app; anything already
 * starting with "+" is trusted as-is (just de-junked).
 *
 * Returns null if what's left doesn't look like a plausible phone number at all,
 * so callers can show a clear error instead of silently sending garbage to CALL-E.
 */
export function toE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (digits.length < 7) return null; // too short to be a real phone number

  if (hadPlus) {
    return `+${digits}`;
  }
  // No country code typed — assume US/Canada for a bare 10-digit number,
  // and a leading "1" already present for an 11-digit one.
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  // Anything else without a "+": still send it, but prefixed, rather than
  // silently guessing a country code that's probably wrong.
  return `+${digits}`;
}

/**
 * Masks a phone number for display: keeps the country code and last 4 digits
 * visible, blurs everything in between. "+18005550199" -> "+1 ••• ••• 0199".
 * Falls back to masking everything but the last 4 characters if the input
 * isn't a recognizable phone-number shape (e.g. already partially formatted).
 */
export function maskPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 4) return "••••";

  const last4 = digits.slice(-4);
  // Try to preserve a leading "+countrycode " look when we can tell what it is.
  const hasPlus = raw.trim().startsWith("+");
  const countryDigits = digits.length > 10 ? digits.slice(0, digits.length - 10) : "";
  const prefix = hasPlus ? `+${countryDigits || "1"} ` : "";

  return `${prefix}••• ••• ${last4}`;
}

export function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
