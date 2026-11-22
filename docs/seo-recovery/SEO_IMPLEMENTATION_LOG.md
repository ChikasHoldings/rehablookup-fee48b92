# SEO Implementation Log — RehabLookup

Append-only log. Each entry records what changed, where, how it was tested, and known issues. Recommendations that have not been executed do **not** belong here; they go in `SEO_PHASE_HANDOFF.md`.

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
