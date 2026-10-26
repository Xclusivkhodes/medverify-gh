# MedVerify GH — Brand & Frontend Spec v3.0

> Checked against the repo: Next.js 16 · React 19 · Tailwind v4 · shadcn/@base-ui · **Phosphor** icons · ZXing barcode decoding. Views are `home | capture | checking | result | evidence`, plus the Medicine cabinet, reminders and the pharmacist log. **Audience:** caregivers, parents and pharmacists in Ghana checking a pack against FDA Ghana and WHO alerts. They're usually on a phone, often standing in a pharmacy or at home with the box in hand, and often on low data.

Files in this folder: `tokens.css`, `tokens.json`, `tokens.ts`, `components.css`, `logo/` (mark, wordmark and lockup, light and dark), `favicon.svg`, renders `logo-sheet.png`, `main-light.png`, `main-dark.png`.

---

## 1. Brand concept & voice

**Concept: "The pharmacy label."** It's calm, precise and documentary, like a dispensing label or an FDA notice made readable. ScamCheck is a friend; MedVerify is a careful pharmacist. The identity comes from structure: hairlines, mono labels, key/value rows and a printed status strip. It doesn't come from colour.

- **Voice:** clinical-plain. Write facts with their source ("FDA Ghana recall, 14 Mar 2025"). Never diagnose. Instructions are numbered and imperative ("Don't take it", "Take it back to the pharmacy").
- **The honesty rule** (from the README): a photo can't prove a medicine is genuine. "No alerts found" is never "Genuine" or "Safe". Always show the snapshot date.
- **Fixed contacts, never written by a model:** **112**, FDA **055 111 2224 / 055 111 2225**, adr.fdaghana.gov.gh. Render them in mono as `tel:` links.
- **Never:** red crosses or medical clichés, pill emoji, stock photos, a cheerful tone on recall screens.

## 2. Colour

**Rules:** page backgrounds are neutral only. Light is white (`#FFFFFF`) with a `#F6F6F8` sunken surface; dark is `#111113` with a `#18181B` surface. Teal is the *accent*, used for the primary action, links, focus, the logo, step numbers and the eyebrow on brand moments. Verdicts are **always** status colour + icon + word. Teal is never a verdict.

**Why teal:** it's a clinical, calm hue (186°), and it's clearly separated from:
- *No alerts* green (155°), which differs in hue, is darker and more saturated, and is only ever used with a check icon + "No alerts found".
- ScamCheck indigo (239°) and Inbox plum (288°).

| Role | Light | Dark |
|---|---|---|
| Page `--color-bg` | `#FFFFFF` | `#111113` |
| Surface / raised | `#FFFFFF` / `#FFFFFF` | `#18181B` / `#202023` |
| Sunken (code wells, kv band) | `#F6F6F8` | `#0B0B0D` |
| Border / strong (hairlines) | `#E3E3E7` / `#CFCFD5` | `#2A2A2E` / `#3C3C43` |
| Text / muted / subtle | `#111113` / `#505058` / `#6B6B73` | `#F3F3F5` / `#A2A2AA` / `#8C8C95` |
| **Accent** `--color-primary` | **`#0B6E7A`** (hover `#0D5862`, pressed `#0F4850`) | **`#4FC8D3`** (hover `#62CBD5`) |
| On accent | `#FFFFFF` | `#052A30` |
| Accent soft / on-soft | `#EBF9FA` / `#0D5862` | `#0E2629` / `#9EE1E7` |
| Link / focus | `#0B6E7A` / `#0E7F8C` | `#62CBD5` / `#4FC8D3` |
| **Do not use** (`scam`) bg/fg/border/solid | `#FEF3F2` `#912018` `#FECDCA` `#B42318` | `#2A1513` `#FDA29B` `#55221D` `#C4291D` |
| **Check first** (`suspicious`) | `#FFFAEB` `#93370D` `#FEDF89` `#B54708` | `#2A1D0D` `#FEC84B` `#553612` `#B54708` |
| **No alerts found** (`ok`) | `#ECFDF3` `#085D3A` `#ABEFC6` `#067647` | `#0E241A` `#75E0A7` `#1B4D34` `#087443` |
| **Couldn't check** (`unsure`) | neutral | neutral, solid `#3C3C43` |

On dark, the status **strips stay deep solids with white text** (5.4–5.9:1). Unlike ScamCheck, the strips don't use light pastels, which keeps the "printed label" feel.

### Contrast (WCAG 2.2, computed by `_build/gen_tokens.py`)
| Pair (fg on bg) | Use | Light | Dark |
|---|---|---|---|
| `text` on `bg` | body text (≥4.5) | #111113 on #FFFFFF = **18.86** AAA | #F3F3F5 on #111113 = **17.02** AAA |
| `text` on `surface` | body text (≥4.5) | #111113 on #FFFFFF = **18.86** AAA | #F3F3F5 on #18181B = **15.99** AAA |
| `text-muted` on `bg` | body text (≥4.5) | #505058 on #FFFFFF = **7.99** AAA | #A2A2AA on #111113 = **7.44** AAA |
| `text-muted` on `surface` | body text (≥4.5) | #505058 on #FFFFFF = **7.99** AAA | #A2A2AA on #18181B = **6.99** AA |
| `text-subtle` on `surface` | body text (≥4.5) | #6B6B73 on #FFFFFF = **5.28** AA | #8C8C95 on #18181B = **5.32** AA |
| `text-subtle` on `bg` | body text (≥4.5) | #6B6B73 on #FFFFFF = **5.28** AA | #8C8C95 on #111113 = **5.66** AA |
| `on-primary` on `primary` | body text (≥4.5) | #FFFFFF on #0B6E7A = **5.96** AA | #052A30 on #4FC8D3 = **7.63** AAA |
| `primary` on `bg` | body text (≥4.5) | #0B6E7A on #FFFFFF = **5.96** AA | #4FC8D3 on #111113 = **9.46** AAA |
| `primary` on `surface` | body text (≥4.5) | #0B6E7A on #FFFFFF = **5.96** AA | #4FC8D3 on #18181B = **8.89** AAA |
| `link` on `surface` | body text (≥4.5) | #0B6E7A on #FFFFFF = **5.96** AA | #62CBD5 on #18181B = **9.30** AAA |
| `link` on `bg` | body text (≥4.5) | #0B6E7A on #FFFFFF = **5.96** AA | #62CBD5 on #111113 = **9.90** AAA |
| `on-primary-soft` on `primary-soft` | body text (≥4.5) | #0D5862 on #EBF9FA = **7.52** AAA | #9EE1E7 on #0E2629 = **10.83** AAA |
| `focus` on `bg` | UI / focus / icons (≥3) | #0E7F8C on #FFFFFF = **4.74** AA (UI ≥3) | #4FC8D3 on #111113 = **9.46** AA (UI ≥3) |
| `border-strong` on `surface` | hairline (decorative, no minimum) | #CFCFD5 on #FFFFFF = **1.55** decorative | #3C3C43 on #18181B = **1.62** decorative |
| `scam-fg` on `scam-bg` | body text (≥4.5) | #912018 on #FEF3F2 = **7.97** AAA | #FDA29B on #2A1513 = **8.90** AAA |
| `on-scam-solid` on `scam-solid` | body text (≥4.5) | #FFFFFF on #B42318 = **6.57** AA | #FFFFFF on #C4291D = **5.70** AA |
| `scam-solid` on `surface` | UI / focus / icons (≥3) | #B42318 on #FFFFFF = **6.57** AA (UI ≥3) | #C4291D on #18181B = **3.11** AA (UI ≥3) |
| `suspicious-fg` on `suspicious-bg` | body text (≥4.5) | #93370D on #FFFAEB = **7.21** AAA | #FEC84B on #2A1D0D = **10.61** AAA |
| `on-suspicious-solid` on `suspicious-solid` | body text (≥4.5) | #FFFFFF on #B54708 = **5.43** AA | #FFFFFF on #B54708 = **5.43** AA |
| `suspicious-solid` on `surface` | UI / focus / icons (≥3) | #B54708 on #FFFFFF = **5.43** AA (UI ≥3) | #B54708 on #18181B = **3.26** AA (UI ≥3) |
| `ok-fg` on `ok-bg` | body text (≥4.5) | #085D3A on #ECFDF3 = **7.55** AAA | #75E0A7 on #0E241A = **10.09** AAA |
| `on-ok-solid` on `ok-solid` | body text (≥4.5) | #FFFFFF on #067647 = **5.69** AA | #FFFFFF on #087443 = **5.85** AA |
| `ok-solid` on `surface` | UI / focus / icons (≥3) | #067647 on #FFFFFF = **5.69** AA (UI ≥3) | #087443 on #18181B = **3.03** AA (UI ≥3) |
| `unsure-fg` on `unsure-bg` | body text (≥4.5) | #3C3C43 on #F3F3F5 = **9.87** AAA | #CFCFD5 on #202023 = **10.48** AAA |
| `tool-nemotron-ink` on `surface` | body text (≥4.5) | #3E6400 on #FFFFFF = **6.94** AA | #A6E05A on #18181B = **11.33** AAA |
| `tool-tavily-ink` on `surface` | body text (≥4.5) | #1F4BB0 on #FFFFFF = **7.80** AAA | #A9C1FA on #18181B = **9.87** AAA |

## 3. Typography

One superfamily, so the app reads like a document. **IBM Plex Sans** (variable, 400/500/600) handles UI and headings. **IBM Plex Mono** (400/500) handles batch numbers, GTINs, dates, eyebrows and the status strip.

Plex was designed for clarity in technical documents. Its mono separates `0/O` and `1/l/I`, which is critical for batch codes like `L220008`. Both are OFL. Install `@fontsource-variable/ibm-plex-sans` and `@fontsource/ibm-plex-mono` (400 and 500, latin and latin-ext), or use `next/font/google`.

Base size is 16px. Headings use weight 600, not 700, which makes the type quieter than ScamCheck's.

| Token | Size / line | Weight | Tracking | Family |
|---|---|---|---|---|
| `verdict` | 32/36 | 600 | −0.02em | Sans |
| `display` | 34/40 (desktop 44/52) | 600 | −0.025em | Sans |
| `h1` / `h2` / `h3` | 26/32 · 20/28 · 17/24 | 600 | −0.02 / −0.01 / 0 | Sans |
| `body-lg` / `body` | 18/28 · 16/24 | 400 | 0 | Sans |
| `label` | 15/20 | 500 | 0 | Sans |
| `small` | 14/20 | 400 | 0 | Sans |
| `overline` (eyebrow) | 12/16, uppercase | 500 | 0.08em | **Mono** |
| `mono` (codes) | 15/20 | 500 | 0.04em | **Mono** |

## 4. Logo & wordmark

- **Mark:** a capsule tilted −45°. The lower half is solid accent; the upper half is a hairline outline holding a small tick. It reads as "a medicine, checked" without crosses or pills-with-faces. It works as a single colour at 16px.
- **Wordmark:** "MedVerify" in Plex Sans 600, with **"GH" in Plex Mono Medium inside a 1.5px hairline rounded box**, like a pharmacy label or lot stamp. Text is outlined to paths.
- **Lockup:** the mark height equals the wordmark's height. Minimum lockup height is 20px; in the app topbar it's **28px**. Clear space is the width of half a capsule.
- **Name:** the README says a rename to *MedCheck GH* may happen. The wordmark construction (Sans name + boxed mono "GH") carries over unchanged.
- **Don't:** fill the capsule in a status colour, add a cross, or use the mark inside a verdict strip.

## 5. Components (`components.css`)

Personality: **clinical and precise.** It uses hairline 1px borders, **pill buttons**, 8px fields and 12px cards, with **no shadows** (only popovers get one). Spacing is tight, with the 4/8 grid visible in the key/value rows. Icons are Phosphor, *regular* weight at 20px, and *bold* inside strips.

| Component | Spec |
|---|---|
| **Button** `.btn` | **Pill**, 48px (`.btn-sm` 36, `.btn-lg` 52), label 15/600, padding 0 24, gap 8. **Primary:** accent fill. **Outline:** 1px `border-strong`, text colour. **Plain:** accent text with no box, for "Try an example". Hover darkens the fill or adds a sunken bg, in 120ms. Loading: a spinner, `aria-busy`, and the width stays fixed. |
| **Input** | 48px, radius 8, 1px `border-strong`, with no inset shadow. Focus: an accent border + 1px accent ring (a crisp 2px total, no halo). `.input--code` is mono uppercase at 0.06em, for batch and GTIN. `.input-affix` puts an icon button inside the right edge (barcode scan). The hint sits *in the label row*, right-aligned in subtle text ("On the box, near LOT or B.No"). Error: a red border + a `.field-error` line with a warning icon. |
| **Card** | Surface, 1px border, radius 12, padding 20, no shadow. `.card-sunken` is for source and evidence blocks. `.section-head` is a mono eyebrow + a hairline. |
| **Key/value** `.kv` | The "label" pattern: a grid of `9rem 1fr` rows with hairline separators. The key is a mono eyebrow in muted text; the value is body, or mono for codes. Use it for Medicine / Batch / Expiry / Alert / Source. |
| **Verdict panel** `.verdict` | A **neutral card** with a **solid status strip** across the top: about 44px tall (12px padding), mono uppercase 13/600 at 0.08em, a bold Phosphor icon, and the word ("DO NOT USE", "CHECK FIRST", "NO ALERTS FOUND", "COULDN'T CHECK"), with a right-aligned `.when` ("Checked just now"). Then the body: the h2 headline ("This batch has an FDA Ghana recall."), the `.kv` rows, and actions. This is structurally different from ScamCheck's tinted panel. |
| **Badges** `.vchip--*` | Mono uppercase pill, 26px, with a 6px **round** dot, in a status tint, used in the cabinet list. `.source--fda/who/snapshot` uses a **square** dot. |
| **Notes** | `.note--warn` / `.note--danger`: 1px status border, status-tint bg, 15px text, leading icon. Example: "Feeling unwell after taking it? Call 112 now." |
| **To-do list** `.todo` | Numbered `01 02 03` in mono accent, with hairline separators between items. The title is a 600 label, the body small muted text. |
| **Nav / header** `.topbar` | 56px, solid `bg`, hairline bottom. Left: lockup at 28px, or a back arrow + a mono page title. Right: `.lang-btn` (bordered 36px, translate icon + "EN") and the theme toggle. Desktop: a `.topnav` text-links row (Check · Cabinet · Reminders · Alerts), where the active item gets a 2px accent underline. |
| **Toggles** | `.switch` is 44×24 with a white thumb and an accent track when on, used for "Watch this batch" and "Low-data mode". The theme control cycles System / Light / Dark, stored in `localStorage['mv-theme']`, and accepts `?theme=`. |
| **Progress** | A 2px indeterminate bar under the topbar, plus `.check-row` lines: "Reading the pack" → "Matching FDA Ghana & WHO lists" → "Checking the batch number". |

## 6. Layout & key screens

- **Grid:** single column, 600px max, 16px gutters (24px at ≥ 768px). Sections are 32px apart.
- **Home:** mono eyebrow "FDA GHANA · WHO ALERTS" → display "Check a medicine before you take it." → lead → a card with *Medicine name* + *Batch* (`.input--code`, scan affix) → **Check medicine** (primary, block) → **Photograph the pack** (outline, block) → plain "No pack nearby? Try an example" → a `.todo` titled "Three steps. No sign-up." → a footer disclaimer and snapshot date in mono.
- **Capture:** a full-bleed camera view with a hairline frame guide, and segmented *Photo / Barcode / Type it*. Refusal copy: "Too blurry to read the batch. Hold the box flat, near a light."
- **Checking:** check rows + a progress bar. After 8s it shows "Still checking FDA Ghana. Slow connection?" (the repo already has this `slow` flag).
- **Result:** verdict card (strip + kv) → `.todo` "What to do" → `.note--danger` with 112 on *Do not use* → card "Why we say this" (source cards: FDA notice title, date, link) → "Watch this batch" switch → "Share on WhatsApp" outline. Copy for *Do not use*: "Don't take it." / "Take it back to the pharmacy where you bought it." / "Report it to FDA: 055 111 2224."
- **Evidence ("How we checked"):** the `.kv` per step with the model name in mono and a `source--*` dot. Raw OCR goes in a sunken mono block.
- **Cabinet:** a hairline list. Each row has the medicine name, the batch in mono, a `vchip` and the last-checked time. An alert row gets a 3px status left rule. The empty state is described below.
- **Desktop ≥ 1024px:** the home becomes two columns (headline + todo on the left, form card on the right). The result stays single-column at 680px, which reads better as a document.

## 7. Empty, loading & error states (copy)

| State | Copy |
|---|---|
| Empty name + batch | Inline on submit: "Type the medicine name, or photograph the pack." |
| Batch unreadable | "We couldn't read the batch. Type it as printed — we never guess it." |
| Loading | "Checking FDA Ghana…" then "Matching WHO alerts…". After 8s: "Still checking. Slow connection? We'll keep going." |
| Live search failed | `.note--warn`: "The FDA search didn't answer. We checked our saved copy from {snapshot date} instead." |
| Offline | "You're offline. Typed checks still work using the saved FDA list ({snapshot date})." |
| No alerts | Strip "NO ALERTS FOUND". "No FDA Ghana or WHO alert matches this batch. That doesn't prove the pack is genuine — buy from a licensed pharmacy." |
| Couldn't check | Strip "COULDN'T CHECK". "We couldn't check this batch. Ask the pharmacist to confirm it, or call FDA: 055 111 2224." |
| Empty cabinet | Title "Your cabinet is empty". Body "Save a checked medicine and this phone will warn you if a new FDA alert names its batch." Button "Check a medicine" |
| Server error | "Something went wrong on our side. Nothing was saved. Try again." |

## 8. Motion

MedVerify motion is quick and functional; nothing bounces.

| Token | Value | Use |
|---|---|---|
| `--duration-instant` | 60ms | Press |
| `--duration-fast` | 120ms | Hover, colour |
| `--duration-base` | 180ms | Switch, chips |
| `--duration-slow` | 280ms | Result card fade + 4px rise |
| `--duration-step` | 400ms | Minimum time per check row |
| `--duration-pulse` | 1600ms | Indeterminate bar loop |
| `--ease-standard` | `cubic-bezier(.4,0,.2,1)` | |
| `--ease-enter` / `--ease-exit` | `(0,0,.2,1)` / `(.4,0,1,1)` | |

**Reduced motion:** all durations become 0. The indeterminate bar becomes a static 40% bar with the text "Checking…", and the skeleton stays solid sunken.

## 9. Low-bandwidth

- Use 3 font files at most: Plex Sans variable latin + Mono 400 and 500.
- Phosphor icons are imported per icon (`@phosphor-icons/react/dist/ssr/...`).
- Load ZXing lazily, only on the *Barcode* tab.
- Low-data mode hides the camera and photo upload. It's described in the README; style it with the `.switch`.
- `theme-color` is `#FFFFFF` / `#111113`.

## 10. Migration — conflicts in the current repo

1. **The token schema and component layer are shared with ScamCheck.** The same generated `ui.css`/`components.css` class vocabulary and the same token names produced near-identical UIs. Replace them with this folder's `tokens.css` + `components.css`. The pill buttons, hairline cards, strip verdict and mono eyebrows are what set it apart.
2. **Fonts: Onest + Source Sans 3 + Geist Mono** (in `layout.tsx` via `next/font/local`) become **IBM Plex Sans + IBM Plex Mono**. Geist Mono also collides with Inbox Bodyguard.
3. **Accent `#0B7A73` / dark `#5FCDC3`** (hue ~176°, too close to "ok" green) becomes **`#0B6E7A` / `#4FC8D3`**.
4. **Light page bg `#FAFAFA`** becomes `#FFFFFF`, with the sunken `#F6F6F8` used for wells. There's a mismatch between `themeColor` dark `#18181B` and bg `#111113`: use `#111113` for both.
5. **Verdict typography:** `t-verdict` 1.875rem/700 becomes 2rem/600 in the card body, and the word itself moves into the mono strip.
6. **Body size 1.125rem** (18px) becomes 1rem. The density of the key/value layout needs 16px; minimum touch targets are kept at 44–48px.
7. **The skeleton shimmer** uses `linear-gradient` (`ui.css:574`). Replace it with the opacity-fade skeleton in `components.css`. It isn't a brand gradient, but it's cheaper and fits the reduced-motion rules.
8. Keep the `--color-*` semantic names. New tokens: `--color-unsure-*`, `--hairline`, `--size-tap-*`, `--focus-ring`.
