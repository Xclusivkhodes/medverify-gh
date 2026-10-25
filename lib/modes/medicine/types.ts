import type { TraceStep } from "../types";

export const VERDICT_LABEL = {
  alert_match: "Matches an alert or recall",
  red_flags: "Red flags, check with a pharmacist",
  no_alerts: "No alerts found",
} as const;

export type VerdictId = keyof typeof VERDICT_LABEL;

export const FLAG_CODES = [
  "expired",
  "expiry_unreadable",
  "missing_product_name",
  "missing_batch",
  "missing_expiry",
  "missing_registration",
  "misspelling",
  "name_on_alert",
  "batch_on_alert",
  "non_english_label",
  "evidence_search_failed",
  "gs1_mismatch",
  "gs1_bad_gtin",
  "expiry_before_manufacture",
  "shelf_life",
  "scratch_failed",
  "scratch_pasted",
] as const;

export type FlagCode = (typeof FLAG_CODES)[number];

export interface RedFlag {
  code: FlagCode;
  detail: string;
  severity: "high" | "info";
}

export interface LabelFields {
  productName: string;
  manufacturer: string;
  batch: string;
  expiry: string;
  registrationNumber: string;
  otherText: string;
}

export type FieldConfidence = "high" | "medium" | "low" | "unreadable";

export interface FieldRead {
  key:
    | "brand"
    | "inn"
    | "strength"
    | "form"
    | "manufacturer"
    | "country"
    | "registrationNumber"
    | "batch"
    | "manufactured"
    | "expiry";
  label: string;
  value: string;
  confidence: FieldConfidence;
}

export interface Gs1Report {
  raw: string;
  gtin: string;
  gtinValid: boolean;
  expiry: string;
  batch: string;
  serial: string;
  batchMatch: "match" | "mismatch" | "missing";
  expiryMatch: "match" | "mismatch" | "missing";
  flags: RedFlag[];
  summary: string;
}

export interface RegisterLine {
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface RegisterScore {
  found: boolean;
  score: number;
  max: number;
  lines: RegisterLine[];
  note: string;
}

export interface VisualReport {
  referenceId: string | null;
  referenceLabel: string;
  image: string | null;
  compared: boolean;
  hints: string[];
  caveat: string;
}

export interface EvidenceItem {
  role: "match" | "reviewed" | "searched";
  title: string;
  url: string;
  publisher: string;
  note: string;
}

export interface ReportChannel {
  label: string;
  value: string;
  href: string;
}

export type CheckOutcome = "verdict" | "search_failed";
export type MatchKind = "exact_batch" | "name_only" | "none";
export type PresentationId = "do_not_use" | "check_first" | "no_alerts" | "unsure";

export interface MedicineResult {
  mode: "medicine";
  runMode: "demo" | "live";
  demoReason: string;
  /** search_failed means the UI must not show a verdict. */
  outcome: CheckOutcome;
  presentation: PresentationId;
  /** 0 to 1. Below 0.6 the UI shows “We’re not sure”. */
  confidence: number;
  match: MatchKind;
  verdict: VerdictId;
  verdictLabel: string;
  headline: string;
  summary: string;
  pharmacistNote: string;
  flags: RedFlag[];
  fields: LabelFields;
  /** Per-field read. Unreadable means the value was left blank on purpose. */
  reads: FieldRead[];
  oddities: string[];
  gs1: Gs1Report | null;
  register: RegisterScore;
  visual: VisualReport;
  /** Honest band from the research brief. Not a claim the pack is genuine. */
  band: string;
  evidence: EvidenceItem[];
  actions: string[];
  report: ReportChannel[];
  trace: TraceStep[];
  disclaimer: string;
  limitations: string[];
  checkedAt: string;
  asOf: string;
}

export interface VerifyBody {
  mode?: string;
  scenarioId?: string;
  forceDemo?: boolean;
  productName?: string;
  manufacturer?: string;
  batch?: string;
  expiry?: string;
  registrationNumber?: string;
  otherText?: string;
  imageDataUrl?: string;
  /** GS1 element string decoded on the phone, or pasted. Never fetched from the network. */
  gs1Raw?: string;
  /** Reply the person pasted after texting a scratch code to 1393. */
  scratchReply?: string;
}
