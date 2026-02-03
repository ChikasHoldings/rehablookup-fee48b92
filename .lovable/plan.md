
# SEO Crawler Visibility Enhancement Plan

## Overview
This plan addresses gaps in crawler accessibility for high-value placement pages and adds redundancy to ensure search engines can index critical conversion routes.

## Part 1: Add International Routes to Prerendering (Critical)

**File**: `supabase/functions/prerender-for-bots/index.ts`

Update `SEO_EXACT_ROUTES` to include international placement pages:

```typescript
const SEO_EXACT_ROUTES = [
  '/',
  '/for-providers',
  '/concierge',
  '/international',        // ADD
  '/international/apply',  // ADD
  '/about',
  '/contact',
  // ... rest unchanged
];
```

This ensures crawlers hitting `/international` trigger the prerendering pipeline.

---

## Part 2: Create Static HTML for Critical Conversion Pages

### File 1: `public/concierge.html`
- Title: "Find Treatment That Fits | Concierge Placement Service"
- Content: Service description, 3-step process, FAQs, testimonials
- Schema: FAQPage + Service JSON-LD
- CTA: Link to intake form

### File 2: `public/international.html`
- Title: "U.S. Treatment Placement for International Clients | RehabLookup"
- Content: Service benefits, trust stats, destination links, FAQs
- Schema: FAQPage + Service JSON-LD
- CTA: Link to application form

---

## Part 3: Update Routing to Serve Static Files

**File**: `public/_redirects`

Add routes for static placement pages:

```
/concierge /concierge.html 200
/international /international.html 200
```

This ensures crawlers receive static HTML content while users still get the React app.

---

## Part 4: Update Sitemap with International Routes

Verify these are in `public/sitemap.xml` (confirmed already added):
- `https://rehablookup.com/international`
- `https://rehablookup.com/international/apply`

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/prerender-for-bots/index.ts` | Modify | Add `/international` routes |
| `public/concierge.html` | Create | Static fallback with FAQPage schema |
| `public/international.html` | Create | Static fallback with FAQPage schema |
| `public/_redirects` | Modify | Route static files to crawlers |

---

## Static Page Content Structure

### concierge.html Structure
```
- Header with navigation
- Hero: "Find Treatment That Fits" + value prop
- How It Works: 3-step process
- Benefits section: 4 key benefits
- Testimonials: 3 client quotes
- FAQ section: 4 common questions (with FAQPage schema)
- CTA: Start intake form
- Footer
```

### international.html Structure
```
- Header with navigation
- Hero: "Your Gateway to American Rehab"
- Trust stats: 50+ countries, 200+ facilities, 24hr response
- Why US Treatment: 4 advantages
- How It Works: 3-step process
- US Destinations: Links to /us-rehab/* pages
- FAQ section: 5 questions (with FAQPage schema)
- CTA: Start application
- Footer
```

---

## Schema Implementation

Both static files will include:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "...",
      "acceptedAnswer": { "@type": "Answer", "text": "..." }
    }
  ]
}
</script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "...",
  "provider": { "@type": "Organization", "name": "RehabLookup" },
  "serviceType": "Treatment Placement"
}
</script>
```

---

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| `/international` crawler visibility | None | Full HTML |
| `/concierge` fallback | Prerender only | Static + Prerender |
| FAQPage rich snippets eligibility | Partial | Complete |
| Single point of failure risk | High | Mitigated |

---

## Post-Implementation Verification

1. Test static files load directly: `curl https://rehablookup.com/concierge.html`
2. Verify redirect works: Test with Google's URL Inspection Tool
3. Validate FAQPage schema: Use Google Rich Results Test
4. Monitor Search Console coverage report after 7 days
