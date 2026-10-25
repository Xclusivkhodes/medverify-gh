import { asString } from "../../text";
import type { FieldConfidence, FieldRead, LabelFields, RedFlag } from "./types";

const SPECS: { key: FieldRead["key"]; label: string }[] = [
  { key: "brand", label: "Brand" },
  { key: "inn", label: "INN" },
  { key: "strength", label: "Strength" },
  { key: "form", label: "Form" },
  { key: "manufacturer", label: "Maker" },
  { key: "country", label: "Country" },
  { key: "registrationNumber", label: "FDA reg. no." },
  { key: "batch", label: "Batch" },
  { key: "manufactured", label: "Made" },
  { key: "expiry", label: "Expiry" },
];

const INNS = ["paracetamol", "metformin", "amoxicillin", "cabergoline", "oxytocin", "ibuprofen"];

export interface VisionPayload {
  fields: LabelFields;
  reads: FieldRead[];
  oddities: string[];
  /** True only when a critical field was read with low confidence, not when it was simply absent. */
  visionLow: boolean;
}

function asConfidence(value: unknown): FieldConfidence | null {
  const text = asString(value, 20).toLowerCase();
  if (text === "high" || text === "medium" || text === "low" || text === "unreadable") return text;
  return null;
}

function blankLow(value: string, confidence: FieldConfidence): { value: string; confidence: FieldConfidence } {
  if (confidence === "low" || confidence === "unreadable") return { value: "", confidence };
  return { value, confidence };
}

function cell(record: Record<string, unknown>, key: string): { value: string; confidence: FieldConfidence } | null {
  const raw = record[key];
  if (!raw || typeof raw !== "object") return null;
  const item = raw as { value?: unknown; confidence?: unknown };
  const confidence = asConfidence(item.confidence) ?? "unreadable";
  const value = item.value == null ? "" : asString(item.value, 200);
  return blankLow(value, confidence);
}

export function parseVisionPayload(json: unknown): VisionPayload {
  const record = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const structured = SPECS.some((spec) => record[spec.key] && typeof record[spec.key] === "object");
  const overall = asConfidence(record.confidence) ?? "medium";
  const flat: Record<string, string> = {
    brand: asString(record.productName),
    manufacturer: asString(record.manufacturer),
    registrationNumber: asString(record.registrationNumber),
    batch: asString(record.batch),
    expiry: asString(record.expiry),
    manufactured: asString(record.manufactured),
    inn: "",
    strength: "",
    form: "",
    country: "",
  };

  const reads: FieldRead[] = SPECS.map((spec) => {
    const fromCell = structured ? cell(record, spec.key) : null;
    if (fromCell) return { ...spec, ...fromCell };
    const value = flat[spec.key] ?? "";
    if (!value) return { ...spec, value: "", confidence: "unreadable" };
    if (overall === "low" && (spec.key === "batch" || spec.key === "expiry" || spec.key === "brand")) {
      return { ...spec, value: "", confidence: "low" };
    }
    return { ...spec, value, confidence: overall };
  });

  const oddities = Array.isArray(record.oddities)
    ? record.oddities.map((item) => asString(item, 160)).filter(Boolean).slice(0, 6)
    : [];

  const byKey = Object.fromEntries(reads.map((read) => [read.key, read])) as Record<FieldRead["key"], FieldRead>;
  const usable = (key: FieldRead["key"]) => {
    const read = byKey[key];
    return read.confidence === "high" || read.confidence === "medium" ? read.value : "";
  };

  const fields: LabelFields = {
    productName: usable("brand"),
    manufacturer: usable("manufacturer"),
    batch: usable("batch"),
    expiry: usable("expiry"),
    registrationNumber: usable("registrationNumber"),
    otherText: asString(record.otherText, 500),
  };

  const visionLow = (["brand", "batch", "expiry"] as const).some((key) => byKey[key].confidence === "low");
  return { fields, reads, oddities, visionLow };
}

function guessInn(name: string): string {
  const lower = name.toLowerCase();
  return INNS.find((inn) => lower.includes(inn)) ?? "";
}

function guessStrength(name: string): string {
  return name.match(/\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|%)/i)?.[0] ?? "";
}

function guessForm(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("suspension") || lower.includes("syrup")) return "suspension";
  if (lower.includes("drop")) return "eye drops";
  if (lower.includes("tablet")) return "tablets";
  if (lower.includes("capsule") || lower.includes("capusle")) return "capsules";
  if (lower.includes("injection")) return "injection";
  return "";
}

/** Example and typed labels: confidence follows what we were given. Empty fields stay unreadable. */
export function exampleReads(fields: LabelFields): { reads: FieldRead[]; oddities: string[] } {
  const extras: Record<string, string> = {
    brand: fields.productName,
    inn: guessInn(fields.productName),
    strength: guessStrength(fields.productName),
    form: guessForm(fields.productName),
    manufacturer: fields.manufacturer,
    country: "",
    registrationNumber: fields.registrationNumber,
    batch: fields.batch,
    manufactured: "",
    expiry: fields.expiry,
  };
  const reads: FieldRead[] = SPECS.map((spec) => {
    const value = (extras[spec.key] ?? "").trim();
    return { ...spec, value, confidence: value ? "high" : "unreadable" };
  });
  const oddities: string[] = [];
  if (/amoxcilin|capusles|paracetemol|suspention/i.test(`${fields.productName} ${fields.otherText}`)) {
    oddities.push("The printed name looks misspelt. That is a visual oddity, not a verdict.");
  }
  if (/not in english|non-english/i.test(fields.otherText)) {
    oddities.push("The label notes say the text is not in English.");
  }
  return { reads, oddities };
}

export function consistencyFlags(expiry: string, manufactured: string): RedFlag[] {
  if (!manufactured.trim() || !expiry.trim()) return [];
  const made = parseLoose(manufactured);
  const ends = parseLoose(expiry);
  if (!made || !ends) return [];
  if (ends.getTime() < made.getTime()) {
    return [
      {
        code: "expiry_before_manufacture",
        severity: "high",
        detail: "The expiry date is before the manufacture date printed on the pack.",
      },
    ];
  }
  const years = (ends.getTime() - made.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 1 || years > 6) {
    return [
      {
        code: "shelf_life",
        severity: "info",
        detail: "The printed shelf life is under a year or over six years. Many packs are about 2 to 5 years. Ask a pharmacist.",
      },
    ];
  }
  return [];
}

function parseLoose(value: string): Date | null {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, iso[3] ? Number(iso[3]) : 1));
  const month = trimmed.match(/^(\d{1,2})[\/\-.](\d{4})$/);
  if (month) return new Date(Date.UTC(Number(month[2]), Number(month[1]) - 1, 1));
  const yymmdd = trimmed.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (yymmdd) return new Date(Date.UTC(2000 + Number(yymmdd[1]), Number(yymmdd[2]) - 1, Number(yymmdd[3])));
  return null;
}
