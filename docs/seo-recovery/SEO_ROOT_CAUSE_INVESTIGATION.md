# Root-Cause Investigation: May 29 and September 18–21, 2026

Phase 1, 2026-11-23. The two incidents are treated as **separate** unless evidence links them. "Confirmed" means observed in data. "Ruled out" means contradicted by data. "Uncertain" means the evidence that would decide it is not available to this session; the exact test or report needed from the owner is named.

Interpretation follows Google's documentation:

* [Debugging drops in Google Search traffic](https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops) — causes: technical issues, security issues, manual actions, algorithmic updates, changes in search interest.
* [HTTP status codes and network errors](https://developers.google.com/search/docs/crawling-indexing/http-network-errors) — 429 is treated as a server error; persistent 429/503 for more than about 2 days drops URLs from the index.

---

## Incident 1: impressions fell 98.5% on 2026-05-29

### Facts (verified)
* GSC daily impressions: 1,253 on 05-28, then 38 on 05-29, then 3–40 a day afterwards. Clicks went from 63 to 3 over the 4 weeks either side.
* Indexed pages stayed in the index: 12,730 were indexed on 2026-08-27, the earliest index data available, while impressions ran at about 5 a day.
* Average position for the few remaining impressions improved (≈ 45). The losses were concentrated in what used to rank, not a uniform slide.
* The site had been online in its current form for under a month. Vercel serving began 2026-05-02, the sitemap grew from 31k URLs on 05-02 to 46k on 05-14, and impressions *rose* through May to a peak in the week of 05-18.
* Google's May 2026 core update ran 2026-05-21 → 2026-06-02 ([Search Engine Journal](https://www.searchenginejournal.com/google-begins-rolling-out-may-2026-core-update/575589/)).

### Candidate causes

| Cause | Verdict | Evidence |
|---|---|---|
| Accidental noindex / robots block | **Ruled out** for the collapse | 12.7k pages were still indexed in August. The robots.txt changes on 05-29 *removed* a Disallow; they added none. |
| Canonical change | **Ruled out as a same-day trigger** | The 05-29 commit `42bf41cf73` *removed* a homepage-fixed canonical from `index.html`. Before that, SPA-shell responses carried the homepage canonical. That predates the peak and was being fixed, not introduced. |
| Rendering failure / server errors | **Not supported** | No deployment-time evidence: the Vercel deployment list only reaches back to 2026-06-24. GSC shows no "Server error (5xx)" bucket. |
| Mass URL / redirect change | **Contributing, not the trigger** | On 2026-05-23 (`8ac061b9e6`, `5b14a77937`), about 3,200 city-combo URLs and the bare `/rehab-centers` started 301ing to the noindexed `/search-results`. Impressions stayed at 1,250–1,780 a day for the next five days, so this does not explain a single-day cliff. It did discard any equity those URLs held. |
| Crawler/human split (`middleware.ts`) | **Standing risk, not proven trigger** | Since early May every non-facility route served crawlers different HTML from humans; on 05-25 this was extended to `/center` and `/resources`. A 4-day lag to a sitewide cliff is not a known crawl pattern. |
| Low-value programmatic content at scale | **Confirmed condition** | 89% duplicate bodies, 91% thin, 90.6% with no facility link (production-equivalent build, `SEO_MASTER_AUDIT.md` F-02). |
| Fabricated structured data / trust signals | **Confirmed condition** (now fixed) | F-04 / F-05. |
| Algorithmic reassessment during the core update | **Uncertain (consistent with all evidence)** | The timing falls inside the rollout, and the pages stayed indexed but stopped ranking. Google publishes no per-site attribution, so this cannot be confirmed from data. |
| Manual action | **Uncertain (not checked)** | It would fit equally well. **Required from the owner:** GSC → Security & Manual Actions → *Manual actions* (screenshot, or "No issues detected"). |
| Security issue (hacked content, malware) | **Uncertain (not checked)** | **Required:** GSC → Security & Manual Actions → *Security issues*. |
| Change in search demand | **Ruled out** | A 98.5% one-day drop is not seasonal. |
| Analytics / reporting artefact | **Ruled out for GSC** | The drop is in GSC's own impression counts. GA4 only starts around 2026-05-01. |

### Owner input (2026-11-23): "we switched the Google Analytics tag, removed the old one and added a new one"

Checked against the repository history (legacy branch `fix/prelaunch-seo-legal`) and Vercel:

| Fact | Evidence |
|---|---|
| The GA switch happened on **2026-05-09**, not May 29 | `69d4454700` "remove Google Analytics completely from platform" (05-09 04:31 UTC), then `7e74f858b7` "GA Cleanup: Replace old G-2VB6C1X2MQ with new G-MM5K8398LY" (05-09 08:45 UTC) across `index.html` and 3,913 prerendered pages; `40ef82607c` (05-14) centralized the ID. No analytics change is in the May 26–31 history. |
| Impressions **rose** after the switch | GSC: about 645/day before May, rising to the 1,832/day peak in the week of 05-18. A tag change on 05-09 cannot explain a cliff on 05-29. |
| No host or property change | `www` → apex 301 was configured 2026-05-07 (Vercel domain record). Every URL in the GSC exports is on `https://rehablookup.com`, and the same property shows 1,253 impressions on 05-28 and 38 on 05-29, so the drop is not data moving to another property. |
| Analytics tags do not affect Google Search | Google does not use GA to crawl, index or rank pages. Removing or replacing a GA tag changes what GA reports, not what Search shows, so it cannot move GSC impressions. |

**Verdict: ruled out as the cause of May 29.** What the GA history does explain:
* **GA4 data discontinuity.** The new property starts in early May, so GA cannot be compared with GSC before then.
* **Inflated GA numbers.** From May 9 the GA tag was also on ~45,000 prerendered pages that are served only to crawlers. Any crawler that runs JavaScript was recorded as a "user". This is the most likely source of the "65,000 users / 1,000+ concurrent users" April–May figures published in two Platform News articles, which do not match ~600 GSC impressions and ~1 click a day. Both articles were corrected, and GA was removed from crawler-only HTML on 2026-11-23.

**Conclusion:** the collapse is **not explained by any technical change found in the code or infrastructure history.** The evidence fits a quality-driven loss of ranking (algorithmic or manual) acting on a corpus that is overwhelmingly templated. This is a well-supported hypothesis, not a confirmed cause. Two owner-side checks decide between algorithmic and manual: the Manual Actions and Security Issues reports.

**Discriminating test the owner can run (10 minutes):** GSC → Performance → Search results → Compare *Apr 30–May 28* vs *May 29–Jun 26* → Pages tab → export.
* If state hubs, facility profiles **and** the programmatic families all fell together, the cause is sitewide (algorithmic or manual).
* If only some families fell, the cause is template-specific.

The 16-month export supplied cannot separate this, because 98.6% of its impressions predate the collapse.

---

## Incident 2: indexed pages fell from 12,441 to 3,194 on 2026-09-18 → 21

### Facts (verified)
* GSC Page indexing: 12,441 on 09-17, 8,928 on 09-18, 3,194 on 09-21, then a slow drift to 2,654 by 11-15. Impressions barely moved (about 5 a day before and after), because they were already near zero.
* The last production deployment was 2026-08-19 (`f31fd7d`, PR #86). It reduced the production sitemap from about 43k to about 34.8k URLs, dropping city hubs and combos without exact-match listings. It also stopped showing statewide fallback listings on city pages, leaving 612 city hubs with no facilities.
* Vercel audit log: the project's **first** firewall configuration was modified and published twice on **2026-09-06 02:12 UTC**. There were no firewall changes after that, through the end of the log.
* **New in Phase 1 — Vercel request logs (observability, 2026-11-16 → 11-23):**

  | Bot (Vercel-classified) | Firewall action | Status | Requests (7 days) |
  |---|---|---|---:|
  | googlebot | allow | 200 | 1,024 |
  | bingbot | allow | 200 / 304 | 1,730 |
  | yandexbot | allow | 200 | 2,802 |
  | applebot | **deny** | 403 | 78 |
  | googleother | **deny** | 403 | 11 |
  | gptbot, oai-searchbot, chatgpt-user, perplexitybot, duckassistbot, meta-webindexer | **deny** | 403 | 85 |
  | (unclassified traffic) | **challenge** | 429 | 4,502 |

  Vercel's documentation says Bot Protection excludes verified bots such as Googlebot, and that the AI Bots ruleset can deny AI crawlers ([Bot Management](https://vercel.com/docs/bot-management), [Managed rulesets](https://vercel.com/docs/vercel-firewall/vercel-waf/managed-rulesets)). The logs match that configuration. **The 429 seen by this audit environment was the challenge for unclassified automation. It is not what verified Googlebot receives.**

### Candidate causes

| Cause | Verdict | Evidence |
|---|---|---|
| Firewall blocked or challenged Googlebot | **Unlikely** | Googlebot is allowed with 200s in the only window with request logs (Nov 16–23). The configuration has not changed since Sept 6. Indexed URLs kept being recrawled through 11-16, and there is no 5xx bucket. Remaining gap: September itself is outside the 36-day log retention. |
| Google dropping low-value pages after the Aug 19 release (sitemap cut by about 8.4k URLs; 612 city hubs now empty) and its normal quality re-evaluation | **Likely contributor (hypothesis)** | Timing (about 4 weeks after the release, typical recrawl latency) and the content of the dropped families. It cannot be confirmed without the GSC "Indexed" list from before September. |
| Google spam update | **Ruled out for 09-18** | The September 2026 spam update started 09-24 ([Search Engine Land](https://searchengineland.com/google-releases-september-2026-spam-update-491267)), after the drop. |
| GSC reporting recalculation | **Possible** | Page-indexing counts update in batches, so the 09-18 and 09-21 steps may be report refresh dates rather than crawl dates. |

### Related firewall finding (new, action recommended)
The firewall **denies Applebot** (Apple Search, Spotlight and Siri), **GoogleOther**, and the AI search and assistant crawlers (**OAI-SearchBot, ChatGPT-User, PerplexityBot**). This blocks the site from ChatGPT search and Perplexity citations, which conflicts with business goal 13 (AI-assisted search visibility). It is a business decision. The recommendation is to allow at least Applebot, OAI-SearchBot, ChatGPT-User and PerplexityBot, and to keep training crawlers (GPTBot etc.) denied if desired. The change is made in Vercel → Firewall → AI Bots ruleset, set per category.

### Required from the owner for Incident 2
1. GSC → Settings → **Crawl stats** for Aug–Nov: response breakdown, looking for 429/403/5xx, and host status.
2. GSC → URL Inspection → **Test live URL** on `/`, `/locations`, `/rehab-centers/colorado`, one `/center/*` and one `/provider-guides/*` page. This is the only way to see exactly what verified Googlebot receives.
3. Vercel → Firewall → screenshot of the rules published 2026-09-06, to confirm the logs above.

---

## What Phase 1 changed in response

* The sitewide condition (fabricated schema, trust claims, retired-service copy) is fixed. The `check:trust-claims` guard blocks it from returning.
* The directory now has an indexable hub (`/locations`, which `/rehab-centers` now 301s to).
* The programmatic families are **not** removed yet. They await owner approval (`SEO_REMOVAL_PLAN.md`).
* No recovery timeline is implied. If Incident 1 was algorithmic, improvement is normally seen only after Google re-crawls and re-evaluates the site, often around a later core update.
