# READY: MedVerify GH v2

**Status:** design complete and ready to build. Finished 25 Oct 2026, 22:55 Accra (UTC+0). The hackathon deadline is Fri 30 Oct, 17:00 Accra.

## Start here
1. `mockups/00-board.png`: the whole system, light and dark
2. `mockups/00b-compare-scamcheck-vs-medverify.png`: ScamCheck result vs v2, light and dark
3. `html/index.html`: live screens. Add `?theme=dark` to preview dark mode, or use the toggle
4. `BRAND.md` (system, contrast, renames), `NAME.md` (name conflict; MedCheck GH recommended), `LICENSES.md`

## Contents
| Path | What |
|---|---|
| `tokens.json` / `tokens.css` / `tailwind.config.js` | Design tokens. Light on `:root`, dark through `prefers-color-scheme` and `[data-theme=dark]` |
| `components.css` | v2's own component layer (not shared with ScamCheck or v1) |
| `html/` | landing, input, analysing, result, evidence, verdicts, states, landing-desktop, board, index. Built HTML plus `assets/app.css`, with `_src/` partials |
| `logo/` | MedVerify GH: mark, wordmark, lockups, app icons, adaptive layers, favicons |
| `logo/alt-name-medcheck/` | The same set for MedCheck GH |
| `mockups/` | Every mobile screen at 360×800@2x in light and `-dark`; full-page renders of landing, result, evidence and states; desktop 1440×900@2x light and dark; `alt-medcheck-*` previews |

## Checklist
- [x] Neutral light and dark backgrounds, one teal accent, verdict colours only for verdicts
- [x] Follows the OS theme, with a toggle that sets `data-theme` and saves to `localStorage['mv-theme']`
- [x] No kente, gold, cream, diamonds or patterns; no Bricolage, Atkinson or JetBrains Mono
- [x] New capsule-and-check logo with no cross, in both names
- [x] Fixed contacts (112, FDA 055 111 2224/5, adr.fdaghana.gov.gh, Med Safety); "What we read" with Fix; search limited to fdaghana.gov.gh only
- [x] No verdict when the search fails; no guessing an unreadable batch; never "safe"
- [x] All states rendered in both modes
- [x] Every PNG reviewed. Fixes from the last pass: the contact cards overflowed their column (fixed with minmax(0,1fr)), and the "not sure" header was white in dark mode (now neutral)
- [x] `medverify-gh/` and `scamcheck-gh/` not modified

## Known weaknesses
- The order of information matches ScamCheck by design, because the safety rules are shared. Only the visual system differs.
- The dark amber `#B45309` for "Check first" is slightly muddy next to the red and green.
- Geist Mono has slab-serif i and l, so batch codes read a bit technical.
- On an 800px-tall phone, the sticky bottom bar hides the end of the input screen's hint note. It scrolls into view.
- The NVIDIA green and Tavily blue tool colours add two chart colours beyond the single accent, but only on the evidence screen.
- Not tested on real devices. Fonts load from Google Fonts (the renders used local copies). Twi appears in only a few strings and needs a native-speaker review.
- The comparison PNG is a snapshot of ScamCheck's current mockup. Re-render it with `_build/compare_mv2.html` if ScamCheck changes.
