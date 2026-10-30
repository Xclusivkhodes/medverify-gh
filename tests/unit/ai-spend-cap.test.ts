import { afterEach, describe, expect, it } from "vitest";
import { TokenBudget } from "../../lib/budget";
import { verdictOutputSchema } from "../../lib/modes/medicine/schemas";
import { runMedicineCheck } from "../../lib/modes/medicine/pipeline";
import { cacheClear } from "../../lib/providers/cache";
import {
  liveAttemptCount,
  nebiusJson,
  resetLiveAttempts,
  resetNebiusForTests,
  setFetchForTests,
  setRetryDelayForTests,
} from "../../lib/providers/nebius";
import { resetTavilyAttempts, tavilyAttemptCount } from "../../lib/providers/tavily";
import {
  aiSpendCapUsd,
  aiSpendSnapshot,
  CAP_REACHED_MESSAGE,
  costUsd,
  reserveSpend,
  resetAiSpendForTests,
  settleSpend,
} from "../../lib/server/ai-spend-cap";
import { budgetPublic, resetSpendForTests } from "../../lib/server/spend";
import { resetBreaker } from "../../lib/server/breaker";

const saved = { ...process.env };
const NANO = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B";

afterEach(() => {
  process.env = { ...saved };
  resetNebiusForTests();
  resetAiSpendForTests();
  resetSpendForTests(0);
  resetBreaker();
  cacheClear();
});

function liveEnv() {
  process.env.DEMO_MODE = "false";
  process.env.LLM_ENABLED = "true";
  process.env.NEBIUS_API_KEY = "sk-test-not-real";
  process.env.TAVILY_API_KEY = "tvly-test-not-real";
  process.env.NEBIUS_BASE_URL = "http://127.0.0.1:9";
  process.env.AI_SPEND_STORE = "memory";
}

function reply(content: string, prompt: number, completion: number) {
  return new Response(
    JSON.stringify({
      id: "t",
      object: "chat.completion",
      created: 0,
      model: NANO,
      choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
      usage: { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const verdict = JSON.stringify({
  headline: "Do not use this pack.",
  summary: "Ask a pharmacist before you use it.",
  actions: ["Stop"],
  pharmacistNote: "Ask a pharmacist.",
});

function call(id: string) {
  return nebiusJson({
    model: NANO,
    messages: [{ role: "user", content: "verdict please" }],
    budget: new TokenBudget(2048),
    stage: "verdict",
    identity: { case: id },
    schema: verdictOutputSchema,
  });
}

describe("AI spend cap", () => {
  it("defaults to $0.30, AI_SPEND_CAP_USD wins, BUDGET_USD can only lower it", () => {
    delete process.env.AI_SPEND_CAP_USD;
    delete process.env.BUDGET_USD;
    expect(aiSpendCapUsd()).toBe(0.3);
    process.env.BUDGET_USD = "1";
    expect(aiSpendCapUsd()).toBe(0.3);
    process.env.BUDGET_USD = "0.1";
    expect(aiSpendCapUsd()).toBe(0.1);
    process.env.AI_SPEND_CAP_USD = "0.25";
    expect(aiSpendCapUsd()).toBe(0.25);
    expect(budgetPublic().capUsd).toBe(0.25);
  });

  it("sends max_tokens, counts real usage, and refuses the next call at the cap without fetching", async () => {
    liveEnv();
    process.env.AI_SPEND_CAP_USD = "0.00015";
    setRetryDelayForTests(async () => undefined);
    const bodies: Array<Record<string, unknown>> = [];
    setFetchForTests(async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return reply(verdict, 100, 400);
    });
    await call("first");
    expect(bodies).toHaveLength(1);
    expect(typeof bodies[0].max_tokens).toBe("number");
    expect(bodies[0].max_tokens as number).toBeLessThanOrEqual(1024);
    const snap = await aiSpendSnapshot();
    expect(snap.spentUsd).toBeCloseTo(costUsd(NANO, 100, 400), 6);
    await expect(call("second")).rejects.toThrow(/spend cap/i);
    expect(bodies).toHaveLength(1);
    expect(budgetPublic().hardReached).toBe(true);
  });

  it("still counts spend when the reply cannot be parsed", async () => {
    liveEnv();
    setRetryDelayForTests(async () => undefined);
    setFetchForTests(async () => reply("not json at all", 50, 200));
    await expect(call("bad")).rejects.toThrow();
    expect((await aiSpendSnapshot()).spentUsd).toBeGreaterThan(0);
  });

  it("falls back to demo mode with a clear message once the cap is used up", async () => {
    liveEnv();
    process.env.AI_SPEND_CAP_USD = "0.001";
    const r = await reserveSpend(NANO, 0, 128);
    await settleSpend(r, { promptTokens: 0, completionTokens: 10_000 });
    resetLiveAttempts();
    resetTavilyAttempts();
    const result = await runMedicineCheck({ mode: "medicine", productName: "Clearview Eye Drops", batch: "CV-44012" });
    expect(result.runMode).toBe("demo");
    expect(result.demoReason).toBe(CAP_REACHED_MESSAGE);
    expect(liveAttemptCount()).toBe(0);
    expect(tavilyAttemptCount()).toBe(0);
  });

  it("refuses live calls on Vercel when there is no durable store", async () => {
    liveEnv();
    delete process.env.AI_SPEND_STORE;
    delete process.env.VITEST;
    (process.env as Record<string, string>).NODE_ENV = "production";
    process.env.VERCEL = "1";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.KV_REST_API_URL;
    expect((await aiSpendSnapshot()).liveAllowedByStore).toBe(false);
    await expect(reserveSpend(NANO, 10, 100)).rejects.toThrow();
    process.env.AI_SPEND_ALLOW_EPHEMERAL = "1";
    expect((await aiSpendSnapshot()).liveAllowedByStore).toBe(true);
  });
});
