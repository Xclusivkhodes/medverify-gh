import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { SiteFooter } from "@/components/site-footer";
import { PRODUCT } from "@/lib/brand";
import { MODEL_DEFAULTS, MODEL_ROLES, modelShortName } from "@/lib/models";

export const metadata: Metadata = {
  title: "How it works",
  description: `${PRODUCT.name} reads a pack, searches public FDA Ghana pages, and returns one cautious answer.`,
};

const steps = [
  { title: "Read the pack", model: MODEL_DEFAULTS.vision, body: MODEL_ROLES.vision },
  { title: "Check the label", model: MODEL_DEFAULTS.normalize, body: MODEL_ROLES.normalize },
  { title: "Search FDA alerts", model: "tavily/search", body: `${MODEL_ROLES.evidence} If this search fails and there is no bundled FDA notice, there is no verdict.` },
  { title: "Match your batch", model: MODEL_DEFAULTS.verdict, body: MODEL_ROLES.verdict },
];

export default function HowItWorksPage() {
  return (
    <Shell title="How it works">
      <main className="gutter legal pt-6 pb-6">
        <p className="t-eyebrow">How it works</p>
        <h1 className="t-h1">{PRODUCT.tagline}</h1>
        <p className="t-muted">
          {PRODUCT.name} reads a pack, searches public FDA Ghana pages, and returns one cautious answer. It does not say a medicine is safe, genuine, or right for you.
        </p>
        <ol className="grid gap-4" style={{ listStyle: "none", padding: 0 }}>
          {steps.map((step, index) => (
            <li key={step.title} className="card step-card">
              <p className="t-eyebrow">{index + 1}</p>
              <h2 className="t-h3 mt-1">{step.title}</h2>
              <p className="t-small t-muted">{modelShortName(step.model)}</p>
              <p className="model-id">{step.model}</p>
              <p className="mt-2">{step.body}</p>
            </li>
          ))}
        </ol>
        <h2 className="t-h2">After the check</h2>
        <p>
          Save the pack in the medicine cabinet. This phone re-checks the batch against the FDA and WHO notices it holds. You can simulate a new notice to see the warning: “Stop using batch …”, with the FDA recalls list and the report button. Expiry and label-check reminders are not a dose.
        </p>
        <p>
          A family cabinet keeps a parent’s or a child’s packs on the same phone. Pharmacist mode logs stock with the time you checked it. That time is not an FDA stamp.
        </p>
        <h2 className="t-h2">On a live check</h2>
        <p>
          Photos are re-encoded on the server and location data is stripped before a model sees them. The server does not keep the file. Nano writes the verdict. Super is used only when confidence is low, the batch is not an exact alert match, and spend is under the soft limit. Ultra is never called. The model may cite only the numbered FDA pages it was given. Any other number or link is dropped.
        </p>
        <p>
          Repeat checks of the same label can be served from a short memory on the server. The three example buttons stay on the bundled snapshot and do not call a model. Demo mode is the default.
        </p>
        <h2 className="t-h2">What else the check uses</h2>
        <p>
          Each field comes back with a confidence. Unreadable stays blank. A GS1 barcode is decoded on the phone and compared with the printed batch and expiry. A mismatch is a red flag. A small register snapshot shows weighted points for a few demo rows. It is not the full FDA register.
        </p>
        <p>
          If we have example artwork for that name, you get visual hints. Research on package photos was about 54% from the photo alone and about 75% with a reference. A photo cannot prove a medicine is genuine.
        </p>
        <p>
          If you see a scratch panel, text the code to 1393 yourself and paste the reply. We do not send the SMS. Scratch codes miss many packs and fail when the network is down.
        </p>
        <p>
          The name {PRODUCT.name} is also used by a registration checker at medverify.versatechq.com. That site checks registration. This product’s name is one setting and may change. The gap we close is batch-level recall matching, for a person and for a pharmacy’s stock.
        </p>
        <h2 className="t-h2">What to do now</h2>
        <p>112, Ghana FDA 055 111 2224 or 055 111 2225, and the Med Safety form at adr.fdaghana.gov.gh. These contacts are fixed. A model never writes them.</p>
        <p className="t-small t-muted">Colours, type, and the logo live in the theme files. A later brand pass edits those, not the check itself.</p>
      </main>
      <SiteFooter />
    </Shell>
  );
}
