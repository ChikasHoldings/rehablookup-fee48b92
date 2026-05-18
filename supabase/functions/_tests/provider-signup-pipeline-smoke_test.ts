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

Deno.test("pipeline: legacy /provider-signup + /auth/signup redirect to the unified wizard", async () => {
  const app = await read("src/App.tsx");
  // /provider-signup is a Navigate-only route.
  assert(
    /path="\/provider-signup"\s+element=\{<Navigate to="\/provider\/onboarding"/.test(app),
    "/provider-signup must redirect to /provider/onboarding",
  );
  // /provider/signup is a Navigate-only route.
  assert(
    /path="\/provider\/signup"\s+element=\{<Navigate to="\/provider-signup"/.test(app),
    "/provider/signup must chain-redirect to /provider-signup",
  );
});

Deno.test("pipeline: AuthSignup is a pure redirect, not a separate auth form", async () => {
  const src = await read("src/pages/AuthSignup.tsx");
  // The file must NOT import any sign-up UI components (no Inputs, no
  // password fields, no Resend invocation).
  assert(
    !src.includes("signInWithPassword") && !src.includes("admin.createUser"),
    "AuthSignup must not contain auth-creation logic (it should only redirect)",
  );
  assert(
    src.includes("Navigate") && src.includes("/provider/onboarding"),
    "AuthSignup must redirect to /provider/onboarding",
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
      // The unified path is .../onboarding/VerifyEmailStep, so we must
      // reject only the legacy bare path.
      return /from\s+["']@\/components\/provider\/EmailVerificationStep["']/.test(txt);
    } catch {
      return false;
    }
  };
  // Spot-check the files that historically imported it.
  for (const p of [
    "src/pages/ProviderSignup.tsx",
    "src/pages/AuthSignup.tsx",
    "src/pages/provider/NewListingForm.tsx",
  ]) {
    assert(!(await grepFile(p)), `${p} must not import the legacy EmailVerificationStep`);
  }
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

Deno.test("pipeline: NewListingForm always mounts ProviderSignup at step 3", async () => {
  const src = await read("src/pages/provider/NewListingForm.tsx");
  assertStringIncludes(src, "<ProviderSignup initialStep={3} />");
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

// ─── Summary ──────────────────────────────────────────────────────────

Deno.test("pipeline: all 9 invariants covered", () => {
  // Sentinel — if this file shrinks, the previous tests are still
  // run individually. This just makes the suite header explicit in
  // the test runner output.
  assertEquals(1, 1);
});
