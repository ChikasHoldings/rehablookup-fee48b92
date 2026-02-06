
# Fix: sitemap-facilities.xml Google Search Console Fetch Error

## Problem Summary
Google Search Console cannot fetch `https://rehablookup.com/sitemap-facilities.xml`. The URL returns a React SPA 404 page instead of XML content.

## Root Causes Identified

1. **Static files blocking dynamic sitemaps**: The files `public/sitemap.xml` and `public/sitemap-index.xml` are being served as static files, bypassing the Netlify redirect rules that should proxy to the edge function

2. **Edge function deployment gap**: The `sitemap-facilities` edge function was not deployed to Supabase (confirmed 404 on direct calls), though the code exists in the repository

3. **Redirect cascade failure**: Without the edge function available, `/sitemap-facilities.xml` falls through to the SPA catch-all rule `/* /index.html 200`

## Solution

### Step 1: Remove Static Sitemap Files
Delete these files that conflict with dynamic sitemap generation:
- `public/sitemap.xml` (1,657 lines of static content dated 2026-02-03)
- `public/sitemap-index.xml` (16 lines)

This ensures all sitemap requests route through the edge function for fresh, database-driven content.

### Step 2: Verify Edge Function Deployment
The `sitemap-facilities` edge function has been deployed. Confirm it responds correctly:
- `?type=main` returns static pages sitemap (~230 URLs)
- `?type=index` returns sitemap index referencing main + facilities
- `?type=facilities` returns database-driven facility URLs

### Step 3: Update Version for Cache Busting
Increment the edge function version from `v2.2.0` to `v2.3.0` to ensure fresh deployment and enable verification in logs.

---

## Technical Details

### Files to Delete
```text
public/sitemap.xml
public/sitemap-index.xml
```

### Edge Function Changes
**File**: `supabase/functions/sitemap-facilities/index.ts`
- Update `VERSION` constant from `"v2.2.0"` to `"v2.3.0"`

### Redirect Rules (Already Correct)
```text
/sitemap.xml → edge function ?type=main
/sitemap-index.xml → edge function ?type=index  
/sitemap-facilities.xml → edge function ?type=facilities
```

---

## Verification Steps

After deployment:
1. Fetch `https://rehablookup.com/sitemap-facilities.xml` - should return valid XML with facility URLs
2. Fetch `https://rehablookup.com/sitemap.xml` - should return dynamic main sitemap (~230 URLs)
3. Fetch `https://rehablookup.com/sitemap-index.xml` - should return sitemap index
4. Check response header `X-Sitemap-Version` equals `v2.3.0`
5. Resubmit sitemap in Google Search Console

---

## Expected Outcome
- All three sitemap URLs return valid XML with `Content-Type: application/xml`
- Google Search Console successfully fetches and indexes all sitemaps
- Facility profiles are properly indexed with image sitemaps
- Dynamic content updates automatically as facilities are added/modified
