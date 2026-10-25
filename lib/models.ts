/**
 * Nebius Token Factory, OpenAI-compatible.
 * Base URL: https://api.tokenfactory.nebius.com/v1
 *
 * NVIDIA models on that endpoint:
 * - nvidia/Nemotron-3.5-Super-VL          vision, reads the pack
 * - nvidia/Nemotron-3_5-Lightning         default text step (fast, cheap)
 * - nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B default text step (cheap)
 * - nvidia/nemotron-3-super-120b-a12b     opt-in; spends the token cap on reasoning
 * - nvidia/Nemotron-3-Ultra-550b-a55b     opt-in; same reasoning cost, larger
 *
 * Text steps default to Nano. VL is only for the pack photo. Super is an
 * opt-in escalation. Ultra is never used on the live path. Super returns
 * reasoning in message.reasoning_content and can leave content null when
 * max_tokens is used up by that reasoning.
 */

export const NEBIUS_BASE_URL_DEFAULT = "https://api.tokenfactory.nebius.com/v1";

export const MODEL_DEFAULTS = {
  vision: "nvidia/Nemotron-3.5-Super-VL",
  normalize: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
  verdict: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
} as const;

export const OPTIONAL_REASONING_MODELS = {
  super: "nvidia/nemotron-3-super-120b-a12b",
  ultra: "nvidia/Nemotron-3-Ultra-550b-a55b",
} as const;

export const MODEL_ROLES = {
  vision: "Reads the pack photo: name, manufacturer, batch, expiry, registration number.",
  normalize:
    "Normalises those details and adds label red flags such as misspellings, a missing registration number, or an expiry that has passed.",
  evidence: "Searches fdaghana.gov.gh only, for alerts, recalls, and notices.",
  verdict:
    "Writes a cited verdict from the label, the red flags, and the pages that were actually retrieved.",
} as const;

/** Short label for the UI. The full id is still shown beside it. */
export function modelShortName(id: string | null | undefined): string {
  if (!id) return "Rules";
  const value = id.toLowerCase();
  if (value.includes("super-vl") || value.includes("3.5-super-vl")) return "Nemotron VL";
  if (value.includes("ultra")) return "Nemotron Ultra";
  if (value.includes("super")) return "Nemotron Super";
  if (value.includes("lightning")) return "Nemotron Lightning";
  if (value.includes("nano")) return "Nemotron Nano";
  if (value.includes("tavily")) return "Tavily Search";
  return id;
}

export function blockUltra(id: string, fallback: string): string {
  return id === OPTIONAL_REASONING_MODELS.ultra ? fallback : id;
}
