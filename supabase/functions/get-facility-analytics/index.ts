// get-facility-analytics
// ──────────────────────
// Provider-facing analytics dashboard data source. Returns a single
// consolidated payload of subscription / Featured / Concierge metrics
// for one facility over a configurable time range.
//
// Auth: verify_jwt=true. Caller must own the facility (facilities.user_id
// = auth.uid()) OR hold an admin role in user_roles.
//
// Input  : { facility_id, range, custom_start?, custom_end? }
// Output : see Output type below — KPIs (current + prev period), daily
//          series, Featured per-placement breakdown, Concierge per-geo
//          breakdown, compliance signals, lead funnel, review summary,
//          renewal forecast.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  facility_id: z.string().uuid(),
  range: z.enum(["last_7d", "last_30d", "last_90d", "last_12m", "custom"]).default("last_30d"),
  custom_start: z.string().datetime().optional(),
  custom_end: z.string().datetime().optional(),
});

interface DateRange { start: Date; end: Date; }

function resolveRange(input: z.infer<typeof RequestSchema>): { range: DateRange; previous: DateRange } {
  const end = new Date();
  let start = new Date();
  switch (input.range) {
    case "last_7d":  start = new Date(end.getTime() - 7  * 86400_000); break;
    case "last_30d": start = new Date(end.getTime() - 30 * 86400_000); break;
    case "last_90d": start = new Date(end.getTime() - 90 * 86400_000); break;
    case "last_12m": start = new Date(end.getTime() - 365 * 86400_000); break;
    case "custom":
      if (!input.custom_start || !input.custom_end) {
        throw new Error("custom_start and custom_end required for custom range");
      }
      start = new Date(input.custom_start);
      end.setTime(new Date(input.custom_end).getTime());
      break;
  }
  const durationMs = end.getTime() - start.getTime();
  const previous = { start: new Date(start.getTime() - durationMs), end: new Date(start.getTime() - 1) };
  return { range: { start, end }, previous };
}

function pctDelta(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 1000) / 10;
}

function hoursBetween(later: string | null, earlier: string | null): number | null {
  if (!later || !earlier) return null;
  const a = new Date(later).getTime();
  const b = new Date(earlier).getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return Math.max(0, (a - b) / 3_600_000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Ownership / admin gate
  const facilityId = parsed.data.facility_id;
  const { data: facility } = await admin
    .from("facilities")
    .select("id, user_id, name")
    .eq("id", facilityId)
    .maybeSingle();
  if (!facility) {
    return new Response(JSON.stringify({ error: "Facility not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const isOwner = facility.user_id === user.id;
  let isAdmin = false;
  if (!isOwner) {
    const { data: roles } = await admin
      .from("user_roles").select("role").eq("user_id", user.id);
    isAdmin = (roles ?? []).some((r: { role: string }) =>
      ["admin", "super_admin"].includes(r.role),
    );
  }
  if (!isOwner && !isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let dates: ReturnType<typeof resolveRange>;
  try { dates = resolveRange(parsed.data); }
  catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { range, previous } = dates;
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();
  const prevStartIso = previous.start.toISOString();
  const prevEndIso = previous.end.toISOString();

  // ── Subscription + tier capabilities ─────────────────────────────────
  const { data: sub } = await admin
    .from("facility_subscriptions")
    .select("id, status, tier, billing_period, current_period_end, paid_amount_cents, has_featured, has_concierge_partner, created_at")
    .eq("facility_id", facilityId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasFeatured = !!sub?.has_featured;
  const hasConcierge = !!sub?.has_concierge_partner;
  const isPro = !!sub && sub.tier === "pro";

  // ── Parallel data queries ────────────────────────────────────────────
  const [
    viewsCurR, viewsPrevR,
    featImpCurR, featImpPrevR,
    clicksCurR, clicksPrevR,
    leadsCurR, leadsPrevR,
    convInqCurR, convInqPrevR,
    convIntrosR,
    placementsR,
    featByPlacementR,
    clicksByPlacementR,
    auditR,
    reviewsR,
  ] = await Promise.all([
    // Profile views: provider_events.profile_view is the live source (written by
    // useProviderEventTracking). facility_views has NO live writer (track-view is
    // orphaned), so the prior read was structurally always zero. Exclude bot/
    // internal traffic to match the facility_metrics_daily rollup + other tabs.
    admin.from("provider_events").select("id", { count: "exact", head: true })
      .eq("facility_id", facilityId).eq("event_type", "profile_view")
      .eq("is_bot", false).eq("is_internal", false)
      .gte("created_at", startIso).lte("created_at", endIso),
    admin.from("provider_events").select("id", { count: "exact", head: true })
      .eq("facility_id", facilityId).eq("event_type", "profile_view")
      .eq("is_bot", false).eq("is_internal", false)
      .gte("created_at", prevStartIso).lte("created_at", prevEndIso),

    hasFeatured
      ? admin.from("featured_impressions").select("id", { count: "exact", head: true })
          .eq("facility_id", facilityId).gte("occurred_at", startIso).lte("occurred_at", endIso)
      : Promise.resolve({ count: 0 } as { count: number | null }),
    hasFeatured
      ? admin.from("featured_impressions").select("id", { count: "exact", head: true })
          .eq("facility_id", facilityId).gte("occurred_at", prevStartIso).lte("occurred_at", prevEndIso)
      : Promise.resolve({ count: 0 } as { count: number | null }),

    // Phone clicks: provider_events.click_to_call captures ALL tel clicks.
    // featured_phone_clicks only captures clicks on Featured rotation cards, so
    // non-Featured providers saw a structural zero here. Use the live source +
    // bot/internal filter to match the rollup. (The Featured-specific phone-click
    // breakdown below still reads featured_phone_clicks, which is correct.)
    admin.from("provider_events").select("id", { count: "exact", head: true })
      .eq("facility_id", facilityId).eq("event_type", "click_to_call")
      .eq("is_bot", false).eq("is_internal", false)
      .gte("created_at", startIso).lte("created_at", endIso),
    admin.from("provider_events").select("id", { count: "exact", head: true })
      .eq("facility_id", facilityId).eq("event_type", "click_to_call")
      .eq("is_bot", false).eq("is_internal", false)
      .gte("created_at", prevStartIso).lte("created_at", prevEndIso),

    // Pro = direct leads; Free = inquiries routed through concierge from this
    // facility's pages (originating_facility_id).
    isPro
      ? admin.from("leads").select("id, created_at, provider_responded_at, provider_response_status")
          .eq("facility_id", facilityId).gte("created_at", startIso).lte("created_at", endIso)
      : Promise.resolve({ data: [] as Array<{ id: string; created_at: string; provider_responded_at: string | null; provider_response_status: string | null }> }),
    isPro
      ? admin.from("leads").select("id", { count: "exact", head: true })
          .eq("facility_id", facilityId).gte("created_at", prevStartIso).lte("created_at", prevEndIso)
      : Promise.resolve({ count: 0 } as { count: number | null }),

    // Free-tier facilities count concierge_inquiries originated from them.
    !isPro
      ? admin.from("concierge_inquiries").select("id", { count: "exact", head: true })
          .eq("originating_facility_id", facilityId).gte("created_at", startIso).lte("created_at", endIso)
      : Promise.resolve({ count: 0 } as { count: number | null }),
    !isPro
      ? admin.from("concierge_inquiries").select("id", { count: "exact", head: true })
          .eq("originating_facility_id", facilityId).gte("created_at", prevStartIso).lte("created_at", prevEndIso)
      : Promise.resolve({ count: 0 } as { count: number | null }),

    // Concierge introductions sent to this facility (Concierge Partner only)
    hasConcierge
      ? admin.from("concierge_introductions")
          .select("id, sent_at, provider_responded_at, provider_response")
          .eq("facility_id", facilityId).gte("sent_at", startIso).lte("sent_at", endIso)
      : Promise.resolve({ data: [] as Array<{ id: string; sent_at: string; provider_responded_at: string | null; provider_response: string | null }> }),

    // Featured: active placements + per-placement counts
    hasFeatured
      ? admin.from("featured_placements")
          .select("id, placement_type, placement_value, active")
          .eq("facility_id", facilityId).eq("active", true)
      : Promise.resolve({ data: [] as Array<{ id: string; placement_type: string; placement_value: string; active: boolean }> }),
    hasFeatured
      ? admin.from("featured_impressions")
          .select("placement_type, placement_value")
          .eq("facility_id", facilityId).gte("occurred_at", startIso).lte("occurred_at", endIso)
      : Promise.resolve({ data: [] as Array<{ placement_type: string; placement_value: string }> }),
    hasFeatured
      ? admin.from("featured_phone_clicks")
          .select("placement_type, placement_value")
          .eq("facility_id", facilityId).gte("clicked_at", startIso).lte("clicked_at", endIso)
      : Promise.resolve({ data: [] as Array<{ placement_type: string; placement_value: string }> }),

    // Concierge compliance: audit rows where this facility was introduced
    hasConcierge
      ? admin.from("concierge_introduction_audit")
          .select("introduced_facility_ids, rejected_non_partner_candidates, advisor_confirmed_non_partner_consideration, sent_at")
          .contains("introduced_facility_ids", [facilityId])
          .gte("sent_at", startIso).lte("sent_at", endIso)
      : Promise.resolve({ data: [] as Array<{ introduced_facility_ids: string[]; rejected_non_partner_candidates: unknown; advisor_confirmed_non_partner_consideration: boolean; sent_at: string }> }),

    admin.from("facility_reviews")
      .select("id, rating, status, created_at")
      .eq("facility_id", facilityId).gte("created_at", startIso).lte("created_at", endIso),
  ]);

  // ── Summary KPIs ─────────────────────────────────────────────────────
  const viewsCur = viewsCurR.count ?? 0;
  const viewsPrev = viewsPrevR.count ?? 0;
  const clicksCur = clicksCurR.count ?? 0;
  const clicksPrev = clicksPrevR.count ?? 0;

  const leadsCurList = isPro ? (leadsCurR.data ?? []) : [];
  const leadsCurCount = isPro ? leadsCurList.length : 0;
  const leadsPrevCount = isPro ? (leadsPrevR.count ?? 0) : 0;
  const convInqCur = !isPro ? (convInqCurR.count ?? 0) : 0;
  const convInqPrev = !isPro ? (convInqPrevR.count ?? 0) : 0;
  const inquiriesCur = isPro ? leadsCurCount : convInqCur;
  const inquiriesPrev = isPro ? leadsPrevCount : convInqPrev;

  // Avg response time: for Pro, time from leads.created_at →
  // provider_responded_at on the responded subset.
  const respondedHours: number[] = [];
  for (const l of leadsCurList) {
    const h = hoursBetween(l.provider_responded_at, l.created_at);
    if (h !== null) respondedHours.push(h);
  }
  const concIntrosCurList = hasConcierge ? (convIntrosR.data ?? []) : [];
  for (const intro of concIntrosCurList) {
    const h = hoursBetween(intro.provider_responded_at, intro.sent_at);
    if (h !== null) respondedHours.push(h);
  }
  const avgRespCur = respondedHours.length === 0
    ? 0
    : Math.round((respondedHours.reduce((a, b) => a + b, 0) / respondedHours.length) * 10) / 10;
  // Previous-period response time is harder to compute cheaply; defer for now
  // and report only current avg + null delta.

  // ── Featured per-placement breakdown ─────────────────────────────────
  let featuredBreakdown: Array<{
    placement_type: string; placement_value: string;
    impressions: number; phone_clicks: number; ctr_pct: number; is_active: boolean;
  }> | null = null;
  if (hasFeatured) {
    const placementImpressions = new Map<string, number>();
    const placementClicks = new Map<string, number>();
    const key = (t: string, v: string) => `${t}::${v}`;
    for (const r of featByPlacementR.data ?? []) {
      const k = key(r.placement_type, r.placement_value);
      placementImpressions.set(k, (placementImpressions.get(k) ?? 0) + 1);
    }
    for (const r of clicksByPlacementR.data ?? []) {
      const k = key(r.placement_type, r.placement_value);
      placementClicks.set(k, (placementClicks.get(k) ?? 0) + 1);
    }
    const seen = new Set<string>();
    featuredBreakdown = [];
    for (const p of placementsR.data ?? []) {
      const k = key(p.placement_type, p.placement_value);
      seen.add(k);
      const impressions = placementImpressions.get(k) ?? 0;
      const phone_clicks = placementClicks.get(k) ?? 0;
      featuredBreakdown.push({
        placement_type: p.placement_type,
        placement_value: p.placement_value,
        impressions,
        phone_clicks,
        ctr_pct: impressions > 0 ? Math.round((phone_clicks / impressions) * 10000) / 100 : 0,
        is_active: !!p.active,
      });
    }
    // Any extra (placement_type, placement_value) pairs from impressions that
    // aren't in the active list (e.g. recently expired): show them too with
    // is_active=false so historical CTR isn't hidden.
    for (const k of placementImpressions.keys()) {
      if (seen.has(k)) continue;
      const [pt, pv] = k.split("::");
      const impressions = placementImpressions.get(k) ?? 0;
      const phone_clicks = placementClicks.get(k) ?? 0;
      featuredBreakdown.push({
        placement_type: pt, placement_value: pv,
        impressions, phone_clicks,
        ctr_pct: impressions > 0 ? Math.round((phone_clicks / impressions) * 10000) / 100 : 0,
        is_active: false,
      });
    }
  }

  // ── Concierge breakdown + compliance ─────────────────────────────────
  let conciergeBreakdown: Array<{
    inquiries_presented: number;
    response_avg_hours: number;
    chosen: number;
  }> | null = null;
  let conciergeCompliance: { non_partner_alternatives_presented_pct: number; response_under_24h_pct: number } | null = null;
  if (hasConcierge) {
    const intros = concIntrosCurList;
    const chosen = intros.filter((i) => i.provider_response === "chosen").length;
    const respondedTimes = intros
      .map((i) => hoursBetween(i.provider_responded_at, i.sent_at))
      .filter((h): h is number => h !== null);
    const responseAvg = respondedTimes.length === 0
      ? 0
      : Math.round((respondedTimes.reduce((a, b) => a + b, 0) / respondedTimes.length) * 10) / 10;
    // Per-geo breakdown would require concierge_partner_facilities join with
    // the inquiry's geo — deferred to follow-up. For v1 we surface a single
    // network-wide row.
    conciergeBreakdown = [{
      inquiries_presented: intros.length,
      response_avg_hours: responseAvg,
      chosen,
    }];

    // Compliance: % of audit rows where ≥1 non-partner alternative was
    // surfaced (advisor_confirmed_non_partner_consideration=true). Per
    // EKRA audit contract, this should be 100%.
    const audits = auditR.data ?? [];
    const withAlternatives = audits.filter((a) => a.advisor_confirmed_non_partner_consideration).length;
    const total = audits.length;
    const respondedUnder24 = respondedTimes.filter((h) => h <= 24).length;
    conciergeCompliance = {
      non_partner_alternatives_presented_pct:
        total === 0 ? 100 : Math.round((withAlternatives / total) * 1000) / 10,
      response_under_24h_pct:
        respondedTimes.length === 0 ? 0 : Math.round((respondedUnder24 / respondedTimes.length) * 1000) / 10,
    };
  }

  // ── Reviews ──────────────────────────────────────────────────────────
  const reviewsList = reviewsR.data ?? [];
  const reviewsBlock = reviewsList.length === 0
    ? null
    : {
        received: reviewsList.length,
        avg_rating: Math.round(
          (reviewsList.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviewsList.length) * 10,
        ) / 10,
        responded: reviewsList.filter((r) => r.status === "responded").length,
        pending: reviewsList.filter((r) => r.status !== "responded").length,
      };

  // ── Lead funnel ──────────────────────────────────────────────────────
  const respondedCount = isPro
    ? leadsCurList.filter((l) => !!l.provider_responded_at).length
    : concIntrosCurList.filter((i) => !!i.provider_responded_at).length;
  const convertedCount = isPro
    ? leadsCurList.filter((l) => l.provider_response_status === "converted").length
    : concIntrosCurList.filter((i) => i.provider_response === "chosen").length;

  const funnel = {
    profile_views: viewsCur,
    phone_clicks: clicksCur,
    inquiries_submitted: inquiriesCur,
    inquiries_responded: respondedCount,
    inquiries_converted: convertedCount,
  };

  // ── Renewal forecast (paying subscribers only) ───────────────────────
  let renewalForecast: {
    period_end: string;
    estimated_charge_cents: number;
    cost_per_phone_click_cents: number;
    cost_per_inquiry_cents: number;
  } | null = null;
  if (sub && sub.paid_amount_cents != null && sub.current_period_end) {
    const paid = sub.paid_amount_cents;
    renewalForecast = {
      period_end: sub.current_period_end,
      estimated_charge_cents: paid,
      cost_per_phone_click_cents: clicksCur > 0 ? Math.round(paid / clicksCur) : 0,
      cost_per_inquiry_cents: inquiriesCur > 0 ? Math.round(paid / inquiriesCur) : 0,
    };
  }

  return new Response(
    JSON.stringify({
      ok: true,
      facility: { id: facility.id, name: facility.name },
      subscription: sub ? {
        tier: sub.tier, billing_period: sub.billing_period,
        has_featured: hasFeatured, has_concierge_partner: hasConcierge,
        is_pro: isPro,
      } : null,
      range: { start: startIso, end: endIso },
      previous_range: { start: prevStartIso, end: prevEndIso },
      summary: {
        profile_views: { current: viewsCur, prev: viewsPrev, delta_pct: pctDelta(viewsCur, viewsPrev) },
        phone_clicks: { current: clicksCur, prev: clicksPrev, delta_pct: pctDelta(clicksCur, clicksPrev) },
        inquiries: { current: inquiriesCur, prev: inquiriesPrev, delta_pct: pctDelta(inquiriesCur, inquiriesPrev) },
        avg_response_time_hours: { current: avgRespCur, prev: null, delta_hrs: null },
      },
      featured_breakdown: featuredBreakdown,
      featured_impressions_total: hasFeatured ? (featImpCurR.count ?? 0) : 0,
      featured_impressions_prev: hasFeatured ? (featImpPrevR.count ?? 0) : 0,
      funnel,
      concierge_breakdown: conciergeBreakdown,
      concierge_compliance: conciergeCompliance,
      reviews: reviewsBlock,
      renewal_forecast: renewalForecast,
      generated_at: new Date().toISOString(),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
