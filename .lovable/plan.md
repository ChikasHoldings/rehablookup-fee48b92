

# Comprehensive SEO Enhancement Plan

## Current State Assessment

The platform already has strong SEO foundations:
- A centralized `SEO` component (`src/components/SEO.tsx`) with OG tags, Twitter cards, JSON-LD schemas (Organization, WebSite, MedicalWebPage, BreadcrumbList, FAQPage, LocalBusiness, Article)
- A comprehensive `robots.txt` with bot-specific rules, disallow patterns, and sitemap references
- A dynamic sitemap system via `sitemap-facilities` edge function generating 3 sitemaps (index, main, facilities)
- `BreadcrumbNav` component with JSON-LD BreadcrumbList schema used on 14 pages
- IndexNow integration for instant Bing/Yandex indexing
- Prerendering infrastructure for bot crawlers
- 148+ articles with full Article schema
- OG image exists at `/og-image.jpg` (1200x630)

## Issues Found

### 1. CRITICAL: 18 US-Rehab Pages Use Raw `Helmet` Instead of `SEO` Component
These pages bypass the centralized SEO component, meaning they are missing:
- Auto-canonical normalization
- Twitter card tags
- Organization/WebSite/MedicalWebPage JSON-LD
- Robots max-snippet directives
- Geographic meta tags
- Keywords meta tag (some)
- Breadcrumb JSON-LD

**Affected files (all in `src/pages/us-rehab/`):**
- `USRehabHub.tsx`
- `BestRehabUSA.tsx`
- `LuxuryRehabAmerica.tsx`
- `LuxuryRehabCalifornia.tsx`
- `LuxuryRehabFlorida.tsx`
- `LuxuryRehabArizona.tsx`
- `ExecutiveRehabUSA.tsx`
- `PrivateRehabAmerica.tsx`
- `InternationalPatients.tsx`
- `MalibuRehabCenters.tsx`
- `RehabUSAFromUK.tsx`
- `RehabUSAFromUAE.tsx`
- `RehabUSAFromAustralia.tsx`
- `AlcoholRehabUSA.tsx`
- `DrugRehabUSA.tsx`
- `DualDiagnosisUSA.tsx`
- `CelebrityRehabUSA.tsx`

### 2. CRITICAL: 18 US-Rehab Pages Missing Breadcrumbs
None of the us-rehab pages have `BreadcrumbNav` component. This means:
- No visual breadcrumb navigation
- No BreadcrumbList JSON-LD schema (Google uses this for rich snippets)

### 3. HIGH: Sitemap Missing 10 US-Rehab Routes
The sitemap edge function has these us-rehab paths but is missing several actual routes:

**In sitemap but with wrong paths:**
- `/us-rehab/california` (actual: `/us-rehab/luxury-rehab-california`)
- `/us-rehab/florida` (actual: `/us-rehab/luxury-rehab-florida`)
- `/us-rehab/arizona` (actual: `/us-rehab/luxury-rehab-arizona`)
- `/us-rehab/malibu` (actual: `/us-rehab/malibu-rehab`)
- `/us-rehab/from-uk` (actual: `/us-rehab/uk-patients`)
- `/us-rehab/from-uae` (actual: `/us-rehab/uae-middle-east`)
- `/us-rehab/from-australia` (actual: `/us-rehab/australian-patients`)
- `/us-rehab/alcohol` (actual: `/us-rehab/alcohol-rehab-usa`)
- `/us-rehab/drug` (actual: `/us-rehab/drug-rehab-usa`)
- `/us-rehab/dual-diagnosis` (actual: `/us-rehab/dual-diagnosis-usa`)

**Missing entirely from sitemap:**
- `/us-rehab/best-rehab-usa`
- `/us-rehab/luxury-rehab-america`
- `/us-rehab/executive-rehab`
- `/us-rehab/private-rehab-america`
- `/us-rehab/international-patients`
- `/us-rehab/celebrity-rehab-usa`

### 4. HIGH: Other Raw Helmet Pages (Non-Public, Lower Priority)
These use raw `Helmet` but are auth-gated (noindex), so impact is lower:
- `SeekerHome.tsx`, `SeekerRequests.tsx`, `SeekerReviews.tsx`, `SeekerHelp.tsx`, `SeekerConcierge.tsx`
- `ConciergeIntake.tsx`, `ConciergeCreatePassword.tsx`
- `MarketingLanding.tsx`, `SocialLanding.tsx`

### 5. MEDIUM: Missing Breadcrumbs on Key Public Pages
Pages that have `SEO` component but no `BreadcrumbNav`:
- `Locations.tsx` -- high-value page, no breadcrumbs
- `TreatmentTypes.tsx` -- high-value page, no breadcrumbs
- `Insurance.tsx` -- hub page, no breadcrumbs
- `CostEstimator.tsx` -- utility page
- `Contact.tsx`, `About.tsx`, `HowItWorks.tsx`, `FAQ.tsx`
- `ForProviders.tsx`, `Concierge` landing pages

### 6. MEDIUM: `robots.txt` Last Updated Date Stale
Header says "Last updated: 2026-02-04" -- should be updated to current date.

---

## Implementation Plan

### Phase 1: Migrate US-Rehab Pages to SEO Component + Add Breadcrumbs (17 files)
For each of the 17 us-rehab page files:
1. Replace `import { Helmet } from "react-helmet-async"` with `import { SEO } from "@/components/SEO"` and `import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav"`
2. Replace the `<Helmet>...</Helmet>` block with a single `<SEO>` component call passing `title`, `description`, `canonical`, `keywords`, `structuredData` (the existing schema), and `breadcrumbs`
3. Add a visual `<BreadcrumbNav>` component after Layout opens, with items like `[{ label: "US Rehab", href: "/us-rehab" }, { label: "Page Name" }]`

This gives every page: auto-canonical normalization, Twitter cards, OG tags, Organization/WebSite/MedicalWebPage schemas, robots directives, geographic meta, and breadcrumb rich snippets.

### Phase 2: Add Breadcrumbs to Key Public Hub Pages (8 files)
Add `BreadcrumbNav` to:
- `Locations.tsx` -- `[{ label: "Locations" }]`
- `TreatmentTypes.tsx` -- `[{ label: "Treatment Types" }]`
- `Insurance.tsx` -- `[{ label: "Insurance" }]`
- `CostEstimator.tsx` -- `[{ label: "Cost Estimator" }]`
- `Contact.tsx` -- `[{ label: "Contact" }]`
- `About.tsx` -- `[{ label: "About" }]`
- `HowItWorks.tsx` -- `[{ label: "How It Works" }]`
- `FAQ.tsx` -- `[{ label: "FAQ" }]`

### Phase 3: Fix Sitemap Edge Function Routes
Update `supabase/functions/sitemap-facilities/index.ts` to:
1. Correct the 10 wrong us-rehab paths to match actual App.tsx routes
2. Add the 6 missing us-rehab routes
3. Add `best-rehab-usa` as high priority (0.8)

### Phase 4: Update robots.txt
- Update the "Last updated" date to 2026-03-08
- Add explicit Allow for `/us-rehab/` paths
- No structural changes needed -- the existing robots.txt is comprehensive

### Phase 5: Redeploy Sitemap Edge Function
After updating the sitemap routes, the edge function will auto-deploy.

---

## What Does NOT Need Changing (Already Correct)
- OG image (`/og-image.jpg`) exists and is 1200x630
- `SEO` component already handles auto-canonical, OG, Twitter, structured data
- robots.txt structure is Google-compliant
- Sitemap index architecture is correct
- IndexNow integration is working
- Prerendering for bots is configured
- Article pages have full schema support
- Near-me pages have comprehensive local SEO
- Insurance pages have breadcrumbs and FAQPage schema
- Facility profiles have LocalBusiness schema

## Estimated Scope
- ~25 files modified
- 1 edge function updated
- 1 static file updated (robots.txt)
- No database changes
- No new dependencies

