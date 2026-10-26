import { createHash } from "node:crypto";

/** Drop card, Ghana Card, and labelled PIN/OTP/CVV values. Batches and dates stay. */
export function redactPii(value: string): string {
  return value
    .replace(/\bGHA-\d{9}-\d\b/gi, "[redacted]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, (raw) => {
      const digits = raw.replace(/\D/g, "");
      return digits.length >= 13 && digits.length <= 19 ? "[redacted]" : raw;
    })
    .replace(/\b(PIN|OTP|CVV|CVC)\b[:\s#-]*\d{3,8}/gi, "$1 [redacted]");
}

export function textMark(value: string): { sha256: string; chars: number } {
  const clean = redactPii(value);
  return {
    sha256: createHash("sha256").update(clean).digest("hex").slice(0, 16),
    chars: clean.length,
  };
}

/** Untrusted model input. Markers are stripped so the text cannot close the block. */
export function asData(label: string, value: string): string {
  const safe = redactPii(value).replaceAll("<<", "").replaceAll(">>", "");
  return `<<${label}>>\n${safe}\n<</${label}>>`;
}
