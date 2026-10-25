import type { ReportChannel } from "./types";

/**
 * Fixed, human-checked contacts. The model is not allowed to add others.
 * Emergency 112, Ghana FDA hotlines, and the adverse-reaction form.
 * Confirmed from public pages on 25 October 2026.
 */
export const REPORT_CHANNELS: ReportChannel[] = [
  {
    label: "Emergency",
    value: "112",
    href: "tel:112",
  },
  {
    label: "Ghana FDA hotline",
    value: "055 111 2224",
    href: "tel:0551112224",
  },
  {
    label: "Ghana FDA hotline (alternate)",
    value: "055 111 2225",
    href: "tel:0551112225",
  },
  {
    label: "Report a side effect",
    value: "adr.fdaghana.gov.gh",
    href: "https://adr.fdaghana.gov.gh/",
  },
];

export const FDA_RECALLS_URL = "https://fdaghana.gov.gh/newsroom/product-recalls-and-alerts/";

export const WHO_ALERTS_URL =
  "https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts";

export const RESULT_LIMITATIONS = [
  "The on-device register snapshot is a handful of demo entries, not the full Ghana FDA register. A score there is not proof of quality.",
  "“No alerts found” means no matching public notice was found in the sources checked. It is not a safety approval.",
  "The bundled snapshot is a small set of public notices, not every alert the FDA or WHO has ever issued.",
  "A photo can miss text on another panel, and a live model can misread a label.",
  "Batch codes can collide. Compare the product name on the notice, not only the batch.",
];
