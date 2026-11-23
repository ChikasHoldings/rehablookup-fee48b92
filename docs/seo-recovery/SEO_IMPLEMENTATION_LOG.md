# SEO Implementation Log — RehabLookup

Append-only log. Each entry records what changed, where, how it was tested, and known issues. Recommendations that have not been executed do **not** belong here; they go in `SEO_PHASE_HANDOFF.md`.

---

## 2026-11-23 · Phase 1 batch 2 · deployment record

* **Final preview (head `603daff1d8`):** build green in 21 min. `[crawler-snapshots] 2133/2754 snapshots written in 908s` — home 1, state hubs 50/50, **city hubs 484/485**, county hubs 438/438, provider guides 254/254, insurance hubs 17/17, government-payer state pages 150/150, resources 109/114, state articles 100/150, content pages 147/169, treatment types 383/926. Kept on generator HTML: 511 the app marks noindex, 59 that 404 for visitors, ~30 the app redirects. Every guard passed on the snapshot output (`check:directory-public-shell`, `check:no-fake-inventory`, `check:trust-claims`, `check:crawler-analytics` on 100,923 files, `check:canonical-ga` 0 errors on 50,461 pages, 0 dead redirects).
* **Merged:** PR #90 squash-merged as `b2cecafd5b`.
* **Production:** Vercel `dpl_Cc7TdhMdaYVKVweFRBTcxyQm3dg1`, **READY 2026-11-23 18:31:54 UTC**, aliased to `rehablookup.com` / `www`. Production build: `[crawler-snapshots] 2147/2754 snapshots written in 1070s`; all guards passed. Runtime errors in the following hour: none.
* **Edge functions (10):** the first dispatch of "Deploy all stale edge functions" failed for every function — the workflow installs the latest Supabase CLI, which now refuses non-interactive deploys without `--yes` ("Nothing was changed"). Fixed in the workflows (`--yes`), re-dispatched; that run hit a GitHub API rate limit while installing the CLI and was re-run once. **Result: 10/10 deployed** (`placement-monitor`, `send-concierge-notifications`, `send-lead-message`, `send-marketing-followup`, `send-message-notifications`, `send-review-notification`, `send-tour-notifications`, `submit-marketing-lead`, `support-ticket-reply`, `support-ticket-status`). Verified: live `send-lead-message` v5 links `/contact`.
* **Database:** `20261123000200` applied earlier the same day (see batch 2 entry).
* **Not verified — production HTTP**: this environment is still challenged by the Vercel Security Checkpoint. Owner: GSC URL Inspection → *Test live URL* on `/`, `/rehab-centers/texas`, `/rehab-centers/texas/houston`, `/treatment-types` and `/for-providers` — the rendered HTML should now match what a visitor sees, and `/rehab-centers/texas` should contain links to `/center/…` pages.
* **Still owner-only:** Vercel Firewall → AI Bots → Off/Log (AI search crawlers are still denied until then).

---

## 2026-11-23 · Phase 1 batch 2 (owner-requested fixes) · code, one schema change, edge functions

**Owner request (2026-11-23):** allow AI search engines; fix crawler/visitor parity; remove GA from crawler-only HTML; fix every listed remaining problem (facility sitemap, thin hubs and homepage, facility-card links, seeker emails, `/ads` `/lp/convert` `/insurance-verification`, the CEO "65,000 users" claim, `/rehab-centers?…`); document the SAMHSA expansion as deferred. Owner also reported the May 29 GA tag switch (checked; see root-cause doc).

### Commits (branch `henry/zealous-lovelace-83d834`, PR #90)
| Commit | What |
|---|---|
| `127cca65ef` | 9 public pages + provider Settings no longer crash (missing `Search` imports; removed setters still called). New `check:undefined-identifiers`. |
| `dc212732fd` | Crawler snapshots of the live SPA (`render-crawler-snapshots.mjs`, route selection, fail-soft browser provisioning); homepage snapshot for crawlers; AI agents in middleware + robots.txt; facility cards are real links; comparison pages render; privacy notice served; trust guard scans snapshots. |
| `6dfc6843cf` | GA removed from 46,665 committed crawler-only pages; `backfill-ga-snippet` replaced by `strip-crawler-analytics` (+ `--check`). |
| `794308c223` | Seeker emails/SMS in 10 edge functions: no `/account/*`, `/seeker-auth`, `/concierge` links. |
| `185687960e` | `/ads/:slug`, `/lp/convert` → `/`; `/insurance-verification`, `/vob`, `/verify-insurance` → `/insurance` (0 submissions ever recorded); honest insurance CTAs; `/rehab-centers?<query>` → `/search-results`. |
| `77ae92dd43` | April 2026 traffic post rewritten as a correction (headline overridden); CEO note claims removed. |
| `c971005138` | Migration `20261123000200_facilities_updated_at_ignores_ranking_scores.sql`. |
| `da07059edb` | Build and CI wiring. |

### Data / platform changes
* **Applied 2026-11-23** (Supabase `mldbxpntzcjalgjmwnqa`): trigger `update_facilities_updated_at` now runs `facilities_touch_updated_at()`. Verified in two rolled-back transactions: a score-only update keeps `updated_at`; a description edit bumps it. No rows changed. Rollback SQL in the migration header. (The first attempt timed out waiting for confirmation and applied nothing; the retry succeeded.)
* **Not changed:** the Vercel Firewall (this integration returns "access denied" for firewall settings). Owner steps are in the handoff.
* **Edge functions:** source changed; deployment via the existing "Deploy all stale edge functions" workflow after merge (see the deployment record below).

### Validation
* `vitest run`: 61 files, 1,103 tests passed.
* `tsc`: 108 errors (was 121; **0 undefined-identifier errors**, was 13). `check:undefined-identifiers` passes.
* ESLint on changed files: 0 new errors (4 pre-existing `require()` errors in `seeker-account-retirement.test.ts`, untouched lines).
* `check:redirect-parity`: 92 SPA redirects ↔ 92 vercel.json 301s, 0 missing. `check-redirect-targets`: 0 dead. `check:crawler-analytics`: 0 files with GA.
* Snapshot renderer, local production-equivalent `dist/` (dry run, 3,630 routes): 2,910 snapshots in 21 min on 4 cores; failures were the crashes and not-found pages since fixed, plus the parity gaps listed in ADR-001.
* After the fixes, local full run: 2,941 of 3,630 routes snapshotted in 1,284 s (2,803 via in-app navigation); `check:trust-claims` clean across all 2,941 snapshots.
* **Vercel preview builds.** Chromium launched on Vercel's build image (`[snapshot-browser] chromium-headless-shell ready`, `[crawler-snapshots] browser via playwright`) and rendered the 2,300-route production set in about 7 minutes. Two previews then **failed on purpose**: the existing retired-product guard (`check:directory-public-shell`) now sees the live pages, and found concierge copy that visitors had been shown all along — about 330 city pages ("our concierge team can help"), 300 treatment × state pages ("Our concierge team can help verify your benefits"), the `/for-providers` Concierge add-on, Concierge Partner section and FAQ, plus homepage and `/insurance` lines. All were rewritten (commits after `da07059edb`), and the guard passes on a re-rendered sample.
* SEO Validators CI initially failed `check:crawler-analytics` because 13 generators inlined the GA tag (the build strips it later; CI regenerated facility profiles without stripping). The tag was removed from the generators; CI passes.

### Known issues / not done
* **International pages (`/us-rehab/*`, `/international`, `/travel-to-usa-for-rehab`)** still describe a retired international placement service in about 22 places ("We coordinate visa documents, flights, and airport transfers", "Our team helps verify your coverage and negotiate with facilities"). The guard does not catch this wording. Keeping, rewriting or retiring these pages is an open owner decision.
* Provider-only screens (Knowledge Base, ROI widget) still describe concierge placements and "Verified Leads". They are not public pages, but they misdescribe the product to providers.
* Parity gaps kept on generator HTML pending the removal decisions: 575 routes the app itself marks noindex, 63 that 404 for visitors (50 "best cities" state articles and about 13 others), and treatment × city pages that the app redirects to the state page.
* The Vercel Firewall still denies AI search crawlers until the owner changes the AI Bots setting.

---

## 2026-11-23 · Phase 1 batch 1 · deployment record

* **CI on PR #89 (head `e1a6401a43`):** SEO Validators passed; Vercel preview `dpl_4dDVmV1sxriEbFCfRb33Muv27sbZ` built and deployed.
* **Merged:** PR #89 squash-merged to `main` as `a81a79a294`. SEO Validators passed again on the push to `main`.
* **Production:** Vercel deployment `dpl_ByWrZ5ruxRQJKUtLjqXt3zFZxfJU`, target production, **READY at 2026-11-23 03:51:30 UTC**, aliased to `rehablookup.com` and `www.rehablookup.com`.
* **Production build log (Vercel's own build, live database):**
  * `check-trust-claims`: 50,466 public files, 3,796 facility schema nodes, 1,109 source files, clean.
  * `check-redirect-targets`: 219 redirects, 0 dead, 0 chained.
  * `check-canonical-ga`: 50,461 pages, 0 canonical errors.
  * `check-public-directory-truth`, `check-public-navigation`, `check-inquiry-routing-prerender` and `check-pro-phone-visibility` all passed.
* **Runtime errors:** none reported for the project in the hour after deploy.
* **Not verified — production HTTP responses.** Every request from this environment (browser UA and Googlebot UA, plus Vercel's authenticated fetch of the preview) receives the Vercel Security Checkpoint (`429`, `x-vercel-mitigated: challenge`). This is the challenge for unclassified automation, not evidence about Googlebot. **Owner action:** GSC → URL Inspection → *Test live URL* on `/locations` (expect 200, indexable), `/rehab-centers` (expect 301 → `/locations`), and one `/center/*` page (expect JSON-LD without opening hours, Psychiatry or `knowsAbout`, and a provenance notice); then resubmit `sitemap.xml`. Weekly, check Vercel observability for `googlebot` / `allow` / 200.
* **Rollback:** Vercel → Deployments → promote `dpl_DqE67ckwyDbUsZGPT5cSatbQmTMv` (previous production, `f31fd7dbf6`), or revert `a81a79a294`. The database change is independent; see the migration header for its rollback SQL.

## 2026-11-23 · Phase 1 (Critical SEO recovery, batch 1) · code + one data migration

**Owner approval (2026-11-23):** the first safe repair batch, covering structured data, medical-review claims, misleading statements, account/service messaging, crawler/visitor consistency, confirmed technical defects, validation, and SAMHSA pipeline *preparation*. **Not approved:** bulk deletion, mass redirects, publishing staged facilities, or merging `seo/content-uniqueness-audit` (open PR #88).

### Commits (branch `henry/zealous-lovelace-83d834`, PR #89)
| Commit | What |
|---|---|
| `6b91555cbd` | Facility schema truth + provenance (`src/lib/seo/facilityTruth.mjs` shared by `generate-facility-profiles-html.mjs` and `SEO.tsx`/`CenterProfile.tsx`); Organization/MedicalWebPage schema corrected; 7 unit tests |
| `0078190e0e` | Migration `20261123000100_seo_recovery_clear_bulk_medical_review_stamps.sql` (backup + clear the bulk "medically reviewed" stamp); Authors copy |
| `b0c8f25f74` | `/rehab-centers` 301 → `/locations` (was → noindexed `/search-results`); crawler `/locations` hub generator; robots.txt unblocks retired 301 sources; stray `public/vercel.json` deleted |
| `d7b4495607` | `scripts/check-trust-claims.mjs` blocking guard in `build:vercel`, `validate:blocking` and the SEO Validators workflow |
| `15d4a0339c` | Source copy corrections (React, data configs, generator templates) plus two crash fixes (`<Search />` without import in `About.tsx` and `MidArticleCTA.tsx`) |
| `3eb81a5210` | Same rules applied to the committed prerendered corpus (32,664 files), plus `/locations` breadcrumb links |

### Data change (production database)
* Applied `seo_recovery_clear_bulk_medical_review_stamps` on 2026-11-23, Supabase project `mldbxpntzcjalgjmwnqa`, via MCP `apply_migration`.
* **Backup:** `seo_recovery_backup.blog_articles_medical_review_20261123` (40 rows) and `seo_recovery_backup.blog_authors_20261123` (1 row). The schema is RLS-enabled, with privileges revoked from anon/authenticated.
* **Verified after applying:** 40 rows backed up; 0 articles still carry `medical_reviewer_id` / `last_medically_reviewed_at`; the author row reads "RehabLookup Health Content Team" with credentials NULL.
* **Rollback:** SQL in the migration header.
* This change is live immediately, with no deploy needed: the SPA reads these columns at runtime, so the "Medically reviewed by" bylines and article `reviewedBy` schema disappear now.

### Validation
* `vitest run`: 61 files, 1,103 tests passed, including the new `facilityTruth` tests and an updated `directoryArticleOverride` expectation.
* `tsc -p tsconfig.app.json`: 121 errors, against 123 on `main`. All are pre-existing; the two removed were real `<Search />` crashes. No new errors in changed files.
* ESLint on all changed files: 0 errors.
* `check:trust-claims`: clean on the committed tree (46,670 public files, 1,109 source files).
* Production-equivalent `prebuild:vercel` + `build:vercel` in a throwaway worktree of the branch, against the live database (read-only): **exit 0.** The post-generation `check:trust-claims` covered 50,466 public files, 3,796 facility JSON-LD nodes and 1,109 source files, all clean. `check-redirect-targets`: 0 dead targets. `/locations` rendered with 1,824 words and 1,170 links.
* Crawler/visitor parity on that build (`tools/render_parity.mjs`; local reproduction, not production): results in `ADR-001-single-document-rendering.md`. `/locations` titles, H1 and canonical now match; other templates still diverge (Phase 3).
* **Not verified:** production HTTP responses. Every request from this environment receives the Vercel Security Checkpoint (unclassified automation), so live checks must come from GSC URL Inspection or an allowlisted network.

### Documents added or updated in Phase 1
* New: `SEO_ROOT_CAUSE_INVESTIGATION.md`, `SEO_SAMHSA_IMPORT_PLAN.md`, `SEO_SAMHSA_VALIDATION_APPENDIX.md`, `SEO_REMOVAL_PLAN.md`, `ADR-001-single-document-rendering.md`, `tools/reassess_decisions.py`, `tools/render_parity.mjs`.
* Replaced: `SEO_PAGE_DECISIONS.csv` (adds `phase1_class`, `destination_check`, `evidence_gaps`; still every destructive row `PENDING_OWNER_APPROVAL`).
* Updated: master audit (status per finding, F-26–F-29), baseline (count reconciliation, revised §7), handoff, content roadmap, monitoring plan.

### Known issues / not done in this batch
* The paid landing pages `/ads/:slug` and `/lp/convert` still collect leads for a flow that has no concierge behind it. False claims were removed, but whether to keep them is a **product decision**.
* `/insurance-verification` is live and noindexed, and still promises an "admissions team" check. **Product decision.**
* Seeker-facing edge-function emails (`send-concierge-notifications`, `send-tour-notifications`, `placement-monitor`) still link to retired `/account/*` URLs. They are not redeployed in this batch (backend scope).
* The CEO article override still claims "65,000 users we served in April". It is flagged for editorial review.
* The 40 previously "reviewed" articles are now shown as unreviewed, pending real clinical review.
* gtag is still injected into crawler-only HTML (F-15); the live `sitemap-facilities` function may still differ from source (F-14). Both are batch 2.
* Firewall denies Applebot and AI search crawlers (F-26): owner decision.

---

## 2026-11-22 · Phase 0 (Baseline and system discovery) · documentation only

**Production code, routes, redirects, sitemaps, templates and data: NO CHANGES.**

### Added
* `docs/seo-recovery/`:
  * `SEO_MASTER_AUDIT.md`
  * `SEO_PERFORMANCE_BASELINE.md`
  * `SEO_URL_INVENTORY.csv` (50,607 rows)
  * `SEO_PAGE_DECISIONS.csv` (50,607 rows; every destructive row `PENDING_OWNER_APPROVAL`)
  * `SEO_KEYWORD_MAP.csv` (308 clusters)
  * `SEO_CONTENT_ROADMAP.md`
  * `SEO_MONITORING_PLAN.md`
  * `SEO_PHASE_HANDOFF.md`
  * this log
* `docs/seo-recovery/data/gsc-2026-11-22/`: CSV conversions of the GSC exports supplied on 2026-11-22 (Performance, Generative AI features, Page indexing, Indexed list).
* `docs/seo-recovery/data/ga4-2026-11-22/`: the GA4 Reports snapshot as supplied.
* `docs/seo-recovery/tools/`: reproducible analysis scripts (Python 3 stdlib only; no repo dependencies). See `tools/README.md`.

### How the evidence was produced
* **Production-equivalent build:** in a throwaway git worktree of `main@f31fd7dbf6`, ran the `build:vercel` generator steps against the live Supabase project, read-only via the anon key: `generate:seo-html`, `generate:county-pages`, `generate:missing-html`, `generate:gsc-recovery-html`, `generate:facility-profiles-html`, `generate:resources-html`, `generate:all-missing-html` (**failed locally: `xml2js` not installed; not a site defect**), `generate:remaining-nearme`, `generate:missing-nearme`, `sync:prerendered-shell`, `patch:og-image`, `backfill:ga-snippet`, `inject:city-inventory`, `inline:directory-stats`, `generate:sitemaps`, `generate:prerender-manifest`. Result: 50,380 prerendered routes; sitemaps 30,793 + 233 + 3,796. The worktree was discarded and nothing was committed from it.
* **Committed-corpus scan:** 46,668 files. `scripts/check-content-uniqueness.mjs` (from unmerged commit `7782620896`) was run read-only: 97.1% duplicate bodies, 98.7% thin.
* **Read-only SQL** against Supabase `mldbxpntzcjalgjmwnqa` (facility counts, child-table coverage, staged SAMHSA facets).
* **Vercel API:** project, domains, deployments, audit events. Firewall config read was denied.
* **Live HTTP:** blocked by the Vercel Security Checkpoint (429) for every request from this environment.

### Known issues / limits recorded
* No live HTTP verification was possible (F-06).
* GSC Pages and Queries exports are 16-month totals capped at 1,000 rows, about 99% from before the collapse.
* GA4 has no key events; it is only available as the snapshot.
* Backlink data unavailable.
