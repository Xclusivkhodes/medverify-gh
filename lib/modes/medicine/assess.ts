import { ALERTS, SNAPSHOT_PAGES, type AlertRecord } from "./corpus";
import { REPORT_CHANNELS } from "./report";
import type { EvidenceItem, FlagCode, LabelFields, RedFlag, VerdictId } from "./types";
import { VERDICT_LABEL } from "./types";
import { PHARMACIST_NOTE } from "../../safety";
import {
  formatLongDate,
  ghanaDate,
  levenshtein,
  normBatch,
  normName,
  parseExpiry,
  safeHttpUrl,
} from "../../text";

export interface AssessInput {
  productName?: string | null;
  manufacturer?: string | null;
  batch?: string | null;
  expiry?: string | null;
  registrationNumber?: string | null;
  otherText?: string | null;
  evidenceSearchFailed?: boolean;
  extraFlags?: RedFlag[];
}

export interface CorpusMatch {
  alert: AlertRecord;
  nameMatched: boolean;
  batchMatched: boolean;
  strength: "batch" | "name";
}

export interface Assessment {
  fields: LabelFields;
  flags: RedFlag[];
  matches: CorpusMatch[];
  verdict: VerdictId;
  verdictLabel: string;
  headline: string;
  summary: string;
  actions: string[];
  pharmacistNote: string;
  evidence: EvidenceItem[];
  asOf: string;
}

const INNS = [
  "amoxicillin",
  "paracetamol",
  "ibuprofen",
  "metronidazole",
  "ciprofloxacin",
  "artemether",
  "lumefantrine",
  "artesunate",
  "oxytocin",
  "cabergoline",
  "albendazole",
  "azithromycin",
  "doxycycline",
  "cefuroxime",
  "diclofenac",
  "omeprazole",
  "losartan",
  "amlodipine",
  "metformin",
];

const WORD_FIXES: Record<string, string> = {
  amoxcilin: "amoxicillin",
  amoxicilin: "amoxicillin",
  amoxcillin: "amoxicillin",
  paracetemol: "paracetamol",
  paracetmol: "paracetamol",
  ibuprofin: "ibuprofen",
  capusles: "capsules",
  capsuls: "capsules",
  tabltes: "tablets",
  tabletes: "tablets",
  suspention: "suspension",
  syurp: "syrup",
};

const KNOWN_WORDS = new Set([
  ...INNS,
  "capsules",
  "capsule",
  "tablets",
  "tablet",
  "suspension",
  "syrup",
  "injection",
  "solution",
  "ointment",
  "harbour",
  "labs",
]);

const KNOWN_FLAG_CODES = new Set<FlagCode>([
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
]);

function clean(value: string | null | undefined, max = 200): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function blank(value: string): boolean {
  const v = value.trim().toLowerCase();
  return !v || v === "n/a" || v === "na" || v === "none" || v === "unknown" || v === "-" || v === "nil";
}

function tokens(text: string): string[] {
  return normName(text)
    .split(" ")
    .filter((token) => token.length >= 4 && !/\d/.test(token));
}

function hasWord(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `);
}

function nameMatches(input: string, aliases: string[]): boolean {
  const norm = normName(input);
  if (norm.length < 4) return false;
  for (const alias of aliases) {
    const normalized = normName(alias);
    if (normalized.length >= 5 && hasWord(norm, normalized)) return true;
    const aliasTokens = normalized.split(" ").filter((token) => token.length >= 5);
    if (aliasTokens.length && aliasTokens.every((token) => hasWord(norm, token))) return true;
  }
  return false;
}

function batchIsDistinctive(batch: string): boolean {
  return batch.length >= 5 && /[A-Z]/.test(batch);
}

export function matchAlerts(productName: string, batch: string): CorpusMatch[] {
  const normalizedBatch = normBatch(batch);
  const matches: CorpusMatch[] = [];
  for (const alert of ALERTS) {
    const nameMatched = nameMatches(productName, alert.aliases);
    const batchMatched = alert.batches.some((candidate) => {
      const alertBatch = normBatch(candidate);
      if (alertBatch.length < 4 || normalizedBatch.length < 4) return false;
      return alertBatch === normalizedBatch;
    });
    if (batchMatched && (nameMatched || batchIsDistinctive(normalizedBatch))) {
      matches.push({ alert, nameMatched, batchMatched: true, strength: "batch" });
      continue;
    }
    if (nameMatched) {
      matches.push({ alert, nameMatched: true, batchMatched: false, strength: "name" });
    }
  }
  return matches;
}

function misspellings(text: string): string[] {
  const found: string[] = [];
  for (const token of tokens(text)) {
    const fix = WORD_FIXES[token];
    if (fix) {
      found.push(`“${token}” looks like a misspelling of ${fix}`);
      continue;
    }
    if (KNOWN_WORDS.has(token)) continue;
    let best: { word: string; distance: number } | null = null;
    for (const word of INNS) {
      if (Math.abs(word.length - token.length) > 2) continue;
      const distance = levenshtein(token, word);
      if (distance >= 1 && distance <= 2 && (!best || distance < best.distance)) {
        best = { word, distance };
      }
    }
    if (best) found.push(`“${token}” looks like a misspelling of ${best.word}`);
  }
  return found;
}

function hasNonLatin(text: string): boolean {
  if (/non-english|not in english|foreign language/i.test(text)) return true;
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < 8) return false;
  const nonLatin = letters.filter((char) => !/\p{Script=Latin}/u.test(char));
  return nonLatin.length / letters.length > 0.35;
}

function pushFlag(flags: RedFlag[], flag: RedFlag) {
  if (!flags.some((item) => item.code === flag.code)) flags.push(flag);
}

export function isFlagCode(value: string): value is FlagCode {
  return KNOWN_FLAG_CODES.has(value as FlagCode);
}

function searchedEvidence(note: string): EvidenceItem[] {
  return SNAPSHOT_PAGES.map((page) => ({
    role: "searched" as const,
    title: page.title,
    url: page.url,
    publisher: page.publisher,
    note,
  }));
}

function reportAction(): string {
  return "Call the Ghana FDA on 055 111 2224 or 055 111 2225. Report a side effect at adr.fdaghana.gov.gh. If someone is seriously unwell, call 112.";
}

export function assessMedicine(input: AssessInput, now = new Date()): Assessment {
  const fields: LabelFields = {
    productName: clean(input.productName),
    manufacturer: clean(input.manufacturer),
    batch: clean(input.batch),
    expiry: clean(input.expiry),
    registrationNumber: clean(input.registrationNumber),
    otherText: clean(input.otherText, 500),
  };
  const flags: RedFlag[] = [];
  const today = ghanaDate(now);
  const asOf = formatLongDate(now);

  if (blank(fields.productName)) {
    pushFlag(flags, {
      code: "missing_product_name",
      severity: "high",
      detail: "No product name was provided, so a name search is weak.",
    });
  }
  if (blank(fields.batch)) {
    pushFlag(flags, {
      code: "missing_batch",
      severity: "high",
      detail: "No batch or lot number was provided. Many recalls are batch-specific.",
    });
  }
  if (blank(fields.expiry)) {
    pushFlag(flags, {
      code: "missing_expiry",
      severity: "high",
      detail: "No expiry date was provided.",
    });
  } else if (/^expired$/i.test(fields.expiry)) {
    pushFlag(flags, {
      code: "expired",
      severity: "high",
      detail: "The expiry was entered as already expired.",
    });
  } else {
    const parsed = parseExpiry(fields.expiry);
    if (parsed.kind === "invalid") {
      pushFlag(flags, {
        code: "expiry_unreadable",
        severity: "high",
        detail: `The expiry “${fields.expiry}” could not be read as a date. Use a form like 04/2027 or 2027-04-30.`,
      });
    } else if (parsed.end.getTime() < today.getTime()) {
      pushFlag(flags, {
        code: "expired",
        severity: "high",
        detail: `The expiry ${parsed.iso} is before today in Ghana (${asOf}).`,
      });
    }
  }
  if (blank(fields.registrationNumber)) {
    pushFlag(flags, {
      code: "missing_registration",
      severity: "info",
      detail:
        "No FDA registration number was provided. It may be on another panel. A missing number is a reason to ask a pharmacist, not proof the pack is falsified.",
    });
  }

  const spelling = misspellings(`${fields.productName} ${fields.otherText}`);
  if (spelling.length) {
    pushFlag(flags, {
      code: "misspelling",
      severity: "high",
      detail: spelling.join(" "),
    });
  }
  if (hasNonLatin(`${fields.otherText} ${fields.productName}`)) {
    pushFlag(flags, {
      code: "non_english_label",
      severity: "high",
      detail:
        "The label notes include non-English text. Ghana FDA expects English labelling on registered medicines. Ask a pharmacist to look at the pack.",
    });
  }

  for (const extra of input.extraFlags ?? []) {
    if (extra.code === "batch_on_alert" || extra.code === "name_on_alert") continue;
    if (!isFlagCode(extra.code)) continue;
    pushFlag(flags, extra);
  }

  const matches = matchAlerts(fields.productName, fields.batch);
  const batchMatches = matches.filter((match) => match.strength === "batch");
  const nameOnly = matches.filter((match) => match.strength === "name");

  if (batchMatches.length) {
    const names = batchMatches.map((match) => match.alert.productName).join("; ");
    pushFlag(flags, {
      code: "batch_on_alert",
      severity: "high",
      detail: `This batch number is listed on a public notice for ${names}.`,
    });
  }
  const batchSpecificNameHits = nameOnly.filter((match) => !match.alert.nameAloneIsMatch);
  if (!batchMatches.length && batchSpecificNameHits.length) {
    const described = batchSpecificNameHits
      .map((match) => {
        const batches = match.alert.batches.length ? ` Listed batches include ${match.alert.batches.join(", ")}.` : "";
        return `${match.alert.productName}.${batches}`;
      })
      .join(" ");
    pushFlag(flags, {
      code: "name_on_alert",
      severity: "high",
      detail: `The product name appears in a public alert, but this batch is not one we have listed. ${described}`,
    });
  }

  if (input.evidenceSearchFailed) {
    pushFlag(flags, {
      code: "evidence_search_failed",
      severity: "high",
      detail: "The live public-alert search did not finish. Do not treat the result as an all-clear.",
    });
  }

  const alertHit =
    batchMatches.length > 0 || nameOnly.some((match) => match.alert.nameAloneIsMatch);
  const high = flags.some(
    (flag) =>
      flag.severity === "high" &&
      flag.code !== "batch_on_alert" &&
      !(flag.code === "name_on_alert" && alertHit),
  );
  const registrationOnly =
    flags.length > 0 && flags.every((flag) => flag.code === "missing_registration");

  let verdict: VerdictId = "no_alerts";
  if (alertHit) verdict = "alert_match";
  else if (high || nameOnly.length || input.evidenceSearchFailed || flags.some((flag) => flag.code === "missing_registration")) {
    verdict = "red_flags";
  }
  if (registrationOnly && !input.evidenceSearchFailed) verdict = "red_flags";

  const evidence: EvidenceItem[] = [];
  for (const match of [...batchMatches, ...nameOnly]) {
    const url = safeHttpUrl(match.alert.url);
    if (!url) continue;
    evidence.push({
      role: match.strength === "batch" || match.alert.nameAloneIsMatch ? "match" : "reviewed",
      title: match.alert.urlTitle,
      url,
      publisher: match.alert.source === "ghana-fda" ? "Ghana FDA" : "WHO",
      note: match.alert.summary,
    });
  }
  if (!evidence.some((item) => item.role === "match")) {
    evidence.push(
      ...searchedEvidence(
        "Included in the bundled snapshot. Nothing in that snapshot matched this name and batch.",
      ),
    );
  }

  const copy = renderCopy({ fields, flags, matches, verdict, asOf, evidenceSearchFailed: Boolean(input.evidenceSearchFailed) });

  return {
    fields,
    flags,
    matches,
    verdict,
    verdictLabel: VERDICT_LABEL[verdict],
    headline: copy.headline,
    summary: copy.summary,
    actions: copy.actions,
    pharmacistNote: PHARMACIST_NOTE,
    evidence,
    asOf,
  };
}

function renderCopy(args: {
  fields: LabelFields;
  flags: RedFlag[];
  matches: CorpusMatch[];
  verdict: VerdictId;
  asOf: string;
  evidenceSearchFailed: boolean;
}): { headline: string; summary: string; actions: string[] } {
  const { fields, flags, matches, verdict, asOf, evidenceSearchFailed } = args;
  const batchHits = matches.filter((match) => match.strength === "batch");
  const nameHits = matches.filter((match) => match.strength === "name" && match.alert.nameAloneIsMatch);
  const subject = fields.productName || "This pack";

  if (verdict === "alert_match") {
    const primary = batchHits[0] ?? nameHits[0];
    const headline = batchHits.length
      ? primary.alert.kind === "falsified"
        ? "This batch is named in a falsified-medicine alert"
        : "This batch is named in a public recall or alert"
      : "This product name is in a public alert";
    const sentences = [
      primary.alert.summary,
      batchHits.length
        ? `The batch entered here matches ${batchHits.map((match) => match.alert.batches.filter((batch) => normBatch(batch) === normBatch(fields.batch)).join(", ") || fields.batch).join("; ")}.`
        : "The match is on the product name. Compare the batch on your pack with the notice before you assume it is the affected one.",
    ];
    if (flags.some((flag) => flag.code === "expired")) {
      sentences.push("The expiry date entered is also in the past.");
    }
    sentences.push("Do not use this pack. Consult a pharmacist about what to do next. MedVerify cannot tell you which treatment to use instead.");
    return { headline, summary: sentences.join(" "), actions: alertActions() };
  }

  if (verdict === "red_flags") {
    const headline = redFlagHeadline(flags);
    const parts: string[] = [];
    const nameOnly = matches.filter((match) => match.strength === "name" && !match.alert.nameAloneIsMatch);
    if (nameOnly.length) {
      parts.push(
        `${subject} is close to a public notice, but the batch entered is not one listed in our snapshot. ${nameOnly[0].alert.summary}`,
      );
    }
    for (const flag of flags) {
      if (flag.code === "name_on_alert" || flag.code === "batch_on_alert") continue;
      parts.push(flag.detail);
    }
    if (evidenceSearchFailed) {
      parts.push("Because the live search failed, this cannot be read as “no alerts found”.");
    }
    parts.push(`Checked on ${asOf}. Show the pack to a pharmacist before anyone uses it.`);
    return { headline, summary: parts.join(" "), actions: redFlagActions() };
  }

  const placeholder = /^demo[-\s]/i.test(fields.registrationNumber);
  const summary = [
    `No row in the bundled public-alert snapshot matched ${subject}${fields.batch ? `, batch ${fields.batch}` : ""}.`,
    "No label red flag was raised from the details provided.",
    placeholder
      ? `The registration number ${fields.registrationNumber} is a demonstration placeholder, not a real FDA registration.`
      : "Any registration number here was not checked against a live FDA register.",
    "This does not show the pack is free of quality problems, or that it is right for you.",
    `Checked on ${asOf}. Consult a pharmacist if the price, spelling, or packaging looks unusual.`,
  ];
  return {
    headline: "No matching public alert found",
    summary: summary.join(" "),
    actions: clearActions(),
  };
}

function redFlagHeadline(flags: RedFlag[]): string {
  const codes = new Set(flags.map((flag) => flag.code));
  const meaningful = [...codes].filter((code) => code !== "missing_registration");
  if (meaningful.length === 1 && meaningful[0] === "expired") return "This expiry date has passed";
  if (meaningful.length === 1 && meaningful[0] === "misspelling") return "The label spelling needs a pharmacist";
  if (meaningful.length === 1 && meaningful[0] === "name_on_alert") return "This name appears in a public alert";
  if (meaningful.length === 1 && meaningful[0] === "evidence_search_failed") return "The alert search did not finish";
  if (meaningful.length === 0 && codes.has("missing_registration")) return "No registration number to check";
  return "Red flags — check with a pharmacist";
}

function alertActions(): string[] {
  return [
    "Do not use this pack.",
    "Keep the carton and blister, and note the shop or pharmacy and the date you bought it.",
    "Take it to a pharmacist before anyone uses it.",
    reportAction(),
    "If someone has already taken it and feels unwell, contact a pharmacist or a clinic. This app cannot say what treatment they need.",
  ];
}

function redFlagActions(): string[] {
  return [
    "Do not decide on your own whether this pack is fit to use.",
    "Show it to a pharmacist and ask them to check the name, batch, expiry, and FDA registration.",
    "If a public notice is linked below, read it and compare the batch on your pack.",
    reportAction(),
  ];
}

function clearActions(): string[] {
  return [
    "No matching public alert was found in the sources checked. That is not a reason to skip a pharmacist if you are unsure.",
    "Ask a pharmacist to confirm the pack if anything about the price, spelling, or packaging looks unusual.",
    "If you feel unwell after taking a medicine, speak to a pharmacist or a clinic.",
    reportAction(),
  ];
}

export { REPORT_CHANNELS };
