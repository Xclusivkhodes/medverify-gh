"use client";

import { useState } from "react";
import { MapPin } from "@phosphor-icons/react";
import { Shell } from "@/components/shell";
import { SiteFooter } from "@/components/site-footer";
import { GHANA_REGIONS, type GhanaRegion } from "@/lib/cabinet/regions";
import { addReport, useReports } from "@/lib/client/reports-store";
import { FACILITY_EXCERPT, FACILITY_SOURCE } from "@/lib/modes/medicine/facilities";

export function MapView() {
  const reports = useReports();
  const [region, setRegion] = useState<GhanaRegion>("Greater Accra");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState("");

  return (
    <Shell title="Reports by region">
      <main className="gutter pt-6 pb-8">
        <p className="t-eyebrow flex items-center gap-2"><MapPin className="icon-sm" aria-hidden="true" /> On this phone</p>
        <h1 className="t-h1 mt-2">Suspicious packs by region</h1>
        <p className="t-muted mt-2">
          A report stays on this phone. It is not uploaded, and it is not a national map. Counts only show what you have saved here. Do not include a person’s name or phone number.
        </p>
        <form
          className="card p-5 mt-6 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            addReport(region, note);
            setNote("");
            setSaved(`Saved a report for ${region} on this phone.`);
          }}
        >
          <div>
            <label className="field-label" htmlFor="region">Region</label>
            <select id="region" className="input" value={region} onChange={(event) => setRegion(event.target.value as GhanaRegion)}>
              {GHANA_REGIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="report-note">What looked wrong</label>
            <textarea id="report-note" className="input" style={{ minHeight: 96, paddingTop: 12, paddingBottom: 12 }} maxLength={140} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Spelling, price, or a batch you were asked not to use" />
          </div>
          <button className="btn btn-primary btn-block" type="submit">Save report on this phone</button>
          {saved ? <p className="t-small" role="status">{saved}</p> : null}
        </form>

        <h2 className="t-h2 mt-8">Counts on this phone</h2>
        <ul className="region-grid mt-4">
          {GHANA_REGIONS.map((item) => {
            const count = reports.filter((report) => report.region === item).length;
            return (
              <li key={item}>
                <button type="button" className="card p-3" aria-pressed={region === item} onClick={() => setRegion(item)} style={{ width: "100%", textAlign: "left" }}>
                  <span className="t-label">{item}</span>
                  <span className="t-small t-muted" style={{ display: "block" }}>{count === 0 ? "None saved" : `${count} report${count === 1 ? "" : "s"}`}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <h2 className="t-h2 mt-8">Licensed manufacturers</h2>
        <p className="t-muted mt-2">
          This is a short excerpt of FDA Ghana’s September 2026 list of licensed local manufacturing sites. It is not every pharmacy, and licences expire. Search the FDA register before you rely on it.
        </p>
        <div className="card mt-4" style={{ overflowX: "auto" }}>
          <table className="tbl tbl-stack">
            <caption className="sr-only">Excerpt of FDA licensed local manufacturers</caption>
            <thead>
              <tr>
                <th>Name</th>
                <th>Region</th>
                <th>Certificate</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {FACILITY_EXCERPT.map((row) => (
                <tr key={row.certificate}>
                  <td data-label="Name"><strong>{row.name}</strong><br /><span className="t-small t-muted">{row.where}</span></td>
                  <td data-label="Region">{row.region}</td>
                  <td data-label="Certificate" className="t-mono">{row.certificate}</td>
                  <td data-label="Expires">{row.expires}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="t-small mt-3">
          <a href={FACILITY_SOURCE.search}>Search the FDA licensed-facilities register</a>
          {" · "}
          <a href={FACILITY_SOURCE.url}>{FACILITY_SOURCE.title}</a>
        </p>
      </main>
      <SiteFooter />
    </Shell>
  );
}
