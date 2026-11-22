# SEO Phase Handoff — RehabLookup

**Read this first in every new session.** Then read `SEO_MASTER_AUDIT.md` (findings F-01…F-25 and decision rules R01–R35) and `SEO_IMPLEMENTATION_LOG.md` (what has actually changed).

---

## Current state (2026-11-22)

| Item | Status |
|---|---|
| Current phase | **Phase 0 complete. Phase 1 diagnostics started.** Phase 1 implementation **not started**. |
| Code changes to the site | **None.** This session added documentation and analysis tools only. |
| Branch | `henry/zealous-lovelace-83d834` (docs commit). A draft PR is opened from it. |
| Production | `main@f31fd7dbf6`, deployed 2026-08-19. Vercel firewall config published 2026-09-06. |
| Approvals received | **None.** Every destructive row in `SEO_PAGE_DECISIONS.csv` is `PENDING_OWNER_APPROVAL`. |

## Completed in Phase 0
* Repository, architecture, middleware, generators, sitemap pipeline, schema emitters: inspected.
* Production-equivalent build generated and scanned (50,380 pages); committed corpus scanned (46,668).
* Database facts gathered (read-only).
* GSC and GA4 exports analyzed. Collapse dated to **2026-05-29**; second index drop **2026-09-18→21**.
* Deliverables written: master audit, baseline, URL inventory, page decisions, keyword map, content roadmap, monitoring plan, tools.

## Blockers / owner inputs needed (in priority order)
1. **GSC → Manual actions + Security issues** (screenshot). This decides whether a reconsideration request is in scope.
2. **Vercel → Firewall:** share the rules published 2026-09-06, and confirm that verified bots (Googlebot, Google-InspectionTool, Bingbot) are exempt. Run **GSC URL Inspection → Test live URL** on `/`, `/rehab-centers/colorado`, one `/center/*` URL and one `/provider-guides/*` URL. This environment cannot reach the live site (every request gets the Security Checkpoint, 429). Allowlisting an audit IP or user agent would enable live validation.
3. **Approval of the Phase 2 pruning manifest:** at minimum, wave A (zero-evidence families). See "Approval request" below.
4. **People and credentials:** confirm or remove Dr. Sarah Mitchell, Patricia Owens, James Chen and David Reyes (`About.tsx`); confirm LegitScript status; name any real medical reviewer.
5. **Product decisions:** (a) insurance-verification form: retire it, or confirm a staffed process? (b) `/ads/:slug` and `/lp/convert` paid landing pages still promise matching: retire or rewrite? (c) promote the 10k+ staged SAMHSA records (Phase 3)? (d) keep the `/us-rehab/*` international pages?
6. Extra GSC/GA4 exports: Crawl Stats, Sitemaps, Core Web Vitals, date-compared Pages/Queries (Apr 30–May 28 vs May 29–Jun 26), GA4 source/medium by week, and backlinks.

## Decisions taken (by analysis; the owner may overrule)
* **Do not merge `seo/content-uniqueness-audit` as is.** Its composer creates cosmetic uniqueness on pages slated for removal. Salvage `scripts/check-content-uniqueness.mjs`, the SPA/crawler parity test, and `fd62a9b6d5` (prerender the real provider-guide content).
* `seo/location-truth` is already merged (#86); nothing is outstanding there. `seo/public-search-hardening` (1 commit, 13 files) is unreviewed; review it in Phase 1 before it diverges further.
* The legacy history is on `origin/fix/prelaunch-seo-legal`. Use it for any archaeology from before 2026-06-20.

## Approval request (needed before Phase 2)
| Wave | Families | URLs → 410 | URLs → 301/MERGE | GSC impressions on the 410 set | GSC impressions on the 301/MERGE set (16 mo) |
|---|---|---:|---:|---:|---:|
| A (no evidence) | provider_marketing_* (all), near_me_county, insurance_x_county/city, county_x_service | 22,714 | 361 | 0 | 2,849 |
| B | city_combo (incl. retargeting the 3,168 currently → `/search-results`), specialty_x_state/city, near_me_city | 12,711 | 3,414 | 0 | 1,296 |
| C (consolidation) | near_me_state MERGE, commercial insurance_x_state MERGE, zero-inventory city/county hub MERGE, provider_city_landing → /for-providers, unsupported treatment_x_state/city | 1,748 | 2,843 | 0 | 10,681 |

Exact URLs, rules and replacement targets are in `SEO_PAGE_DECISIONS.csv` (filter `recommended_action`). Before executing any wave, run a backlink check and switch any externally linked URL from 410 to 301.

## Exact next steps (next session)
1. Re-read this file, the master audit §8, and the log. Check `git log` for anything merged since 2026-11-22.
2. If the owner has answered blockers 1–2, record the answers in the log and adjust the priorities (a manual action makes Phase 2 urgent; a firewall block makes the rule fix P0).
3. **Implement Phase 1, batch 1** (master audit §8, items 1–6) on a new branch:
   1. In `scripts/generate-facility-profiles-html.mjs`: remove hard-coded `openingHoursSpecification`, `isAcceptingNewPatients`, `medicalSpecialty`, `knowsAbout` and `isAccessibleForFree`; fix `hasCredential`; drop the empty `geo`; remove the FAQ sentence at line 363; label accreditations by provenance. Mirror the same in the SPA (`src/components/SEO.tsx` facility schema around line 529, and `CenterProfile.tsx:806`).
   2. Remove `reviewedBy` "Medical Advisory Board" and the today-dated `lastReviewed` (`SEO.tsx:310-316`). Gate "Medically reviewed by" in `ArticleByline.tsx` on real data. Write a migration nulling `last_medically_reviewed_at` and `medical_reviewer_id` where they were set by `20260828000200_seed_blog_authors.sql` (match on reviewer = `medical-review-team`). Unwire `testimonials.ts`. Comment out the unverified staff in `About.tsx` until confirmed.
   3. Rewrite `public/llms.txt`; fix `index.html:301` noscript and `src/data/pageFaqs.ts:73`; replace "free insurance verification tool" in every generator that emits it (`grep -rn "free insurance verification" scripts src`); remove "verified/accredited directory" phrasing (`pageFaqs.ts`, `locationDescriptions.ts`, `SEOLandingTemplate.tsx`, `CityPage.tsx`).
   4. Organization schema: plain Organization; remove the LegitScript credential and the 24/7 hours.
   5. `scripts/backfill-ga-snippet.mjs`: stop injecting gtag into crawler-only HTML.
   6. Add CI guards: extend `scripts/check-structured-data.mjs` to fail on hard-coded facility attributes and on `reviewedBy` without a real reviewer.
   7. Run the validation listed in master audit §8.6 plus `tools/` re-runs; record the results in the log; open a draft PR.
4. Then batch 2 (indexable `/rehab-centers` root, crawler hubs listing their children, provider-guide and article prerender parity, homepage prerender, facility sitemap content type and lastmod, robots.txt cleanup, delete `public/vercel.json`, remove the review sign-in CTA).
5. Phase 1 design note (write as `docs/seo-recovery/ADR-001-single-document-rendering.md`): end the crawler/human split (F-03). Options: (a) serve the prerendered HTML to everyone and mount the SPA on top; (b) SSR. Estimate the effort and risk to provider and admin workflows.

## Consumer-account migration: remaining items (from the sweep; re-check before editing)
* P1: `ReviewForm.tsx:172-182` "Sign in to review" (every profile); `pageFaqs.ts:73`; `index.html:301`; `public/llms.txt`.
* P1: seeker emails and SMS that link to `/account/concierge` or `/seeker-auth`: `send-concierge-notifications`, `send-tour-notifications`, `_shared/tour-email-templates.ts`, `send-message-notifications`, and the scheduled `placement-monitor` (migration `20260827000300`).
* P2: `support-ticket-reply` / `support-ticket-status` (`/account/support`); `send-review-notification` fallback `/account/reviews`; `send-marketing-followup` and `submit-marketing-lead` (→ `/concierge`); international CTAs → `/international/apply` (14 pages and 7 inline links); `Comparison.tsx:620`.
* P2: robots.txt disallows 301 sources (`/placement-help`, `/concierge/*`).
* P3: `useFavorites`/`useCompareList` DB sync for signed-in users; stray `public/vercel.json`; stale comments.
* Already correct: `/signup`, `/account/*`, `/my-account/*` and `/seeker/*` 301 at three layers; `/login` is provider-only and noindex + disallow + X-Robots-Tag; `/compare` works anonymously (localStorage); there are no consumer signup or login links in prerendered HTML.

## Things not to do
* Don't bulk-delete, redirect, or noindex anything without the approval above.
* Don't re-stamp "medically reviewed" dates or invent reviewers or statistics.
* Don't "fix" duplication by generating varied prose on pages that have no data.
* Don't redirect retired pages to the homepage or to `/search-results`.
