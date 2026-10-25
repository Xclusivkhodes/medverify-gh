# MedVerify GH (working name; "MedCheck GH" avoids clashing with the existing medverify.versatechq.com) — build brief

Prepared 25 Oct 2026 (Africa/Accra). Every LLM call goes through Nebius Token Factory using NVIDIA Nemotron (Nemotron-3.5-Super-VL for images, Nano or Lightning for text). Sources are linked; thin evidence is flagged.

## 1. Will people use it after day one? (Honest answer: not by default)

- The harm is real. WHO estimates at least 1 in 10 medical products in low- and middle-income countries are substandard or falsified (https://www.who.int/news-room/fact-sheets/detail/substandard-and-falsified-medical-products). The 2017 estimate was 10.5%, from 48,000 samples (https://www.who.int/news/item/28-11-2017-1-in-10-medical-products-in-developing-countries-is-substandard-or-falsified/).
- Ghana specifically: the FDA reports substandard or falsified antimalarials fell from about 39% (2009) to 1.4% (2018) (https://gna.org.gh/2021/09/fda-makes-strides-in-reducing-substandard-and-falsified-antimalarials/). The problem is not gone, though. The FDA flagged a falsified Sustanon 250 batch (E0ZB1B) in Accra in 2026 (https://fdaghana.gov.gh/wp-content/uploads/2026/02/Sustanon-Alert.pdf) and keeps publishing recalls and alerts (https://fdaghana.gov.gh/category/product-recalls-alerts/).
- How often people buy medicine: I found no solid data on purchase frequency in Ghana. Evidence is thin, so don't claim a figure. Logically, a one-off check happens per purchase (weekly to monthly at most), so a pure checker will sit at or below the health-app benchmark: D30 around 4% (https://sendbird.com/blog/app-retention-benchmarks-broken-down-by-industry).
- Earlier verification tools struggled with adoption: only about 53% of pharmacists were keen on the mobile authentication service, and network or power problems caused missing or wrong responses (https://pmc.ncbi.nlm.nih.gov/articles/PMC6594430/). Forbes asked of Nigeria's anti-fake-drug tech: "will people actually use it?" (https://www.forbes.com/sites/christinero/2023/05/12/tech-abounds-to-fight-bad-medicines-in-nigeria-but-will-people-actually-use-it/).
- What retains: Sendbird notes health apps that add social or family features retain better. The multi-hazard alert app research shows broader, ongoing value beats single-purpose alerts (https://doi.org/10.1016/j.ijdrr.2025.105832).

So the retention strategy is to turn a one-time check into an ongoing medicine cabinet that keeps watching for you.

## 2. Retention features (ranked)

| # | Feature | Impact | Effort | Why |
|---|---------|--------|--------|-----|
| 1 | My Medicine Cabinet with recall watch: every scanned pack (name, batch, expiry) is saved; when a new FDA or WHO alert matches the product or batch, you get a push or WhatsApp alert | Very high | M | Turns one-off use into ongoing protection; recalls keep coming (FDA list, WHO alerts). This is the demo hero. |
| 2 | Expiry and dose reminders for saved packs | High | S | A daily or weekly reason to open the app (the reminder pattern from label-reader apps like RxScan: https://apps.apple.com/az/app/rxscan/id6778699478) |
| 3 | Family cabinet: add parents' and children's medicines, with alerts going to you | High | S–M | Family features lift health retention (Sendbird); the caregiver is the real user |
| 4 | Pharmacist / chemical-seller mode: batch-scan stock at intake and get a "verified on" log to show customers | High (B2B daily use) | M | Pharmacies handle stock every day; makes the app a work tool |
| 5 | Community pharmacy map: anonymised "suspicious pack reported here" pins by region, plus verified pharmacies (FDA-licensed) | Medium | M | Social proof, a reason to come back |
| 6 | Weekly medicine safety digest (FDA recalls this week, in plain words) | Medium | S | Cheap Nemotron summary of new alerts |
| 7 | Offline cache of the register plus low-data mode | Medium | S–M | Existing MedVerify already does offline caching, so it's table stakes (https://medverify.versatechq.com) |

Show in the demo: scan a pack → "Registered, no alerts" → saved to the cabinet → simulate a new FDA alert for that batch → phone gets "Stop using batch X" with a link to the FDA notice and the report button.

## 3. Detection: state of the art

- Vision-language models on packaging: GPT-4o on 4,581 Tanzanian medicine package images scored 54.1% when given the query image only, 74.6% when shown a genuine reference image, and 68.7% with difference overlays (https://yukimat.jp/data/pdf/paper/FakeMedicine_c_202504_Yona_IMIP.pdf; https://doi.org/10.1117/12.3071640). The lesson: always compare against a genuine reference; a VLM alone is not a verdict.
- Dynamic reference sets fetched from the web (2026): https://doi.org/10.1109/ievc69170.2026.11508472
- Smartphone image tools: MedSnap reported 100% sensitivity and 96% specificity on 48 samples, a small study (https://doi.org/10.1101/2020.05.06.20093427).
- GS1 serialisation: Ghana's guideline asks secondary packs to carry a GS1-128 or GS1 DataMatrix with GTIN (01), expiry (17), batch (10) and serial (21) (https://ghsupplychain.org/sites/default/files/2025-01/2025%20GuidelineIdentificationLabelingPharmProducts_V2.pdf). The regulation was still a draft, not public, as of Jan 2025 (https://www.ghsupplychain.org/sites/default/files/2025-01/20250109_GS1%20Regulation%20Tracker.pdf), so many packs won't have it yet.
- Scratch-code mass serialisation (mPedigree, Sproxil): code → SMS 1393 (https://www.goldkeys.org/how-it-works/). Sproxil reports serving over 10M Nigerians, and antimalarial failure fell to 1.3% (https://solve.mit.edu/solutions/103255). Weaknesses are below.
- Spectroscopy (RxScanner) is accurate hardware, but a device per pharmacy (https://rxall.net/rxscanner/).

### Beyond basic: upgrade list

1. **Structured VLM extraction** (S, high Tech). Nemotron-3.5-Super-VL returns JSON: brand, INN, strength, form, manufacturer, country, FDA reg no., batch, mfg and expiry dates, plus a list of visible text oddities (misspellings, inconsistent fonts). Ask for per-field confidence plus "unreadable" rather than guessing.
2. **Barcode / GS1 DataMatrix decode on-device** (S, high Tech). ZXing or zbar in the browser; parse the AIs (01/17/10/21), validate the GTIN check digit, and cross-check AI(17) expiry and AI(10) batch against the printed text. A mismatch is a strong red flag.
3. **Register match with transparent weights** (M). Fuzzy-match against an FDA register snapshot (https://fdaghana.gov.gh/product-register/) on reg number, product name, manufacturer and strength. Show the weighted points as the existing MedVerify does, but filled from the photo automatically.
4. **Batch-level recall and alert matching** (M, high Impact). Scrape FDA recalls and alerts plus the WHO Medical Product Alerts list (https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts). Nemotron Nano extracts product, batch, manufacturer and country from each alert into a table, then matches exactly on batch and fuzzily on product.
5. **Consistency rules** (S). Expiry after manufacture; shelf life plausible (usually 2–5 years, as a soft rule); reg-number format; dosage form vs strength. Each rule failure adds a reason line.
6. **Reference-guided visual comparison** (M–L, high Idea). Keep 10–20 genuine reference photos for top antimalarials and antibiotics; Super-VL compares layout, logo, fonts and colours side by side. Label the result "visual hints", given the 74.6% ceiling in the research.
7. **Scratch-panel passthrough** (S). If the VLM sees an mPedigree or Sproxil panel, prompt the user to text the code to 1393 and paste the reply; Nemotron interprets it.
8. **Honest verdict bands plus a report path** (S, high Design). "Registered, no alerts" / "Not found in register" / "Matches an alert: don't use" / "Can't tell, ask a pharmacist". Never claim "genuine". One-tap report via the FDA Med Safety app (https://ghanafda.medsafety.io/) or the patient ADR form (adr.fdaghana.gov.gh/patient.php), or by phone on 024 4310 297.

## 4. Competitor gaps we solve

| Competitor gap (evidence) | Our fix | Tech (Nebius + Nemotron) | Design | Impact | Idea |
|---|---|---|---|---|---|
| **Existing MedVerify checks registration only, and photo reading isn't live**: the site says it checks registration, not authenticity, can't detect substandard products, and photo reading is "coming" (https://medverify.versatechq.com) | Photo-first: Super-VL reads the pack, no typing | Nemotron-3.5-Super-VL on Nebius | One snap | Faster for low-literacy users | Multimodal checker |
| **No recall or alert cross-check in consumer tools**: MedVerify doesn't mention recall or WHO alert matching; FDA and WHO publish alerts as notices (FDA recall page, WHO alerts list) | Batch-level alert matching plus a cabinet watch | Nano extracts alert fields into a table | Push alert | Catches known bad batches like Sustanon E0ZB1B | Alerts become personal |
| **Scratch codes only work on participating brands and fail in practice**: missing or wrong responses due to network and power (https://pmc.ncbi.nlm.nih.gov/articles/PMC6594430/); slow SMS, most drugs lack labels, labels removed when packs are split for retail (https://www.ijpsi.org/Papers/Vol4(9)/C0409013018.pdf) | Works on any pack; offline register cache; reads the code when one exists | VL plus rule engine | No SMS wait | Covers unlabelled products | Complements MAS |
| **Hardware cost**: RxScanner is a quote-based device (last public price $60, 2019) (https://techpoint.africa/feature/rxall-fake-drug-deep-tech-solution/) | Phone camera only | VL on Nebius, pay per call | No device | Consumer reach | Software-only |
| **Unexplained verdicts / false reassurance risk** (implicit in VLM research: 54% query-only accuracy) | Reference-guided comparison plus explicit "can't tell" | Super-VL with a reference image | Honest bands | Avoids false "safe" | Safety-first design |

Top 3 gaps to pitch: (1) existing Ghana tool is registration-only, with no photo reading, (2) no batch-level recall or WHO alert matching for consumers, (3) scratch codes cover few brands and fail on network or SMS delays.

Caveat for judges: a photo can't prove a medicine is genuine. Say so on screen, which builds trust.
