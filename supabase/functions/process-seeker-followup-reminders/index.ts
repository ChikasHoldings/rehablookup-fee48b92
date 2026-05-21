// process-seeker-followup-reminders v1.0.0
//
// Daily cron — finds leads that are 3+ days old and still have NO
// provider response, and nudges the seeker via send-seeker-emails
// type=request_followup. Honors notification_preferences.
// followup_reminders_enabled (already wired in send-seeker-emails).
//
// Idempotency: send-seeker-emails keys by leadId for any invoke that
// includes leadId, so each lead can ever produce only ONE followup
// email regardless of how many cron ticks see it (the email_tracking_
// events table dedups on `seeker-request_followup-${leadId}`).
//
// Window: 72h ≤ age < 30d. A wide upper bound lets a missed cron
// catch up on the next run without dropping eligible leads; the per-
// lead idempotency ensures no duplicates regardless.
//
// Self-contained (only depends on send-seeker-emails for the actual
// send) so single-file deploy works.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOG = "[SEEKER-FOLLOWUP]";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Service-role-only gate — only the cron wrapper should hit this.
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  let role: string | null = null;
  try {
    const payload = token.split(".")[1];
    if (payload) {
      const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      role = decoded.role ?? null;
    }
  } catch { /* role stays null */ }
  if (role !== "service_role") {
    return new Response(JSON.stringify({ error: "Forbidden", _version: VERSION }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SRK) {
    return new Response(JSON.stringify({ error: "Server not configured", _version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SRK, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Optional payload — dryRun and onlyLeadId for testing.
  let payload: { dryRun?: boolean; onlyLeadId?: string } = {};
  try {
    payload = (await req.json()) as typeof payload;
  } catch { /* empty body OK */ }

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("leads")
    .select("id, email, created_at, provider_responded_at, facility_id")
    .is("provider_responded_at", null)
    .lt("created_at", threeDaysAgo)
    .gt("created_at", thirtyDaysAgo)
    .limit(500);
  if (payload.onlyLeadId) query = query.eq("id", payload.onlyLeadId);

  const { data: leads, error: leadsErr } = await query;
  if (leadsErr) {
    console.error(`${LOG} leads query failed`, leadsErr);
    return new Response(JSON.stringify({ error: leadsErr.message, _version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let scanned = 0;
  let sent = 0;
  let alreadySent = 0;
  let failed = 0;
  const failures: Array<{ leadId: string; reason: string }> = [];

  for (const lead of leads ?? []) {
    scanned++;
    const l = lead as {
      id: string;
      email: string | null;
      created_at: string;
      facility_id: string | null;
    };
    if (!l.email) continue;

    const daysSince = Math.floor((now.getTime() - new Date(l.created_at).getTime()) / (24 * 60 * 60 * 1000));

    // Check whether we've already sent the followup for this lead.
    // send-seeker-emails uses idempotencyKey `seeker-request_followup-${leadId}`
    // — we check the same key against email_tracking_events to avoid the
    // invoke round-trip when we know it'll dedupe anyway. The function
    // would also dedupe internally; this is a pre-flight optimization.
    const { data: existing } = await supabase
      .from("email_tracking_events")
      .select("id")
      .eq("email_id", `seeker-request_followup-${l.id}`)
      .eq("event_type", "sent")
      .limit(1)
      .maybeSingle();
    if (existing) {
      alreadySent++;
      continue;
    }

    if (payload.dryRun) {
      sent++;
      console.log(`${LOG} [dryRun] would send followup for lead ${l.id} (${daysSince}d old)`);
      continue;
    }

    try {
      const { error } = await supabase.functions.invoke("send-seeker-emails", {
        body: {
          type: "request_followup",
          leadId: l.id,
          metadata: { daysSince },
        },
      });
      if (error) {
        failed++;
        failures.push({ leadId: l.id, reason: String(error.message ?? error) });
        continue;
      }
      sent++;
    } catch (e) {
      failed++;
      failures.push({ leadId: l.id, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  console.log(`${LOG} scanned=${scanned} sent=${sent} alreadySent=${alreadySent} failed=${failed}`);

  return new Response(
    JSON.stringify({
      scanned,
      sent,
      alreadySent,
      failed,
      failures: failures.slice(0, 5),
      dryRun: !!payload.dryRun,
      _version: VERSION,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
