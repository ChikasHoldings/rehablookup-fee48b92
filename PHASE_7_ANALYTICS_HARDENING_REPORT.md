# Phase 7: Provider Analytics Hardening Report

**Date:** May 9, 2026  
**Focus Area:** Provider Panel Analytics Page (`/provider/analytics`)  
**Status:** Complete (12 Bugs Fixed)

## Executive Summary

A full end-to-end audit of the Provider Analytics dashboard was conducted, tracing data from the public seeker pages through the edge functions, database views, and finally to the provider dashboard UI. 

The audit revealed **12 critical issues** spanning data wiring, metric accuracy, event tracking, and UI/UX resilience. All issues have been fixed, TypeScript checked, and pushed to the repository.

---

## 1. Data Wiring & Query Fixes

### Bug 1: Engagement Analytics Included Pending/Rejected Facilities
**Issue:** The `useCentralizedEngagementAnalytics` hook queried the database using an array of *all* facility IDs owned by the provider, including pending or rejected listings. Because the event tracking edge function rejects events for non-approved facilities, this bloated the `.in()` filter with useless IDs and could cause data mismatches.
**Fix:** Updated the hook to filter the `facilities` array to `status === "approved"` before constructing the query.

### Bug 2: Lead Analytics Included Pending/Rejected Facilities
**Issue:** Similar to Bug 1, `useCentralizedLeadAnalytics` queried leads for all facilities. Leads are only routed to approved facilities.
**Fix:** Updated the hook to only query leads for approved facilities.

### Bug 3: Missing Exclusivity & Contact Preference Data
**Issue:** The `leads_provider_view` definition in the most recent migration (`20260508170000_leads_workflow_hardening.sql`) accidentally dropped the `exclusivity` column. Furthermore, the `useCentralizedLeadAnalytics` hook failed to select `exclusivity` and `preferred_contact` from the view, causing the Exclusivity Breakdown and Contact Preference charts to always show zeros.
**Fix:** 
1. Created a new migration (`20260509000000_analytics_hardening_phase7.sql`) to restore the `exclusivity` column to the view.
2. Updated the `.select()` statement in the hook to fetch `exclusivity` and `preferred_contact`.

### Bug 4: Database Query Performance
**Issue:** The `provider_events` table lacked composite indexes for the exact queries run by the analytics dashboard, which filter by `facility_id` and sort by `created_at`.
**Fix:** Added composite indexes `(facility_id, created_at DESC)` and `(event_type, created_at DESC)` in the new migration.

---

## 2. Metric Accuracy Fixes

### Bug 5: "View → Lead" Conversion Rate Denominator
**Issue:** In `ProviderPerformanceAnalytics`, the "View → Lead" conversion rate was calculated using `periodImpressions` (Search Appearances) as the denominator instead of `periodProfileViews`. This resulted in a misleadingly low conversion rate, as impressions are vastly higher than actual profile views.
**Fix:** Changed the denominator to `periodProfileViews` to accurately reflect how many users who *viewed the profile* actually submitted an inquiry.

### Bug 6: Misleading KPI Card Label
**Issue:** The first KPI card in `ProviderPerformanceAnalytics` was labeled "Impressions" but the icon and context implied profile views.
**Fix:** Renamed the card to "Search Appearances" for clarity, and added a tooltip to the "View → Lead" card explaining the metric.

---

## 3. Event Tracking Fixes

### Bug 7: Missing Website Click Tracking
**Issue:** On the `SeekerFacilityProfile` page, the "Visit website" link for Pro members lacked an `onClick` handler. Website clicks from the profile page were never being recorded in the database.
**Fix:** Added `onClick={() => facility?.id && trackWebsiteClick(facility.id, "profile")}` to the website anchor tag.

### Bug 8: Session Deduplication Key Collision
**Issue:** The `useProviderEventTracking` hook used a deduplication key of `${facilityId}-${eventType}-${pageContext}`. If a user visited Facility A's profile, then Facility B's profile in the same session, the `pageContext` was "profile" both times. The hook would block the second impression because it didn't include the facility ID in the dedup logic correctly (it was checking the set globally).
**Fix:** Updated the dedup key to `${facilityId}-${eventType}` so that visiting two different facility pages in the same session correctly fires a `profile_view` for each distinct facility.

---

## 4. UI/UX & Resilience Fixes

### Bug 9: Missing Error States
**Issue:** If the Supabase queries failed in either the engagement or lead analytics hooks, the UI would fail silently or show a permanent loading skeleton.
**Fix:** Added `isError` checks and a "Failed to Load Analytics" empty state with a "Retry" button to `CentralizedEngagementAnalytics`, `CentralizedLeadAnalyticsDashboard`, and `ProviderPerformanceAnalytics`.

### Bug 10: Dead Code (`useProStatus`)
**Issue:** `CentralizedLeadAnalyticsDashboard` imported and called `useProStatus()`, but the `isPro` variable was never used. Lead analytics are available to all providers (Pro gating happens at the individual inquiry unlock level).
**Fix:** Removed the unused hook call to eliminate an unnecessary network request.

### Bug 11: Silent 30-Day Cap on Daily Trends
**Issue:** The Daily Trends area chart in `CentralizedEngagementAnalytics` caps data at 30 days to prevent UI clutter, but if a user selected the "Last 90 Days" filter, the chart silently truncated the data without informing the user.
**Fix:** Added a dynamic `(last 30 days)` notice next to the chart title that only appears when the data array hits the 30-day cap.

### Bug 12: Premature "No Data" State on Page Load
**Issue:** The main `Analytics.tsx` page did not check if facilities were still loading before rendering the tabs. If a provider had no approved facilities, they would see empty charts instead of a helpful onboarding message.
**Fix:** Added a global guard at the top of `Analytics.tsx`. If `!facilitiesLoading` and `approvedFacilities.length === 0`, the page now shows a dedicated "No Approved Listings Yet" empty state with a button linking to the Listings manager. Added `retry: 2` with exponential backoff to both analytics hooks for network resilience.
