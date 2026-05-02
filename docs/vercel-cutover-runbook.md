# Vercel DNS Cutover Runbook

This document is the single source of truth for moving `rehablookup.com` from Lovable hosting (Cloudflare-fronted A record `185.158.133.1`) to Vercel **without breaking SEO**.

> **Current state (verified 2026-05-02)**
> - Apex `rehablookup.com` → Cloudflare → Lovable origin `185.158.133.1`
> - `www.rehablookup.com` → 301 → apex (handled in `vercel.json` and Lovable)
> - Sitemaps + `robots.txt` already use absolute `https://rehablookup.com/...` URLs (host-agnostic — DNS swap won't invalidate them)
> - `vercel.json` is the source of truth for redirects, headers, and SPA fallback

---

## Pre-cutover checklist (do these BEFORE touching DNS)

### 1. Vercel project ready
- [ ] Vercel project imports this repo and builds green on `main` (`npm run build:vercel`)
- [ ] Vercel deployment URL (e.g. `rehablookup.vercel.app`) returns **200** on `/`
- [ ] Add `rehablookup.com` and `www.rehablookup.com` as domains in Vercel project (will show "Invalid Configuration" until DNS is changed — that is expected)
- [ ] Vercel Project Settings → set **Production Domain** to `rehablookup.com`

### 2. Smoke-test the Vercel deployment URL
Run against the `*.vercel.app` URL **before** changing DNS:
```bash
HOST=https://rehablookup.vercel.app npm run check:vercel-cutover
```
This must pass: SPA fallback, sitemap, robots, redirects, security headers, canonical.

> **Note**: the `www → apex 301` check is automatically skipped when HOST is not the apex. It is verified in step 5.

### 3. Lower TTL (24+ hours before cutover)
At your DNS provider, drop TTL on the existing apex A record and `www` record to **300 seconds (5 min)** so a rollback propagates fast.

### 4. Confirm 301 inventory matches `vercel.json`
```bash
npm run check:redirect-parity
```
Already part of the build pipeline — make sure CI is green.

### 5. Confirm canonical/sitemap host
- All `<link rel="canonical">` tags resolve to `https://rehablookup.com` (verified by `npm run check:unique-meta` and the `canonical` step inside `check:vercel-cutover`).
- `public/sitemap*.xml` and `public/robots.txt` reference `https://rehablookup.com` only — **do not** introduce `vercel.app` URLs into either.

---

## DNS records to set on cutover

Replace the existing Lovable A record (`185.158.133.1`) with Vercel's records.

> Vercel's published DNS targets — **always confirm in the Vercel dashboard before changing**, since Vercel may show project-specific values.

| Type  | Name | Value                       | TTL |
|-------|------|-----------------------------|-----|
| A     | @    | `76.76.21.21` (Vercel apex) | 300 |
| CNAME | www  | `cname.vercel-dns.com`      | 300 |

Optional but recommended:
- AAAA record for the apex if Vercel's dashboard provides one for the project.
- CAA records: ensure `letsencrypt.org` and `digicert.com` are allowed (or remove existing CAA blocks if any). Vercel issues certs via Let's Encrypt.

### What to remove
- **Cloudflare proxy**: turn the proxy OFF (gray cloud) or delete the Cloudflare DNS records before cutover. Leaving Cloudflare in front of Vercel is supported but adds a hop and may interfere with Vercel-managed SSL — only keep it if you intentionally want CF in front.
- Any stale A records pointing to `185.158.133.1`.

---

## Cutover order (do these in sequence)

1. **Final pre-flight** on Vercel preview: `HOST=https://<project>.vercel.app npm run check:vercel-cutover`
2. **Update DNS** at your registrar — apex A → `76.76.21.21`, www CNAME → `cname.vercel-dns.com`.
3. **Wait for propagation** — usually 1–10 minutes with TTL=300. Verify with:
   ```bash
   dig +short rehablookup.com A         # expect 76.76.21.21
   dig +short www.rehablookup.com CNAME # expect cname.vercel-dns.com.
   ```
4. **Vercel issues SSL** — usually 30s–5 min after DNS resolves. The Vercel dashboard will flip the domain to "Valid Configuration".
5. **Run the live smoke test** against the real domain:
   ```bash
   HOST=https://rehablookup.com npm run check:vercel-cutover
   ```
   This run includes the `www → apex 301` check.
6. **Run the full sitemap crawl** against the cut-over domain to verify all 31k URLs:
   ```bash
   BASE_URL=https://rehablookup.com CONCURRENCY=24 node scripts/crawl-live-404s.mjs
   ```
7. **Resubmit sitemaps in Google Search Console** (sitemap content didn't change, but a re-submit forces a fresh crawl):
   - `https://rehablookup.com/sitemap-index.xml`
8. **Check GSC Coverage** 24–48 h later for any new "Page with redirect" / "Not found (404)" / "Server error (5xx)" entries.

---

## Rollback (if anything is wrong)

Because TTL is 300 seconds:
1. At the registrar, set apex A back to `185.158.133.1` and remove the www CNAME (or set it to your previous Cloudflare value).
2. Within ~5 min, traffic returns to Lovable hosting.
3. Vercel can stay configured with the domain — no harm in leaving it; just remove if you decide not to migrate.

---

## SEO impact summary

| Concern                                | Why it's safe                                                                       |
|----------------------------------------|--------------------------------------------------------------------------------------|
| Canonical URLs                         | All canonicals are absolute on `rehablookup.com` — host-agnostic                     |
| Sitemap                                | All `<loc>` entries already use `https://rehablookup.com` — host-agnostic            |
| robots.txt                             | `Host:` and `Sitemap:` already point to `rehablookup.com`                            |
| 301 redirect graph                     | All redirects live in `vercel.json` and are gated by `check:redirect-parity` in CI   |
| `www` → apex                           | Vercel honors the `host:www.rehablookup.com` redirect rule in `vercel.json`          |
| Trailing-slash → no-slash              | Same — already in `vercel.json`                                                      |
| Pre-rendered HTML for crawlers         | All `*.html` are baked into `dist/` by `npm run build:vercel`                        |
| HSTS / nosniff / X-Frame-Options       | Same headers configured in `vercel.json`                                             |
| Long-cache asset headers               | `/assets/*` and image extensions get 1y immutable in `vercel.json`                   |

The only files that would break if forgotten: the build hooks (`generate:seo-html`, `generate:facility-profiles-html`, `generate:sitemaps`, `patch:og-image`) **must** run as part of `build:vercel` — already wired.

---

## Post-cutover monitoring (week 1)

- Daily for 7 days: `BASE_URL=https://rehablookup.com node scripts/crawl-live-404s.mjs` (already runnable on demand; nightly job continues to run).
- GSC Coverage report — watch for spikes in 404 / soft-404 / redirect issues.
- Vercel Analytics — watch p95 TTFB; expected to drop vs. Cloudflare→Lovable origin path.
