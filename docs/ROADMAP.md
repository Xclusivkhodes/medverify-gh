# Roadmap

Ordered for the next person. Do the first items before opening live model spend. Dates are not estimates of effort. “This week” in the research brief is already treated as in scope wherever it does not need a third party.

## 1. Confirm the cabinet Lighthouse score

`/cabinet` scored 87 performance on 25 Oct 2026 because the empty state appeared after hydration and shifted Reminders (CLS 0.159). `components/cabinet-view.tsx` now renders that empty state on the first paint.

Re-run Lighthouse against production `next start` (not an empty port) for `/cabinet` and `/pharmacist`. Both pages lost their “loading…” line in the same change. Target is 90 or above on performance, accessibility, best practices, and SEO. Record the new numbers in `docs/FEATURES.md`. Do not write a score you did not measure.

While you are there, save desktop screenshots at 1440 in light and dark for home, a ClearView result, Para Clear, and the cabinet warning. Mobile shots already live in `docs/screenshots/`.

## 2. Keep live calls off until the budget is accepted

`DEMO_MODE=true` and `LLM_ENABLED=false` stay. Do not put `NEBIUS_API_KEY` or `TAVILY_API_KEY` in the repo, in CI, or on a host until the user says the spend is allowed.

When that happens, in this order:

1. Set the keys only in the host env. `GET /api/readyz` stays `{mode:"demo"}` until you flip both switches. Model ids and the budget are on `/api/admin/status`.
2. Run one pack, read `usage` from the provider, and replace the flat `USD_PER_1K = 0.002` estimate in `lib/server/spend.ts` with the published Token Factory prices. The current figure is deliberately high so the stop arrives early. It is not an invoice.
3. Watch `data/spend.json`. On Render’s disk it can vanish on restart. If the counter must survive, use a hosted store. Do not add SQLite on the container disk and call it durable.
4. Only then set `LLM_ENABLED=true` and `DEMO_MODE=auto` or `false`.

## 3. Super only as a low-confidence escalation

Done in code, and covered by `npm run eval`. Demo mode never calls Super. On a live check, `chooseVerdictModel` keeps Nano when the rules are already sure (exact batch match, or confidence at least 0.8) or when spend is at the soft line. Otherwise the verdict step uses Super, with a 1024-token cap. Ultra still cannot be selected. Do not turn live mode on until step 2.

## 4. Backend-review leftovers that are still local

Done, without a vendor account:

- Uploads are re-encoded with sharp: type and magic bytes, long edge 1024, JPEG, EXIF stripped (`lib/server/image.ts`). The browser still shrinks images first. The server does not store the file.
- Stages cache by content hash. Tavily and verdict wording last 24 hours. Vision and normalise last 30 minutes. The three example packs are pre-warmed. Tavily is not pre-filled with empty hits, because that would look like a real search.
- The verdict prompt receives numbered sources. Numbers and URLs outside that list are dropped.
- Keep-warm is `scripts/keep-warm.mjs` plus a workflow that runs only when the `KEEP_WARM` repository variable is true. It is not inside the request path. Render’s current free-tier docs (checked 26 Oct 2026) say a free web service spins down after 15 minutes without an inbound request, and that keeping it running spends the 750 free instance hours. Turn the ping on for a judging window, then turn it off.

Do not start a second API process. Static export would drop `app/api`. The optional split is `NEXT_PUBLIC_API_BASE` plus `CORS_ORIGINS`, documented in the README.

## 5. Decisions that are waiting on the user

- **Product name.** Stay on MedVerify GH until they pick. MedCheck GH lockups are ready. One edit in `lib/brand.ts` plus the logo folder.
- **Twi.** A native speaker reviews `PRODUCT.taglineTwi` and any other Twi string. Do not write medical Twi yourself.
- **Live weekly digest.** A Nemotron summary of new alerts is a live call. Until then, `/digest` stays the bundled sentences.

## 6. Blocked on data, rights, or an approval

Do not fake these.

| Gap | Why it is blocked |
| --- | --- |
| Full Ghana FDA product register | No stable public API is wired. The on-device score is two fictional demo rows. Adding rows means a dated source you can point at. |
| Retail “verified pharmacy” pins | The public excerpt we trusted is licensed local manufacturers, not a retail directory. |
| Genuine reference photos | Need rights to real pack artwork. The SVGs are examples. Comparison stays “visual hints”. |
| WhatsApp Business and background push | Need a business account and a push provider. The app has an in-app warning, the Notification API when permission is granted, and a `wa.me` draft. |
| Scratch-code SMS | The person texts 1393 and pastes the reply. We do not operate that gateway. |
| GS1 company-prefix lookup | GS1’s registry is paid. Local check digit and AI cross-check are the whole feature. |
| Spectroscopy / RxScanner | Hardware, out of scope. |
| Service worker precache | Next chunk hashes change every build. After a successful load, a typed check already runs offline from the bundled snapshot. |

## 7. Polish that is still open

- Walk 360, 768, and 1440 in light and dark after any layout change. Known risks: a long result page, the top bar on small widths, and the pharmacist table scrolling sideways.
- `search_failed` and the slow banner are covered without weakening the demo guard. The eval stubs a failed search on the live branch. Playwright stubs the verify response for the failed-search screen and delays it for the slow banner.
- The hydration warning in Playwright (`caret-color: transparent` on inputs) comes from the browser, not from our styles. If Lighthouse best-practices ever drops because of a console error, confirm it is still that injection before changing inputs.
