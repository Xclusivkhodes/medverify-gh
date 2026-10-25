import { fixedActionLines, scrubUnlistedContacts } from "@/lib/brand";
import { honestBand } from "@/lib/cabinet/logic";
import { crossCheckGs1 } from "@/lib/gs1";
import { assessMedicine } from "@/lib/modes/medicine/assess";
import { presentAssessment } from "@/lib/modes/medicine/present";
import { consistencyFlags, exampleReads } from "@/lib/modes/medicine/reads";
import { scoreRegister } from "@/lib/modes/medicine/register";
import { REPORT_CHANNELS, RESULT_LIMITATIONS } from "@/lib/modes/medicine/report";
import { getScenario } from "@/lib/modes/medicine/scenarios";
import { scratchFlags } from "@/lib/modes/medicine/scratch";
import type { MedicineResult, VerifyBody } from "@/lib/modes/medicine/types";
import { VERDICT_LABEL } from "@/lib/modes/medicine/types";
import { visualHints } from "@/lib/modes/medicine/visual";
import { DISCLAIMER, PHARMACIST_NOTE } from "@/lib/safety";

/** Typed check from the snapshot saved in the app. No server and no model. */
export function offlineMedicineResult(body: VerifyBody): MedicineResult {
  const scenario = getScenario(body.scenarioId);
  const fields = {
    productName: body.productName || scenario?.fields.productName || "",
    manufacturer: body.manufacturer || scenario?.fields.manufacturer || "",
    batch: body.batch || scenario?.fields.batch || "",
    expiry: body.expiry || scenario?.fields.expiry || "",
    registrationNumber: body.registrationNumber || scenario?.fields.registrationNumber || "",
    otherText: body.otherText || scenario?.fields.otherText || "",
  };
  const gs1Raw = body.gs1Raw || scenario?.gs1Raw || "";
  const gs1 = gs1Raw ? crossCheckGs1(gs1Raw, fields) : null;
  const assessment = assessMedicine(
    {
      ...fields,
      extraFlags: [...(gs1?.flags ?? []), ...scratchFlags(body.scratchReply ?? ""), ...consistencyFlags(fields.expiry, "")],
    },
    new Date(),
  );
  const presented = presentAssessment(assessment);
  const reads = exampleReads(assessment.fields);
  const register = scoreRegister(assessment.fields);
  return {
    mode: "medicine",
    runMode: "demo",
    demoReason: "You are offline. This answer uses the notices saved in the app. Nothing was uploaded.",
    outcome: "verdict",
    presentation: presented.presentation,
    confidence: presented.confidence,
    match: presented.match,
    verdict: assessment.verdict,
    verdictLabel: VERDICT_LABEL[assessment.verdict],
    headline: scrubUnlistedContacts(assessment.headline),
    summary: scrubUnlistedContacts(assessment.summary),
    pharmacistNote: PHARMACIST_NOTE,
    flags: assessment.flags,
    fields: assessment.fields,
    reads: reads.reads,
    oddities: reads.oddities,
    gs1,
    register,
    visual: visualHints(assessment.fields.productName),
    band: honestBand(presented.presentation, register.found),
    evidence: assessment.evidence,
    actions: fixedActionLines(presented.presentation),
    report: REPORT_CHANNELS,
    trace: [
      {
        id: "offline",
        title: "Checked the saved notices",
        provider: "rules",
        model: null,
        role: "Offline snapshot. No photo was sent.",
        status: "demo",
        durationMs: 0,
        summary: "FDA and WHO notices bundled with the app were matched on this phone.",
      },
    ],
    disclaimer: DISCLAIMER,
    limitations: RESULT_LIMITATIONS,
    checkedAt: new Date().toISOString(),
    asOf: assessment.asOf,
  };
}
