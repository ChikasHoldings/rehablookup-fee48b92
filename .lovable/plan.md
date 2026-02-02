

# Update "Matching" to "Treatment Placement" Terminology

## Overview
Replace generic "Matching" terminology with "Treatment Placement" across all placement-related interfaces to better convey the premium, brokerage nature of the service.

---

## Files to Update

### 1. Admin Status Labels

**File: `src/pages/admin/AdminConcierge.tsx`**
- Line 22: Change `matching: { label: "Matching" }` → `matching: { label: "Placing" }`
- Line 23: Change `matched: { label: "Matched" }` → `matched: { label: "Facilities Found" }`

**File: `src/components/admin/concierge/ConciergeActionsTab.tsx`**
- Line 45: Change `{ value: "matching", label: "Matching" }` → `{ value: "matching", label: "Placing" }`
- Line 46: Change `{ value: "matched", label: "Matched" }` → `{ value: "matched", label: "Facilities Found" }`

**File: `src/components/admin/concierge/InternationalCasesTab.tsx`**
- Line 32: Change `matching: { label: "Matching" }` → `matching: { label: "Placing" }`
- Line 33: Change `matched: { label: "Matched" }` → `matched: { label: "Facilities Found" }`

---

### 2. Seeker-Facing Status Card

**File: `src/components/seeker/placement/PlacementStatusCard.tsx`**
- Line 37: Change `matching: { label: "Finding Matches" }` → `matching: { label: "Finding Treatment Options" }`

---

### 3. Admin Placement Algorithm UI

**File: `src/components/admin/concierge/ConciergeMatchingTab.tsx`**
- Line 89: Change `"Matching Algorithm"` → `"Treatment Placement Engine"`
- Line 103: Change `"Matching..."` → `"Placing..."`
- Line 108: Change `"Re-run Matching"` → `"Re-run Placement"`
- Line 113: Change `"Run Matching"` → `"Run Placement"`
- Line 126: Change `"Matched Facilities"` → `"Placement Options"`
- Line 134: Change text `"Run the matching algorithm"` → `"Run the placement engine"`
- Line 201: Change `"Matching Criteria Used"` → `"Placement Criteria Used"`

---

### 4. FAQ Section

**File: `src/pages/FAQ.tsx`**
- Line 76: Change category name `"Matching & Privacy"` → `"Placement & Privacy"`

---

### 5. Marketing Copy

**File: `src/components/marketing/MarketingLeadSuccess.tsx`**
- Line 178: Change `"one-on-one matching"` → `"personalized treatment placement"`

---

## Summary of Changes

| Location | Current Term | New Term |
|----------|-------------|----------|
| Status badges | "Matching" | "Placing" |
| Status badges | "Matched" | "Facilities Found" |
| Seeker status | "Finding Matches" | "Finding Treatment Options" |
| Admin UI | "Matching Algorithm" | "Treatment Placement Engine" |
| Button | "Run Matching" | "Run Placement" |
| FAQ | "Matching & Privacy" | "Placement & Privacy" |
| Marketing | "one-on-one matching" | "personalized treatment placement" |

---

## Technical Notes

- Database column names (e.g., `matched_at`, `match_scores`) remain unchanged as they are internal
- Component file names (e.g., `ConciergeMatchingTab.tsx`) can remain unchanged since they're internal
- The status value in the database (`matching`) stays the same - only the display label changes

