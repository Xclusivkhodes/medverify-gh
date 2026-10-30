"use client";

import { Shell } from "@/components/shell";
import { SiteFooter } from "@/components/site-footer";
import { weeklyDigest } from "@/lib/modes/medicine/digest";

export function DigestView() {
  const items = weeklyDigest();
  return (
    <Shell title="Safety digest">
      <main className="gutter legal pt-6 pb-8">
        <p className="t-eyebrow">Bundled snapshot</p>
        <h1 className="t-h1">Notices in plain words</h1>
        <p className="t-muted">
          This is the FDA and WHO snapshot shipped with the app, written out in plain sentences. It is not a live weekly scrape, and a model did not write it. Live wording stays off until the API budget is turned on.
        </p>
        <ol className="grid gap-4" style={{ listStyle: "none", padding: 0 }}>
          {items.map((item) => (
            <li key={item.id} className="card p-5">
              <p className="t-eyebrow">{item.source} · {item.issued}</p>
              <h2 className="t-h3 mt-1">{item.productName}</h2>
              {item.batches ? <p className="t-mono t-small mt-1">{item.batches}</p> : null}
              <p className="mt-3">{item.plain}</p>
              <a className="t-small font-semibold" href={item.url}>Read the notice</a>
            </li>
          ))}
        </ol>
      </main>
      <SiteFooter />
    </Shell>
  );
}
