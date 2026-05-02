# Vercel Cutover Runbook

Living document. Update after each cutover or rehearsal.

**Goal**: move `rehablookup.com` DNS from Lovable hosting (`185.158.133.1`) to Vercel with **zero SEO regression**. Site already has 4,641 pre-rendered HTML files, 63 server-side 301s mirrored in `vercel.json`, and parity validators in CI.

---

## 0. One-time prep (already done as of cutover commit)

- [x] `vercel.json` rewrite tightened (removed unused `_next/` exclusion)
- [x] `validate:vercel-deploy` wired into SEO validators CI workflow (runs only when `VERCEL_URL` secret set)
- [x] `scripts/audit/snapshot-production.mjs` — pre/post snapshot crawler
- [x] `scripts/audit/diff-snapshots.mjs` — markdown diff
- [x] `scripts/monitor-cutover.mjs` — live post-cutover monitor
- [x] No frontend code references the dead `detect-and-prerender` edge function

---

## 1. T-7 days

1. Verify Vercel project deploys cleanly:
   ```bash
   vercel build && vercel deploy --prebuilt
   ```
   Note the preview URL (e.g. `rehablookup-xxx.vercel.app`).

2. Run pre-cutover Lovable snapshot:
   ```bash
   node scripts/audit/snapshot-production.mjs \
     --host https://rehablookup.com \
     --sample 200 \
     --out docs/audit/vercel-cutover/pre-cutover-snapshot.csv
   ```

3. Run post-build Vercel snapshot against the preview URL:
   ```bash
   node scripts/audit/snapshot-production.mjs \
     --host https://rehablookup-xxx.vercel.app \
     --sample 200 \
     --out docs/audit/vercel-cutover/vercel-build-snapshot.csv
   ```

4. Diff:
   ```bash
   node scripts/audit/diff-snapshots.mjs
   cat docs/audit/vercel-cutover/diff-report.md
   ```
   Resolve any **CRITICAL** (status / canonical) before proceeding. **HIGH** (title/description) should also be zero — if any appear, they almost always indicate a routing or pre-render mismatch.

5. Run the live Vercel validator against the preview:
   ```bash
   VERCEL_URL=https://rehablookup-xxx.vercel.app npm run validate:vercel-deploy
   ```

6. Lower DNS TTL on `rehablookup.com` A and `www` CNAME to **300 seconds**. (Lets us roll back fast if anything goes sideways.)

7. Add Vercel deploy hook URL to a Supabase Postgres webhook on the `facilities` table (`UPDATE` where `published` flips true) so new approvals trigger a fresh sitemap deploy. _One-time setup, ~15 min._

---

## 2. T-1 day

- Re-run snapshot + diff against latest Vercel preview to confirm no drift.
- Export GSC top 1,000 URLs + impressions + average position into `docs/audit/vercel-cutover/gsc-baseline-YYYY-MM-DD.csv` (manual export from Search Console).
- Open in tabs: GSC, Vercel deployments, Supabase logs, Sentry.

---

## 3. T-0 — Cutover

1. **In your DNS provider**:
   - `rehablookup.com` A-record → Vercel-supplied IP (typically `76.76.21.21`)
   - `www.rehablookup.com` CNAME → `cname.vercel-dns.com`

2. **In Vercel dashboard**:
   - Project → Settings → Domains → Add `rehablookup.com` (set as primary) and `www.rehablookup.com`
   - Wait for SSL provisioning (usually <2 min, max 10 min)

3. **Verify immediately** (DNS still partially propagating, but Vercel's edge usually resolves within seconds):
   ```bash
   node scripts/monitor-cutover.mjs --host https://rehablookup.com
   ```
   Expect **0 failures**. If any CRITICAL fail → see Rollback below.

4. **Do not unpublish Lovable hosting yet.** Keep it warm for instant rollback.

5. Run monitor at **T+15min, T+1h, T+6h**.

---

## 4. T+24h — Stabilize

If monitor has stayed clean for 24 hours:

1. Unpublish Lovable hosting (Project Settings → Publish → Unpublish)
2. Restore DNS TTL to 3600s
3. In Google Search Console:
   - Submit `https://rehablookup.com/sitemap-index.xml` (re-submit even if already there — forces a recrawl)
   - Submit each child sitemap individually
4. In Bing Webmaster Tools: same submission
5. Run `node scripts/monitor-cutover.mjs` daily for 7 days

---

## 5. Rollback procedure

Trigger if any of:
- Organic traffic drops >20% in any 6-hour window vs. same window last week
- 5xx error rate >1% sustained for 30 min
- Monitor reports any CRITICAL regression that can't be hot-fixed in 30 min

**Steps** (5–10 min total once decided):

1. Revert DNS A-record → `185.158.133.1`
2. Revert `www` CNAME → original Lovable target
3. Re-publish Lovable project if it was unpublished (Project Settings → Publish)
4. TTL of 300s means propagation completes within 5–10 min
5. Post-mortem: snapshot Vercel preview again, diff against pre-cutover Lovable snapshot, file CRITICAL findings as issues, fix, re-attempt next cycle.

---

## 6. SEO impact expectations

| Metric | Expected change | Notes |
|---|---|---|
| Indexed pages | 0% | URLs unchanged |
| Avg position | ±2 positions for ~1 week, then recover | Normal during host migration |
| Crawl rate | +20–40% week 1 (Google re-verifies) | Don't over-correct |
| Core Web Vitals | Improvement | Vercel edge cache > Lovable proxy |
| Daily organic visitors | -10% to +5% week 1, baseline by week 2 | Within normal weekly variance |

If after 14 days position has not recovered, re-check:
- Sitemap freshness (deploy hook firing?)
- Canonical URLs (run snapshot + diff again)
- robots.txt served from Vercel matches what's in `public/robots.txt`

---

## 7. Open questions / future improvements

- Move sitemap generation to a Vercel cron (currently regenerated on every deploy via `build:vercel`). Acceptable for now given low facility-publish cadence.
- Consider Vercel Edge Middleware to replace `detect-and-prerender` if any non-HTML pre-render needs ever return.
- Image optimization: opt into Vercel's `next/image`-equivalent for facility photos to shave another 200ms off LCP.
