
# Critical SEO Infrastructure Fix

## Problem Identified
The `vercel.json` configuration lacks explicit sitemap handling. While `_redirects` (Netlify) has proper rules, the Vercel/Lovable deployment config relies on a fragile regex pattern that may not correctly exclude XML files in all scenarios, causing sitemaps to return HTML instead of XML.

## Root Cause Analysis
| File | Status | Issue |
|------|--------|-------|
| `public/_redirects` | ✅ Correct | Has explicit sitemap rules before catch-all |
| `public/vercel.json` | ❌ Missing | No explicit sitemap rewrites - relies on regex |
| `public/robots.txt` | ✅ Correct | Single sitemap index declaration |
| `sitemap-facilities` edge function | ✅ Working | Returns valid XML (verified) |

## Solution

### Step 1: Add Explicit Sitemap Rewrites to vercel.json

Add rewrites that explicitly serve sitemap files BEFORE the SPA catch-all:

```json
"rewrites": [
  { "source": "/sitemap.xml", "destination": "/sitemap.xml" },
  { "source": "/sitemap-index.xml", "destination": "/sitemap-index.xml" },
  { 
    "source": "/sitemap-facilities.xml", 
    "destination": "https://plckxokpyiubuekvodtc.supabase.co/functions/v1/sitemap-facilities" 
  },
  {
    "source": "/((?!api|_next|static|.*\\..*).*)",
    "destination": "/index.html"
  }
]
```

### Step 2: Add Content-Type Headers for XML Files

Add headers to ensure XML files are served with the correct MIME type:

```json
{
  "source": "/(sitemap.*\\.xml)",
  "headers": [
    { "key": "Content-Type", "value": "application/xml; charset=utf-8" },
    { "key": "Cache-Control", "value": "public, max-age=3600" }
  ]
}
```

## Files to Modify

| File | Change |
|------|--------|
| `public/vercel.json` | Add explicit sitemap rewrites and XML headers |

## Technical Details

The updated `vercel.json` rewrites section will:
1. Explicitly handle `/sitemap.xml` → serve static file
2. Explicitly handle `/sitemap-index.xml` → serve static file  
3. Proxy `/sitemap-facilities.xml` → edge function
4. Fall through to SPA catch-all for all other non-file routes

The headers section will ensure proper MIME type for all sitemap XML files.

## Expected Outcome

After publishing:
- `https://rehablookup.com/sitemap.xml` → Returns XML (1,657 URLs)
- `https://rehablookup.com/sitemap-index.xml` → Returns XML (index)
- `https://rehablookup.com/sitemap-facilities.xml` → Returns XML (2 facilities)

## Verification Steps
1. Publish the changes
2. Test each sitemap URL returns `Content-Type: application/xml`
3. Verify in Google Search Console that sitemap-index.xml can be read
4. Submit only `https://rehablookup.com/sitemap-index.xml` to GSC

## Sitemap Architecture Summary

```text
sitemap-index.xml (submit this to Google)
    ├── sitemap.xml (static - 1,657 URLs)
    │   ├── Homepage
    │   ├── Treatment Types (7 pages)
    │   ├── Near-Me Pages (18+ variations)
    │   ├── Insurance Pages (10+ pages)
    │   ├── Location Pages (50 states + cities)
    │   └── Resources/Articles
    │
    └── sitemap-facilities.xml (dynamic - edge function)
        └── /center/{slug} profile pages
```
