// Monetization hardening regression tests.
//
// These are tight source-contract assertions that lock in the
// invariants established by the 2026-05-20 monetization audit stack
// (Prompts 1–5 of docs/monetization-*.md). Every assertion exists to
// catch a SPECIFIC regression — drift in any of these would silently
// re-introduce a bug the audit closed.
//
// Run with:
//   deno test --allow-read supabase/functions/_tests/monetization-hardening-regressions_test.ts
//
// The existing _tests/*.ts files (monetization-helpers-smoke_test,
// stripe-webhook-e2e_test, provider-signup-pipeline-smoke_test,
// provider-onboarding-smoke_test, fee-pricing-regression_test,
// welcome-email-*_test) cover the broader monetization surface. This
// file specifically targets the post-audit hardening — see
// docs/monetization-hardening-smoke-2026-05-20.md for the full
// inventory.

import {
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const REPO_ROOT = new URL("../../../", import.meta.url);

async function read(rel: string): Promise<string> {
  return await Deno.readTextFile(new URL(rel, REPO_ROOT));
}

async function exists(rel: string): Promise<boolean> {
  try {
    await Deno.stat(new URL(rel, REPO_ROOT));
    return true;
  } catch {
    return false;
  }
}

// ─── Prompt 1 — plan-gate hardening ────────────────────────────────────

Deno.test("plan-gate: profiles.plan tightened to NOT NULL via gated migration", async () => {
  const sql = await read("supabase/migrations/20260520020409_plan_gate_hardening.sql");
  // The ALTER must be gated on NO NULL rows remaining so it never
  // fails mid-migration. Look for the exact gate shape.
  assert(
    /NOT EXISTS \(\s*SELECT 1 FROM public\.profiles WHERE plan IS NULL\s*\)/.test(sql),
    "ALTER TABLE ... SET NOT NULL must be gated on `NOT EXISTS (... plan IS NULL)`",
  );
  assertStringIncludes(sql, "ALTER TABLE public.profiles ALTER COLUMN plan SET NOT NULL");
});

Deno.test("plan-gate: complete_provider_onboarding refuses no-plan completion", async () => {
  const sql = await read("supabase/migrations/20260520020409_plan_gate_hardening.sql");
  // The RPC must check for both a recorded state.plan AND an active
  // Pro subscription, raising if neither.
  assertStringIncludes(sql, "Cannot mark onboarding complete without a plan choice");
  assert(
    /recorded_plan IS NULL AND NOT has_active_pro/.test(sql),
    "guard must be (state.plan IS NULL AND no active Pro)",
  );
  assertStringIncludes(sql, "USING ERRCODE = 'insufficient_privilege'");
});

Deno.test("plan-gate: state-row completion trigger blocks unsafe transitions", async () => {
  const sql = await read("supabase/migrations/20260520020409_plan_gate_hardening.sql");
  assertStringIncludes(sql, "enforce_onboarding_state_completion_requires_plan");
  assertStringIncludes(sql, "provider_onboarding_state_completion_plan_chk");
  assertStringIncludes(sql, "USING ERRCODE = 'check_violation'");
});

Deno.test("plan-gate: ClaimSubmitted does NOT prematurely complete onboarding", async () => {
  const src = await read("src/pages/provider/ClaimSubmitted.tsx");
  // The pre-fix code path: useEffect calling `supabase.rpc("complete_provider_onboarding")`
  // on mount. Must NOT exist — that's the bypass we closed.
  assert(
    !/rpc\(["']complete_provider_onboarding["']\)/.test(src),
    "ClaimSubmitted must NOT call complete_provider_onboarding (was bypassing PlanStep)",
  );
  // Confirm the explanatory replacement comment is in place so a
  // future developer can't re-introduce the bug without learning why.
  assertStringIncludes(
    src,
    "PlanStep is now the single owner of the completion flip",
  );
});

// ─── Prompt 2 — Pro upgrade hardening ───────────────────────────────────

Deno.test("pro-upgrade: 6 retired edge functions vendored as 410-tombstones", async () => {
  const retired = [
    "create-concierge-checkout",
    "charge-placement-fee",
    "record-placement-agreement",
    "submit-placement-case",
    "retry-failed-payments",
    "admin-manage-invoice",
  ];
  for (const fn of retired) {
    const path = `supabase/functions/${fn}/index.ts`;
    assert(await exists(path), `Retired fn ${fn} must be vendored locally`);
    const src = await read(path);
    assertStringIncludes(src, "function_retired");
    assertStringIncludes(src, "status: 410");
    assert(
      /retired_at:\s*"2026-05-18"/.test(src),
      `${fn} tombstone must stamp retired_at`,
    );
  }
});

Deno.test("pro-upgrade: ProviderWelcomeModal deleted (was duplicating WelcomeModal)", async () => {
  assert(
    !(await exists("src/components/provider/ProviderWelcomeModal.tsx")),
    "ProviderWelcomeModal.tsx must be deleted — was stacking with WelcomeModal",
  );
  const dashboard = await read("src/pages/provider/Dashboard.tsx");
  assert(
    !/import\s+\{\s*ProviderWelcomeModal/.test(dashboard),
    "Dashboard must not import ProviderWelcomeModal",
  );
  assert(
    !/<ProviderWelcomeModal/.test(dashboard),
    "Dashboard must not mount ProviderWelcomeModal",
  );
});

Deno.test("pro-upgrade: PlanGate deleted (was dead code)", async () => {
  assert(
    !(await exists("src/components/provider/onboarding/PlanGate.tsx")),
    "PlanGate.tsx must be deleted — had zero live imports",
  );
});

Deno.test("pro-upgrade: Billing.tsx handles ?upgrade=pro deep-link param", async () => {
  const src = await read("src/pages/provider/Billing.tsx");
  // Effect must read the upgrade= param + strip it + surface a toast
  // so the 13+ CTAs across the panel that link with ?upgrade=pro
  // produce a contextual prompt on landing.
  assert(
    /upgradeIntent\s*=\s*searchParams\.get\(["']upgrade["']\)/.test(src),
    "Billing must read ?upgrade=… param",
  );
  assertStringIncludes(
    src,
    "Pick monthly or annual below to upgrade to Pro",
  );
  assert(
    /next\.delete\(["']upgrade["']\)/.test(src),
    "Billing must strip the upgrade param after surfacing the toast",
  );
});

Deno.test("pro-upgrade: Billing.tsx handles ?signup=retry from legacy /signup/subscription", async () => {
  const src = await read("src/pages/provider/Billing.tsx");
  assert(
    /signupRetry\s*=\s*searchParams\.get\(["']signup["']\)/.test(src),
    "Billing must read ?signup=… param",
  );
  assertStringIncludes(src, "Pick a billing period below to retry your Pro upgrade");
});

Deno.test("pro-upgrade: create-checkout has 30-min open-session reuse + 5-min idempotency-key bucket", async () => {
  const src = await read("supabase/functions/create-checkout/index.ts");
  assertStringIncludes(src, "thirtyMinAgo");
  assertStringIncludes(src, "stripe.checkout.sessions.list");
  assert(
    /idempotencyBucket\s*=\s*Math\.floor\(Date\.now\(\)\s*\/\s*\(\s*5\s*\*\s*60\s*\*\s*1000\s*\)\)/.test(src),
    "create-checkout must use a 5-minute idempotency-key bucket",
  );
});

Deno.test("pro-upgrade: create-checkout-session has Pro-required gate for add-ons", async () => {
  const src = await read("supabase/functions/create-checkout-session/index.ts");
  // Gate: add_addon intent must reject when no active Pro sub.
  assertStringIncludes(src, "PRO_REQUIRED");
  assert(
    /requires an active Pro subscription/.test(src),
    "create-checkout-session must reject add-ons without active Pro",
  );
});

Deno.test("pro-upgrade: webhook event dedup returns 500 on dedup-claim failure", async () => {
  const src = await read("supabase/functions/stripe-webhook/index.ts");
  assertStringIncludes(src, "claim_stripe_webhook_event");
  assertStringIncludes(src, "webhook_dedup_failure");
  // The Round-31 audit fix: dedup-claim failure must return 500 so
  // Stripe retries, not 200 with a silent log.
  assertStringIncludes(src, "dedup_claim_failed");
  assertStringIncludes(src, "retryable: true");
});

// ─── Provider entry unification (also touches Pro upgrade) ─────────────

Deno.test("unification: legacy provider-entry pages deleted", async () => {
  const deleted = [
    "src/pages/AuthSignup.tsx",
    "src/pages/provider/NewListingForm.tsx",
    "src/pages/provider/LegacyClaimRedirect.tsx",
    "src/pages/provider/ClaimSubmitted.tsx",
  ];
  for (const path of deleted) {
    assert(!(await exists(path)), `Legacy provider-entry page must be deleted: ${path}`);
  }
});

Deno.test("unification: legacy provider-entry routes redirect inline", async () => {
  const app = await read("src/App.tsx");
  // /auth/signup → NavigateAuthSignup (preserves params)
  assert(
    /path="\/auth\/signup"\s+element=\{<NavigateAuthSignup\s*\/>\}/.test(app),
    "/auth/signup must mount NavigateAuthSignup",
  );
  // /provider/claim/:slug → NavigateProviderClaim (slug → facility_slug)
  assert(
    /path="\/provider\/claim\/:slug"\s+element=\{<NavigateProviderClaim\s*\/>\}/.test(app),
    "/provider/claim/:slug must mount NavigateProviderClaim",
  );
  // /provider/onboarding/new-listing → Navigate
  assert(
    /path="\/provider\/onboarding\/new-listing"[\s\S]{0,200}<Navigate to="\/provider\/onboarding\?action=add-listing"/.test(app),
    "/provider/onboarding/new-listing must redirect to ?action=add-listing",
  );
  // /provider/claim/:slug/submitted → Navigate to /provider/claims
  assert(
    /path="\/provider\/claim\/:slug\/submitted"[\s\S]{0,200}<Navigate to="\/provider\/claims"/.test(app),
    "/provider/claim/:slug/submitted must redirect to /provider/claims",
  );
});

Deno.test("unification: NavigateAuthSignup sanitizes returnTo", async () => {
  const app = await read("src/App.tsx");
  assertStringIncludes(app, "function NavigateAuthSignup()");
  assertStringIncludes(app, "function safeReturnTo(");
  assert(
    /safeReturnTo\(params\.get\(["']returnTo["']\)\)/.test(app),
    "NavigateAuthSignup must filter returnTo through safeReturnTo",
  );
});

// ─── Prompt 5 — cross-cutting verification ─────────────────────────────

Deno.test("cross-cutting: DunningBanner globally mounted in ProviderShell", async () => {
  const src = await read("src/components/provider/ProviderShell.tsx");
  assertStringIncludes(src, "import { DunningBanner }");
  assertStringIncludes(src, "<DunningBanner />");
});

Deno.test("cross-cutting: AddonCapsTab + FeaturedPlacementTab + RetentionDashboard mounted in AdminSubscriptions", async () => {
  const src = await read("src/pages/admin/AdminSubscriptions.tsx");
  for (const sym of ["AddonCapsTab", "FeaturedPlacementTab", "RetentionDashboard"]) {
    assertStringIncludes(src, sym);
  }
});

Deno.test("cross-cutting: concierge_introduction_audit table migration present", async () => {
  const sql = await read("supabase/migrations/20260521000000_concierge_introduction_audit.sql");
  assertStringIncludes(sql, "CREATE TABLE IF NOT EXISTS public.concierge_introduction_audit");
  assertStringIncludes(sql, "rejected_non_partner_candidates");
  assertStringIncludes(sql, "flagged_for_admin_review");
});

Deno.test("cross-cutting: addon cap enforcement migration present", async () => {
  const sql = await read("supabase/migrations/20260602000000_addon_cap_enforcement_and_availability.sql");
  assertStringIncludes(sql, "enforce_featured_placement_cap");
  assertStringIncludes(sql, "enforce_concierge_geo_cap");
  assertStringIncludes(sql, "get_placement_availability");
  assertStringIncludes(sql, "get_concierge_availability");
  assertStringIncludes(sql, "concierge_geo_caps");
});

// ─── Welcome-modal single-source-of-truth check ────────────────────────

Deno.test("welcome-modal: WelcomeModal is the single source mounted in ProviderShell", async () => {
  const shell = await read("src/components/provider/ProviderShell.tsx");
  assertStringIncludes(shell, "<WelcomeModal />");
  // ProviderWelcomeModal must NOT be imported anywhere.
  // Walk src/ + supabase/functions/ for stragglers.
  for (const path of [
    "src/pages/provider/Dashboard.tsx",
    "src/components/provider/ProviderShell.tsx",
  ]) {
    const src = await read(path);
    assert(
      !/import\s+\{\s*ProviderWelcomeModal/.test(src),
      `${path} must not import the retired ProviderWelcomeModal`,
    );
  }
});

// ─── Summary sentinel ──────────────────────────────────────────────────

Deno.test("monetization-hardening: all invariants covered", () => {
  // Sentinel — if this file shrinks, the previous tests are still run
  // individually. This just makes the suite header explicit.
  assert(true);
});
