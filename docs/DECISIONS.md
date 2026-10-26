# Decisions

Short record of choices a later change would otherwise undo. Dates are 25 Oct 2026 unless noted.

## One Next.js server, not a split app

Pages and `POST /api/verify` (SSE) live in the same Next server. A static export would remove the route handlers. Hosts that want a split set `NEXT_PUBLIC_API_BASE` and `CORS_ORIGINS`. We did not add a second process, a Python API, or SQLite. The cabinet is `localStorage` because the server must not keep photos or a family’s medicine list.

## Demo mode is the default, and live calls are doubly locked

`DEMO_MODE` defaults to true when unset, so a missing env file cannot spend money. `LLM_ENABLED=false` forces demo even if someone sets `DEMO_MODE=false`. Example packs send `forceDemo` / a scenario id and stay free even when keys exist. Providers count an attempt before the guard so tests fail if a “demo” path reaches the network. No key is stored in the repo. Development and CI do not call Nebius or Tavily.

## Nano for text, VL only for the photo, Ultra never

The credit budget is small. Vision is Nemotron 3.5 Super-VL because that is the pack-reading model. Normalise and verdict default to Nano. On a live check, Super writes the verdict only when confidence is under 0.8, the match is not an exact batch, and spend is under the soft line. Demo mode does not escalate. Ultra is coerced back to the fallback in `blockUltra` so a pasted Ultra id cannot hit the live path. Token caps exist because Super spends `max_tokens` on `reasoning_content` and can return null `content`. Empty content is recovered from reasoning or the check fails closed. Super’s own output cap is 1024. Nano stays at the configured cap, default 512.

The UI must show the model id the server would actually call. Demo traces say Nano was not called. They must not pretend the mock used Super.

## Spend file, not an invoice

`lib/server/spend.ts` prices tokens at a high flat rate so the hard stop (default 90% of $1) arrives before a real bill would. Soft stop is 70%. The file `data/spend.json` is gitignored. Ephemeral hosts may reset it. The in-memory counter still holds for the process. Rate limit is 30 checks a minute per IP and 120 a minute globally, and two live calls may run at once. Those numbers are in `.env.example`.

The in-memory cache is keyed by app, pipeline version, stage, and a hash of the normalised input. Vision and normalise last 30 minutes. Tavily results and verdict wording last 24 hours. The cap is 128 entries. Startup seeds normalise and verdict entries for the three example packs, so a live repeat of those labels can skip Token Factory. Example buttons still send `forceDemo` and do not read that cache. Tavily is not seeded with empty hits.

## Tavily is FDA Ghana only, and a failed search is not a verdict

`include_domains` is `fdaghana.gov.gh`, and results are filtered again with `isFdaGhanaHost`. WHO alerts are curated into `lib/modes/medicine/corpus.ts`. They are not fetched live. If Tavily fails and the bundled FDA snapshot has no match, the outcome is `search_failed`. The screen shows an error and Try again. It does not say “no alerts found”. A bundled FDA match still shows Do not use, because hiding a known alert when search is down would be worse.

## Rules set the category. The model may only write wording

`assessMedicine` and `presentAssessment` choose Do not use, Check first, No alerts found, or We’re not sure. The verdict model is told the category and is not allowed to downgrade an alert. Exact batch match is 0.98 and never unsure. Name-only whole-product alerts can be Do not use. Other name-only checks cannot. Low vision confidence and weak red flags become unsure rather than a confident Check first.

`honestBand` is separate from the header word. “Registered, no alerts” requires `register.found`. Otherwise a clean check is “No alerts found”.

## Contacts are a fixed list

`CONTACTS` in `lib/brand.ts` is human-checked: 112, 055 111 2224, 055 111 2225, and https://adr.fdaghana.gov.gh/. The research brief also listed 024 4310 297, ghanafda.medsafety.io, and a patient.php path. Those were not added. A model-written phone number is stripped by `scrubUnlistedContacts` unless it is 112, 193, or the two FDA hotlines. 193 is kept so a known emergency number is not blanked out of a sentence. It is not shown as a button.

## Name stays MedVerify GH

medverify.versatechq.com is a real Ghana registration checker with the same name. The design note recommends MedCheck GH. The user has not chosen. `PRODUCT` in `lib/brand.ts` is the only switch, with lockups already in `public/brand/logo/alt-name-medcheck/`. The npm package name `medverify-gh` can stay across a rename.

## Visual system is v2, token-only

v2 replaced v1. Neutral zinc, one teal accent, solid verdict strips, Onest / Source Sans 3 / Geist Mono, Phosphor. No tinted page background, no kente, no emoji as icons, no Google Fonts CDN. Theme follows the OS unless `mv-theme` or `?theme=` sets `data-theme`. App CSS is `app/tokens.css` plus `app/components.css` and `app/utilities.css`. Do not import the design pack’s `app.css`. Tailwind `dark:` is not how theme works here.

“A photo cannot prove a medicine is genuine” is required on screen. It is UI copy. Do not run that sentence through `enforceSafety`, which would rewrite “genuine”. The verdict itself still must not say the pack is genuine or safe.

## ClearView must not match Para Clear

`nameMatches` used to treat the token “clear” as a hit inside “clearview”, so the cabinet hero became a name-on-alert. Matching is whole-word now. Para Clear batch L220008 remains the real Do not use example. ClearView CV-44012 is fictional and is the registered demo. Glycove is fictional Check first. Pharmacist starter rows other than Para Clear are illustrations and disappear once a real row is logged.

## Register, references, facilities

The weighted register is two fictional rows so the demo can show points. It is labelled as not the FDA register. Reference images are SVGs we drew, compared by name, and labelled visual hints. The manufacturer table is four rows copied only where the September 2026 FDA PDF lined up company, region, and certificate. Ambiguous rows were left out. Do not add licence numbers from memory.

## GS1 is local

Ghana’s labelling guideline asks for GS1 on secondary packs, and the regulation was still a draft as of the brief, so many packs will not have a code. We decode in the browser and cross-check AI 01 / 17 / 10 / 21 plus the GTIN check digit. We do not call GS1’s paid prefix registry. A mismatch is a red flag, not a genuine verdict. The ClearView demo string uses a valid GTIN so the happy path is a real match.

## Scratch codes are a paste, not a gateway

mPedigree-style codes go to SMS 1393. Coverage is poor and the network often fails. The app never sends the SMS. A pasted reply is classified with a small bad-word list. It cannot override an FDA batch match.

## Reminders are not doses

The brief asked for expiry and dose reminders. A dose reminder would tell someone to take a medicine. We ship expiry warnings and morning or evening label checks, and the copy says to look at the pack. That is the whole feature.

## Cabinet alerts are simulated on purpose

`simulatePackAlert` writes a local notice whose URL is the real FDA recalls index. The UI says the match is simulated. We do not publish a fake FDA PDF. Recheck uses the bundled corpus only.

## Region reports stay on the phone

A shared heatmap needs a server and moderation. Notes are stored locally, stripped of phone numbers, and capped at 140 characters. The page says they are not a national map.

## Image handling

The server does not store the photo. Offline save uses IndexedDB and must not claim “photo not stored”. Before a photo is used, the server checks the type and magic bytes, caps the long edge at 1024, re-encodes JPEG with sharp, and strips EXIF. The client still shrinks the image before upload.

## Tests and the Next dev origin

`evals/run.ts` is wrapped in `main()` because `tsx` here is CJS and cannot top-level await. Playwright’s web server sets `DEMO_MODE=true`, `LLM_ENABLED=false`, and `DEMO_PACE_MS=0`. `allowedDevOrigins` includes `127.0.0.1`. Without it, Next blocks the dev client and buttons do nothing. That failure looks like a missing “Check medicine” button. It is a hydration failure.

## Deploy defaults

`Dockerfile` and `render.yaml` set `DEMO_MODE=true` and `LLM_ENABLED=false`. `vercel.json` is the same Next app, not a static export. Port 43123 avoids the usual 3000 / 5173 / 8080 clashes in this environment. Hugging Face is the same Docker image. A keep-warm ping exists only as `scripts/keep-warm.mjs` and a GitHub workflow that stays off until `KEEP_WARM=true`. Render’s free tier, as documented on 26 Oct 2026, spins down after 15 minutes without an inbound request. The ping is inbound, it is not hidden in the request path, and leaving it on spends the monthly free instance hours.
