import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TokenBudget } from "../../lib/budget";
import { medicineResultSchema, verifyBodySchema, verdictOutputSchema } from "../../lib/modes/medicine/schemas";
import { runMedicineCheck } from "../../lib/modes/medicine/pipeline";
import { cacheClear } from "../../lib/providers/cache";
import {
  liveAttemptCount,
  nebiusJson,
  resetLiveAttempts,
  resetNebiusForTests,
  setCallTimeoutForTests,
  setFetchForTests,
  setRetryDelayForTests,
} from "../../lib/providers/nebius";
import { resetTavilyAttempts, tavilyAttemptCount } from "../../lib/providers/tavily";
import { breakerFailure, breakerState, resetBreaker } from "../../lib/server/breaker";
import { readLimitedJson } from "../../lib/server/body";
import { clientKey, rateLimit, resetRateLimits } from "../../lib/server/limit";
import { redactPii } from "../../lib/server/redact";
import { flushSpend, recordUsage, resetSpendForTests, spendFilePath } from "../../lib/server/spend";
import { sanitizePackImage } from "../../lib/server/image";

const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
  resetNebiusForTests();
  resetBreaker();
  resetRateLimits();
  resetSpendForTests(0);
  cacheClear();
  vi.useRealTimers();
});

function completion(content: string) {
  return {
    id: "test",
    object: "chat.completion",
    created: 0,
    model: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };
}

const validVerdict = JSON.stringify({
  headline: "Do not use this pack.",
  summary: "Ask a pharmacist before you use it.",
  actions: ["Stop"],
  pharmacistNote: "Ask a pharmacist.",
});

function liveEnv() {
  process.env.DEMO_MODE = "false";
  process.env.LLM_ENABLED = "true";
  process.env.NEBIUS_API_KEY = "sk-test-not-real";
  process.env.TAVILY_API_KEY = "tvly-test-not-real";
  process.env.NEBIUS_BASE_URL = "http://127.0.0.1:9";
  process.env.NEBIUS_VERDICT_MODEL = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B";
}

describe("examples and limits", () => {
  it("forces demo when a scenario id is set and DEMO_MODE is live", async () => {
    liveEnv();
    resetLiveAttempts();
    resetTavilyAttempts();
    const result = await runMedicineCheck({ scenarioId: "clearview-drops" });
    expect(result.runMode).toBe("demo");
    expect(liveAttemptCount()).toBe(0);
    expect(tavilyAttemptCount()).toBe(0);
    expect(medicineResultSchema.safeParse(result).success).toBe(true);
  });

  it("ignores spoofed forwarded headers unless the proxy is trusted", () => {
    delete process.env.TRUST_PROXY;
    const spoofed = new Request("http://app.local/api/verify", {
      headers: { "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8" },
    });
    expect(clientKey(spoofed)).toBe("direct");
    process.env.TRUST_PROXY = "1";
    const trusted = new Request("http://app.local/api/verify", {
      headers: { "x-forwarded-for": "1.2.3.4, 8.8.8.8" },
    });
    expect(clientKey(trusted)).toBe("8.8.8.8");
  });

  it("rejects an unknown field and a huge body", async () => {
    expect(verifyBodySchema.safeParse({ mode: "medicine", extra: true }).success).toBe(false);
    const huge = new Request("http://app.local/api/verify", {
      method: "POST",
      headers: { "content-length": "4000000" },
      body: "{}",
    });
    await expect(readLimitedJson(huge)).rejects.toMatchObject({ status: 413 });
  });

  it("rejects SVG and GIF uploads", async () => {
    const svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>").toString("base64");
    await expect(sanitizePackImage(`data:image/svg+xml;base64,${svg}`)).rejects.toThrow(/not a photo/);
    const gif = Buffer.from("GIF89a");
    await expect(sanitizePackImage(`data:image/gif;base64,${gif.toString("base64")}`)).rejects.toThrow(/not a photo/);
  });
});

describe("llm client", () => {
  it("validates before caching, retries a 429 once, and records spend once", async () => {
    liveEnv();
    setRetryDelayForTests(async () => undefined);
    let calls = 0;
    setFetchForTests(async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ error: { message: "slow down" } }), {
          status: 429,
          headers: { "content-type": "application/json", "retry-after": "0" },
        });
      }
      return new Response(JSON.stringify(completion(validVerdict)), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    resetSpendForTests(0);
    const first = await nebiusJson({
      model: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
      messages: [{ role: "user", content: "verdict please" }],
      budget: new TokenBudget(2048),
      stage: "verdict",
      identity: { case: "retry" },
      schema: verdictOutputSchema,
    });
    expect(first.cached).toBe(false);
    expect(calls).toBe(2);
    const before = calls;
    const second = await nebiusJson({
      model: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
      messages: [{ role: "user", content: "verdict please" }],
      budget: new TokenBudget(2048),
      stage: "verdict",
      identity: { case: "retry" },
      schema: verdictOutputSchema,
    });
    expect(second.cached).toBe(true);
    expect(calls).toBe(before);
    await flushSpend();
    const ledger = JSON.parse(await readFile(spendFilePath(), "utf8")) as { spentUsd: number };
    expect(ledger.spentUsd).toBeCloseTo(0.00003, 6);
  });

  it("does not cache malformed JSON", async () => {
    liveEnv();
    setRetryDelayForTests(async () => undefined);
    let calls = 0;
    setFetchForTests(async () => {
      calls += 1;
      const content = calls === 1 ? "{}" : validVerdict;
      return new Response(JSON.stringify(completion(content)), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    await expect(
      nebiusJson({
        model: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
        messages: [{ role: "user", content: "bad" }],
        budget: new TokenBudget(2048),
        stage: "verdict",
        identity: { case: "bad-json" },
        schema: verdictOutputSchema,
      }),
    ).rejects.toThrow(/could not be read/);
    await nebiusJson({
      model: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
      messages: [{ role: "user", content: "bad" }],
      budget: new TokenBudget(2048),
      stage: "verdict",
      identity: { case: "bad-json" },
      schema: verdictOutputSchema,
    });
    expect(calls).toBe(2);
  });

  it("opens the breaker after five failures and does not call again", async () => {
    liveEnv();
    setRetryDelayForTests(async () => undefined);
    let calls = 0;
    setFetchForTests(async () => {
      calls += 1;
      return new Response("no", { status: 500, headers: { "content-type": "application/json" } });
    });
    const run = () =>
      nebiusJson({
        model: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
        messages: [{ role: "user", content: `fail ${calls}` }],
        budget: new TokenBudget(2048),
        stage: "normalize",
        identity: { case: "breaker", n: calls },
      });
    for (let i = 0; i < 5; i += 1) {
      await expect(run()).rejects.toThrow();
    }
    expect(breakerState()).toBe("open");
    const before = calls;
    await expect(run()).rejects.toThrow(/paused/);
    expect(calls).toBe(before);
  });

  it("aborts a hung call at the per-call timeout", async () => {
    liveEnv();
    setCallTimeoutForTests(30);
    setRetryDelayForTests(async () => undefined);
    setFetchForTests((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    }));
    await expect(
      nebiusJson({
        model: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
        messages: [{ role: "user", content: "hang" }],
        budget: new TokenBudget(2048),
        stage: "normalize",
        identity: { case: "timeout" },
      }),
    ).rejects.toThrow();
  });
});

describe("breaker, redact, spend", () => {
  it("opens after five recorded failures and allows one probe later", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T00:00:00Z"));
    resetBreaker();
    for (let i = 0; i < 5; i += 1) breakerFailure();
    expect(breakerState()).toBe("open");
    vi.setSystemTime(new Date("2026-10-26T00:00:31Z"));
    expect(breakerState()).toBe("half_open");
  });

  it("redacts cards and Ghana Card numbers but keeps a batch", () => {
    const text = redactPii("card 4111111111111111 GHA-123456789-1 PIN 4321 batch L220008");
    expect(text).not.toContain("4111");
    expect(text).not.toContain("GHA-123456789-1");
    expect(text).toContain("L220008");
    expect(text).not.toMatch(/PIN \d/);
  });

  it("writes the spend ledger by rename, off the hot path", async () => {
    resetSpendForTests(0);
    recordUsage({ prompt: 1000, completion: 0 });
    recordUsage({ prompt: 0, completion: 1000 });
    await flushSpend();
    const ledger = JSON.parse(await readFile(spendFilePath(), "utf8")) as { spentUsd: number };
    expect(ledger.spentUsd).toBeCloseTo(0.004, 6);
  });

  it("trips a small in-memory limit", () => {
    expect(rateLimit("unit-ip", 2).ok).toBe(true);
    expect(rateLimit("unit-ip", 2).ok).toBe(true);
    expect(rateLimit("unit-ip", 2).ok).toBe(false);
  });
});
