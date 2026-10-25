const BANNED: RegExp[] = [
  /safe to take/i,
  /safe to use/i,
  /safe for you/i,
  /this (product|medicine|pack) is (genuine|authentic|safe|approved)/i,
  /(product|medicine|pack) is genuine/i,
  /(product|medicine|pack) is authentic/i,
  /recommended dose/i,
  /you should take/i,
  /stop your medication/i,
  /stop taking your/i,
  /will cure/i,
  /cures your/i,
];

export function findBannedPhrase(text: string): string | null {
  for (const pattern of BANNED) {
    if (pattern.test(text)) return pattern.source;
  }
  return null;
}

export const PHARMACIST_NOTE =
  "Consult a pharmacist. MedVerify does not give medical advice, a dose, or a personal recommendation to take or stop a medicine.";

export const DISCLAIMER =
  "MedVerify GH compares a pack with public alerts and recalls. It does not give medical advice, does not confirm registration or quality, and does not say whether a medicine is right for you. Always consult a pharmacist.";

export type SafetyCopy = {
  headline: string;
  summary: string;
  actions: string[];
  pharmacistNote: string;
};

export function enforceSafety(draft: SafetyCopy, fallback: SafetyCopy, verdict: string): SafetyCopy {
  let summary = draft.summary.trim();
  const headline = draft.headline.replace(/!/g, "").trim();
  let actions = draft.actions.map((action) => action.trim()).filter(Boolean).slice(0, 6);
  let pharmacistNote = draft.pharmacistNote.trim();

  if (verdict === "no_alerts" && !/not proof|not a safety approval|does not show the pack is free of quality problems/i.test(summary)) {
    summary = `${summary} This does not show the pack is free of quality problems, or that it is right for you.`.trim();
  }
  if (verdict === "alert_match" && !/do not use/i.test(summary)) {
    summary = `${summary} Do not use this pack.`.trim();
  }
  if (!/pharmacist/i.test(`${pharmacistNote} ${summary}`)) {
    pharmacistNote = PHARMACIST_NOTE;
  }
  if (!actions.length) actions = fallback.actions;

  const blob = [headline, summary, pharmacistNote, ...actions].join("\n");
  if (findBannedPhrase(blob)) return fallback;

  return { headline: headline || fallback.headline, summary, actions, pharmacistNote };
}
