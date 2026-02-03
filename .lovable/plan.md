
# SEO Enhancement: Insurance Page Static HTML + Schema Expansion

## Current Situation

The crawl report shows excellent progress but identifies two remaining gaps:
- **Insurance subcategories** may still be showing shallow crawl text
- **Schema/structured data** could be expanded for better rich results

## Solution: Phase 2 SEO Expansion

### Part 1: Static HTML for Top Insurance Pages

Create standalone static HTML files for the 5 most-searched insurance categories to ensure crawlers see dedicated, keyword-rich content:

| Insurance Page | Target File |
|---------------|-------------|
| `/insurance/aetna-rehab` | `public/insurance/aetna-rehab.html` |
| `/insurance/bcbs-treatment` | `public/insurance/bcbs-treatment.html` |
| `/insurance/cigna-rehab` | `public/insurance/cigna-rehab.html` |
| `/insurance/united-healthcare-rehab` | `public/insurance/united-healthcare-rehab.html` |
| `/insurance/medicare-rehab` | `public/insurance/medicare-rehab.html` |

Each file will include:
- Unique title and meta description
- Canonical URL
- Coverage details (detox, inpatient, outpatient, MAT)
- FAQs with answers
- FAQPage schema markup
- Contact/CTA sections

### Part 2: Add FAQPage Schema to Existing Static Pages

Update these existing static HTML files with FAQPage structured data:
- `public/for-providers.html` (already has Service schema, add FAQPage)
- `public/how-it-works.html` (if FAQs exist)

### Part 3: Update Redirects

Add routing rules to serve insurance static files:

```text
/insurance/aetna-rehab /insurance/aetna-rehab.html 200
/insurance/bcbs-treatment /insurance/bcbs-treatment.html 200
/insurance/cigna-rehab /insurance/cigna-rehab.html 200
/insurance/united-healthcare-rehab /insurance/united-healthcare-rehab.html 200
/insurance/medicare-rehab /insurance/medicare-rehab.html 200
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `public/insurance/aetna-rehab.html` | **CREATE** - Full insurance guide with FAQPage schema |
| `public/insurance/bcbs-treatment.html` | **CREATE** - Full insurance guide with FAQPage schema |
| `public/insurance/cigna-rehab.html` | **CREATE** - Full insurance guide with FAQPage schema |
| `public/insurance/united-healthcare-rehab.html` | **CREATE** - Full insurance guide with FAQPage schema |
| `public/insurance/medicare-rehab.html` | **CREATE** - Full insurance guide with FAQPage schema |
| `public/for-providers.html` | **MODIFY** - Add FAQPage schema |
| `public/_redirects` | **MODIFY** - Add insurance page routes |

---

## Static HTML Content Structure

Each insurance page will follow this structure:

```text
<head>
  - Title: "[Insurance] Coverage for Rehab | RehabLookup"
  - Meta description: Insurance-specific benefits info
  - Canonical URL
  - FAQPage schema
  - Organization schema
</head>

<body>
  - Header with navigation
  - Hero: "Does [Insurance] Cover Rehab?"
  - Coverage Details section (Detox, Inpatient, Outpatient, MAT)
  - How to Verify Benefits (step-by-step)
  - FAQ section (5-6 common questions)
  - CTA: "Find [Insurance]-Accepting Facilities"
  - Footer
</body>
```

---

## Schema Examples

**FAQPage Schema** (for insurance pages):
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Does Aetna cover rehab treatment?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, Aetna provides comprehensive coverage..."
      }
    }
  ]
}
```

---

## Expected SEO Improvements

| Metric | Before | After |
|--------|--------|-------|
| Insurance page crawl depth | Shallow/navigation-only | Full coverage guides |
| FAQPage rich results eligibility | Limited | All insurance + provider pages |
| Insurance keyword targeting | Generic | Specific ("Aetna rehab coverage") |
| Schema coverage | Homepage + facility pages | + Insurance + Provider pages |

---

## Technical Notes

- Static files bypass SPA shell entirely
- `_redirects` exact matches take priority over wildcard
- FAQPage schema enables Google's FAQ rich snippets
- Content mirrors existing React component content for consistency
- No changes to React components needed (they continue serving JS users)

---

## Implementation Order

1. Create `public/insurance/` directory
2. Create 5 insurance static HTML files with FAQPage schema
3. Update `public/for-providers.html` with FAQPage schema
4. Update `public/_redirects` with insurance routes
5. Test crawlability with fresh ChatGPT crawl
