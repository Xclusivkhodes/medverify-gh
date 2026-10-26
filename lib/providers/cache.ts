import { createHash } from "node:crypto";

type Entry = {
  expires: number;
  text: string;
  usage: { prompt: number; completion: number } | null;
  answerSource: "content" | "reasoning_content" | "search";
};

/** Bump when stage inputs change shape, so old entries cannot be served as new ones. */
export const PIPELINE_VERSION = "2026-10-26";

export type CacheStage = "vision" | "normalize" | "verdict" | "tavily";

/** Tavily and verdict wording live for a day. Vision and normalise stay short. */
export const STAGE_TTL_MS: Record<CacheStage, number> = {
  vision: 30 * 60 * 1000,
  normalize: 30 * 60 * 1000,
  verdict: 24 * 60 * 60 * 1000,
  tavily: 24 * 60 * 60 * 1000,
};

const store = new Map<string, Entry>();
const MAX_ENTRIES = 128;
const TTL_MS = STAGE_TTL_MS.vision;

export function cacheKey(parts: unknown): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

/** sha256(app + pipeline version + stage + normalised input). */
export function stageCacheKey(stage: CacheStage, identity: unknown): string {
  return cacheKey({ app: "medverify-gh", pipeline: PIPELINE_VERSION, stage, identity });
}

export function cacheGet(key: string): Entry | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expires <= Date.now()) {
    store.delete(key);
    return null;
  }
  store.delete(key);
  store.set(key, hit);
  return hit;
}

export function cacheSet(key: string, value: Omit<Entry, "expires">, ttlMs = TTL_MS): void {
  store.set(key, { ...value, expires: Date.now() + ttlMs });
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

export function cacheClear(): void {
  store.clear();
}
