# Directory cutover — Stage 3: provider + admin UX

**Branch:** `directory-cutover-03-provider-admin`
**Base:** `bebc7e22a6c9e0febbe4be37e2c47482adac9531` (Stage-2 rollout doc, documentation-only)
**Status:** code-prep + Vercel Preview only. Not merged, not deployed to production.

Stage 1 cut the public shell to the directory model. Stage 2 cut the inquiry and
phone model. Stage 3 cuts the **authenticated provider and admin experience** over
to the same model.

This stage is frontend only. It retires no schema, no edge function, no cron job,
and no Stripe product — that is Stage 4. Everything under `supabase/` is
byte-identical to the base commit.

---

## Product contract this stage implements

RehabLookup is a trusted data and discovery layer for addiction treatment. It is
**not** a placement service, an advisor service, a concierge service, or a lead
marketplace.

- Every eligible approved facility can receive inquiries — Free included. Pro is
  not required. Featured is not required.
- Every inquiry stays pinned to the one facility the seeker selected. No matching,
  no reassignment, no redistribution, no advisor, no fallback.
- Only the canonical active Pro facility publishes a phone number publicly.
- Monetization is exactly: $0 listing/claim, $99/month Pro, Featured add-on.
- Providers pay for visibility and features. They do not pay for trust, and they
  do not buy patient leads.

---

## Provider information architecture

### Sidebar — before → after

| Before | After |
| --- | --- |
| Dashboard | Dashboard |
| **Leads** | **Inquiries** |
| My Listing | My Listing |
| Claims | Claims |
| Analytics | Analytics |
| Reviews | Reviews |
| Subscription | Subscription |
| Marketing *(badged with pending Concierge cases)* | Marketing |
| Settings | Settings |
| Help & Support | Help & Support |

The pending-**concierge** count badge on Marketing was removed. Only the pending
**inquiry** badge remains, on the Inquiries entry where it belongs.

### Mobile bottom nav — before → after

| Before | After |
| --- | --- |
| Home | Home |
| **Leads** | **Inquiries** |
| **Concierge** → `/provider/marketing/concierge` | **Analytics** → `/provider/analytics` |
| Listings | Listings |
| More | More |

### Provider dashboard — before → after

**Removed**

- Inquiries KPI showed the literal string `"Pro"` with the subtitle *"Upgrade to
  receive"* for non-Pro facilities. This contradicted the live Stage-2 contract
  and is the most user-visible falsehood this stage fixes — see below.
- `ConciergeAnalyticsWidget` (mounted when `has_concierge_partner`).
- "Concierge Partner" row in the *Marketing & growth* card.
- Pro upsell bullet *"Inquiries delivered to your inbox"*.

**Now**

- The Inquiries KPI shows the real count for **every** tier, with follow-up state.
- Recent-inquiries card renders for every tier, not only Pro.
- Pro upsell leads with *"Your phone number shown on your public profile"* — the
  actual Stage-2 Pro benefit.
- Everything else on the dashboard was already directory-oriented and is retained:
  locations, profile completeness, reviews, impressions, performance snapshot,
  listing health, verification state, recent activity, Featured.

#### Why the Pro gate on inquiries was a defect, not a feature

`leads_provider_view` is `security_invoker` over `leads`. The governing policy is
`leads_select_consolidated`, which scopes SELECT to the caller's own facilities
(or admin) with **no Pro predicate**. Only `leads_update_consolidated` requires
`has_active_pro`.

So a Free facility could always both receive and read its inquiries; the
dashboard was simply refusing to show them. Responding is genuinely Pro-gated at
the database level, and that gate is preserved and still explained in the inquiry
detail panel — the copy just says "inquiries" now instead of "leads".

### Provider inquiry terminology

User-facing "Leads" → "Inquiries" across the active workflow:

| Before | After |
| --- | --- |
| Leads *(page title)* | Inquiries |
| Lead details | Inquiry details |
| No leads yet | No inquiries yet |
| How leads work | How inquiries work |
| Loading your leads… | Loading your inquiries… |
| `itemLabel="lead"` | `itemLabel="inquiry"` |
| Unknown Lead | Unknown |
| Add a note about this lead… | Add a note about this inquiry… |
| Upgrade to Pro to respond to leads | Upgrade to Pro to respond to inquiries |
| Leads *(command palette group)* | Inquiries |

**Not renamed** — this is a product-language cutover, not a schema rename: the
`leads` table, `lead_id`, `leads_provider_view`, `useLeadUnreadCounts`, React
Query keys, edge-function internals, and component filenames under
`components/provider/leads/` all keep their identifiers.

No inquiry is labelled *qualified*, *verified*, or *matched* anywhere in the
active UI.

### Provider retired actions removed

- **"Exclusive" / "Shared" badges** on inquiry list items. These were
  lead-marketplace semantics: an inquiry goes to exactly one facility, so there
  is no exclusivity window to win and nothing is ever shared with a competitor.
- **Concierge Partner add-on** — card, locked variant, pricing, CTAs, and the
  plan-comparison row. Featured is the only visibility add-on sold.
- **Placement results** in the provider command palette, which queried
  `concierge_introductions` and routed into the concierge management surface.
- **Concierge-targeted conversion promo.** `ConversionPromoPopup` is mounted by
  `ProviderShell` on every provider page and routed a `target_product =
  'concierge'` campaign to `/provider/marketing/concierge`. It now suppresses
  any promo whose target is not a product RehabLookup still sells (Pro or
  Featured).
- **"Concierge" in the dunning banner.** `DunningBanner`, also shell-mounted,
  named `has_concierge_partner` in its past-due plan label. Such a row now falls
  back to "Subscription"; the amount owed is unaffected.

- **Retired-workspace imports in the prefetch maps.** `routePrefetch.ts`,
  `adminPrefetch.ts`, and `PrefetchLink.tsx` all mapped `/admin/concierge` to
  the interactive `AdminConcierge` component, and `preloadAdminPages()` eagerly
  imported it on every admin shell mount — so the retired workspace stayed in
  the active bundle graph and was prefetched, even though no nav linked to it
  and the route no longer rendered it. All three now point at the archive, the
  eager preload was replaced with `AdminClaimsReviewPanel`, and the retired
  `AdminConcierge` chunk no longer appears in `dist/assets/` at all.

These were found by **Preview verification**, not by the local guard —
they are shell-mounted chrome and bundle-graph wiring rather than navigation,
and were outside the guard's original scope. Inspecting the *shipped* Preview
bundles — not just the source — is what surfaced them. The guard now covers
components the shells mount directly and gained a fourth check (below) for
retired-page imports; both were re-verified to fail on the exact misses they
had made.

### Provider routes

| Route | Before | After |
| --- | --- | --- |
| `/provider/marketing/concierge` | Concierge management page | → `/provider/marketing` |
| `/provider/billing/concierge` | Concierge billing page | → `/provider/billing` |
| `/provider/billing/placements` | Placement billing page | → `/provider/billing` |
| `/provider/placement` | → `/provider/marketing/concierge` | → `/provider/dashboard` |
| `/provider/placement-network` | → `/provider/marketing` | unchanged |
| `/provider/placements` | → `/provider/marketing/featured` | unchanged (Featured Placements is a live product) |
| `/provider/credits` | → `/provider/billing` | unchanged |

`/provider/placement` previously redirected into another retired workflow. That
chain is gone: no redirect now lands on a retired surface.

### PR #78 preservation

Untouched and asserted by tests:

- `/provider/onboarding`, `/provider/onboarding/new-listing`
- `/provider/claim/:slug`, `/provider/claim/:slug/submitted`, `/provider/claims`
- claimant resume path (`resolveProviderPostLoginPath` in `ProviderShell`)
- open-claim visibility banner on the dashboard
- Pro activation with correct `facility_id` metadata (`PlanStep`, billing)
- ownership/security guards in `ProviderShell`

The signup → claim → onboarding → Pro upgrade flow is unchanged.

---

## Admin information architecture

### Nav — before → after (super admin / manager)

| Before | After |
| --- | --- |
| Dashboard | Dashboard |
| Inquiries | Inquiries |
| Insurance VOB | Insurance VOB |
| — | **Claims** *(newly surfaced)* |
| Re-verification | Re-verification |
| Providers | Providers |
| Clients | Clients |
| **Placements → `/admin/concierge`** | *(removed)* |
| Subscriptions | Subscriptions |
| Support Inbox / Reviews / Escalations | unchanged |
| Marketing Leads / Blog | unchanged |
| Analytics | unchanged |
| System group / Settings | unchanged |

`/admin/claims` was already a mounted route with a permission mapping but had
**no nav entry** — facility-ownership verification is core directory operations,
so it now has one.

"Marketing Leads" is retained deliberately: it is the `marketing_leads` table of
provider-side sales contacts, not patient inquiries. Renaming it would have been
the "blindly replace every string named lead" mistake.

### Advisor role

The advisor nav was *entirely* the placement workspace. With Placements removed
it is Dashboard + Analytics (Analytics only when the `analytics` permission is
granted, matching the route gate).

`AdvisorDashboard` was a 726-line placement case-manager that **wrote to
production**: it claimed cases by updating `concierge_inquiries.assigned_advisor_id`
and inserted `concierge_case_events` rows. It has been replaced with a read-only
directory dashboard (published facilities, reviews awaiting moderation,
permission-filtered links) that performs no writes at all.

The `advisor` role itself — its DB enum value, its `placements` permission, and
`advisor_earnings` — is Stage-4 debt.

### Admin dashboard — before → after

**Removed**

- **Placement Pipeline** card (7-stage `concierge_inquiries` status board) —
  super admin.
- **Active Cases** KPI and **Placement Pipeline** card — manager. Replaced with
  **Pending Claims** KPI and a **Claims Queue** card reading
  `facility_claim_requests`.
- **Placement Center** quick action → replaced with **Review Claims**.
- **Concierge** tier tile and its MRR line in the add-on adoption card.
- Provider KPI breakdown `"N Placement"` (confirmed placements) → `"N Featured"`
  (a live add-on, counted from `facility_subscriptions.has_featured`).
- **Lead Funnel** chart (total → verified) → **Inquiries** chart (this month /
  awaiting triage).
- `verified` inquiry sub-metric and `verificationRate`. `leads.email_verified`
  records that a seeker confirmed their email address; it does not make the
  inquiry "verified", and labelling it so overstated what the platform knows.
- Concierge case search and the "View Placement Cases" / "Concierge" entries in
  the admin command palette.
- Critical-alerts banner CTA "Open concierge queue" → "Review alerts"
  (`/admin/notifications`). The alert **types** are still matched so an unread
  historical safety row cannot silently disappear, and
  `lead_notification_event_failure` — a live Stage-2 alert — was added.
- "Placement Advisors" → "Advisors" in team labels.

### Admin inquiry terminology and actions

`/admin/leads` was already titled "Inquiries" from Stage 2. This stage removed
the remaining marketplace machinery:

- **Bulk Reassign** toolbar action and `BulkReassignDialog` (deleted — it called
  `admin-bulk-reassign-leads` to move inquiries between facilities).
- **Reassign Lead** action and its mutation in the inquiry detail modal.
- **Distribution History** panel, **Distributions** stat tile, **Redistributed**
  badges, and the `Distribution` status row.
- **Converted to Placement** badge and panel (`concierge_inquiries` lookup).
- Timeline labels: "Lead Created & Assigned" → "Inquiry Received", "Lead Expired"
  → "Inquiry Expired", "Lead Lifecycle" → "Inquiry Lifecycle", "Lead Details"
  tab → "Inquiry Details".
- The **Concierge-queue awareness banner**, which told admins this table was
  "Pro-only" and that Free/unclaimed inquiries lived on a parallel concierge
  surface. Both statements became false when `submit-qualified-lead` 3.1.0
  retired the free-tier redirect in Stage 2.

Reassignment was removed rather than relabelled because moving an inquiry to a
different facility silently redirects a person's request for care to a business
they did not choose.

### Admin historical legacy access

Production holds 1 `concierge_inquiries` row and 7 `concierge_case_events` rows.
Destroying them would destroy an audit trail, so they remain readable — and
nothing more.

`/admin/concierge` now serves **`AdminConciergeHistorical`**: a read-only archive
listing archived cases and record counts, framed explicitly as retired, linking
forward to `/admin/leads`. It performs only `SELECT`s — no update, insert, delete,
or mutation hook — and it reports when its 50-row page truncates a larger set.

The interactive workspace (`AdminConcierge` and everything under
`components/admin/concierge/**` — stage actions, advisor assignment, bulk
advisor reassign, introductions batch, tours, placement stepper) remains in the
repo but is **unmounted from the router**. Stage 4 deletes it.

`SeekerPlacementsTab` in the user profile modal is read-only and was reframed:
tab label "Placements" → "Placement History", an explicit read-only notice, and
the misleading "Active" case count removed — no case is active when the product
is retired.

### Admin routes

| Route | Before | After |
| --- | --- | --- |
| `/admin/concierge` | interactive Placements workspace | read-only historical archive |
| `/admin/concierge/audit-review` | audit review page | → `/admin/concierge` |
| `/admin/concierge/metrics` | metrics page | → `/admin/concierge` |
| `/admin/inbox` | → `/admin/concierge?tab=inbox` | → `/admin/concierge` |
| `/admin/international` | → `/admin/concierge` | → `/admin/concierge` |
| `/admin/international/agreement` | → `/admin/concierge` | → `/admin/concierge` |
| `/admin/provider-directory` | → `/admin/concierge?tab=directory` | → `/admin/providers` |
| `/admin/placement-revenue` | → `/admin` | → `/admin/dashboard` |

`/admin/provider-directory` was an advisor placement-matching tool; the provider
directory an admin actually wants is `/admin/providers`. `/admin/placement-revenue`
now targets a page rather than a route that immediately re-redirects.

---

## Regression guard

`scripts/check-provider-admin-directory-model.mjs`, wired into `build:vercel`
immediately before `validate:blocking`.

Four checks, scoped to 36 active authenticated surfaces — route definitions,
shells, shell-mounted chrome, primary navigation, dashboards, and the inquiry
workflow:

1. **Terms** — no retired concept in user-facing copy. Comments are stripped and
   only string literals and JSX text are scanned, so identifiers, table names,
   and PostgREST column lists are out of reach. Rules are concepts, never bare
   words: the live product genuinely says "Featured Placements" and "priority
   placement".
2. **Labels** — primary nav must present the workflow as "Inquiries", never
   "Leads", and must positively link `/provider/inquiries` (so deleting the entry
   cannot pass a ban-list).
3. **Routes** — every nav destination resolves to a mounted route, is not itself
   a compatibility redirect, and is not a retired workflow. No redirect may chain
   or land on a retired workflow.
4. **Imports** — no router or prefetch map may import a retired page component.
   `AdminConciergeHistorical` is matched by suffix so it is never confused with
   `AdminConcierge`.

Deliberately allowed: `supabase/**`, migrations, edge functions, database
identifiers, internal variables, the unmounted legacy workspace, the historical
archive page, public/educational articles, and comments explaining what was
retired.

`NAV_FORBIDDEN` and `REDIRECT_FORBIDDEN` are separate lists: `/admin/concierge`
may never appear in navigation, but *is* the correct redirect target for a stale
placement bookmark, because it is now the archive.

The guard was verified to fail on seven injected regressions — reinstated
Concierge nav entry, "Leads" relabel, a "Purchase leads" CTA, a dead nav link,
nav pointing at a compatibility redirect, the reinstated "Concierge" dunning
label, and a prefetch map repointed at the retired workspace — and to pass once
each was reverted.

---

## Tests

`src/__tests__/provider-admin-directory-model.test.tsx` — 56 tests.

Behavioural where possible: `adminNavConfig` is imported and called for all four
roles, and `ProviderSidebar` / `MobileBottomNav` are **rendered** with their data
hooks mocked, so assertions run against the DOM an operator sees. Source-level
assertions strip comments first — a comment explaining that Concierge was retired
is the opposite of a regression.

Coverage: provider nav contents and labels, inquiry badge placement, mobile nav,
dashboard Pro-gate removal and KPI bans, inquiry terminology and facility
pinning, absence of unlock/buy/reassign/redistribute, Featured-only monetization,
admin nav across all roles, admin inquiry actions, admin dashboard KPIs, advisor
dashboard write-freedom, archive read-only-ness and nav absence, route redirects,
redirect-chain and dead-redirect freedom, absence of retired-page imports in
the router and prefetch maps, and PR #78 flow mounting.

`src/components/admin/__tests__/adminNavConfig.test.ts` — `KNOWN_ADMIN_ROUTES`
gained `/admin/claims`, as that file's own docblock instructs when a nav entry
starts pointing at an existing route.

---

## Validation

| Check | Result |
| --- | --- |
| `npm run typecheck` | 0 errors (baseline 0) |
| `npm run lint` | 216 findings / 180 errors / 36 warnings — **identical to baseline, per file** |
| `npm test -- --run` | 875 passed, 57 files, 0 failed |
| `check:directory-public-shell` | pass |
| `check:inquiry-routing-prerender` | pass |
| `check:pro-phone-visibility` | pass |
| `check:public-navigation` | pass |
| `check:public-directory-truth` | pass |
| `check:no-placeholder-phone` | pass |
| `check:no-fake-inventory` | pass |
| `check:redirect-targets` | pass |
| `check:canonical-ga` | pass |
| `check:no-duplicate-keys` | pass |
| `check:internal-links` | pass |
| `check:edge-function-auth` | pass |
| `check:pnpm-lockfile` | pass |
| `check:facility-placeholder` | pass |
| `check:leads-view-rls` | pass |
| `check:provider-leads-masking` | pass |
| `check:provider-admin-directory-model` | pass (new) |

No global lint-baseline cleanup was attempted; that is a separate task.

---

## Backend boundary

`git diff bebc7e22 -- supabase/` is empty. Verified byte-identical:

- `supabase/migrations/**` — migration head remains `20260831000000`
- `supabase/functions/submit-qualified-lead/**` — v22, `VERSION 3.1.0`,
  `ezbr_sha256:19c3cc25956130716f6b078e241427c7b298384da05d17e98861726bc5c1cb73`
- `supabase/functions/get-public-facilities/**` — v14
- `supabase/functions/get-featured-rotation/**` — v13

No Stripe, checkout, subscription, or webhook backend file changed. No migration
was authored. No Supabase row was written. Production was read for baseline
verification only.

---

## Stage-4 debt explicitly deferred

Nothing below was touched. All of it still exists after Stage 3, as expected.

**Database**
`concierge_inquiries`, `concierge_case_events`, `concierge_introductions`,
`concierge_threads`, `concierge_partner_facilities`, `lead_distributions`,
`lead_routing_logs`, `advisor_earnings`; `leads` columns
`redistribution_status`, `exclusive_until`, `extended_until`,
`original_facility_id`, `assignment_status`, `assignment_reason`, `assigned_at`,
`shared_with`; `facility_subscriptions.has_concierge_partner`; the
`admin_role_type` `advisor` enum value and the `placements` permission key; RLS
policies scoped to advisor reads.

**Edge functions / jobs**
Concierge, advisor, placement, redistribution and international functions;
`notify-free-tier-inquiry-redirect`; `process-lead-redistribution`;
`admin-bulk-reassign-leads`; `submit-concierge-intake`; associated cron jobs.

**Stripe**
Concierge Partner product and price (`TIER_PRICING.concierge` still exists in
`src/lib/billingPricing.ts`, now unreferenced by any active provider surface);
retired international placement product.

**Frontend components (unmounted, unreferenced, safe to delete)**
`src/pages/admin/AdminConcierge.tsx`, `AdminConciergeAuditReview.tsx`,
`AdminConciergeMetrics.tsx`, `AdvisorInbox.tsx`, `AdvisorProviderDirectory.tsx`;
`src/components/admin/concierge/**`; `src/components/admin/ConciergeDetailSheet.tsx`;
`src/components/admin/dashboard/AdvisorEarningsCard.tsx`;
`src/pages/provider/MarketingConcierge.tsx`, `BillingConcierge.tsx`,
`BillingPlacements.tsx`; `src/components/provider/concierge/**`;
`src/components/provider/marketing/ConciergeAnalyticsWidget.tsx`,
`ConciergeMarketingDetail.tsx`, `ConciergeManagementPanel.tsx`;
`src/hooks/usePendingConciergeCount.ts`.

**Also deferred**
Backend email templates for retired workflows (Stage 3 touched only copy exposed
by the surfaces it modified, per scope); `SeekerPlacementsTab` and the
`UserProfileModal` placement-journey query, which are read-only historical views
retained until the tables are dropped.

---

## Stage-1 / Stage-2 regression state

No regression. Public positioning, navigation, homepage directory claims,
redirects, SEO/prerender, sitemaps, and structured data are untouched by this
stage — the diff contains no public-surface file. The inquiry model (all eligible
facilities receive inquiries, Free eligibility, selected-facility immutability,
no Concierge fallback, no redistribution, `stored_pending_claim`, v22
notification audit) and the phone model (Pro-only facility phone; Tony Rice
Center `3b11bad0-6d79-431c-9e39-605064080a56` public phone NULL) are enforced
server-side and unchanged. All Stage-1 and Stage-2 guards pass.

Monetization is unchanged: $0 claim/listing, $99/month Pro, Featured add-on.
