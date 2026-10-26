import type { Assessment } from "./assess";
import type { LabelFields } from "./types";

/** Stable label key. Wording and dates stay out so the same pack hits the cache. */
export function fieldIdentity(fields: LabelFields) {
  return {
    productName: fields.productName.trim().toLowerCase(),
    manufacturer: fields.manufacturer.trim().toLowerCase(),
    batch: fields.batch.trim().toUpperCase(),
    expiry: fields.expiry.trim(),
    registrationNumber: fields.registrationNumber.trim().toUpperCase(),
  };
}

/**
 * Verdict cache key. Reviewed search pages are left out so a repeat of the same
 * rules outcome can reuse wording. A different matching notice changes the key.
 */
export function verdictIdentity(assessment: Pick<Assessment, "fields" | "verdict" | "flags" | "evidence">) {
  return {
    fields: fieldIdentity(assessment.fields),
    verdict: assessment.verdict,
    flags: assessment.flags.map((flag) => flag.code).sort(),
    matches: assessment.evidence
      .filter((item) => item.role === "match")
      .map((item) => item.url)
      .sort(),
  };
}
