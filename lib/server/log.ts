import { createHash } from "node:crypto";

type Level = "info" | "warn" | "error";

function emit(level: Level, fields: Record<string, unknown>): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}

export function hashIp(ip: string): string {
  const salt = process.env.LOG_SALT?.trim() || "medverify";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 16);
}

export function logRequest(fields: {
  requestId: string;
  route: string;
  status: number;
  ms: number;
  mode: "demo" | "live" | "cache" | "fallback";
  ipHash: string;
}): void {
  emit("info", fields);
}

export type LlmOutcome = "ok" | "timeout" | "429" | "5xx" | "parse_error" | "breaker_open";

export function logLlm(fields: {
  model: string;
  purpose: string;
  attempt: number;
  ms: number;
  promptTokens: number;
  completionTokens: number;
  usd: number;
  outcome: LlmOutcome;
  cacheHit: boolean;
  requestId?: string;
  inputSha256?: string;
  inputChars?: number;
}): void {
  emit(fields.outcome === "ok" ? "info" : "warn", fields);
}
