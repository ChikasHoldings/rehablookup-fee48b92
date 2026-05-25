/**
 * Typed accessor for the `leads_provider_view` Postgres view.
 *
 * Why this exists:
 *   The Supabase TypeScript generator only emits typed `.from()`
 *   overloads for base tables, not views (as of @supabase/postgrest-js
 *   1.x). `supabase.from("leads_provider_view")` therefore raises a
 *   compile error, which the codebase historically silenced with
 *   `(supabase as any).from(...)`. That cast wipes type safety on the
 *   entire query chain — select/eq/order/etc. all return `any`,
 *   masking real bugs (typos in column names, wrong filter shapes).
 *
 *   This helper narrows the escape hatch to a single function, returns
 *   a chainable PostgrestQueryBuilder whose row type is the Lead
 *   Lead interface from ./leads/types, and keeps the select/eq/order
 *   chain type-safe via PostgrestFilterBuilder's row-typed methods.
 *
 * Usage:
 *   const { data, error } = await fromLeadsProviderView()
 *     .select("id, name, status, created_at")
 *     .eq("facility_id", facilityId)
 *     .order("created_at", { ascending: false });
 */
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/components/provider/leads/types";

// The Supabase client strictly types `.from()` against the generated
// Database type. The view isn't in that type, so we cast the client to
// a relaxed shape that accepts the view name. The PostgrestQueryBuilder
// it returns is generic, so we hand it `Lead` as the row type and the
// rest of the chain stays type-safe.
//
const supabaseRelaxed = supabase as unknown as { from: (relation: string) => unknown };

export function fromLeadsProviderView() {
  return supabaseRelaxed.from("leads_provider_view") as ReturnType<
    typeof supabase.from<"facility_reviews", Lead>
  >;
}
