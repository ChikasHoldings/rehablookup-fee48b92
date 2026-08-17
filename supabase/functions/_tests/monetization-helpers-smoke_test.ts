// Monetization helpers + add-on Checkout smoke test.
//
// Source-contract assertions (à la provider-onboarding-smoke_test.ts) —
// not live HTTP calls. We don't have a Stripe sandbox in this CI, so
// the runnable tier asserts each module follows the documented
// contract: helper signatures, idempotency guards, admin-alert calls,
// metadata routing tokens.
//
// What this guards against:
//   - Someone re-introducing the retired Pro side effects in
//     activateProBenefits (facilities.featured, the +50 ranking boost).
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

// Stage-3 entitlement amendment (B2.3): Pro buys PRODUCT FEATURES, not trust,
// organic rank, or Featured placement. These two tests previously asserted the
// mechanics of the +50 ranking boost — the double-apply guard and the clamp at
// zero. Both are retired along with the boost itself, so they now assert the
// absence of the mutation rather than the correctness of its arithmetic.
Deno.test("pro-benefits: activation writes no ranking or Featured state", async () => {
  const src = await readSrc("../_shared/pro-benefits.ts");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  assert(!/calculated_ranking_score/.test(code), "Pro must not buy organic ranking");
  assert(!/\bfeatured\s*:/.test(code), "Pro must not set facilities.featured");
  assert(!/\bverified\s*:/.test(code), "Pro must not set facilities.verified");
  assert(!/RANKING_BOOST/.test(code), "the ranking boost constant must be gone");
});

Deno.test("pro-benefits: activation and deactivation still mirror profiles.plan", async () => {
  // The plan mirror is the legitimate remaining effect — it drives the storage
  // photo-cap trigger. Removing it would make Pro activation an actual no-op.
  const src = await readSrc("../_shared/pro-benefits.ts");
  assertStringIncludes(src, 'plan: "pro"');
  assertStringIncludes(src, 'plan: "free"');
  assertStringIncludes(src, 'from("profiles")');
});

Deno.test("pro-benefits: notifier writes admin_notifications.type='pro_benefits_partial_failure'", async () => {
  const src = await readSrc("../_shared/pro-benefits.ts");
  assertStringIncludes(src, "pro_benefits_partial_failure");
  assertStringIncludes(src, 'from("admin_notifications")');
});

// ─────────────────────────────────────────────────────────────────────────
// Featured add-on helpers
// ─────────────────────────────────────────────────────────────────────────

Deno.test("featured-addon: activate seeds state + city placements (local/regional only)", async () => {
  const src = await readSrc("../_shared/featured-addon.ts");
  // Product change: Featured is LOCAL/REGIONAL only — the homepage/national
  // rotation is reserved (see the comment in featured-addon.ts). Activation
  // must NOT seed a national placement anymore.
  assertStringIncludes(src, "NO homepage/national seed");
  assert(
    !src.includes('type: "homepage", value: "national"'),
    "featured activation must not seed a homepage/national placement",
  );
  // State + city seeds are slugified to match the slug-keyed State/City
  // pages (an UPPER(name) seed never matched them — see the comment in
  // buildSeedPlacements).
  assertStringIncludes(src, "slugify(facility.state)");
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
  // Anchor on the function DEFINITION — the module header comment mentions
  // the symbol earlier, and slicing from there swallowed unrelated
  // activation code that legitimately references the column.
  const deactivate = src.slice(src.indexOf("export async function deactivateConciergePartner"));
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
  // The gate was refactored to a positive activePro check: add-ons 409 with
  // PRO_REQUIRED unless tier === "pro" AND status === "active".
  assert(
    /activePro\s*=[\s\S]{0,200}?tier === "pro"[\s\S]{0,120}?status === "active"/.test(src),
    "add-on checkout must compute activePro from tier + status",
  );
  assert(
    /if \(!activePro\)[\s\S]{0,300}?PRO_REQUIRED/.test(src),
    "add-on checkout must 409 PRO_REQUIRED when not activePro",
  );
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
// send-verification-code + verify-code (signup OTP pipeline)
// ─────────────────────────────────────────────────────────────────────────

Deno.test("send-verification-code: defaults purpose='signup' which the CHECK constraint allows", async () => {
  const src = await readSrc("../send-verification-code/index.ts");
  // The bug was: deployed v2.0.0 defaults purpose='signup' but the CHECK
  // constraint only allowed ('general','claim_verification'). Migration
  // 20260612000000 expanded the constraint. Both pieces must coexist.
  assertStringIncludes(src, '"signup"');
  assertStringIncludes(src, "purpose");
});

Deno.test("send-verification-code: per-(email, purpose) rate-limit + invalidate-then-insert", async () => {
  const src = await readSrc("../send-verification-code/index.ts");
  assertStringIncludes(src, "MAX_PER_10MIN");
  // Previous codes for the SAME purpose are invalidated before the new INSERT.
  assertStringIncludes(src, '.eq("purpose", purpose)');
  assertStringIncludes(src, "Invalidate previous unused codes");
});

Deno.test("verify-code: signup success marks auth.users.email_confirmed_at", async () => {
  const src = await readSrc("../verify-code/index.ts");
  assertStringIncludes(src, "markAuthUserConfirmed");
  assertStringIncludes(src, "email_confirm: true");
  assertStringIncludes(src, "auth.admin.updateUserById");
});

Deno.test("verify-code: legacy-purpose fallback for clients that don't pass purpose", async () => {
  const src = await readSrc("../verify-code/index.ts");
  // Legacy ClaimWizard's confirm-claim-verification-code, older mobile
  // clients, etc. send no purpose — fallback lookup ignores the purpose
  // filter rather than 400-ing.
  assertStringIncludes(src, "legacy");
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
