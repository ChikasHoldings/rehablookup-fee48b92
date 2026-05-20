# Pro upgrade workflow — end-to-end audit + hardening (2026-05-20)

Branch: `claude/monetization-2-pro-upgrade`. Pair with the earlier
`monetization-pro-upgrade-audit-2026-05-20.md` doc which covered the
nine canonical Prompt-2 findings; this document captures the deep
end-to-end pass after the user asked for the workflow to be "fully
audited and hardened."

## Trace — every Pro upgrade entry point

The codebase has **5 distinct invocations of a Stripe Checkout edge
function** for Pro/add-on upgrades, plus 13+ Link CTAs that route to
`/provider/billing` with various query params:

| Caller | Edge fn | Intent | Source |
| --- | --- | --- | --- |
| `PlanStep.tsx:231` (onboarding wizard, final step) | `create-checkout` | Pro initial | First-time signup |
| `UpgradeDialog.tsx:52` (modal from feature gate) | `create-checkout` | Pro initial | Mid-onboarding photo-cap hit |
| `Billing.tsx:129` (`handleProUpgrade`) | `create-checkout-session` | `initial_subscription` + `product=pro` | Free → Pro on `/provider/billing` |
| `FeaturedMarketingDetail.tsx:29` | `create-checkout-session` | `add_addon` + `product=featured` | Pro user adds Featured |
| `ConciergeMarketingDetail.tsx:26` | `create-checkout-session` | `add_addon` + `product=concierge` | Pro user adds Concierge |

Both edge functions are present locally + deployed. Both have:
- 30-min open-session reuse (single-flight against tab dupes)
- 5-min idempotency-key bucket (durable across function restarts)
- Already-on-Pro 409 guard
- Stripe price resolution via lookup_key
- success_url/cancel_url overrides

`create-checkout` is the original (used by onboarding + UpgradeDialog),
`create-checkout-session` v1.1.0 is the newer multi-intent fn used by
post-onboarding upgrade + the add-on flows. The split is documented in
each fn's header comment; consolidating would be a larger refactor
than this prompt's scope.

## Findings + fixes

### Finding A — Two welcome modals stack on first dashboard load — **FIX**

Two distinct modal components fired in the same window with different
gates:

- **`WelcomeModal`** (`src/components/provider/WelcomeModal.tsx`):
  global in `ProviderShell`. Self-gates on
  `profiles.welcomed_at IS NULL && profiles.onboarding_completed_at IS NOT NULL`.
  Plan-aware (Free → "Upgrade to Pro $99/mo" CTA, Pro → "Add Featured"
  CTA). Sets `welcomed_at` on display. Single-source-of-truth model.

- **`ProviderWelcomeModal`** (`src/components/provider/ProviderWelcomeModal.tsx`):
  Dashboard-only. Gated by Dashboard's
  `!facility.profile_completion_celebrated`. Has its own Free-vs-Pro
  comparison table + two-step welcome → plans flow. Sets
  `profile_completion_celebrated` on dismiss.

For a first-time provider on first dashboard load, BOTH gates
evaluate true → both modals render → stacked dialogs / interaction
race.

**Fix**: delete `ProviderWelcomeModal.tsx` + its Dashboard mount. The
plan-aware `WelcomeModal` is kept as the single source of truth — it
already has the Pro upgrade CTA, runs on every panel page (not just
Dashboard), and uses the canonical per-user `welcomed_at` lifecycle
flag rather than the per-facility `profile_completion_celebrated`
flag (which is a different milestone owned by the listing-editor
profile-completeness celebration UX).

### Finding B — `?upgrade=pro` query param ignored — **FIX**

13+ CTAs across the panel link to `/provider/billing?upgrade=pro`:
- `WelcomeModal` (Free path)
- `ProviderSidebar` upgrade CTA
- `CentralizedEngagementAnalytics`
- `DashboardKPIStrip`
- `DashboardMissedLeads`
- `DashboardFacilityPerformancePanel`
- `RedirectedInquiriesSection`
- `SubscriptionAnalyticsTab`
- `MarketingLockwall`
- `StaffManagementSection`
- `ProBenefitsWidget`
- `useProviderSearch` quick search entry
- (et al.)

Before this fix, `Billing.tsx` only handled `?checkout=success` —
visitors arriving with `?upgrade=pro` saw the same page as anyone
else, with no signal that they came from an upgrade CTA. They had to
hunt for the Monthly/Annual buttons themselves.

**Fix**: add an effect to `Billing.tsx` that detects `?upgrade=pro`:
- If the user is still Free → toast "Pick monthly or annual below to
  upgrade to Pro." (drawing attention to the existing buttons)
- If the user is already Pro → toast "You're already on Pro." (idempotent)
- Either way, strip the param from the URL so the toast doesn't
  re-fire on every re-render.

### Finding C — `?signup=retry` from `/signup/subscription` ignored — **FIX**

`App.tsx:1340` defines:
```
<Route path="/signup/subscription" element={<Navigate to="/provider/billing?signup=retry" replace />} />
```

But `Billing.tsx` didn't read the `signup=retry` param. Same effect as
Finding B — silent landing instead of contextual prompt.

**Fix**: same effect as Finding B handles this — when `?signup=retry`
is present, toast "Pick a billing period below to retry your Pro
upgrade." and strip the param.

### Finding D — `PlanGate.tsx` is dead code — **FIX**

`src/components/provider/onboarding/PlanGate.tsx` (75 lines) was
created as a wrapper that grays out children + opens UpgradeDialog
when the user's plan doesn't meet a `requires` prop. Grep across
`src/` finds **zero imports** of it outside its own file and a stale
comment in `UpgradeDialog.tsx`.

`ListingEditor.tsx` and `ProviderSignup.tsx` (the two places that
would historically have used PlanGate for photo / video gates) now
use `PLAN_LIMITS` directly + mount `UpgradeDialog` themselves with
explicit `setUpgradeOpen` state. No consumer remains.

**Fix**: delete `PlanGate.tsx`.

### Finding E — Dead non-embedded code paths in ProviderSignup.tsx (DEFERRED)

`ProviderSignup.tsx` has both an `embedded={true}` rendering path (used
by `BuildStep` — the only live caller) and a standalone path with
`<Header>` / `<Footer>` / `<Helmet>` / `ProviderValueProp` / "Already
have an account?" / dashboard-session-redirect. The standalone path
is unreachable (no caller passes `embedded={false}`).

**Disposition**: deferred. The dead paths don't cause runtime issues
because the `embedded` prop is always true. Removing them is a
2000-line file refactor with marginal benefit. Flagged here so a
future cleanup pass can collapse the conditional rendering.

## Verified working (no fix needed)

Every other element of the Pro upgrade workflow checks out:

| Element | File:line | Verdict |
| --- | --- | --- |
| Onboarding final-step Pro flow | `PlanStep.tsx:224-259` | ✅ stripe checkout via create-checkout |
| Onboarding free-plan flow | `PlanStep.tsx:194-222` | ✅ atomic RPC complete_provider_onboarding_with_plan('free') |
| Onboarding poll-after-Pro-Checkout | `PlanStep.tsx:119-192` | ✅ 30s deadline + admin notification on timeout |
| Pro upgrade from billing — monthly | `Billing.tsx:126-147` + `create-checkout-session/index.ts:167-296` | ✅ idempotent, 30-min reuse, lookup-key resolution |
| Pro upgrade from billing — annual | same | ✅ same path, `billing_period: "annual"` |
| Checkout success polling | `Billing.tsx:62-102` | ✅ 90s deadline + manual "Check now" recovery |
| Webhook event dedup | `stripe-webhook/index.ts:2047-2117` | ✅ Round-31 hardened, returns 500 on dedup failure |
| Pro benefits activation | `stripe-webhook/index.ts:1369-1425` | ✅ idempotent (only flips when transitioning from featured=false) |
| profiles.plan mirror on upgrade | `stripe-webhook/index.ts:1383-1390` | ✅ written first, gates photo-cap trigger |
| profiles.plan mirror on downgrade | `stripe-webhook/index.ts:1451-1459` | ✅ symmetric, called from subscription.deleted handler |
| Cancellation 3-step flow | `BillingCancel.tsx` | ✅ scope picker, preview-refund, self-cancel |
| Cancel preview refund math | `_shared/subscription-math.ts` + `preview-cancellation-refund/index.ts` | ✅ single source of truth |
| Cancel executor refund | `_shared/cancel-subscription.ts:586+` | ✅ idempotent on (subscription_id, scope) |
| Past-due dunning banner | `DunningBanner.tsx` mounted in `ProviderShell.tsx:295` | ✅ global, queries facility_subscriptions live |
| Past-due banner on /provider/billing | `Billing.tsx:270-295` | ✅ destructive variant + Stripe Portal CTA |
| Past_due → active recovery | `stripe-webhook/index.ts:2460-2483` | ✅ re-applies Pro benefits idempotently |
| Stripe Customer Portal | `customer-portal/index.ts` + `Billing.tsx:104-123` | ✅ debounced, safe-url-validated, new-window |
| Monthly → Annual switch | `SwitchToAnnualBanner.tsx` + `switch-to-annual` edge fn | ✅ Pro-only |
| Annual → Monthly at renewal | `SwitchToMonthlyAtRenewalBanner.tsx` + `set-renewal-switch-flag` edge fn | ✅ within 60d of renewal |
| Pro-only routes redirect non-Pro | `MarketingFeatured.tsx:39-40`, `MarketingConcierge.tsx:38-39` | ✅ Navigate to /provider/marketing |
| MarketingHub Free lockwall | `MarketingHub.tsx:22+52-56` | ✅ MarketingLockwall component |
| Featured slot management | `FeaturedManagementPanel.tsx` | ✅ tagline + add/remove + waitlist |
| Concierge geo management | `ConciergeManagementPanel.tsx` | ✅ add/remove + EKRA reminder + waitlist |
| Photo cap trigger | `enforce_facility_plan_photo_cap` migration | ✅ Free=5 / Pro=10 server-side |
| Ranking score boost | activateProBenefits in webhook | ✅ +50 only when transitioning |
| Dashboard Pro recovery effect | `Dashboard.tsx` invalidateQueries | ✅ provider-data + pro-status + facility-subscription |
| 5 EKRA-retired edge functions | repo + deployed match (410 tombstones) | ✅ vendored 2026-05-20 |

## Build sanity

```
$ npx tsc --noEmit
(clean)
$ npx vite build
✓ built in 55.76s
$ ls src/components/provider/ProviderWelcomeModal.tsx 2>&1
(no such file or directory)
$ ls src/components/provider/onboarding/PlanGate.tsx 2>&1
(no such file or directory)
$ grep -rn "ProviderWelcomeModal\|PlanGate" src/ --include="*.tsx" --include="*.ts" | grep -v ":.*//"
(no hits)
```

## Ship-readiness

The Pro upgrade workflow is fully audited and hardened end-to-end:

- ✅ Every entry point (onboarding + billing + add-ons) goes through
  an idempotent Checkout flow with 30-min single-flight reuse
- ✅ Every webhook event is deduplicated atomically + surfaces
  admin notifications on dedup failure
- ✅ Pro benefits activation/deactivation is mirrored on both
  `profiles.plan` and per-facility `featured` + ranking_score
- ✅ Cancellation supports all/featured/concierge scopes with
  pre-confirmation refund preview
- ✅ Past-due / dunning surfaces globally (DunningBanner in
  ProviderShell) AND prominently on /provider/billing
- ✅ Monthly ↔ annual switch is gated correctly
- ✅ Pro-only surfaces (Marketing Hub / Featured / Concierge) all
  enforce gates with non-Pro `<Navigate>` redirects
- ✅ Free → Pro upgrade CTAs across the panel now produce a
  contextual prompt on landing rather than silent navigation
- ✅ Duplicate Welcome modal eliminated
- ✅ Dead PlanGate code removed
- ✅ All edge functions + RPCs referenced exist in the repo (16 edge
  fns + 6 RPCs cross-checked)
- ✅ Zero TODO/FIXME/stub in the Pro surfaces

The forward dependency for Prompt 6 (smoke tests) is that the Pro
upgrade and cancel round-trip both work against a Stripe test account
— that's a runtime check, not a source-contract check, and is the
last remaining item to validate before ship.
