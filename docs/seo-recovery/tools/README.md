# SEO recovery analysis tools

These scripts use only the Python 3 standard library (`xlsx_to_csv.py` also needs `openpyxl`). They read files and write CSV/JSON; they never modify the site. Run them with `python3 -I`.

## Reproduce the Phase 0 numbers

```bash
# 1. Production-equivalent build in a throwaway worktree (does not touch your checkout)
git worktree add --detach ../rl-audit-build HEAD
cd ../rl-audit-build
export SUPABASE_URL=https://mldbxpntzcjalgjmwnqa.supabase.co
export SUPABASE_ANON_KEY=<public anon key>           # publishable; read-only
for s in generate:seo-html generate:county-pages generate:missing-html generate:gsc-recovery-html \
         generate:facility-profiles-html generate:resources-html generate:all-missing-html \
         generate:remaining-nearme generate:missing-nearme sync:prerendered-shell patch:og-image \
         backfill:ga-snippet inject:city-inventory inline:directory-stats generate:sitemaps \
         generate:prerender-manifest; do npm run "$s"; done     # needs `npm ci` first for xml2js
grep -o '<loc>https://rehablookup.com/center/[^<]*' public/sitemap-facilities.xml \
  | sed 's|<loc>https://rehablookup.com||' > /tmp/facility-paths.txt
cd -
```

```bash
# 2. Inventory (one row per URL, from every source)
python3 -I docs/seo-recovery/tools/build_inventory.py ../rl-audit-build \
  docs/seo-recovery/data/gsc-2026-11-22/Performance-on-Search__Pages.csv \
  docs/seo-recovery/data/gsc-2026-11-22/Coverage-Valid__Table.csv \
  /tmp/facility-paths.txt /tmp/inventory.csv
```

```bash
# 3. Crawler-visible internal link graph (inbound/outbound per page, orphans by category)
python3 -I docs/seo-recovery/tools/linkgraph.py ../rl-audit-build/public /tmp/inventory.csv /tmp/linkgraph.csv
```

```bash
# 4. Per-URL decisions (approval-gated proposals)
python3 -I docs/seo-recovery/tools/build_decisions.py /tmp/inventory.csv /tmp/linkgraph.csv /tmp/decisions.csv
```

```bash
# 5. Keyword clusters from GSC queries
python3 -I docs/seo-recovery/tools/build_keyword_map.py \
  docs/seo-recovery/data/gsc-2026-11-22/Performance-on-Search__Queries.csv /tmp/inventory.csv /tmp/keywords.csv
```

```bash
# 6. GSC performance by template family / query intent
python3 -I docs/seo-recovery/tools/gsc_analysis.py /tmp/inventory.csv \
  docs/seo-recovery/data/gsc-2026-11-22/Performance-on-Search__Pages.csv \
  docs/seo-recovery/data/gsc-2026-11-22/Performance-on-Search__Queries.csv
```

```bash
# 7. Clean up the throwaway worktree
git worktree remove --force ../rl-audit-build
```

`SEO_URL_INVENTORY.csv` also has `inbound_internal_links`, `outbound_internal_links` and `audit_status` columns, merged in from the link graph.

## Metric definitions
* **body_cluster / body_cluster_size:** SHA-1 of the page's visible body tokens after removing the page's own URL words, all state/place vocabulary and digits. This is the same method as the unmerged `scripts/check-content-uniqueness.mjs`. A cluster size greater than 1 means another page says the same thing about a different place.
* **thin_lt_300w:** fewer than 300 visible body words, including the shared header and footer.
* **facility_links:** distinct `/center/<slug>` hrefs in the page.
* **inbound_internal_links:** the number of other prerendered pages linking to this path. Crawler HTML carries no SPA bundle, so this is the link graph Googlebot sees.
* **category / template_family:** see `classify()` in `build_inventory.py`.

## Converting new GSC exports
`python3 -I tools/xlsx_to_csv.py <out_dir> <export1.xlsx> <export2.xlsx> …`, then save the output under `data/gsc-YYYY-MM-DD/`.
