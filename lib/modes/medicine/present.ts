import type { Presentation } from "../../brand";
import type { Assessment } from "./assess";

export type MatchKind = "exact_batch" | "name_only" | "none";

export type Presented = {
  presentation: Presentation;
  /** CSS modifier from the shared verdict set. Empty when there is no verdict colour. */
  verdictClass: "" | "verdict--scam" | "verdict--suspicious" | "verdict--ok";
  word: string;
  kicker: string;
  confidence: number;
  match: MatchKind;
  meter: number;
  sureLabel: string;
  matchLabel: string;
};

const SURE = ["Not sure", "A bit sure", "Fairly sure", "Sure", "Very sure"] as const;

/** No verdict when a live FDA search fails and no bundled FDA notice matched. */
export function withholdVerdict(demo: boolean, evidenceFailed: boolean, curatedMatch: boolean): boolean {
  return !demo && evidenceFailed && !curatedMatch;
}

export function meterSegments(confidence: number): number {
  const pct = confidence * 100;
  if (pct < 40) return 1;
  if (pct < 60) return 2;
  if (pct < 75) return 3;
  if (pct < 90) return 4;
  return 5;
}

export function presentAssessment(
  assessment: Assessment,
  options?: { visionLow?: boolean },
): Presented {
  const batchHit = assessment.matches.some((match) => match.strength === "batch");
  const nameHit = assessment.matches.some((match) => match.strength === "name");
  const match: MatchKind = batchHit ? "exact_batch" : nameHit ? "name_only" : "none";
  const batchMissing = !assessment.fields.batch.trim();
  const sureRed = assessment.flags.some((flag) =>
    ["expired", "misspelling", "non_english_label", "name_on_alert", "evidence_search_failed", "missing_registration", "gs1_mismatch", "gs1_bad_gtin", "expiry_before_manufacture", "scratch_failed"].includes(
      flag.code,
    ),
  );

  let presentation: Presentation = "no_alerts";
  let confidence = 0.86;

  if (assessment.verdict === "alert_match" && match === "exact_batch") {
    presentation = "do_not_use";
    confidence = 0.98;
  } else if (assessment.verdict === "alert_match") {
    presentation = "do_not_use";
    confidence = 0.72;
  } else if (options?.visionLow) {
    presentation = "unsure";
    confidence = 0.45;
  } else if (assessment.verdict === "red_flags" && batchMissing && !sureRed) {
    presentation = "unsure";
    confidence = 0.55;
  } else if (assessment.verdict === "red_flags") {
    presentation = "check_first";
    confidence = 0.78;
  } else if (batchMissing) {
    presentation = "no_alerts";
    confidence = 0.64;
  }

  const meter = meterSegments(confidence);
  const verdictClass =
    presentation === "do_not_use"
      ? "verdict--scam"
      : presentation === "check_first"
        ? "verdict--suspicious"
        : presentation === "no_alerts"
          ? "verdict--ok"
          : "";

  const word =
    presentation === "do_not_use"
      ? "Do not use"
      : presentation === "check_first"
        ? "Check first"
        : presentation === "no_alerts"
          ? "No alerts found"
          : "We’re not sure";

  const kicker =
    presentation === "do_not_use"
      ? match === "exact_batch"
        ? "FDA Ghana alert match"
        : "FDA Ghana notice"
      : presentation === "check_first"
        ? "Ask a pharmacist"
        : presentation === "no_alerts"
          ? "No FDA Ghana notice matched"
          : "Low confidence";

  const matchLabel =
    match === "exact_batch" ? "Exact batch" : match === "name_only" ? "Name only" : "No batch match";

  return {
    presentation,
    verdictClass,
    word,
    kicker,
    confidence,
    match,
    meter,
    sureLabel: SURE[meter - 1] ?? "Not sure",
    matchLabel,
  };
}
