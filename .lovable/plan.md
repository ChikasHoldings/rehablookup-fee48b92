## Root Cause

The Provider Leads inbox (`/provider/inquiries`) and every provider dashboard widget that depends on lead data are returning **zero rows** for all providers.

The page queries `public.leads_provider_view`, which was correctly designed to mask PII for *locked* leads and reveal full contact info for *unlocked* ones. The view runs with `security_invoker=on`, so when a provider queries it, RLS on the underlying `public.leads` table is enforced under their auth context.

Inspecting the policies on `public.leads` (RLS enabled), the only SELECT policies are:

- `Admins can view all leads` — admins only.
- `Owners can view unlocked facility leads` — `... AND is_lead_unlocked(id, facility_id)`.
- `Providers can view unlocked redistributed leads` — also gated on the lead being unlocked.

There is **no policy that lets a facility owner SELECT their facility's *locked* leads**. So the view returns nothing for locked leads, and the inbox is empty (only previously-unlocked leads can ever appear, which defeats the entire pay-to-unlock product).

This single missing policy breaks every component that reads `leads_provider_view`:

- `src/pages/provider/Inquiries.tsx` (the Leads page)
- `src/pages/provider/Dashboard.tsx` (recent leads + KPI counts)
- `src/components/provider/DashboardKPIStrip.tsx`
- `src/components/provider/DashboardMissedLeads.tsx`
- `src/components/provider/DashboardFacilityPerformancePanel.tsx`
- `src/components/provider/LeadConversionWidget.tsx`
- `src/components/provider/ProMultiFacilityOverview.tsx`
- `src/components/provider/ProviderPerformanceFeedback.tsx` (queries `leads` directly — same RLS gap)
- `src/components/provider/listing/ListingCard.tsx` (queries `leads` directly)

## Fix

### 1. Add a SELECT policy on `public.leads` for owners of the facility

Allow facility owners to read rows for their facility regardless of unlock state. The PII masking is already enforced at the **view layer** (`leads_provider_view` only exposes name/email/phone/message when an unlock row exists for that user's facility), so this does not leak PII as long as providers query the view, which they already do.

```sql
CREATE POLICY "Owners can view their facility leads (masked via view)"
ON public.leads
FOR SELECT
TO authenticated
USING (
  facility_id IN (
    SELECT f.id FROM public.facilities f WHERE f.user_id = auth.uid()
  )
);
```

Mirror policy for redistributed leads (so a redistributed locked lead also shows up):

```sql
CREATE POLICY "Providers can view their redistributed leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT ld.lead_id
    FROM public.lead_distributions ld
    JOIN public.facilities f ON ld.facility_id = f.id
    WHERE f.user_id = auth.uid()
  )
);
```

Both are additive — existing "unlocked" policies continue to work; admin policy is unchanged.

### 2. Lock down direct base-table reads

Two components currently `SELECT` from the base `leads` table (which would now return locked rows with raw PII):

- `src/components/provider/ProviderPerformanceFeedback.tsx`
- `src/components/provider/listing/ListingCard.tsx`

Audit and switch them to `leads_provider_view` (or restrict their selects to non-PII columns like `id`, `created_at`, `facility_id`, `status`). This preserves the "PII masked at DB level until explicitly unlocked" project rule.

### 3. Audit pass on the rest of the provider panel

Quick verification (no functional changes expected, but flag any anomalies found):

- `Dashboard.tsx`, `MyListings.tsx`, `Reviews.tsx`, `Settings.tsx`, `Billing.tsx`, `Analytics.tsx`, `Notifications.tsx`, `PlacementNetwork.tsx`, `Inquiries.tsx`, `ListingEditor.tsx`, `AddLocation.tsx`, `Help.tsx`, `KnowledgeBase.tsx`, `ProUpgrade.tsx`, `EmbedBadge.tsx`, `ImageGuidelines.tsx`.
- Sidebar/bottom-nav links resolve to existing routes.
- `useProviderFacilities` returns expected facility ids.
- `provider_events` and `facility_reviews` queries succeed (RLS already verified to allow owner reads in earlier work — re-confirm).

### 4. Verify in preview

After the migration:

1. Sign in as a provider with at least one facility.
2. `/provider/inquiries` shows locked leads with masked name/email/phone (e.g., `J*** D.`, `••••@••••.•••`).
3. Click "Unlock" — full PII appears, and unlocked-only filters work.
4. Dashboard KPI strip, Missed Leads, Lead Conversion Widget, and Facility Performance Panel all show non-zero counts where data exists.
5. Run the Supabase linter to confirm no new RLS warnings.

## Files Touched

- New migration adding the two SELECT policies on `public.leads`.
- `src/components/provider/ProviderPerformanceFeedback.tsx` — switch reads to `leads_provider_view` or non-PII columns.
- `src/components/provider/listing/ListingCard.tsx` — same.

No view changes, no app schema changes, no changes to the unlock flow or billing.
