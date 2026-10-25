import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { SiteFooter } from "@/components/site-footer";
import { CONTACTS, PRODUCT } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: `${PRODUCT.name} is not medical advice and does not say a medicine is safe, genuine, or right for you.`,
};

export default function DisclaimerPage() {
  return (
    <Shell title="Disclaimer">
      <main className="gutter legal pt-6 pb-6">
        <p className="t-eyebrow">Disclaimer</p>
        <h1 className="t-h1">This is not medical advice</h1>
        <p>
          {PRODUCT.name} compares a label with public FDA Ghana notices. It does not diagnose, prescribe, or tell you to start, stop, or change a medicine. It does not confirm that a pack is registered, correctly made, or right for you.
        </p>
        <h2 className="t-h2">What an answer means</h2>
        <ul>
          <li><strong>Do not use</strong> means a public notice matched the batch, or the product name alone when that notice is not limited to one batch. Keep the pack and ask a pharmacist. If someone is seriously unwell, call 112.</li>
          <li><strong>Check first</strong> means something on the label needs a person to look at it, such as an expiry that has passed or a missing detail. It is not a recall by itself.</li>
          <li><strong>No alerts found</strong> means this check did not find a matching public FDA Ghana notice. It is not a promise the pack is free of quality problems.</li>
          <li><strong>We’re not sure</strong> means the batch could not be read well enough, or the FDA search did not answer. Treat that as check first. We do not guess an unreadable batch.</li>
        </ul>
        <h2 className="t-h2">Limits</h2>
        <p>
          Notices can be incomplete, updated, or newer than this copy. A photo can be blurry. A typed batch can be wrong. Live search, when it is enabled, looks only at fdaghana.gov.gh. If that search fails and we have no bundled FDA match, there is no verdict.
        </p>
        <p>
          Some example packs are fictional and labelled as examples. A real public notice, such as the Para Clear batch used in the demo, is still only a summary. Read the FDA page before you act on it.
        </p>
        <p>
          A photo cannot prove a medicine is genuine. Visual hints are not a verdict. A barcode match, a register score, and a scratch-code SMS are not proof of quality. “Registered, no alerts” means a small on-device snapshot lined up and no bundled notice matched. It is not a promise from the FDA.
        </p>
        <p>
          The cabinet watches notices stored in the app, plus a simulated notice you create for the demo. It does not receive a live feed. Reminders tell you to look at the pack. They are not a dose. Region reports are not a map of unsafe pharmacies. The manufacturer table is a dated excerpt, not a complete licence list.
        </p>
        <h2 className="t-h2">Who to call</h2>
        <p>
          These contacts are fixed. A model does not write them. Emergency: <a href={CONTACTS.emergency.href}>112</a>. Ghana FDA: <a href={CONTACTS.fda.href}>055 111 2224</a> or 055 111 2225. Side effects: <a href={CONTACTS.adr.href}>adr.fdaghana.gov.gh</a>.
        </p>
        <p>Ask a pharmacist or a doctor about any medicine you plan to take or give to someone else.</p>
      </main>
      <SiteFooter />
    </Shell>
  );
}
