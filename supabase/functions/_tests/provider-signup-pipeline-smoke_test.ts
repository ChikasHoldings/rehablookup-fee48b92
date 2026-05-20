// Provider signup → verify → claim/list → onboarding → panel pipeline
// smoke test.
//
// Source-contract style (matches the existing _tests/ pattern). Reads
// the actual files and asserts the load-bearing invariants that keep
// the unified flow from drifting back into duplicate / branching
// implementations:
//
//   1. Single signup entry point (no parallel auth/email-verify forms)
//   2. State machine: provider_onboarding_state.current_step is the
//      single source of truth; canReach() gates forward navigation
//   3. Atomic completion: complete_provider_onboarding{,_with_plan}
//      RPCs are the only way to flip onboarding_completed_at; client
//      writes are blocked by the profiles guard trigger
//   4. ProviderSignup is post-auth ONLY (entryStep floor blocks
//      descent into legacy steps 1-2)
//   5. PlanStep self-heals if state is stuck at 'build'
//   6. ProviderSignup hard-fails (no silent loop) if its state advance
//      to 'plan' errors
//
// Run with: deno test --allow-read supabase/functions/_tests/provider-signup-pipeline-smoke_test.ts

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const REPO_ROOT = new URL("../../../", import.meta.url);

async function read(relativePath: string): Promise<string> {
  return await Deno.readTextFile(new URL(relativePath, REPO_ROOT));
}

// ─── Invariant 1: single signup entry point ────────────────────────────
//
// 2026-05-20 unification: /provider/onboarding is the ONLY page for
// the provider sign-up/claim/list workflow. Every legacy entry has been
// reduced to an inline Navigate redirect in App.tsx — the previously
// separate page files (AuthSignup.tsx, NewListingForm.tsx,
// LegacyClaimRedirect.tsx, ClaimSubmitted.tsx) are deleted.

Deno.test("pipeline: legacy provider-entry pages are deleted", async () => {
  for (const path of [
    "src/pages/AuthSignup.tsx",
    "src/pages/provider/NewListingForm.tsx",
    "src/pages/provider/LegacyClaimRedirect.tsx",
    "src/pages/provider/ClaimSubmitted.tsx",
  ]) {
    let exists = true;
    try {
      await Deno.stat(new URL(path, REPO_ROOT));
    } catch {
      exists = false;
    }
    assert(!exists, `Legacy provider-entry page must be deleted: ${path}`);
  }
});

Deno.test("pipeline: every legacy provider-entry route redirects into /provider/onboarding", async () => {
  const app = await read("src/App.tsx");

  // /provider-signup → /provider/onboarding (top-level Navigate).
  assert(
    /path="\/provider-signup"\s+element=\{<Navigate to="\/provider\/onboarding"/.test(app),
    "/provider-signup must redirect to /provider/onboarding",
  );

  // /provider/signup → /provider/onboarding (collapsed 2-hop redirect).
  assert(
    /path="\/provider\/signup"\s+element=\{<Navigate to="\/provider\/onboarding"/.test(app),
    "/provider/signup must redirect to /provider/onboarding",
  );

  // /auth/signup → NavigateAuthSignup component (preserves query params).
  assert(
    /path="\/auth\/signup"\s+element=\{<NavigateAuthSignup\s*\/>\}/.test(app),
    "/auth/signup must mount the NavigateAuthSignup inline redirect",
  );

  // /provider/onboarding/new-listing → /provider/onboarding?action=add-listing.
  assert(
    /path="\/provider\/onboarding\/new-listing"[\s\S]{0,200}<Navigate to="\/provider\/onboarding\?action=add-listing"/.test(app),
    "/provider/onboarding/new-listing must redirect to /provider/onboarding?action=add-listing",
  );

  // /provider/claim/:slug → NavigateProviderClaim component (slug → query param).
  assert(
    /path="\/provider\/claim\/:slug"\s+element=\{<NavigateProviderClaim\s*\/>\}/.test(app),
    "/provider/claim/:slug must mount the NavigateProviderClaim inline redirect",
  );

  // /provider/claim/:slug/submitted → /provider/claims.
  assert(
    /path="\/provider\/claim\/:slug\/submitted"[\s\S]{0,200}<Navigate to="\/provider\/claims"/.test(app),
    "/provider/claim/:slug/submitted must redirect to /provider/claims",
  );
});

Deno.test("pipeline: NavigateAuthSignup preserves query params + sanitizes returnTo", async () => {
  const app = await read("src/App.tsx");
  // The inline component must read useSearchParams, run returnTo
  // through safeReturnTo (rejecting //x and /\\x), and re-emit the qs.
  assertStringIncludes(app, "function NavigateAuthSignup()");
  assertStringIncludes(app, "function safeReturnTo(");
  assert(
    /safeReturnTo\(params\.get\("returnTo"\)\)/.test(app),
    "NavigateAuthSignup must filter returnTo through safeReturnTo",
  );
});

Deno.test("pipeline: NavigateProviderClaim carries the slug as facility_slug", async () => {
  const app = await read("src/App.tsx");
  assertStringIncludes(app, "function NavigateProviderClaim()");
  assert(
    /params\.set\("facility_slug",\s*slug\)/.test(app),
    "NavigateProviderClaim must promote :slug to ?facility_slug=",
  );
  assert(
    /intent.*:.*"claim"/.test(app),
    "NavigateProviderClaim must stamp ?intent=claim",
  );
});

Deno.test("pipeline: legacy EmailVerificationStep component is deleted", async () => {
  let exists = true;
  try {
    await Deno.stat(new URL("src/components/provider/EmailVerificationStep.tsx", REPO_ROOT));
  } catch {
    exists = false;
  }
  assert(!exists, "Legacy src/components/provider/EmailVerificationStep.tsx must be deleted");
});

Deno.test("pipeline: no remaining import of the legacy verify component", async () => {
  // grep-style scan across src/.
  const grepFile = async (path: string): Promise<boolean> => {
    try {
      const txt = await Deno.readTextFile(new URL(path, REPO_ROOT));
      return /from\s+["']@\/components\/provider\/EmailVerificationStep["']/.test(txt);
    } catch {
      // File doesn't exist — vacuously satisfied.
      return false;
    }
  };
  // ProviderSignup is the only remaining file that historically imported it.
  // AuthSignup.tsx and NewListingForm.tsx no longer exist post-unification.
  assert(
    !(await grepFile("src/pages/ProviderSignup.tsx")),
    "src/pages/ProviderSignup.tsx must not import the legacy EmailVerificationStep",
  );
});

// ─── Invariant 2: state machine is the single source of truth ─────────

Deno.test("pipeline: ONBOARDING_STEPS canonical order is [account, verify_email, *, find_or_list, build, plan, completed]", async () => {
  const src = await read("src/hooks/useProviderOnboardingState.ts");
  // The export must list these in exact order. We check the slice that
  // matters — plan AFTER build (the round-30 reorder).
  const m = src.match(/ONBOARDING_STEPS\s*=\s*\[([^\]]+)\]/);
  assert(m, "ONBOARDING_STEPS export not found");
  const list = m[1];
  const buildIdx = list.indexOf('"build"');
  const planIdx = list.indexOf('"plan"');
  assert(buildIdx > 0, "build step missing from ONBOARDING_STEPS");
  assert(planIdx > buildIdx, "plan must come AFTER build (round-30 reorder)");
});

Deno.test("pipeline: canReach gates forward navigation", async () => {
  const src = await read("src/hooks/useProviderOnboardingState.ts");
  assertStringIncludes(
    src,
    "stepIndex(target) <= stepIndex(serverCurrent)",
    "canReach() must enforce that target step <= server's current step",
  );
});

// ─── Invariant 3: atomic completion via SECURITY DEFINER RPCs ─────────

Deno.test("pipeline: complete_provider_onboarding RPC exists + bypasses profile guard", async () => {
  const sql = await read("supabase/migrations/20260528000000_profile_sensitive_column_guard.sql");
  assertStringIncludes(
    sql,
    "CREATE OR REPLACE FUNCTION public.complete_provider_onboarding()",
  );
  assertStringIncludes(
    sql,
    "set_config('app.bypass_profile_guard', 'on'",
    "RPC must opt-in to the sensitive-column-guard bypass",
  );
  assertStringIncludes(
    sql,
    "GRANT EXECUTE ON FUNCTION public.complete_provider_onboarding() TO authenticated",
  );
});

Deno.test("pipeline: complete_provider_onboarding_with_plan rejects non-free plan from clients", async () => {
  const sql = await read("supabase/migrations/20260517210000_complete_provider_onboarding_with_plan.sql");
  assertStringIncludes(
    sql,
    "Only free plan can be set via this RPC",
    "The atomic Free-completion RPC must reject plan != 'free' so Pro can only come from the Stripe webhook",
  );
});

Deno.test("pipeline: profile guard blocks client writes to onboarding_completed_at + plan", async () => {
  const sql = await read("supabase/migrations/20260528000000_profile_sensitive_column_guard.sql");
  // The guard fires only when auth.uid() IS NOT NULL — service-role
  // (webhook + RPC bypass) skips the trigger.
  assertStringIncludes(sql, "IF auth.uid() IS NULL THEN");
  assertStringIncludes(sql, "Plan elevation to pro must be performed by the verified Stripe webhook");
  assertStringIncludes(sql, "profiles.onboarding_completed_at must be flipped via complete_provider_onboarding()");
});

// ─── Invariant 4: ProviderSignup is post-auth ONLY ────────────────────

Deno.test("pipeline: ProviderSignup has an entryStep floor that blocks descent", async () => {
  const src = await read("src/pages/ProviderSignup.tsx");
  assertStringIncludes(src, "const entryStep = initialStep ?? 3");
  // prevStep must floor at entryStep, not 1.
  assert(
    /if\s*\(\s*currentStep\s*>\s*entryStep\s*\)/.test(src),
    "prevStep() must check currentStep > entryStep, not > 1",
  );
});

Deno.test("pipeline: BuildStep embeds ProviderSignup with initialStep=3", async () => {
  // Post-unification: NewListingForm.tsx is deleted. The unified
  // wizard's BuildStep is the only place that mounts ProviderSignup.
  const src = await read("src/components/provider/onboarding/BuildStep.tsx");
  assertStringIncludes(src, "<ProviderSignup embedded initialStep={3} />");
});

Deno.test("pipeline: ProviderSignup publish hard-fails on state advance error (no silent loop)", async () => {
  const src = await read("src/pages/ProviderSignup.tsx");
  // The error branch must show a destructive toast and RETURN before
  // calling navigate — otherwise the user lands at ?step=plan with
  // state stuck at 'build' and canReach bounces them back forever.
  assertStringIncludes(src, "Listing saved — couldn't open the plan step");
  assertStringIncludes(src, 'variant: "destructive"');
});

// ─── Invariant 5: PlanStep self-heals stuck state ─────────────────────

Deno.test("pipeline: PlanStep self-heals when state is stuck at 'build'", async () => {
  const src = await read("src/components/provider/onboarding/PlanStep.tsx");
  assertStringIncludes(src, "Phase X self-heal");
  assert(
    /current_step.*===\s*["']build["']/.test(src),
    "PlanStep must check whether state still reports current_step='build'",
  );
  assert(
    /advance\(\{\s*current_step:\s*["']plan["']\s*\}\)/.test(src),
    "PlanStep must advance to 'plan' when self-healing a stuck state",
  );
});

// ─── Invariant 6: Dashboard recovery effect invalidates caches ────────

Deno.test("pipeline: Dashboard Pro recovery invalidates the right query keys", async () => {
  const src = await read("src/pages/provider/Dashboard.tsx");
  // The recovery effect must invalidate all three caches so the
  // Pro-gated widgets re-render without a manual refresh.
  for (const key of ["provider-data", "pro-status", "facility-subscription"]) {
    assert(
      new RegExp(`queryClient\\.invalidateQueries\\(\\{\\s*queryKey:\\s*\\[["']${key}["']\\]`).test(src),
      `Dashboard recovery effect must invalidate ["${key}"]`,
    );
  }
});

// ─── Invariant 7: edge functions present + handle error codes ─────────

Deno.test("pipeline: all required edge functions exist in repo", async () => {
  const required = [
    "supabase/functions/register-provider-account",
    "supabase/functions/send-verification-code",
    "supabase/functions/verify-code",
    "supabase/functions/initiate-claim-email-verification",
    "supabase/functions/confirm-claim-verification-code",
    "supabase/functions/initiate-claim-sms-verification",
    "supabase/functions/send-sms-verification-code",
    "supabase/functions/verify-sms-code",
    "supabase/functions/confirm-password-reset",
    "supabase/functions/send-provider-welcome-email",
  ];
  for (const dir of required) {
    let exists = false;
    try {
      const stat = await Deno.stat(new URL(`${dir}/index.ts`, REPO_ROOT));
      exists = stat.isFile;
    } catch {
      exists = false;
    }
    assert(exists, `Required edge function missing: ${dir}/index.ts`);
  }
});

Deno.test("pipeline: send-verification-code returns suppression code on hard-bounce", async () => {
  const src = await read("supabase/functions/send-verification-code/index.ts");
  assertStringIncludes(src, "EMAIL_SUPPRESSED");
  assertStringIncludes(src, 'from("suppressed_emails")');
});

Deno.test("pipeline: VerifyEmailStep handles both EMAIL_BLOCKED + EMAIL_SUPPRESSED", async () => {
  const src = await read("src/components/provider/onboarding/VerifyEmailStep.tsx");
  assert(
    /errorCode === "EMAIL_BLOCKED" \|\| data\.errorCode === "EMAIL_SUPPRESSED"/.test(src),
    "VerifyEmailStep must treat EMAIL_SUPPRESSED the same as EMAIL_BLOCKED",
  );
});

Deno.test("pipeline: AccountStep surfaces already-registered email as a sign-in prompt", async () => {
  const src = await read("src/components/provider/onboarding/AccountStep.tsx");
  assertStringIncludes(src, "detectAlreadyRegistered");
  assert(
    /already \(registered|in use|exists\)/.test(src),
    "detectAlreadyRegistered() must match the deployed regex variants",
  );
  assertStringIncludes(src, "Use the sign-in page instead");
});

// ─── Invariant 8: FindOrListStep refuses already-claimed facilities ───

Deno.test("pipeline: FindOrListStep blocks advance into already-claimed facility", async () => {
  const src = await read("src/components/provider/onboarding/FindOrListStep.tsx");
  // handleSelectExisting must short-circuit on is_claimed.
  assert(
    /candidate\?\.is_claimed/.test(src),
    "handleSelectExisting() must guard on candidate.is_claimed",
  );
  assertStringIncludes(src, "already claimed by another provider");
});

// ─── Invariant 9: Onboarding waits for both queries before inferring ──

Deno.test("pipeline: Onboarding.tsx inferredServerStep waits for both queries to resolve", async () => {
  const src = await read("src/pages/provider/Onboarding.tsx");
  // The phase V fix: inferredServerStep returns 'account' while
  // either loading flag is true, preventing one-frame flicker.
  assert(
    /stateLoading\s*\|\|\s*profileLoading\s*\n?\s*\?\s*"account"/.test(src),
    "inferredServerStep must default to 'account' while either query is still loading",
  );
});

// ─── Invariant 10: auto-sign-in continuity into the provider panel ────

Deno.test("pipeline: register-provider-account stamps user_metadata.account_type", async () => {
  const src = await read("supabase/functions/register-provider-account/index.ts");
  // Without this, useUserRole on the dashboard can't tell the new user
  // is a provider until the profiles trigger runs + the role hook re-
  // resolves; the auth-gate then redirects to /login.
  assert(
    /user_metadata:\s*\{[\s\S]*?account_type:\s*accountType/m.test(src),
    "register-provider-account must stamp user_metadata.account_type so useUserRole resolves immediately",
  );
});

Deno.test("pipeline: AccountStep signs the user in immediately after register", async () => {
  const src = await read("src/components/provider/onboarding/AccountStep.tsx");
  assertStringIncludes(src, "signInWithPassword");
  // The sign-in must run BEFORE the advance(...) call so the
  // user_id is available to upsert against.
  const signInIdx = src.indexOf("signInWithPassword");
  const advanceIdx = src.indexOf("advance(");
  assert(
    signInIdx > 0 && advanceIdx > signInIdx,
    "signInWithPassword must precede the advance() call in AccountStep",
  );
});

Deno.test("pipeline: ProviderShell auth gate retries profile-row lookup 3 times", async () => {
  const src = await read("src/components/provider/ProviderShell.tsx");
  // The 1.5s retry window covers the gap between auth.user existing
  // and the post-signup profiles trigger landing.
  assertStringIncludes(src, "checkProvider");
  assert(
    /delays\s*=\s*\[0,\s*500,\s*1000\]/.test(src),
    "ProviderShell must poll for the profile row at 0/500/1000ms before bouncing to login",
  );
});

Deno.test("pipeline: verify-code is idempotent on double-submit (alreadyVerified)", async () => {
  const src = await read("supabase/functions/verify-code/index.ts");
  // A user double-clicking the Verify button must not see "Invalid
  // code" on the second click — the function returns alreadyVerified.
  assertStringIncludes(src, "alreadyVerified: true");
  assertStringIncludes(src, '.eq("verified", true)');
});

Deno.test("pipeline: PlanStep Free handler navigates to /provider/dashboard via replace", async () => {
  const src = await read("src/components/provider/onboarding/PlanStep.tsx");
  // replace:true so the back button doesn't bounce them into the
  // onboarding step they just completed.
  assert(
    /navigate\(["']\/provider\/dashboard["'],\s*\{\s*replace:\s*true\s*\}\)/.test(src),
    "PlanStep Free handler must navigate with replace:true",
  );
});

Deno.test("pipeline: PlanStep fast-tracks Pro users whose webhook landed early", async () => {
  const src = await read("src/components/provider/onboarding/PlanStep.tsx");
  // The Round-30 merge added an effect that checks for an active Pro
  // subscription on mount and routes the user to the dashboard without
  // making them pick again. Tests for the comment-bound code shape.
  assert(
    /facility_subscriptions[\s\S]{0,200}status[\s\S]{0,200}active[\s\S]{0,200}tier[\s\S]{0,200}pro/m.test(src),
    "PlanStep must check facility_subscriptions for an active Pro row on mount",
  );
});

Deno.test("pipeline: Onboarding page redirects already-completed users to the dashboard (except add-listing)", async () => {
  const src = await read("src/pages/provider/Onboarding.tsx");
  // Without this, a returning Pro user who clicks a stale onboarding
  // link sees the wizard prompting them for plan again. The add-listing
  // exception lets them re-enter for adding another facility.
  assertStringIncludes(src, "onboarding_completed_at");
  assertStringIncludes(src, '"/provider/dashboard"');
  assert(
    /profile\?\.onboarding_completed_at\s*&&\s*!addListingIntent/.test(src),
    "Onboarding.tsx must redirect already-completed users to the dashboard UNLESS ?action=add-listing is present",
  );
});

Deno.test("pipeline: Dashboard welcome modal gated by profile_completion_celebrated + isPlaceholderData", async () => {
  const src = await read("src/pages/provider/Dashboard.tsx");
  // Without the isPlaceholderData check the modal flashes open on
  // every reload for established providers while the localStorage
  // placeholder is in play (round-30 audit fix).
  assertStringIncludes(src, "profile_completion_celebrated");
  assert(
    /!isLoading\s*&&\s*!isPlaceholderData\s*&&[\s\S]{0,80}profile_completion_celebrated/.test(src),
    "Welcome modal must gate on isPlaceholderData to avoid the reload-flash bug",
  );
});

Deno.test("pipeline: SelectedFacilityContext clears state on SIGNED_OUT", async () => {
  const src = await read("src/contexts/SelectedFacilityContext.tsx");
  // Stops cross-account state contamination if a user signs out and
  // another user signs in on the same browser.
  assertStringIncludes(src, "SIGNED_OUT");
  assertStringIncludes(src, "setSelectedFacilityState(null)");
});

Deno.test("pipeline: /provider/onboarding/new-listing is a Navigate-only redirect", async () => {
  // Post-unification: the dedicated NewListingForm page is gone. The
  // route is now a plain inline Navigate to ?action=add-listing in
  // App.tsx; no file at /pages/provider/NewListingForm.tsx exists.
  const app = await read("src/App.tsx");
  assert(
    /path="\/provider\/onboarding\/new-listing"\s+element=\{<Navigate to="\/provider\/onboarding\?action=add-listing"/.test(app),
    "/provider/onboarding/new-listing must be a simple Navigate to ?action=add-listing",
  );
  let exists = true;
  try {
    await Deno.stat(new URL("src/pages/provider/NewListingForm.tsx", REPO_ROOT));
  } catch {
    exists = false;
  }
  assert(!exists, "src/pages/provider/NewListingForm.tsx must be deleted");
});

// ─── Summary ──────────────────────────────────────────────────────────

Deno.test("pipeline: all invariants covered", () => {
  // Sentinel — if this file shrinks, the previous tests are still
  // run individually. This just makes the suite header explicit in
  // the test runner output.
  assertEquals(1, 1);
});
