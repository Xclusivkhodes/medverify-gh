# MedVerify GH

Check a medicine pack against public Ghana FDA and WHO alerts. Save it, and this phone keeps watching that batch.

The product name lives in `lib/brand.ts`. MedCheck GH lockups are already in `public/brand/logo/alt-name-medcheck`. Do not rename until that choice is made.

Start with [AGENTS.md](AGENTS.md) if you are continuing the work. Feature status is in [docs/FEATURES.md](docs/FEATURES.md), next steps in [docs/ROADMAP.md](docs/ROADMAP.md), and the reasons for the current shape in [docs/DECISIONS.md](docs/DECISIONS.md).

This is not medical advice. A photo cannot prove a medicine is genuine. “No alerts found” and “Registered, no alerts” are not a promise the pack is right for you.

## What you can do

- Photograph a pack, upload one, or type the label. Blurry and dark photos are refused. The batch is never guessed.
- Nemotron 3.5 Super-VL is the vision model on the live path. Each field has a confidence. `unreadable` stays blank.
- Barcodes and GS1 DataMatrix codes are decoded in the browser (ZXing). AI (10) batch and AI (17) expiry are compared with the printed label and the GTIN check digit is validated. A mismatch is a red flag.
- Batches are matched to a bundled FDA and WHO snapshot. Live search, when you turn it on, is limited to `fdaghana.gov.gh`.
- A few demo packs have example reference artwork. The screen calls that **visual hints**. It is not a genuine-product verdict.
- **Medicine cabinet.** Saved packs are re-checked on this phone. Simulate a new FDA notice and the screen says “Stop using batch …”, with the FDA recalls list, the report button, an optional browser notification, and a WhatsApp draft.
- Expiry reminders and morning or evening **label checks**. A reminder is not a dose.
- Family names on the same phone, so a child’s pack warns the person holding the phone.
- Pharmacist stock log with a verified-on time. That time is not an FDA stamp.
- Region reports saved only on this phone, plus a short dated excerpt of FDA licensed manufacturers and a link to the FDA facilities register.
- A plain-language digest of the bundled notices. A model does not write it while demo mode is on.
- Low-data mode types the label and does not upload a photo. Offline, a typed check uses the snapshot in the app.

Fixed contacts, never written by a model: **112**, Ghana FDA **055 111 2224** / **055 111 2225**, and [adr.fdaghana.gov.gh](https://adr.fdaghana.gov.gh/).

## Run it locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

Demo mode is the default. Copy `.env.example` to `.env` only when you mean to change that. No API key is required for the demo, and the demo does not call Nebius or Tavily.

Try **Eye drops**, save the result, then **Simulate a new FDA alert**. **Child’s fever syrup** is the public Para Clear batch L220008 (do not use).

## Checks

```bash
npm run eval          # rules, safety, GS1, cabinet watch. No network.
npm run lint
npx tsc --noEmit
npm run test:e2e      # Playwright, DEMO_MODE, asserts no Nebius or Tavily
```

`npm run eval:live` refuses live calls on purpose.

## Models and budget

All live model calls would go through Nebius Token Factory, OpenAI-compatible, base URL `https://api.tokenfactory.nebius.com/v1`.

| Step | Default model |
| --- | --- |
| Read the pack | `nvidia/Nemotron-3.5-Super-VL` |
| Check the label | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` |
| Wording | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` |
| FDA pages | Tavily, `include_domains: fdaghana.gov.gh` only |

Ultra is rejected if you paste its id into the env. Nano writes the verdict. On a live check, Super is used only when confidence is under 0.8, the batch is not an exact alert match, and spend is under the soft line. Demo mode does not escalate. Output is capped (`NEBIUS_MAX_TOKENS`, default 512; Super uses 1024) because Super can spend the whole cap on `reasoning_content` and return empty `content`. Empty content is recovered from reasoning or the check fails closed.

The verdict model is given a numbered list of sources and may cite only those numbers. Any other number or URL is dropped. Photos are re-encoded on the server (long edge 1024, JPEG, EXIF removed) and are not stored. Repeat live checks of the same label can be served from a short in-memory cache. The three example packs are seeded into that cache. The example buttons still force demo mode and do not call a model.

`DEMO_MODE=true` is the default. `LLM_ENABLED=false` forces demo even if `DEMO_MODE` is turned off. Leave both like that until you accept the API budget.

A live process also keeps a rough spend counter (`BUDGET_USD` default $1, soft 70%, hard 90%). The price is a high estimate, not a Nebius invoice. Past the hard line, live calls stop. `POST /api/verify` is rate-limited per IP and globally. Two live checks can run at once.

## Deploy

The app is one Next.js server: pages and `/api/verify` (server-sent events). `/api/healthz` is liveness. `/api/readyz` and `/api/status` return only `{ok, mode, llm}`. Budget and model ids are on `/api/admin/status` behind `ADMIN_SECRET`. `/api/v1/verify` is the same check.

**Vercel (UI and API together).** Import the repo. Leave `DEMO_MODE=true` and `LLM_ENABLED=false`. Do not set the API keys. `vercel.json` is included.

**Render (Docker).** `render.yaml` is the free plan, builds `Dockerfile`, and health-checks `/api/healthz`. The image runs as `node`, defaults to demo mode, and sets `TRUST_PROXY=1`. Secrets are not baked in. Free Render has no disk, so `LLM_ENABLED` stays false there. The spend file is written by temp-file rename and still resets when the instance restarts; the in-memory counter applies for the life of the process.

**Split hosts.** Deploy the same image on Render for the API. On Vercel set `NEXT_PUBLIC_API_BASE` to the Render origin (no trailing slash) and set `CORS_ORIGINS` on Render to the Vercel origin. Same-origin hosting does not need either variable.

**Hugging Face Spaces.** Use the Docker SDK with this `Dockerfile`. Set `DEMO_MODE=true`. The container listens on port 43123.

Do not point a host at live keys until you mean to spend credits. A free Render instance spins down after 15 minutes without an inbound request. `scripts/keep-warm.mjs` pings `/api/healthz` when `KEEP_WARM_URL` is set. The GitHub workflow `.github/workflows/keep-warm.yml` does nothing until the repository variable `KEEP_WARM` is `true`. Leave it off outside a judging window: an awake free instance spends the monthly free hours. The app does not ping itself.

## Privacy

No account. The server does not store the photo. The cabinet, family names, stock log, reminders, and region reports stay in this browser. See `/privacy` and `/disclaimer`.

## What this is not

- Not the full Ghana FDA product register. The on-device score is a few demo rows plus a dated manufacturer excerpt.
- Not a live WhatsApp Business sender or a push service that fires while the site is closed.
- Not manufacturer reference photos of real antimalarials. The cards in `public/references` are example artwork.
- Not a national heatmap. Region counts are what this phone saved.
- Not an SMS gateway for scratch codes. The person texts 1393 and can paste the reply.
- Not a native Twi translation. The Twi line is a placeholder and the check stays in English.
- Not a service worker that precaches every build. After the app has loaded, a typed check still runs offline from the bundled snapshot.
