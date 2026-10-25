import { medicineMode } from "./medicine/pipeline";
import type { CheckMode } from "./types";

/**
 * Mode registry.
 * MedVerify GH ships medicine mode only.
 * A sibling ScamCheck GH app can register another CheckMode here and
 * reuse the Nebius client, Tavily client, trace shape, and safety scrub.
 */
export const modes = {
  medicine: medicineMode,
} as const;

export type RegisteredModeId = keyof typeof modes;

export function getMode(id: string): CheckMode<unknown, unknown> | null {
  if (id in modes) return modes[id as RegisteredModeId] as CheckMode<unknown, unknown>;
  return null;
}
