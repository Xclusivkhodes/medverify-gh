# Feature list

Status words: **done**, **in progress**, **todo**.

Source of the list: `docs/research/medverify.md` (25 Oct 2026), plus the brand rules in `docs/design/BRAND.md` and the backend review in `docs/research/backend-review.md`. Items the brief called “later” are in scope when they do not need a third-party approval. Anything that needs an account, a paid registry, manufacturer rights, or a live API budget stays **todo** and is explained in `docs/ROADMAP.md`.

Checked on 25 Oct 2026, demo mode, no live Nebius or Tavily calls:

- `npm run lint` clean
- `npm run eval` — 19 labelled cases passed, plus the GS1, cabinet, register, scratch, and budget checks in `evals/run.ts`
- `npm run test:e2e` — 5 passed, 1 skipped (the desktop copy of the pharmacist/static test)
- `npm run build` succeeded
- Lighthouse mobile, production `next start`, Playwright Chromium, headless, `--no-sandbox`:

| Page | Performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| `/` | 93 | 100 | 100 | 100 |
| `/how-it-works` | 97 | 100 | 100 | 100 |
| `/privacy` | 98 | 100 | 100 | 100 |
| `/disclaimer` | 95 | 100 | 100 | 100 |
| `/pharmacist` | 94 | 100 | 100 | 100 |
| `/digest` | 97 | 100 | 100 | 100 |
| `/map` | 94 | 100 | 100 | 100 |
| `/cabinet` | 87 | 100 | 100 | 100 |

`/cabinet` was measured **before** the layout-shift fix (the empty state was inserted after hydration and moved the Reminders section, CLS 0.159). The fix is in `components/cabinet-view.tsx`. That page has not been measured again. Do not treat 87 as the current score, and do not assume it is 90 until you re-run Lighthouse.

## Demo script (the hero)

**done**

Acceptance:

- Eye drops (`clearview-drops`) returns the band “Registered, no alerts”, a GS1 line that the barcode matches the printed batch and expiry, and the sentence “A photo cannot prove a medicine is genuine.”
- Save to the cabinet, then “Simulate a new FDA alert”, shows “Stop using batch CV-44012”.
- “Open the FDA notice” goes to `https://fdaghana.gov.gh/newsroom/product-recalls-and-alerts/`. The copy says the match itself is simulated, not an FDA publication.
- “Report to FDA” goes to `https://adr.fdaghana.gov.gh/`.
- A WhatsApp draft opens `wa.me` with the warning text. Nothing is sent by a WhatsApp Business account.
- Playwright asserts the check makes no request to `tokenfactory.nebius.com` or `api.tavily.com`.

## 1. Medicine cabinet with recall watch

**done** for the on-device cabinet. **todo** for a warning that arrives while the site is closed.

Acceptance that is met:

- A result can be saved (name, batch, expiry, member). Duplicates collapse on normalised name + batch + member.
- Opening the cabinet re-checks saved packs against the bundled FDA and WHO snapshot. No network call.
- An exact batch match, or a simulated alert, uses the title “Stop using batch …”. A name-only public notice does not use “Stop using”.
- The in-app warning (`#push-stub`) includes the FDA link and the report link.
- If notification permission is already granted, the page also calls the Notification API. “Allow alerts on this phone” asks for that permission. If the browser has no Notification API, the on-screen warning still works.

Not met, and not faked:

- A push that fires when the tab is closed, and delivery through WhatsApp Business. Both need accounts and approvals this repo does not have.

## 2. Expiry and label-check reminders

**done**

Acceptance:

- Expiry inside 90 days, or already expired, can raise a line when the pack’s expiry reminder is on (default on).
- Morning (Accra hour 7–9, aimed at 08:00) and evening (19–21, aimed at 20:00) label checks.
- Copy says this is a prompt to look at the pack. It is not a dose and not advice to take the medicine.

## 3. Family cabinet

**done**

Acceptance:

- Default member is “You”.
- Add up to 8 people (child, parent, someone you care for).
- “You” cannot be removed. Removing anyone else moves their packs back to “you”.
- Alerts stay on this phone. They are not sent to another person’s device.

## 4. Pharmacist / chemical-seller mode

**done**

Acceptance:

- `/pharmacist` types a name (required), batch, and expiry, checks in demo mode, and logs up to 20 rows with the check time under “Verified on”.
- That time is the check time, not an FDA stamp.
- The home desktop table shares the same log. While the log is empty it shows illustration rows. Para Clear is the real alert. Metformin and amoxicillin stay labelled as illustrations. A real logged row replaces the illustrations.
- The page tells you to photograph on the home screen, then use “Log in pharmacist stock” on the answer.

## 5. Community pharmacy map

**in progress**

Done:

- `/map` lists the 16 regions of Ghana.
- A short note (max 140 characters, phone numbers stripped) is saved in `localStorage` (`mv-reports-v1`). It is not uploaded.
- Counts are “what this phone saved”, not a national heatmap.
- A dated excerpt of FDA licensed **local manufacturers** (September 2026), only where company, region, and certificate lined up: Kinapharma, GR Industries, Pokupharma, Ernest Chemist. Links to the FDA facilities register and the source PDF. Do not invent more licence numbers.

Todo:

- Pins for FDA-licensed **retail** pharmacies. The public list we used is manufacturers and storage sites, not a complete retail directory.
- A shared, anonymised map across phones. That would be a backend. This app has no database on purpose.

## 6. Weekly medicine safety digest

**done** as a bundled plain-language page. **todo** as a live Nemotron summary of newly scraped alerts.

Acceptance that is met:

- `/digest` renders `weeklyDigest()` from the bundled corpus. Procold Suspension is on the page.
- The page says it is the bundled snapshot, not a live weekly scrape.
- No model call.

## 7. Offline cache and low-data mode

**done** for a typed check after the app has loaded. **todo** for a service worker that precaches hashed Next chunks across deploys.

Acceptance that is met:

- Low-data mode (`localStorage` `mv-low-data`) hides the camera, asks you to type the label, and does not upload a photo.
- Offline, if there is a name, batch, or example, `offlineMedicineResult` runs the same rules, GS1, register, and visual hints without importing the live providers.
- A photo taken while offline can be kept in IndexedDB and retried. That path must not say the photo was not stored.

## Detection

### Structured vision read

**done** in code and in the demo. Live pixels are not sent until the budget is approved.

Acceptance:

- The vision prompt asks for brand, INN, strength, form, manufacturer, country, FDA reg no., batch, manufacture, expiry, and visible oddities.
- Each field is `{ value, confidence }` with `high | medium | low | unreadable`.
- `low` or `unreadable` blanks the value. The pipeline does not guess a digit.
- Demo and typed checks use `exampleReads`. Live checks use `parseVisionPayload`.
- The result always shows “What we read”, including per-field confidence.

### Barcode / GS1 DataMatrix

**done** for local decode and cross-check. **todo** for a GS1 company-prefix lookup (paid registry).

Acceptance:

- The browser can decode with ZXing (`lib/client/barcode.ts`) when a photo is sharp enough.
- `crossCheckGs1` reads AI 01, 17, 10, and 21 (parenthesised or element string, FNC1 as `\u001d`).
- GTIN-8/12/13/14 check digit. A bad digit is `gs1_bad_gtin` (high).
- Batch and expiry are compared with the printed fields. A clash is `gs1_mismatch` (high) and the verdict becomes Check first unless a stronger “do not use” already applies.
- Day `00` in AI 17 means end of month. ClearView’s demo string matches batch `CV-44012` and expiry `2028-09-30`.

### Register match with weights

**in progress**

Done:

- Points: registration number 40, name 30, manufacturer 20, strength 10.
- `found` requires the registration points (40) and name points of at least 20.
- The note says this is not the full FDA register and not a quality score.
- The only rows are fictional: ClearView `DEMO-FDA-22018` and Harbour `DEMO-FDA-10442`.

Todo:

- A real FDA product-register snapshot. No stable public API is wired. Do not paste unverified rows into `lib/modes/medicine/register.ts`.

### Batch-level alert matching

**done** against the bundled corpus. Live search is implemented and switched off.

Acceptance:

- Exact batch match → Do not use, confidence 0.98, band “Matches an alert: don't use”. Para Clear `L220008` is the public example.
- Name-only alert (no batch typed, and the notice is a whole-product alert such as HEALMOXY or COLDRIF) → Do not use at 0.72. A name-only check that is not a whole-product alert cannot become Do not use by itself. Its ceiling is Check first or “No alerts found” with the name-only wording.
- WHO notices stay in the curated corpus. Live Tavily, when enabled, searches `fdaghana.gov.gh` only.
- Name matching is whole-word, so ClearView does not match the alias “para clear”.
- If live search fails and nothing in the FDA snapshot matched, the outcome is `search_failed`: error, Try again, no verdict. A curated FDA match still shows Do not use if Tavily failed.

### Consistency rules

**done**

Acceptance:

- Expiry before manufacture, when manufacture was read at high or medium confidence, is `expiry_before_manufacture` (high, sure red flag).
- Shelf life under 1 year or over 6 years is `shelf_life` (info). It does not flip the verdict by itself.
- Demo examples leave manufacture unreadable so they do not pick up a false shelf-life flag.

### Reference visual hints

**in progress**

Done:

- ClearView and Harbour have example SVG artwork in `public/references/`. They are not manufacturer photos.
- A name match shows visual hints and the caveat: a photo cannot prove a medicine is genuine; research was about 54% from the photo alone and about 75% with a reference. The comparison is rules on the name, not a live Super-VL side-by-side.
- No reference → the screen says the picture was not compared.

Todo:

- 10–20 genuine reference photos of real antimalarials and antibiotics (rights).
- A live visual comparison. That is a model call and stays off with demo mode.

### Scratch-panel paste

**done** as a paste box. **todo** as an SMS gateway.

Acceptance:

- The UI tells the person to text 1393 themselves and paste the reply. The app does not send SMS.
- A reply that looks like fake, counterfeit, invalid, not found, do not use, substandard, suspicious, or failed sets `scratch_failed` (high).
- Any other non-empty reply is `scratch_pasted` (info) and does not by itself change the verdict.
- An FDA batch match still wins (Do not use).

### Honest bands and the report path

**done**

Acceptance:

- Header words: Do not use, Check first, No alerts found, We’re not sure.
- Second line: “Matches an alert: don't use” / “Check first, ask a pharmacist” / “Can't tell, ask a pharmacist” / “Registered, no alerts” (only when the on-device register row matched) / “No alerts found”.
- The screen never says the medicine is safe or genuine as the verdict. The visual caveat is allowed to say a photo cannot prove it is genuine, because that sentence is UI copy and is the research warning.
- Report and emergency actions use only 112, 055 111 2224, 055 111 2225, and adr.fdaghana.gov.gh. The brief also mentioned 024 4310 297, ghanafda.medsafety.io, and `adr.fdaghana.gov.gh/patient.php`. Those are not added. The human-checked list wins. See `docs/DECISIONS.md`.

## States, pages, and the professional bar

| Item | Status | Acceptance |
| --- | --- | --- |
| Camera only after tap; denial falls through to upload | done | Permission is not requested on load. |
| Blur and darkness check before submit | done | A failed photo offers Retake and Type it. |
| Type mode | done | Name required. Batch optional, monospace, uppercase, no autocorrect. |
| SSE stages while a check runs | done | The checklist names the step in progress. |
| Slow check, over 8 seconds | done | Banner: don’t take the medicine yet. Demo pace is 280ms, so this needs a slow run to see. |
| Offline and low-data | done | See section 7. |
| Search failed | done | Copy and Try again. Unreachable while demo mode forces the snapshot. |
| Low confidence | done | Unsure card. An exact batch match never becomes unsure. |
| Empty cabinet, empty pharmacist log, empty region list | done | Each has instructions, not a blank page. |
| 404, loading, and error boundaries | done | `app/not-found.tsx`, `loading.tsx`, `error.tsx`. |
| About, privacy, disclaimer, favicon, Open Graph | done | `/how-it-works`, `/privacy`, `/disclaimer`, `app/icon.svg`, `app/opengraph-image`. |
| Light and dark, system plus toggle | done | `mv-theme`. Moon in light, sun in dark. |
| Desktop pharmacist drop zone, paste, 20-row table | done | Paste is Ctrl+V on the desktop checker. |
| Twi | in progress | Placeholder string only. Banner says a native speaker is still needed. |
| Lighthouse 90+ on every main page | in progress | All measured pages except the pre-fix cabinet run are ≥ 90. Re-measure `/cabinet`. |
| Pixel-perfect pass at 360, 768, and 1440, light and dark | in progress | Mobile screenshots are in `docs/screenshots/`. Desktop shots are not saved. |

## Deploy and budget guards

| Item | Status | Acceptance |
| --- | --- | --- |
| `DEMO_MODE` default true | done | Unset is demo. Examples are always free. |
| `LLM_ENABLED` kill switch | done | `false` forces demo even if `DEMO_MODE=false`. |
| Spend counter, soft and hard stop | done | `data/spend.json` plus memory. High estimate, not an invoice. |
| Rate limit and live concurrency | done | 429 JSON when exceeded. Default 2 in flight. |
| Keys server-side only | done | Not in `NEXT_PUBLIC_*`. `.env` gitignored. `.env.example` committed with empty keys. |
| Dockerfile, `render.yaml`, `vercel.json` | done | Health check `/api/status`. Image defaults to demo and `LLM_ENABLED=false`. |
| In-memory response cache | done | SHA-256, 30 minutes, 32 entries. Not a per-stage 24h Tavily cache, and examples are not pre-warmed into it. |
| sharp re-encode and EXIF strip | todo | The browser shrinks the photo (`lib/client/media.ts`). The server does not re-encode with sharp. |
| Numbered citation validator | todo | Evidence URLs are built from the corpus and from FDA hosts that passed the filter. The model is not given a numbered list that is then checked number-by-number. |
| Keep-warm ping | todo | A free Render or Spaces instance can sleep. |
| Automatic Super escalation on low confidence | todo | Verdict model stays Nano unless `NEBIUS_VERDICT_MODEL` is set to Super. Ultra cannot be selected. |

## Competitor position (copy, not a separate feature)

**done** as on-screen and `/how-it-works` copy.

- Existing MedVerify (medverify.versatechq.com) checks registration. This app matches batches to recalls. The name clash is stated. The product name stays a config constant.
- Scratch codes are optional paste, not the only path.
- No spectroscopy hardware and no claim that a photo proves the pack is genuine.
