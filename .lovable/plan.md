

# Fix Sitemap Infrastructure: Edge Function Deployment Issue

## Current Status

| Component | Status | Evidence |
|-----------|--------|----------|
| `sitemap-facilities` edge function | ✅ WORKING | Returns valid XML with 2 facility URLs |
| `serve-sitemap` edge function | ❌ NOT DEPLOYED | Returns 404 despite "successful" deployment |
| `_redirects` / `vercel.json` | ⚠️ Configured | But Lovable hosting doesn't process these files |
| `robots.txt` | ✅ Correct | Points to `sitemap-index.xml` |

## Root Cause

The `serve-sitemap` edge function is not actually deployed to production. The deployment tool reports success, but the function returns 404. This likely means:

1. **The app hasn't been published** - Edge function code changes require publishing to deploy to production
2. The preview environment may have different function availability than production

## Solution: Two-Part Fix

### Part 1: Publish the App (Required)

**You must publish the app** to deploy the `serve-sitemap` edge function to production:
1. Click the **Publish** button in Lovable
2. Wait for the build to complete
3. This deploys the edge function to the production Supabase instance

### Part 2: Verify After Publishing

After publishing, test the following URLs directly in your browser:

```text
https://plckxokpyiubuekvodtc.supabase.co/functions/v1/serve-sitemap?type=index
https://plckxokpyiubuekvodtc.supabase.co/functions/v1/serve-sitemap?type=main
https://plckxokpyiubuekvodtc.supabase.co/functions/v1/sitemap-facilities
```

All three should return valid XML. If they do, the proxy configuration in `_redirects` should work on the production site.

---

## If Edge Function Still Fails After Publishing

If `serve-sitemap` still returns 404 after publishing, we have a fallback plan:

### Fallback: Consolidate Into Single Working Function

Since `sitemap-facilities` is confirmed working, we can modify it to serve ALL sitemaps:

```text
/sitemap-facilities?type=index → sitemap index XML
/sitemap-facilities?type=main → main sitemap XML  
/sitemap-facilities (default) → facilities sitemap XML
```

This consolidates everything into the one function we know works.

### Files to Modify (Fallback Only)

| File | Change |
|------|--------|
| `supabase/functions/sitemap-facilities/index.ts` | Add route handling for `type` parameter |
| `public/_redirects` | Update proxy URLs to point to `sitemap-facilities` |
| `public/vercel.json` | Update rewrite destinations |

---

## Expected Sitemap Architecture

```text
https://rehablookup.com/sitemap-index.xml
│
├── https://rehablookup.com/sitemap.xml
│   ├── Homepage (priority 1.0)
│   ├── /rehab-centers (priority 0.95)
│   ├── /locations (priority 0.9)
│   ├── 7 treatment type pages
│   ├── 18 near-me pages
│   ├── 10 insurance pages
│   ├── 50 state pages (/rehab-centers/{state})
│   └── Legal/resource pages
│   → Total: ~100 URLs
│
└── https://rehablookup.com/sitemap-facilities.xml
    └── /center/{slug} facility profiles
    → Currently: 2 URLs (matches approved facilities in database)
```

---

## Verification Checklist

After publishing and implementing any fixes:

1. **Direct Function Test** (browser):
   - `https://plckxokpyiubuekvodtc.supabase.co/functions/v1/serve-sitemap?type=index` → XML
   - `https://plckxokpyiubuekvodtc.supabase.co/functions/v1/serve-sitemap?type=main` → XML
   - `https://plckxokpyiubuekvodtc.supabase.co/functions/v1/sitemap-facilities` → XML

2. **Production URL Test** (browser):
   - `https://rehablookup.com/sitemap-index.xml` → XML
   - `https://rehablookup.com/sitemap.xml` → XML
   - `https://rehablookup.com/sitemap-facilities.xml` → XML

3. **Response Headers** (DevTools → Network):
   - `Content-Type: application/xml`

4. **Google Search Console**:
   - Submit `https://rehablookup.com/sitemap-index.xml`
   - Should show "Success" with discovered URLs

---

## Immediate Action Required

**Step 1**: Click **Publish** to deploy the `serve-sitemap` edge function

**Step 2**: After publish completes, test the direct Supabase function URLs in browser

**Step 3**: If still failing, reply here and I'll implement the fallback (consolidate into `sitemap-facilities`)

