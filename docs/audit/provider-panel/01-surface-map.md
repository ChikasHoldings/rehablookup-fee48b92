# Provider Panel — Surface Map (Phase 1)

_Generated: 2026-05-01. Source of truth for the rest of the audit._

## 1. Routes

### Public / pre-auth (under `PublicRouteGuard` or none)
- `/provider-signup` → `ProviderSignup`
- `/provider-login` → redirect to `/login`
- `/provider/login` → redirect to `/login`
- `/provider/forgot-password` → `ProviderForgotPassword`
- `/provider/reset-password` → `ProviderResetPassword` (also legacy `/provider-reset-password` redirects here)
- `/provider-resources`, `/provider-faq`, `/provider-support`, `/provider-roi-calculator`
- `/provider-guides/*` (~50 SEO landing pages, `PublicRouteGuard`)

### Authenticated panel (under `<ProviderShell />` at `/provider`)
| Path | Page | Notes |
| --- | --- | --- |
| `/provider` | redirect → `/provider/dashboard` | |
| `/provider/dashboard` | `Dashboard.tsx` | KPIs, lead feed, missed leads, placements, ROI |
| `/provider/listings` | `MyListings.tsx` | Multi-facility list + add-card |
| `/provider/listing` | redirect → `/provider/listings` | |
| `/provider/add-location` | `AddLocation.tsx` | Single-form facility creation |
| `/provider/inquiries` | `Inquiries.tsx` | Lead inbox (masked until unlock) |
| `/provider/reviews` | `Reviews.tsx` | Facility reviews moderation/replies |
| `/provider/analytics` | `Analytics.tsx` | Lead + engagement analytics |
| `/provider/credits` | redirect → `/provider/billing?purchase_credits=true` | |
| `/provider/pro-upgrade` | `ProUpgrade.tsx` | Stripe subscription checkout |
| `/provider/billing` | `Billing.tsx` | Credits, invoices, payment methods, auto-reload |
| `/provider/settings` | `Settings.tsx` | Profile, sessions, MFA, account deletion |
| `/provider/embed-badge` | `EmbedBadge.tsx` | Embeddable verification badge |
| `/provider/notifications` | `Notifications.tsx` | In-app notifications |
| `/provider/help` | `Help.tsx` | Support form |
| `/provider/knowledge-base` | `KnowledgeBase.tsx` | Self-serve docs |
| `/provider/image-guidelines` | `ImageGuidelines.tsx` | Static guidelines |
| `/provider/placement-network` | `PlacementNetwork.tsx` | Concierge / placement inquiries |
| `/provider/placements` | redirect → `/provider/placement-network` | |

**Auth gate** (`src/components/provider/ProviderShell.tsx`):
- Uses `useUserRole()` + `supabase.auth.onAuthStateChange`.
- Redirects: admin → `/admin`; client/seeker → `/account`; unauthenticated → `/login?type=provider`; authenticated with no `profiles` row → `/login?type=provider`.
- `hasRedirected` ref guards against double-fire in StrictMode.

## 2. Hooks → backend mapping

| Hook | Reads (table/view/RPC) | Writes via |
| --- | --- | --- |
| `useUserRole` | `user_roles` | — |
| `useProviderData` | `profiles`, `facilities` | — |
| `useProviderFacilities` | `facilities` (owner scope) | direct mutate (RLS) |
| `useApprovedFacilities` | `facilities` (`status='approved'`) | — |
| `useFacilityLimits` | `pro_subscriptions`, `purchased_listing_slots` | — |
| `useProStatus` | `pro_subscriptions` | — |
| `useProviderCredits` | `provider_credits`, `credit_transactions` | edge fn `purchase-credits` |
| `useUnlockPricing` | `platform_settings`, `pro_subscriptions` | — |
| `useLeadAccess` | RPC `check_lead_access` | — |
| `useLeadUnlocks` | `lead_unlocks` (RLS by provider_id) | edge fn `unlock-lead` |
| `useLeadCountdown` | derived from `leads.created_at` | — |
| `useLeadContactTracking` | `lead_contact_attempts` | direct insert |
| `useLeadAnalytics` | `provider_events`, `leads_provider_view` | — |
| `useCentralizedLeadAnalytics` | `provider_events` aggregates | — |
| `useFacilityReviews` | `facility_reviews` | direct (RLS) |
| `useFacilityRating` | aggregate of `facility_reviews` | — |
| `useFacilityStaff` | `facility_staff` | direct (RLS) |
| `useFacilityBadges` | `facility_badges` | — |
| `useProviderNotifications` | `provider_notifications` | direct (RLS) realtime |
| `useProviderPaymentMethods` | edge fn `get-payment-method` | edge fn `save-provider-payment-method` |
| `useProviderReviews` | review aggregations | — |
| `useProviderSearch` | RPCs/`facilities` | — |
| `useProviderEventTracking` | edge fn `track-provider-event` | — |

## 3. Edge functions reachable from the panel

**Lead / unlock**
- `unlock-lead` (POST, JWT-validated, 731 LOC) — RLS-enforced unlock + atomic credit deduction with rollback path
- `process-lead-redistribution` (cron-driven, not directly invoked by panel)
- `send-unlock-reminders`

**Credits / billing**
- `purchase-credits` — fixed tiers ($200 / $500 / $1000), Stripe checkout + idempotency
- `auto-reload-credits` — off-session PaymentIntent, advisory-locked per-provider
- `get-payment-method` / `save-provider-payment-method` / `setup-provider-payment-method`
- `customer-portal` — Stripe billing portal session
- `get-billing-history`
- `notify-payment-failed`, `retry-failed-payments`
- `validate-promo-code`

**Subscription / Pro**
- `subscribe-pro` (Stripe checkout, recurring)
- `check-subscription`
- `get-provider-subscription`
- `manage-subscription`
- `purchase-listing-slot`

**Facility lifecycle**
- `notify-admin-provider-signup`
- `send-provider-welcome-email`, `send-provider-welcome-offer-email`
- `send-approval-email`
- `send-profile-complete-email`, `send-profile-reminders`
- `send-credential-notification`
- `notify-flagged-image`
- `report-image`
- `serve-badge`, `track-featured-analytics`

**Placement Network / Concierge**
- `submit-placement-case`, `confirm-placement`, `charge-placement-fee`
- `send-tour-notifications`, `send-concierge-notifications`, `send-concierge-introduction`
- `send-abandoned-placement-email`

**Notifications / messaging**
- `send-lead-confirmation`, `send-lead-email`, `send-message-notifications`
- `send-sms-notification`, `send-sms-verification-code`, `verify-sms-code`
- `send-reply-email-verification`, `verify-reply-email-code`
- `send-provider-support`

**Stripe webhook** (1,932 LOC) — handles `checkout.session.completed`, subscription lifecycle, invoice failures, dispute, refund.

## 4. Database: provider-reachable surface

**Tables** (RLS confirmed via `pg_policy` on `public.leads`):
- `leads` — 8 policies. SELECT: `Owners can view their facility leads`, `Owners can view unlocked facility leads`, `Providers can view their redistributed leads`, `Providers can view unlocked redistributed leads`, `Admins can view all leads`. UPDATE: `Providers can update their unlocked leads`, `Admins can update all leads`. INSERT: `Anyone can submit leads`.
- `leads_provider_view` (security_invoker view — verified by `verify_leads_provider_view_rls()`)
- `lead_unlocks`, `lead_distributions`, `credit_transactions`, `provider_credits`
- `pro_subscriptions`, `purchased_listing_slots`
- `facilities`, `facility_staff`, `facility_reviews`, `facility_badges`
- `concierge_inquiries`, `concierge_introductions`
- `provider_notifications`, `provider_events`
- `user_sessions`, `user_roles`, `profiles`
- `platform_settings`, `stripe_webhook_events`, `admin_notifications`

**Key SECURITY DEFINER RPCs touching provider data**:
- `check_lead_access`, `is_lead_unlocked`, `can_access_lead`
- `calculate_lead_credit_cost`, `calculate_lead_score`, `get_lead_score_label`
- `get_owner_facility_data`, `get_public_facility_data`
- `get_provider_credit_balance`, `get_pending_leads_count`, `get_facility_leads_count`
- `get_unlocked_lead_data`, `get_provider_safe_inquiries`, `get_disclosed_inquiry_for_provider`, `get_provider_facility_placements`
- `has_active_pro`, `get_pro_discount`
- `claim_stripe_webhook_event`, `mark_stripe_webhook_event_processed`, `try_acquire_auto_reload_lock`
- `verify_leads_provider_view_rls` — guard RPC

## 5. Auth & role posture

- Panel requires `profiles` row (provider profile) AND not seeker AND not admin.
- Role table: `user_roles` (separate from profiles, per platform memory).
- `prevent_provider_double_account`, `prevent_seeker_double_account`, `prevent_admin_double_account` triggers enforce single-role identity at insert time.
- Edge functions consistently use anon-key client + `auth.getUser(token)` to validate JWT in code (verified in `unlock-lead`, pattern is repeated).
- `verify_jwt = false` is the project default; in-code JWT validation is the contract.
