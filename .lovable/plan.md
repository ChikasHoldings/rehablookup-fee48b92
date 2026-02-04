
# Sitemap Configuration Fix Plan

## Problem Summary
The sitemap URLs are returning HTML content instead of XML because the SPA catch-all redirect rule (`/* /index.html 200`) intercepts requests before static files can be served. This is blocking Google and Bing from discovering your pages.

## Solution Overview
Add explicit rewrite rules for all sitemap files that execute BEFORE the catch-all, ensuring crawlers receive valid XML with the correct content type.

## Implementation Steps

### Step 1: Update `_redirects` File
Add explicit rules for sitemap files near the top of the file, before any catch-all rules:

```text
# Sitemaps - Must be served BEFORE SPA catch-all
/sitemap.xml /sitemap.xml 200
/sitemap-index.xml /sitemap-index.xml 200
/sitemap-facilities.xml https://plckxokpyiubuekvodtc.supabase.co/functions/v1/sitemap-facilities 200
```

The full `_redirects` file will be reorganized with this priority order:
1. Trailing slash removal
2. **Sitemap explicit rules (NEW)**
3. Canonical redirects
4. Static HTML pages
5. SPA catch-all (last)

### Step 2: Simplify `robots.txt` Sitemap Declaration
Update robots.txt to declare only one primary sitemap - the index file:

```text
# SITEMAPS - Single canonical entry pointing to the index
Sitemap: https://rehablookup.com/sitemap-index.xml
```

This is the recommended approach because:
- The sitemap index already references the other sitemaps
- Google will discover all child sitemaps from the index
- Reduces potential for duplicate declarations causing issues

### Step 3: Update `sitemap-index.xml` (Optional Enhancement)
Ensure the sitemap index has the correct lastmod dates that reflect actual content updates.

## Files to Modify

| File | Change |
|------|--------|
| `public/_redirects` | Add explicit sitemap rules before catch-all |
| `public/robots.txt` | Simplify to single sitemap declaration |

## Verification Steps
After deployment:
1. Test `https://rehablookup.com/sitemap.xml` returns XML (not HTML)
2. Test `https://rehablookup.com/sitemap-index.xml` returns XML
3. Test `https://rehablookup.com/sitemap-facilities.xml` returns XML
4. Resubmit sitemap-index.xml to Google Search Console

## Final Sitemap URLs for Google Search Console
Submit only this URL:
- **https://rehablookup.com/sitemap-index.xml**

Google will automatically discover:
- `sitemap.xml` (static pages, treatment types, locations, near-me, insurance, resources)
- `sitemap-facilities.xml` (all facility profile pages via edge function)

## Technical Notes
- The edge function for `sitemap-facilities` is working correctly (verified - returns valid XML with 2 facilities)
- Static sitemap.xml contains 1,657 lines covering all page types
- No changes needed to edge function code
