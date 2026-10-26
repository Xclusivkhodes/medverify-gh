import { z } from "zod";

export const verifyBodySchema = z
  .object({
    mode: z.enum(["medicine"]).optional(),
    scenarioId: z.string().max(80).optional(),
    forceDemo: z.boolean().optional(),
    productName: z.string().max(240).optional(),
    manufacturer: z.string().max(240).optional(),
    batch: z.string().max(240).optional(),
    expiry: z.string().max(240).optional(),
    registrationNumber: z.string().max(240).optional(),
    otherText: z.string().max(500).optional(),
    imageDataUrl: z.string().max(3_600_000).optional(),
    gs1Raw: z.string().max(500).optional(),
    scratchReply: z.string().max(500).optional(),
  })
  .strict();

export type VerifyBodyInput = z.infer<typeof verifyBodySchema>;

const confidence = z.enum(["high", "medium", "low", "unreadable"]);
const cell = z.union([
  z.string(),
  z.null(),
  z
    .object({
      value: z.string().nullable().optional(),
      confidence: confidence.optional(),
    })
    .strict(),
]);

const visionKeys = [
  "brand",
  "inn",
  "strength",
  "form",
  "manufacturer",
  "country",
  "registrationNumber",
  "batch",
  "manufactured",
  "expiry",
  "productName",
  "oddities",
  "otherText",
  "confidence",
] as const;

export const visionOutputSchema = z
  .object({
    brand: cell.optional(),
    inn: cell.optional(),
    strength: cell.optional(),
    form: cell.optional(),
    manufacturer: cell.optional(),
    country: cell.optional(),
    registrationNumber: cell.optional(),
    batch: cell.optional(),
    manufactured: cell.optional(),
    expiry: cell.optional(),
    productName: cell.optional(),
    oddities: z.array(z.string()).optional(),
    otherText: z.string().nullable().optional(),
    confidence: confidence.optional(),
  })
  .refine((value) => visionKeys.some((key) => value[key] !== undefined), "Vision output had no label fields.");

export const normalizeOutputSchema = z.object({
  productName: z.string().nullable().optional(),
  manufacturer: z.string().nullable().optional(),
  batch: z.string().nullable().optional(),
  expiry: z.string().nullable().optional(),
  registrationNumber: z.string().nullable().optional(),
  otherText: z.string().nullable().optional(),
  redFlags: z
    .array(
      z.object({
        code: z.string(),
        detail: z.string(),
      }),
    )
    .optional(),
});

export const verdictOutputSchema = z.object({
  headline: z.string().min(1).max(200),
  summary: z.string().min(1).max(1600),
  actions: z.array(z.string()).min(1).max(8),
  pharmacistNote: z.string().optional(),
});

export const medicineResultSchema = z.object({
  mode: z.literal("medicine"),
  runMode: z.enum(["demo", "live", "fallback"]),
  outcome: z.enum(["verdict", "search_failed"]),
  presentation: z.enum(["do_not_use", "check_first", "no_alerts", "unsure"]),
  verdict: z.enum(["alert_match", "red_flags", "no_alerts"]),
  headline: z.string(),
  summary: z.string(),
  fields: z.object({
    productName: z.string(),
    batch: z.string(),
  }),
  trace: z.array(z.object({ id: z.string() })),
});
