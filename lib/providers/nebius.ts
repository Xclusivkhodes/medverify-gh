import OpenAI from "openai";
import { outputTokenCap, type TokenBudget, type TokenUsage } from "../budget";
import { env, liveCallsBlockedReason, modelSelection } from "../env";
import { acquireInflight, BudgetStop, recordUsage, releaseInflight } from "../server/spend";
import { parseModelJson } from "../text";
import { extractAssistantText, type AssistantMessage } from "./answer";
import { cacheGet, cacheKey, cacheSet } from "./cache";

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

function scrubSecrets(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]+/g, "[key]")
    .replace(/tvly-[A-Za-z0-9_-]+/g, "[key]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [key]")
    .slice(0, 320);
}

function assertLiveAllowed(): void {
  const blocked = liveCallsBlockedReason();
  if (blocked) throw new ProviderError(blocked, "nebius", null);
  try {
    acquireInflight();
  } catch (error) {
    if (error instanceof BudgetStop) throw new ProviderError(error.message, "nebius", 429);
    throw error;
  }
}

function client(): OpenAI {
  const key = env("NEBIUS_API_KEY");
  if (!key) {
    throw new ProviderError("NEBIUS_API_KEY is not set.", "nebius", null);
  }
  return new OpenAI({
    apiKey: key,
    baseURL: modelSelection().baseUrl,
    timeout: 45_000,
    maxRetries: 0,
  });
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

async function completeOnce(
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  jsonMode: boolean,
): Promise<{ text: string; usage: TokenUsage | null; answerSource: "content" | "reasoning_content" }> {
  liveAttempts += 1;
  assertLiveAllowed();
  try {
    const openai = client();
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.1,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    });
    const choice = response.choices[0];
    const message = choice?.message as AssistantMessage | undefined;
    try {
      const extracted = extractAssistantText(message, choice?.finish_reason);
      return { text: extracted.text, usage: readUsage(response), answerSource: extracted.source };
    } catch (error) {
      throw new ProviderError(error instanceof Error ? error.message : "Empty model answer.", "nebius", null);
    }
  } finally {
    releaseInflight();
  }
}

export async function nebiusJson(options: {
  model: string;
  messages: ChatMessage[];
  budget: TokenBudget;
}): Promise<NebiusJsonResult> {
  const maxTokens = outputTokenCap();
  const key = cacheKey({ kind: "nebius", model: options.model, maxTokens, messages: options.messages });
  const cached = cacheGet(key);
  if (cached) {
    return {
      json: parseModelJson(cached.text),
      model: options.model,
      cached: true,
      maxTokens,
      budgetRemaining: options.budget.remainingTokens(),
      usage: cached.usage,
      answerSource: cached.answerSource === "search" ? "content" : cached.answerSource,
    };
  }

  if (!options.budget.tryReserve(maxTokens)) {
    throw new ProviderError(
      "Token budget for this check is used up, so this model step was skipped.",
      "nebius",
      null,
    );
  }

  try {
    let result: Awaited<ReturnType<typeof completeOnce>>;
    try {
      result = await completeOnce(options.model, options.messages, maxTokens, true);
    } catch (error) {
      const wrapped = toError(error);
      if (wrapped.status !== 400 && wrapped.status !== 422) throw wrapped;
      if (!options.budget.tryReserve(maxTokens)) throw wrapped;
      result = await completeOnce(options.model, options.messages, maxTokens, false);
    }
    options.budget.settle(maxTokens, result.usage);
    recordUsage(result.usage);
    cacheSet(key, { text: result.text, usage: result.usage, answerSource: result.answerSource });
    return {
      json: parseModelJson(result.text),
      model: options.model,
      cached: false,
      maxTokens,
      budgetRemaining: options.budget.remainingTokens(),
      usage: result.usage,
      answerSource: result.answerSource,
    };
  } catch (error) {
    throw toError(error);
  }
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
