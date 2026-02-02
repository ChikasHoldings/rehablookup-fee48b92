
# SEO Launch Readiness: Prerendering & Crawlability Fix

## Problem Summary
The ChatGPT audit correctly identified a **critical SEO issue**: the site is a pure client-rendered Single Page Application (SPA). Search engine crawlers see only a generic HTML shell (`index.html`) instead of page-specific content. This causes:
- Poor search rankings despite having excellent content
- Social share previews showing generic metadata
- Near-identical HTML across all URLs (soft duplicate detection)
- Provider acquisition pages (`/for-providers`) invisible to crawlers

## Current State Analysis

### What Crawlers Actually See
```text
┌─────────────────────────────────────────┐
│ Generic index.html Shell                │
│ ├─ Title: "RehabLookup - Find..."       │
│ ├─ Meta: Generic description            │
│ ├─ <noscript> fallback links            │
│ └─ Empty #root div                      │
│                                         │
│ JavaScript then renders:                │
│ ├─ Actual page content (unseen by bots) │
│ ├─ Dynamic meta tags (unseen)           │
│ └─ Structured data (unseen)             │
└─────────────────────────────────────────┘
```

### What's Already Good
- `<noscript>` fallback with navigation links
- Rich structured data schemas in index.html
- react-helmet-async for dynamic meta (only works after JS loads)
- Comprehensive sitemap infrastructure

### Issues to Fix
1. **Hardcoded year in noscript fallback**: `© 2025` should be `© 2026`
2. **No server-side rendering**: Page content invisible to crawlers
3. **Generic HTML for all routes**: Causes soft duplicate detection

---

## Implementation Plan

### Phase 1: Immediate Fixes (Quick Wins)

#### 1.1 Fix Hardcoded Year in index.html
Update the noscript fallback footer from 2025 to 2026 to appear current.

#### 1.2 Enhance Static HTML Content
Add more comprehensive fallback content to index.html that provides crawlers with substantive information even without JavaScript.

### Phase 2: Edge Function Prerendering

Create a `prerender-for-bots` edge function that:
1. Detects crawler user agents (Googlebot, Bingbot, etc.)
2. For bot requests, calls a web rendering service to get fully-rendered HTML
3. Returns the pre-rendered HTML with all content, meta tags, and structured data
4. For regular users, returns the standard SPA

```text
┌────────────────┐     ┌─────────────────────┐
│  User Request  │────▶│  Netlify/Vercel     │
└────────────────┘     │  Edge Middleware    │
                       └─────────┬───────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
   ┌──────────┐           ┌──────────────┐       ┌──────────────┐
   │ Is Bot?  │──Yes─────▶│ Call Render  │──────▶│ Return Pre-  │
   │          │           │ Service API  │       │ rendered HTML│
   └──────────┘           └──────────────┘       └──────────────┘
         │
         │ No
         ▼
   ┌──────────────┐
   │ Serve SPA    │
   │ (index.html) │
   └──────────────┘
```

#### Priority Routes for Prerendering
1. Homepage (`/`)
2. Search directory (`/rehab-centers`, `/rehab-centers/:state`, `/rehab-centers/:state/:city`)
3. Treatment types (`/treatment-types/*`)
4. Provider acquisition (`/for-providers`)
5. Insurance pages (`/insurance/*`)
6. Concierge service (`/concierge`)
7. Near-me SEO pages (`/drug-rehab-near-me`, etc.)
8. Articles (`/resources/:article`)

### Phase 3: Build-Time Static Generation (Long-term)

Investigate adding `vite-plugin-html-prerender` to the build pipeline:
- Generates static HTML files at build time
- No runtime overhead
- Guaranteed crawlability

---

## Technical Implementation Details

### Edge Function: `prerender-for-bots`

```typescript
// Bot detection patterns
const BOT_PATTERNS = [
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 
  'baiduspider', 'yandexbot', 'facebot', 'twitterbot',
  'linkedinbot', 'whatsapp', 'telegrambot'
];

// Check if request is from a bot
function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some(bot => ua.includes(bot));
}

// Render page using external service
async function renderPage(url: string): Promise<string> {
  // Use Firecrawl, Browserless, or similar service
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url,
      formats: ['html'],
      waitFor: 3000
    })
  });
  return response.json();
}
```

### Deployment Configuration

For **Vercel** (`vercel.json`), add edge middleware:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "has": [
        { "type": "header", "key": "user-agent", "value": ".*bot.*" }
      ],
      "destination": "/api/prerender?path=/$1"
    }
  ]
}
```

For **Netlify** (`_redirects`), add edge function routing:
```
# Route bot traffic to prerender function
/* /.netlify/functions/prerender-for-bots 200! Conditions: UserAgent=*bot*
```

---

## Alternative: Enhanced Static Content (No External Service)

If external rendering services aren't feasible, significantly enhance the index.html noscript content:

### Per-Route Static Fallbacks
Embed route-specific content summaries directly in index.html:
- Add hidden `<template>` elements with page content
- Include key headings, descriptions, and internal links
- Ensure structured data covers all major page types

---

## Verification Checklist

After implementation, verify with these tests:

1. **View Source Test**: "View Source" on any page shows actual content
2. **Google Search Console**: URL Inspection shows "Page is indexable" with content
3. **Mobile-Friendly Test**: Google's tool renders content correctly
4. **Social Debuggers**: Facebook, Twitter, LinkedIn show correct previews
5. **Performance**: Lighthouse scores maintained after changes

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `index.html` | Modify | Fix year, enhance noscript content |
| `supabase/functions/prerender-for-bots/index.ts` | Create | Bot detection & rendering |
| `public/vercel.json` | Modify | Add bot routing rules |
| `public/_redirects` | Modify | Add Netlify bot routing |

---

## Dependencies & Secrets Required

- **FIRECRAWL_API_KEY** (or similar rendering service): Required for edge function prerendering
- Alternative: Browserless.io, ScrapingBee, or Puppeteer-based serverless function

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| External service costs | Medium | Use caching, limit to key routes |
| Rendering latency for bots | Low | Cache rendered pages for 1 hour |
| False positive bot detection | Low | Use comprehensive user-agent list |
| Service rate limits | Medium | Implement request queuing |

---

## Recommended Immediate Actions

1. **Fix the year** in index.html noscript (© 2025 → © 2026)
2. **Add a FIRECRAWL_API_KEY secret** (or alternative service)
3. **Create prerender-for-bots edge function**
4. **Update deployment config** for bot routing
5. **Test with Google Search Console** URL Inspection tool

This plan addresses all issues raised in the SEO audit and will make your pages crawlable and indexable for search engines.
