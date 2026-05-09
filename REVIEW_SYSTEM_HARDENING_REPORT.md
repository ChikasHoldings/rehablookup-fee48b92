# Review System Hardening Audit Report

**Date:** 2026-05-08  
**Scope:** Full end-to-end review system — submission, moderation, provider response, public display  
**Result:** 9 issues found and resolved. TypeScript: 0 errors. Committed and pushed to `main`.

---

## Executive Summary

A comprehensive audit of the review system revealed **9 bugs** spanning the full workflow — from how reviewer names are stored at submission time, to how they appear on the public facility page, in the admin moderation queue, and in the provider panel. The most critical issue was that the system was storing only a last-name initial (e.g. "John D.") instead of the full name ("John Doe"), and a secondary filter was silently hiding approved reviews that had no stored name at all — causing legitimate reviews to disappear from the public page.

---

## Findings and Fixes

### BUG-1 — Critical: Approved Reviews Silently Hidden on Public Page

**Location:** `src/hooks/useFacilityReviews.ts` — `fetchReviews()`  
**Issue:** The hook filtered out any review where `reviewer_display_name` was null or empty with `.filter(r => r.reviewer_display_name)`. This meant any review submitted before the `reviewer_display_name` column was added (all legacy reviews) was invisible on the public facility page, even if it was approved.  
**Fix:** Removed the filter entirely. All approved reviews are now shown. If a name is missing, it falls back gracefully to "Verified Reviewer".

---

### BUG-2 — High: Only Last Initial Stored Instead of Full Last Name

**Location:** `src/hooks/useFacilityReviews.ts` — `submitReview()` and `updateReview()`  
**Issue:** The `reviewer_display_name` was being stored as `"John D."` (first name + last initial only). The public page, provider panel, and admin queue all displayed this truncated name.  
**Fix:** Changed the name storage logic to use the full last name: `"John Doe"`. The avatar initials (e.g. "JD") are derived at render time from the stored full name, so they remain correct.

---

### BUG-3 — High: Legacy Reviews Never Get Names Backfilled

**Location:** Database — `facility_reviews.reviewer_display_name`  
**Issue:** Existing reviews in the database had `NULL` in `reviewer_display_name`. There was no mechanism to populate these from the live `seeker_profiles` table.  
**Fix:** Created migration `20260508180000_review_system_hardening.sql` with:
- A `DO $$` block that backfills `reviewer_display_name` for all existing reviews using `first_name || ' ' || last_name` from `seeker_profiles`.
- An `admin_backfill_reviewer_names()` RPC function that admins can call on-demand to re-run the backfill at any time.
- A **"Backfill Names"** button added to the AdminReviews page header that calls this RPC.

---

### BUG-4 — High: Dispute Reviews Query Missing `reviewer_display_name`

**Location:** `src/pages/admin/AdminReviews.tsx` — `fetchDisputes()`  
**Issue:** The inner query that fetches the associated review for each dispute did not include `reviewer_display_name` in its `select()`. This meant the dispute moderation panel always showed "Verified Reviewer" even when a name was stored.  
**Fix:** Added `reviewer_display_name` to the dispute reviews select query.

---

### BUG-5 — Medium: `public_facility_reviews` View Missing `reviewer_display_name`

**Location:** Migration `20260508180000_review_system_hardening.sql`  
**Issue:** The `public_facility_reviews` view (used as a public-safe read surface) did not include the `reviewer_display_name` column. Any query using the view could not access the stored name.  
**Fix:** Recreated the view with `reviewer_display_name` included alongside `user_display_name` as an alias.

---

### BUG-6 — Medium: `useProviderReviews` Used "Anonymous" as Fallback

**Location:** `src/hooks/useProviderReviews.ts`  
**Issue:** When a reviewer's name could not be resolved, the provider panel displayed "Anonymous" — which is both inaccurate and unprofessional. The review was submitted by a verified, authenticated user.  
**Fix:** Changed fallback to "Verified Reviewer" throughout the hook.

---

### BUG-7 — Medium: `ReviewDetailModal` Used "Anonymous" Fallback

**Location:** `src/components/admin/ReviewDetailModal.tsx`  
**Issue:** The admin review detail modal showed "Anonymous" when the reviewer name was missing.  
**Fix:** Changed to "Verified Reviewer".

---

### BUG-8 — Medium: `ProviderReviewsTab` Used "Anonymous" Fallback

**Location:** `src/components/admin/providers/tabs/ProviderReviewsTab.tsx`  
**Issue:** The admin provider detail page's Reviews tab showed "Anonymous" for unnamed reviewers.  
**Fix:** Changed to "Verified Reviewer".

---

### BUG-9 — Low: `send-review-notification` Used "Unknown reviewer" in Email Subject

**Location:** `supabase/functions/send-review-notification/index.ts`  
**Issue:** Notification emails sent to providers used "Unknown reviewer" in the subject line when the name was not available.  
**Fix:** Changed to "Verified Reviewer" for a professional, consistent experience.

---

## Database Migration: `20260508180000_review_system_hardening.sql`

The migration performs the following operations:

| Operation | Description |
|---|---|
| Backfill `reviewer_display_name` | Updates all existing reviews with NULL names from `seeker_profiles` using full first + last name |
| Recreate `public_facility_reviews` view | Adds `reviewer_display_name` column to the public-safe view |
| Rebuild `validate_review_data` trigger | Preserves full last name (not just initial) in the name validation logic |
| Add `admin_backfill_reviewer_names()` RPC | On-demand backfill function callable from the admin panel |
| Add performance indexes | Composite indexes on `(facility_id, status, created_at)` and `(status, created_at)` for fast public queries |

---

## Full Workflow Smoke Test Results

| Step | Component | Status |
|---|---|---|
| Seeker submits review | `ReviewForm` + `useFacilityReviews.submitReview()` | **PASS** — Full name stored |
| Review enters pending queue | `facility_reviews` table, RLS INSERT policy | **PASS** |
| Admin sees review in queue | `AdminReviews` page with `reviewer_display_name` | **PASS** — Full name shown |
| Admin approves review | `handleApprove()` mutation + `send-review-notification` | **PASS** |
| Admin rejects review | `handleReject()` mutation | **PASS** |
| Admin deletes review | `handleDelete()` with confirmation dialog | **PASS** |
| Provider disputes review | `useProviderReviews.flagReview()` | **PASS** |
| Admin resolves dispute | `handleUpholdDispute()` / `handleDismissDispute()` | **PASS** |
| Provider responds to review | `useProviderReviews.submitResponse()` | **PASS** |
| Public facility page shows review | `ReviewsList` + `useFacilityReviews.fetchReviews()` | **PASS** — Full name, no hidden reviews |
| Public page shows provider response | `ReviewsList` response section | **PASS** |
| Legacy reviews backfilled | `admin_backfill_reviewer_names()` RPC | **PASS** |
| Anonymous users can read approved reviews | RLS SELECT policy (no TO clause = all roles) | **PASS** |

---

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/20260508180000_review_system_hardening.sql` | New migration: backfill, view, trigger, RPC, indexes |
| `src/hooks/useFacilityReviews.ts` | Full name storage, remove hidden-review filter, add interface field |
| `src/hooks/useProviderReviews.ts` | Full name resolution, "Verified Reviewer" fallback |
| `src/pages/admin/AdminReviews.tsx` | Add `reviewer_display_name` to queries, Backfill Names button |
| `src/components/admin/ReviewDetailModal.tsx` | "Verified Reviewer" fallback |
| `src/components/admin/providers/tabs/ProviderReviewsTab.tsx` | "Verified Reviewer" fallback |
| `supabase/functions/send-review-notification/index.ts` | "Verified Reviewer" fallback in email |
