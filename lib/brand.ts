/**
 * Product name and brand assets live here so a rename is one edit.
 * MedCheck GH lockups are already in /brand/logo/alt-name-medcheck.
 * Do not switch the name until that decision is made.
 *
 * Colours, type, and radii live only in app/tokens.css (v3 pharmacy label).
 * The lockup files include the wordmark. Swap public/brand/logo with
 * public/brand/logo/alt-name-medcheck and change `name` together.
 */
export const PRODUCT = {
  name: "MedVerify GH",
  short: "MedVerify",
  slug: "medverify-gh",
  tagline: "Check the batch, not the box.",
  /** Placeholder from the name note. Needs a native Twi speaker before it is treated as final. */
  taglineTwi: "Hwɛ ansa na woanom",
  usePictureLockup: true,
  logoLight: "/brand/logo/lockup-light.svg",
  logoDark: "/brand/logo/lockup-dark.svg",
} as const;

export function footerDisclaimer(): string {
  return `${PRODUCT.name} checks public FDA Ghana notices. It is not medical advice. Always ask your pharmacist or doctor.`;
}

/**
 * Human-checked contacts. The model must never supply these.
 * Confirmed from public FDA and emergency pages on 25 Oct 2026.
 */
export const CONTACTS = {
  emergency: {
    title: "Call 112",
    detail: "Ambulance and emergencies, free",
    href: "tel:112",
  },
  fda: {
    title: "Call 055 111 2224",
    detail: "FDA hotline · or 2225",
    href: "tel:0551112224",
  },
  adr: {
    title: "Med Safety app or form",
    detail: "adr.fdaghana.gov.gh",
    href: "https://adr.fdaghana.gov.gh/",
  },
} as const;

const ALLOWED_NUMBERS = new Set(["112", "193", "0551112224", "0551112225", "233551112224", "233551112225"]);

/** Drop phone numbers the model invented. Keeps 112 and the two FDA hotlines. */
export function scrubUnlistedContacts(text: string): string {
  return text
    .replace(/(?:\+?\d[\d\s().-]{5,}\d)/g, (raw) => {
      const digits = raw.replace(/\D/g, "");
      return ALLOWED_NUMBERS.has(digits) ? raw : "";
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim();
}

export type Presentation = "do_not_use" | "check_first" | "no_alerts" | "unsure";

export function fixedActionLines(presentation: Presentation): string[] {
  if (presentation === "do_not_use") {
    return [
      "Stop. Don’t take it or give it to a child. Keep the pack.",
      "If someone already took it and feels very unwell, call 112.",
      "Tell the Ghana FDA where you got it: 055 111 2224 or 055 111 2225.",
      "Report a side effect at adr.fdaghana.gov.gh.",
    ];
  }
  if (presentation === "no_alerts") {
    return [
      "No FDA Ghana notice matched these details. That is not a promise the pack is right for you.",
      "Ask a pharmacist if the price, spelling, or packaging looks unusual.",
      "If someone is seriously unwell, call 112.",
      "Report a side effect at adr.fdaghana.gov.gh.",
    ];
  }
  return [
    "Treat this as check first. Show the pack to a pharmacist before anyone uses it.",
    "If someone is seriously unwell, call 112.",
    "You can also call the Ghana FDA on 055 111 2224 or 055 111 2225.",
    "Report a side effect at adr.fdaghana.gov.gh.",
  ];
}
