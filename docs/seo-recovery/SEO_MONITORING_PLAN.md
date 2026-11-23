# SEO Monitoring Plan — RehabLookup

Phase 0 draft, 2026-11-22. This plan says what to measure, when, where, and the thresholds that trigger action. Baseline values come from `SEO_PERFORMANCE_BASELINE.md`.

---

## 1. Baseline values to beat (as of 2026-11-20)

| Metric | Baseline | Source |
|---|---|---|
| GSC impressions per day (28-day average) | 4.0 | GSC Performance |
| GSC clicks per 28 days | 0 | GSC Performance |
| Indexed pages | 2,654 (2026-11-15) | GSC Page indexing |
| Not indexed: Crawled / Discovered | 14,130 / 21,337 | GSC Page indexing |
| URLs in the production sitemaps | 34,822 (30,706 zero-inventory templates) | build output |
| Facility profiles with ≥3 crawler-visible inbound links | needs measuring; 1,734 of 3,796 currently have 0 | `tools/linkgraph.py` |
| GA4 key events | none configured | GA4 |
| AI-feature impressions (GSC) | 0 in Nov 2026 | GSC |

Recovery is measured against these values, not against the May 2026 peak, which may have depended on pages that are being retired.

---

## 2. Measurement fixes required first (Phase 1)

**Status 2026-11-23:** none of items 1–6 are done; items 1, 2, 5 and 6 need the owner's GA4/GSC/Bing access, and item 3 is in Phase 1 batch 2. New in Phase 1: Vercel observability (`vercel.request.count` grouped by `bot_name`, `waf_action`, `http_status`) gives a weekly check that verified Googlebot gets 200s; retention is about 36 days, so export it weekly.

1. **GA4 key events:** `facility_contact` (phone/email click), `inquiry_submit`, `outbound_website_click`, `provider_signup_complete`, `claim_submit`, `compare_add`. Mark the first four as key events.
2. Link **GSC ↔ GA4**. Create an "Organic Search – Google" exploration segmented by landing-page template, using URL patterns from `SEO_URL_INVENTORY.csv` → `template_family`.
3. Remove the gtag snippet from crawler-only prerendered HTML so crawlers that execute JS don't pollute GA4.
4. Fix the SPA document titles for loading and error states so they don't show up as content ("Loading Article…", "Content Temporarily Unavailable").
5. Add **Bing Webmaster Tools** if it isn't set up.
6. Set up rank tracking (any tool) for about 50 representative queries from `SEO_KEYWORD_MAP.csv` P1 clusters.

---

## 3. Reporting cadence

| Cadence | What | Owner |
|---|---|---|
| **Daily for 14 days after each deploy batch** | GSC Page indexing (Not found, Server errors, Soft 404, Redirect errors); Vercel runtime errors; sampled HTTP checks (`npm run validate:vercel-deploy -- --sample 100` from an allowed network) | Engineering |
| **Weekly** | GSC Performance: clicks, impressions, CTR, position, total and per template family (filter by URL prefix); index coverage counts; Crawl Stats (host status, response mix: **watch 429/5xx**); sitemap processed counts; GA4 organic sessions and key events | SEO |
| **Monthly** | Template-family scorecard (below); keyword cluster movement; new-page batch review (T+28 indexation); a re-run of `tools/build_inventory.py` + `tools/linkgraph.py` on a fresh build | SEO and Engineering |
| **Quarterly** | Content and medical review backlog; facility data freshness (SAMHSA re-scrape date); comparison with the Google Search Status Dashboard update history | Editorial and Data |

### Template-family scorecard (monthly)
For each retained family: URLs live, URLs in the sitemap, % indexed (GSC URL-prefix filter, or sitemap-level indexing if sitemaps are split per family), impressions, clicks, CTR, average position, key events, median facility links per page, and the number of orphans.

**Recommendation:** split sitemaps by family (`sitemap-facilities.xml`, `sitemap-states.xml`, `sitemap-locations.xml`, `sitemap-guides.xml`, …) so GSC reports indexation per family.

---

## 4. Alert thresholds

| Signal | Threshold | Action |
|---|---|---|
| Crawl Stats: 429 or 5xx share | > 2% of Googlebot requests in any day | Check the Vercel firewall and runtime errors immediately |
| Indexed pages (retained families) | drop > 15% week over week | Inspect a sample with URL Inspection; check canonical, robots, status, rendering |
| "Server error (5xx)" or "Blocked due to other 4xx" | appears or exceeds 50 URLs | Same as above |
| Soft 404 count | rises > 100 after a removal wave | Confirm retired patterns return real 410 to humans **and** crawlers |
| "Page with redirect" for URLs in the sitemap | > 0 | The sitemap generator is admitting redirect sources; fix it |
| Sitemap URL with 0 facility links (non-editorial family) | > 0 after Phase 3 | The generator threshold has regressed |
| Duplicate-body share (tools/check-content-uniqueness on the build) | > 5% of retained pages | Block the deploy (CI gate) |
| Facility schema with hard-coded attributes | any | Block the deploy (CI gate, batch 1) |
| Banned trust/retired-service phrase, or a `/center/*` JSON-LD node with an unsupported attribute | any | **Implemented:** `check:trust-claims` fails `build:vercel`, `validate:blocking` and the SEO Validators workflow |
| Vercel logs: `googlebot` or `bingbot` with `waf_action` ≠ allow, or status 403/429 | any | Check the firewall rule immediately (F-06/F-26) |
| Crawler vs visitor parity (title, H1, canonical, word count ±15%) on a sample of each retained template | any mismatch after ADR-001 ships | Block the deploy (`tools/render_parity.mjs` as a CI step) |
| Clicks or impressions for a retained family | −30% over 28 days vs the prior 28 days | Template review |

---

## 5. Post-deployment validation checklist (every batch)

1. Build passes, including `npm run test`, `check:trust-claims`, `validate:seo-schema`, `check:structured-data`, `check:unique-meta`, `check:canonical-ga`, `check:redirect-targets`, `check:internal-links`, `check:public-directory-truth`.
2. Re-run the inventory and link-graph tools on the build output. Diff against the previous run: retained URL count, orphans, thin and duplicate share, sitemap size.
3. Sample at least 30 URLs per changed family from an allowed network (this cloud environment is challenged by the Vercel checkpoint and is **not** an allowed network; use GSC URL Inspection or an allowlisted IP), as Googlebot UA **and** browser UA: status, canonical, robots, title, H1, JSON-LD validity (Rich Results Test or schema validator), and the main-content parity between the two UAs.
4. For removal waves: every retired URL returns 410 (or its 301 target returns 200 and is indexable, single hop). The URL is absent from all sitemaps and from all internal links. The SPA no longer renders it for humans.
5. Resubmit sitemaps in GSC. Use URL Inspection "Request indexing" on 10 key URLs (state hubs, `/rehab-centers`, top facility profiles).
6. Log the results in `SEO_IMPLEMENTATION_LOG.md`.

---

## 6. Expectations (not promises)

* There is no guaranteed timeline. If F-01 is a manual action, recovery starts only after a successful reconsideration request. If it is an algorithmic quality reassessment, improvement usually shows up only after Google re-crawls and re-evaluates the site, often around a later core update, and only if the site has substantively improved.
* Early signals worth watching: Googlebot crawl share shifting toward retained families; the indexed share of the retained set rising; impressions returning first on facility-name and long-tail state queries.
