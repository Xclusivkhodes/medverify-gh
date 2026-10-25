import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TokenUsage } from "../budget";

export class BudgetStop extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetStop";
  }
}

/**
 * Rough guard, not a Nebius invoice. $0.002 per 1,000 tokens is a deliberate overestimate
 * so the hard stop arrives before a small credit balance is gone.
 */
const USD_PER_1K = 0.002;
const FILE = join(process.cwd(), "data", "spend.json");

type SpendFile = { spentUsd: number; updatedAt: string };

function numberEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name] ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

let spentUsd = loadSpent();
let inflight = 0;

function loadSpent(): number {
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as SpendFile;
    return typeof parsed.spentUsd === "number" && parsed.spentUsd > 0 ? parsed.spentUsd : 0;
  } catch {
    return 0;
  }
}

export function budgetPublic() {
  const cap = numberEnv("BUDGET_USD", 1);
  const softRatio = Math.min(0.95, numberEnv("BUDGET_SOFT_RATIO", 0.7));
  const hardRatio = Math.min(0.99, Math.max(softRatio, numberEnv("BUDGET_HARD_RATIO", 0.9)));
  return {
    spentUsd: Math.round(spentUsd * 10000) / 10000,
    capUsd: cap,
    softUsd: Math.round(cap * softRatio * 100) / 100,
    hardUsd: Math.round(cap * hardRatio * 100) / 100,
    softReached: spentUsd >= cap * softRatio,
    hardReached: spentUsd >= cap * hardRatio,
    inflight,
    estimate: "Not an invoice. Tokens are priced high on purpose so the stop arrives early.",
  };
}

export function assertBudgetAllowsLive(): void {
  const budget = budgetPublic();
  if (budget.hardReached) {
    throw new BudgetStop("The hard spend limit was reached. Live calls are stopped.");
  }
  const maxInflight = numberEnv("LIVE_CONCURRENCY", 2);
  if (inflight >= maxInflight) {
    throw new BudgetStop("Too many live checks are running. Try again in a moment.");
  }
}

export function acquireInflight(): void {
  assertBudgetAllowsLive();
  inflight += 1;
}

export function releaseInflight(): void {
  inflight = Math.max(0, inflight - 1);
}

export function recordUsage(usage: TokenUsage | null): void {
  if (!usage) return;
  const tokens = Math.max(0, usage.prompt + usage.completion);
  spentUsd += (tokens / 1000) * USD_PER_1K;
  try {
    mkdirSync(join(process.cwd(), "data"), { recursive: true });
    const body: SpendFile = { spentUsd, updatedAt: new Date().toISOString() };
    writeFileSync(FILE, JSON.stringify(body));
  } catch {
    /* A read-only disk keeps the counter in memory for this process. */
  }
}

