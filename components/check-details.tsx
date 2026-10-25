"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Barcode, Check, ImageSquare, Scales, WhatsappLogo } from "@phosphor-icons/react";
import { PRODUCT } from "@/lib/brand";
import { logStock, savePack, useCabinet } from "@/lib/client/cabinet-store";
import type { MedicineResult } from "@/lib/modes/medicine/types";

const CONFIDENCE_LABEL = { high: "High", medium: "Medium", low: "Low", unreadable: "Unreadable" } as const;

export function CheckDetails({ result }: { result: MedicineResult }) {
  const store = useCabinet();
  const router = useRouter();
  const [memberId, setMemberId] = useState("you");
  const [note, setNote] = useState("");
  const chosen = store.members.some((member) => member.id === memberId) ? memberId : store.members[0]?.id ?? "you";

  function save() {
    savePack({
      memberId: chosen,
      productName: result.fields.productName || "Unnamed pack",
      batch: result.fields.batch,
      expiry: result.fields.expiry,
      manufacturer: result.fields.manufacturer,
      registrationNumber: result.fields.registrationNumber,
      presentation: result.outcome === "search_failed" ? "unsure" : result.presentation,
      headline: result.headline,
      evidenceUrl: result.evidence.find((item) => item.role === "match")?.url ?? "",
      evidenceTitle: result.evidence.find((item) => item.role === "match")?.title ?? "",
      expiryReminder: true,
      labelReminder: { morning: false, evening: false },
    });
    setNote("Saved on this phone.");
    router.push("/cabinet");
  }

  function log() {
    logStock({
      productName: result.fields.productName || "Unnamed pack",
      batch: result.fields.batch || "not read",
      expiry: result.fields.expiry,
      presentation: result.outcome === "search_failed" ? "unsure" : result.presentation,
      source: result.evidence.find((item) => item.role === "match")?.title ?? "No FDA notice in the snapshot",
      href: result.evidence.find((item) => item.role === "match")?.url,
    });
    setNote("Logged in the pharmacist stock list on this phone.");
    router.push("/pharmacist");
  }

  return (
    <>
      <section className="card mt-6 p-5" aria-labelledby="save-h">
        <h2 id="save-h" className="t-label">Keep watching this batch</h2>
        <p className="t-small t-muted mt-1">Saved on this phone only. {PRODUCT.name} re-checks it against the FDA and WHO notices it holds, and you can simulate a new alert.</p>
        <label className="field-label mt-4" htmlFor="save-for">Save for</label>
        <select id="save-for" className="input" value={chosen} onChange={(event) => setMemberId(event.target.value)}>
          {store.members.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
        <button type="button" className="btn btn-primary btn-block mt-4" onClick={save}>
          <Check className="icon-sm" aria-hidden="true" /> Save to the cabinet
        </button>
        <button type="button" className="btn btn-outline btn-block mt-3" onClick={log}>
          Log in pharmacist stock
        </button>
        {note ? <p className="t-small mt-3" role="status">{note}</p> : null}
        <a className="btn btn-plain btn-block mt-2" href={`https://wa.me/?text=${encodeURIComponent(`${PRODUCT.name}: ${result.fields.productName || "a pack"} batch ${result.fields.batch || "not read"}. ${result.band}. Not medical advice.`)}`}>
          <WhatsappLogo className="icon-sm" aria-hidden="true" /> Share this check on WhatsApp
        </a>
      </section>

      <section className="card mt-6 p-5" aria-labelledby="read-conf">
        <h2 id="read-conf" className="t-label">Field confidence</h2>
        <p className="t-small t-muted mt-1">Unreadable means we left it blank. We do not guess a digit.</p>
        <dl className="field-conf mt-4">
          {result.reads.map((read) => (
            <div key={read.key}>
              <dt>{read.label}</dt>
              <dd className={read.key === "batch" || read.key === "expiry" ? "t-mono" : undefined}>{read.value || "—"}</dd>
              <dd className={read.confidence === "unreadable" || read.confidence === "low" ? "t-muted" : undefined}>{CONFIDENCE_LABEL[read.confidence]}</dd>
            </div>
          ))}
        </dl>
        {result.oddities.length ? (
          <ul className="mt-4 t-small">
            {result.oddities.map((oddity) => (
              <li key={oddity}>{oddity}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card mt-4 p-5" aria-labelledby="gs1-h">
        <h2 id="gs1-h" className="t-label flex items-center gap-2">
          <Barcode className="icon-sm" aria-hidden="true" /> Barcode cross-check
        </h2>
        {result.gs1 ? (
          <>
            <p className="mt-2">{result.gs1.summary}</p>
            <dl className="readback mt-3">
              <dt>GTIN</dt>
              <dd className="t-mono">{result.gs1.gtin || "Not in the code"}</dd>
              <dd>{result.gs1.gtin ? (result.gs1.gtinValid ? "Check digit ok" : "Bad check digit") : "—"}</dd>
              <dt>AI (10) batch</dt>
              <dd className="t-mono">{result.gs1.batch || "—"}</dd>
              <dd>{result.gs1.batchMatch}</dd>
              <dt>AI (17) expiry</dt>
              <dd className="t-mono">{result.gs1.expiry || "—"}</dd>
              <dd>{result.gs1.expiryMatch}</dd>
            </dl>
          </>
        ) : (
          <p className="t-muted mt-2">No GS1 barcode was decoded on this phone. Many packs in Ghana still have no GS1 code. A scratch panel, if you see one, can be texted to 1393. We do not send that SMS.</p>
        )}
      </section>

      <section className="card mt-4 p-5" aria-labelledby="reg-h">
        <h2 id="reg-h" className="t-label flex items-center gap-2">
          <Scales className="icon-sm" aria-hidden="true" /> Register snapshot · {result.register.score}/{result.register.max}
        </h2>
        <p className="t-small t-muted mt-1">{result.register.found ? "The registration number lines up with a snapshot row." : "Not found in the on-device register snapshot."}</p>
        <ul className="mt-3 grid gap-2">
          {result.register.lines.map((line) => (
            <li key={line.label} className="flex items-baseline justify-between gap-3">
              <span>{line.label}<span className="t-small t-muted"> · {line.detail}</span></span>
              <span className="t-mono">{line.points}/{line.max}</span>
            </li>
          ))}
        </ul>
        <p className="t-small t-muted mt-3">{result.register.note}</p>
      </section>

      <section className="card mt-4 p-5" aria-labelledby="vis-h">
        <h2 id="vis-h" className="t-label flex items-center gap-2">
          <ImageSquare className="icon-sm" aria-hidden="true" /> Visual hints
        </h2>
        {result.visual.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.visual.image} alt={result.visual.referenceLabel ? `Reference card, ${result.visual.referenceLabel}` : ""} className="mt-3" style={{ width: "100%", height: "auto", borderRadius: 12 }} />
        ) : null}
        <ul className="mt-3 grid gap-2">
          {result.visual.hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
        <p className="t-small t-muted mt-3">{result.visual.caveat}</p>
      </section>

    </>
  );
}
