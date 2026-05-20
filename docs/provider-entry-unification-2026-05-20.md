# Provider entry workflow — full unification (2026-05-20)

Pair with `docs/monetization-plan-gate-{audit,fixes}-2026-05-20.md`.
This document covers the second deliverable on the same branch: the
provider sign-up → claim/list → onboarding flow is now a single page
(`/provider/onboarding`) with no branching, no duplicate code paths,
no silent failures, no dead ends.

## Before vs after

### Before

Three distinct pages, three distinct URLs, three distinct codebases:

| URL | File | Lines | Responsibility |
| --- | --- | --- | --- |
| `/provider/onboarding` | `Onboarding.tsx` | 263 | Steps 1, 2, 3, 5 (stepper host); step 4 *redirects out* |
| `/provider/onboarding/new-listing` | `NewListingForm.tsx` → `ProviderSignup.tsx` | 66 → 1980 | Listing builder (mode='list') |
| `/provider/claim/:slug` | `ClaimWizard.tsx` | 3217 | Claim wizard (mode='claim') |
| `/provider/claim/:slug/submitted` | `ClaimSubmitted.tsx` | 401 | Post-claim status |

`BuildStep.tsx` was a thin redirector that punted the user to one of
the two outer pages depending on mode. Round-trip cost: a full page
load + a separate Header / Footer / Helmet / Stepper context each time
the user changed step direction; possible session-loss; and the URL
no longer matched the wizard's `?step=` state.

### After

One page, one URL, one mounted host:

```
/provider/onboarding
├── Step 1 — Account            (AccountStep)
├── Step 2 — Verify Email       (VerifyEmailStep)
├── Step 3 — Find or List       (FindOrListStep)
├── Step 4 — Build / Edit       (BuildStep)
│   ├── mode='list'   → <ProviderSignup embedded initialStep={3} />
│   └── mode='claim'  → <ClaimWizard embedded slugProp={slug} onCancel={…} />
└── Step 5 — Plan               (PlanStep)
```

The build form renders INSIDE the wizard host — no navigate-away,
no duplicated chrome (Header/Footer/Helmet), no separate URL. The
wizard's 5-tile stepper stays visible at all times, with the active
step always reflecting the server's authoritative `current_step`.

## What changed

### `src/components/provider/onboarding/BuildStep.tsx`
Rewritten. No longer redirects; renders the embedded form for the
current mode. Adds inline error states for the two failure modes
that previously dead-ended:
- `mode IS NULL` (state inconsistency) → "Pick or list one" CTA back
  to FindOrListStep.
- `mode='claim'` + unresolvable `selected_facility_id` → "Pick a
  different facility" CTA that atomically clears the claim pre-seed
  and advances state back to find_or_list.

### `src/pages/ProviderSignup.tsx`
Added `embedded?: boolean` prop. When true:
- Skips the `useEffect` that redirects already-signed-in users to
  /provider/dashboard (the wizard host has already gated session).
- Suppresses Header, Footer, Helmet, BackToTop, ProviderValueProp,
  and the page-level "List Your Facility" title.
- Replaces "Step X of N" header with a smaller "Build sub-step X of N"
  indicator (the wizard's outer stepper already shows the 5 main
  steps).
- Hides the "Already have an account? Sign in" footer (user is already
  signed in).
- Publish handler routes to `/provider/onboarding?step=plan` so the
  wizard's PlanStep runs.

When `embedded=false` (i.e. NewListingForm's "add another facility"
path), publish skips the state-advance + PlanStep round trip and
routes directly to `/provider/dashboard` with a success toast — these
users are already onboarded and already chose a plan; running them
through PlanStep again would just bounce off the
`onboarding_completed_at` gate.

### `src/pages/provider/ClaimWizard.tsx`
Added `embedded?: boolean`, `slugProp?: string`, and `onCancel?: ()=>void`
props. When `embedded=true`:
- Skips the anonymous-visitor redirect (the unified host already has
  a session).
- Uses `slugProp` instead of `useParams` (the unified URL has no
  `:slug`; the host passes it via the prop after a `selected_facility_id
  → public_facilities.slug` lookup).
- Suppresses Header, Footer, Helmet, and the page-level container —
  renders directly into the wizard's `<section>` slot.
- Step 5 success navigates to `/provider/onboarding?step=plan` instead
  of the legacy `/provider/claim/<slug>/submitted` page.
- Step 1's "This isn't right" button invokes `onCancel()` (which
  resets mode + selected_facility_id and routes back to FindOrListStep)
  instead of navigating to `/provider/onboarding` with no context.

### `src/pages/provider/Onboarding.tsx`
Added a post-mount seeding effect: when a signed-in user arrives with
`?intent=claim&facility_slug=<slug>` (or `&facility_id=<uuid>`), the
host resolves the slug to an id (if needed) and writes
`mode='claim' + selected_facility_id` to the state row before
FindOrListStep mounts. The AccountStep handles the same for new
signups; this effect is the signed-in mirror.

### `src/components/provider/onboarding/AccountStep.tsx`
Added `facility_slug` query param support alongside the existing
`facility_id`. Slug → id resolution happens server-side against
`public_facilities` so a deep link from the legacy
`/provider/claim/:slug` redirect still pre-seeds the claim flow.

### `src/pages/provider/LegacyClaimRedirect.tsx` (new)
Tiny redirect component that the route mounts at
`/provider/claim/:slug`. Reads `useParams().slug` and bounces to
`/provider/onboarding?intent=claim&facility_slug=<slug>`. Replaces
the old direct mount of `ClaimWizard` at that route.

### `src/pages/provider/NewListingForm.tsx`
Tightened to act as the "add another facility" entry for
**already-onboarded** providers only:
- Anon visitor → redirect to `/provider/onboarding` (no `?returnTo=`
  because the unified flow ends at `/provider/dashboard`, so bouncing
  back would loop).
- Signed-in but not yet onboarded → same redirect (the unified flow
  is the single source of truth for first-time onboarding).
- Signed-in + already onboarded → render
  `<ProviderSignup initialStep={3}/>` standalone.

### `src/App.tsx`
- `<Route path="/provider/claim/:slug" element={<ClaimWizard />} />`
  → `<LegacyClaimRedirect />`.
- ClaimWizard is no longer lazy-imported at the route level — it's
  pulled in via BuildStep's static import. The Vite bundle splits
  optimally.
- `/provider/onboarding/new-listing` still mounts `NewListingForm`
  (now gate-aware), `/provider/claim/:slug/submitted` still mounts
  `ClaimSubmitted` (the post-claim status page, fixed in Fix 1).

## Failure modes & explicit handling

Every previously-silent failure now has an explicit user-facing
recovery:

| Scenario | Old behavior | New behavior |
| --- | --- | --- |
| Anon visits `/provider/claim/:slug` | Wizard mounted, then redirected to `/provider/onboarding` after auth-check rendered first | Server-style 302-equivalent redirect (no flash) directly into `/provider/onboarding?intent=claim&facility_slug=<slug>` |
| Already-signed-in user hits `/provider/claim/:slug` | Wizard mounted directly | Redirect into unified flow; Onboarding host's seeding effect pre-fills mode + selected_facility_id |
| `mode='claim'` but `selected_facility_id` doesn't resolve | BuildStep spinner forever, no message | Explicit amber alert + "Pick a different facility" CTA that atomically resets mode and bounces to find_or_list |
| `mode IS NULL` reaches BuildStep | BuildStep would redirect to `/provider/onboarding/new-listing` (a separate page) and silently default to list | Explicit amber alert + "Back to find or list" CTA |
| ClaimWizard step 1 "This isn't right" | navigate("/provider/onboarding") would re-render BuildStep → ClaimWizard → loop | `onCancel` callback resets state to `mode=null, selected_facility_id=null, current_step=find_or_list` |
| ProviderSignup publish fails to advance state | Toast on warning, navigate anyway, user trapped in canReach bounce | Phase X (pre-existing): hard-fail with retry CTA and DO NOT navigate. Preserved in embedded path. |
| NewListingForm + anon user | Redirected with `returnTo=/provider/onboarding/new-listing`, would re-enter the same gate after verify → loop | Redirect with NO returnTo; user goes through unified flow once and lands on dashboard |
| NewListingForm + signed-in-but-not-onboarded | Rendered the form anyway (could publish without ever picking a plan) | Redirect to `/provider/onboarding` so the user finishes the unified wizard first |
| ProviderSignup publish (non-embedded, onboarded user) | Advanced state to 'plan' + navigated to wizard plan step → bounced to dashboard by onboarding_completed_at gate | Routes directly to `/provider/dashboard` (skips the redundant state-advance) |
| Already-completed user re-visits `/provider/onboarding` | Bounce to `/provider/dashboard` with "You're already onboarded" toast | Unchanged (this was correct). |

## What's preserved

- **`/provider/claim/:slug/submitted`**: still a valid status page,
  reachable from `/provider/claims`. Fix 1 (plan-gate) already removed
  the premature `complete_provider_onboarding` RPC from it.
- **`/provider-signup`**: legacy entry, still a Navigate redirect to
  `/provider/onboarding` (no change).
- **`/auth/signup`**: legacy entry, still a Navigate redirect to
  `/provider/onboarding` preserving query params (no change).
- **ClaimWizard's sessionStorage state per-slug**: still functions
  identically when the wizard is embedded. A user who bails mid-claim
  and resumes resumes at the same sub-step.

## Build sanity

```
$ npx tsc --noEmit           # exit 0
$ npx vite build             # exit 0, 49.31s, all chunks emitted
$ npm run check:no-undef-jsx # 782 .tsx files scanned, clean
$ npm run check:redirect-targets
  ✓ All redirect destinations resolve. (140 checked)
$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5173/provider/onboarding
  200
$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5173/provider/claim/test-slug
  200
$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5173/provider/onboarding/new-listing
  200
```

## Ship-readiness

✅ One URL owns first-time onboarding end-to-end.
✅ No branching at the URL level: every entry point converges on
   `/provider/onboarding`.
✅ No duplicate form-host code paths: BuildStep is the single owner of
   "render the listing builder vs the claim wizard"; both forms accept
   an `embedded` prop and behave consistently.
✅ Every previously-silent edge case has an explicit recovery UI.
✅ Pre-existing legacy URLs (`/provider/claim/:slug`,
   `/provider/onboarding/new-listing`, `/auth/signup`,
   `/provider-signup`, `/provider/signup`) all keep working — they
   route into the unified flow with the right query params.
✅ TypeScript, vite build, JSX-undef, redirect-target checks all
   pass.
