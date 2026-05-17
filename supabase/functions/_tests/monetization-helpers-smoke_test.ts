// Monetization helpers + add-on Checkout smoke test.
//
// Source-contract assertions (à la provider-onboarding-smoke_test.ts) —
// not live HTTP calls. We don't have a Stripe sandbox in this CI, so
// the runnable tier asserts each module follows the documented
// contract: helper signatures, idempotency guards, admin-alert calls,
// metadata routing tokens.
//
// What this guards against:
//   - Someone deleting the idempotency guard in activateProBenefits +
//     re-introducing the double-+50-ranking bug.
//   - create-checkout-session quietly losing the Pro-required gate.
//   - The webhook routing branches (metadata.type === 'featured_addon'
//     etc.) drifting and silently breaking activation.
//
// The full Stripe-test-mode + sandbox-Supabase end-to-end suite is
// documented in docs/waitlist-auto-drain-2026-05-17.md and earlier
// hardening docs; this file is the runnable foundation those tests
// would build on.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

async function readSrc(relPath: string): Promise<string> {
  const url = new URL(relPath, import.meta.url);
  return await Deno.readTextFile(url);
}

// ─────────────────────────────────────────────────────────────────────────
// Pro benefits helpers
// ─────────────────────────────────────────────────────────────────────────

Deno.test("pro-benefits: activateProBenefits + deactivateProBenefits + notifier are exported", async () => {
  const src = await readSrc("../_shared/pro-benefits.ts");
  assertStringIncludes(src, "export async function activateProBenefits");
  assertStringIncludes(src, "export async function deactivateProBenefits");
  assertStringIncludes(src, "export async function notifyProBenefitsPartialFailure");
});

Deno.test("pro-benefits: activate guards against double +50 ranking", async () => {
  const src = await readSrc("../_shared/pro-benefits.ts");
  // The bug previously was reading currentScore and adding 50 unconditionally.
  // The guard is the alreadyBoosted short-circuit.
  assertStringIncludes(src, "alreadyBoosted");
  assertStringIncludes(src, "featured?: boolean | null");
});

Deno.test("pro-benefits: deactivate clamps ranking score at 0", async () => {
  const src = await readSrc("../_shared/pro-benefits.ts");
  assertStringIncludes(src, "Math.max(0, currentScore - RANKING_BOOST)");
});

Deno.test("pro-benefits: notifier writes admin_notifications.type='pro_benefits_partial_failure'", async () => {
  const src = await readSrc("../_shared/pro-benefits.ts");
  assertStringIncludes(src, "pro_benefits_partial_failure");
  assertStringIncludes(src, 'from("admin_notifications")');
});

// ─────────────────────────────────────────────────────────────────────────
// Featured add-on helpers
// ─────────────────────────────────────────────────────────────────────────

Deno.test("featured-addon: activate seeds homepage + state + city placements", async () => {
  const src = await readSrc("../_shared/featured-addon.ts");
  // The seed function pushes homepage with value "national" first.
  assertStringIncludes(src, 'type: "homepage", value: "national"');
  // The state seed uses uppercase abbreviation; check the call.
  assertStringIncludes(src, "trim().toUpperCase()");
  // City seed uses slugify (matches src/lib/featuredBucket.ts).
  assertStringIncludes(src, "slugify(facility.city)");
});

Deno.test("featured-addon: reactivation path exists for re-purchase after cancel", async () => {
  const src = await readSrc("../_shared/featured-addon.ts");
  assertStringIncludes(src, "placements_reactivated");
  assertStringIncludes(src, "active: true");
  assertStringIncludes(src, "deactivated_at: null");
});

Deno.test("featured-addon: deactivate sets active=false on every active row", async () => {
  const src = await readSrc("../_shared/featured-addon.ts");
  assertStringIncludes(src, "export async function deactivateFeaturedAddon");
  assertStringIncludes(src, '.eq("active", true)');
});

// ─────────────────────────────────────────────────────────────────────────
// Concierge add-on helpers
// ─────────────────────────────────────────────────────────────────────────

Deno.test("concierge-addon: activate auto-opts the facility into the matching network", async () => {
  const src = await readSrc("../_shared/concierge-addon.ts");
  // Without this, match-concierge-intake's WHERE concierge_network_opted_in=true
  // filter excludes the facility — provider would pay $1,000/mo for nothing.
  assertStringIncludes(src, "concierge_network_opted_in: true");
  assertStringIncludes(src, "concierge_opted_in_at");
});

Deno.test("concierge-addon: default LoC seed includes the canonical 7 values", async () => {
  const src = await readSrc("../_shared/concierge-addon.ts");
  // Must match the levelOfCareMap used by match-concierge-intake or the
  // careType dimension of the matching score stays at 0.
  for (const loc of ["detox", "inpatient", "residential", "php", "iop", "outpatient", "sober_living"]) {
    assertStringIncludes(src, `"${loc}"`);
  }
});

Deno.test("concierge-addon: deactivate does NOT auto-revert concierge_network_opted_in", async () => {
  const src = await readSrc("../_shared/concierge-addon.ts");
  // Provider may want to stay opted-in unpaid (no partner badge, but still
  // appears in advisor matching). The deactivate function only touches the
  // partner-specific columns.
  const deactivate = src.slice(src.indexOf("deactivateConciergePartner"));
  assert(
    !deactivate.includes("concierge_network_opted_in"),
    "deactivateConciergePartner must not touch concierge_network_opted_in",
  );
});

// ─────────────────────────────────────────────────────────────────────────
// create-checkout-session edge function
// ─────────────────────────────────────────────────────────────────────────

Deno.test("create-checkout-session: Pro-required gate present", async () => {
  const src = await readSrc("../create-checkout-session/index.ts");
  assertStringIncludes(src, "PRO_REQUIRED");
  assertStringIncludes(src, '.tier !== "pro"');
});

Deno.test("create-checkout-session: writes metadata.type for webhook routing", async () => {
  const src = await readSrc("../create-checkout-session/index.ts");
  // The webhook keys off metadata.type === 'featured_addon' or 'concierge_addon'
  // to route to the right activation helper. Drift here silently breaks activation.
  assertStringIncludes(src, "`${product}_addon`");
});

Deno.test("create-checkout-session: 30-min single-flight session reuse", async () => {
  const src = await readSrc("../create-checkout-session/index.ts");
  assertStringIncludes(src, "thirtyMinAgo");
  assertStringIncludes(src, "stripe.checkout.sessions.list");
  assertStringIncludes(src, "reused: true");
});

Deno.test("create-checkout-session: passes Stripe idempotencyKey to sessions.create", async () => {
  const src = await readSrc("../create-checkout-session/index.ts");
  assertStringIncludes(src, "idempotencyKey");
  assertStringIncludes(src, "stripe.checkout.sessions.create");
});

Deno.test("create-checkout-session: rejects already-active add-on with 409 ALREADY_ACTIVE", async () => {
  const src = await readSrc("../create-checkout-session/index.ts");
  assertStringIncludes(src, "ALREADY_ACTIVE");
});

// ─────────────────────────────────────────────────────────────────────────
// stripe-webhook routing
// ─────────────────────────────────────────────────────────────────────────

Deno.test("stripe-webhook: customer.subscription.created routes featured_addon → activateFeaturedAddon", async () => {
  const src = await readSrc("../stripe-webhook/index.ts");
  assertStringIncludes(src, 'subMetadataType === "featured_addon"');
  assertStringIncludes(src, "activateFeaturedAddon(supabaseAdmin");
});

Deno.test("stripe-webhook: customer.subscription.created routes concierge_addon → activateConciergePartner", async () => {
  const src = await readSrc("../stripe-webhook/index.ts");
  assertStringIncludes(src, 'subMetadataType === "concierge_addon"');
  assertStringIncludes(src, "activateConciergePartner(supabaseAdmin");
});

Deno.test("stripe-webhook: customer.subscription.deleted symmetric add-on routing", async () => {
  const src = await readSrc("../stripe-webhook/index.ts");
  assertStringIncludes(src, 'delMetadataType === "featured_addon"');
  assertStringIncludes(src, 'delMetadataType === "concierge_addon"');
  assertStringIncludes(src, "deactivateFeaturedAddon(supabaseAdmin");
  assertStringIncludes(src, "deactivateConciergePartner(supabaseAdmin");
});

Deno.test("stripe-webhook: Pro path uses the shared activateProBenefits helper", async () => {
  const src = await readSrc("../stripe-webhook/index.ts");
  // The previous inline activation was the source of the double-+50 bug;
  // it must stay routed through the shared idempotent helper.
  assertStringIncludes(src, "activateProBenefits(supabaseAdmin");
});

// ─────────────────────────────────────────────────────────────────────────
// drain-addon-waitlist
// ─────────────────────────────────────────────────────────────────────────

Deno.test("drain-addon-waitlist: service-role gate via JWT role claim", async () => {
  const src = await readSrc("../drain-addon-waitlist/index.ts");
  // v1.0.1 switched from literal SRK comparison to JWT role-claim check
  // because Supabase migrated to sb_secret_* keys for new projects.
  assertStringIncludes(src, 'role !== "service_role"');
  assertStringIncludes(src, "Forbidden");
});

Deno.test("drain-addon-waitlist: claims row before sending to avoid double-invite", async () => {
  const src = await readSrc("../drain-addon-waitlist/index.ts");
  assertStringIncludes(src, '.eq("status", "waiting")');
  assertStringIncludes(src, 'status: "invited"');
});

Deno.test("drain-addon-waitlist: Resend Idempotency-Key keyed on waitlist id", async () => {
  const src = await readSrc("../drain-addon-waitlist/index.ts");
  assertStringIncludes(src, "addon-waitlist-invite:");
  assertStringIncludes(src, "Idempotency-Key");
});

Deno.test("drain-addon-waitlist: respects auto_invite_opt_out", async () => {
  const src = await readSrc("../drain-addon-waitlist/index.ts");
  assertStringIncludes(src, "auto_invite_opt_out");
  assertStringIncludes(src, '.eq("auto_invite_opt_out", false)');
});

Deno.test("drain-addon-waitlist: failed Resend send writes admin_notification", async () => {
  const src = await readSrc("../drain-addon-waitlist/index.ts");
  assertStringIncludes(src, "addon_waitlist_invite_email_failed");
});
