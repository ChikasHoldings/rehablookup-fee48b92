
# SEO Launch Readiness: Sitemap Update and Final Optimization

## Executive Summary

This plan updates the sitemap with current dates, removes blocked pages, adds missing routes, and ensures the platform is fully optimized for search engine launch.

---

## Part 1: Sitemap Date Normalization

Update all `lastmod` dates to **2026-02-03** (today's date) across:

| File | Action |
|------|--------|
| `public/sitemap.xml` | Update ~200 lastmod entries |
| `public/sitemap-index.xml` | Update both sitemap references |

This signals fresh content to search engines and ensures consistency.

---

## Part 2: Remove Blocked Pages from Sitemap

These pages are blocked in robots.txt but currently appear in sitemap.xml (lines 1265-1293):

| Remove | Reason |
|--------|--------|
| `/auth` | Auth page - blocked in robots.txt |
| `/signup` | Auth page - blocked in robots.txt |
| `/provider-login` | Auth page - blocked in robots.txt |
| `/lp/treatment` | Ad landing page - blocked in robots.txt |
| `/lp/social` | Ad landing page - blocked in robots.txt |

Keeping blocked pages in sitemap sends mixed signals to crawlers.

---

## Part 3: Add Missing Pages to Sitemap

**International Placement Pages** (high-value conversion funnels):
```text
/international              (priority: 0.85)
/international/apply        (priority: 0.80)
```

**Static HTML Insurance Pages** (already created, need sitemap entries):
- All 5 insurance static pages are already in sitemap - verified

---

## Part 4: Sitemap Index Update

Update `public/sitemap-index.xml`:
- Change lastmod to 2026-02-03 for both referenced sitemaps

---

## Files to Modify

| File | Changes |
|------|---------|
| `public/sitemap.xml` | Update ~200 dates, remove 5 blocked pages, add 2 international pages |
| `public/sitemap-index.xml` | Update 2 dates |

---

## Technical Implementation

### sitemap.xml Updates

1. **Global Date Update**: Replace all `2025-12-21`, `2025-12-22`, `2026-01-31`, `2026-02-01`, `2026-02-02` with `2026-02-03`

2. **Remove Auth/Ad Pages** (around lines 1265-1293):
```xml
<!-- DELETE these entries -->
<url><loc>https://rehablookup.com/auth</loc>...</url>
<url><loc>https://rehablookup.com/signup</loc>...</url>
<url><loc>https://rehablookup.com/provider-login</loc>...</url>
<url><loc>https://rehablookup.com/lp/treatment</loc>...</url>
<url><loc>https://rehablookup.com/lp/social</loc>...</url>
```

3. **Add International Pages** (after Provider Pages section):
```xml
<!-- International Placement Pages -->
<url>
  <loc>https://rehablookup.com/international</loc>
  <lastmod>2026-02-03</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.85</priority>
</url>

<url>
  <loc>https://rehablookup.com/international/apply</loc>
  <lastmod>2026-02-03</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.80</priority>
</url>
```

### sitemap-index.xml Updates

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://rehablookup.com/sitemap.xml</loc>
    <lastmod>2026-02-03</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://plckxokpyiubuekvodtc.supabase.co/functions/v1/sitemap-facilities</loc>
    <lastmod>2026-02-03</lastmod>
  </sitemap>
</sitemapindex>
```

---

## SEO Launch Checklist

After implementation, the platform will have:

| Component | Status |
|-----------|--------|
| Homepage with Organization + WebSite schema | Ready |
| Dynamic facility sitemap (edge function) | Ready |
| Static sitemap with all public pages | Ready |
| FAQPage schema on insurance + provider pages | Ready |
| LocalBusiness schema on facility profiles | Ready |
| Robots.txt with crawler directives | Ready |
| Google Search Console verification | Ready |
| IndexNow integration | Ready |
| Prerendering for crawlers | Ready |
| Canonical URL normalization | Ready |
| noindex on auth/loading states | Ready |

---

## Expected Impact

- **Crawl efficiency**: Removing blocked pages reduces wasted crawl budget
- **Freshness signals**: Updated dates indicate active maintenance
- **Coverage**: International pages now discoverable
- **Consistency**: No conflicts between sitemap and robots.txt

---

## Post-Implementation Steps

1. Submit updated sitemap to Google Search Console
2. Trigger IndexNow notification for updated pages
3. Monitor Search Console for crawl stats over 7 days
4. Verify international pages appear in coverage report
