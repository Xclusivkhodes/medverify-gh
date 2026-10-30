import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { TokenUsage } from "../budget";
import { aiCapReachedSync, aiSpendCapUsd, lastKnownAiSpendUsd } from "./ai-spend-cap";

export type BudgetReason = "budget" | "busy";

export class BudgetStop extends Error {
  constructor(
    message: string,
    readonly reason: BudgetReason = "budget",
  ) {
    super(message);
    this.name = "BudgetStop";
  }
}

/** Rough guard, not a Nebius invoice. Priced high so the stop arrives early. */
export const USD_PER_1K = 0.002;
const FILE = join(process.cwd(), "data", "spend.json");

type SpendFile = { spentUsd: number; updatedAt: string };

function numberEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name] ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

let spentUsd = loadSpent();
let inflight = 0;
let writeChain: Promise<void> = Promise.resolve();

function loadSpent(): number {
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as SpendFile;
    return typeof parsed.spentUsd === "number" && parsed.spentUsd > 0 ? parsed.spentUsd : 0;
  } catch {
    return 0;
  }
}

function scheduleWrite(): void {
  const snapshot = spentUsd;
  writeChain = writeChain.then(() => persist(snapshot)).catch(() => undefined);
}

async function persist(amount: number): Promise<void> {
  const dir = join(process.cwd(), "data");
  await mkdir(dir, { recursive: true });
  const tmp = join(dir, `spend.${process.pid}.${Date.now()}.tmp`);
  const body: SpendFile = { spentUsd: amount, updatedAt: new Date().toISOString() };
  await writeFile(tmp, JSON.stringify(body));
  await rename(tmp, FILE);
}

export function flushSpend(): Promise<void> {
  return writeChain;
}

/**
 * The cap is AI_SPEND_CAP_USD (see ai-spend-cap.ts), which also does the exact per-call stop.
 * This view keeps the soft line (Nano only) and stops new checks at the hard line.
 */
export function budgetPublic() {
  const cap = aiSpendCapUsd();
  const softRatio = Math.min(0.95, numberEnv("BUDGET_SOFT_RATIO", 0.7));
  const hardRatio = Math.min(1, Math.max(softRatio, numberEnv("BUDGET_HARD_RATIO", 1)));
  const spent = Math.max(spentUsd, lastKnownAiSpendUsd());
  return {
    spentUsd: Math.round(spent * 10000) / 10000,
    capUsd: cap,
    softUsd: Math.round(cap * softRatio * 100) / 100,
    hardUsd: Math.round(cap * hardRatio * 100) / 100,
    softReached: spent >= cap * softRatio,
    hardReached: spent >= cap * hardRatio || aiCapReachedSync(),
    inflight,
    estimate: "Not an invoice. Tokens are priced high on purpose so the stop arrives early.",
  };
}

/**
 * One slot per live check, not per model stage. Callers wait up to waitMs, then fail.
 * The hard budget refuses immediately.
 */
export async function acquireRequestSlot(waitMs = 2000): Promise<() => void> {
  if (budgetPublic().hardReached) {
    throw new BudgetStop("The hard spend limit was reached. Live calls are stopped.", "budget");
  }
  const maxInflight = numberEnv("LIVE_CONCURRENCY", 2);
  const deadline = Date.now() + waitMs;
  while (inflight >= maxInflight) {
    if (Date.now() >= deadline) {
      throw new BudgetStop("Too many live checks are running. Try again in a moment.", "busy");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  inflight += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    inflight = Math.max(0, inflight - 1);
  };
}

export function recordUsage(usage: TokenUsage | null): void {
  if (!usage) return;
  const tokens = Math.max(0, usage.prompt + usage.completion);
  spentUsd += (tokens / 1000) * USD_PER_1K;
  scheduleWrite();
}

export function resetSpendForTests(usd = 0): void {
  spentUsd = usd;
  inflight = 0;
  writeChain = Promise.resolve();
}

export function spendFilePath(): string {
  return FILE;
}

export async function spendDirWritable(): Promise<boolean> {
  try {
    const dir = join(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    const probe = join(dir, `.ready-${process.pid}.tmp`);
    await writeFile(probe, "ok");
    await unlink(probe);
    return true;
  } catch {
    return false;
  }
}
