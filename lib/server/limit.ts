const hits = new Map<string, number[]>();

function prune(now: number, windowMs: number, stamps: number[]): number[] {
  return stamps.filter((stamp) => now - stamp < windowMs);
}

/** Fixed window of one minute. Enough for a demo, tight enough for a public host. */
export function rateLimit(key: string, limit = 30): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const windowMs = 60_000;
  const stamps = prune(now, windowMs, hits.get(key) ?? []);
  if (stamps.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - stamps[0])) / 1000));
    hits.set(key, stamps);
    return { ok: false, retryAfter };
  }
  stamps.push(now);
  hits.set(key, stamps);
  return { ok: true };
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowed = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    Vary: "Origin",
  };
  if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
