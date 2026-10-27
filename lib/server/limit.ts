const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_KEYS = 4096;

function prune(now: number, stamps: number[]): number[] {
  return stamps.filter((stamp) => now - stamp < WINDOW_MS);
}

function sweep(now: number): void {
  for (const [key, stamps] of hits) {
    const fresh = prune(now, stamps);
    if (fresh.length === 0) hits.delete(key);
    else hits.set(key, fresh);
  }
  while (hits.size > MAX_KEYS) {
    const oldest = hits.keys().next().value;
    if (oldest === undefined) break;
    hits.delete(oldest);
  }
}

/** Fixed window of one minute. Stale keys are dropped so the map cannot grow without bound. */
export function rateLimit(key: string, limit = 30): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  if (hits.size > 1024) sweep(now);
  const stamps = prune(now, hits.get(key) ?? []);
  if (stamps.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - (now - stamps[0])) / 1000));
    hits.set(key, stamps);
    return { ok: false, retryAfter };
  }
  stamps.push(now);
  hits.set(key, stamps);
  if (hits.size > MAX_KEYS) sweep(now);
  return { ok: true };
}

export function resetRateLimits(): void {
  hits.clear();
}

function plausibleIp(value: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return value.split(".").every((part) => Number(part) <= 255);
  }
  return value.includes(":") && /^[0-9a-f:]+$/i.test(value);
}

/**
 * Client address for the rate-limit bucket.
 * X-Forwarded-For is used only when TRUST_PROXY=1, and only the right-most hop
 * (the address a trusted proxy appended). Otherwise every direct caller shares one bucket.
 */
export function clientKey(request: Request): string {
  if (process.env.TRUST_PROXY !== "1") return "direct";
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    for (let i = hops.length - 1; i >= 0; i -= 1) {
      if (plausibleIp(hops[i])) return hops[i];
    }
  }
  const real = request.headers.get("x-real-ip")?.trim() ?? "";
  if (plausibleIp(real)) return real;
  return "unknown";
}

export function paidCallLimit(): number {
  const raw = Number(process.env.PAID_CALLS_PER_MINUTE ?? "20");
  return Number.isFinite(raw) && raw > 0 ? raw : 20;
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowed = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, x-request-id, x-admin-secret",
    "Access-Control-Expose-Headers": "x-request-id",
    Vary: "Origin",
  };
  if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
