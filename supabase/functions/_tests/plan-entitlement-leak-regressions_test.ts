// Plan/entitlement-leak regression tests (2026-07-02 audit).
//
// Locks in the invariants from docs/audit/pro-entitlement-leak-2026-07-02.md
// — the fixes for the real-provider case where a Free account listed 3
// facilities with 10 photos and no payment:
//
//   1. Free vs Pro facility listing caps (DB trigger + client hook)
//   2. Unpaid / incomplete Stripe checkout never activates Pro
//   3. Webhook confirmation is the ONLY Pro activation source
//   4. Admin plan display reads the entitlement source of truth
//   5. Image upload limits (gallery trigger + storage object cap)
//   6. Provider self-verify hole is closed
//   7. Embed widgets / review responses are server-gated on Pro
//
// Source-contract assertions in the style of
// monetization-hardening-regressions_test.ts. Run with:
//   deno test --allow-read supabase/functions/_tests/plan-entitlement-leak-regressions_test.ts

// Zero-dependency asserts so this file runs in restricted-network
// environments too (deno.land/jsr may be unreachable behind egress policies).
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}
function assertStringIncludes(actual: string, expected: string): void {
  if (!actual.includes(expected)) {
    throw new Error(`Expected source to include: ${expected}`);
  }
}

const REPO_ROOT = new URL("../../../", import.meta.url);

async function read(rel: string): Promise<string> {
  return await Deno.readTextFile(new URL(rel, REPO_ROOT));
}

// ─── 1. Facility listing caps ───────────────────────────────────────────────

Deno.test("facility-cap: DB trigger restored with Free=1 / Pro=5", async () => {
  const sql = await read("supabase/migrations/20260829003700_restore_plan_based_facility_limit.sql");
  assertStringIncludes(sql, "CREATE OR REPLACE FUNCTION public.enforce_facility_limit()");
  assertStringIncludes(sql, "CREATE TRIGGER enforce_facility_limit_trigger");
  assertStringIncludes(sql, "BEFORE INSERT ON public.facilities");
  assert(
    /CASE WHEN is_pro THEN 5 ELSE 1 END/.test(sql),
    "cap must be Free=1 / Pro=5",
  );
});

Deno.test("facility-cap: Pro is derived from facility_subscriptions (webhook-confirmed), never profiles.plan", async () => {
  const sql = await read("supabase/migrations/20260829003700_restore_plan_based_facility_limit.sql");
  assertStringIncludes(sql, "FROM public.facility_subscriptions");
  assertStringIncludes(sql, "tier = 'pro'");
  // grace parity with has_active_pro()
  assertStringIncludes(sql, "OR status = 'past_due'");
  assert(
    !/FROM public\.profiles/.test(sql),
    "the cap must not read the profiles.plan mirror (drift-prone)",
  );
});

Deno.test("facility-cap: unowned (import) rows skip the cap; admins bypass", async () => {
  const sql = await read("supabase/migrations/20260829003700_restore_plan_based_facility_limit.sql");
  assertStringIncludes(sql, "IF NEW.user_id IS NULL THEN");
  assertStringIncludes(sql, "'admin'::app_role");
});

Deno.test("facility-cap: client hook no longer hardcodes canAddMore", async () => {
  const src = await read("src/hooks/useFacilityLimits.ts");
  assert(
    !/canAddMore:\s*true\s+as\s+const/.test(src),
    "useFacilityLimits must compute canAddMore from plan, not hardcode true",
  );
  assertStringIncludes(src, "FACILITY_LIMIT_FREE = 1");
  assertStringIncludes(src, "FACILITY_LIMIT_PRO = 5");
  assertStringIncludes(src, "canAddMore: used < limit");
});

Deno.test("facility-cap: Add Location page gates at the limit with an upgrade CTA", async () => {
  const src = await read("src/pages/provider/AddLocation.tsx");
  assertStringIncludes(src, "canAddMore");
  assertStringIncludes(src, "Listing limit reached");
  assertStringIncludes(src, "Upgrade to Pro");
});

// ─── 2 + 3. Unpaid checkout / webhook-only activation ───────────────────────

Deno.test("webhook: checkout.session.completed verifies payment before activating Pro", async () => {
  const src = await read("supabase/functions/stripe-webhook/index.ts");
  assert(
    /session\.payment_status === "paid"/.test(src),
    "must check session.payment_status",
  );
  assertStringIncludes(src, 'status: paymentConfirmed ? "active" : "incomplete"');
  // Benefits only on the confirmed branch.
  assert(
    /else if \(!paymentConfirmed\)/.test(src),
    "unconfirmed sessions must take the incomplete branch (no benefits, no success notification)",
  );
});

Deno.test("webhook: 'incomplete' is stored verbatim, never promoted to the past_due grace window", async () => {
  const src = await read("supabase/functions/stripe-webhook/index.ts");
  assert(
    /"incomplete" \? "incomplete"/.test(src),
    "subscription.updated must map incomplete → incomplete (past_due grants grace benefits via has_active_pro)",
  );
  // invoice.payment_failed must not lift an incomplete row into past_due.
  assert(
    /\.neq\("status", "canceled"\)[\s\S]{0,300}?\.neq\("status", "incomplete"\)/.test(src),
    "payment_failed handler must exclude incomplete rows from the past_due update",
  );
});

Deno.test("webhook: benefits activate on the incomplete→active transition", async () => {
  const src = await read("supabase/functions/stripe-webhook/index.ts");
  assert(
    /previousStatus === "incomplete"[\s\S]{0,400}?activateProBenefits/.test(src),
    "incomplete→active must call activateProBenefits",
  );
});

Deno.test("webhook: customer.subscription.created grants benefits only for active/trialing", async () => {
  const src = await read("supabase/functions/stripe-webhook/index.ts");
  assert(
    /subscriptionEntitled\s*=\s*\n?\s*subscription\.status === "active" \|\| subscription\.status === "trialing"/.test(src),
    "created handler must gate on subscription.status",
  );
  assert(
    /planTier === "pro" && subscriptionEntitled/.test(src),
    "activateProBenefits must require subscriptionEntitled",
  );
  // The subscription_events row must record the REAL status, not "active".
  assert(
    /status: subscription\.status/.test(src),
    "subscription_events must record the real Stripe status",
  );
});

Deno.test("webhook: signature verification + event-id idempotency intact", async () => {
  const src = await read("supabase/functions/stripe-webhook/index.ts");
  assertStringIncludes(src, "constructEventAsync");
  assertStringIncludes(src, "claim_stripe_webhook_event");
});

Deno.test("no client-side Pro activation: success pages poll, never write", async () => {
  for (const file of [
    "src/components/provider/onboarding/PlanStep.tsx",
    "src/pages/provider/Billing.tsx",
  ]) {
    const src = await read(file);
    assert(
      !/from\(["']facility_subscriptions["']\)\s*\.\s*(insert|upsert|update)/.test(src),
      `${file} must not write facility_subscriptions`,
    );
    assert(
      !/from\(["']profiles["']\)[\s\S]{0,200}?plan:\s*["']pro["']/.test(src),
      `${file} must not write profiles.plan`,
    );
  }
});

// ─── 4. Admin display reads the entitlement source of truth ─────────────────

Deno.test("admin: Pro badge query filters tier='pro' and applies has_active_pro semantics", async () => {
  const src = await read("src/pages/admin/AdminProviders.tsx");
  assert(
    /admin-pro-subscriptions[\s\S]{0,900}?\.eq\("tier", "pro"\)/.test(src),
    "badge query must filter tier='pro'",
  );
  assertStringIncludes(src, "isActiveProRow");
  // Stat count too.
  assert(
    /facility_subscriptions[^\n]*\.eq\("tier", "pro"\)\.in\("status", \["active", "past_due"\]\)/.test(src),
    "pro stat count must filter tier='pro'",
  );
});

Deno.test("admin: provider detail modal mirrors has_active_pro", async () => {
  const src = await read("src/components/admin/providers/ProviderDetailModal.tsx");
  assertStringIncludes(src, '.eq("tier", "pro")');
  assertStringIncludes(src, '.in("status", ["active", "past_due"])');
  assertStringIncludes(src, "isActiveProRow");
});

// ─── 5. Image upload limits ─────────────────────────────────────────────────

Deno.test("images: gallery display cap trigger unchanged (Free=5 / Pro=10 per facility)", async () => {
  const sql = await read("supabase/migrations/20260729000000_photo_cap_reads_facility_subscriptions_tier.sql");
  assertStringIncludes(sql, "CASE WHEN is_pro THEN 10 ELSE 5 END");
  assertStringIncludes(sql, "has_active_pro(NEW.id)");
});

Deno.test("images: storage bucket has a plan-aware object ceiling (RESTRICTIVE policy)", async () => {
  const sql = await read("supabase/migrations/20260829004100_facility_images_storage_cap.sql");
  assertStringIncludes(sql, "facility_images_upload_within_cap");
  assertStringIncludes(sql, "AS RESTRICTIVE FOR INSERT");
  assertStringIncludes(sql, "CASE WHEN v_is_pro THEN 150 ELSE 20 END");
});

Deno.test("images: validate-and-upload (service role) enforces the same ceiling", async () => {
  const src = await read("supabase/functions/validate-and-upload/index.ts");
  assertStringIncludes(src, "facility_images_upload_within_cap");
  assertStringIncludes(src, "PLAN_STORAGE_CAP");
});

// ─── 6. Self-verify hole ────────────────────────────────────────────────────

Deno.test("verified: only admins/service-role may set facilities.verified=true", async () => {
  const sql = await read("supabase/migrations/20260829003800_verified_gate_admin_actor_only.sql");
  assertStringIncludes(sql, "enforce_facility_verified_gate");
  assert(
    /has_role\(\(SELECT auth\.uid\(\)\), 'admin'::app_role\)/.test(sql),
    "actor gate must check the admin role",
  );
  assertStringIncludes(sql, "not by the listing owner");
});

// ─── 7. Embed widgets / review responses server-gated ───────────────────────

Deno.test("embed: badge/reviews/gallery RPCs require has_active_pro", async () => {
  const sql = await read("supabase/migrations/20260829004000_embed_and_review_response_require_pro.sql");
  for (const fn of ["get_embed_badge", "get_embed_reviews", "get_embed_gallery"]) {
    assert(sql.includes(fn), `migration must redefine ${fn}`);
  }
  const gates = sql.match(/AND has_active_pro\(f\.id\)/g) ?? [];
  assert(gates.length >= 3, "each embed RPC must gate on has_active_pro");
});

Deno.test("embed: serve-badge endpoint requires Pro + verified for the verified badge", async () => {
  const src = await read("supabase/functions/serve-badge/index.ts");
  assertStringIncludes(src, 'rpc("has_active_pro"');
  assert(
    /type === "verified" && facility\.verified !== true/.test(src),
    "verified badge type must require facilities.verified",
  );
});

Deno.test("reviews: responding requires an active Pro subscription (server-side)", async () => {
  const sql = await read("supabase/migrations/20260829004000_embed_and_review_response_require_pro.sql");
  assert(
    /validate_review_response[\s\S]+?has_active_pro\(NEW\.facility_id\)/.test(sql),
    "validate_review_response must gate INSERT on has_active_pro",
  );
  const ui = await read("src/components/provider/reviews/ProviderReviewCard.tsx");
  assertStringIncludes(ui, "canRespond");
});

// ─── 8. Plan-change audit trail ─────────────────────────────────────────────

Deno.test("audit: facility_subscriptions changes write plan_change_audit rows", async () => {
  const sql = await read("supabase/migrations/20260829003900_plan_change_audit.sql");
  assertStringIncludes(sql, "CREATE TABLE IF NOT EXISTS public.plan_change_audit");
  assertStringIncludes(sql, "AFTER INSERT OR UPDATE OR DELETE ON public.facility_subscriptions");
  // Admin-read-only: RLS enabled, no client write policies.
  assertStringIncludes(sql, "ENABLE ROW LEVEL SECURITY");
  assert(
    !/CREATE POLICY[\s\S]{0,200}?FOR (INSERT|UPDATE|DELETE)/.test(sql),
    "plan_change_audit must have no client write policies",
  );
});

// ─── 9. Stale 'unlimited listings' copy is gone ─────────────────────────────

Deno.test("copy: no provider surface advertises unlimited facility listings", async () => {
  for (const file of [
    "src/hooks/useSubscription.ts",
    "src/hooks/useFacilityLimits.ts",
    "src/components/provider/ProBenefitsWidget.tsx",
    "src/pages/provider/Help.tsx",
    "src/pages/provider/KnowledgeBase.tsx",
    "src/pages/provider/MarketingHub.tsx",
    "supabase/functions/stripe-webhook/index.ts",
  ]) {
    const src = await read(file);
    assert(
      !/unlimited facilit/i.test(src),
      `${file} still advertises unlimited facility listings`,
    );
  }
});
