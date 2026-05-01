---
name: Vercel hybrid prerender hosting
description: Production hosts on Vercel; vercel.json uses cleanUrls + filesystem-first; both /path.html and /path/index.html are valid prerenders.
type: feature
---
RehabLookup production hosts on Vercel (migrated from Lovable Hosting in v8 to fix extensionless prerender serving).

**Hybrid prerender layout — both are valid:**
- Flat: `public/<path>.html`
- Nested: `public/<path>/index.html`

Vercel's `cleanUrls: true` + filesystem-first behavior serves either format for `/path` (extensionless URLs). Always-canonical extensionless. Never include `.html` URLs in sitemap.

**Single source of truth for prerender discovery:** `scripts/lib/prerender-discovery.mjs`. All validators (`validate-sitemap-robots`, `check-gsc-indexing`, `check-structured-data`) and `generate-sitemaps.mjs` import from it. Never hand-roll a `readdirSync(public).filter(.html)` again — it misses the nested layout.

**Sitemap truthfulness:** `generate-sitemaps.mjs` filters URLs to those with real prerender coverage OR runtime allowlist (`/`, `/rehab-centers`, `/about`, etc.) OR dynamic prefix (`/center/`). It also patches the false count claim in `robots.txt` header on every build.

**Post-deploy validation:** `npm run validate:vercel-deploy` (script: `scripts/validate-vercel-deploy.mjs`) crawls a Vercel URL with Googlebot UA + browser UA and detects "shell leaks" (routes serving the SPA shell instead of prerendered HTML). Run after every production deploy.

**Why:** Lovable Hosting served the SPA shell for extensionless URLs even when prerendered HTML existed. Vercel's filesystem-first model fixes this without custom CDN logic.
