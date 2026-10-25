import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { SiteFooter } from "@/components/site-footer";
import { PRODUCT } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${PRODUCT.name} does with a pack photo and the words you type.`,
};

export default function PrivacyPage() {
  return (
    <Shell title="Privacy">
      <main className="gutter legal pt-6 pb-6">
        <p className="t-eyebrow">Privacy</p>
        <h1 className="t-h1">What stays on your phone</h1>
        <p>
          {PRODUCT.name} has no account and no sign-up. A check uses the product name, batch, expiry, and other label words you type, plus a photo if you add one.
        </p>
        <h2 className="t-h2">Photos</h2>
        <p>
          The server does not save the photo. It is used for that check and then dropped. The browser may shrink it before sending.
        </p>
        <p>
          If you are offline and you already have a photo, this browser keeps that photo in its own storage so the check can run when you reconnect. That copy is not described as “not stored”. Clearing this site’s data removes it.
        </p>
        <h2 className="t-h2">Demo mode</h2>
        <p>
          The public demo does not send your label or photo to Nebius or Tavily. Example packs use a bundled snapshot of public notices. A new photo cannot be read until live keys are configured.
        </p>
        <h2 className="t-h2">If live checks are turned on</h2>
        <ul>
          <li>The photo and label text go to Nebius Token Factory so a vision model can read the pack and a text model can write the wording.</li>
          <li>The product name and batch go to Tavily, limited to fdaghana.gov.gh, to look for public FDA Ghana pages.</li>
          <li>Those providers process the request under their own terms. {PRODUCT.name} does not sell the contents.</li>
        </ul>
        <h2 className="t-h2">Cabinet, family, and stock</h2>
        <p>
          Saved packs, family names, reminders, the pharmacist log, low-data mode, and region reports stay in this browser. They are not uploaded. Clearing this site’s data removes them. A simulated FDA alert is also local. It is not sent to the FDA.
        </p>
        <h2 className="t-h2">What we do not collect</h2>
        <p>No account, no phone number, and no health record. The emergency and FDA numbers on the result screen are public contacts. Tapping them uses your phone, not this site. WhatsApp opens with a message you can edit. We do not run a WhatsApp business account.</p>
        <p className="t-small t-muted">Theme choice and the language toggle are saved in this browser only.</p>
      </main>
      <SiteFooter />
    </Shell>
  );
}
