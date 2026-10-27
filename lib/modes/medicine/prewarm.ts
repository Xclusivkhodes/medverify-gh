import { outputTokenCap, superOutputTokenCap } from "../../budget";
import { MODEL_DEFAULTS, OPTIONAL_REASONING_MODELS } from "../../models";
import { STAGE_TTL_MS, cacheSet, stageCacheKey } from "../../providers/cache";
import { assessMedicine } from "./assess";
import { fieldIdentity, verdictIdentity } from "./cache-identity";
import { TRY_EXAMPLES, getScenario } from "./scenarios";

/**
 * Seed normalise and verdict entries for the three example packs.
 * A later live check of the same label can reuse the rules wording and skip
 * Token Factory. The UI examples still send forceDemo, so they never read this.
 * Tavily is not seeded: an empty search result would look like a real reply.
 */
export function prewarmShowcase(now = new Date()): number {
  let count = 0;
  for (const example of TRY_EXAMPLES) {
    const scenario = getScenario(example.id);
    if (!scenario) continue;
    const assessment = assessMedicine(scenario.fields, now);
    cacheSet(
      stageCacheKey("normalize", {
        model: MODEL_DEFAULTS.normalize,
        maxTokens: outputTokenCap(),
        identity: fieldIdentity(scenario.fields),
      }),
      {
        text: JSON.stringify({ ...scenario.fields, redFlags: [] }),
        usage: null,
        answerSource: "content",
      },
      STAGE_TTL_MS.normalize,
    );
    const verdictBody = JSON.stringify({
      headline: assessment.headline,
      summary: assessment.summary,
      actions: assessment.actions,
      pharmacistNote: assessment.pharmacistNote,
    });
    const identity = verdictIdentity(assessment);
    for (const model of [MODEL_DEFAULTS.verdict, OPTIONAL_REASONING_MODELS.super]) {
      const maxTokens = model === OPTIONAL_REASONING_MODELS.super ? superOutputTokenCap() : outputTokenCap();
      cacheSet(
        stageCacheKey("verdict", { model, maxTokens, identity }),
        { text: verdictBody, usage: null, answerSource: "content" },
        STAGE_TTL_MS.verdict,
      );
    }
    count += 1;
  }
  return count;
}
