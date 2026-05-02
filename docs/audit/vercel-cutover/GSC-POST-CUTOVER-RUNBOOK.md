# Google Search Console — Post-Vercel-Cutover Verification & Resubmission Runbook

**Goal:** Confirm zero indexing drop after moving `rehablookup.com` DNS from Lovable hosting to Vercel.

**Owner:** SEO lead. **Window:** T-1d → T+30d. **Acceptance:** Indexed-page count, impressions, and clicks each within ±5% of pre-cutover 7-day baseline by T+14d.

GSC URL: https://search.google.com/search-console/?resource_id=sc-domain:rehablookup.com (or the URL-prefix property `https://rehablookup.com/`).

---

## T-7d → T-1d — Capture pre-cutover baseline

Lock in numbers you can compare against. Without this, "no drop" is unprovable.

1. **GSC → Performance → Search results**
   - Filter: last **7 days** + last **28 days**.
   - Export each as CSV → save to `docs/audit/vercel-cutover/gsc-baseline-7d.csv` and `gsc-baseline-28d.csv`.
   - Record at the top of this file: `total_clicks`, `total_impressions`, `avg_ctr`, `avg_position`.

2. **GSC → Indexing → Pages**
   - Screenshot the **"Indexed"** count and the **"Not indexed"** breakdown (Crawled – currently not indexed / Discovered / Duplicate / Soft 404 / etc.).
   - Save to `docs/audit/vercel-cutover/gsc-pages-pre.png`.
   - Export the "Indexed" table → `gsc-indexed-pre.csv`.

3. **GSC → Sitemaps**
   - Screenshot showing each submitted sitemap and its "Discovered URLs" count.
   - Currently submitted (must be present):
     - `https://rehablookup.com/sitemap-index.xml`
     - `https://rehablookup.com/sitemap.xml`
     - `https://rehablookup.com/sitemap-facilities.xml`
     - `https://rehablookup.com/sitemap-extras.xml`

4. **Run the local cutover monitor in pre-phase to lock the baseline:**
   ```bash
   node scripts/monitor-cutover.mjs --host https://rehablookup.com --phase pre
   ```
   Must exit 0. Save the output.

---

## T-0 — DNS flip to Vercel

Done by infra owner. After flip:

1. Verify DNS propagation:
   ```bash
   dig +short rehablookup.com
   dig +short www.rehablookup.com
   ```
   Both should resolve to Vercel IPs (76.76.21.21 or similar), **not** `185.158.133.1`.

2. Verify SSL serves a valid cert for both `rehablookup.com` and `www.rehablookup.com`.

3. Smoke test from a fresh browser (no cache):
   - `https://rehablookup.com/` → 200, homepage.
   - `https://www.rehablookup.com/` → **301** to apex.
   - `https://rehablookup.com/blog` → **301** to `/resources`.
   - `https://rehablookup.com/centers` → **301** to `/rehab-centers`.

---

## T+0 → T+1h — Confirm Vercel state matches expectations

### 1. Local automated post-cutover monitor (must exit 0)

```bash
node scripts/monitor-cutover.mjs --host https://rehablookup.com --phase post
```

Expected: every documented redirect now returns **301**, www→apex returns **301**, all hubs 200, robots.txt + sitemaps reachable.

### 2. Live Vercel deploy validator (must exit 0)

```bash
VERCEL_URL=https://rehablookup.com npm run validate:vercel-deploy -- --sample 100
```

Asserts: hubs serve unique pre-rendered HTML (no SPA shell leak), Googlebot UA gets the same content, sitemap-sampled URLs all 200.

### 3. GSC URL Inspection — manual spot-checks

In GSC, **URL Inspection** (top search bar), test these 6 URLs:

| URL | What to verify |
|---|---|
| `https://rehablookup.com/` | "URL is on Google" + canonical = `https://rehablookup.com/` |
| `https://rehablookup.com/rehab-centers/california` | Indexed; **page-specific** title (not homepage) |
| `https://rehablookup.com/treatment-types/detox-programs` | Indexed; canonical self-referencing |
| `https://rehablookup.com/insurance/aetna-rehab` | Indexed; canonical self-referencing |
| `https://rehablookup.com/blog` (legacy) | "Page with redirect" → final URL `/resources`, status **301** |
| `https://rehablookup.com/center/<any-approved-slug>` | Indexed; MedicalClinic schema present |

For each, click **"Test live URL"** → expect green checkmark, no soft 404, no shell leak. Click **"View crawled page"** and confirm the rendered HTML contains the page-specific `<title>`, canonical, and JSON-LD blocks (Organization + LocalBusiness + MedicalClinic for facility profiles; Breadcrumb + FAQPage where applicable).

If any spot-check fails, **stop** and consult `RUNBOOK.md` rollback section before proceeding.

---

## T+1h → T+24h — Resubmit sitemaps

Even though sitemap URLs are unchanged, GSC needs to be told to recrawl them so it picks up the new server (Vercel) and the now-correct 301 responses for legacy paths.

### Steps (do this once at T+1h, again at T+24h)

1. **GSC → Sitemaps**.
2. For each of the 4 sitemaps below, click **the row → "⋯" → Resubmit** (or remove and re-add):
   - `sitemap-index.xml`
   - `sitemap.xml`
   - `sitemap-facilities.xml`
   - `sitemap-extras.xml`
3. Wait 30–60s. Confirm **Status = "Success"** and **"Last read"** timestamp updated to within the last few minutes.
4. Do **not** delete and re-add unless Status shows "Couldn't fetch" — deletion resets discovery history.

### Validate sitemap response from Vercel

```bash
curl -sI https://rehablookup.com/sitemap-index.xml | head -5
curl -s  https://rehablookup.com/sitemap.xml | head -3
```

Expected: `HTTP/2 200`, `Content-Type: application/xml; charset=utf-8`, body starts with `<?xml version="1.0"`.

---

## T+1h — Re-verify domain ownership (only if needed)

If the GSC property is **URL-prefix** (`https://rehablookup.com/`) and verification was via HTML file or HTML tag, **no action needed** — the file/tag is part of the same `index.html` that Vercel now serves.

If the property is **Domain** (recommended) verified via DNS TXT, re-confirm the TXT record survived the DNS migration:

```bash
dig +short TXT rehablookup.com | grep google-site-verification
```

If missing, re-add the TXT record from **GSC → Settings → Ownership verification → Domain → Copy verification record**, then click **Verify** in GSC.

> **Recommendation:** if not already, upgrade to a **Domain property** so `www`, `http`, `https` and all subdomains are consolidated under one report. Add via GSC → Add property → Domain → enter `rehablookup.com`.

---

## T+24h → T+7d — Active monitoring

Run **once per day** for 7 days:

### A. Coverage check

GSC → **Indexing → Pages**:
- "Indexed" count must not drop more than **5%** vs. pre-cutover baseline.
- "Not indexed" reasons: watch for spikes in:
  - **"Page with redirect"** — expected to rise as legacy paths now 301 (this is correct, not a regression).
  - **"Crawled — currently not indexed"** — should stay flat.
  - **"Soft 404"** — must be 0. If it appears, run `npm run check:gsc-indexing` and inspect canonical/title parity.
  - **"Duplicate, Google chose different canonical"** — must stay flat. Spike = canonical mismatch; run `npm run check:unique-meta` and `validate-vercel-deploy`.

### B. Performance check

GSC → **Performance → Search results**, last 7 days vs. previous 7 days:
- `clicks` and `impressions` within ±10% on day 1, tightening to ±5% by day 7.
- `avg_position` worsening by more than **2 positions** on top-50 queries → escalate.

Save a daily snapshot:
```bash
mkdir -p docs/audit/vercel-cutover/gsc-daily
# then export GSC Performance CSV → docs/audit/vercel-cutover/gsc-daily/gsc-YYYY-MM-DD.csv
```

### C. Crawl stats

GSC → **Settings → Crawl stats**:
- Total crawl requests should rise modestly in the first 48h (Google re-validates the new host) then settle to baseline.
- Average response time should stay ≤ baseline (Vercel edge is faster than Lovable for static HTML — expect a small improvement).
- "By response" — `200 OK` proportion ≥ 95%; `301` proportion may rise (legacy redirects now firing at edge — correct); `5xx` must be 0.

### D. Live 404 crawl (automated)

Already wired in `.github/workflows/crawl-404.yml` to run nightly. Watch the workflow run output for the first 3 nights post-cutover. Zero new 404s expected.

---

## T+7d — Formal pass/fail review

Compile a brief report at `docs/audit/vercel-cutover/POST-CUTOVER-REPORT.md` with:

| Metric | Pre-baseline | T+7d | Δ | Pass? |
|---|---|---|---|---|
| Indexed pages | _from gsc-pages-pre.png_ | _from GSC today_ | _% change_ | ≤ -5% = pass |
| 7-day clicks | _baseline_ | _today_ | _% change_ | ≥ -10% = pass |
| 7-day impressions | _baseline_ | _today_ | _% change_ | ≥ -10% = pass |
| Avg position (top 50 queries) | _baseline_ | _today_ | _delta_ | within 2 = pass |
| Soft 404 count | _baseline_ | _today_ | _delta_ | = 0 = pass |
| Duplicate canonical | _baseline_ | _today_ | _delta_ | flat = pass |
| Sitemap "Discovered URLs" | _baseline_ | _today_ | _delta_ | within 2% = pass |

If all pass → **mark cutover complete** and update `mem://hosting/vercel-hybrid-prerender` with the cutover date. If any metric fails:

1. Open `docs/audit/vercel-cutover/RUNBOOK.md` → "Rollback procedure".
2. Triage with the relevant validator:
   - Indexing drop → `npm run check:gsc-indexing`, `npm run check:structured-data`.
   - Canonical/duplicate spike → `npm run check:unique-meta`, `npm run check:redirect-parity`.
   - 4xx/5xx spike → `npm run crawl:404`, `validate-vercel-deploy`.

---

## T+30d — Final sign-off

Repeat the T+7d table at the 30-day mark. By now Google has fully reprocessed the redirect graph and consolidated PageRank. The 30-day numbers are the official "no SEO regression" record — archive `POST-CUTOVER-REPORT.md` and close the cutover ticket.

---

## Quick reference — Local validators

| Command | What it asserts |
|---|---|
| `npm run check:redirect-parity` | Every `<Navigate>` in App.tsx has a 301 in vercel.json |
| `npm run validate:sitemap-robots` | All sitemap URLs crawlable; required hubs listed; no stale prerenders |
| `npm run check:gsc-indexing` | Sitemap submission, robots, canonicals, lastmod freshness |
| `npm run check:structured-data` | Per-page schema contracts intact across pre-rendered HTML |
| `npm run check:unique-meta` | Every page has unique title/desc/canonical |
| `npm run check:internal-links` | All internal hrefs resolve to a known route |
| `node scripts/monitor-cutover.mjs --host https://rehablookup.com --phase post` | Live edge behaves as Vercel-target |
| `VERCEL_URL=https://rehablookup.com npm run validate:vercel-deploy` | Hubs + sample + facilities serve unique pre-rendered HTML to Googlebot |

---

## Quick reference — GSC reports to keep open

- **Performance → Search results** (7d / 28d toggles)
- **Indexing → Pages** (Indexed + Why pages aren't indexed)
- **Indexing → Sitemaps**
- **Settings → Crawl stats**
- **URL Inspection** (for spot checks)
- **Settings → Ownership verification** (to re-verify if needed)
