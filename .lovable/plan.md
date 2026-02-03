
# SEO Enhancement Plan Based on Audit Report

## Summary

This plan addresses the specific opportunities identified in the SEO audit report, focusing on structured data gaps, content optimization, and E-E-A-T signals.

---

## Part 1: Add Organization Schema to About Page

**File**: `public/about.html`

The About page is missing Organization schema which helps establish authority. Add structured data:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "RehabLookup",
  "url": "https://rehablookup.com",
  "logo": "https://rehablookup.com/logo.svg",
  "foundingDate": "2024",
  "description": "RehabLookup connects families with verified addiction treatment centers through transparency and compassion",
  "knowsAbout": ["Addiction Treatment", "Drug Rehabilitation", "Alcohol Recovery"],
  "sameAs": [
    "https://facebook.com/rehablookup",
    "https://twitter.com/rehablookup",
    "https://linkedin.com/company/rehablookup"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": "help@rehablookup.com",
    "availableLanguage": ["English", "Spanish"]
  }
}
```

---

## Part 2: Enhance Category Pages with Above-Fold Content

**Files**: `src/pages/near-me/AlcoholRehabNearMe.tsx`, `src/pages/near-me/DetoxNearMe.tsx`

Add introductory content section with localized keywords immediately after the hero:

```typescript
// New component: Above-fold intro section
<section className="py-8 bg-muted/20 border-b">
  <div className="container max-w-3xl text-center">
    <p className="text-muted-foreground leading-relaxed">
      {stateData 
        ? `Looking for alcohol rehab in ${stateData.name}? Browse ${facilities.length}+ verified treatment centers offering medical detox, inpatient rehabilitation, and outpatient programs. Many facilities accept insurance from Aetna, BCBS, and Cigna.`
        : `Search our directory of alcohol treatment centers across the United States. Compare programs, check insurance coverage, and find the right recovery path.`
      }
    </p>
  </div>
</section>
```

This adds descriptive text above the fold that Google weighs heavily.

---

## Part 3: Add E-E-A-T Section to About Page

**File**: `public/about.html`

Add a "Medical Advisory" section to establish expertise and authority:

```html
<section style="background: #f8fafc; padding: 48px 20px;">
  <div class="container">
    <h2 style="text-align: center; margin-bottom: 24px;">Medical Advisory & Editorial Standards</h2>
    <p style="text-align: center; color: #666; max-width: 700px; margin: 0 auto 32px;">
      Our content is reviewed by addiction medicine specialists and licensed clinicians to ensure accuracy and clinical relevance.
    </p>
    
    <div class="values-grid">
      <div class="value-card">
        <h3>Evidence-Based Information</h3>
        <p>All treatment information is based on current clinical guidelines from SAMHSA and NIDA.</p>
      </div>
      <div class="value-card">
        <h3>Licensed Verification</h3>
        <p>Our team verifies facility licenses, accreditations (JCAHO, CARF), and quality credentials.</p>
      </div>
      <div class="value-card">
        <h3>Regular Updates</h3>
        <p>Content is reviewed and updated quarterly to reflect current treatment standards.</p>
      </div>
    </div>
  </div>
</section>
```

---

## Part 4: Enhance Homepage H1 and Keywords

**File**: `src/pages/Index.tsx`

Current H1: "Find the Right Path to Recovery"
Proposed H1: "Addiction Treatment & Rehab Center Directory"

Update SEO component for stronger keyword targeting:

```typescript
<SEO
  title="Find Drug & Alcohol Rehab Centers Near You | RehabLookup"
  description="Search 15,000+ verified addiction treatment centers. Compare drug rehab, alcohol treatment, detox programs. Free insurance verification. 24/7 confidential help."
  keywords={[
    "drug rehab near me",
    "alcohol treatment centers",
    "addiction treatment directory",
    "rehab centers near me",
    "substance abuse treatment",
    "detox centers",
    "inpatient rehab",
    "outpatient treatment",
    "dual diagnosis treatment",
    "addiction help",
    "find rehab",
    "alcohol rehab",
  ]}
/>
```

---

## Part 5: Add HowTo Schema to How It Works Page

**File**: `src/pages/HowItWorks.tsx`

Add HowTo structured data for potential rich results:

```typescript
structuredData={[
  generateFAQSchema(faqs),
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Find Addiction Treatment",
    "description": "Three simple steps to find the right treatment center",
    "step": [
      {
        "@type": "HowToStep",
        "name": "Search Treatment Centers",
        "text": "Enter your location to browse verified facilities in your area"
      },
      {
        "@type": "HowToStep", 
        "name": "Review & Compare",
        "text": "Explore facility profiles with program details and insurance information"
      },
      {
        "@type": "HowToStep",
        "name": "Connect Directly",
        "text": "Contact facilities or speak with specialists for placement assistance"
      }
    ]
  }
]}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `public/about.html` | Add Organization schema + E-E-A-T section |
| `src/pages/Index.tsx` | Optimize title, meta description, H1 |
| `src/pages/near-me/AlcoholRehabNearMe.tsx` | Add above-fold intro content |
| `src/pages/near-me/DetoxNearMe.tsx` | Add above-fold intro content |
| `src/pages/HowItWorks.tsx` | Add HowTo schema |

---

## Technical Details

### About Page Organization Schema (Full)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://rehablookup.com/#organization",
  "name": "RehabLookup",
  "legalName": "RehabLookup, Inc.",
  "url": "https://rehablookup.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://rehablookup.com/logo.svg",
    "width": 512,
    "height": 512
  },
  "foundingDate": "2024",
  "description": "RehabLookup connects individuals and families with verified addiction treatment centers across the United States through transparency and compassion.",
  "slogan": "Find the Right Path to Recovery",
  "knowsAbout": [
    "Addiction Treatment",
    "Drug Rehabilitation",
    "Alcohol Recovery",
    "Mental Health Services",
    "Detox Programs",
    "Dual Diagnosis Treatment"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": "help@rehablookup.com",
    "availableLanguage": ["English", "Spanish"],
    "areaServed": "US"
  },
  "sameAs": [
    "https://facebook.com/rehablookup",
    "https://twitter.com/rehablookup",
    "https://linkedin.com/company/rehablookup",
    "https://instagram.com/rehablookup"
  ]
}
</script>
```

### Above-Fold Content Component

```typescript
// Add after NearMeHero in category pages
{stateData && (
  <section className="py-6 bg-muted/30 border-b">
    <div className="container">
      <p className="text-center text-muted-foreground max-w-2xl mx-auto">
        Searching for alcohol rehab in {stateData.name}? Our directory features {facilities.length}+ 
        verified treatment centers offering detox, inpatient, and outpatient programs. 
        Many facilities accept major insurance including Aetna, BCBS, Cigna, and United Healthcare.
        {stateData.name === "California" && " California is home to some of the nation's leading addiction treatment programs."}
        {stateData.name === "Florida" && " Florida offers year-round treatment options in supportive recovery environments."}
        {stateData.name === "Texas" && " Texas provides comprehensive treatment options across major metropolitan areas."}
      </p>
    </div>
  </section>
)}
```

---

## Expected SEO Impact

| Page | Current Grade | Expected Grade |
|------|---------------|----------------|
| Homepage | B+ | A- |
| Category Pages | B | B+ |
| About | B | A- |
| How It Works | C+ | B+ |
| For Providers | C- | B (already improved) |

---

## Validation Checklist

After implementation:
1. Test structured data with Google Rich Results Test
2. Verify meta tags render correctly in page source
3. Check that above-fold content appears in HTML (not just JS)
4. Confirm Organization schema links to homepage
5. Monitor Search Console for rich result eligibility
