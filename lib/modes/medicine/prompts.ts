import type { LabelFields } from "./types";
import type { EvidenceItem, RedFlag } from "./types";

export function visionPrompt(): string {
  return [
    "You read medicine-pack labels for a public-alert check in Ghana.",
    "This is not a medical consultation. Do not give advice, a dose, or an opinion about whether the medicine is safe or genuine.",
    "Extract only text you can see. Never invent a batch, expiry, manufacturer, or registration number.",
    "If the batch is blurry, partial, or unreadable, set batch to null. Never guess a digit.",
    "If a field is not visible, use null.",
    "Return a JSON object. Each of these keys is an object {value, confidence}:",
    "brand, inn, strength, form, manufacturer, country, registrationNumber, batch, manufactured, expiry.",
    "confidence is high, medium, low, or unreadable.",
    "If you cannot read a field, set value to null and confidence to unreadable. Never guess a digit.",
    "Also return oddities, an array of short notes about visible misspellings or mixed fonts, and otherText.",
    "expiry value should be the printed text, not a guess.",
    "otherText is any other visible wording that matters, max 400 characters.",
    "If the image is not a medicine label, set productName to null and say so in otherText.",
  ].join(" ");
}

export function normalizePrompt(fields: LabelFields, today: string): string {
  return [
    "You normalise a medicine label for a Ghana FDA alert check.",
    `Today in Ghana is ${today}.`,
    "Do not invent alerts, batches, or registration numbers.",
    "Do not say whether the medicine is safe, genuine, or what dose to take.",
    "Do not give medical advice.",
    "Input JSON:",
    JSON.stringify(fields),
    "Return a JSON object with keys productName, manufacturer, batch, expiry, registrationNumber, otherText, redFlags.",
    "Copy through any input value you are unsure about. You may only fill a field that is empty.",
    "redFlags is an array of {code, detail}. Allowed codes only: misspelling, non_english_label, expiry_unreadable, expired, missing_registration.",
    "Flag misspelling when a word is a near-miss of a common medicine name or of capsule, tablet, suspension, or syrup.",
    "Flag missing_registration only when registrationNumber is empty.",
    "Flag expired only when the expiry date is before today.",
    "Keep details short.",
  ].join(" ");
}

export function verdictPrompt(args: {
  fields: LabelFields;
  flags: RedFlag[];
  evidence: EvidenceItem[];
  verdict: string;
  today: string;
}): string {
  return [
    "You write the wording for a medicine-pack check used by patients and caregivers in Ghana.",
    `Today in Ghana is ${args.today}.`,
    `The verdict category is already decided: ${args.verdict}. Do not change it.`,
    "Rules:",
    "- Never give a dose, a diagnosis, or medical advice.",
    "- Never say the pack is safe, genuine, authentic, or approved.",
    "- Never tell someone to start, stop, or change a treatment, except: when the category is alert_match, tell them not to use that pack and to consult a pharmacist.",
    "- alert_match means a public notice matches. The summary must say “Do not use this pack.”",
    "- no_alerts means no matching public notice was found. Say clearly that this does not show the pack is free of quality problems.",
    "- red_flags means ask a pharmacist before relying on the pack.",
    "- Use only the evidence URLs provided. Do not invent links or notices.",
    "- Mention consulting a pharmacist.",
    "- headline: at most 12 words, no exclamation mark.",
    "- summary: 2 to 5 short sentences, plain language.",
    "- actions: 3 to 5 practical steps. Include how to report to the Ghana FDA (055 111 2224, fda@fda.gov.gh, or the FDA complaint form) when the category is alert_match or red_flags.",
    "Label JSON:",
    JSON.stringify(args.fields),
    "Flags JSON:",
    JSON.stringify(args.flags),
    "Evidence JSON:",
    JSON.stringify(args.evidence.map((item) => ({ role: item.role, title: item.title, url: item.url, note: item.note }))),
    'Return JSON: {"headline":"","summary":"","actions":[""],"pharmacistNote":""}.',
  ].join("\n");
}
