import { normName } from "../../text";
import type { VisualReport } from "./types";

const REFERENCES = [
  {
    id: "clearview",
    label: "ClearView Eye Drops",
    image: "/references/clearview.svg",
    match: "clearview",
  },
  {
    id: "harbour",
    label: "Harbour Paracetamol 500 mg",
    image: "/references/harbour.svg",
    match: "harbour paracetamol",
  },
];

const CAVEAT =
  "A photo cannot prove a medicine is genuine. Package-photo research was about 54% accurate from the photo alone and about 75% with a reference image. These are visual hints, not a verdict.";

/** Rule comparison against artwork we ship. No model call, and not a genuine-product verdict. */
export function visualHints(productName: string): VisualReport {
  const name = normName(productName);
  const reference = REFERENCES.find((item) => name.includes(item.match));
  if (!reference) {
    return {
      referenceId: null,
      referenceLabel: "",
      image: null,
      compared: false,
      hints: ["No reference photo is on this device, so the picture was not compared."],
      caveat: CAVEAT,
    };
  }
  return {
    referenceId: reference.id,
    referenceLabel: reference.label,
    image: reference.image,
    compared: true,
    hints: [
      `A reference card is on this device for ${reference.label}. It is example artwork, not a manufacturer photo.`,
      "The printed name lines up with that card.",
      "Demo mode does not send the photo to a model for this comparison.",
    ],
    caveat: CAVEAT,
  };
}
