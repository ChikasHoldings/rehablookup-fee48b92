# SEO Performance Baseline — RehabLookup

Phase 0 deliverable. Prepared 2026-11-22. Every number here comes from the exports listed under **Evidence used**. Where the evidence ends, this document says so and leaves the gap open. It does not fill gaps with estimates.

---

## 1. Evidence used

| Source | File (in `docs/seo-recovery/data/`) | Period | Notes |
|---|---|---|---|
| GSC Performance, Web search: daily chart, top 1,000 queries, top 1,000 pages, countries, devices, search appearance | `gsc-2026-11-22/Performance-on-Search__*.csv` | 2025-12-19 → 2026-11-20 ("Last 16 months"; the property has no data before 2025-12-19) | Both the query and page tables are capped at 1,000 rows. The search-appearance table is empty. |
| GSC Performance on Search Generative AI features | `gsc-2026-11-22/Performance-on-Search-Generative-AI-Features__*.csv` | 2026-05-18 → 2026-11-20 | 61 impressions in total. |
| GSC Page indexing (all known pages): chart and reasons | `gsc-2026-11-22/Coverage__*.csv` | 2026-08-27 → 2026-11-15 | The chart only reaches back about 3 months, so there are no index counts from before the collapse. |
| GSC Page indexing, Indexed list | `gsc-2026-11-22/Coverage-Valid__*.csv` | Same | 1,000-row sample of the 2,654 indexed URLs. |
| GA4 "Reports snapshot" | `ga4-2026-11-22/ga4-reports-snapshot-2026-01-01_2026-11-22.csv` | Tagged 2026-01-01 → 2026-11-22; data starts in ISO week 18 (around 2026-05-01) | Weekly users per channel, page titles, events. **No key events are configured.** |
| Vercel deployment history, domains and audit events | via Vercel API | Deployments since 2026-06-24 (retention); audit events since 2026-08-17 | The domain was attached to Vercel on 2026-05-02. |
| Git history, including the legacy branch `fix/prelaunch-seo-legal` | repo | To 2026-08-19 | `main` was re-rooted on 2026-06-20. The legacy branch keeps the 11,414 commits from before June. |

**Not provided or not accessible (open items, see §8):** the Manual Actions report, Security Issues, Crawl Stats, Sitemaps report, Core Web Vitals, URL Inspection samples, and GSC data split by date range per page or query. GA4 is only available as the snapshot; there is no landing-page, source/medium or event-parameter detail. No third-party rank or keyword-volume data was available.

---

## 2. Headline trend

| Period | Days | Clicks | Impressions | Impr./day | CTR | Avg position |
|---|---:|---:|---:|---:|---:|---:|
| Whole window before the collapse, 2025-12-19 → 2026-05-28 | 161 | 103 | 103,898 | 645 | 0.10% | 65.0 |
| Q1 2026, Jan 1 → Mar 31 | 90 | 28 | 54,892 | 610 | 0.05% | 73.2 |
| 4 weeks before the collapse, 2026-04-30 → 05-28 | 29 | 63 | 34,284 | **1,182** | 0.18% | 50.5 |
| Peak week, 2026-05-18 → 05-24 | 7 | 27 | 12,824 | 1,832 | 0.21% | 48.9 |
| 4 weeks after the collapse, 2026-05-29 → 06-25 | 28 | 3 | 493 | **17.6** | 0.61% | 51.2 |
| Whole window after the collapse, 2026-05-29 → 2026-11-20 | 176 | 13 | 1,424 | 8.1 | 0.91% | 44.9 |
| Last 28 days, 2026-10-24 → 11-20 | 28 | 0 | 113 | 4.0 | 0% | 50.5 |
| Previous 28 days, 2026-09-26 → 10-23 | 28 | 1 | 122 | 4.4 | 0.82% | 27.8 |
| Last 3 months, 2026-08-21 → 11-20 | 92 | 1 | 364 | 4.0 | 0.27% | 36.9 |
| Previous 3 months, 2026-05-22 → 08-20 | 91 | 27 | 12,900 | 141.8 | 0.21% | 52.2 |
| Year over year | — | — | — | — | — | **Not possible.** The property has no data before 2025-12-19. |

**Monthly totals (clicks / impressions):** Dec 2025 1/3,087 · Jan 7/14,039 · Feb 13/11,700 · Mar 8/29,153 · Apr 12/12,257 · **May 62/33,752** · Jun 3/458 · Jul 5/333 · Aug 4/224 · Sep 0/109 · Oct 1/118 · Nov (to the 20th) 0/92.

### 2.1 What the trend shows (verified)

1. **A single-day collapse on 2026-05-29.** Daily impressions were 1,253 on 2026-05-28 and **38** on 2026-05-29. They then stayed at 3–40 a day for the rest of the window. That is a 98.5% drop in impressions per day when comparing the 4 weeks on either side. Clicks fell from 63 to 3.
2. **The site was never strong.** Even at its peak it averaged position 49–65 and earned 116 clicks in 16 months. The highest week had 27 clicks. Recovery will be measured from a very low base. The aim is to build qualified visibility that the site never had, not to restore a prior level of traffic.
3. **98.6% of all impressions in the export period happened before 2026-05-29** (103,898 of 105,322). The Pages and Queries tables are 16-month totals, so they are effectively a snapshot of the site before the collapse. They cannot show which pages "lost the most" after May 29, because almost every page went to about zero.
4. **Indexing was not what collapsed on May 29.** On 2026-08-27 (the first day of indexing data), 12,730 URLs were indexed while impressions ran at about 5 a day. The pages stayed in the index and stopped being shown. **Verified for 2026-08-27 onward; no index data exists for May 29 itself.**
5. **A second, separate event: indexed URLs fell from 12,441 to 8,928 on 2026-09-18 and to 3,194 on 2026-09-21.** They then drifted down to 2,654 by 2026-11-15. Impressions barely changed because they were already near zero.

### 2.2 Device, country and AI features

* Devices over 16 months: Desktop 77,174 impressions / 34 clicks (CTR 0.04%); Mobile 27,938 / 81 (0.29%); Tablet 210 / 1. Desktop accounts for most impressions at a far lower CTR, which fits deep-page (position 60+) appearances.
* Countries: US 101,067 impressions / 114 clicks. Every other country is below 800 impressions.
* AI features (AI Overviews and similar): 61 impressions in total since 2026-05-18 (May 30, Jun 2, Jul 7, Aug 17, Sep 1, Oct 4, Nov 0). The top page is `/` with 19. **There is no meaningful AI-search visibility to baseline.**

---

## 3. Which page templates carried the visibility

GSC Pages export (top 1,000 pages, 16 months, almost entirely before the collapse) joined to the URL inventory. Rows are sorted by impressions. "wpos" is the impression-weighted average position.

| Template category | Pages in export | Clicks | Impressions | Share | wpos | URLs that exist (prod build) |
|---|---:|---:|---:|---:|---:|---:|
| state_hub `/rehab-centers/{state}` | 50 | 6 | 47,729 | **50.4%** | 75.5 | 50 |
| treatment_x_city `/treatment-types/{t}/{state}/{city}` | 160 | 16 | 7,766 | 8.2% | 61.7 | 210 |
| near_me_state `/{x}-near-me/{state}` | 148 | 9 | 7,069 | 7.5% | 73.6 | 2,900 |
| city_hub `/rehab-centers/{state}/{city}` | 92 | 2 | 5,642 | 6.0% | 75.2 | 1,096 |
| treatment_x_state | 119 | 14 | 5,038 | 5.3% | 72.5 | 700 |
| provider_guide `/provider-guides/*` | 42 | 6 | 3,664 | 3.9% | **37.1** | 254 |
| best_in_city `/best-rehab-centers-in-*` | 11 | 0 | 2,173 | 2.3% | 66.4 | 51 |
| insurance_carrier `/insurance/{carrier}` | 9 | 3 | 2,096 | 2.2% | 67.1 | 16 |
| resource_article | 31 | 0 | 1,841 | 1.9% | 44.6 | 116 |
| content_static | 26 | 9 | 1,818 | 1.9% | 35.5 | 172 |
| facility_profile `/center/*` | 96 | **19** | 1,637 | 1.7% | **21.5** | 3,796 |
| county_hub | 6 | 0 | 1,230 | 1.3% | 14.3* | 621 |
| near_me_county | 29 | 5 | 1,180 | 1.2% | 34.2 | 7,123 |
| state_article | 20 | 4 | 859 | 0.9% | 28.0 | 150 |
| specialty_x_state | 19 | 4 | 644 | 0.7% | 34.2 | 2,150 |
| insurance_x_county | 27 | 2 | 621 | 0.7% | 45.7 | 6,704 |
| city_combo `/{prefix}-in-{city}` | 14 | 0 | 334 | 0.4% | 53.3 | 13,834 |
| provider_marketing (all depths) | 39 | 0 | 748 | 0.8% | ~57 | 6,704 |
| home `/` | 1 | 17 | 151 | 0.2% | 2.6 | 1 |
| everything else | — | — | ~2,300 | ~2.5% | — | — |

\*Wayne County, MI took 1,112 of those impressions at position 10.4, from the query "alc wayne county mi list". That query is almost certainly looking for *Adult Licensed Care* facilities (assisted living), not addiction treatment. **It is an intent mismatch, not an opportunity.**

**The page export's last row has 11 impressions.** So any URL outside the export earned **11 or fewer impressions in 16 months.** The roughly 10,600 impressions not covered by the export are spread across URLs below that threshold.

### 3.1 What the template distribution shows (verified)

* **About 40,000 long-tail programmatic URLs produced under 4% of impressions and about 12 clicks in 16 months, before and after the collapse.** These are city combos, county near-me, county insurance, provider marketing, county×service and specialty×state pages.
* **State hubs are the main demand surface.** They earned half of all impressions on head terms ("rehab in colorado", "rehabs in maryland", "drug rehab new hampshire") but only at positions 60–90. In the production build a state hub shows about 12 facilities and about 480 words (New Hampshire: 12 of the 15 facilities in the catalogue).
* **Facility profiles are the most efficient pages.** They average position 21.5 and earned 19 clicks from 1,637 impressions, mostly navigational facility-name queries.
* **Provider (B2B) guides rank better than consumer pages.** They average position 37, e.g. "rehab marketing" (1,161 impressions, position 49.8) and "improve inquiry to admission conversion rate treatment center" (position 6.1).

---

## 4. Query baseline (top 1,000 queries; 58% of impressions, 9 of about 116 clicks)

The query table covers only 61,497 of 105,322 impressions and 9 clicks. The rest are anonymized (privacy-filtered) queries. Treat the query view as directional.

| Intent (rule-based) | Queries | Clicks | Impressions | wpos |
|---|---:|---:|---:|---:|
| Local, generic ("rehabs in {state}") | 294 | 1 | 27,338 | 69.1 |
| Substance + location | 214 | 0 | 12,097 | 78.9 |
| Level of care (detox / IOP / inpatient / …) | 235 | 4 | 9,333 | 69.2 |
| Other navigational | 144 | 3 | 7,993 | 69.1 |
| Cost / insurance | 69 | 1 | 2,950 | 58.5 |
| B2B provider | 39 | 0 | 1,513 | 48.4 |
| Informational | 5 | 0 | 273 | 73.5 |

The clustered opportunity list (308 clusters, with destinations) is in `SEO_KEYWORD_MAP.csv`.

---

## 5. Index coverage baseline (GSC, 2026-11-15)

**Indexed: 2,654. Not indexed: 39,107** (all known pages).

| Reason | Source | Pages |
|---|---|---:|
| Discovered – currently not indexed | Google systems | 21,337 |
| Crawled – currently not indexed | Google systems | 14,130 |
| Not found (404) | Website | 1,268 |
| Page with redirect | Website | 1,164 |
| Duplicate without user-selected canonical | Website | 704 |
| Alternate page with proper canonical tag | Website | 385 |
| Soft 404 | Website | 104 |
| Duplicate, Google chose different canonical | Google systems | 6 |
| Blocked by robots.txt | Website | 4 |
| Blocked due to other 4xx issue | Website | 3 |
| Excluded by noindex | Website | 2 |

**Reading this:** 35,467 URLs (90.7% of the non-indexed total) were *not chosen* by Google. They are in the "Discovered" and "Crawled – currently not indexed" buckets. That is how Google reports pages it judges not worth indexing, and it matches the corpus measurements in `SEO_MASTER_AUDIT.md` F-02 (89% duplicate bodies, 91% under 300 words). **No "Server error (5xx)" row is present.** That is evidence against systematic crawl failures, but it is not conclusive for the firewall question (F-06).

The **indexed sample** (1,000 of 2,654, last crawled 2026-10-01 → 2026-11-16) is made up of center/* 427, insurance/*/* 110, rehab-marketing/*/* 73, rehab-centers/*/* 69, treatment-types/*/* 25 and assorted others. 388 of the 427 indexed facility URLs are still in the live facility sitemap. The other 39 no longer exist and return 404 to crawlers.

---

## 6. GA4 baseline (snapshot; low reliability)

* GA4 data starts around **2026-05-01** (ISO week 18), about when the Vercel cutover happened. **GA4 has no data from before the decline in Q1 2026.**
* Weekly organic users peaked at **45** (week 20, May 11–17). They were 1 in week 22 (May 25–31) and 0–10 through week 34. **They rose to 29–44 a week in weeks 35–38 (late Aug – Sep 20) while GSC showed 0 clicks.** That traffic must have come from non-Google engines or been misattributed. The snapshot cannot break organic down by source, so this is **unexplained** (see §8).
* 16-month channel totals: Direct 1,034 sessions, Organic Search 508, Referral 248, "Organic Shopping" 39 (anomalous for a non-commerce site, so a likely misclassification), Organic Social 13, AI Assistant 5.
* **Key events: none configured.** Raw event counts for the whole period: `facility_view` 222, `form_start` 186, `facility_contact` **20**, `click` 28, `view_search_results` **1**. Provider signup and facility-claim events do not appear at all.
* Page titles with views that point to tracking or UX defects: "Content Temporarily Unavailable" 280, "Loading Article…" 72, "Treatment Center Not Found" 16, "Sign In" 90. The GA tag is also embedded in the crawler-only prerendered HTML (50,380 files), which humans never receive.
* Country mix (Active users): US 836, CN 85, SG 53, PL 36, DE 35. The non-US share is high for a US directory and suggests bot traffic in Direct.

**Conclusion:** GA4 cannot currently support business decisions about SEO. It has no key events, attribution is unclear, and the history is short. Fixing measurement is part of Phase 1 (see `SEO_MONITORING_PLAN.md`).

---

## 7. Diagnosis of the decline

| Candidate cause | Verdict | Evidence |
|---|---|---|
| Deindexing on May 29 | **Ruled out as the primary cause** (for data from Aug 27 on) | 12,730 URLs were indexed on Aug 27 while impressions ran at about 5 a day. |
| Fewer eligible URLs | Not the cause of May 29 | The sitemap held 43–46k URLs from May 14 to Jun 20. The large URL additions (31k on May 2, 46k on May 14) came *before* the peak. |
| CTR deterioration | Not the cause | CTR went *up* after the collapse (0.18% → 0.61%) because the few remaining impressions are long-tail queries. |
| Tracking problem | Ruled out for GSC | The drop shows in GSC's own impression counts. |
| Change in search demand | Ruled out | A 98.5% one-day drop does not match seasonality. |
| Code deployment that changed rendering for Google | **Not supported by evidence** | No commits landed on 2026-05-28. The 2026-05-29 commits (canonical, robots, Facebook Pixel removal, llms.txt) went in on the evening of May 28, Pacific time. A same-day 97% drop would need Google to reprocess the whole site within hours, which a crawl-based change cannot do. The 2026-05-25 middleware change (crawler/human split for `/center` and `/resources`) is a contributing risk, not a proven trigger. |
| **Site-level quality reassessment during the Google May 2026 core update** (rollout May 21 → Jun 2) | **Leading hypothesis (not verified)** | The collapse falls inside the rollout window. The site profile fits what a core update reassesses: a 6-month-old domain, 46k programmatic pages, 3.8k real listings, and a 97% templated corpus. Pages stayed indexed but stopped being shown. This is a correlation. Google publishes no per-site attribution. |
| **Manual action** (e.g. scaled content abuse, thin content, cloaking, structured-data misuse) | **Open; it must be checked first** | It would explain an abrupt, site-wide, indexed-but-not-shown pattern equally well. **The Manual Actions report was not provided.** |
| **Vercel firewall challenge** (config published 2026-09-06) | **Hypothesis for the Sept 18–21 index drop**, not for May 29 | Timing: firewall published Sept 6, index fell by 74% on Sept 18–21, and there were no deployments in between. Counter-evidence: Google still crawled indexed URLs through 2026-11-16, and no 5xx bucket appears. |
| Competitor improvement | Not assessable | No rank-tracking data. |

**Summary:** RehabLookup lost almost all search visibility on **2026-05-29** while staying indexed. That is the signature of a site-wide quality or spam judgement, not a technical break. Every available piece of evidence points to the same underlying weakness: a very large set of templated, thin, data-unsupported pages around a small real catalogue. Two technical risks are layered on top: crawler/human divergence and fabricated structured data. The September index loss is a separate event, and the Vercel firewall timing must be checked.

---

## 8. Open measurement items (to close in Phase 1)

1. GSC **Manual actions** and **Security issues**: screenshot or export. *This is the single most important missing input.*
2. GSC **Crawl stats**: host status, response-code breakdown (look for 429), and file-type breakdown for Aug–Nov 2026.
3. GSC **URL Inspection → Test live URL** on `/`, `/rehab-centers/colorado`, one `/center/*` and one `/provider-guides/*`. This confirms whether Googlebot gets past the Vercel checkpoint.
4. GSC **Sitemaps** report: submitted and discovered counts per sitemap, and errors.
5. GSC Performance with a **date comparison** (Apr 30–May 28 vs May 29–Jun 26), exported by **Pages** and by **Queries**. This splits losses by URL instead of using the 16-month totals.
6. GA4: Traffic acquisition (session source/medium) by week, Landing page + organic filter, and the event list with parameters, so the late-August organic users can be explained.
7. GSC **Core Web Vitals** report (mobile and desktop).
8. Bing Webmaster Tools data, if a property exists. Bing would explain the GA4 organic traffic without GSC clicks.
