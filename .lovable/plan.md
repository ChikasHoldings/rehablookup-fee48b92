
# Facility Profile Indexing Optimization

## Summary
Enable Google to fully index all facility public profiles by fixing SEO gaps in loading/error states and ensuring the sitemap infrastructure is robust.

## What's Already Working
- Dynamic sitemap generates XML for all approved facilities at `/functions/v1/sitemap-facilities`
- `sitemap-index.xml` correctly references the dynamic sitemap
- `robots.txt` allows crawling of `/center/*` paths
- Facility profile pages have comprehensive SEO meta tags
- LocalBusiness structured data schema is implemented

## Changes Required

### 1. Add SEO to Loading State
**File:** `src/pages/CenterProfile.tsx`

Add a minimal SEO tag during loading to prevent soft 404 errors when Google crawls a page mid-load:

```tsx
if (isLoading) {
  return (
    <Layout>
      <SEO
        title="Loading Treatment Center..."
        description="Loading facility information. Please wait."
        noindex={true}
      />
      <CenterProfileSkeleton />
    </Layout>
  );
}
```

### 2. Add noindex to Error/Not Found State
**File:** `src/pages/CenterProfile.tsx`

Prevent Google from indexing facility "not found" pages:

```tsx
if (error || !facility) {
  return (
    <Layout>
      <SEO
        title="Center Not Found"
        description="The treatment center you're looking for doesn't exist."
        noindex={true}
      />
      {/* existing error UI */}
    </Layout>
  );
}
```

### 3. Update sitemap-index.xml URL (Optional Enhancement)
The current sitemap references the Supabase function URL directly. This works but exposes infrastructure. Could optionally proxy through `/sitemap-facilities.xml` redirect.

## Technical Details

### How Google Will Index Facilities

```text
                                       ┌──────────────────────────────┐
                                       │     Google Search Bot        │
                                       └──────────────┬───────────────┘
                                                      │
                                                      ▼
                              ┌────────────────────────────────────────────┐
                              │          robots.txt (allows /center/*)     │
                              └────────────────────────┬───────────────────┘
                                                       │
                                                       ▼
                              ┌────────────────────────────────────────────┐
                              │          sitemap-index.xml                 │
                              │   References: sitemap.xml                  │
                              │   References: sitemap-facilities (edge fn) │
                              └────────────────────────┬───────────────────┘
                                                       │
                      ┌────────────────────────────────┴────────────────────┐
                      │                                                     │
                      ▼                                                     ▼
        ┌─────────────────────────┐                       ┌─────────────────────────────────┐
        │   sitemap.xml           │                       │   sitemap-facilities            │
        │   (static pages)        │                       │   (dynamic, from database)      │
        └─────────────────────────┘                       └─────────────────────────────────┘
                                                                            │
                                                                            ▼
                                                         ┌─────────────────────────────────┐
                                                         │  /center/facility-slug          │
                                                         │  - Title, Description           │
                                                         │  - LocalBusiness schema         │
                                                         │  - Canonical URL                │
                                                         │  - Breadcrumbs                  │
                                                         └─────────────────────────────────┘
```

### What Each Facility Page Includes for SEO
- **Title:** `{Facility Name} - Addiction Treatment in {City}, {State}`
- **Description:** First 155 chars of facility description
- **Canonical:** `/center/{slug}`
- **Structured Data:** LocalBusiness + MedicalBusiness schema with services, insurance, phone, address
- **Breadcrumbs:** Home → Rehab Centers → {Facility Name}
- **Keywords:** Facility name, treatment types, location-based terms

## Post-Implementation
After deployment, recommend:
1. Re-submit sitemap in Google Search Console
2. Use "URL Inspection" tool to verify a sample facility URL
3. Request indexing for any priority facilities

## Estimated Impact
- All approved facilities will be indexable
- New facilities automatically added to sitemap when approved
- No soft 404 errors from loading states
- Clean separation of indexable vs. non-indexable content
