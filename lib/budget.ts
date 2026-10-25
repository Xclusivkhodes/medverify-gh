function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Output-token cap for a single Token Factory call. */
export const DEFAULT_MAX_TOKENS = 512;
/** Hard ceiling so a typo in the env cannot request a huge completion. */
export const HARD_MAX_TOKENS = 1024;
/** Prompt + completion budget for one pack check (vision, normalise, verdict). */
export const DEFAULT_REQUEST_TOKEN_BUDGET = 2048;

export function outputTokenCap(): number {
  const raw = Number(readEnv("NEBIUS_MAX_TOKENS") ?? DEFAULT_MAX_TOKENS);
  if (!Number.isFinite(raw)) return DEFAULT_MAX_TOKENS;
  return Math.min(HARD_MAX_TOKENS, Math.max(128, Math.floor(raw)));
}

export function requestTokenBudget(): number {
  const raw = Number(readEnv("NEBIUS_REQUEST_TOKEN_BUDGET") ?? DEFAULT_REQUEST_TOKEN_BUDGET);
  const cap = Number.isFinite(raw) ? Math.floor(raw) : DEFAULT_REQUEST_TOKEN_BUDGET;
  return Math.min(8192, Math.max(outputTokenCap(), cap));
}

export type TokenUsage = { prompt: number; completion: number };

/**
 * Pessimistic budget. Each call reserves the output cap up front.
 * When the API reports usage, the reservation is replaced by prompt + completion.
 * A failed call keeps the reservation so a retry loop cannot keep spending.
 */
export class TokenBudget {
  private remaining: number;

  constructor(total = requestTokenBudget()) {
    this.remaining = total;
  }

  remainingTokens(): number {
    return this.remaining;
  }

  tryReserve(outputCap: number): boolean {
    if (this.remaining < outputCap) return false;
    this.remaining -= outputCap;
    return true;
  }

  settle(reserved: number, usage: TokenUsage | null): void {
    if (!usage) return;
    this.remaining += reserved;
    this.remaining -= usage.prompt + usage.completion;
  }
}
