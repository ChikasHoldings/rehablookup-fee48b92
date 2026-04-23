---
name: AggregateRating JSON-LD Audit
description: scripts/check-aggregate-rating.mjs runs in build chain to ensure pages rendering star ratings or review counts also emit valid AggregateRating JSON-LD with numeric ratingValue and reviewCount/ratingCount
type: feature
---

`npm run check:aggregate-rating` runs after `check:faq-jsonld` in both `build` and `build:dev`.

**Detection signals (any one triggers the requirement):**
- "X.Y / 5" or "X.Y out of 5" text
- "Rated X.Y" phrase
- "(N reviews)" or "based on N reviews" text
- ≥4 `lucide-star` icons clustered (visible 5-star widget)
- `data-testid="rating"` or class containing `star-rating`

**Validation rules per AggregateRating node:**
- `ratingValue` must be numeric and within `[worstRating ?? 1, bestRating ?? 5]`
- At least one of `reviewCount` / `ratingCount` must be numeric and ≥1
- `bestRating` (if present) must be ≥1
- Walks `@graph`, nested `aggregateRating` props, and arbitrary object children to catch ratings embedded in LocalBusiness/MedicalClinic/Product schemas

**Hard-fails build on:**
- Rating UI rendered without any AggregateRating JSON-LD
- AggregateRating block that fails JSON.parse
- Missing/non-numeric ratingValue
- Missing reviewCount AND ratingCount
- Out-of-range ratingValue

Currently passing with 0 nodes (ratings are loaded client-side from `facility_reviews` via `useFacilityRating`); audit will fire automatically once SSR'd rating widgets are added to pre-rendered HTML.
