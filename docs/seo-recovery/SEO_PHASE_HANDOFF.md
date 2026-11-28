# SEO Phase Handoff — RehabLookup

**Read this first in every new session.** Then read `SEO_MASTER_AUDIT.md` (Phase 1 status table, findings F-01…F-29, decision rules R01–R35) and `SEO_IMPLEMENTATION_LOG.md` (what has actually changed).

---

## Current state (2026-11-23, end of Phase 1 batch 1)

| Item | Status |
|---|---|
| Current phase | **Phase 1 batch 1 implemented** (truth, schema, directory hub, guards). Phase 1 investigations complete (root cause, SAMHSA validation, removal reassessment, rendering ADR). |
| Branch / PR | PR #89 (Phase 0 docs + Phase 1 commits) squash-merged to `main` as `a81a79a294`. |
| Production data change | Migration `20261123000100_seo_recovery_clear_bulk_medical_review_stamps` **applied** to Supabase `mldbxpntzcjalgjmwnqa` (live immediately; backup in schema `seo_recovery_backup`). |
| Production code | `main@a81a79a294`, Vercel `dpl_ByWrZ5ruxRQJKUtLjqXt3zFZxfJU`, READY 2026-11-23 03:51 UTC. Production HTTP not verifiable from this environment (Security Checkpoint); owner live tests pending. Vercel firewall config unchanged since 2026-09-06. |
| Approvals received | Batch 1 (non-destructive). **Not approved:** bulk deletion, mass redirects, publishing staged SAMHSA facilities, merging `seo/content-uniqueness-audit` (PR #88). |

## Completed in Phase 1, batch 2 (2026-11-23, owner-requested)
* **Crawler parity:** crawlers receive a build-time snapshot of the real SPA render for every retained family, plus the homepage (ADR-001 step 1, `scripts/render-crawler-snapshots.mjs`). Facility cards are real links.
* **Crashes fixed:** 9 public pages and provider Settings (undefined identifiers); new CI guard `check:undefined-identifiers`. Comparison pages and the privacy notice now render for visitors.
* **Analytics:** removed from all crawler-only HTML; `check:crawler-analytics` blocks it from returning. GA was never a crawlability factor; this keeps analytics human-only.
* **AI search:** robots.txt adds the missing AI search/assistant agents; middleware serves them the prerendered HTML. **The Vercel Firewall still denies them — owner action below.**
* **Sitemap `lastmod`:** ranking job no longer rewrites `updated_at` (migration `20261123000200`, applied and verified).
* **Seeker emails:** no retired account/concierge links remain in 10 edge functions (they need deploying — see next steps).
* **Retired lead pages:** `/ads/:slug`, `/lp/convert` → `/`; `/insurance-verification` (+ `/vob`, `/verify-insurance`) → `/insurance`; insurance CTAs rewritten as self-serve guidance.
* **Articles:** the April 2026 "65,000 users" post is now a correction (the figure included crawler traffic); the CEO note no longer repeats it or the "verified"/"no pay-to-play" claims.
* **May 29 / GA:** the GA switch was on 2026-05-09 and cannot affect Google Search (`SEO_ROOT_CAUSE_INVESTIGATION.md`).
* **SAMHSA expansion: deferred by the owner** until the platform fixes are complete.

## Completed in Phase 1, batch 4 (2026-11-24, owner-requested, PR #92)
* **Firewall:** owner switched AI Bots off; verified in observability (all AI crawler requests allowed).
* **International patients:** self-serve opt-in for every listing (migration `20261124000100`); opted-in listings show a badge and appear on `/us-rehab` and `/us-rehab/international-patients`.
* **Consolidation of the app-noindexed pages (519 → 0):** specialty × location pages 301 to the location hubs (no data supports the specialties); thin treatment × city pages redirect to the state treatment page when the live directory has no matching listing (decided every build, never on cached/failed data); state pages link only the city pages that stay; 5 retired article slugs 301 to live guides; redirect sources no longer advertised in `sitemap-extras.xml`.
* **Trust copy:** 0 of 3,796 listings are verified, so "verified programs/facilities" claims were removed from 38 source files and 15 article bodies (migration `20261124000200`, with backup); `check:trust-claims` blocks them.

## Completed in Phase 1, batch 3 (2026-11-23, owner-requested, PR #91)
* **International pages** (`/us-rehab/*`, 14 pages): no longer claim RehabLookup runs intake, matches patients, arranges visas, travel or insurance, or negotiates with or vets facilities. They describe a directory: compare programs, then contact the facility.
* **Concierge Partner add-on retired in the provider portal:** 0 holders, 0 introductions and 0 active subscriptions ever. The offer was removed everywhere, `/provider/marketing/concierge` shows a notice, and checkout refuses `concierge` (410). "Verified Leads" became "Direct Inquiries".
* **Visitor 404 / crawler-content mismatches:**
  * 50 "best cities" state articles fixed (slug mismatch).
  * 12 dead-end or duplicate routes now 301.
  * `/drug-rehabilitation-{state}` now points to a real page.
  * Every remaining client-side redirect in the snapshot set is mirrored as a crawler 301 (`crawler-redirects.ts`, generated per build) and dropped from the built sitemaps.

## Completed in Phase 1
* Facility schema emits only data-backed attributes, from one shared module (`src/lib/seo/facilityTruth.mjs`) used by the crawler generator and the SPA. Provenance notice on every profile.
* Bulk "medically reviewed" stamps cleared (40 articles, backed up); Advisory Board schema, unverified staff, testimonials, "verified/accredited directory", insurance-verification, concierge and placement claims removed from source and the committed corpus.
* `/rehab-centers` 301 → `/locations` (indexable crawler hub with all states and cities); breadcrumbs updated; robots.txt no longer blocks 301 sources; stray `public/vercel.json` deleted; `llms.txt` and noscript rewritten.
* Blocking guard `check:trust-claims` in `build:vercel`, `validate:blocking` and the SEO Validators workflow.
* Investigations: `SEO_ROOT_CAUSE_INVESTIGATION.md`, `SEO_SAMHSA_IMPORT_PLAN.md`, `SEO_REMOVAL_PLAN.md` (six classes, destinations validated), `ADR-001-single-document-rendering.md` (parity measured).

## Blockers / owner inputs needed (in priority order)
0. **Vercel Firewall — allow AI search crawlers (owner action; this integration has no firewall access).** Vercel dashboard → project `rehablookup-fee48b92` → Firewall → Bot Management / Managed rulesets → **AI Bots: set to Off (or Log)**, and remove any custom rule that denies `applebot` or `googleother`. Then confirm in Observability that `oai-searchbot`, `chatgpt-user`, `perplexitybot` and `applebot` show `waf_action = allow`.
1. **GSC → Manual actions + Security issues** (screenshot). Still the most important missing input.
2. **GSC → Crawl stats** (Aug–Nov, response codes and host status) and **URL Inspection → Test live URL** on `/`, `/locations`, `/rehab-centers/colorado`, one `/center/*` and one `/provider-guides/*`. This environment is challenged by the Vercel checkpoint, so it cannot verify production pages; the owner's live tests are the production verification.
3. **Firewall / AI bots decision** (F-26): allow Applebot, OAI-SearchBot, ChatGPT-User, PerplexityBot? Screenshot of the 2026-09-06 rules.
4. **Removal waves A–D** (`SEO_REMOVAL_PLAN.md` §8): approve wave by wave, after a backlink export and a full-history GSC page export.
5. **People:** confirm or permanently remove the staff previously named in `About.tsx` (removed in Phase 1); name any real medical reviewer before any "reviewed" label returns.
6. **Product decisions:** ~~`/ads/:slug`, `/lp/convert`, `/insurance-verification`, `/us-rehab/*` copy~~ (done in batches 2–3). Still open: **international acceptance on listings** is gated on the retired Concierge add-on (ListingEditor toggle and a DB trigger), so no facility can currently mark "accepts international patients". Unlocking it for all claimed listings is a schema/product change for the owner.
7. **SAMHSA:** approve a complete re-scrape, the facet schema migration, and 1–2 pilot states (`SEO_SAMHSA_IMPORT_PLAN.md` §6).
8. ~~**Editorial:** the CEO article "65,000 users" claim~~ (corrected in batch 2).
9. GSC date-compared Pages/Queries export (Apr 30–May 28 vs May 29–Jun 26), Sitemaps report, Core Web Vitals, GA4 source/medium, backlinks.

## Decisions taken (by analysis; the owner may overrule)
* `seo/content-uniqueness-audit` stays unmerged (owner agreed). Salvage only the measurement script and the parity idea (now `tools/render_parity.mjs`).
* Facility credentials are labelled by source ("as reported to SAMHSA"); nothing is described as RehabLookup-verified unless a verification record exists.
* The 40 previously "reviewed" articles show as unreviewed until a real clinical review happens.

## Exact next steps (next session)
1. Re-read this file, the master audit status table, and the log. Check `git log origin/main` and the Vercel production deployment for PR #89.
2. Record any owner answers (blockers 1–9) in the log; a manual action makes the removal waves urgent.
3. ~~Deploy the seeker-email edge functions~~ — **done 2026-11-23** (10/10 via the deploy workflow, after adding `--yes` for the current Supabase CLI).
4. ~~Verify the first production build log~~ — **done**: production build `dpl_Cc7TdhMdaYVKVweFRBTcxyQm3dg1` wrote 2,147/2,754 snapshots via Playwright's Chromium. Keep an eye on this line in every build log (monitoring plan).
5. ~~Remaining parity gaps~~ — **done in batch 4**: 0 app-noindexed routes serve indexable crawler HTML (production build 2026-11-24).
6. *(Previous batch-2 list, now done except where noted:)*
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
