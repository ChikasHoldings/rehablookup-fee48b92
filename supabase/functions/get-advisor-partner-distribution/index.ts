// get-advisor-partner-distribution
// ────────────────────────────────
// Admin-only aggregation endpoint. Returns one row per concierge advisor
// summarising their introduction-selection behaviour over a configurable
// time window. Used by the /admin/concierge/metrics dashboard to surface
// advisors whose partner-vs-non-partner ratio drifts toward an EKRA-
// flaggable pattern BEFORE the auto-flag rule trips on a per-decision
// basis.
//
// Each row contains:
//   - advisor_id, advisor_display_name
//   - decisions_total                  (# of audit rows in window)
//   - introductions_total              (sum of introduced_facility_ids)
//   - partner_introductions_total
//   - non_partner_introductions_total
//   - partner_ratio                    (0..1, computed; null if no intros)
//   - flagged_decisions                (# of rows with flagged_for_admin_review)
//   - last_decision_at                 (most recent sent_at)
//
// The response is sorted by partner_ratio DESC so the highest-risk
// advisors surface first. Caller must hold admin or super_admin role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  window_days: z.number().int().min(1).max(365).default(90),
});

interface AuditRow {
  advisor_id: string;
  introduced_facility_ids: string[] | null;
  partner_facility_ids: string[] | null;
  flagged_for_admin_review: boolean | null;
  sent_at: string | null;
}

interface AdvisorAggregate {
  advisor_id: string;
  advisor_display_name: string | null;
  decisions_total: number;
  introductions_total: number;
  partner_introductions_total: number;
  non_partner_introductions_total: number;
  partner_ratio: number | null;
  flagged_decisions: number;
  last_decision_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin = (roleRows ?? []).some((r: { role: string }) =>
    ["admin", "super_admin"].includes(r.role),
  );
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Admin role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Body is optional — accept empty POST as the default window.
  let body: unknown = {};
  if (req.headers.get("content-length") && req.headers.get("content-length") !== "0") {
    try { body = await req.json(); }
    catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const windowDays = parsed.data.window_days;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  // Pull every audit row in the window. The table is append-only at decision
  // rate (~tens per advisor per week), so paginated full-scan is fine and
  // keeps the function self-contained without a DB-side RPC.
  const pageSize = 1000;
  const rows: AuditRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("concierge_introduction_audit")
      .select("advisor_id, introduced_facility_ids, partner_facility_ids, flagged_for_admin_review, sent_at")
      .gte("sent_at", since)
      .order("sent_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("[get-advisor-partner-distribution] audit fetch failed", error);
      return new Response(JSON.stringify({ error: "Failed to load audit data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const page = (data ?? []) as AuditRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  // Aggregate per advisor.
  const byAdvisor = new Map<string, AdvisorAggregate>();
  for (const r of rows) {
    if (!r.advisor_id) continue;
    let agg = byAdvisor.get(r.advisor_id);
    if (!agg) {
      agg = {
        advisor_id: r.advisor_id,
        advisor_display_name: null,
        decisions_total: 0,
        introductions_total: 0,
        partner_introductions_total: 0,
        non_partner_introductions_total: 0,
        partner_ratio: null,
        flagged_decisions: 0,
        last_decision_at: null,
      };
      byAdvisor.set(r.advisor_id, agg);
    }
    agg.decisions_total += 1;
    const intros = r.introduced_facility_ids?.length ?? 0;
    const partners = r.partner_facility_ids?.length ?? 0;
    agg.introductions_total += intros;
    agg.partner_introductions_total += partners;
    agg.non_partner_introductions_total += Math.max(0, intros - partners);
    if (r.flagged_for_admin_review) agg.flagged_decisions += 1;
    if (r.sent_at && (!agg.last_decision_at || r.sent_at > agg.last_decision_at)) {
      agg.last_decision_at = r.sent_at;
    }
  }
  for (const agg of byAdvisor.values()) {
    agg.partner_ratio = agg.introductions_total > 0
      ? agg.partner_introductions_total / agg.introductions_total
      : null;
  }

  // Resolve display names from admin_user_profiles.
  const advisorIds = Array.from(byAdvisor.keys());
  if (advisorIds.length > 0) {
    const { data: profiles } = await admin
      .from("admin_user_profiles")
      .select("user_id, display_name, first_name, last_name")
      .in("user_id", advisorIds);
    for (const p of (profiles ?? []) as Array<{
      user_id: string;
      display_name: string | null;
      first_name: string | null;
      last_name: string | null;
    }>) {
      const agg = byAdvisor.get(p.user_id);
      if (!agg) continue;
      const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ");
      agg.advisor_display_name = p.display_name ?? (fullName || null);
    }
  }

  const advisors = Array.from(byAdvisor.values()).sort((a, b) => {
    // Highest partner ratio first; null ratios at the end.
    const ar = a.partner_ratio ?? -1;
    const br = b.partner_ratio ?? -1;
    if (br !== ar) return br - ar;
    return b.introductions_total - a.introductions_total;
  });

  // Network-wide rollup for context.
  const totals = advisors.reduce(
    (acc, a) => ({
      decisions_total: acc.decisions_total + a.decisions_total,
      introductions_total: acc.introductions_total + a.introductions_total,
      partner_introductions_total:
        acc.partner_introductions_total + a.partner_introductions_total,
      non_partner_introductions_total:
        acc.non_partner_introductions_total + a.non_partner_introductions_total,
      flagged_decisions: acc.flagged_decisions + a.flagged_decisions,
    }),
    {
      decisions_total: 0,
      introductions_total: 0,
      partner_introductions_total: 0,
      non_partner_introductions_total: 0,
      flagged_decisions: 0,
    },
  );
  const networkPartnerRatio =
    totals.introductions_total > 0
      ? totals.partner_introductions_total / totals.introductions_total
      : null;

  return new Response(
    JSON.stringify({
      ok: true,
      window_days: windowDays,
      window_start: since,
      generated_at: new Date().toISOString(),
      network: { ...totals, partner_ratio: networkPartnerRatio },
      advisors,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
