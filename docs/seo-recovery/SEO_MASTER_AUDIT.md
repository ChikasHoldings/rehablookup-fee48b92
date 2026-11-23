# SEO Master Audit — RehabLookup.com

**Phase 0 (Baseline and system discovery): complete 2026-11-22. Phase 1 (critical recovery, batch 1): implemented 2026-11-23** — see the status table directly below and `SEO_IMPLEMENTATION_LOG.md`.
**Audit date:** 2026-11-22 (revalidated 2026-11-23). **Code audited:** `main` @ `f31fd7dbf6` (2026-08-18), the last production deployment (Vercel `dpl_DqE67ckwyDbUsZGPT5cSatbQmTMv`, 2026-08-19).
**Status of this document:** findings and recommendations. Phase 0 changed nothing. Phase 1 changes are listed per finding below; the findings text is kept as originally written, with Phase 1 revalidation notes added inline where a conclusion changed.

Companion files: `SEO_PERFORMANCE_BASELINE.md` (analytics), `SEO_URL_INVENTORY.csv` (50,607 URLs), `SEO_PAGE_DECISIONS.csv` (per-URL proposals, approval-gated), `SEO_KEYWORD_MAP.csv`, `SEO_CONTENT_ROADMAP.md`, `SEO_MONITORING_PLAN.md`, `SEO_PHASE_HANDOFF.md`, `SEO_IMPLEMENTATION_LOG.md`.


Companion files added in Phase 1: `SEO_ROOT_CAUSE_INVESTIGATION.md`, `SEO_SAMHSA_IMPORT_PLAN.md` (+ `SEO_SAMHSA_VALIDATION_APPENDIX.md`), `SEO_REMOVAL_PLAN.md`, `ADR-001-single-document-rendering.md`.

## Phase 1 status by finding (2026-11-23; updated after batch 2 the same day)

| Finding | Phase 1 status | Notes |
|---|---|---|
| F-01 May 29 collapse | **Revalidated, conclusion softened** | No technical trigger found in code, deployment or infrastructure history. Consistent with an algorithmic or manual quality judgement, but *not* proven to be a sitewide penalty. Manual Actions / Security Issues still not supplied. See `SEO_ROOT_CAUSE_INVESTIGATION.md`. |
| F-02 templated pages at scale | **Reassessed, not executed** | Six-class reassessment in `SEO_REMOVAL_PLAN.md`; no page removed (owner did not authorize). |
| F-03 crawler/human split | **Fixed for retained families (2026-11-23, batch 2)** | Crawlers now receive a snapshot of the real SPA render for home, hubs, states, cities, counties, guides, articles, treatment and insurance pages (ADR-001 step 1). Facility profiles and removal-candidate families still get generator HTML. |
| F-04 fabricated facility schema | **Fixed** | Only data-backed attributes are emitted, in both renderers, from one shared module. Blocking guard checks every `/center/*` JSON-LD node at build. |
| F-05 E-E-A-T signals | **Fixed (pending owner confirmation of people)** | Bulk "medically reviewed" stamps cleared (backed up). Advisory Board `reviewedBy` and today-dated `lastReviewed` removed. Unverified named staff removed from About. Testimonials unwired. "Verified/accredited directory" claims removed. |
| F-06 firewall | **Revalidated: unlikely cause** | Vercel request logs (Nov 16–23) show verified Googlebot allowed with 200s. The 429 seen here is the challenge for unclassified automation. September itself is outside log retention. New finding F-26. |
| F-07 retired-service claims | **Fixed (copy); product decisions open** | Insurance-verification, concierge and placement claims removed from source and the prerendered corpus; `llms.txt` and noscript rewritten. `/ads/:slug`, `/lp/convert`, `/insurance-verification` pages and the seeker edge-function emails remain (owner decisions). |
| F-08 `/rehab-centers` → noindexed search | **Fixed** | 301 → `/locations`, which is now an indexable crawler hub listing every state with live counts. All breadcrumbs updated. |
| F-09 mass redirects to search | **Audited, not changed** | Destination validation in `SEO_REMOVAL_PLAN.md` §4–5 (1,970 have a true-equivalent hub; 1,001 have none). Mass redirect changes not authorized. |
| F-10 orphaned link graph | **Largely fixed (batch 2)** | Facility cards are real `<a href="/center/…">` links; state and city snapshots carry 12 facility links each. Removal-candidate families remain orphaned by design. |
| F-11 thin catalogue | **Validated, not published** | 7,434 usable new SAMHSA facilities (≈7,300 after dedupe). `SEO_SAMHSA_IMPORT_PLAN.md`. |
| F-12 unsupported attribute pages | Open | Covered by the removal plan. |
| F-13 cannibalization | Open | Mapping in the removal plan. |
| F-14 sitemaps | **Fixed (batch 2)** | Deployed `sitemap-facilities` function is byte-identical to source; production serves the static, build-generated `sitemap-facilities.xml` (correct type). The real defect was `lastmod`: the daily ranking job rewrote `updated_at` on ~1,000 facilities. Migration `20261123000200` (applied) makes score-only updates leave `updated_at` alone. |
| F-15 measurement | **Partly fixed (batch 2)** | GA removed from all crawler-only HTML (93k files) and blocked from returning (`check:crawler-analytics`). GA4 key events still need owner configuration. |
| F-16 "best rehab" ranking | **Copy fixed; pages open** | FAQ answer now states the real order (Featured paid → claimed → others). Pages themselves are in "Requires more investigation". |
| F-17 uniqueness branch | **Not merged** (per owner) | — |
| F-18 robots.txt | **Partly fixed** | Disallows on 301 sources removed; `public/vercel.json` deleted. Per-bot group simplification not done. |
| F-19 homepage SPA shell | **Fixed (batch 2)** | Crawlers get the rendered homepage (`_crawler-home.html`), with its canonical. |
| F-20 facility data quality | **Display fixed; data open** | Listings say where their data came from; "licensed" and "recognized by" wording replaced; credentials labelled "as reported to SAMHSA". Underlying data unchanged. |
| F-21 FAQPage markup | Open | — |
| F-22 Organization schema | **Fixed** | Plain `Organization`; LegitScript/HIPAA credential and 24/7 hours removed. |
| F-23 consumer-account remnants | **Fixed (batch 2)** | Seeker emails/SMS in 10 edge functions no longer link `/account/*`, `/seeker-auth` or `/concierge`; the account-signup invitation email is account-free. `/ads/:slug`, `/lp/convert` and `/insurance-verification` (0 submissions ever) now 301 to `/`, `/` and `/insurance`; insurance CTAs give self-serve guidance. |
| F-24 medical statistics | **Fixed where found** | NIDA 40–60% now correctly described as a relapse rate in all listed locations. Clinical review still required. |
| F-25 hygiene | Open | — |
| F-26–F-29 | **New in Phase 1** | F-26 (AI crawlers): robots.txt and middleware updated; the Vercel Firewall change itself needs the owner (this integration cannot read or write firewall settings). F-27: fixed by the snapshots. F-28: extended — 9 crashing pages plus provider Settings fixed. F-29: fixed. |

---

## 0. How this audit was done (and what it did not cover)

| Examined | How |
|---|---|
| Repository: routing, middleware, generators, sitemap pipeline, page templates, schema emitters | Read the source: `middleware.ts`, `vercel.json`, `src/App.tsx` (920 `<Route>` lines), `scripts/*.mjs`, `scripts/_facility-data.mjs`, `scripts/generate-facility-profiles-html.mjs`, `src/components/SEO.tsx` |
| The **production-equivalent corpus** | Ran the actual `build:vercel` generator sequence in an isolated git worktree against the live Supabase project (anon key, read-only) and scanned all **50,380** generated HTML files. One step, `generate:all-missing-html`, failed locally because the `xml2js` package isn't installed (there is no `node_modules` here). That generator only back-fills missing files, so this is a known, small gap. |
| The committed corpus | Scanned all 46,668 committed `public/**/*.html` files (same metrics) |
| Database | Read-only SQL against Supabase project `mldbxpntzcjalgjmwnqa`: `facilities`, `public_facilities`, child tables, `staged_samhsa` |
| Live facility sitemap | Fetched from the Supabase edge function `sitemap-facilities` (3,796 URLs) |
| Live site HTTP behaviour | **Blocked.** Every request from this environment, including through Vercel's own fetch service, got the Vercel Security Checkpoint (HTTP 429, `x-vercel-mitigated: challenge`). Live status codes, live HTML and live robots/sitemaps were **not** verified. Where this document describes "production" behaviour, it is inferred from the deployed code and the production-equivalent build. |
| Vercel | Project, domains, deployments (back to 2026-06-24), audit events (back to 2026-08-17). The firewall configuration itself could not be read (access denied to this integration). |
| GSC / GA4 | The exports supplied on 2026-11-22. See `SEO_PERFORMANCE_BASELINE.md`. |
| Parallel read-only sweeps | Consumer-account remnants and trust/claims accuracy. I re-checked the highest-severity items myself, as noted inline. |

**Not examined:** rendered DOM of the SPA pages in a browser, Core Web Vitals or lab performance, backlinks, competitor SERPs, external keyword volumes, Bing Webmaster data, and live URL Inspection. Each is listed under §6 Critical unknowns.

---

## 1. Executive diagnosis

1. **Visibility collapsed in a single day, 2026-05-29.** Impressions per day went from 1,182 to 17.6 (−98.5%), while pages **stayed indexed**: 12,730 indexed on 2026-08-27 with about 5 impressions a day. That is a site-wide quality or spam judgement, not a technical outage. It happened inside Google's May 2026 core update rollout (May 21 → Jun 2). **A manual action has not been ruled out**, because the report was not supplied. *Leading hypothesis; not verified.* *(Phase 1: no technical trigger found; "sitewide judgement" remains a hypothesis — see F-01.)*
2. **The cause underneath is page volume without substance.** There are 50,380 prerendered pages for a catalogue of **3,796** listings. **89%** of pages share a body with other pages once geography is stripped out, **91%** are under 300 words, and **90.6%** link to no facility at all. Twenty-one "near-me" families render 420 pages each from **2** distinct bodies. Google declined to index 35,467 URLs ("Discovered/Crawled – currently not indexed"). *Verified.*
3. **Many pages make claims the data cannot support.** Examples: commercial-insurance pages for carriers recorded at ≤5 facilities; "luxury", "Christian" and "couples" pages with no data; "verified/accredited directory" copy when 6 of 3,810 facilities are verified; **fabricated structured data on all 3,796 facility profiles** (open 24/7, accepting patients, Psychiatry); SQL-stamped "medically reviewed" dates; and unverified named clinical staff and testimonials. For a YMYL healthcare site these are ranking problems, and also legal and trust problems. *Verified.*
4. **Crawlers and humans get different pages.** Middleware sniffs the user agent: crawlers get prerendered HTML, humans always get the SPA. The crawler versions of hub pages are 178-word generic shells. Provider-guide HTML for crawlers is a templated shell while humans see the real article. This creates cloaking risk and breaks the crawler-visible link graph: **40,881** prerendered pages have zero internal inbound links, including **1,734 facility profiles**. *Verified from code and build output.*
5. **A second, separate drop happened in September.** Indexed URLs fell from 12,441 to 3,194 on Sept 18–21. A **Vercel firewall configuration was published on 2026-09-06** (its first ever), and the site currently challenges automated traffic. Whether verified Googlebot is exempt is **unknown and must be checked now**. *Hypothesis.* *(Phase 1: request logs show verified Googlebot allowed with 200s in Nov; the firewall is now an unlikely cause. The Aug 19 release, which cut the sitemap and emptied 612 city hubs, is the more likely contributor — see F-06.)*
6. **The legitimate path to recovery is clear:** far fewer, much better pages built on real data. The database already holds **14,071 distinct SAMHSA records (staged, unpublished)** with rich facets (service setting, OTP/buprenorphine, special programs, languages, payment). Today's catalogue uses about 27% of those records and about 11 coarse tags.

---

## 2. System architecture (as found)

* **Stack:** Vite + React 18 SPA (`src/`), Supabase (Postgres, Auth, Edge Functions), Vercel hosting (edge middleware plus `vercel.json`). The domain moved from Lovable hosting to Vercel on 2026-05-02 (Vercel domain record), and the Supabase project was created on 2026-05-07.
* **Page generation (crawler side):** about 20 Node generators in `scripts/` write static `public/**/*.html` at build time (`npm run build:vercel`, see `package.json`):
  * `generate-seo-html.mjs`: state hubs plus near-me, treatment and insurance families. Its state pages inject facility lists (575 facility links across 50 states).
  * `generate-county-pages.mjs`: county hubs (383 of 621 get inventory).
  * `inject-city-facility-inventory.mjs`: city hubs (484 of 1,096 get inventory; 612 have no exact-match facility).
  * `generate-facility-profiles-html.mjs`: 3,796 `/center/{slug}` pages from `public_facilities` plus child tables.
  * `generate-missing-html.mjs`, `generate-gsc-recovery-html.mjs`, `generate-all-missing-html.mjs`, `generate-remaining-nearme.mjs`, `generate-missing-nearme-html.mjs`: back-fill templated pages for every route pattern.
  * `generate-sitemaps.mjs` → `sitemap.xml` (30,793), `sitemap-extras.xml` (233), `sitemap-facilities.xml` (3,796). `generate-prerender-manifest.mjs` → `prerender-manifest.ts` (50,380 paths, used by the middleware).
  * About 41,000 committed HTML files are templated families that **no generator gives facility data**. They are regenerated or kept as committed.
* **Serving (`middleware.ts`):** `/` → `next()` (SPA shell for everyone). Retired account paths → 301. Crawler UA plus a prerendered path → rewrite to `<path>.html`. Crawler plus an unknown `/center|/rehab-centers|/insurance|/treatment-types|/rehab-marketing|/detox-centers` path → **404**. Crawler plus any other unknown path → SPA shell (200). **Any human → SPA shell (`/`), always.** The crawler HTML does not load the SPA bundle; it includes only gtag.
* **SPA (human side):** 920 route declarations in `src/App.tsx` mirror the static families, so every programmatic family also renders for humans from React templates. Retiring a family therefore needs both a middleware/`vercel.json` rule and SPA route removal; otherwise humans keep getting 200s.
* **Data:** `public.facilities` holds 3,810 rows (3,799 approved, 3,796 public, **3,802 `samhsa_import`**, 7 owned/claimed, 6 verified). Child tables: `facility_services` 17,139, `facility_insurance` 10,663, `facility_accreditations` 9,403, `facility_age_groups` 10,556, `facility_reviews` **0**. `staged_samhsa` has 14,726 rows (14,071 distinct, scraped 2026-05-14, none linked to the live table by `samhsa_facility_id`). Live coverage: 2,030 cities, but only **322 cities have ≥3 facilities**, 106 have ≥5 and 10 have ≥20 (maximum: Baltimore, 62).
* **Git history:** `main` was re-rooted on 2026-06-20 (55 commits). The history from before June is on `origin/fix/prelaunch-seo-legal` (11,414 extra commits). Unmerged SEO work: `seo/content-uniqueness-audit` (15 commits, regenerates 46,129 files) and `seo/public-search-hardening` (1 commit). `seo/location-truth` is fully merged (as #86).

---

## 3. URL inventory by category (production-equivalent build + GSC + sitemaps)

The full per-URL data is in `SEO_URL_INVENTORY.csv`. "0 inbound" means no `<a href>` from any other prerendered page. That is what Googlebot sees, because crawler HTML carries no SPA bundle. GSC impressions and clicks are 16-month totals from the top-1,000-pages export. The page-level click total (122) differs from the property total (116) because GSC aggregates the two differently.

| Category | URLs | Prerendered | In prod sitemap | Thin <300w | Dup body | 0 facility links | 0 inbound links | GSC impr | GSC clicks | Proposed action mix |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| city_combo `/{prefix}-in-{city}` (48 prefixes × 288) | 13,835 | 13,834 | 360 | 13,834 | 13,539 | 13,834 | 13,124 | 334 | 0 | DELETE 10,653; 301 retarget 3,168 (2,167 to a city hub, 1,001 without a hub match); 301 10; INVESTIGATE 4 |
| near_me_county | 7,126 | 7,123 | 7,123 | 7,123 | 7,115 | 7,123 | 7,123 | 1,180 | 5 | DELETE 7,021; 301 105 |
| insurance_x_county | 6,704 | 6,704 | 6,704 | 6,704 | 6,700 | 6,704 | 4,609 | 621 | 2 | DELETE 6,593; 301 111 |
| facility_profile `/center/*` | 3,797 | 3,796 | 3,796 | 0 | 6 | 0 | 1,734 | 1,637 | 19 | IMPROVE 3,796 |
| provider_marketing_county_x_service | 3,352 | 3,352 | 3,352 | 3,352 | 3,351 | 3,352 | 3,352 | 262 | 0 | DELETE 3,294; 301 58 |
| near_me_state | 2,910 | 2,900 | 2,200 | 2,900 | 2,896 | 2,900 | 1,732 | 7,069 | 9 | MERGE 1,000; DELETE 1,623; INVESTIGATE 200; 301 87 |
| county_x_service | 2,514 | 2,514 | 2,514 | 2,514 | 2,510 | 2,514 | 2,514 | 151 | 1 | DELETE 2,479; 301 35 |
| provider_marketing_county_x_insurance | 2,514 | 2,514 | 2,514 | 2,514 | 2,508 | 2,514 | 2,514 | 266 | 0 | DELETE 2,486; 301 28 |
| specialty_x_state | 2,150 | 2,150 | 2,100 | 2,150 | 2,150 | 2,150 | 2,103 | 644 | 4 | DELETE 1,976; 301 174 |
| city_hub `/rehab-centers/{state}/{city}` | 1,116 | 1,096 | 31 | 972 | 604 | 612 | 284 | 5,642 | 2 | IMPROVE 484; MERGE 632 |
| insurance_x_state | 800 | 800 | 800 | 800 | 800 | 800 | 0 | 479 | 1 | IMPROVE 150 (gov payers); MERGE 650 |
| treatment_x_state | 700 | 700 | 700 | 700 | 700 | 700 | 0 | 5,038 | 14 | IMPROVE 250; INVESTIGATE 300; DELETE 124; 301 26 |
| county_hub | 621 | 621 | 438 | 156 | 156 | 238 | 202 | 1,230 | 0 | KEEP 383; MERGE 238 |
| provider_marketing_county | 533 | 533 | 533 | 532 | 532 | 533 | 114 | 158 | 0 | DELETE 519; 301 14 |
| treatment_x_city | 314 | 210 | 210 | 210 | 209 | 210 | 210 | 7,766 | 16 | IMPROVE 205; INVESTIGATE 98 |
| provider_guide | 254 | 254 | 254 | 254 | 223 | 254 | 254 | 3,664 | 6 | IMPROVE 254 |
| provider_marketing_topic | 254 | 254 | 254 | 254 | 254 | 254 | 254 | 62 | 0 | DELETE 249; 301 5 |
| provider_city_landing | 200 | 200 | 200 | 200 | 200 | 200 | 200 | 0 | 0 | 301 → /for-providers 200 |
| content_static | 182 | 172 | 169 | 169 | 84 | 172 | 113 | 1,818 | 9 | INVESTIGATE 182 |
| state_article | 153 | 150 | 150 | 150 | 150 | 150 | 150 | 859 | 4 | INVESTIGATE 153 |
| resource_article | 131 | 116 | 116 | 8 | 3 | 116 | 110 | 1,841 | 0 | INVESTIGATE 131 |
| specialty_x_city | 84 | 48 | 46 | 48 | 48 | 48 | 48 | 176 | 1 | 301 42; DELETE 42 |
| near_me_city | 60 | 45 | 19 | 45 | 40 | 45 | 45 | 194 | 0 | DELETE 40; 301 20 |
| near_me_national | 58 | 58 | 58 | 48 | 9 | 58 | 0 | 33 | 0 | INVESTIGATE 58 |
| best_in_city `/best-rehab-centers-in-*` | 51 | 51 | 51 | 51 | 40 | 51 | 41 | 2,173 | 0 | INVESTIGATE 51 |
| provider_marketing_state | 51 | 51 | 1 | 51 | 51 | 51 | 0 | 0 | 0 | DELETE 51 |
| state_hub `/rehab-centers/{state}` | 50 | 50 | 50 | 0 | 0 | 0 | 0 | **47,729** | 6 | IMPROVE 50 |
| insurance_x_city | 27 | 23 | 23 | 23 | 21 | 23 | 23 | 149 | 0 | DELETE 22; 301 5 |
| international `/us-rehab/*` | 19 | 19 | 19 | 19 | 0 | 19 | 18 | 471 | 1 | INVESTIGATE 19 |
| treatment_type `/treatment-types/{t}` | 19 | 18 | 15 | 18 | 5 | 18 | 5 | 437 | 1 | IMPROVE 19 |
| insurance_carrier `/insurance/{carrier}` | 16 | 16 | 16 | 16 | 6 | 16 | 0 | 2,096 | 3 | IMPROVE 16 |
| hubs (`/`, `/rehab-centers`, `/insurance`, `/treatment-types`, `/resources`), private, other | 11 | — | — | — | — | — | — | 523 | 18 | IMPROVE / NOINDEX / INVESTIGATE |
| **TOTAL** | **50,607** | **50,380** | **34,822** | **45,823** | **44,911** | **45,667** | **40,881** | 94,702 | 122 | |

**Proposed totals (all destructive items need approval; nothing has been executed):** DELETE (410) **37,173** URLs, **none of which has any GSC impression or index-sample evidence**. Separately, 1 facility URL already returns 404 because it is no longer in the live set. 301/MERGE **6,618**. IMPROVE/KEEP **5,611**, holding 69,698 impressions. INVESTIGATE **1,202**. NOINDEX (keep) **2**.

---

## 4. Findings (severity-ranked)

Severity: **P0** means it blocks recovery or creates legal/trust exposure, so fix first. **P1** is major. **P2** is meaningful. **P3** is hygiene.
Confidence: **Verified** means observed in code, data or exports. **Hypothesis** means consistent with the evidence but not proven.

### F-01 · P0 · Site-wide visibility collapse on 2026-05-29 while pages stayed indexed
* **Evidence:** GSC daily impressions were 1,253 on 05-28 and 38 on 05-29, and never recovered (see `SEO_PERFORMANCE_BASELINE.md` §2). 12,730 URLs were indexed on 08-27. No commits landed on 05-28. The May 2026 core update rolled out May 21 → Jun 2.
* **Root cause:** a **hypothesis**. Either (a) a manual action (scaled content abuse, thin content, cloaking or structured-data misuse would each fit F-02 to F-05), or (b) a site-level quality reassessment during the core update. The two are not mutually exclusive.
* **Phase 1 revalidation:** treated as a separate incident from September. No code, deployment, robots, canonical or redirect change explains a one-day cliff (the 05-23 redirect change was followed by five normal days). The "site-wide quality or spam judgement" wording in §1 is a hypothesis, not a finding; a manual action and a security issue remain unchecked. Full table: `SEO_ROOT_CAUSE_INVESTIGATION.md`.
* **Action:** **Today:** open GSC → Security & Manual Actions → Manual actions and Security issues. If there is a manual action, the remediation plan becomes the reconsideration request scope and the Phase 2 pruning becomes mandatory. If there isn't, proceed as a quality recovery (Phases 1–4). Do not expect recovery before Google re-evaluates the site, which typically takes months and often waits for a later core update.

### F-02 · P0 · Templated, thin, data-free pages at scale (doorway pattern)
* **Evidence (production-equivalent build):** 50,380 pages. 44,911 (89%) share a de-geographed body hash with at least one other page. 45,823 (91%) have fewer than 300 words. 45,667 (90.6%) have zero `/center/` links. Twenty-one `*-near-me` families render about 420 county pages each on **2** bodies. `/insurance/*/*` has 7,527 pages on 29 bodies, with one cluster of 5,016. `/rehab-marketing/*/*` has 6,653 pages on 28 bodies. There are 48 city-combo prefixes × 288 cities. GSC: 21,337 Discovered and 14,130 Crawled – currently not indexed.
* **Root cause:** generators create a page for every (topic × location) combination whether or not data exists. Unique-title and unique-meta checks (`check-unique-meta.mjs`) pass, which hides identical bodies.
* **Affected templates:** every family in §3 except facility_profile, state_hub, the inventoried city/county hubs, and editorial pages.
* **Action:** Phase 2 pruning per `SEO_PAGE_DECISIONS.csv` (approval required), then a Phase 3 rebuild limited to data-backed (facet × location) pages with minimum-inventory thresholds. **Do not** pursue "cosmetic uniqueness"; see F-17.
* **Confidence:** Verified.

### F-03 · P0 · User-agent-based dynamic rendering: crawlers and humans receive different documents
* **Evidence:** `middleware.ts`. Crawler regex → `prerenderRewrite()`; any human → SPA. The header comment describes the crawler HTML as "a stripped-down, design-divergent page meant only for crawlers". The crawler `/resources`, `/locations`, `/treatment-types` and `/insurance` pages are about 178-word shells with identical 26-link footers (`scripts/_seo-page-shell.mjs`). `/provider-guides` has no crawler page. Provider-guide crawler HTML is templated (223 of 254 share a body) while the SPA renders the article (confirmed by unmerged commit `fd62a9b6d5`, "Prerender the provider guides from the content they already carry"). Unmerged commit `f1f4d4d5fc` says: "the version Google indexed was not the version anyone saw."
* **Risk:** Google treats dynamic rendering as an acceptable workaround only when the content is equivalent. Where it is not, this falls under cloaking (spam policies). It also guarantees parity drift on every change.
* **Action:** Phase 1 design decision, then Phase 3 implementation: **serve one HTML document to everyone.** The preferred option is to serve the prerendered HTML to humans too and hydrate or mount the SPA on it, so crawlers and users share one source. The alternative is real SSR. Until then, crawler HTML for every retained page must contain the same main content and links as the SPA.
* **Confidence:** Verified (code and build output). Whether Google has acted on it is unknown.

### F-04 · P0 · Fabricated facility structured data and copy on all 3,796 profiles
* **Evidence:** `scripts/generate-facility-profiles-html.mjs:873-884` hard-codes `openingHoursSpecification` 00:00–23:59, 7 days; `isAcceptingNewPatients: true`; `medicalSpecialty: ["Addiction Medicine","Psychiatry","Behavioral Health"]`; `isAccessibleForFree: false`; and a `knowsAbout` list including dual diagnosis and mental-health treatment for every facility. FAQ line 363: "The clinical team tailors the mix to each client's diagnosis, history, and goals." Measured across all 3,796 profiles: accepting=True 3,796, Psychiatry 3,796, 24/7 hours 3,796. Also `hasCredential` uses `EducationalOccupationalCredential` for state licensing bodies, and `geo` has no coordinates.
* **Risk:** this misrepresents independently operated facilities. It is a structured-data spam signal (manual-action category) and a consumer-harm risk (e.g. an outpatient program shown as open 24/7).
* **Action:** **first safe implementation batch** (see §8). Emit only fields backed by data, drop invented claims, use correct types.
* **Confidence:** Verified.

### F-05 · P0 · Fabricated or unsupported E-E-A-T and trust signals
* **Evidence (each re-checked):**
  * `supabase/migrations/20260828000200_seed_blog_authors.sql:88-101` sets `last_medically_reviewed_at = NOW()` and a "medical-review-team" reviewer on every published clinical article.
  * `src/components/SEO.tsx:310-316` emits `reviewedBy: "RehabLookup Medical Advisory Board"` with `lastReviewed` = **today** on SPA pages.
  * `src/pages/About.tsx:380-394` names "Dr. Sarah Mitchell, MD… board-certified psychiatrist and Medical Director at RehabLookup" and others. No record of these people exists in the repo or DB, and the trust sweep traced them to AI-generated commits. **Owner must confirm or remove.**
  * `src/data/testimonials.ts` holds 26 five-star entries presented as "Real stories from people who used RehabLookup" (`MarketingLanding.tsx:259`).
  * Sitewide copy says "verified, accredited" directory and "3,800+ verified facilities", but **6 of 3,810 rows are verified**.
* **Risk:** E-E-A-T on a YMYL site; FTC rules on fake reviews and testimonials; misrepresentation.
* **Action:** Phase 1 (remove fabricated items) and Phase 5 (build real editorial and medical review processes). Never re-stamp review dates without an actual review by a named, credentialed person.
* **Confidence:** Verified for the code. Whether the named people exist must be confirmed by the owner.

### F-06 · P0 · Vercel firewall challenge active; Googlebot access unverified; timing matches the September index loss
* **Evidence:** All requests from this environment (browser UA, Googlebot UA, and Vercel's own share-link fetch from `iad1`) got the Vercel Security Checkpoint (429). Vercel audit log: `firewall-config-modified/promoted` versions #1 and #2 on **2026-09-06 02:12 UTC**, the first firewall configuration ever, with no deployments since 2026-08-19. GSC indexed counts: 12,441 on 09-17, 8,928 on 09-18, 3,194 on 09-21.
* **Counter-evidence:** indexed URLs were recrawled through 2026-11-16, and there is no "Server error (5xx)" category in Page indexing.
* **Action:** **Today:** check Vercel → Firewall. Confirm verified bots (Googlebot, Bingbot, Google-InspectionTool) bypass any challenge rule, run GSC URL Inspection "Test live URL", and check Crawl Stats for 429s. If Googlebot is challenged, fix the rule and resubmit sitemaps.
* **Confidence:** Hypothesis (access was not verifiable from here).
* **Phase 1 revalidation → unlikely cause.** Vercel observability for 2026-11-16 → 11-23 shows `googlebot` / `allow` / 200 (1,024 requests) and bingbot allowed, while unclassified automation gets `challenge` / 429. That matches Vercel's documented behaviour (Bot Protection excludes verified bots). A 429 seen by this environment therefore says nothing about Googlebot. The configuration has not changed since 2026-09-06, but September is outside the 36-day log window, so GSC Crawl Stats for Aug–Nov are still the decisive check.

### F-07 · P0 · Retired-service and lead-generation claims still live at scale
* **Evidence:**
  * "free insurance verification tool" appears in **9,349** prerendered files (insurance 640, about 420 per near-me family, treatment-types 300, rehab-marketing 254). `InsuranceVerification.tsx` promises "Our admissions team will verify your coverage… within the next hour".
  * `public/llms.txt` describes "Free concierge placement… Hand-matched placement within 24–48 hours… 24/7 support". `index.html:301` (noscript) says "Create a free account to save facilities".
  * Paid-traffic landing pages `/ads/:slug` (`AdLanding.tsx`) and `/lp/convert` (`MarketingLanding.tsx`) still promise matching. Concierge/placement copy is in `HowWeMakeMoney.tsx`, `MedicalDisclaimer.tsx` and `public/notice-of-privacy-practices.html`.
  * Seeker emails in `supabase/functions/send-concierge-notifications`, `send-tour-notifications` and `placement-monitor` link to retired `/account/*` and `/seeker-auth` URLs.
* **Action:** Phase 1 content-truth batch. Remove or reword. The insurance-verification form needs a **product decision**: retire it, or confirm a real staffed process.
* **Confidence:** Verified (the counts by grep; llms.txt and index.html re-checked).

### F-08 · P1 · Directory root `/rehab-centers` 301s to a noindexed search page
* **Evidence:** `vercel.json` redirects `/rehab-centers → /search-results` (noindex). Every facility profile's BreadcrumbList and visible breadcrumb ("Find Rehab") points to `/rehab-centers`. `/locations` (the human hub) is a 178-word shell for crawlers and links to **no** state pages.
* **Action:** Phase 1. Restore an indexable `/rehab-centers` root that lists all states with counts and is linked from breadcrumbs and the footer. Make `/locations` 301 to it, or the reverse; pick one canonical.
* **Confidence:** Verified.

### F-09 · P1 · Mass redirects to a noindexed search page
* **Evidence:** 59 `vercel.json` redirects go to `/search-results`, including the 11 city-combo prefixes (iop, php, inpatient, outpatient, drug, alcohol, luxury, detox-centers, detox, mat-clinic, sober-living) × 288 cities = **3,168 URLs** → `/search-results?location=:city`, and 25 near-me `/:state/:city` patterns. The destination is noindex, so equity is discarded and Google may treat these as soft 404s. GSC "Page with redirect" shows 1,164.
* **Action:** Phase 2. Retarget to the matching indexable city hub where it has inventory (`/rehab-centers/{state}/{city}`). Otherwise return 410. Requires approval (part of the manifest).
* **Confidence:** Verified.

### F-10 · P1 · The crawler-visible internal link graph is broken (orphans)
* **Evidence:** across 50,380 prerendered pages, **40,881 have zero inbound links**. That includes **1,734 of 3,796 facility profiles**, all 210 treatment×city pages (the best-performing template per page, 7,766 impressions), all 254 provider guides, 150 state articles and 110 of 116 resource articles. State hubs list 12 facilities each, and only 484 city hubs list facilities.
* **Root cause:** hub templates for crawlers are generic shells (F-03); facility lists are capped; there is no "all facilities in {city/county}" pagination.
* **Action:** Phase 1 (hub pages render real lists) and Phase 3/6 (full hierarchy Home → /rehab-centers → state → county/city → facility, with paginated complete lists and related-facility links).
* **Confidence:** Verified.

### F-11 · P1 · The catalogue is too thin to compete on the head terms it targets
* **Evidence:** 3,796 live listings versus 14,071 distinct staged SAMHSA records (scraped 2026-05-14). State hubs, which earn 50% of impressions, rank 60–90 for "rehabs in {state}". Only 322 cities have ≥3 facilities. The facets in `staged_samhsa.services` (Service Setting, Type of Opioid Treatment, Pharmacotherapies, Special Programs/Groups for 12,433 facilities, Language Services, Age Groups, Sex Accepted, Facility Operation, Payment) are collapsed into about 11 service tags and 5 payer tags in `facility_services` / `facility_insurance`. `facilities.levels_of_care` and `payment_options` are empty on 3,798 and 3,799 rows.
* **Action:** Phase 3 data project: dedupe and promote the remaining SAMHSA records with provenance ("reported to SAMHSA, data as of …"), and map the full facet vocabulary. **Requires an owner decision** (data quality, freshness and claim workflow implications).
* **Confidence:** Verified (counts). The decision is the owner's.

### F-12 · P1 · Pages promise attribute matches the data cannot support (YMYL accuracy)
* **Evidence:** facility insurance data has Aetna 5, Cigna 5 and every other commercial carrier ≤1 facility. Yet there are 7,527 `/insurance/*` pages plus carrier near-me families, and queries like "rehab that accepts cigna san mateo" rank around position 3. No data exists for luxury, executive, Christian/faith, couples, holistic, beach/mountain, same-day/emergency, 30/60/90-day, or substance-specific (benzo, cocaine, meth, xanax, …) facility attributes.
* **Action:** Phase 2/3. Remove facility-matching claims for unsupported attributes. Keep educational guides that don't claim matches. Rebuild only data-backed facets.
* **Confidence:** Verified.

### F-13 · P1 · Keyword cannibalization across parallel URL families
* **Evidence (Texas detox example):** `/detox-near-me/texas`, `/24-7-detox-near-me/texas`, `/detox-centers/texas`, `/treatment-types/detox-programs/texas`, `/rehab-marketing/texas/detox`, and county pages `/rehab-centers/texas/county/*/detox-centers`. Medicaid in a state appears as `/medicaid-rehab/{s}`, `/medicaid-rehab-near-me/{s}` and `/insurance/medicaid-rehab/{s}`.
* **Action:** Phase 2. Choose one canonical URL per (topic × place); the mapping is in `tools/build_decisions.py` (`NEAR_ME_TARGET`, `SPECIALTY_STATE_TARGET`). 301 the duplicates that have evidence and 410 the rest.
* **Confidence:** Verified.

### F-14 · P1 · Sitemap pipeline advertises low-value URLs; metadata unreliable
* **Evidence:**
  * The production sitemaps hold 34,822 URLs, and **30,706** of them are zero-inventory template pages.
  * Committed `public/sitemap*.xml` (43,150 + 269 + 2) differ from what the build ships (30,793 + 233 + 3,796).
  * `sitemap-facilities` edge function: `Content-Type: text/plain` and `<lastmod>` = request date for every URL. The sitemap index `lastmod` is always today, so lastmod signals are unreliable.
  * Most city hubs (1,065 of 1,096) and city combos are out of the sitemap but still return 200 to crawlers.
* **Action:** Phase 1. Correct the content type and use real `updated_at` lastmods. Phase 2: the sitemap must equal the set of retained indexable canonical URLs. Stop committing generated sitemaps, or regenerate them in CI.
* **Confidence:** Verified (edge function fetched; build run).

### F-15 · P1 · Measurement cannot attribute SEO value
* **Evidence:** GA4 has no key events. `facility_contact` = 20 events in total, and provider signup and claim events are absent. GA4 starts around 2026-05-01. Error/loading titles are tracked ("Content Temporarily Unavailable" 280, "Loading Article…" 72). The gtag snippet is injected into 50,380 crawler-only files. Organic users in late Aug–Sep (29–44 a week) don't match GSC (0 clicks).
* **Action:** Phase 1. Configure key events (facility_contact, inquiry_submit, outbound_website_click, provider_signup_complete, claim_submit). Fix SPA titles for error states. Remove GA from crawler-only HTML. Connect GSC ↔ GA4. Get the source/medium breakdown.
* **Confidence:** Verified (snapshot).

### F-16 · P1 · "Best rehab centers" pages rank by paid plan with no methodology
* **Evidence:** `src/pages/seo/BestInStatePage.tsx:32-36` sorts by `isPro`, then `featured`, then `calculatedRankingScore`, then name. 10 of the 51 committed `best-rehab-centers-in-*.html` pages say "Top-Rated". The family earned 2,173 impressions (California 1,122). This contradicts `EditorialPolicy.tsx` ("cannot pay for higher rankings").
* **Action:** Phase 2/5. Remove the ranking claim or publish a real methodology, and disclose paid placement. The default proposal is to merge into the state hubs.
* **Confidence:** Verified (trust sweep; sort logic cited).

### F-17 · P1 · Unmerged branch `seo/content-uniqueness-audit` should not be merged as is
* **Evidence:** 15 commits and 46,129 regenerated files. Its "composer" gives each templated family "axes to differ on" (carrier, topic, market data) to break duplicate clusters. Its own CI measured about 1% duplicates after the change.
* **Risk:** this is cosmetic uniqueness on pages that still have no facility data, which is the pattern the project brief rules out. It would lower the duplicate metric without making the pages useful.
* **Action:** salvage the **measurement script** (`scripts/check-content-uniqueness.mjs`), the **SPA/crawler parity test**, and the **provider-guide prerender fix** (`fd62a9b6d5`) into Phase 1/3. Drop the composer work on the families slated for removal.
* **Confidence:** Verified (commit messages and diff size). This is a judgement recommendation.

### F-18 · P2 · robots.txt contradictions and crawl traps
* **Evidence:**
  * Disallows `/placement-help` and `/concierge/{intake,thank-you,create-password}`, which are 301 sources. The file's own note says not to block 301 sources.
  * 388 lines with many per-bot groups and `Crawl-delay` (ignored by Google; slows Bing and others).
  * `/search-results` is crawlable with unbounded `?location=`/filter parameters while noindexed, and 50,376 footers link to it.
  * A stray `public/vercel.json` (with `cleanUrls: true` and old redirects) is published at `/vercel.json`.
* **Action:** Phase 1. Simplify robots.txt into one `*` group plus bot-specific rules only where needed. Unblock 301 sources. Keep `/search-results` crawlable but stop linking it sitewide as a navigation target for crawlers (or canonicalize parameters). Delete `public/vercel.json`.
* **Confidence:** Verified.

### F-19 · P2 · Homepage served as the SPA shell to crawlers
* **Evidence:** middleware `if (pathname === "/") return next();`. The crawler gets `index.html`: title and robots are present, the canonical was removed on 2026-05-29 (set by Helmet only after JS runs), main content needs JS, and the noscript block has stale account copy. The homepage is the strongest page (position 2.6, 17 clicks).
* **Action:** Phase 1. Prerender the homepage with a static canonical and real content (states, popular cities, how listings are sourced), and fix the noscript copy.
* **Confidence:** Verified (code).

### F-20 · P2 · Facility data quality
* **Evidence:**
  * Truncated SAMHSA names (e.g. "Northcare Addiction and Recovery Prog").
  * `levels_of_care` and `payment_options` columns are empty; the data lives in child tables.
  * 3,794 have no images, and 62 have no website.
  * 7 of 3,810 are claimed (`facility_claim_requests` = 4).
  * `facilities.verified` is used in copy as if meaningful.
  * Accreditations imported from SAMHSA are stored `verified=true` (e.g. "CARF International", 2,521) although RehabLookup did not verify them.
  * 39 of the 427 indexed facility URLs in the GSC sample no longer exist (they 404, which is correct).
* **Action:** Phase 3. Build a completeness and reliability score with three provenance states: facility-provided, independently verified, and reported to SAMHSA/unconfirmed. Display accreditations as "reported to SAMHSA".
* **Confidence:** Verified.

### F-21 · P2 · Boilerplate FAQPage markup at scale
* **Evidence:** FAQPage JSON-LD on all 3,796 profiles (templated Q&A) and 465 county pages. FAQ rich results have been limited to authoritative government and health sites since 2023, so this adds boilerplate without eligibility.
* **Action:** Phase 6. Keep FAQ content only where it is specific and useful, and drop the markup on templated pages.
* **Confidence:** Verified (presence). Eligibility depends on Google policy.

### F-22 · P2 · Organization schema implies RehabLookup is a care provider
* **Evidence:** `SEO.tsx` sets `@type ["Organization","MedicalBusiness"]`, `hasCredential "LegitScript Verified"` (no evidence in the repo), "HIPAA Compliant Platform", and support hours of 00:00–23:59, 7 days. The crawler header on 50,376 pages shows "Support · (214) 639-6420", while the SPA states that number is not a treatment helpline.
* **Action:** Phase 1/6. Use plain `Organization` and `WebSite`, keep only credentials backed by evidence, and use accurate support hours. Keep the phone visibly labelled "site support — not a treatment line".
* **Confidence:** Verified (code). LegitScript status needs owner confirmation.

### F-23 · P2 · Consumer-account remnants after the provider-only migration
* **Evidence:** `ReviewForm.tsx:172-182` ("Sign in to leave a review" → `/login`, which now rejects consumers) appears on every profile. `src/data/pageFaqs.ts:73` says "Create a free account to save facilities…". Also `index.html:301`, `Comparison.tsx:620` ("saved… and your account"), and seeker emails (F-07). What already works: `/signup`, `/account/*`, `/my-account/*` and `/seeker/*` 301 at three layers; `/compare` works anonymously (localStorage); `/login` is provider-only and noindexed.
* **Action:** Phase 1 (copy and review CTA) and Phase 2 (retire seeker email types). The full list is in the handoff.
* **Confidence:** Verified (items re-checked).

### F-24 · P2 · Medical statistics misquoted or uncited
* **Evidence:** "…with 40-60% of people maintaining…" (`src/pages/StatePage.tsx:88`, re-checked) inverts NIDA's 40–60% *relapse* rate. `src/pages/FAQ.tsx:116` uses the figure correctly. The trust sweep reports the same inversion in `TreatmentFAQSection.tsx`, `AlcoholRehabilitation.tsx` and `DurationSettingPage.tsx`, and an unsourced "50–70% … sobriety" in `DrugRehabUSA.tsx:35`. `stateAddictionStats.ts` cites sources only in code comments.
* **Action:** Phase 5 medical accuracy pass; flag for qualified clinical review.
* **Confidence:** Verified for `StatePage.tsx:88`. The other locations come from the sweep and need re-checking during the Phase 5 pass.

### F-25 · P3 · Miscellaneous hygiene
* 3 prerendered pages have non-self or missing canonicals (category `other`).
* 3,264 prerendered files sit behind `vercel.json` redirects (dead weight).
* `/international/*` and `/us-rehab/*` link to the retired `/international/apply`.
* "Organic Shopping" sessions appear in GA4.
* "Content Temporarily Unavailable" appears as a page title.


### F-26 · P1 · Firewall denies Applebot, GoogleOther and AI search/assistant crawlers (new, Phase 1)
* **Evidence:** Vercel request logs, 2026-11-16 → 11-23: `applebot` deny/403 (78), `googleother` deny/403 (11), `gptbot`, `oai-searchbot`, `chatgpt-user`, `perplexitybot`, `duckassistbot`, `meta-webindexer` deny/403 (85 together).
* **Risk:** excludes the site from Apple Search/Spotlight/Siri and from ChatGPT search and Perplexity citations (business goal 13). GoogleOther is used for some Google research and product crawls; it does not affect Search ranking.
* **Action:** owner decision in Vercel → Firewall → AI Bots ruleset. Recommended: allow Applebot, OAI-SearchBot, ChatGPT-User and PerplexityBot; keep training crawlers denied if preferred.
* **Confidence:** Verified (logs). Rule contents not readable by this integration.

### F-27 · P0 · Crawler HTML is materially thinner than what visitors see (new measurement, Phase 1)
* **Evidence:** `tools/render_parity.mjs` on the production-equivalent build: crawler/visitor words `/` 4/1,439; `/rehab-centers/texas` 421/2,787; `/rehab-centers/texas/houston` 437/2,436; `/center/{slug}` 843/1,446; `/treatment-types/detox-programs/texas` 233/2,786; `/insurance/aetna-rehab` 171/1,786; `/resources` 172/4,675; `/about` 168/1,146. Titles and H1s differ on most templates; canonicals agree except `/`.
* **Consequence:** much of the Phase 0 "thin" measurement (F-02) describes the crawler shells, not what users read. It does not make the SPA text automatically valuable — it must still be judged per template — but it changes what "improve" means: first make Google see the real page.
* **Action:** ADR-001 (Phase 3, after removal waves A–B). **Limit:** this is a local reproduction of the routing rule, not a fetch of production as Googlebot.
* **Confidence:** Verified (local build).

### F-28 · P2 · Two pages crashed at runtime (fixed in Phase 1)
* **Evidence:** `About.tsx` and `MidArticleCTA.tsx` rendered `<Search />` without importing it (`tsc` errors on `main`). Any visitor reaching those components hit a React error.
* **Action:** imports added in commit `15d4a0339c`. `tsc` error count 123 → 121; the rest are pre-existing type errors with no runtime effect found.
* **Confidence:** Verified.

### F-29 · P2 · Facility provenance was invisible (fixed in Phase 1)
* **Evidence:** 3,802 of 3,810 rows have `data_source` beginning `samhsa`; 7 are claimed; 6 `verified`. Profiles described every facility as "licensed" and its accreditations as recognitions, without saying the source.
* **Action:** shared `facilityProvenance()` drives a visible notice on every profile (government directory / facility-provided / staff-entered) and source labels on credentials. 458 rows labelled `samhsa_import` have no staged SAMHSA match (SAMHSA plan §2), so the label itself needs a data fix in Phase 3.
* **Confidence:** Verified.

---

## 5. Top 20 prioritized issues

| # | Issue | Finding | Severity | Pages affected | Phase |
|---:|---|---|---|---:|---|
| 1 | Check the GSC Manual Actions / Security Issues report | F-01 | P0 | sitewide | Now |
| 2 | Verify Googlebot passes the Vercel firewall; fix the rule if not | F-06 | P0 | sitewide | Now |
| 3 | Remove fabricated facility schema (24/7, accepting, Psychiatry) and FAQ claim | F-04 | P0 | 3,796 | 1 (batch 1) |
| 4 | Remove SQL-stamped medical review, "Medical Advisory Board" schema, unverified staff, fake testimonials | F-05 | P0 | sitewide | 1 |
| 5 | Remove the "free insurance verification" / concierge / placement claims and update llms.txt | F-07 | P0 | 9,349+ | 1 |
| 6 | Owner approval of the pruning manifest (37,173 → 410; 6,618 → 301/merge) | F-02 | P0 | ~43,800 | 2 |
| 7 | Single-document rendering (end the crawler/human split) | F-03 | P0 | all retained | 1 (design) → 3 |
| 8 | Restore an indexable `/rehab-centers` root; fix breadcrumbs | F-08 | P1 | 3,797 | 1 |
| 9 | Crawler hub pages must list their children (states, articles, guides, types) | F-10 | P1 | ~1,000 | 1 |
| 10 | Prerender real provider-guide and article content (parity) | F-03, F-10 | P1 | 370 | 1 |
| 11 | Retarget the 3,168 city-combo → search redirects | F-09 | P1 | 3,168 | 2 |
| 12 | Canonical topic × place mapping (end cannibalization) | F-13 | P1 | ~4,000 | 2 |
| 13 | Sitemap = retained canonical set; fix content type and lastmod | F-14 | P1 | sitemaps | 1–2 |
| 14 | GA4 key events + GSC link + remove GA from crawler HTML | F-15 | P1 | measurement | 1 |
| 15 | State hubs: complete paginated inventory + data-backed sections | F-11 | P1 | 50 | 3 |
| 16 | SAMHSA facet re-import and catalogue expansion (owner decision) | F-11 | P1 | data | 3 |
| 17 | Remove unsupported attribute claims (commercial carriers, luxury, …) | F-12 | P1 | ~20k | 2–3 |
| 18 | "Best rehab" pages: remove ranking claim or publish methodology | F-16 | P1 | 51 | 2 |
| 19 | Prerender the homepage with real content and canonical | F-19 | P2 | 1 | 1 |
| 20 | robots.txt cleanup; delete `public/vercel.json` | F-18 | P2 | sitewide | 1 |

---

## 6. Critical unknowns (need the owner or more access)

1. **Manual action status** (GSC). This decides whether the plan includes a reconsideration request.
2. **Vercel firewall rule contents** and whether verified bots are exempt; a GSC live test.
3. **Real names and credentials** of any medical reviewers or advisors, the LegitScript status, and whether a staffed insurance-verification process exists.
4. **Crawl Stats** (response codes over time), the **Sitemaps report**, and **Core Web Vitals**.
5. **Date-compared GSC exports** by page and query (Apr 30–May 28 vs May 29–Jun 26).
6. **GA4 source/medium** for the late-Aug–Sep organic users; Bing Webmaster data.
7. **Backlinks:** no backlink data was available, so link equity on removal candidates is unknown. Before executing 410s, run a backlink export (Ahrefs/Semrush/GSC Links) and switch any linked URL to a 301.
8. **Owner product decisions:** promote the staged SAMHSA records? Keep the B2B county pages? Keep the international pages? Keep insurance verification?
9. **Live HTTP behaviour**, which this environment couldn't reach. Re-run `validate-vercel-deploy` from an allowed network, or allowlist an audit IP.

---

## 7. Decision rules used in `SEO_PAGE_DECISIONS.csv`

General principle: a URL with any GSC impression or index evidence that is being retired gets a **301 to its closest retained equivalent**. A URL with no evidence and no inbound links gets **410**. Every DELETE, 301 and MERGE is `PENDING_OWNER_APPROVAL`.

| Rule | Applies to | Action |
|---|---|---|
| R01 | `/` | IMPROVE (prerender, canonical, copy) |
| R02 | facility URL known to GSC but not in the live set | Already 404 to crawlers; keep it out of the sitemap |
| R03 | facility_profile | IMPROVE (schema truth, provenance, internal links) |
| R04 | state_hub | IMPROVE (complete inventory, data sections) |
| R05 | `/rehab-centers` | IMPROVE (restore an indexable root) |
| R06 / R07 | city_hub with or without exact-match inventory | IMPROVE / MERGE → state hub |
| R08 / R09 | county_hub with or without inventory | KEEP / MERGE → state hub |
| R10 | county × service | 410, or 301 → county hub if there is evidence |
| R11 | near-me county / city | 410, or 301 → canonical state × topic page if there is evidence |
| R12 | near-me state with a canonical equivalent | MERGE → canonical (cannibalization) |
| R13 | near-me state for MAT/OTP topics | INVESTIGATE (Phase 3 data-backed MAT page) |
| R14 | near-me state, topic without data | 410, or 301 → state hub if there is evidence |
| R15 | national near-me topic page | INVESTIGATE (editorial dedupe) |
| R16 / R23 | crawler hubs (`/treatment-types`, `/insurance`) | IMPROVE (list children) |
| R17 | national treatment type | IMPROVE |
| R18 / R19 / R20 | treatment × state/city: data-backed / SAMHSA-supportable / unsupported | IMPROVE / INVESTIGATE / 410 or 301 → national type |
| R21 | duplicate specialty × state (detox-centers, medicaid-rehab, medicare-rehab) | 301 → canonical |
| R22 | other specialty × location | 410, or 301 → national topic if there is evidence |
| R24 | insurance carrier guide | IMPROVE (education, no matching claims) |
| R25 / R26 | insurance × state: gov payer / commercial | IMPROVE / MERGE → carrier guide |
| R27 | insurance × county/city | 410, or 301 if there is evidence |
| R28 | provider-marketing pages (all depths) | 410, or 301 → `/provider-guides/rehab-marketing-strategies` if there is evidence |
| R29 | `{list-your-facility,get-more-patients,for-providers}-in-{city}` | 301 → `/for-providers` |
| R30 | provider_guide | IMPROVE (prerender the real article, hub, dedupe) |
| R31 | city combo currently redirected to `/search-results` | 301 retarget to the matching city hub with inventory (2,167); 410 where no hub matches (1,001) |
| R32 | city combo, other | 410; with evidence, 301 to the matching city hub, or INVESTIGATE if no unambiguous hub |
| R33 | best_in_city | INVESTIGATE (remove ranking claim or merge) |
| R34 | editorial pages | INVESTIGATE (content and medical review queue) |
| R35 | private/auth | NOINDEX (keep) |

---

## 8. First safe implementation batch (Phase 1, batch 1)

**Scope:** non-destructive truth and crawlability fixes that remove known spam and trust signals. **No URL removals, no redirects, no data deletion.** Each item is reversible, testable, and limited to the files listed.

1. **Facility profile schema and copy truth** (`scripts/generate-facility-profiles-html.mjs`, and the matching SPA emitter in `src/components/SEO.tsx` / `CenterProfile.tsx`):
   * Remove the hard-coded `openingHoursSpecification` (emit only if `hours_of_operation` exists).
   * `isAcceptingNewPatients`: only from `accepting_admissions`.
   * `medicalSpecialty`: derive from services, or drop it.
   * Remove `knowsAbout` boilerplate.
   * Replace the `hasCredential` misuse.
   * Drop the empty `geo`.
   * Remove the "clinical team tailors…" FAQ sentence.
   * Label accreditations as "reported to SAMHSA" when `data_source = samhsa_import`.

   Add a CI guard (extend `check-structured-data.mjs`) that fails on hard-coded facility attributes.
2. **E-E-A-T truth:** remove `reviewedBy "RehabLookup Medical Advisory Board"` and the today-dated `lastReviewed` (`SEO.tsx:310-316`). Stop rendering "Medically reviewed by…" unless a real reviewer and date exist (`ArticleByline.tsx`). Add a migration that nulls the bulk-stamped `last_medically_reviewed_at` / `medical_reviewer_id`; it is reversible because the values were stamped by `NOW()` on 2026-08-28. Remove unverified staff from `About.tsx` **pending owner confirmation**. Unwire `testimonials.ts` from `MarketingLanding.tsx`.
3. **Retired-service claims:** rewrite `public/llms.txt`. Fix the noscript copy in `index.html` and `pageFaqs.ts:73`. Replace the "free insurance verification tool" sentence with neutral guidance on checking coverage with the plan and the facility. It appears in 9,349 files and is emitted by several generators, e.g. `scripts/generate-all-missing-html.mjs:320,349` and `scripts/fix-duplicate-titles.mjs:143`; grep the full set before editing. Remove "verified/accredited directory" phrasing from `pageFaqs.ts`, `locationDescriptions.ts`, `SEOLandingTemplate.tsx` and `CityPage.tsx`.
4. **Organization schema:** use plain Organization + WebSite, remove the unverified LegitScript credential, and set accurate support hours.
5. **Measurement:** remove the gtag snippet from crawler-only HTML (`backfill:ga-snippet`) and document the key events for the owner to configure in GA4.
6. **Validation:** `npm run test`, `validate:seo-schema`, `check:structured-data`, `check:unique-meta`, `check:canonical-ga`, `check:public-directory-truth`, a rebuild of the generator sequence, and a JSON-LD diff on 20 sampled profiles. Deploy only through the existing PR → Vercel flow, after owner review.

**Batch 2 (Phase 1, still non-destructive):** restore an indexable `/rehab-centers`; crawler hub pages list their children (states, articles, guides, types); prerender the real provider-guide and article content (salvage `fd62a9b6d5`); prerender the homepage with a canonical; facility sitemap content type and real lastmod; robots.txt cleanup; delete `public/vercel.json`; ReviewForm CTA removal.

**Phase 2 (destructive, approval-gated):** execute `SEO_PAGE_DECISIONS.csv` in waves, starting with the zero-evidence families (provider_marketing_*, near_me_county, insurance_x_county, county_x_service, city_combo without evidence). Retirement mechanics: delete the generator output and SPA routes; add a middleware rule returning **410** for retired patterns, for crawlers *and* humans; regenerate the manifest and sitemaps; verify with `check-redirect-targets`, `validate-internal-links`, and a sampled HTTP status check.
