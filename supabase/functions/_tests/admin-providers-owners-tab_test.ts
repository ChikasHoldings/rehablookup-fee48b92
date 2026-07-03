// Regression tests for the Admin › Providers Owners/Facilities tab enhancement.
//   - admin_list_provider_owners RPC is admin-gated, SECURITY DEFINER, reads
//     canonical sources, derives plan state from subscriptions (not profiles.plan)
//   - AdminProviders is a tabbed page: Owners (default) + Facilities (preserved)
//   - facility rows link to the owner Admin Provider Profile
// Source-contract assertions (no live HTTP). RPC behaviour (admin sees rows,
// non-admin blocked, grace≠pro) is proven by rollback-safe probes in the report.

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

Deno.test("admin_list_provider_owners is admin-gated + definer + canonical sources", async () => {
  const sql = await read("supabase/migrations/20260829005300_admin_list_provider_owners.sql");
  inc(sql, "SECURITY DEFINER");
  assert(/IF NOT public\.user_is_admin\(\(SELECT auth\.uid\(\)\)\) THEN/.test(sql), "must gate on user_is_admin");
  inc(sql, "insufficient_privilege");
  // Plan state derived from facility_subscriptions, NOT profiles.plan.
  inc(sql, "facility_subscriptions");
  assert(!/p\.plan\b/.test(sql), "must NOT infer plan from profiles.plan");
  // grace derived from provider_plan_grants and is distinct from pro.
  inc(sql, "provider_plan_grants");
  assert(/WHEN COALESCE\(subs\.any_active_pro, ?false\) THEN 'pro'/.test(sql), "active pro maps to 'pro'");
  assert(/THEN 'grace'/.test(sql), "grace is a distinct plan_state");
  // execute revoked from anon.
  inc(sql, "REVOKE EXECUTE ON FUNCTION public.admin_list_provider_owners() FROM PUBLIC, anon");
});

Deno.test("AdminProviders is a tabbed Owners/Facilities page, Facilities preserved", async () => {
  const src = await read("src/pages/admin/AdminProviders.tsx");
  inc(src, "<OwnersTab />");
  assert(/<TabsTrigger value="owners"/.test(src), "has an Owners tab trigger");
  assert(/<TabsTrigger value="facilities"/.test(src), "has a Facilities tab trigger");
  assert(/=== "facilities" \? "facilities" : "owners"/.test(src), "Owners is the default view");
  // Facilities content preserved: the existing facility list + bulk dialogs still render.
  inc(src, "<ProviderStatsCharts");
  inc(src, "BulkProviderStatusDialog");
  inc(src, "<ProviderListItem");
});

Deno.test("facility rows link to the owner Admin Provider Profile", async () => {
  const src = await read("src/components/admin/providers/ProviderListItem.tsx");
  assert(/\/admin\/providers\/account\/\$\{provider\.user_id\}/.test(src), "facility row links to owner profile");
});

Deno.test("OwnersTab sources data from the RPC and reuses the profile page", async () => {
  const src = await read("src/components/admin/providers/OwnersTab.tsx");
  inc(src, 'supabase.rpc("admin_list_provider_owners")');
  assert(/\/admin\/providers\/account\/\$\{o\.user_id\}/.test(src), "owner card links to the shared profile page");
  // Uses the pure, tested filter/sort lib (no duplicated logic).
  inc(src, "filterAndSortOwners");
});
