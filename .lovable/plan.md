# Sitemap Infrastructure - FIXED ✅

## Current Status (Updated 2026-02-04)

| Component | Status | Evidence |
|-----------|--------|----------|
| `sitemap-facilities` edge function | ✅ WORKING | Version v2.2.0 deployed, returns valid XML |
| `?type=index` endpoint | ✅ WORKING | Returns sitemap index with 2 child sitemaps |
| `?type=main` endpoint | ✅ WORKING | Returns main sitemap with 233 URLs |
| `?type=facilities` endpoint | ✅ WORKING | Returns facilities sitemap with approved facilities |
| `X-Robots-Tag: noindex` | ✅ REMOVED | No longer blocks crawler processing |
| `_redirects` / `vercel.json` | ✅ Configured | Proxies sitemap requests to edge function |

## Verified Endpoints

All sitemap endpoints return valid XML with proper headers:

```text
# Direct Supabase function URLs (always work):
https://plckxokpyiubuekvodtc.supabase.co/functions/v1/sitemap-facilities?type=index
https://plckxokpyiubuekvodtc.supabase.co/functions/v1/sitemap-facilities?type=main
https://plckxokpyiubuekvodtc.supabase.co/functions/v1/sitemap-facilities

# Production URLs (after publishing):
https://rehablookup.com/sitemap-index.xml  → proxy to ?type=index
https://rehablookup.com/sitemap.xml        → proxy to ?type=main  
https://rehablookup.com/sitemap-facilities.xml → proxy to ?type=facilities
```

## Sitemap Architecture

```text
https://rehablookup.com/sitemap-index.xml
│
├── https://rehablookup.com/sitemap.xml (233 URLs)
│   ├── Homepage (priority 1.0)
│   ├── /rehab-centers (priority 0.95)
│   ├── 30+ "near-me" landing pages
│   ├── 50 state pages (/rehab-centers/{state})
│   ├── 30 major city pages
│   ├── 17+ treatment type pages
│   ├── 13+ insurance pages
│   ├── 17+ international SEO pages (/us-rehab/*)
│   ├── 30+ resource articles
│   └── Core marketing pages
│
└── https://rehablookup.com/sitemap-facilities.xml
    └── /center/{slug} facility profiles (currently 2 approved)
```

## Changes Made

1. **Added version tracking** - `X-Sitemap-Version` header for deployment verification
2. **Removed `X-Robots-Tag: noindex`** - Was preventing crawler processing
3. **Added XML comment timestamps** - Helps debug caching issues
4. **Verified all three sitemap types** - index, main, and facilities all working

## Next Step: Publish

**You must publish the app** to make these changes live on rehablookup.com:
1. Click the **Publish** button in Lovable
2. After publishing, verify the production URLs in your browser
3. Submit `https://rehablookup.com/sitemap-index.xml` to Google Search Console

## Google Search Console Submission

After publishing, submit the sitemap:
1. Go to Google Search Console → Sitemaps
2. Add: `https://rehablookup.com/sitemap-index.xml`
3. Expected result: "Success" with ~235 discovered URLs
