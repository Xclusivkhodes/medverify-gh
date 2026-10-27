import { blockUltra, MODEL_DEFAULTS, OPTIONAL_REASONING_MODELS } from "../../models";

/** At or above this, Nano writes the verdict. Below it, Super may. */
export const SURE_CONFIDENCE = 0.8;

export function chooseVerdictModel(input: {
  configured: string;
  confidence: number;
  exactBatch: boolean;
  demo: boolean;
  softBudgetReached: boolean;
}): { model: string; escalated: boolean; reason: string } {
  const base = blockUltra(input.configured, MODEL_DEFAULTS.verdict);
  if (input.demo) {
    return { model: base, escalated: false, reason: "Demo mode does not call Super." };
  }
  if (input.exactBatch || input.confidence >= SURE_CONFIDENCE) {
    return {
      model: base,
      escalated: false,
      reason: "The rules are already sure, so the verdict stays on the default model.",
    };
  }
  if (input.softBudgetReached) {
    return { model: base, escalated: false, reason: "Spend is at the soft limit, so Super stays off." };
  }
  if (base === OPTIONAL_REASONING_MODELS.super) {
    return { model: base, escalated: false, reason: "The verdict model is already Super." };
  }
  const model = blockUltra(OPTIONAL_REASONING_MODELS.super, base);
  return {
    model,
    escalated: model !== base,
    reason: "Confidence is low and spend is under the soft line, so the verdict step uses Super.",
  };
}
