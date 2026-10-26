<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MedVerify GH — agent guide

Read this before changing the product. Feature status is in `docs/FEATURES.md`. Why the code looks like this is in `docs/DECISIONS.md`. What to do next is in `docs/ROADMAP.md`.

## Goal

A production-grade, mobile-first medicine-pack checker for Ghana. A person photographs a pack or types the name, batch, and expiry. The app returns a cited verdict against public Ghana FDA and WHO alerts, then can watch that batch in a medicine cabinet on the phone.

This is a Nebius × NVIDIA hackathon entry (Devpost: Best Apps & Agents, and Best Use of Tavily). The fast demo is: Eye drops → “Registered, no alerts” → save → simulate a new FDA alert → “Stop using batch CV-44012”, with the FDA recalls link and the report button.

It is not medical advice. Never tell someone a medicine is safe, genuine, or right for them.

## Name

The on-screen name is the `name` field of `PRODUCT` in `lib/brand.ts`. It is still **MedVerify GH**. MedCheck GH is the recommended alternative because [medverify.versatechq.com](https://medverify.versatechq.com) already uses MedVerify in Ghana. Do not rename, and do not put a personal name in the UI. Alternate lockups are in `public/brand/logo/alt-name-medcheck/`. Swap those files and `PRODUCT.name` together.

Primary tagline: “Check the batch, not the box.” Do not use “Is this medicine safe to take?” as the H1.

## Architecture

One Next.js 16 App Router server (React 19, TypeScript). Pages and the API ship together. There is no second API process and no database.

| Path | Role |
| --- | --- |
| `app/page.tsx` | Checker. Client UI is `components/check-app.tsx`. |
| `app/cabinet`, `pharmacist`, `map`, `digest` | Cabinet, stock log, region reports, weekly digest. |
| `app/how-it-works`, `privacy`, `disclaimer` | Static product pages. |
| `app/api/verify/route.ts` | `POST` server-sent events for a check. `GET` is public status. |
| `app/api/healthz/route.ts` | Liveness. `{ok:true}` and no I/O. |
| `app/api/readyz/route.ts`, `app/api/status/route.ts` | Readiness. `{ok, mode, llm}` only. |
| `lib/modes/medicine/pipeline.ts` | Vision → normalise → FDA search → rules → wording. |
| `lib/modes/medicine/corpus.ts` | Bundled FDA and WHO notices. Demo never needs the network. |
| `lib/providers/nebius.ts`, `tavily.ts` | Live providers. Guarded. Demo does not call them. |
| `lib/cabinet/` | Pure cabinet, reminder, and band logic. No React. |
| `lib/client/cabinet-store.ts` | `localStorage` key `mv-cabinet-v1`. |
| `app/tokens.css` | The only colour, type, and radius source for the UI. |

The browser calls `apiUrl("/api/verify")` (`lib/client/api.ts`) with `fetch` and reads the SSE stream. It does not use `EventSource`. `NEXT_PUBLIC_API_BASE` may point at another origin. Empty means same origin. CORS is applied only when the request `Origin` is listed in `CORS_ORIGINS`.

Cabinet, family names, reminders, the pharmacist log, low-data preference, and region reports stay in the browser. The server does not store photos.

## How to run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:43123 . The dev server binds `0.0.0.0:43123` on purpose (not 3000).

Demo mode is the default. Copy `.env.example` to `.env` only to change that. No API key is required for the demo.

Production locally, after `npm run build`:

```bash
npx next start --hostname 0.0.0.0 --port 43123
```

## How to test

```bash
npm run lint          # eslint, zero warnings expected
npx tsc --noEmit
npm run eval          # evals/run.ts — rules, safety, GS1, cabinet. No network.
npm run test:e2e      # Playwright. Starts dev on 43123 with DEMO_MODE=true and LLM_ENABLED=false.
```

`npm run eval:live` must refuse live calls. Example buttons (`scenarioId`) are always free, even if live keys exist.

Playwright uses Pixel 5 and a 1440 desktop project. The third test is skipped on desktop because it is the same flow. Screenshots from the mobile project land in `docs/screenshots/`.

Do not measure Lighthouse against a port with nothing listening. Use a running `next start` and headless Chromium with `--no-sandbox`. Last measured scores are in `docs/FEATURES.md`. Do not invent a score.

## How to deploy

Leave `DEMO_MODE=true` and `LLM_ENABLED=false` until the user accepts the API budget. Do not set `NEBIUS_API_KEY` or `TAVILY_API_KEY` on a host before that.

- **Vercel, UI and API together.** `vercel.json` is the Next.js config plus security headers.
- **Render.** `render.yaml` is `plan: free`, builds `Dockerfile`, and health-checks `/api/healthz`. The image listens on 43123.
- **Split.** Same image on Render. On Vercel set `NEXT_PUBLIC_API_BASE` to the Render origin with no trailing slash, and `CORS_ORIGINS` on Render to the Vercel origin.
- **Hugging Face Spaces.** Docker SDK, this `Dockerfile`, `DEMO_MODE=true`.

`data/spend.json` is gitignored. On an ephemeral disk it resets when the instance restarts. The in-memory counter still applies for the life of the process. A keep-warm ping is not part of the request path. `scripts/keep-warm.mjs` and `.github/workflows/keep-warm.yml` are opt-in for a judging window. Render free instances spin down after 15 minutes without an inbound request. An inbound ping delays that and spends free instance hours.

## Constraints you must not weaken

1. **Demo is the default.** `DEMO_MODE` unset means demo. `auto` is live only when both keys are set. `false` forces live and returns 503 if a key is missing. `LLM_ENABLED=false` (also `0`, `off`, `no`) forces demo even when `DEMO_MODE=false`.
2. **No live Nebius or Tavily calls** during development, evals, or Playwright. Do not add a key to try the live path. Providers increment `liveAttemptCount` / `tavilyAttemptCount` **before** the demo guard so a test can see an accidental attempt.
3. **All live model calls** go to Nebius Token Factory, base URL exactly `https://api.tokenfactory.nebius.com/v1` (no trailing slash). Keys only from `NEBIUS_API_KEY` and `TAVILY_API_KEY`. Never hardcode a key. Never commit `.env`. `.env.example` has empty keys.
4. **Models.** Vision is `nvidia/Nemotron-3.5-Super-VL`, and only for a pack photo. Text defaults are `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` for normalise and verdict. On a live check, Super (`nvidia/nemotron-3-super-120b-a12b`) writes the verdict only when confidence is under 0.8, the match is not an exact batch, and spend is under the soft line. Demo mode never escalates. Ultra (`nvidia/Nemotron-3-Ultra-550b-a55b`) is blocked by `blockUltra`. Super can spend the token cap on `message.reasoning_content` and return null `content`. `extractAssistantText` recovers JSON from reasoning or the check fails closed. Output cap defaults to 512 tokens. Super’s verdict cap is 1024. One check defaults to a 2048 token budget.
5. **Budget.** `lib/server/spend.ts` estimates spend high (`USD_PER_1K = 0.002`), default cap `$1`, soft 70%, hard 90%. Past the hard line, live calls stop. This is not an invoice. In-memory rate limit: 30 `POST /api/verify` per minute per IP and 120 per minute globally. Live concurrency defaults to 2. The counter increments only after a successful non-cached completion. A blocked call must not leak an inflight slot.
6. **Search.** Live Tavily uses `include_domains: ["fdaghana.gov.gh"]` only, basic depth, about 3s timeout, then `isFdaGhanaHost` filters again. If that search fails and no bundled FDA row matched, outcome is `search_failed` and there is **no verdict**. Never guess an unreadable batch. Always show “What we read”.
7. **Contacts** come only from `CONTACTS` in `lib/brand.ts`: 112, Ghana FDA 0551112224 / 0551112225, and `https://adr.fdaghana.gov.gh/`. `scrubUnlistedContacts` also keeps 193 and the +233 forms of those FDA numbers. Do not add 024 4310 297 or other numbers from the research brief. The model must not invent a phone.
8. **Verdict words.** Solid header strip, not a tinted card. `do_not_use` → “Do not use”. `check_first` → “Check first”. `no_alerts` → “No alerts found”. `unsure` → “We’re not sure” when confidence is low; treat it as check-first. An exact batch match is never unsure. Never say safe or genuine as a verdict. The second line (`result.band`) is the honest band from `honestBand` in `lib/cabinet/logic.ts`.
9. **“Photo not stored”** only when it is true. The server does not persist photos. An offline IndexedDB save must not say the photo was not stored.
10. **Design.** Neutral zinc light and dark. No tinted page backgrounds. One teal accent. Brand colour is an accent, not a page wash. `prefers-color-scheme` applies when `data-theme` is absent. The toggle saves `localStorage['mv-theme']`. `?theme=light|dark` previews without saving. Self-host fonts (IBM Plex Sans and IBM Plex Mono via `next/font/local`) and Phosphor icons. Accent is `#0B6E7A` / `#4FC8D3`. Page background is `#FFFFFF` / `#111113`. No Google Fonts CDN. No emoji as UI. Do not import `design/html/assets/app.css` into the app. Tokens in the app are `app/tokens.css`.
11. **Medical disclaimer.** Footer and `/disclaimer`. A photo cannot prove a medicine is genuine. Visual hints, the barcode, the register score, and a pasted scratch reply are not proof. “Registered, no alerts” means the on-device snapshot. Reminders are not a dose. Region reports are not a map of unsafe pharmacies.
12. **Illustrations.** Pharmacist starter rows (metformin, amoxicillin) show only while the on-device log is empty, and they must stay labelled as illustrations. Para Clear batch L220008 is a real public alert (Do not use). Glycove is a fictional check-first. ClearView is the fictional cabinet hero.

## Professional bar

Every state the UI can reach needs real copy: loading, empty, error with retry, offline, slow (over 8s: “Don’t take the medicine yet”), low confidence, and a blurry or dark photo. No dead buttons and no placeholder lorem.

Twi is a placeholder (`PRODUCT.taglineTwi`) plus a banner that a native speaker has not reviewed it. The check stays in English. Do not invent medical Twi. The language toggle is desktop-only (`.from-desk`, 1100px).

Accessibility: WCAG AA contrast from the token pairs, keyboard access, visible focus, names on icon buttons. Lighthouse target is 90 or above on performance, accessibility, best practices, and SEO for the main pages. Measure production, not an empty port.

## Coding conventions

- TypeScript. Match the file you are in. Do not add a second styling system. The live UI uses classes from `app/tokens.css`, `app/components.css`, and `app/utilities.css`. Tailwind and shadcn are in `package.json` and are not how these pages are styled.
- Pipeline rules live in pure modules (`assess`, `present`, `gs1`, `reads`, `register`, `scratch`, `visual`, `cabinet/logic`) so `npm run eval` can import them without booting Next. The offline typed check (`lib/client/offline-check.ts`) must not import `pipeline.ts` or `nebius.ts`, or the OpenAI client lands in the browser bundle.
- `nameMatches` is whole-word. A substring match made “ClearView” look like “Para Clear”.
- Low or `unreadable` vision confidence blanks that field. Do not invent a digit.
- Demo scenarios may set `gs1Raw`. ClearView’s demo GTIN `09506000134352` is valid. `09506000134353` is the failing check digit.
- Pharmacist checks from that page always send `forceDemo: true`.
- Keep `evals/run.ts` inside `async function main()`. `tsx` in this repo cannot top-level await.
- `next.config.ts` sets `allowedDevOrigins: ["127.0.0.1"]`. Without it, Playwright on 127.0.0.1 does not hydrate.
- The local backend-review items are in place: sharp re-encodes uploads and strips EXIF (`lib/server/image.ts`), stages cache by content hash (`lib/providers/cache.ts`, Tavily and verdict wording for 24 hours, vision and normalise for 30 minutes, 128 entries, three example packs pre-warmed), and the verdict model may cite only numbered sources (`lib/modes/medicine/citations.ts`). The keep-warm ping is opt-in and outside the request path. Do not claim a full FDA register, retail pharmacy pins, or genuine reference photos. Those stay blocked.

## Git

Work on `main` unless you were asked for another branch. Commit and push `main` as the work lands. This session also pushes `main` to the GitHub remote named `github` (`https://github.com/Xclusivkhodes/medverify-gh`). Whenever you push to `origin`, push `main` to `github` as well. If that GitHub push fails for auth or permission, stop retrying and report the exact error.

Never commit `.env`, `data/spend.json`, `node_modules`, `.next`, or a real API key. `.env.example` stays, with empty keys.

## Where the source material is

| Doc | What it is |
| --- | --- |
| `docs/research/medverify.md` | Product research brief, 25 Oct 2026. |
| `docs/research/backend-review.md` | Backend coach notes. Partly applied. |
| `docs/design/` | v2 brand notes and tokens. The full mockup pack is `design/` at the repo root. |
| `uploads/` | Original brief, review, and the design archives they arrived in. |
