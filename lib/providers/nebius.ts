import type { ZodType } from "zod";
import OpenAI from "openai";
import { outputTokenCap, type TokenBudget, type TokenUsage, HARD_MAX_TOKENS } from "../budget";
import { env, liveCallsBlockedReason, modelSelection } from "../env";
import { breakerBeforeCall, breakerFailure, breakerSuccess } from "../server/breaker";
import { logLlm, type LlmOutcome } from "../server/log";
import { paidCallLimit, rateLimit } from "../server/limit";
import { recordUsage, USD_PER_1K } from "../server/spend";
import { estimatePromptTokens, reserveSpend, settleSpend, SpendCapError, type Reservation } from "../server/ai-spend-cap";
import { textMark } from "../server/redact";
import { parseModelJson } from "../text";
import { extractAssistantText, type AssistantMessage } from "./answer";
import { cacheDelete, cacheGet, cacheSet, stageCacheKey, type CacheStage } from "./cache";

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly provider: "nebius" | "tavily",
    readonly status: number | null,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

let liveAttempts = 0;

export function liveAttemptCount(): number {
  return liveAttempts;
}

export function resetLiveAttempts(): void {
  liveAttempts = 0;
}

let shared: { key: string; base: string; client: OpenAI } | null = null;
let fetchImpl: typeof fetch | undefined;
let retryDelayImpl: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let callTimeoutOverride: number | null = null;

export function setFetchForTests(fn: typeof fetch | null): void {
  fetchImpl = fn ?? undefined;
  shared = null;
}

export function setRetryDelayForTests(fn: ((ms: number) => Promise<void>) | null): void {
  retryDelayImpl = fn ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
}

export function setCallTimeoutForTests(ms: number | null): void {
  callTimeoutOverride = ms;
}

export function resetNebiusForTests(): void {
  shared = null;
  fetchImpl = undefined;
  callTimeoutOverride = null;
  retryDelayImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  liveAttempts = 0;
}

function scrubSecrets(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]+/g, "[key]")
    .replace(/tvly-[A-Za-z0-9_-]+/g, "[key]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [key]")
    .slice(0, 320);
}

function client(): OpenAI {
  const key = env("NEBIUS_API_KEY");
  if (!key) throw new ProviderError("NEBIUS_API_KEY is not set.", "nebius", null);
  const base = modelSelection().baseUrl;
  if (shared && shared.key === key && shared.base === base) return shared.client;
  const openai = new OpenAI({
    apiKey: key,
    baseURL: base,
    timeout: 15_000,
    maxRetries: 0,
    fetch: fetchImpl,
  });
  shared = { key, base, client: openai };
  return openai;
}

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export type NebiusJsonResult = {
  json: unknown;
  model: string;
  cached: boolean;
  maxTokens: number;
  budgetRemaining: number;
  usage: TokenUsage | null;
  answerSource: "content" | "reasoning_content";
};

function toError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const status =
    typeof error === "object" && error && "status" in error && typeof error.status === "number"
      ? error.status
      : null;
  const message = error instanceof Error ? error.message : "request failed";
  return new ProviderError(scrubSecrets(message), "nebius", status);
}

function readUsage(response: OpenAI.Chat.Completions.ChatCompletion): TokenUsage | null {
  const usage = response.usage;
  if (!usage) return null;
  return {
    prompt: usage.prompt_tokens ?? 0,
    completion: usage.completion_tokens ?? 0,
  };
}

function callTimeoutMs(model: string): number {
  if (callTimeoutOverride !== null) return callTimeoutOverride;
  const id = model.toLowerCase();
  if (id.includes("super") || id.includes("ultra") || id.includes("vl")) return 15_000;
  return 8_000;
}

function jitter(attempt: number): number {
  const cap = Math.min(2000, 250 * 2 ** attempt);
  return Math.floor(Math.random() * cap);
}

function retryAfterMs(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("headers" in error)) return null;
  const headers = (error as { headers?: { get?: (name: string) => string | null } | Record<string, string> }).headers;
  const raw = headers && typeof headers.get === "function" ? headers.get("retry-after") : null;
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(2000, seconds * 1000);
}

function isTimeout(error: unknown): boolean {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  const message = error instanceof Error ? error.message : "";
  return name === "AbortError" || name === "APIConnectionTimeoutError" || /timeout|aborted/i.test(message);
}

function isReset(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  return code === "ECONNRESET" || /ECONNRESET/.test(message);
}

function outcomeFor(error: ProviderError, raw: unknown): LlmOutcome {
  if (error.status === 429) return "429";
  if (error.status !== null && error.status >= 500) return "5xx";
  if (isTimeout(raw)) return "timeout";
  if (/could not be read|schema|JSON/.test(error.message)) return "parse_error";
  return "5xx";
}

function validateOutput(text: string, schema?: ZodType): unknown {
  let json: unknown;
  try {
    json = parseModelJson(text);
  } catch {
    throw new ProviderError("The model output could not be read.", "nebius", null);
  }
  if (!schema) return json;
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ProviderError("The model output could not be read.", "nebius", null);
  return parsed.data;
}

function messageMark(messages: ChatMessage[]): { sha256: string; chars: number } {
  const text = messages
    .map((message) => (typeof message.content === "string" ? message.content : ""))
    .join("\n");
  return textMark(text);
}

export async function nebiusJson(options: {
  model: string;
  messages: ChatMessage[];
  budget: TokenBudget;
  stage?: CacheStage;
  identity?: unknown;
  maxTokens?: number;
  schema?: ZodType;
  signal?: AbortSignal;
  requestId?: string;
}): Promise<NebiusJsonResult> {
  const started = Date.now();
  const requested = options.maxTokens ?? outputTokenCap();
  const maxTokens = Math.min(HARD_MAX_TOKENS, Math.max(128, Math.floor(requested)));
  const stage = options.stage ?? "verdict";
  const key = stageCacheKey(stage, {
    model: options.model,
    maxTokens,
    identity: options.identity ?? options.messages,
  });
  const mark = messageMark(options.messages);

  const cached = cacheGet(key);
  if (cached) {
    try {
      const json = validateOutput(cached.text, options.schema);
      logLlm({
        model: options.model,
        purpose: stage,
        attempt: 0,
        ms: Date.now() - started,
        promptTokens: cached.usage?.prompt ?? 0,
        completionTokens: cached.usage?.completion ?? 0,
        usd: 0,
        outcome: "ok",
        cacheHit: true,
        requestId: options.requestId,
      });
      return {
        json,
        model: options.model,
        cached: true,
        maxTokens,
        budgetRemaining: options.budget.remainingTokens(),
        usage: cached.usage,
        answerSource: cached.answerSource === "search" ? "content" : cached.answerSource,
      };
    } catch {
      cacheDelete(key);
    }
  }

  liveAttempts += 1;
  const blocked = liveCallsBlockedReason();
  if (blocked) throw new ProviderError(blocked, "nebius", null);

  if (!options.budget.tryReserve(maxTokens)) {
    throw new ProviderError("Token budget for this check is used up, so this model step was skipped.", "nebius", null);
  }

  const gate = breakerBeforeCall();
  if (gate === "open") {
    logLlm({
      model: options.model,
      purpose: stage,
      attempt: 0,
      ms: Date.now() - started,
      promptTokens: 0,
      completionTokens: 0,
      usd: 0,
      outcome: "breaker_open",
      cacheHit: false,
      requestId: options.requestId,
    });
    throw new ProviderError("The model service is paused. Try again in a moment.", "nebius", 503);
  }

  const paid = rateLimit("paid-global", paidCallLimit());
  if (!paid.ok) throw new ProviderError("Too many live checks are running. Try again in a moment.", "nebius", 429);

  let jsonMode = true;
  let formatDropped = false;
  let attempt = 0;
  let lastRaw: unknown = null;

  while (attempt < 2) {
    if (attempt > 0) liveAttempts += 1;
    attempt += 1;
    const callStarted = Date.now();
    // Hard cap: reserve this attempt's worst case (prompt estimate + max_tokens) before it is sent.
    let reservation: Reservation;
    try {
      reservation = await reserveSpend(options.model, promptTokenEstimate(options.messages), maxTokens);
    } catch (error) {
      if (error instanceof SpendCapError) throw new ProviderError(error.message, "nebius", null);
      throw error;
    }
    try {
      let result: Awaited<ReturnType<typeof completeOnce>>;
      try {
        result = await completeOnce(options.model, options.messages, maxTokens, jsonMode, options.signal);
      } catch (error) {
        const status = toError(error).status;
        // A 4xx was refused before any tokens were generated. Anything else may have been billed.
        await settleSpend(
          reservation,
          status !== null && status >= 400 && status < 500 ? { promptTokens: 0, completionTokens: 0 } : null,
        );
        throw error;
      }
      // Real cost from the API usage fields, before parsing, so a bad reply still counts.
      await settleSpend(reservation, result.usage ? { promptTokens: result.usage.prompt, completionTokens: result.usage.completion } : null);
      let json: unknown;
      try {
        json = validateOutput(result.text, options.schema);
      } catch (error) {
        breakerSuccess();
        logLlm({
          model: options.model,
          purpose: stage,
          attempt,
          ms: Date.now() - callStarted,
          promptTokens: result.usage?.prompt ?? 0,
          completionTokens: result.usage?.completion ?? 0,
          usd: 0,
          outcome: "parse_error",
          cacheHit: false,
          requestId: options.requestId,
        });
        throw error;
      }
      options.budget.settle(maxTokens, result.usage);
      recordUsage(result.usage);
      cacheSet(key, { text: result.text, usage: result.usage, answerSource: result.answerSource });
      breakerSuccess();
      const tokens = (result.usage?.prompt ?? 0) + (result.usage?.completion ?? 0);
      logLlm({
        model: options.model,
        purpose: stage,
        attempt,
        ms: Date.now() - callStarted,
        promptTokens: result.usage?.prompt ?? 0,
        completionTokens: result.usage?.completion ?? 0,
        usd: (tokens / 1000) * USD_PER_1K,
        outcome: "ok",
        cacheHit: false,
        requestId: options.requestId,
        inputSha256: mark.sha256,
        inputChars: mark.chars,
      });
      return {
        json,
        model: options.model,
        cached: false,
        maxTokens,
        budgetRemaining: options.budget.remainingTokens(),
        usage: result.usage,
        answerSource: result.answerSource,
      };
    } catch (error) {
      if (error instanceof ProviderError && error.message === "The model output could not be read.") throw error;
      lastRaw = error;
      const wrapped = toError(error);
      if ((wrapped.status === 400 || wrapped.status === 422) && jsonMode && !formatDropped && attempt < 2) {
        jsonMode = false;
        formatDropped = true;
        continue;
      }
      const retryable =
        wrapped.status === 429 ||
        (wrapped.status !== null && wrapped.status >= 500) ||
        isTimeout(error) ||
        isReset(error);
      if (retryable && attempt < 2 && !options.signal?.aborted) {
        const wait = retryAfterMs(error) ?? jitter(attempt);
        logLlm({
          model: options.model,
          purpose: stage,
          attempt,
          ms: Date.now() - callStarted,
          promptTokens: 0,
          completionTokens: 0,
          usd: 0,
          outcome: outcomeFor(wrapped, error),
          cacheHit: false,
          requestId: options.requestId,
        });
        await retryDelayImpl(wait);
        continue;
      }
      const outcome = outcomeFor(wrapped, lastRaw);
      if (outcome !== "parse_error" && wrapped.status !== 400 && wrapped.status !== 422) breakerFailure();
      logLlm({
        model: options.model,
        purpose: stage,
        attempt,
        ms: Date.now() - callStarted,
        promptTokens: 0,
        completionTokens: 0,
        usd: 0,
        outcome: outcomeFor(wrapped, lastRaw),
        cacheHit: false,
        requestId: options.requestId,
      });
      throw wrapped;
    }
  }
  throw new ProviderError("The model service did not answer.", "nebius", 503);
}

async function completeOnce(
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  jsonMode: boolean,
  parent?: AbortSignal,
): Promise<{ text: string; usage: TokenUsage | null; answerSource: "content" | "reasoning_content" }> {
  const timeout = callTimeoutMs(model);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const onAbort = () => controller.abort();
  parent?.addEventListener("abort", onAbort, { once: true });
  try {
    const response = await client().chat.completions.create(
      {
        model,
        messages,
        temperature: 0.1,
        max_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      },
      { signal: controller.signal, timeout },
    );
    const choice = response.choices[0];
    const message = choice?.message as AssistantMessage | undefined;
    const extracted = extractAssistantText(message, choice?.finish_reason);
    return { text: extracted.text, usage: readUsage(response), answerSource: extracted.source };
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", onAbort);
  }
}

function promptTokenEstimate(messages: ChatMessage[]): number {
  let text = "";
  let images = 0;
  for (const message of messages) {
    if (typeof message.content === "string") {
      text += message.content;
      continue;
    }
    for (const part of (message.content ?? []) as unknown as Array<Record<string, unknown>>) {
      if (part.type === "image_url") images += 1;
      else if (typeof part.text === "string") text += part.text;
    }
  }
  return estimatePromptTokens(text, images);
}

export function imageMessage(prompt: string, dataUrl: string): ChatMessage {
  return {
    role: "user",
    content: [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: dataUrl } },
    ],
  };
}

export function spendNote(result: Pick<NebiusJsonResult, "cached" | "usage" | "answerSource" | "maxTokens" | "budgetRemaining">): string {
  const spend = result.cached
    ? "Served from the local cache, so Token Factory was not called again."
    : result.usage
      ? `Used ${result.usage.prompt + result.usage.completion} tokens (prompt ${result.usage.prompt}, completion ${result.usage.completion}).`
      : `Output cap ${result.maxTokens} tokens.`;
  const recovered =
    result.answerSource === "reasoning_content"
      ? " The answer was taken from reasoning_content because content was empty."
      : "";
  return `${spend}${recovered} About ${Math.max(0, result.budgetRemaining)} tokens left in this check.`;
}
