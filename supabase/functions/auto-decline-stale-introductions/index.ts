// ============================================================================
// auto-decline-stale-introductions
// ----------------------------------------------------------------------------
// Hourly cron: finds concierge_introductions older than 72h that have no
// provider response yet and marks them auto-declined. The existing
// trg_introduction_decline_release trigger then removes the facility from
// concierge_inquiries.matched_facility_ids and raises an admin notification
// if every match has now declined.
//
// Deadline anchor: max(created_at, admin_disclosed_pii_at) — mirrors
// IntroductionCard so a provider always gets a real 72h window from the
// moment PII was disclosed (if disclosure happened after the intro row
// was created).
//
// Auth: cron-only. Invoked by scheduled.call_edge_function (pg_cron), which
// passes the X-Cron-Secret header — validated by assertCronSecret (fail-closed,
// matching every other scheduled cron). verify_jwt=false because pg_cron has no
// user session.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { assertCronSecret } from "../_shared/cron-auth.ts";

const VERSION = "1.0.0";
const WINDOW_HOURS = 72;
const BATCH_LIMIT = 200;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (level: "INFO" | "WARN" | "ERROR", msg: string, details?: unknown) => {
  const d = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[AUTO-DECLINE-STALE] [${VERSION}] [${level}] ${msg}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const __cronAuth = assertCronSecret(req);
  if (!__cronAuth.ok) return __cronAuth.response;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!SUPABASE_URL || !SUPABASE_SRK) {
    return new Response(JSON.stringify({ error: "Missing env", _version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const svc = createClient(SUPABASE_URL, SUPABASE_SRK);
  const cutoffMs = Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffMs).toISOString();

  try {
    // Pull stale candidates. Treat any unanswered row whose effective deadline
    // (max(created_at, admin_disclosed_pii_at)) is in the past as auto-decline
    // material. We filter both anchors in SQL where possible and verify in JS
    // for the max() semantics.
    const { data: candidates, error: qErr } = await svc
      .from("concierge_introductions")
      .select("id, facility_id, inquiry_id, created_at, admin_disclosed_pii_at, provider_response")
      .or(`provider_response.is.null,provider_response.eq.pending`)
      .lte("created_at", cutoffIso)
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (qErr) {
      log("ERROR", "candidate fetch failed", { error: qErr.message });
      return new Response(JSON.stringify({ error: "Failed to fetch candidates", _version: VERSION }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!candidates || candidates.length === 0) {
      log("INFO", "no stale candidates");
      return new Response(JSON.stringify({ success: true, declined: 0, _version: VERSION }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to rows whose effective deadline has actually passed.
    const stale = candidates.filter((row) => {
      const created = row.created_at ? new Date(row.created_at).getTime() : 0;
      const disclosed = row.admin_disclosed_pii_at
        ? new Date(row.admin_disclosed_pii_at).getTime()
        : 0;
      const effectiveStart = Math.max(created, disclosed);
      if (!effectiveStart) return false;
      return effectiveStart <= cutoffMs;
    });

    if (stale.length === 0) {
      log("INFO", "all candidates still within window (PII disclosed late)");
      return new Response(JSON.stringify({ success: true, declined: 0, _version: VERSION }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("INFO", `${stale.length} stale introductions; auto-declining`);

    let declined = 0;
    let failed = 0;
    const now = new Date().toISOString();

    // Update one row at a time so the trg_introduction_decline_release
    // trigger fires per-row (it counts declines vs total introductions to
    // raise the "all matches declined" admin notification accurately).
    for (const row of stale) {
      const { error: updErr } = await svc
        .from("concierge_introductions")
        .update({
          provider_response: "not_available",
          provider_responded_at: now,
          provider_notes:
            "Auto-declined: provider did not respond within the 72-hour response window.",
        })
        .eq("id", row.id)
        // Re-check the unanswered condition so concurrent provider clicks win.
        .or(`provider_response.is.null,provider_response.eq.pending`);
      if (updErr) {
        failed++;
        log("WARN", "update failed", { id: row.id, error: updErr.message });
      } else {
        declined++;
        try {
          await svc.from("concierge_case_events").insert({
            inquiry_id: row.inquiry_id,
            event_type: "provider_auto_declined",
            event_data: {
              facility_id: row.facility_id,
              introduction_id: row.id,
              reason: "response_window_expired",
              window_hours: WINDOW_HOURS,
            },
            actor_type: "system",
          });
        } catch (eventErr) {
          log("WARN", "case-event insert failed (non-fatal)", { error: String(eventErr) });
        }
      }
    }

    log("INFO", "sweep complete", { declined, failed, totalConsidered: stale.length });
    return new Response(
      JSON.stringify({ success: true, declined, failed, totalConsidered: stale.length, _version: VERSION }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    log("ERROR", "unhandled", { error: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ error: "Internal error", _version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
