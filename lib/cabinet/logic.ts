import type { Presentation } from "../brand";
import { matchAlerts } from "../modes/medicine/assess";
import { FDA_RECALLS_URL } from "../modes/medicine/report";
import { ghanaDate, parseExpiry } from "../text";

export type Relation = "self" | "parent" | "child" | "other";

export interface FamilyMember {
  id: string;
  name: string;
  relation: Relation;
}

export interface SimulatedAlert {
  batch: string;
  productName: string;
  title: string;
  url: string;
  summary: string;
  createdAt: string;
}

export interface CabinetPack {
  id: string;
  memberId: string;
  productName: string;
  batch: string;
  expiry: string;
  manufacturer: string;
  registrationNumber: string;
  presentation: Presentation;
  headline: string;
  evidenceUrl: string;
  evidenceTitle: string;
  savedAt: string;
  lastCheckedAt: string;
  expiryReminder: boolean;
  labelReminder: { morning: boolean; evening: boolean };
  simulatedAlert: SimulatedAlert | null;
}

export interface StockLine {
  id: string;
  productName: string;
  batch: string;
  expiry: string;
  presentation: Presentation;
  verifiedOn: string;
  source: string;
  href?: string;
}

export interface WatchNotice {
  kind: "batch" | "name" | "simulated";
  source: string;
  title: string;
  url: string;
  summary: string;
  simulated: boolean;
}

export function honestBand(presentation: Presentation, registerFound: boolean): string {
  if (presentation === "do_not_use") return "Matches an alert: don't use";
  if (presentation === "unsure") return "Can't tell, ask a pharmacist";
  if (presentation === "check_first") return "Check first, ask a pharmacist";
  if (registerFound) return "Registered, no alerts";
  return "No alerts found";
}

export function relationLabel(relation: Relation): string {
  if (relation === "self") return "You";
  if (relation === "parent") return "Parent";
  if (relation === "child") return "Child";
  return "Household";
}

export function noticeFor(pack: Pick<CabinetPack, "productName" | "batch" | "simulatedAlert">): WatchNotice | null {
  const simulated = pack.simulatedAlert;
  if (simulated && simulated.batch.replace(/[^A-Za-z0-9]/g, "").toUpperCase() === pack.batch.replace(/[^A-Za-z0-9]/g, "").toUpperCase()) {
    return {
      kind: "simulated",
      source: "Simulated FDA notice",
      title: simulated.title,
      url: simulated.url || FDA_RECALLS_URL,
      summary: simulated.summary,
      simulated: true,
    };
  }
  const matches = matchAlerts(pack.productName, pack.batch);
  const batchHit = matches.find((match) => match.strength === "batch");
  if (batchHit) {
    return {
      kind: "batch",
      source: batchHit.alert.source === "who" ? "WHO" : "Ghana FDA",
      title: batchHit.alert.urlTitle,
      url: batchHit.alert.url,
      summary: batchHit.alert.summary,
      simulated: false,
    };
  }
  const nameHit = matches.find((match) => match.alert.nameAloneIsMatch);
  if (nameHit) {
    return {
      kind: "name",
      source: nameHit.alert.source === "who" ? "WHO" : "Ghana FDA",
      title: nameHit.alert.urlTitle,
      url: nameHit.alert.url,
      summary: nameHit.alert.summary,
      simulated: false,
    };
  }
  return null;
}

export function warningCopy(
  pack: Pick<CabinetPack, "productName" | "batch">,
  notice: WatchNotice,
  memberName?: string,
): { title: string; body: string; whatsApp: string } {
  const who = memberName ? ` Saved for ${memberName}.` : "";
  if (notice.kind === "name") {
    const title = `Public notice: ${pack.productName || "saved pack"}`;
    const body = `The product name is on a ${notice.source} notice. The saved batch is not one listed there.${who} Read the notice and ask a pharmacist.`;
    return {
      title,
      body,
      whatsApp: `${title}. ${body} ${notice.url} Report: https://adr.fdaghana.gov.gh/ Not medical advice.`,
    };
  }
  const title = `Stop using batch ${pack.batch || "on this pack"}`;
  const demo = notice.simulated
    ? " This warning was simulated on this phone. It is not a new FDA publication."
    : "";
  const body = `${pack.productName || "Saved pack"}.${who}${demo} Open the notice, keep the pack, and report it if someone is unwell.`;
  return {
    title,
    body,
    whatsApp: `${title}. ${pack.productName}.${demo} ${notice.url} Report: https://adr.fdaghana.gov.gh/ Not medical advice.`,
  };
}

export function makeSimulatedAlert(pack: Pick<CabinetPack, "productName" | "batch">, now = new Date()): SimulatedAlert {
  return {
    batch: pack.batch,
    productName: pack.productName,
    title: "Simulated FDA Ghana notice for this batch",
    url: FDA_RECALLS_URL,
    summary:
      "Demo only. You asked this phone to pretend a new FDA notice names this saved batch. It is not an FDA publication. The link opens the real FDA recalls list.",
    createdAt: now.toISOString(),
  };
}

export type ExpiryBucket = "unknown" | "ok" | "soon" | "expired";

export function expiryBucket(expiry: string, now = new Date()): ExpiryBucket {
  const parsed = parseExpiry(expiry);
  if (!expiry.trim() || parsed.kind === "invalid") return "unknown";
  const today = ghanaDate(now).getTime();
  if (parsed.end.getTime() < today) return "expired";
  const days = (parsed.end.getTime() - today) / (24 * 60 * 60 * 1000);
  if (days <= 90) return "soon";
  return "ok";
}

export function accraHour(now = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(now)
    .find((part) => part.type === "hour")?.value;
  return Number(hour ?? "0");
}

export function labelCheckDue(reminder: { morning: boolean; evening: boolean }, now = new Date()): "morning" | "evening" | null {
  const hour = accraHour(now);
  if (reminder.morning && hour >= 7 && hour <= 9) return "morning";
  if (reminder.evening && hour >= 19 && hour <= 21) return "evening";
  return null;
}

export function reminderLines(pack: Pick<CabinetPack, "expiry" | "expiryReminder" | "labelReminder" | "productName">, now = new Date()): string[] {
  const lines: string[] = [];
  const bucket = expiryBucket(pack.expiry, now);
  if (pack.expiryReminder && bucket === "soon") {
    lines.push("Expires within 90 days. Look at the pack and ask a pharmacist before you use the last of it.");
  }
  if (pack.expiryReminder && bucket === "expired") {
    lines.push("The printed expiry is past. Do not assume the pack is still usable.");
  }
  if (pack.labelReminder.morning) {
    const due = labelCheckDue(pack.labelReminder, now) === "morning" ? " Due now." : "";
    lines.push(`Morning label check, 08:00.${due} Look at the pack. This is not a dose.`);
  }
  if (pack.labelReminder.evening) {
    const due = labelCheckDue(pack.labelReminder, now) === "evening" ? " Due now." : "";
    lines.push(`Evening label check, 20:00.${due} Look at the pack. This is not a dose.`);
  }
  return lines;
}
