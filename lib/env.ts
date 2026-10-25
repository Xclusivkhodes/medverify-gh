import { outputTokenCap, requestTokenBudget } from "./budget";
import { blockUltra, MODEL_DEFAULTS, NEBIUS_BASE_URL_DEFAULT } from "./models";

/** Dynamic env access so Next does not inline secret values at build time. */
export function env(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export type DemoDecision = {
  demo: boolean;
  /** True when DEMO_MODE forces live and a key is missing. */
  liveBlocked: boolean;
  demoLocked: boolean;
  canUseLive: boolean;
  reason: string;
};

/** Shared refusal for Nebius and Tavily. Null means the demo switch is not the reason to stop. */
export function liveCallsBlockedReason(): string | null {
  const llm = (env("LLM_ENABLED") ?? "").toLowerCase();
  if (llm === "false" || llm === "0" || llm === "off" || llm === "no") {
    return "LLM_ENABLED is off, so this live call was refused.";
  }
  const mode = (env("DEMO_MODE") ?? "true").toLowerCase();
  if (mode === "true" || mode === "1" || mode === "demo") {
    return "DEMO_MODE is on, so this live call was refused.";
  }
  return null;
}

export function demoDecision(forceDemo = false): DemoDecision {
  const mode = (env("DEMO_MODE") ?? "true").toLowerCase();
  const hasNebius = Boolean(env("NEBIUS_API_KEY"));
  const hasTavily = Boolean(env("TAVILY_API_KEY"));
  const canUseLive = hasNebius && hasTavily;
  const forcedDemo = mode === "true" || mode === "1" || mode === "demo";
  const forcedLive = mode === "false" || mode === "0" || mode === "live";
  const llmOff = liveCallsBlockedReason()?.startsWith("LLM_ENABLED") ?? false;

  if (llmOff) {
    return {
      demo: true,
      liveBlocked: false,
      demoLocked: true,
      canUseLive,
      reason: "LLM_ENABLED is off. Live model calls stay blocked until you turn that switch on.",
    };
  }

  if (forcedDemo) {
    return {
      demo: true,
      liveBlocked: false,
      demoLocked: true,
      canUseLive,
      reason: "DEMO_MODE is on, so Nebius and Tavily are not called. The bundled snapshot is used instead.",
    };
  }

  if (forcedLive) {
    if (!canUseLive) {
      return {
        demo: false,
        liveBlocked: true,
        demoLocked: false,
        canUseLive: false,
        reason:
          "DEMO_MODE is set to live, but NEBIUS_API_KEY or TAVILY_API_KEY is missing.",
      };
    }
    return {
      demo: false,
      liveBlocked: false,
      demoLocked: false,
      canUseLive: true,
      reason: "DEMO_MODE is set to live.",
    };
  }

  if (forceDemo) {
    return {
      demo: true,
      liveBlocked: false,
      demoLocked: false,
      canUseLive,
      reason: "This check was sent as a demo example.",
    };
  }

  if (!canUseLive) {
    return {
      demo: true,
      liveBlocked: false,
      demoLocked: true,
      canUseLive: false,
      reason:
        "NEBIUS_API_KEY or TAVILY_API_KEY is not set, so DEMO_MODE runs automatically.",
    };
  }

  return {
    demo: false,
    liveBlocked: false,
    demoLocked: false,
    canUseLive: true,
    reason: "Both API keys are set. This check uses live models.",
  };
}

export function modelSelection() {
  return {
    baseUrl: env("NEBIUS_BASE_URL") ?? NEBIUS_BASE_URL_DEFAULT,
    vision: blockUltra(env("NEBIUS_VISION_MODEL") ?? MODEL_DEFAULTS.vision, MODEL_DEFAULTS.vision),
    normalize: blockUltra(env("NEBIUS_NORMALIZE_MODEL") ?? MODEL_DEFAULTS.normalize, MODEL_DEFAULTS.normalize),
    verdict: blockUltra(env("NEBIUS_VERDICT_MODEL") ?? MODEL_DEFAULTS.verdict, MODEL_DEFAULTS.verdict),
    maxTokens: outputTokenCap(),
    requestTokenBudget: requestTokenBudget(),
  };
}

export function publicStatus(forceDemo = false) {
  const decision = demoDecision(forceDemo);
  const models = modelSelection();
  return {
    mode: "medicine" as const,
    demoDefault: decision.demo,
    demoLocked: decision.demoLocked,
    liveBlocked: decision.liveBlocked,
    canUseLive: decision.canUseLive,
    reason: decision.reason,
    providers: {
      nebius: Boolean(env("NEBIUS_API_KEY")),
      tavily: Boolean(env("TAVILY_API_KEY")),
    },
    models: {
      baseUrl: models.baseUrl,
      vision: models.vision,
      normalize: models.normalize,
      verdict: models.verdict,
      evidence: "tavily/search",
      maxTokens: models.maxTokens,
      requestTokenBudget: models.requestTokenBudget,
    },
  };
}
