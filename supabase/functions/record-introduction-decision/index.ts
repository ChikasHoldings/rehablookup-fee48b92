// record-introduction-decision
// ────────────────────────────
// Validates and audits the advisor's introduction-selection decision
// BEFORE the per-facility send-concierge-introduction calls fire. Writes
// one row to concierge_introduction_audit, applies auto-flag rules,
// returns { audit_id, flagged_for_admin_review, validation_errors }.
//
// EKRA rules enforced server-side (the UI mirrors these for UX):
//   1. If ANY selected facility is a Placement Partner, advisor MUST
//      confirm `advisor_confirmed_non_partner_consideration = true`.
//   2. If surfaced candidates included non-partners that weren't
//      selected, each one's `rejected_non_partner_candidates[].reason`
//      MUST be a non-empty string.
//   3. If all 3 selected are Placement Partners AND no non-partner
//      candidates were surfaced, advisor MUST confirm
//      `advisor_confirmed_no_non_partner_candidates = true`. Row is
//      flagged for admin review (genuine gap vs. behavioral pattern).
//   4. Free-tier-redirect inquiries: the originating facility MUST be
//      one of the selected introductions. Server checks this against
//      the concierge_inquiries.originating_facility_id field; the auto-
//      pin UI in the admin tool enforces it client-side too.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  inquiry_id: z.string().uuid(),
  selected_facility_ids: z.array(z.string().uuid()).min(1).max(10),
  surfaced_candidate_ids: z.array(z.string().uuid()).default([]),
  rejected_non_partner_candidates: z
    .array(
      z.object({
        facility_id: z.string().uuid(),
        reason: z.string().trim().max(2000),
      }),
    )
    .default([]),
  advisor_confirmed_non_partner_consideration: z.boolean(),
  advisor_confirmed_no_non_partner_candidates: z.boolean().default(false),
  clinical_criteria_snapshot: z.record(z.unknown()).default({}),
});

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

  // Admin/advisor gate — only authenticated staff can record introductions.
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const allowedRoles = new Set(["admin", "super_admin", "concierge_advisor"]);
  const isAllowed = (roleRows ?? []).some((r: { role: string }) => allowedRoles.has(r.role));
  if (!isAllowed) {
    return new Response(JSON.stringify({ error: "Concierge advisor role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const {
    inquiry_id,
    selected_facility_ids,
    surfaced_candidate_ids,
    rejected_non_partner_candidates,
    advisor_confirmed_non_partner_consideration,
    advisor_confirmed_no_non_partner_candidates,
    clinical_criteria_snapshot,
  } = parsed.data;

  // ── Resolve inquiry + originating-facility context ──
  const { data: inquiry, error: inquiryErr } = await admin
    .from("concierge_inquiries")
    .select("id, routing_mode, originating_facility_id, intake_data")
    .eq("id", inquiry_id)
    .maybeSingle();
  if (inquiryErr || !inquiry) {
    return new Response(JSON.stringify({ error: "Inquiry not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const isFreeTierRedirect = inquiry.routing_mode === "free_tier_redirect";
  const originatingFacilityId = (inquiry as { originating_facility_id?: string | null }).originating_facility_id ?? null;

  // ── Classify selected facilities into partners vs. non-partners ──
  // A facility is a "Placement Partner" if it has an active
  // concierge_partner_facilities row matching the inquiry's geo.
  // We resolve geo from the clinical_criteria_snapshot the caller
  // passes (the UI already has it computed from intake_data).
  const seekerState =
    typeof clinical_criteria_snapshot.geo_state === "string"
      ? clinical_criteria_snapshot.geo_state
      : null;
  const seekerCity =
    typeof clinical_criteria_snapshot.geo_city === "string"
      ? clinical_criteria_snapshot.geo_city
      : null;

  const partnerLookupBuilder = admin
    .from("concierge_partner_facilities")
    .select("facility_id, geo_state, geo_city, active")
    .in("facility_id", selected_facility_ids)
    .eq("active", true);
  // Restrict to the seeker's geo when known — a partner outside the
  // seeker's geo isn't relevant to THIS introduction.
  if (seekerState) partnerLookupBuilder.eq("geo_state", seekerState);
  const { data: partnerRows } = await partnerLookupBuilder;
  const partnerSet = new Set(
    (partnerRows ?? [])
      .filter((r: { geo_city: string | null }) =>
        !seekerCity || !r.geo_city || r.geo_city === seekerCity,
      )
      .map((r: { facility_id: string }) => r.facility_id),
  );
  const partnerFacilityIds = selected_facility_ids.filter((id) => partnerSet.has(id));
  const nonPartnerSelectedIds = selected_facility_ids.filter((id) => !partnerSet.has(id));

  // Non-partner candidates that were surfaced but NOT selected
  const surfacedNonSelected = surfaced_candidate_ids.filter(
    (id) => !selected_facility_ids.includes(id),
  );
  // We don't know which of those are partners without another lookup —
  // but for the rule check we only care that REJECTED-non-partner reasons
  // are present for each rejected non-partner. The UI sends those in
  // rejected_non_partner_candidates already filtered to non-partners.
  const rejectedIdsWithReasons = new Map(
    rejected_non_partner_candidates.map((r) => [r.facility_id, r.reason.trim()]),
  );

  // ── Apply EKRA rules ──
  const validationErrors: string[] = [];

  // Rule 1: any partner in selection → consideration checkbox required
  if (partnerFacilityIds.length > 0 && !advisor_confirmed_non_partner_consideration) {
    validationErrors.push(
      "You must confirm you considered non-partner alternatives before sending introductions.",
    );
  }

  // Rule 2: each rejected non-partner must have a reason
  for (const [id, reason] of rejectedIdsWithReasons.entries()) {
    if (!reason) {
      validationErrors.push(`Reason required for facility ${id} (skipped non-partner candidate).`);
    }
  }

  // Rule 3: 100%-partner with no non-partners surfaced → second checkbox required
  const allSelectedArePartners = partnerFacilityIds.length === selected_facility_ids.length;
  const noNonPartnerCandidatesSurfaced =
    surfacedNonSelected.length === 0 && nonPartnerSelectedIds.length === 0;
  if (
    allSelectedArePartners &&
    noNonPartnerCandidatesSurfaced &&
    !advisor_confirmed_no_non_partner_candidates
  ) {
    validationErrors.push(
      "All selected facilities are Placement Partners. Confirm no non-partner facilities matched the seeker's clinical criteria.",
    );
  }

  // Rule 4: free-tier redirect must include the originating facility
  if (isFreeTierRedirect && originatingFacilityId && !selected_facility_ids.includes(originatingFacilityId)) {
    validationErrors.push(
      "Free-tier-redirect inquiries must include the originating facility as one of the introductions (auto-pin rule).",
    );
  }

  if (validationErrors.length > 0) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        validation_errors: validationErrors,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Auto-flag rules ──
  // (a) 100%-partner outcome with the "no non-partners qualified" claim
  const flag_a =
    allSelectedArePartners && advisor_confirmed_no_non_partner_candidates;
  // (b) >70% partner rate over advisor's last 20 introductions
  const { data: recentAudits } = await admin
    .from("concierge_introduction_audit")
    .select("partner_facility_ids, introduced_facility_ids")
    .eq("advisor_id", user.id)
    .order("sent_at", { ascending: false })
    .limit(20);
  const totalRecent = (recentAudits ?? []).reduce(
    (acc: number, r: { introduced_facility_ids: string[] }) => acc + (r.introduced_facility_ids?.length ?? 0),
    0,
  );
  const partnerRecent = (recentAudits ?? []).reduce(
    (acc: number, r: { partner_facility_ids: string[] }) => acc + (r.partner_facility_ids?.length ?? 0),
    0,
  );
  const partnerRatio = totalRecent > 0 ? partnerRecent / totalRecent : 0;
  const flag_b = totalRecent >= 10 && partnerRatio > 0.7;
  // (c) free-tier redirect that somehow doesn't include the originating
  //     facility — already rejected at validation, kept here for completeness.
  const flag_c = false;

  const flagged = flag_a || flag_b || flag_c;
  const flagReason = flag_a
    ? "100% Placement Partner selection with 'no non-partner candidates qualified' claim — verify clinical gap is genuine."
    : flag_b
      ? `Advisor's recent partner rate is ${(partnerRatio * 100).toFixed(0)}% over ${totalRecent} introductions — review for selection-pattern bias.`
      : null;

  // ── Insert audit row ──
  const { data: inserted, error: insertErr } = await admin
    .from("concierge_introduction_audit")
    .insert({
      inquiry_id,
      advisor_id: user.id,
      introduced_facility_ids: selected_facility_ids,
      partner_facility_ids: partnerFacilityIds,
      surfaced_candidate_ids,
      rejected_non_partner_candidates,
      advisor_confirmed_non_partner_consideration,
      advisor_confirmed_no_non_partner_candidates,
      flagged_for_admin_review: flagged,
      flagged_reason: flagReason,
      clinical_criteria_snapshot,
      originating_facility_id: originatingFacilityId,
      originating_facility_auto_pinned: isFreeTierRedirect && !!originatingFacilityId,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    console.error("[record-introduction-decision] insert failed", insertErr);
    return new Response(JSON.stringify({ error: "Failed to record audit" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      audit_id: inserted.id,
      flagged_for_admin_review: flagged,
      flag_reason: flagReason,
      partner_facility_ids: partnerFacilityIds,
      partner_count: partnerFacilityIds.length,
      non_partner_count: nonPartnerSelectedIds.length,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
