
# International SEO Strategy: Capturing Global Search Traffic

## Executive Summary
Create a comprehensive network of SEO-optimized landing pages targeting foreigners searching for US-based addiction treatment. This mirrors the successful "near-me" page architecture but focuses on international search intent keywords like "best rehab in America," "luxury rehab California for foreigners," etc.

## Target Keyword Categories

### Tier 1: High-Volume Primary Keywords
| Keyword | Monthly Search Volume (Est.) |
|---------|------------------------------|
| best rehab in USA | 8,100 |
| rehab centers in America | 5,400 |
| luxury rehab California | 4,400 |
| American rehab for foreigners | 2,900 |
| US addiction treatment for international patients | 1,900 |
| private rehab United States | 1,600 |

### Tier 2: Location-Specific Keywords
- luxury rehab Florida
- celebrity rehab California
- best rehab Malibu
- Arizona rehab resorts
- executive rehab New York

### Tier 3: Treatment-Specific International Keywords
- detox centers USA for foreigners
- alcohol rehab America international
- dual diagnosis treatment United States
- private drug rehab America

---

## Implementation Plan

### Phase 1: International SEO Landing Page Directory
Create a new directory `src/pages/us-rehab/` with SEO-optimized pages:

```text
/us-rehab/                              → Main hub page
/us-rehab/best-rehab-usa                → Primary keyword page
/us-rehab/luxury-rehab-california       → State-specific luxury
/us-rehab/luxury-rehab-florida          → State-specific luxury
/us-rehab/luxury-rehab-arizona          → State-specific luxury
/us-rehab/executive-rehab-new-york      → Executive treatment
/us-rehab/malibu-rehab-centers          → Premium destination
/us-rehab/private-rehab-america         → Privacy-focused page
/us-rehab/rehab-for-international       → Foreigners-specific
```

### Phase 2: Page Structure (Template)

Each page will include:

1. **SEO Metadata**
   - Title optimized for target keyword
   - Meta description with CTA
   - Canonical URLs
   - hreflang tags for multi-language signals
   - FAQPage schema, Service schema

2. **Hero Section**
   - H1 with primary keyword
   - Trust signals (countries served, response time)
   - Prominent CTA to `/international/apply`

3. **Content Sections**
   - "Why Choose US Treatment" (privacy, quality, immediate admission)
   - Location/Treatment highlights
   - Facility listings (filtered by state/type)
   - FAQ section with international-specific questions
   - Process overview

4. **Internal Linking**
   - Links to `/international` placement service
   - Cross-links to related state pages
   - Links to treatment type pages

### Phase 3: Hub Page Structure

**Main Hub (`/us-rehab/`):**
```text
├── Hero: "Find Treatment in the United States"
├── Search by State (top destinations)
│   ├── California, Florida, Arizona, New York, Texas
├── Search by Treatment Type
│   ├── Luxury, Executive, Private, Dual Diagnosis
├── Why International Clients Choose US Treatment
├── Countries We Serve (visual trust section)
├── FAQ for International Patients
└── CTA: Start Your Placement
```

### Phase 4: State-Specific Pages

Create dedicated pages for top rehab destination states:

| State | URL Slug | Target Keywords |
|-------|----------|-----------------|
| California | `/us-rehab/california` | rehab California, Malibu rehab, LA treatment |
| Florida | `/us-rehab/florida` | Florida rehab, Miami treatment, South Florida |
| Arizona | `/us-rehab/arizona` | Arizona rehab, Sedona treatment, desert rehab |
| New York | `/us-rehab/new-york` | NYC rehab, executive treatment NY |
| Texas | `/us-rehab/texas` | Texas rehab, Houston treatment |
| Colorado | `/us-rehab/colorado` | Colorado rehab, mountain treatment |

### Phase 5: Specialty Pages

| Page | URL | Target Intent |
|------|-----|---------------|
| Best Rehab USA | `/us-rehab/best-rehab-usa` | Generic quality seekers |
| Luxury Rehab America | `/us-rehab/luxury-rehab-america` | High-end clients |
| Private Rehab USA | `/us-rehab/private-rehab-usa` | Privacy-focused |
| Executive Rehab USA | `/us-rehab/executive-rehab-usa` | Business professionals |
| Celebrity Rehab USA | `/us-rehab/celebrity-rehab-usa` | High-profile clients |
| Rehab for Foreigners | `/us-rehab/international-patients` | Explicit international intent |

---

## Technical Implementation

### New Files to Create

```text
src/pages/us-rehab/
├── USRehabHub.tsx                    # Main hub page
├── BestRehabUSA.tsx                  # Primary keyword page
├── LuxuryRehabAmerica.tsx            # Luxury-focused
├── LuxuryRehabCalifornia.tsx         # CA luxury
├── LuxuryRehabFlorida.tsx            # FL luxury
├── LuxuryRehabArizona.tsx            # AZ luxury
├── ExecutiveRehabUSA.tsx             # Executive treatment
├── PrivateRehabAmerica.tsx           # Privacy-focused
├── InternationalPatients.tsx         # Foreigners page
├── MalibuRehabCenters.tsx            # Malibu destination
└── components/
    ├── InternationalHero.tsx         # Reusable hero
    ├── CountriesServed.tsx           # Trust visual
    └── InternationalFAQ.tsx          # Reusable FAQ
```

### Route Configuration (App.tsx)

```tsx
// International SEO Routes
<Route path="/us-rehab" element={<USRehabHub />} />
<Route path="/us-rehab/best-rehab-usa" element={<BestRehabUSA />} />
<Route path="/us-rehab/luxury-rehab-america" element={<LuxuryRehabAmerica />} />
<Route path="/us-rehab/luxury-rehab-california" element={<LuxuryRehabCalifornia />} />
<Route path="/us-rehab/luxury-rehab-florida" element={<LuxuryRehabFlorida />} />
<Route path="/us-rehab/luxury-rehab-arizona" element={<LuxuryRehabArizona />} />
<Route path="/us-rehab/executive-rehab" element={<ExecutiveRehabUSA />} />
<Route path="/us-rehab/private-rehab-america" element={<PrivateRehabAmerica />} />
<Route path="/us-rehab/international-patients" element={<InternationalPatients />} />
<Route path="/us-rehab/malibu-rehab" element={<MalibuRehabCenters />} />
<Route path="/us-rehab/:stateSlug" element={<USRehabState />} />
```

### Sitemap Updates

Add all new URLs to `public/sitemap.xml`:
```xml
<!-- International SEO Pages -->
<url>
  <loc>https://rehablookup.com/us-rehab</loc>
  <priority>0.9</priority>
</url>
<url>
  <loc>https://rehablookup.com/us-rehab/best-rehab-usa</loc>
  <priority>0.9</priority>
</url>
<!-- ... all other pages -->
```

### Prerender Configuration

Update `supabase/functions/prerender-for-bots/index.ts` to include:
```ts
if (path.startsWith('/us-rehab')) return true;
```

---

## Content Strategy

### FAQ Topics for Each Page
1. How do international patients pay for US treatment?
2. Do US rehabs accept patients without US insurance?
3. What visa do I need for treatment in America?
4. How long can I stay in the US for rehab?
5. Will my treatment be confidential?
6. How do I get from the airport to the facility?
7. Can family members visit during treatment?
8. What languages do US rehabs support?

### Trust Signals to Include
- "50+ Countries Served"
- "24-Hour Response Time"
- "200+ Vetted US Facilities"
- "100% Confidential Placement"
- Country flags visual (UK, UAE, Australia, Germany, etc.)

---

## Internal Linking Strategy

```text
Homepage
  └── US Treatment (Header nav)
       └── /us-rehab (Hub)
            ├── /us-rehab/california
            ├── /us-rehab/best-rehab-usa
            └── /international/apply (CTA)

/international (Current landing)
  └── Cross-link to /us-rehab/* pages

Footer
  └── "US Treatment Access" → /us-rehab
```

---

## Deliverables Summary

| Item | Count |
|------|-------|
| New SEO landing pages | 12-15 |
| Reusable components | 3 |
| Route additions | 12+ |
| Sitemap entries | 15+ |
| FAQ schemas | 15+ |

---

## Expected Outcomes

- **Traffic Capture**: Target 15,000+ monthly international searches
- **Conversion Path**: Every page funnels to `/international/apply`
- **SEO Authority**: Establish topical authority for "US rehab for foreigners"
- **Revenue Impact**: Higher-value international placements ($4,500/admission)

