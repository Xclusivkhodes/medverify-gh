"use client";

import type { EvidenceItem } from "@/lib/modes/medicine/types";

/** Renders [n] as a link when n matches the evidence list. Other text stays text. */
export function CitedText({ text, evidence }: { text: string; evidence: EvidenceItem[] }) {
  const sources = evidence.filter((item) => item.url.startsWith("http"));
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, index) => {
        const match = /^\[(\d+)\]$/.exec(part);
        if (!match) return <span key={index}>{part}</span>;
        const n = Number(match[1]);
        const source = sources[n - 1];
        if (!source) return <span key={index}>{part}</span>;
        return (
          <a key={index} className="cite" href={source.url} rel="noopener noreferrer">
            {n}
            <span className="sr-only"> {source.title}</span>
          </a>
        );
      })}
    </>
  );
}
