

# Corrected Sitemap Infrastructure Plan

## Key Findings from Audit

| Component | Status | Notes |
|-----------|--------|-------|
| Database facilities | ✅ Only 2 approved | The "2 URLs" in sitemap-facilities is correct - not a bug |
| Static sitemap.xml | ✅ Valid XML, 1,657 lines | But cannot be served as-is because hosting intercepts |
| `_redirects` / `vercel.json` | ❌ Not processed | Lovable's hosting ignores these files |
| Edge functions | ✅ Working | The proven path for serving dynamic content |

## Root Cause Confirmed

Lovable's hosting routes ALL requests through the SPA before any static file handling. The `_redirects` and `vercel.json` files are configuration for Netlify/Vercel CDNs respectively - but Lovable uses its own routing layer that doesn't process these configurations.

## Corrected Solution: Generate Sitemaps Dynamically via Edge Functions

### What We WON'T Do (Per ChatGPT Feedback)
- ❌ No React route redirects (crawlers can't follow client-side redirects)
- ❌ No static string embedding (goes stale, hard to maintain)
- ❌ No exposed Supabase URLs as canonical (Google may index the function URLs)

### What We WILL Do
- ✅ Dynamic sitemap generation from a route registry
- ✅ Edge functions return XML directly with correct MIME type
- ✅ All sitemap URLs stay on rehablookup.com domain
- ✅ Proper pagination structure for future growth

---

## Implementation Steps

### Step 1: Create Dynamic Sitemap Edge Function

Create `supabase/functions/serve-sitemap/index.ts` that generates sitemaps dynamically:

**For `/sitemap-index.xml`:**
- Returns `<sitemapindex>` referencing child sitemaps
- Uses canonical rehablookup.com URLs

**For `/sitemap.xml` (main static pages):**
- Generates URLs from a route registry array (not embedded XML)
- Includes: homepage, treatment types, near-me pages, insurance pages, locations, resources
- Uses changefreq and priority based on page type
- Sets lastmod to current date (or stored value)

**For `/sitemap-facilities.xml`:**
- Queries database for approved facilities (already working - just needs proxying)

### Step 2: Update Infrastructure Config (For Documentation)

Update `_redirects` and `vercel.json` to proxy to edge functions:

```text
/sitemap.xml → https://[project-id].supabase.co/functions/v1/serve-sitemap?type=main
/sitemap-index.xml → https://[project-id].supabase.co/functions/v1/serve-sitemap?type=index
/sitemap-facilities.xml → https://[project-id].supabase.co/functions/v1/sitemap-facilities
```

**Note:** These configs may not be processed by Lovable's hosting, but they serve as documentation and will work if deployed to Netlify/Vercel directly.

### Step 3: Keep robots.txt Clean

```text
Sitemap: https://rehablookup.com/sitemap-index.xml
```

Single entry pointing to the index. Google discovers child sitemaps from there.

---

## Route Registry Structure

The edge function will use a typed route registry instead of embedded XML:

```typescript
const STATIC_ROUTES = [
  { path: "/", priority: 1.0, changefreq: "daily" },
  { path: "/rehab-centers", priority: 0.95, changefreq: "daily" },
  { path: "/locations", priority: 0.9, changefreq: "weekly" },
  { path: "/treatment-types", priority: 0.9, changefreq: "weekly" },
  // ... all 7 treatment type pages
  // ... all 20+ near-me pages  
  // ... all 10+ insurance pages
  // ... all 50 state pages (generated from US_STATES array)
  // ... resource/article pages
];
```

This is:
- Easy to update when adding new pages
- Type-safe and maintainable
- Generates proper XML at runtime

---

## Sitemap Architecture (Final)

```text
/sitemap-index.xml (submit ONLY this to Google)
│
├── /sitemap.xml (generated dynamically)
│   ├── Homepage
│   ├── /rehab-centers
│   ├── /locations
│   ├── /treatment-types/* (7 pages)
│   ├── /near-me/* (20+ pages)
│   ├── /insurance/* (10+ pages)
│   ├── /rehab-centers/{state} (50 states)
│   ├── /resources, /about, /contact, etc.
│   └── Total: ~100-150 static URLs
│
└── /sitemap-facilities.xml (database-driven)
    └── /center/{slug} (currently 2, will grow)
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/serve-sitemap/index.ts` | CREATE | Dynamic sitemap generation edge function |
| `supabase/config.toml` | MODIFY | Add `[functions.serve-sitemap]` config |
| `public/_redirects` | MODIFY | Update sitemap proxy rules |
| `public/vercel.json` | MODIFY | Update sitemap rewrite rules |

---

## Why This Approach Works

1. **Edge functions ARE processed by Lovable** - We know this because `sitemap-facilities` already returns valid XML when called directly
2. **No client-side code involved** - Edge functions return server-rendered XML
3. **Maintainable** - Route changes in app = update the registry array
4. **Scalable** - Pagination ready for when you have thousands of facilities
5. **Canonical URLs** - All sitemaps served from rehablookup.com domain

---

## Verification Checklist (Post-Deploy)

1. Open in browser - must show raw XML (not HTML):
   - `/sitemap-index.xml`
   - `/sitemap.xml`
   - `/sitemap-facilities.xml`

2. Check response headers (DevTools → Network):
   - `Content-Type: application/xml`

3. Count URLs:
   - Main sitemap should have ~100-150 URLs
   - Facilities sitemap has 2 (correct for current DB)

4. Submit to Google Search Console:
   - Submit ONLY `/sitemap-index.xml`
   - Should show "Success" and discovered URLs

