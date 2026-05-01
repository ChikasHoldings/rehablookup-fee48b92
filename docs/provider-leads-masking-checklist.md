# Provider Panel — Lead Visibility & Masking Checklist

This checklist is enforced automatically by:

- `scripts/check-provider-leads-masking.mjs` (build gate)
- `src/test/provider-leads-masking.test.ts` (vitest, runs in `npm run test`)
- `scripts/check-leads-view-rls.mjs` (DB-side RLS guarantees)

Any change to provider-panel code that violates the rules below will fail
`npm run build`.

---

## 1. Read path — must use the masked view

Provider code must **only** read lead rows through the masked database view:

```ts
supabase
  .from("leads_provider_view")           // ✅ correct
  .select("id, status, urgency, …")       // ✅ explicit columns only
```

Forbidden:

```ts
supabase.from("leads").select(...)        // ❌ unmasked base table
supabase.from("leads_provider_view").select("*") // ❌ no select(*)
```

`leads_provider_view` is a `security_invoker = true` view over `public.leads`
that masks `name`, `email`, `phone`, etc. until a matching row exists in
`lead_unlocks` for the caller's facility.

## 2. Write path — base table allowed for non-PII fields only

Updates to `public.leads` from provider code are permitted **only** for the
following fields (gated by RLS):

- `status`
- `provider_response_status`
- `provider_responded_at`
- `snooze_until`

```ts
supabase.from("leads")
  .update({ status: "contacted" })
  .eq("id", leadId);                      // ✅ allowed (RLS-gated)
```

PII columns (`name`, `email`, `phone`, intake details) must **never** be
written from the provider panel.

## 3. Provider routes covered

The vitest suite asserts each of these routes individually:

| Route                          | File                                       |
|--------------------------------|--------------------------------------------|
| `/provider/dashboard`          | `src/pages/provider/Dashboard.tsx`         |
| `/provider/inquiries`          | `src/pages/provider/Inquiries.tsx`         |
| `/provider/my-listings`        | `src/pages/provider/MyListings.tsx`        |
| `/provider/listing/:id`        | `src/pages/provider/ListingEditor.tsx`     |
| `/provider/add-location`       | `src/pages/provider/AddLocation.tsx`       |
| `/provider/analytics`          | `src/pages/provider/Analytics.tsx`         |
| `/provider/billing`            | `src/pages/provider/Billing.tsx`           |
| `/provider/reviews`            | `src/pages/provider/Reviews.tsx`           |
| `/provider/notifications`      | `src/pages/provider/Notifications.tsx`     |
| `/provider/settings`           | `src/pages/provider/Settings.tsx`          |
| `/provider/placement-network`  | `src/pages/provider/PlacementNetwork.tsx`  |
| `/provider/pro-upgrade`        | `src/pages/provider/ProUpgrade.tsx`        |
| `/provider/embed-badge`        | `src/pages/provider/EmbedBadge.tsx`        |
| `/provider/help`               | `src/pages/provider/Help.tsx`              |
| `/provider/knowledge-base`     | `src/pages/provider/KnowledgeBase.tsx`     |
| `/provider/image-guidelines`   | `src/pages/provider/ImageGuidelines.tsx`   |

When a new provider route is added:

1. Add the file path to `PROVIDER_ROUTE_FILES` in
   `src/test/provider-leads-masking.test.ts`.
2. Make sure any lead reads in the new route use `leads_provider_view`.
3. Run `npm run check:provider-leads-masking` to verify locally.

## 4. RLS guarantees on the database

Independently of the application-layer scan, the migration
`20260501052106_*` adds `verify_leads_provider_view_rls()` and the
script `scripts/check-leads-view-rls.mjs` (also wired into `build`)
asserts:

- `public.leads_provider_view` exists.
- RLS is enabled on `public.leads`.
- The required SELECT policies are in place:
  - `Owners can view their facility leads`
  - `Providers can view their redistributed leads`
- The view is created `WITH (security_invoker = true)` so caller RLS is
  enforced through it.

## 5. CI integration

```bash
npm run check:provider-leads-masking   # static audit (this checklist)
npm run check:leads-view-rls           # DB-side RLS audit
npm run test                           # includes the vitest contract test
```

All three run automatically as part of `npm run build`.
