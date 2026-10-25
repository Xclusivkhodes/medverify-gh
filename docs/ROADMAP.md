# Roadmap

Ordered for the next person. Do the first items before opening live model spend. Dates are not estimates of effort. “This week” in the research brief is already treated as in scope wherever it does not need a third party.

## 1. Confirm the cabinet Lighthouse score

`/cabinet` scored 87 performance on 25 Oct 2026 because the empty state appeared after hydration and shifted Reminders (CLS 0.159). `components/cabinet-view.tsx` now renders that empty state on the first paint.

Re-run Lighthouse against production `next start` (not an empty port) for `/cabinet` and `/pharmacist`. Both pages lost their “loading…” line in the same change. Target is 90 or above on performance, accessibility, best practices, and SEO. Record the new numbers in `docs/FEATURES.md`. Do not write a score you did not measure.

While you are there, save desktop screenshots at 1440 in light and dark for home, a ClearView result, Para Clear, and the cabinet warning. Mobile shots already live in `docs/screenshots/`.

## 2. Keep live calls off until the budget is accepted

`DEMO_MODE=true` and `LLM_ENABLED=false` stay. Do not put `NEBIUS_API_KEY` or `TAVILY_API_KEY` in the repo, in CI, or on a host until the user says the spend is allowed.

When that happens, in this order:

1. Set the keys only in the host env. Confirm `GET /api/status` still shows `demoLocked` until you flip both switches.
2. Run one pack, read `usage` from the provider, and replace the flat `USD_PER_1K = 0.002` estimate in `lib/server/spend.ts` with the published Token Factory prices. The current figure is deliberately high so the stop arrives early. It is not an invoice.
3. Watch `data/spend.json`. On Render’s disk it can vanish on restart. If the counter must survive, use a hosted store. Do not add SQLite on the container disk and call it durable.
4. Only then set `LLM_ENABLED=true` and `DEMO_MODE=auto` or `false`.

## 3. Super only as a low-confidence escalation

The backend review asked for Nano by default and Super only when confidence is low and the budget is above the soft line. Today the verdict model is whatever `NEBIUS_VERDICT_MODEL` says, and the default is Nano. There is no automatic escalation.

Build that only after step 2, with a test that Super is not called when the rules are already sure (exact batch match) and that Ultra is still impossible.

## 4. Backend-review leftovers that are still local

These do not need a vendor account:

- Re-encode uploads with sharp (or the same idea): cap size, check the type, strip EXIF. The browser already shrinks images. The server does not.
- Cache stages by content hash, with a longer TTL for Tavily and a pre-warm of the three example packs. The cache now is one in-memory map, 32 entries, 30 minutes.
- Give the verdict model numbered sources and drop any citation number that was not in that list.
- A keep-warm ping during a judging window, only if the host’s terms allow it. Do not hide it inside the request path.

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
- `search_failed` and the slow banner are implemented and hard to see while demo mode is on. A unit or Playwright test that stubs the failure is more honest than weakening the demo guard.
- The hydration warning in Playwright (`caret-color: transparent` on inputs) comes from the browser, not from our styles. If Lighthouse best-practices ever drops because of a console error, confirm it is still that injection before changing inputs.
