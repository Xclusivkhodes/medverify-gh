import type { LabelFields } from "./types";

export type PackVariant = "procold" | "dostinex" | "amox" | "harbour";

export interface DemoScenario {
  id: string;
  title: string;
  kicker: string;
  basis: "public-alert" | "fictional";
  basisNote: string;
  pack: PackVariant;
  fields: LabelFields;
  /** Optional GS1 element string. Decoded on the phone in the real camera path. */
  gs1Raw?: string;
}

export const SCENARIOS: DemoScenario[] = [
  {
    id: "para-clear-l220008",
    title: "Para Clear Suspension 125",
    kicker: "Public FDA alert",
    basis: "public-alert",
    basisNote:
      "Based on the Ghana FDA safety alert for batch L220008. The card is an example, not the manufacturer’s pack.",
    pack: "procold",
    fields: {
      productName: "Para Clear Suspension 125",
      manufacturer: "SyneCare, Mumbai",
      batch: "L220008",
      expiry: "12/2024",
      registrationNumber: "",
      otherText: "",
    },
  },
  {
    id: "glycove-check",
    title: "Glycove tablets",
    kicker: "Fictional red flags",
    basis: "fictional",
    basisNote: "Invented diabetes-tablet label. The expiry is in the past and there is no registration number.",
    pack: "amox",
    fields: {
      productName: "Glycove Metformin 500 mg",
      manufacturer: "Northwind Imports",
      batch: "GL-100",
      expiry: "01/2024",
      registrationNumber: "",
      otherText: "",
    },
  },
  {
    id: "clearview-drops",
    title: "ClearView eye drops",
    kicker: "Fictional, no alert",
    basis: "fictional",
    basisNote: "Invented eye-drop label. ClearView and DEMO-FDA-22018 are not real, and no notice uses this name.",
    pack: "harbour",
    fields: {
      productName: "ClearView Eye Drops",
      manufacturer: "ClearView Labs",
      batch: "CV-44012",
      expiry: "2028-09",
      registrationNumber: "DEMO-FDA-22018",
      otherText: "",
    },
    gs1Raw: "(01)09506000134352(17)280930(10)CV-44012(21)DEMO0001",
  },
  {
    id: "procold-be250",
    title: "Procold Suspension",
    kicker: "Public FDA recall",
    basis: "public-alert",
    basisNote:
      "Based on the Ghana FDA recall of 12 August 2024. The drawing is a schematic, not the manufacturer’s pack.",
    pack: "procold",
    fields: {
      productName: "Procold Suspension",
      manufacturer: "Fredun Pharmaceuticals Limited",
      batch: "BE250",
      expiry: "04/2025",
      registrationNumber: "",
      otherText: "",
    },
  },
  {
    id: "dostinex-gg2440",
    title: "Dostinex 0.5 mg",
    kicker: "Public falsified alert",
    basis: "public-alert",
    basisNote:
      "Based on Ghana FDA Medical Product Alert No. 11/2025 for batches GG2440 and GG3470. The drawing is a schematic, not the manufacturer’s pack.",
    pack: "dostinex",
    fields: {
      productName: "Dostinex 0.5 mg Tablets",
      manufacturer: "",
      batch: "GG2440",
      expiry: "",
      registrationNumber: "",
      otherText: "Label text is not in English.",
    },
  },
  {
    id: "amox-red-flags",
    title: "Misspelt amoxicillin",
    kicker: "Fictional red flags",
    basis: "fictional",
    basisNote:
      "Invented label. The name is misspelt, the expiry is in the past, and there is no registration number. It is not a real product.",
    pack: "amox",
    fields: {
      productName: "Amoxcilin 500mg Capusles",
      manufacturer: "BestCare Pharma",
      batch: "BX-1092",
      expiry: "01/2024",
      registrationNumber: "",
      otherText: "",
    },
  },
  {
    id: "harbour-clear",
    title: "Harbour Paracetamol",
    kicker: "Fictional, no alert",
    basis: "fictional",
    basisNote:
      "Invented pack for the “no alert” path. Harbour Labs and DEMO-FDA-10442 are not real. No public notice uses this name.",
    pack: "harbour",
    fields: {
      productName: "Harbour Paracetamol 500 mg Tablets",
      manufacturer: "Harbour Labs",
      batch: "HB-88421",
      expiry: "2028-06",
      registrationNumber: "DEMO-FDA-10442",
      otherText: "",
    },
  },
];

export const TRY_EXAMPLES = [
  { id: "para-clear-l220008", label: "Child’s fever syrup" },
  { id: "glycove-check", label: "Diabetes tablets" },
  { id: "clearview-drops", label: "Eye drops" },
] as const;

export function getScenario(id: string | undefined): DemoScenario | undefined {
  if (!id) return undefined;
  return SCENARIOS.find((scenario) => scenario.id === id);
}
