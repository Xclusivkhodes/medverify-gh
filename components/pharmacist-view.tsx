"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Storefront, Trash } from "@phosphor-icons/react";
import { Shell } from "@/components/shell";
import { SiteFooter } from "@/components/site-footer";
import { footerDisclaimer, type Presentation } from "@/lib/brand";
import { logStock, removeStock, useCabinet } from "@/lib/client/cabinet-store";
import { streamCheck } from "@/lib/client/stream";

function stamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const WORD: Record<Presentation, string> = {
  do_not_use: "Do not use",
  check_first: "Check first",
  no_alerts: "No alerts found",
  unsure: "Not sure",
};

export function PharmacistView() {
  const store = useCabinet();
  const [name, setName] = useState("");
  const [batch, setBatch] = useState("");
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Type the product name on the pack.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await streamCheck(
        {
          mode: "medicine",
          forceDemo: true,
          productName: name.trim(),
          batch: batch.trim(),
          expiry: expiry.trim(),
        },
        () => undefined,
      );
      const match = result.evidence.find((item) => item.role === "match");
      logStock({
        productName: name.trim(),
        batch: batch.trim() || "not read",
        expiry: expiry.trim(),
        presentation: result.outcome === "search_failed" ? "unsure" : result.presentation,
        source: match?.title ?? "No FDA notice in the snapshot",
        href: match?.url,
      });
      setName("");
      setBatch("");
      setExpiry("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That batch could not be checked.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Pharmacist stock">
      <main className="gutter pt-6 pb-8">
        <p className="t-eyebrow flex items-center gap-2"><Storefront className="icon-sm" aria-hidden="true" /> For pharmacists</p>
        <h1 className="t-h1 mt-2">Stock checked at intake</h1>
        <p className="t-muted mt-2">
          Check a batch as it comes in. The log keeps the time you checked it, so you can show a customer when that batch was compared with public notices. The time is not an FDA stamp. The list stays on this phone.
        </p>
        <form className="card p-5 mt-6 grid gap-4" onSubmit={(event) => void onSubmit(event)}>
          <div>
            <label className="field-label" htmlFor="stock-name">Product name</label>
            <input id="stock-name" className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="As printed" />
          </div>
          <div>
            <label className="field-label" htmlFor="stock-batch">Batch</label>
            <input id="stock-batch" className="input t-mono" value={batch} autoCapitalize="characters" autoCorrect="off" spellCheck={false} onChange={(event) => setBatch(event.target.value.toUpperCase())} placeholder="Leave blank if you cannot read it" />
          </div>
          <div>
            <label className="field-label" htmlFor="stock-expiry">Expiry</label>
            <input id="stock-expiry" className="input t-mono" value={expiry} autoCorrect="off" onChange={(event) => setExpiry(event.target.value)} placeholder="12/2027" />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy || store.stock.length >= 20}>
            {busy ? "Checking…" : "Check and log"}
          </button>
          {store.stock.length >= 20 ? <p className="t-small t-muted">This log holds 20 batches. Remove one to add another.</p> : null}
          {error ? <p className="note note--warn" role="alert">{error}</p> : null}
        </form>
        <p className="t-small t-muted mt-4">
          <Link href="/">Photograph a pack</Link> on the home screen, then choose Log in pharmacist stock on the answer.
        </p>

        <section className="mt-8" aria-labelledby="log-h">
          <h2 id="log-h" className="t-h2">Verified-on log</h2>
          {!store.stock.length ? (
            <p className="t-muted mt-3">No stock logged yet. Starter rows on the home screen are illustrations, not checks, and they are not listed here.</p>
          ) : null}
          {store.stock.length ? (
            <div className="card mt-4" style={{ overflowX: "auto" }}>
              <table className="tbl">
                <caption className="sr-only">Batches checked on this phone, with the time of each check.</caption>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Batch</th>
                    <th>Result</th>
                    <th>Verified on</th>
                    <th><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {store.stock.map((line) => (
                    <tr key={line.id}>
                      <td>
                        <strong>{line.productName}</strong>
                        {line.expiry ? <><br /><span className="t-small t-muted">Exp {line.expiry}</span></> : null}
                      </td>
                      <td className="t-mono">{line.batch}</td>
                      <td>{WORD[line.presentation]}</td>
                      <td>
                        {stamp(line.verifiedOn)}
                        <br />
                        {line.href ? <a href={line.href}>{line.source}</a> : <span className="t-small t-muted">{line.source}</span>}
                      </td>
                      <td>
                        <button type="button" className="btn btn-icon btn-plain" aria-label={`Remove ${line.productName}`} onClick={() => removeStock(line.id)}>
                          <Trash className="icon-sm" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
        <p className="t-small t-subtle mt-8">{footerDisclaimer()}</p>
      </main>
      <SiteFooter />
    </Shell>
  );
}
