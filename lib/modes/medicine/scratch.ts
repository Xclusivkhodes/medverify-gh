import type { RedFlag } from "./types";

const PANEL = /scratch|mpedigree|sproxil|goldkey|1393/i;
const BAD_REPLY = /fake|counterfeit|invalid|not\s+found|do\s+not\s+use|substandard|suspicious|failed/i;

export function sawScratchPanel(text: string): boolean {
  return PANEL.test(text);
}

/** Interpret a reply the person pasted from SMS 1393. This does not send an SMS. */
export function scratchFlags(reply: string): RedFlag[] {
  const text = reply.replace(/\s+/g, " ").trim();
  if (!text) return [];
  if (BAD_REPLY.test(text)) {
    return [
      {
        code: "scratch_failed",
        severity: "high",
        detail: "The pasted scratch-code reply does not confirm the code. Treat the pack as check first, and keep any FDA batch match as do not use.",
      },
    ];
  }
  return [
    {
      code: "scratch_pasted",
      severity: "info",
      detail:
        "A scratch-code reply was pasted. Those codes cover some brands only, and a reply does not show the pack is free of quality problems. It does not override an FDA or WHO batch match.",
    },
  ];
}
