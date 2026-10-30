"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowSquareOut,
  BellRinging,
  CheckCircle,
  Plus,
  Trash,
  UsersThree,
  WarningOctagon,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { Shell } from "@/components/shell";
import { SiteFooter } from "@/components/site-footer";
import { CONTACTS } from "@/lib/brand";
import {
  expiryBucket,
  noticeFor,
  relationLabel,
  reminderLines,
  warningCopy,
  type CabinetPack,
  type Relation,
  type WatchNotice,
} from "@/lib/cabinet/logic";
import {
  addMember,
  clearPackAlert,
  removeMember,
  removePack,
  simulatePackAlert,
  touchRecheck,
  updatePack,
  useCabinet,
} from "@/lib/client/cabinet-store";

function stamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Accra", day: "numeric", month: "short", year: "numeric" }).format(date);
}

function ping(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    /* The in-app stub still shows when the browser blocks Notification. */
  }
}

export function CabinetView() {
  const store = useCabinet();
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<Relation>("child");
  const [perm, setPerm] = useState<string>("");
  const [rechecked, setRechecked] = useState("");

  const notices = store.packs
    .map((pack) => ({ pack, notice: noticeFor(pack) }))
    .filter((item): item is { pack: CabinetPack; notice: WatchNotice } => Boolean(item.notice));
  const lead = notices[0];
  const reminderItems = store.packs.flatMap((pack) => {
    const member = store.members.find((item) => item.id === pack.memberId);
    return reminderLines(pack).map((line) => ({ id: `${pack.id}-${line}`, who: member?.name ?? "You", line, product: pack.productName }));
  });

  function simulate(pack: CabinetPack) {
    simulatePackAlert(pack.id);
    const notice = noticeFor({ ...pack, simulatedAlert: { batch: pack.batch, productName: pack.productName, title: "", url: "", summary: "", createdAt: "" } });
    if (notice) {
      const member = store.members.find((item) => item.id === pack.memberId);
      const copy = warningCopy(pack, { ...notice, kind: "simulated", simulated: true }, member?.name);
      ping(copy.title, copy.body);
    }
    requestAnimationFrame(() => document.getElementById("push-stub")?.focus());
  }

  async function allowAlerts() {
    if (typeof Notification === "undefined") {
      setPerm("This browser has no push alerts. The on-screen warning still works.");
      return;
    }
    const next = await Notification.requestPermission();
    setPerm(next === "granted" ? "Phone alerts are on for this site." : "Phone alerts stay off. The on-screen warning still works.");
  }

  return (
    <Shell title="Medicine cabinet">
      <main className="gutter pt-6 pb-8">
        <p className="t-eyebrow">Recall watch</p>
        <h1 className="t-h1 mt-2">Your medicine cabinet</h1>
        <p className="t-muted mt-2">
          Saved packs stay on this phone. Open the cabinet and we re-check each batch against the FDA and WHO notices held here. A new match raises a warning, with the notice and the report button.
        </p>

        {lead ? (
          <AlertStub pack={lead.pack} notice={lead.notice} memberName={store.members.find((member) => member.id === lead.pack.memberId)?.name} />
        ) : null}

        {!store.packs.length ? (
          <section className="card p-5 mt-6">
            <h2 className="t-h3">Nothing saved yet</h2>
            <ol className="steps-ol mt-3 grid gap-2">
              <li>On the home screen, choose Eye drops.</li>
              <li>Check it. The answer should say Registered, no alerts.</li>
              <li>Save it here, then simulate a new FDA alert.</li>
            </ol>
            <Link href="/" className="btn btn-primary btn-block mt-4">Check a pack</Link>
          </section>
        ) : null}

        <section className="mt-8" aria-labelledby="rem-h">
          <h2 id="rem-h" className="t-h2">Reminders</h2>
          <p className="t-small t-muted mt-1">A label check tells you to look at the pack. It is not a dose, and it is not advice to take the medicine.</p>
          {reminderItems.length ? (
            <ul className="card divided mt-4">
              {reminderItems.map((item) => (
                <li key={item.id} className="px-5 py-3">
                  <p className="t-label">{item.product}</p>
                  <p className="t-small t-muted">{item.who} · {item.line}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-muted mt-3">No reminder is due. Turn on a morning or evening label check on a saved pack.</p>
          )}
        </section>

        <section className="mt-8" aria-labelledby="fam-h">
          <h2 id="fam-h" className="t-h2 flex items-center gap-2"><UsersThree className="icon-sm" aria-hidden="true" /> Family</h2>
          <p className="t-small t-muted mt-1">Parents’ and children’s packs live here. Alerts stay on this phone, for the person looking after them.</p>
          <ul className="flex flex-wrap gap-2 mt-4">
            {store.members.map((member) => (
              <li key={member.id} className="chip">
                {member.name}
                <span className="t-muted"> · {relationLabel(member.relation)}</span>
                {member.id !== "you" ? (
                  <button type="button" className="btn btn-plain" aria-label={`Remove ${member.name}`} onClick={() => removeMember(member.id)}>
                    <Trash className="icon-xs" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <form
            className="grid gap-3 mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              addMember(name, relation);
              setName("");
            }}
          >
            <div>
              <label className="field-label" htmlFor="member-name">Add someone</label>
              <input id="member-name" className="input" value={name} maxLength={40} placeholder="Name" onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="member-rel">Relationship</label>
              <select id="member-rel" className="input" value={relation} onChange={(event) => setRelation(event.target.value as Relation)}>
                <option value="child">Child</option>
                <option value="parent">Parent</option>
                <option value="other">Someone you care for</option>
              </select>
            </div>
            <button className="btn btn-outline" type="submit" disabled={store.members.length >= 8}>
              <Plus className="icon-sm" aria-hidden="true" /> Add to the cabinet
            </button>
          </form>
        </section>

        {store.packs.length ? (
          <section className="mt-8" aria-labelledby="packs-h">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 id="packs-h" className="t-h2">Saved packs</h2>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  touchRecheck();
                  setRechecked("Rechecked on this phone against the FDA and WHO snapshot. No network call.");
                }}
              >
                Recheck now
              </button>
            </div>
            {rechecked ? <p className="t-small t-muted mt-2" role="status">{rechecked}</p> : null}
            <div className="grid gap-4 mt-4">
              {store.packs.map((pack) => {
                const notice = noticeFor(pack);
                const member = store.members.find((item) => item.id === pack.memberId);
                const bucket = expiryBucket(pack.expiry);
                return (
                  <article key={pack.id} className="card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="t-h3">{pack.productName}</h3>
                        <p className="t-small t-muted mt-1">Batch <span className="t-mono">{pack.batch || "not read"}</span> · Expiry <span className="t-mono">{pack.expiry || "not read"}</span></p>
                      </div>
                      {notice ? <WarningOctagon className="icon" weight="fill" aria-hidden="true" style={{ color: "var(--color-scam-fg)" }} /> : <CheckCircle className="icon" weight="fill" aria-hidden="true" style={{ color: "var(--color-ok-fg)" }} />}
                    </div>
                    <p className="mt-3">{notice ? warningCopy(pack, notice, member?.name).title : pack.headline || "No alert on the last check."}</p>
                    <p className="t-small t-muted mt-1">Last checked {stamp(pack.lastCheckedAt)} · {bucket === "soon" ? "Expires soon" : bucket === "expired" ? "Printed expiry has passed" : "Expiry not urgent"}</p>
                    <label className="field-label mt-4" htmlFor={`who-${pack.id}`}>Who it is for</label>
                    <select id={`who-${pack.id}`} className="input" value={pack.memberId} onChange={(event) => updatePack(pack.id, { memberId: event.target.value })}>
                      {store.members.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                    <fieldset className="mt-4 grid gap-2">
                      <legend className="field-label">Reminders</legend>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={pack.expiryReminder} onChange={(event) => updatePack(pack.id, { expiryReminder: event.target.checked })} />
                        Remind me as the expiry gets close
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={pack.labelReminder.morning}
                          onChange={(event) => updatePack(pack.id, { labelReminder: { ...pack.labelReminder, morning: event.target.checked } })}
                        />
                        Morning label check, 08:00
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={pack.labelReminder.evening}
                          onChange={(event) => updatePack(pack.id, { labelReminder: { ...pack.labelReminder, evening: event.target.checked } })}
                        />
                        Evening label check, 20:00
                      </label>
                    </fieldset>
                    <div className="grid gap-3 mt-4">
                      {!notice && pack.batch ? (
                        <button type="button" className="btn btn-primary btn-block" id={pack.id === store.packs[0]?.id ? "simulate-alert" : undefined} onClick={() => simulate(pack)}>
                          <BellRinging className="icon-sm" aria-hidden="true" /> Simulate a new FDA alert
                        </button>
                      ) : null}
                      {notice?.simulated ? (
                        <button type="button" className="btn btn-outline btn-block" onClick={() => clearPackAlert(pack.id)}>
                          Clear the simulated notice
                        </button>
                      ) : null}
                      <button type="button" className="btn btn-plain" onClick={() => removePack(pack.id)}>
                        <Trash className="icon-sm" aria-hidden="true" /> Remove from the cabinet
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="btn btn-outline" onClick={() => void allowAlerts()}>Allow alerts on this phone</button>
          <Link href="/pharmacist" className="btn btn-plain">Pharmacist stock log</Link>
        </div>
        {perm ? <p className="t-small t-muted mt-3" role="status">{perm}</p> : null}
      </main>
      <SiteFooter />
    </Shell>
  );
}

function AlertStub({ pack, notice, memberName }: { pack: CabinetPack; notice: WatchNotice; memberName?: string }) {
  const copy = warningCopy(pack, notice, memberName);
  return (
    <article id="push-stub" className="push-stub mt-6" tabIndex={-1} role="alert" aria-labelledby="push-title">
      <p className="t-eyebrow">{notice.simulated ? "Simulated cabinet warning" : "Cabinet warning"}</p>
      <h2 id="push-title" className="t-h2 mt-1">{copy.title}</h2>
      <p className="mt-2">{copy.body}</p>
      {notice.summary ? <p className="t-small t-muted mt-2">{notice.summary}</p> : null}
      <div className="grid gap-3 mt-4">
        <a className="btn btn-primary btn-block" href={notice.url} rel="noopener noreferrer">
          <ArrowSquareOut className="icon-sm" aria-hidden="true" /> Open the FDA notice
        </a>
        <a className="btn btn-outline btn-block" href={CONTACTS.adr.href} rel="noopener noreferrer">
          Report to FDA
        </a>
        <a className="btn btn-outline btn-block" href={`https://wa.me/?text=${encodeURIComponent(copy.whatsApp)}`} rel="noopener noreferrer">
          <WhatsappLogo className="icon-sm" aria-hidden="true" /> WhatsApp warning
        </a>
      </div>
    </article>
  );
}
