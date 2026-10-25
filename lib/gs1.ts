import type { Gs1Report, RedFlag } from "./modes/medicine/types";
import { normBatch, parseExpiry } from "./text";

const FIXED: Record<string, number> = { "01": 14, "17": 6 };

/** GS1 GTIN check digit. Accepts GTIN-8, GTIN-12, GTIN-13, and GTIN-14. */
export function gtinIsValid(gtin: string): boolean {
  const digits = gtin.replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return false;
  const nums = digits.split("").map(Number);
  const check = nums.pop();
  if (check === undefined) return false;
  let sum = 0;
  nums.reverse().forEach((digit, index) => {
    sum += digit * (index % 2 === 0 ? 3 : 1);
  });
  return (10 - (sum % 10)) % 10 === check;
}

function yyMmDd(value: string): string {
  if (!/^\d{6}$/.test(value)) return "";
  const year = 2000 + Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  if (month < 1 || month > 12) return "";
  if (day === 0) {
    const end = new Date(Date.UTC(year, month, 0));
    return end.toISOString().slice(0, 10);
  }
  const end = new Date(Date.UTC(year, month, 0));
  if (day > end.getUTCDate()) return "";
  return `${year.toString().padStart(4, "0")}-${value.slice(2, 4)}-${value.slice(4, 6)}`;
}

function parseParenthesised(raw: string): Record<string, string> | null {
  if (!raw.includes("(01)") && !raw.includes("(17)") && !raw.includes("(10)") && !raw.includes("(21)")) return null;
  const marks: { ai: string; end: number; start: number }[] = [];
  const pattern = /\((\d{2,4})\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw))) {
    marks.push({ ai: match[1], start: match.index, end: pattern.lastIndex });
  }
  const found: Record<string, string> = {};
  marks.forEach((mark, index) => {
    const next = marks[index + 1]?.start ?? raw.length;
    found[mark.ai] = raw.slice(mark.end, next).trim();
  });
  return found;
}

function parseElement(raw: string): Record<string, string> | null {
  const rest = raw.replace(/^\][A-Za-z]\d/, "").replace(/\{GS\}|<GS>/gi, "\u001d").trim();
  if (!rest.startsWith("01") && !rest.startsWith("17")) return null;
  const found: Record<string, string> = {};
  let index = 0;
  while (index < rest.length) {
    const ai = rest.slice(index, index + 2);
    if (FIXED[ai]) {
      const value = rest.slice(index + 2, index + 2 + FIXED[ai]);
      if (value.length < FIXED[ai]) break;
      found[ai] = value;
      index += 2 + FIXED[ai];
      continue;
    }
    if (ai === "10" || ai === "21") {
      const chunk = rest.slice(index + 2);
      const stop = chunk.indexOf("\u001d");
      const value = (stop === -1 ? chunk : chunk.slice(0, stop)).trim();
      found[ai] = value;
      index = stop === -1 ? rest.length : index + 2 + stop + 1;
      continue;
    }
    break;
  }
  return Object.keys(found).length ? found : null;
}

function agreeBatch(printed: string, coded: string): Gs1Report["batchMatch"] {
  if (!printed.trim() || !coded.trim()) return "missing";
  return normBatch(printed) === normBatch(coded) ? "match" : "mismatch";
}

function agreeExpiry(printed: string, iso: string): Gs1Report["expiryMatch"] {
  if (!printed.trim() || !iso) return "missing";
  const left = parseExpiry(printed);
  const right = parseExpiry(iso);
  if (left.kind === "invalid" || right.kind === "invalid") return "mismatch";
  if (left.iso.slice(0, 7) === right.iso.slice(0, 7)) return "match";
  return "mismatch";
}

/**
 * Parse a GS1 DataMatrix or barcode payload and compare AI(10) / AI(17) with the printed label.
 * A mismatch is a red flag. This does not contact a server.
 */
export function crossCheckGs1(raw: string, printed: { batch: string; expiry: string }): Gs1Report | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const ais = parseParenthesised(trimmed) ?? parseElement(trimmed);
  if (!ais) return null;
  const gtin = (ais["01"] ?? "").replace(/\D/g, "");
  const batch = ais["10"] ?? "";
  const serial = ais["21"] ?? "";
  const expiry = yyMmDd(ais["17"] ?? "");
  const gtinValid = gtin ? gtinIsValid(gtin) : false;
  const batchMatch = agreeBatch(printed.batch, batch);
  const expiryMatch = agreeExpiry(printed.expiry, expiry);
  const flags: RedFlag[] = [];
  if (gtin && !gtinValid) {
    flags.push({
      code: "gs1_bad_gtin",
      severity: "high",
      detail: "The barcode GTIN check digit does not validate.",
    });
  }
  if (batchMatch === "mismatch" || expiryMatch === "mismatch") {
    flags.push({
      code: "gs1_mismatch",
      severity: "high",
      detail: `The barcode does not match the printed label. Barcode batch ${batch || "missing"}, printed ${printed.batch || "missing"}. Barcode expiry ${expiry || "missing"}, printed ${printed.expiry || "missing"}.`,
    });
  }
  const summary =
    !gtinValid && gtin
      ? "The GTIN check digit on this barcode does not validate."
      : batchMatch === "mismatch" || expiryMatch === "mismatch"
        ? "The barcode does not match the printed batch or expiry."
        : batchMatch === "match" && expiryMatch === "match"
          ? "The barcode matches the printed batch and expiry."
          : "A barcode was read. The printed batch or expiry was missing, so it could not be fully cross-checked.";
  return { raw: trimmed, gtin, gtinValid, expiry, batch, serial, batchMatch, expiryMatch, flags, summary };
}
