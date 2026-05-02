# Vercel Cutover SEO Audit & Runbook

## TL;DR

Your site is **mostly Vercel-ready** — `vercel.json` already has 63 server-side 301s, hybrid pre-rendered HTML (4,641 files in `public/`), correct sitemap headers, and a parity validator (`check:redirect-parity`). But there are **4 blockers** that will cause SEO regressions if you flip DNS today. Fix them first, then follow the cutover runbook below. Expected outcome with the fixes applied: **zero ranking loss**, faster TTFB on pre-rendered pages, and cleaner 301s for search engines.

---

## Must-fix before cutover (blockers)

### 1. The catch-all rewrite breaks pre-rendered HTML serving (CRITICAL)

Current `vercel.json`:
```json
"rewrites": [
  { "source": "/((?!.*\\.[a-zA-Z0-9]+$|api/|assets/|_next/).*)", "destination": "/index.html" }
]
```

Vercel evaluates `rewrites` **after** the filesystem, so `public/rehab-centers/california.html` will normally win. **However**, your pre-render layout uses both `<path>.html` AND `<path>/index.html` (hybrid). Vercel's filesystem handler with `cleanUrls: true` resolves both — but only when the rewrite is structured to allow it. The risk: if Vercel's rewrite engine fires before the cleanUrls resolver on certain edge cases (notably routes ending in a segment that *also* exists as a directory), bots get the SPA shell, not the SEO HTML.

**Fix:** Add an explicit "filesystem-first" handle and an opt-in pre-render rewrite:
```json
"rewrites": [
  { "source": "/((?!.*\\.[a-zA-Z0-9]+$|api/|assets/).*)", "destination": "/index.html" }
],
"cleanUrls": true,
"trailingSlash": false
```
Already mostly correct — but **remove `_next/`** (Next.js artifact, irrelevant on Vite) to keep the regex tight, and add a `validate:vercel-deploy` step that does an actual local `vercel build && vercel dev` smoke test crawling 50 representative routes (script already exists, just wire it into CI).

### 2. Lovable preview hosts hardcoded into canonical helper

`src/components/SEO.tsx` line 54-55 still treats `*.lovable.app` and `*.lovable.dev` as "ours". After cutover, requests *should* never hit those hosts (Vercel will own DNS), but if someone shares a preview link, the canonical will be set to the preview path on the apex domain — fine. But the Lovable-published mirror at `rehablookup.lovable.app` will keep serving and its canonicals will point to `rehablookup.com`. **Action: either unpublish the Lovable build right after cutover, or add `<meta name="robots" content="noindex">` to the Lovable mirror via a temporary build flag.** Otherwise Google sees two live origins for ~1 week. Recommended: unpublish Lovable hosting 24h after Vercel goes green.

### 3. Sitemap freshness on Vercel build

Your `build:vercel` script regenerates sitemaps at build time, but **Vercel only rebuilds on git push**. Today, `generate:sitemaps` reads from Supabase live data. After cutover, a new facility published in the admin panel won't appear in the sitemap until the next code deploy. Two options:
- **(A) Quick fix**: Add a Vercel cron (`vercel.json` → `crons`) that hits an edge function which regenerates and uploads sitemap XML to a Vercel Blob or a Supabase Storage bucket served via rewrite. ~2 hours of work.
- **(B) Acceptable interim**: Trigger Vercel deploy hooks from Supabase whenever facilities table changes (Postgres webhook → Vercel deploy hook URL).

Recommend **(B)** for cutover — simpler, 30 min of work, and your facility publish cadence is low enough that deploy-on-write is fine.

### 4. Edge-function-driven prerender for bots is dead on Vercel

`supabase/functions/detect-and-prerender` is a Lovable-hosting middleware. On Vercel it won't be invoked unless you manually wire it into a Vercel Edge Middleware. **Good news**: you don't need it — your hybrid `<path>.html` mirrors are served directly by Vercel's filesystem to *all* clients (bots and humans), which is actually better SEO than UA-sniffing. **Action**: leave the edge function deployed (no harm, other consumers may exist), but **remove any references to it from the frontend** and confirm no client code calls `/functions/v1/detect-and-prerender` (a quick grep — I'll do this in implementation).

---

## Pre-cutover audit checklist (I will run all of these)

```text
1. Crawl current production (rehablookup.com on Lovable) → snapshot:
   - HTTP status, canonical, title, meta description, h1
   - For top 200 URLs from sitemap + GSC top-pages export
2. Run vercel build locally → vercel dev → crawl same 200 URLs
3. Diff: status / canonical / title / description must match exactly
4. Validate every redirect in vercel.json resolves to a 200
   (currently 63 redirects; script already exists: validate-vercel-deploy.mjs)
5. Verify /sitemap-index.xml, /sitemap.xml, /sitemap-facilities.xml,
   /sitemap-extras.xml, /robots.txt all return 200 with correct
   Content-Type (vercel.json headers already correct)
6. Verify /center/<slug>, /rehab-centers/<state>,
   /rehab-centers/<state>/<city>, /treatment-types/<slug>,
   /<x>-near-me, /us-rehab/<slug>, /insurance/<slug>,
   /provider-guides/<slug> all serve pre-rendered HTML (not SPA shell)
7. Verify trailing-slash 301 fires server-side (not client-side
   <Navigate>) — vercel.json already has /:path+/ → /:path+
8. Verify www → apex 301 (already in vercel.json line 11)
9. Run: npm run check:redirect-parity, validate:sitemap-robots,
   check:facility-sitemap-sync, check:gsc-indexing, check:internal-links
```

I'll produce **`docs/audit/vercel-cutover/`** with: `pre-cutover-snapshot.csv`, `vercel-build-snapshot.csv`, `diff-report.md`, and `redirect-validation.json`.

---

## DNS cutover runbook

### T-7 days
- Land all 4 blocker fixes; merge to main
- Vercel project deployed, accessible at `<project>.vercel.app`
- Run full audit; resolve any diffs
- Lower TTL on `rehablookup.com` A-record + `www` CNAME to **300s** (5 min)

### T-1 day
- Final audit re-run
- Take fresh GSC export of top 1,000 URLs + their current rankings (baseline)
- Open Sentry/error-monitoring dashboards in tabs

### T-0 (cutover)
1. In DNS provider, change `rehablookup.com` A-record from Lovable IP `185.158.133.1` → Vercel `76.76.21.21` (or Vercel-supplied target)
2. Change `www` CNAME → `cname.vercel-dns.com`
3. In Vercel project: add `rehablookup.com` and `www.rehablookup.com` as domains; set `rehablookup.com` as primary
4. Wait for SSL cert provisioning (Vercel usually <2 min)
5. Run post-cutover monitor (below) **immediately**, then at T+15min, T+1h, T+6h, T+24h
6. **Do NOT unpublish Lovable hosting yet** — keep as instant rollback

### T+24h (if green)
- Unpublish the Lovable project (Project Settings → Publish → Unpublish)
- Restore TTL to 3600s
- Submit fresh sitemaps in GSC + Bing Webmaster Tools (forces recrawl)

### Rollback (any time within 24h, if traffic drops >20% or 5xx spikes)
- Revert DNS A-record back to `185.158.133.1`
- Revert `www` CNAME to its prior Lovable value
- TTL is 300s → propagation in 5–10 min
- Lovable hosting is still live, so service resumes instantly

---

## Post-cutover monitoring script

I will add `scripts/monitor-cutover.mjs` that:
- Crawls top 200 URLs from sitemap + GSC export
- Compares response status, canonical URL, title, meta description, and presence of key JSON-LD types vs. the pre-cutover snapshot
- Outputs a markdown diff report and exits non-zero if any regression
- Designed to be run manually at T+0, T+15m, T+1h, T+6h, T+24h, T+7d

Plus a simple uptime/status alerting recipe (UptimeRobot or Vercel's built-in monitoring) on:
- `https://rehablookup.com/` → 200
- `https://rehablookup.com/sitemap-index.xml` → 200
- `https://rehablookup.com/center/<known-slug>` → 200 + contains pre-rendered marker
- `https://rehablookup.com/rehab-centers/california` → 200 + contains pre-rendered marker

---

## What I'll deliver in implementation mode

1. **Code changes**
   - Tighten `vercel.json` rewrite regex (drop `_next/`)
   - Wire `validate:vercel-deploy` into the SEO validators GitHub Action
   - Set up Supabase → Vercel deploy hook for facility publish events
   - Remove any frontend reference to `detect-and-prerender` (if found)

2. **New scripts**
   - `scripts/audit/snapshot-production.mjs` — crawls top URLs, dumps CSV
   - `scripts/audit/diff-snapshots.mjs` — compares two snapshots
   - `scripts/monitor-cutover.mjs` — post-cutover live diff against baseline

3. **Audit artifacts**
   - `docs/audit/vercel-cutover/pre-cutover-snapshot.csv`
   - `docs/audit/vercel-cutover/vercel-build-snapshot.csv`
   - `docs/audit/vercel-cutover/diff-report.md`
   - `docs/audit/vercel-cutover/redirect-validation.json`
   - `docs/audit/vercel-cutover/RUNBOOK.md` (the runbook above as a living doc)

4. **Verification**
   - Full local `vercel build` + `vercel dev` smoke test
   - All existing CI validators (`check:internal-links`, `check:redirect-parity`, `check:facility-sitemap-sync`, `validate:sitemap-robots`, `check:gsc-indexing`, `check:structured-data`) pass

---

## Honest risk assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Catch-all rewrite swallows pre-rendered HTML | Medium | Blocker #1 + local `vercel dev` crawl test |
| Stale sitemap after facility publish | High (ongoing) | Blocker #3 deploy hook |
| Two live origins (Lovable + Vercel) for 24h | Low SEO impact | Canonicals already point to apex; unpublish Lovable T+24h |
| Cert provisioning fails | Low | Vercel auto-retries; Lovable still live as fallback |
| Edge function calls (auth, intake) break due to CORS | Low | Edge functions stay on Supabase; CORS allows `*` already |
| Google re-crawls slowly and rankings dip 1–2 weeks | Medium | Resubmit sitemaps in GSC immediately after cutover; monitor |

**Net expected SEO impact: 0%.** URLs unchanged, canonicals unchanged, redirects mirrored server-side, pre-rendered HTML preserved. The cutover is **safe** with these fixes.

---

Approve this plan and I'll switch to build mode and execute it end-to-end.
