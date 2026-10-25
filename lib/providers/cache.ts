import { createHash } from "node:crypto";

type Entry = {
  expires: number;
  text: string;
  usage: { prompt: number; completion: number } | null;
  answerSource: "content" | "reasoning_content" | "search";
};

const store = new Map<string, Entry>();
const MAX_ENTRIES = 32;
const TTL_MS = 30 * 60 * 1000;

export function cacheKey(parts: unknown): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function cacheGet(key: string): Entry | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return null;
  }
  store.delete(key);
  store.set(key, hit);
  return hit;
}

export function cacheSet(key: string, value: Omit<Entry, "expires">): void {
  store.set(key, { ...value, expires: Date.now() + TTL_MS });
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export function cacheClear(): void {
  store.clear();
}
