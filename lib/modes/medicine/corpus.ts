export type AlertKind = "recall" | "falsified" | "substandard" | "safety-alert";

export interface AlertRecord {
  id: string;
  source: "ghana-fda" | "who";
  kind: AlertKind;
  productName: string;
  aliases: string[];
  /** When true, a name match alone is an alert hit. Used when the notice is about that brand, not a batch list we hold. */
  nameAloneIsMatch: boolean;
  manufacturer: string;
  batches: string[];
  issued: string;
  url: string;
  urlTitle: string;
  /** Short paraphrase written for this app. Not the regulator's text. */
  summary: string;
}

/**
 * Bundled snapshot of public notices, reviewed 25 October 2026.
 * Used by demo mode and as a safety net when live search misses a known batch.
 * This is not a complete or official FDA database.
 */
export const ALERTS: AlertRecord[] = [
  {
    id: "procold-2024",
    source: "ghana-fda",
    kind: "recall",
    productName: "Procold Suspension",
    aliases: ["procold", "procold suspension"],
    nameAloneIsMatch: false,
    manufacturer: "Fredun Pharmaceuticals Limited, India",
    batches: ["BE248", "BE249", "BE250", "BE251", "BE252", "BE253"],
    issued: "2024-08-12",
    url: "https://fdaghana.gov.gh/kojach-limited-procold-suspension/",
    urlTitle: "Ghana FDA recall: Procold Suspension (Kojach Limited)",
    summary:
      "On 12 August 2024 the Ghana FDA recalled Procold Suspension made by Fredun Pharmaceuticals, recalling firm Kojach Limited. The notice covers batches BE248, BE249, BE250, BE251, BE252 and BE253 (made May 2022, expiry April 2025). Surveillance found the powder caked instead of free-flowing, so those batches were classed as substandard and not for use.",
  },
  {
    id: "dostinex-2025",
    source: "ghana-fda",
    kind: "falsified",
    productName: "Dostinex 0.5 mg tablets",
    aliases: ["dostinex"],
    nameAloneIsMatch: false,
    manufacturer: "Falsified packs; genuine product is associated with the authorised registration holder",
    batches: ["GG2440", "GG3470"],
    issued: "2026-01-01",
    url: "https://fdaghana.gov.gh/wp-content/uploads/2026/01/Medical-Product-Alert_Dostinex_Rev.pdf",
    urlTitle: "Ghana FDA Medical Product Alert: falsified Dostinex 0.5 mg",
    summary:
      "Ghana FDA Medical Product Alert No. 11/2025, published on the FDA site, describes falsified and unregistered Dostinex 0.5 mg (cabergoline) tablets. Batches GG2440 and GG3470 were named. The notice says genuine Dostinex registered for Ghana is labelled in English, and the falsified packs were not. The Authority said not to use the affected batches.",
  },
  {
    id: "beltcoin-oxytocin-2023",
    source: "ghana-fda",
    kind: "recall",
    productName: "Beltcoin Oxytocin Injection BP",
    aliases: ["beltcoin", "beltocin"],
    nameAloneIsMatch: false,
    manufacturer: "Bharat Parenterals Limited, India",
    batches: ["GH-B3-48", "GH-B3-49", "GH-B3-50", "GH-B3-51", "GH-B3-52", "GH-B3-53"],
    issued: "2023-09-28",
    url: "https://fdaghana.gov.gh/newsroom/product-recalls-and-alerts/",
    urlTitle: "Ghana FDA product recalls table (Beltcoin oxytocin)",
    summary:
      "The Ghana FDA product recalls table lists Beltcoin Oxytocin Injection BP, batches GH-B3-48 through GH-B3-53, recall date 28 September 2023, manufacturer Bharat Parenterals Limited, recalling firm Hills Pharmaceuticals. The table row in this snapshot does not include a narrative reason. Do not use a listed batch until you have read the FDA page.",
  },
  {
    id: "venetocin-oxytocin-2023",
    source: "ghana-fda",
    kind: "recall",
    productName: "Venetocin Oxytocin Injection BP",
    aliases: ["venetocin", "vernetocin"],
    nameAloneIsMatch: false,
    manufacturer: "Bharat Parenterals Limited, India",
    batches: ["2014"],
    issued: "2023-09-27",
    url: "https://fdaghana.gov.gh/newsroom/product-recalls-and-alerts/",
    urlTitle: "Ghana FDA product recalls table (Venetocin oxytocin)",
    summary:
      "The Ghana FDA product recalls table lists Venetocin Oxytocin Injection BP, batch 2014, recall date 27 September 2023, manufacturer Bharat Parenterals Limited, recalling firm AlphaDuo Pharma Ltd. The table row in this snapshot does not include a narrative reason. The batch number is short, so this match also requires the product name.",
  },
  {
    id: "ryverna-2024",
    source: "ghana-fda",
    kind: "recall",
    productName: "Ryverna 10 mg/ml solution",
    aliases: ["ryverna"],
    nameAloneIsMatch: false,
    manufacturer: "Novartis",
    batches: ["SKHL2"],
    issued: "2024-05-31",
    url: "https://fdaghana.gov.gh/newsroom/product-recalls-and-alerts/",
    urlTitle: "Ghana FDA product recalls table (Ryverna)",
    summary:
      "The Ghana FDA product recalls table lists Ryverna 10 mg/ml solution, batch SKHL2, recall date 31 May 2024, manufacturer Novartis, recalling firm Ernest Chemist Ltd/Novartis, with an expiry of 30 June 2024 on the table. The row in this snapshot does not state a narrative reason.",
  },
  {
    id: "para-clear-2023",
    source: "ghana-fda",
    kind: "substandard",
    productName: "Para Clear Suspension 125",
    aliases: ["para clear", "para clear suspension"],
    nameAloneIsMatch: false,
    manufacturer: "SyneCare, Mumbai",
    batches: ["L220008"],
    issued: "2023-01-01",
    url: "https://fdaghana.gov.gh/safety-alert-substandard-paracetamol-suspension-received-from-republic-of-liberia/",
    urlTitle: "Ghana FDA safety alert: Para Clear Suspension 125",
    summary:
      "The Ghana FDA warned about Para Clear Suspension 125 (paracetamol oral suspension 125 mg/5 ml) from SyneCare, Mumbai, batch L220008, made 01/2022, expiry 12/2024. The notice says the product is not registered in Ghana and that analysis reported ethylene glycol. The Authority advised people not to sell or use it. Read the notice for the risk description rather than relying on this summary.",
  },
  {
    id: "who-healmoxy-2025",
    source: "who",
    kind: "falsified",
    productName: "HEALMOXY (amoxicillin) capsules 500 mg",
    aliases: ["healmoxy"],
    nameAloneIsMatch: true,
    manufacturer: "Named in a WHO medical product alert",
    batches: [],
    issued: "2025-04-23",
    url: "https://www.who.int/news/item/23-04-2025-medical-product-alert-n-2-2025-falsified-healmoxy-(amoxicillin)-capsules-500mg",
    urlTitle: "WHO Medical Product Alert N°2/2025: falsified HEALMOXY",
    summary:
      "WHO Medical Product Alert N°2/2025 (23 April 2025) concerns falsified HEALMOXY (amoxicillin) capsules 500 mg. A match on the brand HEALMOXY is not a match on every amoxicillin. Read the WHO notice and compare the pack.",
  },
  {
    id: "who-oral-liquids-2025-5",
    source: "who",
    kind: "substandard",
    productName: "COLDRIF, Respifresh TR, and ReLife",
    aliases: ["coldrif", "respifresh", "relife", "re life"],
    nameAloneIsMatch: true,
    manufacturer: "Named in a WHO medical product alert",
    batches: [],
    issued: "2025-10-13",
    url: "https://www.who.int/news/item/13-10-2025-medical-product-alert-n-5-2025--substandard-(contaminated)-oral-liquid-medicines",
    urlTitle: "WHO Medical Product Alert N°5/2025: contaminated oral liquids",
    summary:
      "WHO Medical Product Alert N°5/2025 (13 October 2025) describes specific batches of COLDRIF, Respifresh TR, and ReLife oral liquids as substandard and contaminated with diethylene glycol, identified in India. A match on the product name is a reason to read that notice and compare the batch. It does not by itself prove this pack is one of the contaminated batches.",
  },
];

export const SNAPSHOT_PAGES = [
  {
    title: "Ghana FDA product recalls and alerts",
    url: "https://fdaghana.gov.gh/newsroom/product-recalls-and-alerts/",
    publisher: "Ghana FDA",
  },
  {
    title: "WHO list of medical product alerts",
    url: "https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts",
    publisher: "WHO",
  },
] as const;
