import { honestBand } from "../../cabinet/logic";
import { fixedActionLines, scrubUnlistedContacts } from "../../brand";
import { TokenBudget, outputTokenCap, requestTokenBudget } from "../../budget";
import { demoDecision, modelSelection } from "../../env";
import { crossCheckGs1 } from "../../gs1";
import { MODEL_ROLES } from "../../models";
import type { CheckMode, TraceStep } from "../types";
import { DISCLAIMER, PHARMACIST_NOTE, enforceSafety } from "../../safety";
import { asString, formatLongDate, safeHttpUrl } from "../../text";
import { presentAssessment, withholdVerdict } from "./present";
import { imageMessage, nebiusJson, ProviderError, spendNote } from "../../providers/nebius";
import { searchPublicAlerts } from "../../providers/tavily";
import { assessMedicine, isFlagCode } from "./assess";
import { normalizePrompt, verdictPrompt, visionPrompt } from "./prompts";
import { consistencyFlags, exampleReads, parseVisionPayload } from "./reads";
import { scoreRegister } from "./register";
import { REPORT_CHANNELS, RESULT_LIMITATIONS } from "./report";
import { getScenario } from "./scenarios";
import { scratchFlags } from "./scratch";
import type { EvidenceItem, FieldRead, LabelFields, MedicineResult, RedFlag, VerifyBody } from "./types";
import { visualHints } from "./visual";

export type CheckHooks = {
  onStage?: (step: TraceStep) => void;
};
import { VERDICT_LABEL } from "./types";

export class MedicineModeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MedicineModeError";
  }
}

const EMPTY_FIELDS: LabelFields = {
  productName: "",
  manufacturer: "",
  batch: "",
  expiry: "",
  registrationNumber: "",
  otherText: "",
};

function paceMs(): number {
  const raw = Number(process.env.DEMO_PACE_MS ?? "280");
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.min(raw, 2000);
}

async function pace(demo: boolean) {
  if (!demo) return;
  const ms = paceMs();
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}

function fillBlanks(base: LabelFields, extra: Partial<LabelFields>): LabelFields {
  const next = { ...base };
  (Object.keys(next) as (keyof LabelFields)[]).forEach((key) => {
    if (!next[key] && extra[key]) next[key] = asString(extra[key], key === "otherText" ? 500 : 200);
  });
  return next;
}

function readFields(value: unknown): Partial<LabelFields> {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return {
    productName: asString(record.productName),
    manufacturer: asString(record.manufacturer),
    batch: asString(record.batch),
    expiry: asString(record.expiry),
    registrationNumber: asString(record.registrationNumber),
    otherText: asString(record.otherText, 500),
  };
}

function readFlags(value: unknown): RedFlag[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.redFlags)) return [];
  const flags: RedFlag[] = [];
  for (const item of record.redFlags) {
    if (!item || typeof item !== "object") continue;
    const code = asString((item as { code?: unknown }).code, 40);
    const detail = asString((item as { detail?: unknown }).detail, 280);
    if (!isFlagCode(code) || !detail) continue;
    flags.push({ code, detail, severity: code === "missing_registration" ? "info" : "high" });
  }
  return flags;
}

function assertImage(dataUrl: string) {
  if (!dataUrl.startsWith("data:image/")) {
    throw new MedicineModeError("The photo must be an image.", 400);
  }
  if (dataUrl.length > 2_500_000) {
    throw new MedicineModeError("That photo is too large. Try a closer crop of the label.", 400);
  }
}

function dedupeEvidence(items: EvidenceItem[]): EvidenceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const url = safeHttpUrl(item.url);
    if (!url || seen.has(url)) return false;
    seen.add(url);
    item.url = url;
    return true;
  });
}

function trace(partial: Omit<TraceStep, "durationMs"> & { durationMs?: number }): TraceStep {
  return { durationMs: partial.durationMs ?? 0, ...partial };
}

export async function runMedicineCheck(body: VerifyBody, hooks?: CheckHooks): Promise<MedicineResult> {
  const decision = demoDecision(Boolean(body.forceDemo));
  if (decision.liveBlocked) {
    throw new MedicineModeError(decision.reason, 503);
  }

  const scenario = getScenario(asString(body.scenarioId, 80));
  if (body.scenarioId && !scenario) {
    throw new MedicineModeError("That example is not in the demo set.", 400);
  }

  const image = asString(body.imageDataUrl, 2_600_000);
  if (image) assertImage(image);

  const typed = fillBlanks(EMPTY_FIELDS, {
    productName: asString(body.productName),
    manufacturer: asString(body.manufacturer),
    batch: asString(body.batch),
    expiry: asString(body.expiry),
    registrationNumber: asString(body.registrationNumber),
    otherText: asString(body.otherText, 500),
  });

  if (!scenario && !image && !typed.productName && !typed.batch) {
    throw new MedicineModeError("Add a photo, or type the product name or batch number.", 400);
  }
  if (decision.demo && image && !scenario && !typed.productName && !typed.batch) {
    throw new MedicineModeError(
      "Demo mode cannot read a new photo. Type the label, or pick an example. Live reading needs NEBIUS_API_KEY and TAVILY_API_KEY.",
      400,
    );
  }

  const models = modelSelection();
  const demo = decision.demo;
  const budget = new TokenBudget();
  const steps: TraceStep[] = [];
  let parsedReads: FieldRead[] | null = null;
  let oddities: string[] = [];
  const pushStep = (step: TraceStep) => {
    steps.push(step);
    hooks?.onStage?.(step);
  };
  let visionLow = false;
  let fields: LabelFields = scenario ? { ...scenario.fields } : { ...typed };
  if (scenario && !demo) {
    fields = fillBlanks(scenario.fields, typed);
  } else if (!scenario) {
    fields = { ...typed };
  }

  const visionStarted = Date.now();
  await pace(demo);
  if (scenario) {
    pushStep(
      trace({
        id: "vision",
        title: "Reading the pack",
        provider: demo ? "demo" : "rules",
        model: models.vision,
        role: MODEL_ROLES.vision,
        status: demo ? "demo" : "skipped",
        durationMs: Date.now() - visionStarted,
        summary: demo
          ? `Example label “${scenario.title}” was used. ${models.vision} was not called.`
          : `Example label “${scenario.title}” was used as the typed details. No photo was sent to ${models.vision}.`,
      }),
    );
  } else if (!image) {
    pushStep(
      trace({
        id: "vision",
        title: "Reading the pack",
        provider: demo ? "demo" : "nebius",
        model: models.vision,
        role: MODEL_ROLES.vision,
        status: "skipped",
        durationMs: Date.now() - visionStarted,
        summary: "No photo was attached. The typed label was used.",
      }),
    );
  } else if (demo) {
    fields = fillBlanks(fields, typed);
    pushStep(
      trace({
        id: "vision",
        title: "Reading the pack",
        provider: "demo",
        model: models.vision,
        role: MODEL_ROLES.vision,
        status: "demo",
        durationMs: Date.now() - visionStarted,
        summary: `The photo was not read. ${models.vision} was not called. The typed details were used instead.`,
      }),
    );
  } else {
    try {
      const result = await nebiusJson({
        model: models.vision,
        budget,
        messages: [
          { role: "system", content: "You only output JSON. You never give medical advice." },
          imageMessage(visionPrompt(), image),
        ],
      });
      const parsed = parseVisionPayload(result.json);
      parsedReads = parsed.reads;
      oddities = parsed.oddities;
      const seen = parsed.fields;
      if (parsed.visionLow) {
        visionLow = true;
        if (!typed.batch) seen.batch = "";
        if (!typed.expiry) seen.expiry = "";
      }
      fields = fillBlanks(seen as LabelFields, typed);
      fields = fillBlanks(fields, seen);
      const typedWins = fillBlanks(EMPTY_FIELDS, typed);
      fields = { ...fields, ...Object.fromEntries(Object.entries(typedWins).filter(([, value]) => value)) } as LabelFields;
      pushStep(
        trace({
          id: "vision",
          title: "Reading the pack",
          provider: "nebius",
          model: result.model,
          role: MODEL_ROLES.vision,
          status: "ok",
          durationMs: Date.now() - visionStarted,
          summary: `The photo was read with ${result.model}. Typed fields override the read where you entered them. ${spendNote(result)}`,
        }),
      );
    } catch (error) {
      if (!typed.productName && !typed.batch) {
        const message = error instanceof Error ? error.message : "The photo could not be read.";
        throw new MedicineModeError(message, 502);
      }
      fields = { ...typed };
      pushStep(
        trace({
          id: "vision",
          title: "Reading the pack",
          provider: "nebius",
          model: models.vision,
          role: MODEL_ROLES.vision,
          status: "error",
          durationMs: Date.now() - visionStarted,
          summary: "The photo could not be read. The typed details were used.",
        }),
      );
    }
  }

  let extraFlags: RedFlag[] = [];
  const normalizeStarted = Date.now();
  await pace(demo);
  if (demo) {
    pushStep(
      trace({
        id: "normalize",
        title: "Checking the label",
        provider: "demo",
        model: models.normalize,
        role: MODEL_ROLES.normalize,
        status: "demo",
        durationMs: Date.now() - normalizeStarted,
        summary: `${models.normalize} was not called. A fixed rules pass flagged expiry, spelling, missing fields, and known batches.`,
      }),
    );
  } else {
    try {
      const result = await nebiusJson({
        model: models.normalize,
        budget,
        messages: [
          { role: "system", content: "You only output JSON. You never give medical advice." },
          { role: "user", content: normalizePrompt(fields, formatLongDate(new Date())) },
        ],
      });
      const suggested = readFields(result.json);
      fields = fillBlanks(fields, suggested);
      extraFlags = readFlags(result.json);
      pushStep(
        trace({
          id: "normalize",
          title: "Checking the label",
          provider: "nebius",
          model: result.model,
          role: MODEL_ROLES.normalize,
          status: "ok",
          durationMs: Date.now() - normalizeStarted,
          summary: `${
            extraFlags.length
              ? `The model added ${extraFlags.length} flag${extraFlags.length === 1 ? "" : "s"}.`
              : "The model returned no extra flags."
          } Rules still check expiry, spelling, and known notices. ${spendNote(result)}`,
        }),
      );
    } catch (error) {
      const message = error instanceof ProviderError ? error.message : "Normalisation failed.";
      pushStep(
        trace({
          id: "normalize",
          title: "Checking the label",
          provider: "nebius",
          model: models.normalize,
          role: MODEL_ROLES.normalize,
          status: "error",
          durationMs: Date.now() - normalizeStarted,
          summary: `The model step failed (${message}). Rules still produced the flags.`,
        }),
      );
    }
  }

  let evidenceFailed = false;
  let reviewed: EvidenceItem[] = [];
  const evidenceStarted = Date.now();
  await pace(demo);
  if (demo) {
    pushStep(
      trace({
        id: "evidence",
        title: "Searching FDA alerts",
        provider: "demo",
        model: "tavily/search",
        role: MODEL_ROLES.evidence,
        status: "demo",
        durationMs: Date.now() - evidenceStarted,
        summary:
          "Tavily was not called. The check used the bundled snapshot of Ghana FDA and WHO notices, which is not a live or complete register.",
      }),
    );
  } else {
    try {
      const search = await searchPublicAlerts(fields.productName, fields.batch);
      reviewed = search.hits.map((hit) => ({
        role: "reviewed" as const,
        title: hit.title,
        url: hit.url,
        publisher: hit.publisher,
        note: hit.content || "Retrieved by Tavily. Compare it with the pack yourself.",
      }));
      pushStep(
        trace({
          id: "evidence",
          title: "Searching FDA alerts",
          provider: "tavily",
          model: "tavily/search",
          role: MODEL_ROLES.evidence,
          status: search.partial ? "fallback" : "ok",
          durationMs: Date.now() - evidenceStarted,
          summary: search.partial
            ? `Tavily returned ${reviewed.length} page${reviewed.length === 1 ? "" : "s"}, but one of the two FDA searches failed. The search stays on fdaghana.gov.gh.`
            : `Tavily returned ${reviewed.length} FDA Ghana page${reviewed.length === 1 ? "" : "s"}. The search is limited to fdaghana.gov.gh.`,
        }),
      );
    } catch (error) {
      evidenceFailed = true;
      const message = error instanceof ProviderError ? error.message : "Search failed.";
      pushStep(
        trace({
          id: "evidence",
          title: "Searching FDA alerts",
          provider: "tavily",
          model: "tavily/search",
          role: MODEL_ROLES.evidence,
          status: "error",
          durationMs: Date.now() - evidenceStarted,
          summary: `Tavily did not return results (${message}). The verdict cannot be “no alerts found”.`,
        }),
      );
    }
  }

  const gs1Raw = asString(body.gs1Raw, 500) || scenario?.gs1Raw || "";
  const manufactured =
    parsedReads?.find((read) => read.key === "manufactured" && (read.confidence === "high" || read.confidence === "medium"))?.value ??
    "";
  const gs1 = gs1Raw ? crossCheckGs1(gs1Raw, { batch: fields.batch, expiry: fields.expiry }) : null;
  const ruleFlags = [
    ...extraFlags,
    ...(gs1?.flags ?? []),
    ...scratchFlags(asString(body.scratchReply, 500)),
    ...consistencyFlags(fields.expiry, manufactured),
  ];
  const assessment = assessMedicine(
    { ...fields, evidenceSearchFailed: evidenceFailed, extraFlags: ruleFlags },
    new Date(),
  );
  const evidence = dedupeEvidence([...assessment.evidence, ...reviewed]);
  const allowed = new Set(evidence.map((item) => item.url));

  let headline = assessment.headline;
  let summary = assessment.summary;
  let actions = assessment.actions;
  let pharmacistNote = assessment.pharmacistNote;

  const curatedMatch = assessment.evidence.some((item) => item.role === "match");
  const searchBlocked = withholdVerdict(demo, evidenceFailed, curatedMatch);

  const verdictStarted = Date.now();
  await pace(demo);
  if (demo) {
    pushStep(
      trace({
        id: "verdict",
        title: "Matching your batch",
        provider: "demo",
        model: models.verdict,
        role: MODEL_ROLES.verdict,
        status: "demo",
        durationMs: Date.now() - verdictStarted,
        summary: `${models.verdict} was not called. The wording comes from the rules and the bundled FDA notices. Category: ${assessment.verdictLabel}. Live text steps use Nano. Each call is capped at ${outputTokenCap()} output tokens, and the whole check at ${requestTokenBudget()} tokens. Ultra is not on the live path.`,
      }),
    );
  } else if (!searchBlocked) {
    try {
      const result = await nebiusJson({
        model: models.verdict,
        budget,
        messages: [
          { role: "system", content: "You only output JSON. You never give medical advice." },
          {
            role: "user",
            content: verdictPrompt({
              fields: assessment.fields,
              flags: assessment.flags,
              evidence,
              verdict: assessment.verdict,
              today: assessment.asOf,
            }),
          },
        ],
      });
      const draftJson = result.json && typeof result.json === "object" ? (result.json as Record<string, unknown>) : {};
      const drafted = enforceSafety(
        {
          headline: asString(draftJson.headline, 140),
          summary: asString(draftJson.summary, 1200),
          actions: Array.isArray(draftJson.actions) ? draftJson.actions.map((item) => asString(item, 240)).filter(Boolean) : [],
          pharmacistNote: asString(draftJson.pharmacistNote, 320) || PHARMACIST_NOTE,
        },
        {
          headline: assessment.headline,
          summary: assessment.summary,
          actions: assessment.actions,
          pharmacistNote: assessment.pharmacistNote,
        },
        assessment.verdict,
      );
      headline = drafted.headline.replace(/https?:\/\/\S+/g, (url) => (allowed.has(url.replace(/[.,)]$/, "")) ? url : ""));
      summary = drafted.summary.replace(/https?:\/\/\S+/g, (url) => (allowed.has(url.replace(/[.,)]$/, "")) ? url : ""));
      actions = drafted.actions;
      pharmacistNote = drafted.pharmacistNote;
      pushStep(
        trace({
          id: "verdict",
          title: "Matching your batch",
          provider: "nebius",
          model: result.model,
          role: MODEL_ROLES.verdict,
          status: "ok",
          durationMs: Date.now() - verdictStarted,
          summary: `The model wrote the wording. The category stayed “${assessment.verdictLabel}”, which the rules set and the model was not allowed to downgrade. ${spendNote(result)}`,
        }),
      );
    } catch (error) {
      const message = error instanceof ProviderError ? error.message : "Verdict wording failed.";
      pushStep(
        trace({
          id: "verdict",
          title: "Matching your batch",
          provider: "nebius",
          model: models.verdict,
          role: MODEL_ROLES.verdict,
          status: "error",
          durationMs: Date.now() - verdictStarted,
          summary: `The model step failed (${message}). The rules wording was kept. Category: ${assessment.verdictLabel}.`,
        }),
      );
    }
  } else {
    pushStep(
      trace({
        id: "verdict",
        title: "Matching your batch",
        provider: "rules",
        model: null,
        role: MODEL_ROLES.verdict,
        status: "skipped",
        durationMs: Date.now() - verdictStarted,
        summary: "The FDA search did not answer, and no bundled FDA notice matched. No verdict was given.",
      }),
    );
  }

  const safe = enforceSafety(
    { headline, summary, actions, pharmacistNote },
    {
      headline: assessment.headline,
      summary: assessment.summary,
      actions: assessment.actions,
      pharmacistNote: assessment.pharmacistNote,
    },
    assessment.verdict,
  );
  const presented = presentAssessment(assessment, { visionLow });
  const presentation = searchBlocked ? "unsure" : presented.presentation;
  const fallbackReads = exampleReads(assessment.fields);
  const register = scoreRegister(assessment.fields);
  const band = honestBand(presentation, register.found);

  return {
    mode: "medicine",
    runMode: demo ? "demo" : "live",
    demoReason: decision.reason,
    outcome: searchBlocked ? "search_failed" : "verdict",
    presentation,
    confidence: searchBlocked ? 0 : presented.confidence,
    match: presented.match,
    verdict: assessment.verdict,
    verdictLabel: VERDICT_LABEL[assessment.verdict],
    headline: searchBlocked ? "The FDA search didn’t answer" : scrubUnlistedContacts(safe.headline),
    summary: searchBlocked
      ? "We won’t guess a verdict without FDA Ghana pages. Try again in a moment."
      : scrubUnlistedContacts(safe.summary),
    pharmacistNote: PHARMACIST_NOTE,
    flags: assessment.flags,
    fields: assessment.fields,
    reads: parsedReads ?? fallbackReads.reads,
    oddities: parsedReads ? oddities : fallbackReads.oddities,
    gs1,
    register,
    visual: visualHints(assessment.fields.productName),
    band,
    evidence,
    actions: fixedActionLines(presentation),
    report: REPORT_CHANNELS,
    trace: steps,
    disclaimer: DISCLAIMER,
    limitations: RESULT_LIMITATIONS,
    checkedAt: new Date().toISOString(),
    asOf: assessment.asOf,
  };
}

export const medicineMode: CheckMode<VerifyBody, MedicineResult> = {
  id: "medicine",
  label: "Medicine pack check",
  description:
    "Compare a medicine label with public FDA Ghana alerts. This is the medicine mode a ScamCheck GH shell could mount later.",
  run: runMedicineCheck,
};
