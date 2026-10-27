import { safeHttpUrl } from "../../text";
import type { EvidenceItem } from "./types";

export type NumberedSource = {
  n: number;
  title: string;
  url: string;
  publisher: string;
};

/** Sources the verdict model is allowed to cite, in prompt order. */
export function numberEvidence(items: EvidenceItem[]): NumberedSource[] {
  const sources: NumberedSource[] = [];
  for (const item of items) {
    const url = safeHttpUrl(item.url);
    if (!url) continue;
    sources.push({
      n: sources.length + 1,
      title: item.title || url,
      url,
      publisher: item.publisher,
    });
  }
  return sources;
}

export function formatNumberedSources(sources: NumberedSource[]): string {
  if (!sources.length) return "(none)";
  return sources.map((source) => `[${source.n}] ${source.title} — ${source.url}`).join("\n");
}

/** Drop [n] when n is not in 1..count. The surrounding sentence stays. */
export function dropUnknownCitations(text: string, count: number): { text: string; dropped: number[] } {
  const dropped: number[] = [];
  const next = text.replace(/\[(\d+)\]/g, (full, raw: string) => {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > count) {
      dropped.push(n);
      return "";
    }
    return full;
  });
  return {
    text: next.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim(),
    dropped,
  };
}

/** Keep only citation numbers and URLs that were in the numbered list. */
export function applyCitedWording(text: string, sources: NumberedSource[]): { text: string; dropped: number[] } {
  const allowed = new Set(sources.map((source) => source.url));
  const withoutUrls = text.replace(/https?:\/\/\S+/g, (url) => {
    const cleaned = url.replace(/[.,)]$/, "");
    return allowed.has(cleaned) ? url : "";
  });
  return dropUnknownCitations(withoutUrls, sources.length);
}
