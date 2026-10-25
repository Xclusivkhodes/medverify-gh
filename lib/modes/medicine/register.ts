import { normName } from "../../text";
import type { LabelFields, RegisterScore } from "./types";

/**
 * Tiny on-device snapshot so the demo can show a weighted register match.
 * These two rows are fictional. This is not the Ghana FDA register.
 */
const SNAPSHOT = [
  {
    registrationNumber: "DEMO-FDA-22018",
    productName: "ClearView Eye Drops",
    manufacturer: "ClearView Labs",
    strength: "",
    form: "eye drops",
  },
  {
    registrationNumber: "DEMO-FDA-10442",
    productName: "Harbour Paracetamol 500 mg Tablets",
    manufacturer: "Harbour Labs",
    strength: "500 mg",
    form: "tablets",
  },
];

function compact(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function namePoints(input: string, candidate: string): number {
  const left = normName(input);
  const right = normName(candidate);
  if (left.length < 4 || right.length < 4) return 0;
  if (left === right || left.includes(right) || right.includes(left)) return 30;
  const tokens = right.split(" ").filter((token) => token.length >= 4);
  if (!tokens.length) return 0;
  const hit = tokens.filter((token) => left.includes(token)).length / tokens.length;
  if (hit >= 0.6) return 20;
  return 0;
}

export function scoreRegister(fields: LabelFields): RegisterScore {
  const note = "Small on-device snapshot, not the full FDA register. Points are not a quality score, and they do not show the pack is free of quality problems.";
  let best = { score: 0, lines: emptyLines("No row in the on-device snapshot matched.") };
  for (const row of SNAPSHOT) {
    const reg = compact(fields.registrationNumber) && compact(fields.registrationNumber) === compact(row.registrationNumber) ? 40 : 0;
    const name = namePoints(fields.productName, row.productName);
    const maker = normName(fields.manufacturer).includes(normName(row.manufacturer)) && normName(row.manufacturer).length > 3 ? 20 : 0;
    const blob = normName(`${fields.productName} ${fields.otherText}`);
    const strength = row.strength && blob.includes(normName(row.strength)) ? 10 : 0;
    const score = reg + name + maker + strength;
    if (score <= best.score) continue;
    best = {
      score,
      lines: [
        { label: "Registration number", points: reg, max: 40, detail: reg ? row.registrationNumber : "Not the same as a snapshot row" },
        { label: "Product name", points: name, max: 30, detail: name ? row.productName : "Name did not line up" },
        { label: "Manufacturer", points: maker, max: 20, detail: maker ? row.manufacturer : "Maker did not line up" },
        { label: "Strength", points: strength, max: 10, detail: row.strength ? row.strength : "No strength on this snapshot row" },
      ],
    };
  }
  return {
    found: best.lines[0]?.points === 40 && (best.lines[1]?.points ?? 0) >= 20,
    score: best.score,
    max: 100,
    lines: best.lines,
    note,
  };
}

function emptyLines(detail: string): RegisterScore["lines"] {
  return [
    { label: "Registration number", points: 0, max: 40, detail },
    { label: "Product name", points: 0, max: 30, detail },
    { label: "Manufacturer", points: 0, max: 20, detail },
    { label: "Strength", points: 0, max: 10, detail },
  ];
}
