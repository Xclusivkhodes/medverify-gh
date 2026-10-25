export function parseModelJson(text: string): unknown {
  const stripped = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("The model did not return a JSON object.");
  }
  return JSON.parse(stripped.slice(start, end + 1));
}

export function asString(value: unknown, max = 240): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function normName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normBatch(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return row[b.length];
}

export function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

export function ghanaDate(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

export type ParsedExpiry = { kind: "date"; iso: string; end: Date } | { kind: "invalid" };

function endOfMonth(year: number, month: number): Date | null {
  if (month < 1 || month > 12 || year < 1990 || year > 2100) return null;
  return new Date(Date.UTC(year, month, 0));
}

function endOfDay(year: number, month: number, day: number): Date | null {
  const end = endOfMonth(year, month);
  if (!end || day < 1 || day > end.getUTCDate()) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function expandYear(year: number): number {
  if (year < 100) return 2000 + year;
  return year;
}

/** Best-effort expiry parse. Month-only dates last through the end of that month. */
export function parseExpiry(raw: string): ParsedExpiry {
  const value = raw.trim().toLowerCase().replace(/,/g, " ");
  if (!value) return { kind: "invalid" };

  let match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const end = endOfDay(Number(match[1]), Number(match[2]), Number(match[3]));
    if (!end) return { kind: "invalid" };
    return { kind: "date", iso: end.toISOString().slice(0, 10), end };
  }

  match = value.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const end = endOfMonth(Number(match[1]), Number(match[2]));
    if (!end) return { kind: "invalid" };
    return { kind: "date", iso: end.toISOString().slice(0, 10), end };
  }

  match = value.match(/^(\d{1,2})[\/\-.](\d{4})$/);
  if (match) {
    const end = endOfMonth(Number(match[2]), Number(match[1]));
    if (!end) return { kind: "invalid" };
    return { kind: "date", iso: end.toISOString().slice(0, 10), end };
  }

  match = value.match(/^(\d{1,2})[\/\-.](\d{2})$/);
  if (match) {
    const end = endOfMonth(expandYear(Number(match[2])), Number(match[1]));
    if (!end) return { kind: "invalid" };
    return { kind: "date", iso: end.toISOString().slice(0, 10), end };
  }

  match = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (match) {
    const end = endOfDay(expandYear(Number(match[3])), Number(match[2]), Number(match[1]));
    if (!end) return { kind: "invalid" };
    return { kind: "date", iso: end.toISOString().slice(0, 10), end };
  }

  match = value.match(/^([a-z]+)\s+(\d{4})$/);
  if (match && MONTHS[match[1]]) {
    const end = endOfMonth(Number(match[2]), MONTHS[match[1]]);
    if (!end) return { kind: "invalid" };
    return { kind: "date", iso: end.toISOString().slice(0, 10), end };
  }

  match = value.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (match && MONTHS[match[2]]) {
    const end = endOfDay(Number(match[3]), MONTHS[match[2]], Number(match[1]));
    if (!end) return { kind: "invalid" };
    return { kind: "date", iso: end.toISOString().slice(0, 10), end };
  }

  return { kind: "invalid" };
}
