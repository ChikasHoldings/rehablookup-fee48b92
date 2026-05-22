// send-seeker-weekly-digest v1.0.0
//
// Cron-fired (Sundays 13:30 UTC = 08:30 ET, 30 min offset from
// send-provider-weekly-digest to spread the send load) summary email
// of the last 7 days of activity for each seeker who opted in.
//
// Seeker opt-in: notification_preferences.email_weekly_digest = true
// Hard suppression:
//   - seeker_profiles.deletion_scheduled_at IS NOT NULL (account pending purge)
//   - No email on auth.users (impossible in normal signup but defensive)
//
// Body summary (per seeker, last 7d):
//   • Requests sent (leads.email matches the seeker, created in the window)
//   • Responses received (provider_responded_at NOT NULL on their leads,
//     scoped to the window)
//   • Saved facilities (total, not 7d — encourages action on stale saves)
//   • New facilities approved this week in the seeker's state
//
// Empty-state suppression: if requests + responses + saves are ALL zero,
// we skip the send entirely. No point shipping a "0 0 0" digest to an
// inactive user; the next week's digest will catch them if they engage.
//
// Idempotency: Resend Idempotency-Key=`seeker-weekly-digest-${user_id}-${iso_week}`
// so re-running the cron during the same ISO week never double-sends.
//
// Self-contained (no shared template deps) so single-file deploy works.
// Service-role gate via JWT role claim (format-agnostic across legacy +
// sb_secret_*).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { assertCronSecret } from "../_shared/cron-auth.ts";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";

const VERSION = "1.0.0";
const PRIMARY = "#1B365D";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function isoWeekKey(d: Date): string {
  // ISO 8601 week — same week, same key, regardless of timezone offset.
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

interface DigestStats {
  requestsSent: number;
  responsesReceived: number;
  savedFacilities: number;
  newFacilitiesInState: number;
  state: string | null;
}

function renderDigest(opts: {
  firstName: string;
  stats: DigestStats;
  weekLabel: string;
  unsubscribeUrl: string;
}): { subject: string; html: string } {
  const s = opts.stats;
  const safeName = esc(opts.firstName);
  const hasActivity = s.requestsSent > 0 || s.responsesReceived > 0;
  const summary = s.responsesReceived > 0
    ? `${s.responsesReceived} facility ${s.responsesReceived === 1 ? "response" : "responses"} this week. Here's your full update.`
    : s.requestsSent > 0
      ? `You sent ${s.requestsSent} ${s.requestsSent === 1 ? "request" : "requests"} this week. Here's where things stand.`
      : `Still researching? Here's a snapshot of your saved facilities and what's new in your area.`;

  const subject = s.responsesReceived > 0
    ? `${s.responsesReceived} ${s.responsesReceived === 1 ? "facility has" : "facilities have"} responded to your search`
    : s.requestsSent > 0
      ? `Your weekly treatment search update — ${s.requestsSent} request${s.requestsSent === 1 ? "" : "s"} sent`
      : `Your weekly treatment search update`;

  // Stat block — colour the response number green if > 0 (positive signal).
  const responseColor = s.responsesReceived > 0 ? "#0f766e" : PRIMARY;
  const stateLine = s.state
    ? `<tr><td style="padding:14px 16px;">
<p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">New facilities in ${esc(s.state)}</p>
<p style="margin:4px 0 0;font-size:24px;font-weight:700;color:${PRIMARY};">${s.newFacilitiesInState}</p>
</td></tr>`
    : "";

  // Nudges — friendly, actionable copy gated on the relevant counter.
  const noActivityNudge = !hasActivity
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border-left:4px solid #ca8a04;border-radius:6px;margin:0 0 18px;"><tr><td style="padding:12px 16px;"><p style="margin:0;font-size:13px;color:#713f12;line-height:1.55;"><strong>Finding the right facility can take time.</strong> Try sending a request to 2-3 centres on your shortlist — most respond within 24-48 hours. Or, let our Treatment Placement team handle the matching for you.</p></td></tr></table>`
    : "";

  const savesNudge = s.savedFacilities > 0 && s.requestsSent === 0
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-left:4px solid ${PRIMARY};border-radius:6px;margin:0 0 18px;"><tr><td style="padding:12px 16px;"><p style="margin:0;font-size:13px;color:#1B365D;line-height:1.55;"><strong>You have ${s.savedFacilities} saved ${s.savedFacilities === 1 ? "facility" : "facilities"}.</strong> Ready to take the next step? Send a request to one of them this week.</p></td></tr></table>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,${PRIMARY} 0%,#0f766e 100%);padding:28px;text-align:center;">
<p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.85);letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">REHABLOOKUP — WEEKLY DIGEST</p>
<h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${esc(opts.weekLabel)}</h1>
</td></tr>
<tr><td style="padding:28px;">
<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1f2937;">Hi ${safeName},</p>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151;">${summary}</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border:1px solid #e5e7eb;border-radius:8px;">
<tr><td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;">
<p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Requests sent</p>
<p style="margin:4px 0 0;font-size:24px;font-weight:700;color:${PRIMARY};">${s.requestsSent}</p>
</td></tr>
<tr><td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;">
<p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Responses received</p>
<p style="margin:4px 0 0;font-size:24px;font-weight:700;color:${responseColor};">${s.responsesReceived}</p>
</td></tr>
<tr><td style="padding:14px 16px;${stateLine ? "border-bottom:1px solid #f1f5f9;" : ""}">
<p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Saved facilities</p>
<p style="margin:4px 0 0;font-size:24px;font-weight:700;color:${PRIMARY};">${s.savedFacilities}</p>
</td></tr>
${stateLine}
</table>

${savesNudge}
${noActivityNudge}

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;"><tr><td style="background:${PRIMARY};border-radius:8px;">
<a href="https://rehablookup.com/account/requests" style="display:inline-block;padding:13px 28px;font-size:14px;color:#ffffff;text-decoration:none;font-weight:600;">${s.responsesReceived > 0 ? "View facility responses" : "Continue your search"}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #f3f4f6;text-align:center;">
<p style="margin:0 0 4px;font-size:11px;color:#9ca3af;line-height:1.5;">Weekly summaries help you stay on top of your treatment search. Manage frequency in <a href="https://rehablookup.com/account/notification-preferences" style="color:#9ca3af;text-decoration:underline;">notification preferences</a>.</p>
<p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;"><a href="${opts.unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe from weekly summaries</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const __cronAuth = assertCronSecret(req);
  if (!__cronAuth.ok) return __cronAuth.response;

  // Service-role-only gate (format-agnostic JWT role claim). Same pattern
  // as send-provider-weekly-digest so the scheduled.call_edge_function
  // wrapper (which signs with the service_role key) is the only legitimate
  // caller in production.
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  let role: string | null = null;
  try {
    const payload = token.split(".")[1];
    if (payload) {
      const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      role = decoded.role ?? null;
    }
  } catch {
    // fall through — role stays null
  }
  if (role !== "service_role") {
    return new Response(JSON.stringify({ error: "Forbidden", _version: VERSION }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!SUPABASE_URL || !SRK || !RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured", _version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const svc = createClient(SUPABASE_URL, SRK, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const resend = new Resend(RESEND_API_KEY);

  // Parse optional payload (dry-run mode, single-user mode for testing).
  let payload: { dryRun?: boolean; onlyUserId?: string } = {};
  try {
    payload = (await req.json()) as typeof payload;
  } catch { /* empty body OK */ }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoIso = weekAgo.toISOString();
  const weekLabel = `Week of ${weekAgo.toISOString().slice(0, 10)}`;
  const isoWeek = isoWeekKey(now);

  // Find eligible seekers (opted in to the weekly digest).
  let prefsQuery = svc
    .from("notification_preferences")
    .select("user_id")
    .eq("email_weekly_digest", true);
  if (payload.onlyUserId) prefsQuery = prefsQuery.eq("user_id", payload.onlyUserId);
  const { data: prefRows, error: prefsErr } = await prefsQuery;
  if (prefsErr) {
    return new Response(JSON.stringify({ error: prefsErr.message, _version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const eligibleUserIds = (prefRows ?? []).map((r) => (r as { user_id: string }).user_id);

  if (eligibleUserIds.length === 0) {
    return new Response(JSON.stringify({ scanned: 0, sent: 0, skipped: 0, _version: VERSION }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Pull seeker profile state + deletion gating in one shot. Profile
  // delivers first_name + state for personalization + the "new facilities
  // in your state" stat block. deletion_scheduled_at suppresses sends to
  // accounts pending purge.
  const { data: profiles, error: profErr } = await svc
    .from("seeker_profiles")
    .select("user_id, first_name, state, deletion_scheduled_at")
    .in("user_id", eligibleUserIds);
  if (profErr) {
    return new Response(JSON.stringify({ error: profErr.message, _version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let scanned = 0;
  let sent = 0;
  let skipped = 0;
  let suppressed = 0;
  let inactiveSkipped = 0;
  let failed = 0;
  const failures: Array<{ userId: string; reason: string }> = [];

  for (const profile of profiles ?? []) {
    scanned++;
    const p = profile as {
      user_id: string;
      first_name: string | null;
      state: string | null;
      deletion_scheduled_at: string | null;
    };

    if (p.deletion_scheduled_at) {
      skipped++;
      continue;
    }

    // Resolve email from auth.users (the source of truth for seeker email).
    let seekerEmail: string | null = null;
    try {
      const { data: authUser } = await svc.auth.admin.getUserById(p.user_id);
      seekerEmail = authUser?.user?.email?.toLowerCase() ?? null;
    } catch (e) {
      failed++;
      failures.push({ userId: p.user_id, reason: `auth lookup failed: ${e instanceof Error ? e.message : String(e)}` });
      continue;
    }
    if (!seekerEmail) {
      skipped++;
      continue;
    }

    // Suppression list — hard-bounced or complained addresses must not
    // receive any further marketing email. The weekly digest qualifies as
    // marketing (it's preference-gated, not transactional).
    const { data: suppression } = await svc
      .from("suppressed_emails")
      .select("email")
      .eq("email", seekerEmail)
      .maybeSingle();
    if (suppression) {
      suppressed++;
      continue;
    }

    // ── Per-seeker stats (parallel reads) ──────────────────────────────
    const [leadsRes, savedRes, newFacilitiesRes] = await Promise.all([
      svc
        .from("leads")
        .select("id, provider_responded_at")
        .eq("email", seekerEmail)
        .gte("created_at", weekAgoIso),
      svc
        .from("user_favorites")
        .select("*", { count: "exact", head: true })
        .eq("user_id", p.user_id),
      p.state
        ? svc
          .from("facilities")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved")
          .eq("state", p.state)
          .gte("created_at", weekAgoIso)
        : Promise.resolve({ count: 0 } as { count: number | null }),
    ]);

    const leads = leadsRes.data ?? [];
    const requestsSent = leads.length;
    const responsesReceived = leads.filter(
      (l) => (l as { provider_responded_at?: string | null }).provider_responded_at,
    ).length;
    const savedFacilities = savedRes.count ?? 0;
    const newFacilitiesInState = newFacilitiesRes.count ?? 0;

    // Empty-state suppression. A seeker with no requests, no responses,
    // and no saves doesn't need a "0 0 0" digest — that's noise that
    // erodes inbox trust. They'll catch the next digest when they engage.
    // New-facilities-in-state alone is NOT enough to justify the send;
    // the digest's purpose is to summarize THEIR activity.
    if (requestsSent === 0 && responsesReceived === 0 && savedFacilities === 0) {
      inactiveSkipped++;
      continue;
    }

    const stats: DigestStats = {
      requestsSent,
      responsesReceived,
      savedFacilities,
      newFacilitiesInState,
      state: p.state,
    };

    const unsubscribeUrl = `https://rehablookup.com/account/notification-preferences?unsub=weekly`;
    const { subject, html } = renderDigest({
      firstName: p.first_name ?? "there",
      stats,
      weekLabel,
      unsubscribeUrl,
    });

    if (payload.dryRun) {
      sent++;
      continue;
    }

    try {
      // deno-lint-ignore no-explicit-any
      const { error: sendErr } = await (resend.emails as any).send({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: [seekerEmail],
        subject,
        html,
        headers: {
          "Idempotency-Key": `seeker-weekly-digest-${p.user_id}-${isoWeek}`,
          "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:no-reply@rehablookup.com?subject=unsubscribe%20weekly>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      if (sendErr) {
        failed++;
        failures.push({ userId: p.user_id, reason: String(sendErr) });
      } else {
        sent++;
      }
    } catch (e) {
      failed++;
      failures.push({ userId: p.user_id, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  return new Response(
    JSON.stringify({
      scanned,
      sent,
      skipped,
      suppressed,
      inactiveSkipped,
      failed,
      failures: failures.slice(0, 5),
      isoWeek,
      dryRun: !!payload.dryRun,
      _version: VERSION,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
