# Pro Entitlement Leak — Root-Cause Audit (2026-07-02)

**Trigger:** a real provider (`teenacademynexus@gmail.com`, user
`282c00a0-474f-46f5-8b69-ded88b619bd3`) signed up 2026-07-01, never paid,
shows as **Free** in admin — yet listed **3 facilities** and has **10 gallery
images** (4 + 4 + 2), all approved and `verified=true`. No Stripe
customer/subscription exists for them.

This document is the pre-fix deliverable: root cause, reproduction, risk
list, and fix plan. Live-DB evidence was pulled from production project
`mldbxpntzcjalgjmwnqa` on 2026-07-02.

---

## 1. Root cause summary

The provider was never marked Pro anywhere. **Admin is right: they are Free.**
The "Pro benefits" leaked because the *limits that separate Free from Pro were
partially removed from the platform* and one approval flow stamps a benefit
flag regardless of plan:

### R1 — The facility-listing cap was deliberately deleted (primary cause)
- `supabase/migrations/20260615000000_retire_listing_cap_and_purchased_slots.sql`
  dropped `enforce_facility_limit_trigger` + `enforce_facility_limit()` under a
  since-abandoned "flat-fee unlimited listings" model.
- `src/hooks/useFacilityLimits.ts:9-11,38` hardcodes `canAddMore: true`
  ("listing limits were retired").
- The current product model (per `supabase/functions/create-checkout/index.ts:11-14`
  and the historical rule in
  `20260517010000_fix_enforce_facility_limit_pro_subscriptions_ref.sql:17-18`)
  is **Free = 1 facility, Pro = up to 5**.
- Result: any Free provider can create unlimited facilities from the signup
  wizard (`src/pages/ProviderSignup.tsx:633`) or Add Location
  (`src/pages/provider/AddLocation.tsx:418`). Nothing blocks it — not UI, not
  RLS, not a trigger. **This is exactly how the provider listed 3 facilities.**

### R2 — The photo cap is per facility, so it scales with the missing listing cap
- `enforce_facility_plan_photo_cap()` (live, from
  `20260729000000_photo_cap_reads_facility_subscriptions_tier.sql`) enforces
  Free = 5 / Pro = 10 **per facility**.
- With unlimited Free facilities, effective Free photo allowance is unbounded.
  The provider's 4+4+2 = **10 images passed legitimately** because each row was
  under the 5-photo Free cap. Restoring R1 restores the intended ceiling
  (Free = 1 facility × 5 photos).
- Storage itself is uncapped: `storage.objects` INSERT policy for
  `facility-images` checks only folder ownership; `validate-and-upload`
  enforces type/size but no count. Displayed photos are capped by the trigger,
  raw uploads are not.

### R3 — `verified=true` is stamped by admin approval, plan-independent, and self-settable
- Admin approval (`src/pages/admin/AdminProviders.tsx:509-523`) auto-sets
  `verified=true` for provider-listed rows when approving. This matches the
  audit log for all 3 facilities (`status_changed_to_approved`,
  `details.verified=true`, admin = super_admin, 2026-07-02 18:29).
- By design (migration `20260819000000_pro_gate_verified_badge.sql`) the
  *public* badge is masked by `has_active_pro()` in `public_facilities` /
  `get_public_facility_data` — so the public site does NOT show these Free
  facilities as verified. The raw column being true is why they *look* Pro in
  provider/admin surfaces.
- **Hole:** the live `enforce_facility_verified_gate()` checks only row state,
  never the actor. A provider can `UPDATE facilities SET verified=true` on
  their own approved row (RLS `facilities_update_consolidated` has no column
  restrictions; the gate's `data_source IN (...'admin_created')` branch passes
  because `facilities.data_source` **defaults to `'admin_created'`** for every
  client insert). Raw-column readers (`serve-badge`, `get_embed_badge`) would
  then show a verified badge for a Free provider.

### R4 — Stripe → DB sync has never run in production
- `stripe_webhook_events` (all-time) and `facility_subscriptions` (all-time)
  are both **EMPTY** in production. The `stripe-webhook` endpoint has never
  processed a single event — it is almost certainly not registered with Stripe
  (`admin-register-stripe-webhook` was never run, or the secret was never set).
- Consequence A: if a provider ever *does* pay, Pro will never activate and
  admin will never show payment history (opposite failure, equally
  launch-blocking).
- Consequence B: admin "payment record/details" surfaces
  (`AdminSubscriptions.tsx` → live Stripe via `get-revenue-stats`) are empty —
  matching the reported "no clear admin payment record".

### R5 — Webhook can activate Pro on unpaid/incomplete sessions (latent)
- `stripe-webhook/index.ts` `checkout.session.completed` handler
  (~line 2462-2517) writes `tier='pro', status='active'` **without checking
  `session.payment_status === 'paid'`** or the subscription status.
- `customer.subscription.created` (~line 3689) calls `activateProBenefits`
  (sets `profiles.plan='pro'`, `facilities.featured=true`, +50 ranking) purely
  on `planTier==='pro'`, **regardless of `subscription.status`** — an
  abandoned 3DS/`incomplete` subscription would grant benefits before payment.
- `customer.subscription.updated` maps `incomplete → 'past_due'`
  (~line 2609-2618), and `has_active_pro()` **grants grace benefits for
  `past_due`** (migration `20260829000100`) — so a never-paid subscription
  would be entitled. The "gates benefits the same way" comment predates the
  grace change and is now wrong.

### R6 — Admin Pro badge reads a drifted query (cosmetic-to-misleading)
- `AdminProviders.tsx:319,349-366` and `ProviderDetailModal.tsx:90-102` filter
  `facility_subscriptions` only by `status IN ('active','past_due')` — no
  `tier='pro'` filter, no `current_period_end` check. Add-on or expired rows
  would badge as "Pro". `get-facility-plan` conversely omits the `past_due`
  grace that every other gate honors.

### Non-causes verified clean
- Signup (`register-provider-account`) and profile creation: `profiles.plan`
  defaults to `'free'`, NOT NULL, and a DB guard blocks client writes to it.
- No optimistic client Pro grant: checkout success pages only *poll* for the
  webhook-written row (`PlanStep.tsx`, `Billing.tsx`).
- No admin "grant Pro" backdoor exists (`admin-manage-invoice` is a 410
  tombstone).
- Webhook has signature verification + atomic event-id idempotency
  (`claim_stripe_webhook_event`).
- Featured placement, lead routing/updates, review-request links, staff caps,
  team RPCs, ranking boost, credential kit: all correctly server-gated on
  `has_active_pro`.

## 2. Reproduction (how a Free provider gets "Pro benefits")

1. Sign up as a provider (Free plan, no card ever entered).
2. Complete the wizard → facility #1 created (`status='pending'`).
3. Visit `/provider/add-location` twice more → facilities #2 and #3 created.
   Nothing blocks this at any layer (R1).
4. Upload up to 5 photos per facility → 15 possible on Free (R2). The real
   provider uploaded 4+4+2 = 10.
5. Admin approves the pending listings (normal moderation) → approval
   auto-stamps `verified=true` on each (R3).
6. Result: 3 approved, verified-flagged listings and 10 photos on a $0 plan —
   with zero Stripe history, and admin correctly showing "Free".

## 3. Risk list (affected workflows)

| # | Workflow | Risk |
|---|---|---|
| 1 | Free signup / Add Location | Unlimited free listings (revenue leak; the reported case) |
| 2 | Free photo uploads | Photo allowance scales with listing count; storage uploads uncapped |
| 3 | Pro upgrade payment | Webhook never registered → paying customers get nothing (R4) |
| 4 | Unpaid/incomplete checkout | Would activate Pro benefits if webhook were live (R5) |
| 5 | Provider self-`verified` | Free provider can set raw `verified=true`; leaks via serve-badge/embed RPCs (R3) |
| 6 | Embed badge/review widgets | Pro paywall is client-only; anon endpoints serve any facility |
| 7 | Review responses | Advertised Pro-only (`ForProviders.tsx:323`) but not gated at any layer |
| 8 | Admin Pro badge | Query drift can show Pro for non-Pro rows (R6) |
| 9 | Plan changes | No dedicated audit trail of tier/status transitions |
| 10 | Prod migration drift | Repo migrations `20260829000600`–`003600` (admin hardening) are NOT applied to production (live max = `20260829000500`) |

## 4. Fix plan (implemented in this change)

1. **Restore the plan-based facility cap** (Free=1, Pro=5) as a BEFORE INSERT
   trigger reading `facility_subscriptions` with `has_active_pro` semantics
   (webhook-confirmed only — never `profiles.plan`); admin/service-role exempt.
   Client: `useFacilityLimits` computes real limits; Add Location blocks at
   cap with an upgrade CTA. Existing over-limit rows are grandfathered (no
   destructive change); admin remediation steps documented below.
2. **Webhook payment guards**: `checkout.session.completed` activates only
   when `payment_status='paid'` (or sub already active/trialing); otherwise
   records the row as `status='incomplete'` (no benefits — `has_active_pro`
   ignores it). `customer.subscription.created` grants benefits only for
   active/trialing. `subscription.updated` maps `incomplete → 'incomplete'`
   (not `past_due`) and activates benefits on `incomplete → active`.
   `invoice.payment_failed` no longer promotes an `incomplete` row to
   `past_due` grace.
3. **Verified gate requires an admin/service actor** — providers can no longer
   self-set `verified=true` regardless of `data_source`.
4. **Server-gate the embed endpoints** (`get_embed_badge`, `get_embed_reviews`
   RPCs + `serve-badge`) on `has_active_pro`, and gate review responses
   (advertised Pro) on `has_active_pro` for non-admins.
5. **Cap storage uploads** per user in the `facility-images` bucket
   (plan-aware object-count ceiling in the storage INSERT policy +
   `validate-and-upload`).
6. **Fix admin badge queries** to filter `tier='pro'` and apply
   `has_active_pro` period semantics (shared `isActiveProRow` helper); align
   `get-facility-plan` with the canonical `past_due` grace.
7. **Plan-change audit log**: `plan_change_audit` table populated by trigger on
   every `facility_subscriptions` insert/update/delete (old/new tier+status,
   actor, stripe ids). Admin-read-only via RLS.
8. **Tests**: source-contract regression tests covering Free-vs-Pro caps,
   unpaid/incomplete checkout, webhook confirmation path, admin display
   source, image caps, and facility caps.

### Operational actions required (cannot be done from the repo)
- **Register the Stripe webhook**: run `admin-register-stripe-webhook`
  (service-role) once, paste the returned signing secret into the
  `STRIPE_WEBHOOK_SECRET` function secret, then send a Stripe test event and
  confirm a row appears in `stripe_webhook_events`. Until this is done, *no
  payment will ever activate Pro*.
- **Apply outstanding migrations** `20260829000600`–`003600` (admin-hardening
  batch) to production — they exist in the repo but were never applied.
- **Real-provider remediation** (business decision, intentionally not
  automated): user `282c00a0-474f-46f5-8b69-ded88b619bd3` keeps 3 facilities
  (two of them near-duplicates "Nexus Teen Academy"). To bring them within the
  Free cap, suspend or delete the extra rows in Admin → Providers
  (facility ids `e48fddcf-80b8-4681-b7f5-876f28572e18`,
  `bdfa108b-4419-4629-a043-34c438283545`), or contact them to upgrade. New
  facility inserts for them are blocked by the restored cap either way.
