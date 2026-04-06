

# Gate Google Reviews Import & Review Requests Behind Pro

Both features will remain fully built but locked behind Pro membership. Non-Pro providers see the cards with a lock overlay and upgrade CTA instead of opening the modals.

## Changes

### 1. `src/pages/provider/Reviews.tsx`
- Import `useProStatus` hook
- Wrap both trigger cards with a Pro gate check:
  - If `proStatus.isPro === true`: current behavior (click opens modal)
  - If not Pro: replace `onClick` with navigation to `/provider/billing?tab=pro`, add a lock icon overlay, change card styling to muted/disabled appearance, and show "Pro Feature" badge instead of stats badges
- Add a small upgrade banner between the cards and stats section when not Pro, e.g. "Upgrade to Pro to unlock Google Reviews Import and Review Requests"

### 2. No changes to modal components
`GoogleReviewsImportSection.tsx` and `RequestReviewSection.tsx` stay untouched — the gate is at the trigger level so modals simply never open for non-Pro users.

### Files modified
- `src/pages/provider/Reviews.tsx` — add Pro gate logic around the two trigger cards

