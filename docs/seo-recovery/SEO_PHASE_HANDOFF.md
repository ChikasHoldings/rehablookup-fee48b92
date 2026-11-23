# SEO Phase Handoff — RehabLookup

**Read this first in every new session.** Then read `SEO_MASTER_AUDIT.md` (Phase 1 status table, findings F-01…F-29, decision rules R01–R35) and `SEO_IMPLEMENTATION_LOG.md` (what has actually changed).

---

## Current state (2026-11-23, end of Phase 1 batch 1)

| Item | Status |
|---|---|
| Current phase | **Phase 1 batch 1 implemented** (truth, schema, directory hub, guards). Phase 1 investigations complete (root cause, SAMHSA validation, removal reassessment, rendering ADR). |
| Branch / PR | `henry/zealous-lovelace-83d834` → PR #89 (Phase 0 docs + Phase 1 commits). Merge and deploy outcome: see the last `SEO_IMPLEMENTATION_LOG.md` entry. |
| Production data change | Migration `20261123000100_seo_recovery_clear_bulk_medical_review_stamps` **applied** to Supabase `mldbxpntzcjalgjmwnqa` (live immediately; backup in schema `seo_recovery_backup`). |
| Production code | `main@f31fd7dbf6` (2026-08-19) until PR #89 deploys. Vercel firewall config unchanged since 2026-09-06. |
| Approvals received | Batch 1 (non-destructive). **Not approved:** bulk deletion, mass redirects, publishing staged SAMHSA facilities, merging `seo/content-uniqueness-audit` (PR #88). |

## Completed in Phase 1
* Facility schema emits only data-backed attributes, from one shared module (`src/lib/seo/facilityTruth.mjs`) used by the crawler generator and the SPA. Provenance notice on every profile.
* Bulk "medically reviewed" stamps cleared (40 articles, backed up); Advisory Board schema, unverified staff, testimonials, "verified/accredited directory", insurance-verification, concierge and placement claims removed from source and the committed corpus.
* `/rehab-centers` 301 → `/locations` (indexable crawler hub with all states and cities); breadcrumbs updated; robots.txt no longer blocks 301 sources; stray `public/vercel.json` deleted; `llms.txt` and noscript rewritten.
* Blocking guard `check:trust-claims` in `build:vercel`, `validate:blocking` and the SEO Validators workflow.
* Investigations: `SEO_ROOT_CAUSE_INVESTIGATION.md`, `SEO_SAMHSA_IMPORT_PLAN.md`, `SEO_REMOVAL_PLAN.md` (six classes, destinations validated), `ADR-001-single-document-rendering.md` (parity measured).

## Blockers / owner inputs needed (in priority order)
1. **GSC → Manual actions + Security issues** (screenshot). Still the most important missing input.
2. **GSC → Crawl stats** (Aug–Nov, response codes and host status) and **URL Inspection → Test live URL** on `/`, `/locations`, `/rehab-centers/colorado`, one `/center/*` and one `/provider-guides/*`. This environment is challenged by the Vercel checkpoint, so it cannot verify production pages; the owner's live tests are the production verification.
3. **Firewall / AI bots decision** (F-26): allow Applebot, OAI-SearchBot, ChatGPT-User, PerplexityBot? Screenshot of the 2026-09-06 rules.
4. **Removal waves A–D** (`SEO_REMOVAL_PLAN.md` §8): approve wave by wave, after a backlink export and a full-history GSC page export.
5. **People:** confirm or permanently remove the staff previously named in `About.tsx` (removed in Phase 1); name any real medical reviewer before any "reviewed" label returns.
6. **Product decisions:** `/ads/:slug` and `/lp/convert` (lead forms with no concierge behind them), `/insurance-verification` (promises an admissions-team check), `/us-rehab/*` international pages.
7. **SAMHSA:** approve a complete re-scrape, the facet schema migration, and 1–2 pilot states (`SEO_SAMHSA_IMPORT_PLAN.md` §6).
8. **Editorial:** the CEO article override still claims "65,000 users we served in April".
9. GSC date-compared Pages/Queries export (Apr 30–May 28 vs May 29–Jun 26), Sitemaps report, Core Web Vitals, GA4 source/medium, backlinks.

## Decisions taken (by analysis; the owner may overrule)
* `seo/content-uniqueness-audit` stays unmerged (owner agreed). Salvage only the measurement script and the parity idea (now `tools/render_parity.mjs`).
* Facility credentials are labelled by source ("as reported to SAMHSA"); nothing is described as RehabLookup-verified unless a verification record exists.
* The 40 previously "reviewed" articles show as unreviewed until a real clinical review happens.

## Exact next steps (next session)
1. Re-read this file, the master audit status table, and the log. Check `git log origin/main` and the Vercel production deployment for PR #89.
2. Record any owner answers (blockers 1–9) in the log; a manual action makes the removal waves urgent.
3. **Phase 1 batch 2 (non-destructive, already in scope):**
   1. Stop injecting gtag into crawler-only HTML (`scripts/backfill-ga-snippet.mjs`) — F-15.
   2. Redeploy the `sitemap-facilities` edge function so the live response matches source (`application/xml`, `updated_at` lastmod) — F-14; verify from an allowed network.
   3. Crawler hubs `/resources`, `/treatment-types`, `/insurance`, `/provider-guides` list their children like `/locations` now does — F-10.
   4. Prerender the real provider-guide and article content (salvage `fd62a9b6d5`) — F-03.
   5. Homepage crawler HTML with static canonical and real content — F-19.
   6. Make facility cards real `<a href="/center/…">` links in the SPA — F-10, ADR-001 §5.
   7. Seeker edge-function emails: stop linking retired `/account/*` URLs (backend; needs a function deploy).
4. **Phase 2 (approval-gated):** execute removal waves per `SEO_REMOVAL_PLAN.md` §6 mechanics (static output, SPA routes, 410 in middleware, sitemaps/manifest, link check, post-deploy sampling).
5. **Phase 3:** ADR-001 single-document rendering for the retained set; SAMHSA pilot import if approved.

## Consumer-account migration: remaining items (from the sweep; re-check before editing)

**Phase 1 done:** ReviewForm CTA (hidden for signed-out visitors), `pageFaqs.ts`, `index.html` noscript, `public/llms.txt`, `Comparison.tsx` copy, robots.txt 301-source disallows, stray `public/vercel.json`. Provider (`/login`, `/provider/*`, claim flow) and admin routes were not changed. **Still open:** the edge-function emails/SMS below, international CTAs, and `useFavorites`/`useCompareList` DB sync.
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
