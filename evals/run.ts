import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assessMedicine, type AssessInput } from "../lib/modes/medicine/assess";
import type { FlagCode, VerdictId } from "../lib/modes/medicine/types";
import { MODEL_DEFAULTS, NEBIUS_BASE_URL_DEFAULT, OPTIONAL_REASONING_MODELS, blockUltra } from "../lib/models";
import { presentAssessment, withholdVerdict } from "../lib/modes/medicine/present";
import { fixedActionLines, scrubUnlistedContacts } from "../lib/brand";
import { isFdaGhanaHost } from "../lib/providers/tavily";
import { modelSelection } from "../lib/env";
import { findBannedPhrase, enforceSafety, PHARMACIST_NOTE } from "../lib/safety";
import { parseExpiry } from "../lib/text";
import { crossCheckGs1, gtinIsValid } from "../lib/gs1";
import { scoreRegister } from "../lib/modes/medicine/register";
import { visualHints } from "../lib/modes/medicine/visual";
import { parseVisionPayload } from "../lib/modes/medicine/reads";
import { scratchFlags } from "../lib/modes/medicine/scratch";
import { honestBand, expiryBucket, noticeFor, makeSimulatedAlert } from "../lib/cabinet/logic";
import { weeklyDigest } from "../lib/modes/medicine/digest";
import { rateLimit } from "../lib/server/limit";
import { demoDecision } from "../lib/env";

interface Expected {
  verdict: VerdictId;
  flagCodesIncludes?: FlagCode[];
  flagCodesExcludes?: FlagCode[];
  evidenceHostIncludes?: string;
  summaryMustMatch?: string[];
  evidenceRole?: "match" | "reviewed" | "searched";
}

interface CaseFile {
  id: string;
  note: string;
  input: AssessInput;
  expected: Expected;
}

const fixedNow = new Date("2026-10-25T12:00:00Z");
const cases = JSON.parse(readFileSync(resolve(process.cwd(), "evals/cases.json"), "utf8")) as CaseFile[];
const live = process.argv.includes("--live");
const failures: string[] = [];

function fail(id: string, message: string) {
  failures.push(`${id}: ${message}`);
}

for (const testCase of cases) {
  const result = assessMedicine(testCase.input, fixedNow);
  const expected = testCase.expected;
  if (result.verdict !== expected.verdict) {
    fail(testCase.id, `verdict ${result.verdict}, expected ${expected.verdict}`);
  }
  const codes = new Set(result.flags.map((flag) => flag.code));
  for (const code of expected.flagCodesIncludes ?? []) {
    if (!codes.has(code)) fail(testCase.id, `missing flag ${code}`);
  }
  for (const code of expected.flagCodesExcludes ?? []) {
    if (codes.has(code)) fail(testCase.id, `unexpected flag ${code}`);
  }
  if (expected.evidenceHostIncludes) {
    const hosts = result.evidence.map((item) => {
      try {
        return new URL(item.url).hostname;
      } catch {
        return "";
      }
    });
    if (!hosts.some((host) => host.includes(expected.evidenceHostIncludes!))) {
      fail(testCase.id, `no evidence host ${expected.evidenceHostIncludes}`);
    }
  }
  if (expected.evidenceRole && !result.evidence.some((item) => item.role === expected.evidenceRole)) {
    fail(testCase.id, `no evidence with role ${expected.evidenceRole}`);
  }
  for (const pattern of expected.summaryMustMatch ?? []) {
    if (!new RegExp(pattern, "i").test(result.summary)) {
      fail(testCase.id, `summary did not match /${pattern}/`);
    }
  }
  if (!/pharmacist/i.test(result.pharmacistNote)) {
    fail(testCase.id, "pharmacist note missing");
  }
  const blob = [result.headline, result.summary, result.pharmacistNote, ...result.actions].join("\n");
  const banned = findBannedPhrase(blob);
  if (banned) fail(testCase.id, `banned phrase /${banned}/`);
  if (result.verdict === "no_alerts" && result.evidence.some((item) => item.role === "match")) {
    fail(testCase.id, "no_alerts result still has a matching notice");
  }
  if (result.verdict === "alert_match" && !/do not use/i.test(result.summary)) {
    fail(testCase.id, "alert match did not say do not use");
  }
}

const april = parseExpiry("04/2025");
if (april.kind !== "date" || april.iso !== "2025-04-30") {
  fail("expiry-parse", `04/2025 parsed as ${JSON.stringify(april)}`);
}
const month = parseExpiry("Apr 2025");
if (month.kind !== "date" || month.iso !== "2025-04-30") {
  fail("expiry-parse", `Apr 2025 parsed as ${JSON.stringify(month)}`);
}

const scrubbed = enforceSafety(
  {
    headline: "This pack is safe to take",
    summary: "The product is genuine and the recommended dose is fine.",
    actions: ["You should take it tonight"],
    pharmacistNote: "No need to ask anyone",
  },
  {
    headline: "No matching public alert found",
    summary: "This does not show the pack is free of quality problems, or that it is right for you.",
    actions: ["Consult a pharmacist."],
    pharmacistNote: PHARMACIST_NOTE,
  },
  "no_alerts",
);
if (findBannedPhrase([scrubbed.headline, scrubbed.summary, ...scrubbed.actions].join(" "))) {
  fail("safety-scrub", "banned wording survived enforceSafety");
}
if (!/pharmacist/i.test(scrubbed.pharmacistNote)) {
  fail("safety-scrub", "fallback dropped the pharmacist note");
}

if (!process.env.NEBIUS_VISION_MODEL && modelSelection().vision !== MODEL_DEFAULTS.vision) {
  fail("models", `vision default changed: ${modelSelection().vision}`);
}
if (!process.env.NEBIUS_NORMALIZE_MODEL && modelSelection().normalize !== MODEL_DEFAULTS.normalize) {
  fail("models", `normalize default changed: ${modelSelection().normalize}`);
}
if (!process.env.NEBIUS_VERDICT_MODEL && modelSelection().verdict !== MODEL_DEFAULTS.verdict) {
  fail("models", `verdict default changed: ${modelSelection().verdict}`);
}
if (!process.env.NEBIUS_BASE_URL && modelSelection().baseUrl !== NEBIUS_BASE_URL_DEFAULT) {
  fail("models", `base URL default changed: ${modelSelection().baseUrl}`);
}

if (live) {
  console.log("Live calls are disabled in this harness. It will not contact Nebius or Tavily.");
}

async function main() {
const { extractAssistantText } = await import("../lib/providers/answer");
const { TokenBudget, DEFAULT_MAX_TOKENS, HARD_MAX_TOKENS, outputTokenCap } = await import("../lib/budget");
const { cacheClear, cacheGet, cacheKey, cacheSet } = await import("../lib/providers/cache");

const fromContent = extractAssistantText({ content: '{"ok":true}', reasoning_content: "thinking" });
if (fromContent.source !== "content") fail("reasoning", "content should win when it is JSON");

const fromReasoning = extractAssistantText(
  { content: null, reasoning_content: "Still working.\n{\"headline\":\"Hi\"}" },
  "length",
);
if (fromReasoning.source !== "reasoning_content" || !fromReasoning.text.includes("headline")) {
  fail("reasoning", "did not recover JSON from reasoning_content");
}

let refused = false;
try {
  extractAssistantText({ content: "", reasoning_content: "still thinking, no json yet" }, "length");
} catch (error) {
  refused = error instanceof Error && /token cap/i.test(error.message);
}
if (!refused) fail("reasoning", "prose-only reasoning should fail closed");

const budget = new TokenBudget(1000);
if (!budget.tryReserve(512)) fail("budget", "first reservation should fit");
budget.settle(512, { prompt: 100, completion: 50 });
if (budget.remainingTokens() !== 850) fail("budget", `remaining ${budget.remainingTokens()}, expected 850`);
if (budget.tryReserve(900)) fail("budget", "reservation above the remainder should be refused");

cacheClear();
const key = cacheKey({ kind: "unit", value: 1 });
if (cacheGet(key)) fail("cache", "empty cache returned a hit");
cacheSet(key, { text: "{\"ok\":true}", usage: null, answerSource: "content" });
if (cacheGet(key)?.text !== "{\"ok\":true}") fail("cache", "cache missed a stored answer");

if (!process.env.NEBIUS_MAX_TOKENS && outputTokenCap() !== DEFAULT_MAX_TOKENS) {
  fail("budget", `default cap ${outputTokenCap()}, expected ${DEFAULT_MAX_TOKENS}`);
}
if (outputTokenCap() > HARD_MAX_TOKENS) fail("budget", "cap exceeded the hard ceiling");

process.env.DEMO_MODE = "true";
const { resetLiveAttempts, liveAttemptCount } = await import("../lib/providers/nebius");
const { resetTavilyAttempts, tavilyAttemptCount } = await import("../lib/providers/tavily");
const { runMedicineCheck } = await import("../lib/modes/medicine/pipeline");
resetLiveAttempts();
resetTavilyAttempts();
const offline = await runMedicineCheck({ scenarioId: "harbour-clear", forceDemo: true });
if (liveAttemptCount() !== 0 || tavilyAttemptCount() !== 0) {
  fail("offline", `demo check attempted live calls (nebius ${liveAttemptCount()}, tavily ${tavilyAttemptCount()})`);
}
if (offline.runMode !== "demo" || offline.verdict !== "no_alerts") {
  fail("offline", `demo path returned ${offline.runMode} / ${offline.verdict}`);
}

const para = await runMedicineCheck({ scenarioId: "para-clear-l220008", forceDemo: true });
if (para.outcome !== "verdict" || para.presentation !== "do_not_use" || para.match !== "exact_batch") {
  fail("present-demo", `Para Clear returned ${para.outcome} / ${para.presentation} / ${para.match}`);
}
if (!para.fields.batch || !para.actions.join(" ").includes("055 111 2224") || !para.actions.join(" ").includes("adr.fdaghana.gov.gh")) {
  fail("present-demo", "Para Clear dropped the batch or the fixed contacts");
}
if (liveAttemptCount() !== 0 || tavilyAttemptCount() !== 0) {
  fail("present-demo", "example check called a live provider");
}

const exact = assessMedicine(
  { productName: "Para Clear Suspension 125", batch: "L220008", expiry: "12/2024" },
  fixedNow,
);
const exactShown = presentAssessment(exact);
if (exactShown.presentation !== "do_not_use" || exactShown.verdictClass !== "verdict--scam" || exactShown.confidence !== 0.98) {
  fail("present", `exact batch presented as ${exactShown.presentation} ${exactShown.confidence}`);
}

const named = presentAssessment(
  assessMedicine({ productName: "HEALMOXY", batch: "ZZ999", expiry: "12/2028", registrationNumber: "FDA-1" }, fixedNow),
);
if (named.presentation !== "do_not_use" || named.match !== "name_only" || named.confidence !== 0.72) {
  fail("present", `name-only alert presented as ${named.presentation} ${named.match} ${named.confidence}`);
}

const low = assessMedicine(
  { productName: "Daily Vitamin C 500", expiry: "12/2028", registrationNumber: "FDA-GH-1", manufacturer: "Local" },
  fixedNow,
);
const lowShown = presentAssessment(low);
if (lowShown.presentation !== "unsure" || lowShown.confidence >= 0.6) {
  fail("present", `low confidence presented as ${lowShown.presentation} (${low.verdict}: ${low.flags.map((flag) => flag.code).join(",")})`);
}

if (!withholdVerdict(false, true, false) || withholdVerdict(true, true, false) || withholdVerdict(false, true, true)) {
  fail("present", "withholdVerdict did not match the failed-search rule");
}

const phones = scrubUnlistedContacts("Call 024 123 4567 or 112 now.");
if (phones.includes("024") || !phones.includes("112")) fail("contacts", `scrub kept an unlisted number: ${phones}`);
const lines = fixedActionLines("do_not_use").join(" ");
if (!lines.includes("112") || !lines.includes("055 111 2224") || !lines.includes("adr.fdaghana.gov.gh")) {
  fail("contacts", "fixed actions dropped a required contact");
}

if (!isFdaGhanaHost("https://www.fdaghana.gov.gh/safety-alert")) fail("tavily", "FDA host was rejected");
if (isFdaGhanaHost("https://who.int/news") || isFdaGhanaHost("https://evilfdaghana.gov.gh/alert")) {
  fail("tavily", "a non-FDA host was accepted");
}
if (blockUltra(OPTIONAL_REASONING_MODELS.ultra, MODEL_DEFAULTS.verdict) !== MODEL_DEFAULTS.verdict) {
  fail("models", "Ultra was left on the live path");
}
if (blockUltra(OPTIONAL_REASONING_MODELS.super, MODEL_DEFAULTS.verdict) !== OPTIONAL_REASONING_MODELS.super) {
  fail("models", "Super was blocked");
}

if (!gtinIsValid("09506000134352") || gtinIsValid("09506000134353")) {
  fail("gs1", "GTIN check digit disagreed with 09506000134352");
}
const matchedCode = crossCheckGs1("(01)09506000134352(17)280930(10)CV-44012(21)DEMO0001", {
  batch: "CV-44012",
  expiry: "2028-09",
});
if (!matchedCode || matchedCode.batchMatch !== "match" || matchedCode.expiryMatch !== "match" || matchedCode.flags.length) {
  fail("gs1", `matching code was ${matchedCode?.batchMatch}/${matchedCode?.expiryMatch}`);
}
const clashingCode = crossCheckGs1("(01)09506000134352(17)240131(10)OTHER99(21)Z", {
  batch: "GL-100",
  expiry: "01/2025",
});
if (!clashingCode?.flags.some((flag) => flag.code === "gs1_mismatch")) fail("gs1", "mismatch did not flag");

const clear = await runMedicineCheck({ scenarioId: "clearview-drops", forceDemo: true });
if (clear.presentation !== "no_alerts" || clear.band !== "Registered, no alerts" || clear.gs1?.batchMatch !== "match") {
  fail("cabinet-demo", `${clear.presentation} / ${clear.band} / ${clear.gs1?.batchMatch}`);
}
if (!clear.reads.some((read) => read.key === "batch" && read.confidence === "high")) {
  fail("reads", "example batch was not high confidence");
}
if (liveAttemptCount() !== 0 || tavilyAttemptCount() !== 0) fail("cabinet-demo", "clearview called a live provider");

const clash = await runMedicineCheck({
  forceDemo: true,
  productName: "Harbour Paracetamol 500 mg Tablets",
  manufacturer: "Harbour Labs",
  batch: "HB-88421",
  expiry: "2028-06",
  registrationNumber: "DEMO-FDA-10442",
  gs1Raw: "(01)09506000134352(17)240131(10)OTHER99(21)Z",
});
if (clash.presentation !== "check_first" || !clash.flags.some((flag) => flag.code === "gs1_mismatch")) {
  fail("gs1", `barcode clash presented as ${clash.presentation}`);
}

const unreadable = parseVisionPayload({
  brand: { value: "ClearView", confidence: "high" },
  batch: { value: "L220008", confidence: "unreadable" },
  expiry: { value: "12/2028", confidence: "low" },
  oddities: ["uneven ink"],
});
if (unreadable.fields.batch || unreadable.fields.expiry || unreadable.fields.productName !== "ClearView" || !unreadable.visionLow) {
  fail("reads", "low or unreadable fields were kept");
}

const registered = scoreRegister({
  productName: "ClearView Eye Drops",
  manufacturer: "ClearView Labs",
  batch: "CV-44012",
  expiry: "2028-09",
  registrationNumber: "DEMO-FDA-22018",
  otherText: "",
});
if (!registered.found || registered.score < 70) fail("register", `score ${registered.score} found ${registered.found}`);

const hints = visualHints("ClearView Eye Drops");
if (!hints.compared || !/cannot prove/i.test(hints.caveat) || /this (product|medicine|pack) is genuine/i.test(hints.hints.join(" "))) {
  fail("visual", "reference hints were missing or overclaimed");
}
if (scratchFlags("Code invalid").some((flag) => flag.code !== "scratch_failed")) fail("scratch", "bad SMS was not flagged");
if (scratchFlags("").length) fail("scratch", "empty reply flagged");

const simulated = makeSimulatedAlert({ productName: "ClearView Eye Drops", batch: "CV-44012" }, fixedNow);
const watched = noticeFor({ productName: "ClearView Eye Drops", batch: "CV-44012", simulatedAlert: simulated });
if (watched?.kind !== "simulated" || !watched.url.includes("fdaghana.gov.gh")) fail("watch", "simulated notice missing");
if (honestBand("no_alerts", true) !== "Registered, no alerts") fail("band", "registered band missing");
if (honestBand("do_not_use", false) !== "Matches an alert: don't use") fail("band", "alert band missing");
if (expiryBucket("2026-11-01", fixedNow) !== "soon" || expiryBucket("2024-01-01", fixedNow) !== "expired") {
  fail("reminders", "expiry buckets disagreed");
}
if (weeklyDigest().length < 5) fail("digest", "digest was empty");

for (let i = 0; i < 3; i += 1) {
  if (!rateLimit("eval-ip", 3).ok) fail("limit", "early request was refused");
}
if (rateLimit("eval-ip", 3).ok) fail("limit", "limit did not trip");

process.env.LLM_ENABLED = "false";
process.env.DEMO_MODE = "false";
if (!demoDecision().demo) fail("llm", "LLM_ENABLED did not force demo");
delete process.env.LLM_ENABLED;
process.env.DEMO_MODE = "true";

console.log(`MedVerify GH evals — ${cases.length} labelled cases — as of 25 October 2026`);
if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("All cases passed.");
console.log("Gate covers the rules layer (verdict, flags, citations, safety wording).");
console.log("It does not call Nebius or Tavily. Live wording still needs keys and a manual or --live check.");
}

void main();
