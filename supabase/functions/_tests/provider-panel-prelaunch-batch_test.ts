// Regression tests for the 2026-07-03 pre-go-live provider panel hardening batch.
//   1. public_facilities hides facilities with an active pending/under_review claim
//   2. accepts_international_patients gate fires on INSERT (not just UPDATE)
//   3. create-checkout-session blocks a 2nd checkout for pending/incomplete Pro;
//      Billing hides ProUpgradeChoices for incomplete
//   4. suspended copy says "contact support", never "upgrade to reactivate"
//   5. ProviderHeader + ProviderSidebar plan badge is facility-scoped
//   6. admin facility rejection persists reason + notifies provider; dashboard
//      uses the shared getListingStatusMeta
//   7. admin-cancel-subscription writes admin_audit_log
//   8. staff-photos / seeker-avatars buckets constrained to image MIME + size
//
// Source-contract assertions (no live HTTP). Live DB behaviour for items 1 & 2
// is additionally proven by rollback-safe SQL probes recorded in the report.

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}
function inc(actual: string, expected: string): void {
  if (!actual.includes(expected)) throw new Error(`Expected source to include: ${expected}`);
}
const REPO_ROOT = new URL("../../../", import.meta.url);
async function read(rel: string): Promise<string> {
  return await Deno.readTextFile(new URL(rel, REPO_ROOT));
}

// ── 1. pending-claim public filter ───────────────────────────────────────────
Deno.test("public_facilities excludes pending/under_review claims", async () => {
  const sql = await read("supabase/migrations/20260829004900_public_facilities_hide_pending_claims.sql");
  assert(
    /NOT EXISTS\s*\(\s*SELECT 1\s*FROM public\.facility_claim_requests fcr\s*WHERE fcr\.facility_id = f\.id\s*AND fcr\.status IN \('pending', 'under_review'\)/.test(sql),
    "view must exclude facilities with an active pending/under_review claim",
  );
  // is_claimed stays user_id-based (owned facilities remain non-claimable).
  inc(sql, "user_id IS NOT NULL AS is_claimed");
  // Documented decision: stays DEFINER so the claim subquery bypasses RLS.
  // (Assert on the DDL form, not the word — the header comment explains why
  // security_invoker was rejected.)
  assert(!/WITH\s*\(\s*security_invoker/i.test(sql), "must NOT be created WITH (security_invoker) — would neuter the claim subquery under anon RLS");
});

// ── 2. international flag INSERT gate ─────────────────────────────────────────
Deno.test("international-partner trigger fires on INSERT OR UPDATE", async () => {
  const sql = await read("supabase/migrations/20260829005000_international_partner_gate_on_insert.sql");
  assert(
    /BEFORE INSERT OR UPDATE OF accepts_international_patients/.test(sql),
    "trigger must fire on INSERT OR UPDATE (was UPDATE-only)",
  );
});

Deno.test("create flows never offer the international checkbox", async () => {
  const add = await read("src/pages/provider/AddLocation.tsx");
  const signup = await read("src/pages/ProviderSignup.tsx");
  assert(!/checked=\{draft\.accepts_international_patients\}/.test(add), "AddLocation must not render the intl checkbox");
  assert(!/insertPayload\.accepts_international_patients = true/.test(add), "AddLocation must not send intl=true");
  assert(!/id="acceptsInternationalPatients"/.test(signup), "ProviderSignup must not render the intl checkbox");
});

// ── 3. duplicate-checkout guard ──────────────────────────────────────────────
Deno.test("create-checkout-session blocks pending/incomplete Pro from a 2nd checkout", async () => {
  const src = await read("supabase/functions/create-checkout-session/index.ts");
  assert(
    /PENDING_OR_ACTIVE_PRO_STATUSES[\s\S]{0,120}"active",[\s\S]{0,60}"trialing",[\s\S]{0,60}"past_due",[\s\S]{0,60}"incomplete"/.test(src),
    "guard set must include active/trialing/past_due/incomplete",
  );
  assert(/if \(pendingOrActivePro\)/.test(src), "initial_subscription must guard on pendingOrActivePro");
});

Deno.test("Billing hides upgrade cards for incomplete subscriptions", async () => {
  const src = await read("src/pages/provider/Billing.tsx");
  assert(/isIncomplete && subscription \?/.test(src), "incomplete branch must render before the upgrade branch");
  inc(src, "IncompletePendingCard");
  // Upgrade cards only in the final else (not reachable for incomplete).
  assert(
    src.indexOf("IncompletePendingCard") < src.lastIndexOf("<ProUpgradeChoices"),
    "ProUpgradeChoices stays in the free/else branch",
  );
});

// ── 4. suspended copy ────────────────────────────────────────────────────────
Deno.test("suspended copy says contact support, never upgrade-to-reactivate", async () => {
  const src = await read("src/components/provider/ProviderHeader.tsx");
  assert(!/upgrade to reactivate/i.test(src), "must not tell providers to upgrade to reactivate a suspended listing");
  inc(src, "contact support to reactivate");
});

// ── 5. facility-scoped plan chrome ───────────────────────────────────────────
Deno.test("header + sidebar plan badge is facility-scoped", async () => {
  const header = await read("src/components/provider/ProviderHeader.tsx");
  const sidebar = await read("src/components/provider/ProviderSidebar.tsx");
  assert(/useProStatus\(selectedFacility\?\.id \?\? facilityId\)/.test(header), "header must scope useProStatus to the selected facility");
  assert(!/useFacilityLimits\(\)/.test(header), "header must not use the account-wide useFacilityLimits for the plan badge");
  assert(/useProStatus\(selectedFacility\?\.id\)/.test(sidebar), "sidebar must scope useProStatus to the selected facility");
});

// ── 6. rejection reason + notify + labels ────────────────────────────────────
Deno.test("admin facility rejection persists reason + notifies provider", async () => {
  const fn = await read("supabase/functions/admin-bulk-update-provider-status/index.ts");
  inc(fn, "REASON_STATUSES");
  inc(fn, "update.rejection_reason = REASON_STATUSES.has(newStatus)");
  inc(fn, "provider_notifications");
  assert(/type: isRejected \? "facility_rejected" : "facility_needs_edits"/.test(fn), "must notify with a rejection/needs-edits type");
});

Deno.test("facilities.rejection_reason column exists", async () => {
  const sql = await read("supabase/migrations/20260829005100_facility_rejection_reason.sql");
  inc(sql, "ADD COLUMN IF NOT EXISTS rejection_reason text");
});

Deno.test("dashboard status labels come from getListingStatusMeta (no 'Not Listed' mask)", async () => {
  const src = await read("src/pages/provider/Dashboard.tsx");
  inc(src, "getListingStatusMeta");
  assert(!/label: "Not Listed"/.test(src), "the misleading 'Not Listed' fallback must be gone");
});

// ── 7. admin cancellation audit trail ────────────────────────────────────────
Deno.test("admin-cancel-subscription writes admin_audit_log on success", async () => {
  const fn = await read("supabase/functions/admin-cancel-subscription/index.ts");
  assert(/action_type: "admin_subscription_cancellation"/.test(fn), "must log an admin_subscription_cancellation action");
  inc(fn, "total_refund_cents: result.totalRefundCents");
  inc(fn, "stripe_refund_ids: result.stripeRefundIds");
  // Must run only after a successful cancel (inside the success try, before the 200).
  assert(
    fn.indexOf("admin_subscription_cancellation") > fn.indexOf("await cancelSubscriptionAndRefund"),
    "audit insert must come after the cancellation succeeds",
  );
});

// ── 8. bucket image limits ───────────────────────────────────────────────────
Deno.test("staff-photos + seeker-avatars buckets constrained to image MIME + size", async () => {
  const sql = await read("supabase/migrations/20260829005200_storage_bucket_image_limits.sql");
  inc(sql, "facility-staff-photos");
  inc(sql, "seeker-avatars");
  assert(/allowed_mime_types = ARRAY\['image\/jpeg','image\/png','image\/webp'\]/.test(sql), "must restrict to image MIME types");
  assert(/file_size_limit = \d+/.test(sql), "must set a file size ceiling");
});
