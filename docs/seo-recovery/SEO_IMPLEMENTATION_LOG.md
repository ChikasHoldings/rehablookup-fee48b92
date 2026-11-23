# SEO Implementation Log — RehabLookup

Append-only log. Each entry records what changed, where, how it was tested, and known issues. Recommendations that have not been executed do **not** belong here; they go in `SEO_PHASE_HANDOFF.md`.

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
