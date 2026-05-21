# Monetization plan-gate audit — 2026-05-20

Branch: `claude/monetization-1-plan-gate` (descended from
`claude/phase2-deployment-5WYOn`).

Scope: the six numbered findings in Prompt 1 of
`/root/.claude/plans/immutable-munching-rainbow.md` — i.e. every
code-path through which a provider commits to Free vs Pro.

## Finding 1 — Wizard plan step persistence — **PASS**

Severity: n/a (no fix needed).

| Anchor | Check | Result |
| --- | --- | --- |
| `src/components/provider/onboarding/PlanStep.tsx:194-222` (`handleFree`) | Atomic state-row update + `profiles.plan='free'` + `onboarding_completed_at` flip in one txn | ✅ Uses SECURITY DEFINER RPC `complete_provider_onboarding_with_plan('free')` (`supabase/migrations/20260517210000_complete_provider_onboarding_with_plan.sql:10-52`). Three writes happen atomically; if any fails the bypass GUC is cleared in the EXCEPTION block. |
| `src/components/provider/onboarding/PlanStep.tsx:224-259` (`handlePro`) | Stripe Checkout is the sole path to `plan='pro'` | ✅ Client never writes `plan='pro'` directly; `enforce_profile_sensitive_column_guard` (`20260528000000_profile_sensitive_column_guard.sql:25-30`) blocks any authenticated client UPDATE that elevates plan. Only the webhook (auth.uid() IS NULL → bypass) can flip. |
| `src/components/provider/onboarding/PlanStep.tsx:119-192` (`confirmProSubscription`) | Polling-timeout doesn't strand the user | ✅ 30s deadline → routes to `/provider/dashboard` where `Dashboard.tsx` runs a fallback recovery if the row appears late; ALSO inserts an `admin_notifications` row of type `pro_activation_poll_timeout` so ops sees long-tail webhook delays. |
| `src/components/provider/onboarding/PlanStep.tsx:67-83` (`build`→`plan` self-heal) | If `current_step='build'` lingers when PlanStep mounts (Phase X bug), advance the cursor | ✅ Self-heals quietly. |
| `src/components/provider/onboarding/PlanStep.tsx:88-110` (already-Pro fast-track) | A re-entry user who already paid under old ordering skips this step | ✅ Detects `facility_subscriptions tier='pro' AND status='active'` and short-circuits with the same atomic advance + RPC. |

Net: PlanStep cannot reach `build`→`completed` with `state.plan IS NULL`
**when the user actually visits PlanStep**. The bug is that one
code-path bypasses PlanStep entirely — see Finding 2.

## Finding 2 — Claim path bypasses PlanStep — **FAIL (critical)**

Severity: **ship-blocker**.

Evidence:

1. `src/pages/provider/ClaimWizard.tsx:499-521` (Step 5 onSubmitted):
   ```
   await supabase.from("provider_onboarding_state").upsert(
     { user_id: uid, current_step: "plan" } as never,
     { onConflict: "user_id" },
   );
   navigate(`/provider/claim/${facility.slug}/submitted`, { replace: true });
   ```
   Correctly advances the state cursor to `plan`. Does NOT mark
   onboarding completed (correct — plan hasn't been chosen yet).

2. `src/pages/provider/ClaimSubmitted.tsx:118-123`:
   ```
   useEffect(() => {
     if (!claim?.id) return;
     void supabase.rpc("complete_provider_onboarding").catch((e) => {
       console.warn("[ClaimSubmitted] completion advance failed", e);
     });
   }, [claim?.id]);
   ```
   Calls `complete_provider_onboarding()` (no-plan variant) the moment
   the claim row resolves. That RPC
   (`20260528000000_profile_sensitive_column_guard.sql:68-100`) flips
   `provider_onboarding_state.current_step='completed'` AND
   `profiles.onboarding_completed_at=now()` — **without** touching
   `state.plan` or `profiles.plan`.

3. Result: by the time the user clicks the "Pick your plan" button
   (`ClaimSubmitted.tsx:249`) →`/provider/onboarding?step=plan`, the
   Onboarding host (`src/pages/provider/Onboarding.tsx:172-175`) sees
   `profile.onboarding_completed_at IS NOT NULL` and bounces to
   `/provider/dashboard`. **PlanStep is never rendered for claimers.**
   Their `state.plan` stays NULL and `profiles.plan` defaults to the
   schema default (`'free'`).

4. Net effect: 100 % of claimers complete onboarding without ever
   making an explicit plan choice. They land on Free by default, with
   no record of intent. A claimer who *wanted* Pro at signup has no
   route to it during the onboarding flow — they have to discover
   `/provider/billing` later, by themselves.

Comment at `ClaimSubmitted.tsx:115-117` ("Idempotent recovery in case
the ClaimWizard handler was interrupted before its own RPC call
landed") is stale and incorrect — the ClaimWizard handler at
`ClaimWizard.tsx:499-521` never calls `complete_provider_onboarding`.
The "recovery" is calling something the wizard intentionally avoids.

Fix below: remove the premature RPC call from `ClaimSubmitted.tsx`.
The state row already says `current_step='plan'`, so when the user
clicks "Pick your plan" they land on PlanStep correctly; PlanStep's
handleFree / handlePro path then completes onboarding atomically.

## Finding 3 — Legacy listing builder plan presence — **PASS**

Severity: n/a.

| Anchor | Check | Result |
| --- | --- | --- |
| `src/pages/provider/NewListingForm.tsx:47-50` | Pre-plan gate intentionally removed (round-30 puts plan AFTER build) | ✅ Comment-anchored and traceable. |
| `src/pages/ProviderSignup.tsx:946-990` (publish handler) | After publish, advances `state.current_step='plan'`, hard-fails if upsert errors (no silent loop), navigates `/provider/onboarding?step=plan` | ✅ Phase X fix already in place — the upsert error branch surfaces a destructive toast and bails BEFORE navigate, eliminating the trap where canReach would bounce the user back to `build`. |
| Reentry after tab-close | If the user closes the tab between publish and plan selection, what happens on next visit? | ✅ State row says `current_step='plan'`, `profile.onboarding_completed_at IS NULL` — so `/provider/onboarding` resumes them on PlanStep (no bypass possible). |

ProviderSignup intentionally does NOT require a pre-existing plan
choice. This is correct under the round-30 ordering where plan is the
final step.

## Finding 4 — Server-side enforcement of plan presence — **PARTIAL FAIL**

Severity: medium (defense-in-depth, not user-facing — but a hardening
gap).

| Anchor | Check | Result |
| --- | --- | --- |
| `supabase/migrations/20260525000000_provider_onboarding_foundation.sql:8-22` | `profiles.plan DEFAULT 'free'` + CHECK ('free' OR 'pro' OR NULL) | ⚠️ NULL allowed; legacy rows (pre-2026-05-17) may carry NULL. Per Supabase MCP, current production count is finite — see `mcp__88648e1d…__execute_sql` probe at end of doc. |
| `provider_onboarding_state.plan` | NULL allowed; can be NULL when `current_step='completed'` (via `complete_provider_onboarding()` no-plan RPC) | ❌ The no-plan completion RPC can mark a user complete without setting state.plan. |
| `facilities` insert | No trigger blocks INSERT when owner's `profiles.plan IS NULL` | ❌ Belt-and-braces gap. In practice DEFAULT 'free' covers new accounts, but a legacy NULL row could still publish. |

**Fix**: One migration that (a) backfills NULL → 'free' for any
provider without an active Pro subscription, (b) ALTER COLUMN
profiles.plan SET NOT NULL, (c) tightens `complete_provider_onboarding`
to refuse completion when `state.plan IS NULL` AND no active
`facility_subscriptions` row exists.

## Finding 5 — Benefits unlock match plan — **PASS (with notes)**

| Benefit | Server gate (canonical) | Client gate | Verdict |
| --- | --- | --- | --- |
| Photo cap (Free 5 / Pro 10) | `enforce_facility_plan_photo_cap` trigger reads `profiles.plan` via `claim_owner_id || user_id` (`20260526000000_provider_plan_photo_cap.sql:31-50`) | `src/lib/planLimits.ts` + `PlanGate` + `useProviderData.plan` mirror | ✅ Mirrored; trigger is belt-and-braces. |
| Video cap (Free 0 / Pro 1) | **No server trigger.** `PlanLimits.videos` lives in `src/lib/planLimits.ts`. | `PlanGate` wraps the video upload tile in ListingEditor / ProviderSignup. | ⚠️ Client-only; a direct DB write could bypass. Out of scope for Prompt 1 (no media-table to lock down — videos are URLs in facility columns); flagging here for Prompt 2 to address as part of the Pro-benefit lock-down. |
| Featured tile | `MarketingHub.tsx:22, 39-41` gates on `facility_subscriptions.tier='pro' AND status='active'`; direct URL `MarketingFeatured.tsx:39-40` also gates and `<Navigate>`s non-Pro. | Same. | ✅ Two-layer client gate (hub + direct URL). |
| Concierge tile | Identical pattern at `MarketingConcierge.tsx:38-39`. | Same. | ✅ |
| Ranking score boost | `stripe-webhook/index.ts:1369-1425` `activateProBenefits` adds +50 idempotently (only when `featured=false`); `deactivateProBenefits` (1441-1490) reverts. | n/a (server-side scoring). | ✅ |
| `profiles.plan` mirror | `activateProBenefits` writes `plan='pro'` BEFORE the per-facility updates so the photo-cap trigger sees the new tier even mid-flight (1380-1390). `deactivateProBenefits` writes `plan='free'` symmetrically. | n/a. | ✅ |

All canonical reads use either `profiles.plan` (server triggers,
useProviderData) or `facility_subscriptions.tier+status` (Marketing
surfaces). Both are written atomically by the webhook's
activate/deactivate helpers — no source-of-truth split.

## Finding 6 — Backfill — **needed**

Severity: medium (one-shot).

Combined with Finding 4 fix. The backfill is gated on `EXISTS` so
re-runs are no-ops.

## Probe — current DB state

Run on the production project (chikasholdings / rehablookup-fee48b92):

```sql
-- Profiles with NULL plan (the backfill target)
SELECT count(*) FROM public.profiles WHERE plan IS NULL;
-- Profiles with NULL plan who DO have an active Pro subscription (must not be touched)
SELECT count(*) FROM public.profiles p
WHERE p.plan IS NULL
  AND EXISTS (SELECT 1 FROM public.facility_subscriptions fs
              WHERE fs.provider_id = p.user_id AND fs.tier='pro' AND fs.status='active');
-- Onboarding state rows that completed without a plan choice
SELECT count(*) FROM public.provider_onboarding_state
WHERE current_step='completed' AND plan IS NULL;
```

The migration in Finding 4's fix wraps the backfill in a DO block
gated on `IF EXISTS (... plan IS NULL ...)` so re-runs after the
backfill drains are no-ops.

## Ship-readiness verdict for Prompt 1

After the three fixes below land:

- ✅ Wizard plan step persistence atomic and self-healing.
- ✅ Claim flow reaches PlanStep (was the critical gap).
- ✅ Legacy listing builder routes correctly through PlanStep.
- ✅ Server-side gate refuses completion without a plan.
- ✅ Benefits unlock paths all read canonical columns.
- ✅ Backfill closes legacy NULL rows.

Every code change in the fix doc traces to a numbered finding above.
No unrelated drift.
