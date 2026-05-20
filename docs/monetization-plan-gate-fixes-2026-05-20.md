# Monetization plan-gate fixes — 2026-05-20

Pair with `docs/monetization-plan-gate-audit-2026-05-20.md`. Every
fix in this document maps to a numbered finding in the audit.

## Fix 1 — Claim flow now reaches PlanStep (Finding 2, critical)

**File**: `src/pages/provider/ClaimSubmitted.tsx:118-128` (was 118-123).

**Before**:
```tsx
// Idempotent recovery in case the ClaimWizard handler was interrupted
// before its own RPC call landed. Keyed on claim.id so a refetch of
// the same row doesn't re-fire.
useEffect(() => {
  if (!claim?.id) return;
  void supabase.rpc("complete_provider_onboarding").catch((e) => {
    console.warn("[ClaimSubmitted] completion advance failed", e);
  });
}, [claim?.id]);
```

**After**: the entire `useEffect` removed. Replaced by an inline
explanatory block so a future reader sees the rationale rather than
re-introducing the bug.

**Why**: ClaimWizard step 5 (`ClaimWizard.tsx:499-521`) intentionally
advances `provider_onboarding_state.current_step='plan'` without
calling `complete_provider_onboarding`. The premature RPC call here
flipped `profiles.onboarding_completed_at` and
`state.current_step='completed'` on mount, after which the
`/provider/onboarding?step=plan` link at `ClaimSubmitted.tsx:249-253`
was bounced straight to `/provider/dashboard` by the Onboarding host's
`profile.onboarding_completed_at` guard (`Onboarding.tsx:172-175`).
Net: every claimer completed onboarding on Free by default, with no
record of explicit intent.

**After the fix**:
- Claim submits → state row = `current_step='plan'`,
  `profile.onboarding_completed_at IS NULL`.
- User sees the "Pick your plan" CTA on the submitted-status page.
- Clicking it → `/provider/onboarding?step=plan` → `PlanStep` renders
  (Onboarding's `canReach()` allows it because serverStep is 'plan').
- Free path → `complete_provider_onboarding_with_plan('free')`
  atomically flips state, plan, and completion.
- Pro path → Stripe Checkout → webhook flips
  `facility_subscriptions.tier='pro'` + `profiles.plan='pro'` + adds
  ranking score boost; PlanStep's polling reads the active sub and
  invokes `complete_provider_onboarding()` (now allowed because the
  active Pro sub satisfies the new gate).

**Residual risk**: a user who closes the tab on the submitted page and
never returns will sit at `current_step='plan'` indefinitely. Next
visit to `/provider/onboarding` resumes them at PlanStep — they can't
escape the gate. This is the desired behavior.

## Fix 2 — Migration `20260520000000_plan_gate_hardening.sql` (Findings 4 + 6)

Applied to production via Supabase MCP `apply_migration` (verified:
zero NULL plans remaining, NOT NULL constraint active, trigger
installed, both completion RPCs in place).

### (a) Backfill — Finding 6

`profiles.plan` had 0 NULL rows in production (DB probe at the bottom
of the audit doc), so the backfill UPDATE is a runtime no-op on this
deployment. Migration is still wired into the migration chain so a
local-dev DB with NULL rows gets the same treatment on the next
`supabase db reset`. The backfill respects two cases:

- Profiles with `plan IS NULL` AND no active Pro subscription →
  `plan='free'`.
- Profiles with `plan IS NULL` AND an active Pro subscription (the
  webhook ran but the mirror failed mid-flight pre-2026-05-17) →
  `plan='pro'` via the sensitive-column-guard bypass GUC.

### (b) NOT NULL — Finding 4

After the backfill drains every NULL, `ALTER TABLE public.profiles
ALTER COLUMN plan SET NOT NULL` lands. Gated on a runtime check that
NO NULL rows remain so the ALTER never fails mid-migration. The
existing `profiles_plan_chk` CHECK constraint (`plan IS NULL OR plan
IN ('free','pro')`) is left as-is; it permits NULL but the column-
level NOT NULL now closes the escape hatch above it.

### (c) Tightened `complete_provider_onboarding()` — Finding 4

The no-plan completion RPC at
`20260528000000_profile_sensitive_column_guard.sql:68-100` was
overly permissive — any authenticated caller could mark themselves
complete without first picking a plan. The replacement body:

1. Refuses if `state.plan IS NULL` AND no active Pro subscription
   exists (`RAISE EXCEPTION 'Cannot mark onboarding complete without
   a plan choice...'`). This explicitly blocks the failure mode that
   ClaimSubmitted previously triggered, providing defense-in-depth
   alongside Fix 1.
2. Mirrors `plan` into both `provider_onboarding_state` and
   `profiles` using COALESCE so a Pro user with NULL state.plan but
   an active subscription is reconciled to `'pro'` (idempotently).
3. Keeps the existing transaction-local GUC bypass for the
   `profiles_sensitive_column_guard` trigger so the
   `onboarding_completed_at` flip still works.

### (d) Trigger backstop on the state row

`enforce_onboarding_state_completion_requires_plan()` fires BEFORE
UPDATE on `provider_onboarding_state`. If the row transitions to
`current_step='completed'` with `plan IS NULL` AND no active Pro
subscription on file, the trigger raises `check_violation`. This
catches direct PostgREST UPDATEs (and any future code path that
bypasses the RPCs) without breaking the canonical flows:

- `complete_provider_onboarding_with_plan('free')` writes `plan='free'`
  in the same UPDATE → trigger passes.
- PlanStep Pro path writes `plan='pro'` in the upsert before the
  RPC fires → trigger passes (and the active Pro sub would satisfy
  the fallback even if it didn't).
- Stripe webhook updates `facility_subscriptions` first → when the
  webhook later triggers a state row update with `current_step='completed'`
  via `complete_provider_onboarding()`, the active-Pro check passes.

## Fix 3 — N/A

Finding 5 (benefits unlock matches plan) was PASS in the audit. No
code change needed; verified that every gate reads the canonical
source (server triggers + edge functions read `profiles.plan`;
marketing surfaces read `facility_subscriptions.tier`; both are
written atomically by the webhook's activate/deactivate helpers).

Finding 3 (legacy listing builder) was PASS. The intentional
post-build plan ordering remains correct; ProviderSignup's publish
handler advances to PlanStep deterministically and hard-fails on
upsert errors so the user is never silently trapped.

Finding 1 (wizard plan-step persistence) was PASS. Confirmed the
atomic Free RPC and Stripe-anchored Pro path are correct.

## Verification

```
$ git rev-list --count origin/claude/phase2-deployment-5WYOn ^HEAD
0   # branch descends from phase2 tip
$ npx tsc --noEmit
(no output — clean exit)
$ git diff origin/claude/phase2-deployment-5WYOn..HEAD --stat
3 files changed, 305 insertions(+), 7 deletions(-)
```

Production DB sanity check after `apply_migration`:

| Check | Expected | Actual |
| --- | --- | --- |
| `profiles.plan` NULL count | 0 | 0 |
| `profiles.plan` `is_nullable` | `NO` | `NO` |
| `provider_onboarding_state_completion_plan_chk` trigger | 1 | 1 |
| `complete_provider_onboarding` proc count | 1 | 1 |
| `complete_provider_onboarding_with_plan` proc count | 1 | 1 |

## Ship-readiness

Plan-gate workflow is hardened. Every provider — list path or claim
path — now reaches PlanStep exactly once and chooses Free or Pro
before `onboarding_completed_at` flips. Server-side gates close every
bypass identified in the audit. Migration is idempotent and ships
through CI on every Vercel build.

Forward dependency: Prompt 2 (Pro upgrade end-to-end) depends on the
new completion RPC behaviour — the audit there must verify the
Stripe webhook's Pro activation continues to satisfy
`enforce_onboarding_state_completion_requires_plan` (it does, via
the `has_active_pro` branch).
