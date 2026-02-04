
# Embeddable Badge System for SEO Backlinks

## Overview
Create an embeddable "Verified on RehabLookup" badge that providers can add to their websites. When visitors click the badge, they'll be directed to the facility's profile on RehabLookup, creating valuable dofollow backlinks for SEO.

---

## Features

### Badge Types (3 Variants)
1. **Verified Badge** - "Verified on RehabLookup" with shield icon
2. **Featured/Pro Badge** - "Featured Treatment Center" with star icon  
3. **Rating Badge** - Shows star rating + review count (if available)

### Badge Sizes
- Small (120x40px) - For footers
- Medium (180x60px) - Standard
- Large (240x80px) - Hero sections

### Badge Styles
- Light mode (white background)
- Dark mode (dark background)
- Transparent (adapts to site)

---

## User Experience

### Provider Dashboard
New "Embed Badge" section in provider settings or dashboard with:
- Live preview of badge variants
- Size/style selector dropdowns
- Copy-to-clipboard embed code
- Instructions for WordPress, Squarespace, Wix, HTML

### Embed Code Output
```html
<a href="https://rehablookup.com/center/{slug}?utm_source=badge&utm_medium=embed" 
   target="_blank" rel="noopener">
  <img src="https://rehablookup.com/api/badge/{facility-id}?style=light&size=medium" 
       alt="Verified on RehabLookup" 
       width="180" height="60" />
</a>
```

---

## Technical Implementation

### 1. Badge Serving Edge Function
**File:** `supabase/functions/serve-badge/index.ts`
- Serves SVG badge dynamically based on facility data
- Supports query params: `style`, `size`, `type`
- Tracks impressions (facility_id, referrer, timestamp)
- Caches SVG output for performance
- Returns proper content-type headers

### 2. Database Table
**Table:** `badge_impressions`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| facility_id | uuid | FK to facilities |
| referrer_domain | text | Source website |
| created_at | timestamp | Impression time |
| badge_type | text | verified/featured/rating |
| badge_size | text | small/medium/large |

### 3. Provider Dashboard Component
**File:** `src/components/provider/EmbedBadgeWidget.tsx`
- Badge preview with real facility data
- Style/size/type selectors
- Generated embed code with copy button
- Installation instructions accordion

### 4. Provider Page Integration
**File:** `src/pages/provider/Settings.tsx` (or new `EmbedBadge.tsx`)
- Add new tab/section for badge embed
- Link from dashboard quick actions

### 5. Badge Analytics
- Add impressions count to provider analytics
- Show top referrer domains
- Track click-through rate

---

## SEO Benefits

| Benefit | Impact |
|---------|--------|
| **Dofollow backlinks** | Each badge = quality backlink from treatment center websites |
| **Brand visibility** | Logo/name on hundreds of provider sites |
| **Referral traffic** | Direct clicks from badge to facility profiles |
| **Trust signal** | Third-party validation visible to families |

---

## Files to Create/Modify

### New Files
1. `supabase/functions/serve-badge/index.ts` - Badge serving endpoint
2. `src/components/provider/EmbedBadgeWidget.tsx` - Badge generator UI
3. `src/pages/provider/EmbedBadge.tsx` - Full page for badge management

### Modified Files
1. `src/components/provider/ProviderSidebar.tsx` - Add nav link
2. `public/_redirects` - Add badge endpoint proxy
3. `vercel.json` - Add badge endpoint rewrite

### Database Migration
- Create `badge_impressions` table with RLS policies

---

## Badge Design Specifications

```text
┌─────────────────────────────────────┐
│  ✓  Verified on RehabLookup         │
│     rehablookup.com                 │
└─────────────────────────────────────┘
```

- Uses platform brand colors (primary teal/blue)
- Shield/checkmark icon for trust
- Includes domain for recognition
- Rounded corners, subtle shadow

---

## Implementation Priority

1. **Phase 1**: Basic badge serving + embed code generator
2. **Phase 2**: Impression tracking + analytics
3. **Phase 3**: Multiple badge variants + customization
