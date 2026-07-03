// Regression tests for the 2026-07-03 provider hardening pass:
//   - suspended facility must not lock the full portal
//   - scoped 30-day facility-cap grace (grant, greatest-of cap, no Pro leak)
//   - expired grace suspends over-cap but keeps Billing reachable
//   - owned facilities are not claimable (third-party claim blocked)
//   - public claimed pages hide the claim CTA
//   - admin provider-account profile page exists
//
// Source-contract assertions (no live HTTP), style of
// plan-entitlement-leak-regressions_test.ts.

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}
function assertStringIncludes(actual: string, expected: string): void {
  if (!actual.includes(expected)) throw new Error(`Expected source to include: ${expected}`);
}

const REPO_ROOT = new URL("../../../", import.meta.url);
async function read(rel: string): Promise<string> {
  return await Deno.readTextFile(new URL(rel, REPO_ROOT));
}

// ─── 1. Portal lockout ───────────────────────────────────────────────────────

Deno.test("shell: suspended facility no longer returns a whole-portal AccessDenied", async () => {
  const src = await read("src/components/provider/ProviderShell.tsx");
  // The old lock was: if (facility?.suspended === true) { return <AccessDenied title="Account suspended" ...
  assert(
    !/facility\?\.suspended === true\)\s*\{\s*return\s*\(\s*<AccessDenied/.test(src),
    "suspended facility must not hard-return AccessDenied (portal lockout)",
  );
  // Instead it flags a per-facility banner state.
  assertStringIncludes(src, "selectedFacilitySuspended");
  assertStringIncludes(src, "is currently paused");
});

Deno.test("shell: facility fallback is deterministic (non-suspended, oldest first)", async () => {
  const src = await read("src/hooks/useProviderData.ts");
  assert(
    /\.order\("suspended", \{ ascending: true[\s\S]{0,120}?\.order\("created_at", \{ ascending: true/.test(src),
    "provider facility fallback must order suspended asc then created_at asc",
  );
});

// ─── 2. Grace mechanism ──────────────────────────────────────────────────────

Deno.test("grace: provider_plan_grants table is admin-only + provider-read-own", async () => {
  const sql = await read("supabase/migrations/20260829004200_provider_plan_grants.sql");
  assertStringIncludes(sql, "CREATE TABLE IF NOT EXISTS public.provider_plan_grants");
  assertStringIncludes(sql, "CHECK (kind IN ('facility_cap_grace'))");
  // Admin manages, provider reads only their own; NO client insert/update/delete policy.
  assertStringIncludes(sql, "plan_grants_admin_all");
  assert(
    /plan_grants_own_select[\s\S]{0,200}FOR SELECT[\s\S]{0,120}provider_id = \(SELECT auth\.uid\(\)\)/.test(sql),
    "providers may only SELECT their own grants",
  );
  assert(
    !/FOR (INSERT|UPDATE|DELETE) TO authenticated[\s\S]{0,200}provider_id = \(SELECT auth\.uid/.test(sql),
    "no self-service write policy for grants",
  );
});

Deno.test("grace: cap is GREATEST(plan cap, active unexpired grant) and grants nothing else", async () => {
  const sql = await read("supabase/migrations/20260829004200_provider_plan_grants.sql");
  assert(
    /max_allowed := GREATEST\(CASE WHEN is_pro THEN 5 ELSE 1 END, grant_cap\)/.test(sql),
    "cap must be greatest-of plan and grant",
  );
  // The grant query must require unexpired + unrevoked.
  assert(
    /kind = 'facility_cap_grace'[\s\S]{0,120}revoked_at IS NULL[\s\S]{0,120}expires_at > now\(\)/.test(sql),
    "grant must be unrevoked and unexpired to count",
  );
  // No has_active_pro / verified / featured writes in this migration — grace is
  // capacity only.
  assert(!sql.includes("activateProBenefits"), "grace must not activate Pro benefits");
});

Deno.test("grace: audit trail on every grant change", async () => {
  const sql = await read("supabase/migrations/20260829004200_provider_plan_grants.sql");
  assertStringIncludes(sql, "log_plan_grant_change");
  assertStringIncludes(sql, "AFTER INSERT OR UPDATE OR DELETE ON public.provider_plan_grants");
  assertStringIncludes(sql, "'plan_grant_created'");
});

Deno.test("grace: get_my_plan_grace + get_my_facility_allowance RPCs exist and are self-scoped", async () => {
  const sql = await read("supabase/migrations/20260829004200_provider_plan_grants.sql");
  for (const fn of ["get_my_plan_grace", "get_my_facility_allowance"]) {
    assert(sql.includes(`FUNCTION public.${fn}`), `${fn} must be defined`);
  }
  // Both key off auth.uid() — no arbitrary-provider read.
  assert(
    (sql.match(/provider_id = \(SELECT auth\.uid\(\)\)/g) ?? []).length >= 2 ||
      sql.includes("v_user uuid := (SELECT auth.uid())"),
    "allowance RPCs must be self-scoped",
  );
});

// ─── 3. Expiry enforcement ───────────────────────────────────────────────────

Deno.test("expiry: cron suspends over-cap listings but keeps the oldest live", async () => {
  const src = await read("supabase/functions/enforce-plan-grace-cron/index.ts");
  // Keeps FREE_CAP oldest, suspends the rest.
  assertStringIncludes(src, "const FREE_CAP = 1");
  assert(
    /order\("created_at", \{ ascending: true \}\)[\s\S]{0,400}?\.slice\(FREE_CAP\)/.test(src),
    "must keep oldest FREE_CAP listings and suspend the rest",
  );
  // Skips enforcement when the provider upgraded to Pro.
  assertStringIncludes(src, "providerHasActivePro");
  // T-7 / T-1 reminders.
  assertStringIncludes(src, "plan_grace_expiring_");
});

Deno.test("expiry: Billing stays reachable after suspension (portal not locked)", async () => {
  // This is the cross-check for gap G0 — enforcement suspends facilities, and
  // the shell fix (test above) guarantees a provider with only suspended
  // facilities can still reach Billing to upgrade. Assert both invariants hold.
  const shell = await read("src/components/provider/ProviderShell.tsx");
  assert(
    !/facility\?\.suspended === true\)\s*\{\s*return\s*\(\s*<AccessDenied/.test(shell),
    "portal must not lock on suspension so expired-grace providers can upgrade",
  );
});

// ─── 4. Claim source of truth ────────────────────────────────────────────────

Deno.test("claim: owned facilities (user_id set) are non-claimable", async () => {
  const fn = await read("supabase/functions/submit-facility-claim/index.ts");
  assert(
    /if \(facility\.user_id\) return json\(409[\s\S]{0,120}FACILITY_ALREADY_CLAIMED/.test(fn),
    "guard must reject on user_id alone, not user_id && claimed_at",
  );
  assert(
    !fn.includes("facility.claimed_at && facility.user_id"),
    "old both-fields guard must be gone",
  );
});

Deno.test("claim: public_facilities.is_claimed keys off user_id alone", async () => {
  const sql = await read("supabase/migrations/20260829004300_owned_facilities_not_claimable.sql");
  assertStringIncludes(sql, "user_id IS NOT NULL AS is_claimed");
  assert(
    !sql.includes("user_id IS NOT NULL AND claimed_at IS NOT NULL AS is_claimed"),
    "is_claimed must no longer require claimed_at",
  );
});

Deno.test("claim: CenterProfile shows managed state for owners, not a claim CTA", async () => {
  const src = await read("src/pages/CenterProfile.tsx");
  assertStringIncludes(src, "viewerOwnsFacility");
  assertStringIncludes(src, "Manage this listing");
  // The claim CTA still gates on !is_claimed — which is now user_id-driven —
  // so owned facilities (is_claimed true) never render it.
  assertStringIncludes(src, "claimFlags && !claimFlags.is_claimed");
});

// ─── 5. Workflow gaps ────────────────────────────────────────────────────────

Deno.test("gap G2: embedded add-listing pre-checks the cap and maps rejection to upgrade", async () => {
  const src = await read("src/pages/ProviderSignup.tsx");
  assertStringIncludes(src, "get_my_facility_allowance");
  // Cap rejection is mapped to an upgrade prompt, NOT the signup-failed rollback.
  assert(
    /Facility limit reached[\s\S]{0,400}?navigate\("\/provider\/billing\?upgrade=pro"\)/.test(src),
    "cap rejection must route to upgrade, not the orphan-rollback path",
  );
});

Deno.test("gap G3: dashboard surfaces pending/rejected claims + sidebar has Claims", async () => {
  const dash = await read("src/pages/provider/Dashboard.tsx");
  assertStringIncludes(dash, "dashboard-open-claims");
  assertStringIncludes(dash, "/provider/claims");
  const sidebar = await read("src/components/provider/ProviderSidebar.tsx");
  assert(
    /href: "\/provider\/claims", label: "Claims"/.test(sidebar),
    "sidebar must have a Claims entry",
  );
});

Deno.test("gap G4: dashboard status labels suspended as Paused, not Live", async () => {
  const src = await read("src/pages/provider/Dashboard.tsx");
  assert(
    /f\.suspended === true\)\s*\{\s*return\s*\{\s*label: "Paused"/.test(src),
    "suspended facilities must render Paused",
  );
  assert(
    /liveCount = facilities\?\.filter\(\(f\) => f\.status === "approved" && f\.suspended !== true\)/.test(src),
    "liveCount must exclude suspended",
  );
});

Deno.test("gap G6: signup photo cap reads facility_subscriptions, not profiles.plan", async () => {
  const src = await read("src/pages/ProviderSignup.tsx");
  // The plan-detection effect that feeds the photo cap must query
  // facility_subscriptions, not profiles.plan.
  assert(
    /from\("facility_subscriptions"\)[\s\S]{0,600}setProviderPlan/.test(src),
    "photo-cap plan detection must use facility_subscriptions",
  );
  // And the effect must not fall back to reading profiles.plan for the cap.
  assert(
    !/from\("profiles"\)\s*\.select\("plan"\)/.test(src),
    "photo-cap effect must not read profiles.plan",
  );
});

// ─── 6. Admin provider profile page ──────────────────────────────────────────

Deno.test("admin: provider-account profile page + route exist", async () => {
  const page = await read("src/pages/admin/AdminProviderProfile.tsx");
  // Keyed on the account, not a facility.
  assertStringIncludes(page, "useParams<{ userId: string }>");
  for (const src of ["provider_plan_grants", "plan_change_audit", "facility_subscriptions", "provider_onboarding_state", "get-provider-subscription"]) {
    assert(page.includes(src), `admin profile must surface ${src}`);
  }
  // Grant/revoke controls.
  assertStringIncludes(page, "Grant facility-cap grace");
  assertStringIncludes(page, "handleRevoke");
  const app = await read("src/App.tsx");
  assertStringIncludes(app, 'path="providers/account/:userId"');
});
