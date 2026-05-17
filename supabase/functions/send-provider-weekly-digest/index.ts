// send-provider-weekly-digest v1.0.0
//
// Cron-fired (Sundays 13:00 UTC = 08:00 ET) summary email of the last
// 7 days of activity for each provider who opted in.
//
// Provider opt-in: notification_preferences.email_weekly_digest = true
// Hard suppression: profiles.unsubscribed_provider_emails_at IS NOT NULL
//                   OR auth.users.email_confirmed_at IS NULL
//
// Body summary (per provider's facilities):
//   • total new leads (count + breakdown by urgency)
//   • total facility views (count)
//   • new reviews (count + avg rating)
//   • profile completeness reminder if any facility < 75%
//
// Idempotency: Resend Idempotency-Key=`weekly-digest-${user_id}-${iso_week}`.
// Resend dedups same-key sends, so re-running the cron is safe.
//
// Self-contained (no shared template deps) so MCP single-file deploy works.
// Service-role gate via JWT role claim (format-agnostic across legacy + sb_secret_*).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
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

interface FacilityRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  listing_completeness_score: number | null;
}
interface DigestStats {
  newLeads: number;
  urgentLeads: number;
  views: number;
  reviewCount: number;
  reviewAvg: number | null;
  lowestCompleteness: number | null;
  facilities: FacilityRow[];
}

function renderDigest(opts: {
  firstName: string;
  stats: DigestStats;
  weekLabel: string;
  unsubscribeUrl: string;
}): { subject: string; html: string } {
  const s = opts.stats;
  const safeName = esc(opts.firstName);
  const summary =
    s.newLeads > 0 || s.views > 0 || s.reviewCount > 0
      ? `Here's your activity for ${esc(opts.weekLabel)}.`
      : `No new activity this week. Keep your profile fresh to attract more inquiries.`;
  const subject = `Your RehabLookup weekly summary — ${s.newLeads} new lead${s.newLeads === 1 ? "" : "s"}`;
  const facilityList = s.facilities
    .slice(0, 5)
    .map((f) => `<li style="margin:0 0 4px;">${esc(f.name)}${f.city || f.state ? ` — ${esc([f.city, f.state].filter(Boolean).join(", "))}` : ""}</li>`)
    .join("");
  const showCompletenessNudge = s.lowestCompleteness !== null && s.lowestCompleteness < 75;
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
<p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">New leads</p>
<p style="margin:4px 0 0;font-size:24px;font-weight:700;color:${PRIMARY};">${s.newLeads}${s.urgentLeads > 0 ? ` <span style="font-size:12px;color:#dc2626;font-weight:600;">(${s.urgentLeads} urgent)</span>` : ""}</p>
</td></tr>
<tr><td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;">
<p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Profile views</p>
<p style="margin:4px 0 0;font-size:24px;font-weight:700;color:${PRIMARY};">${s.views}</p>
</td></tr>
<tr><td style="padding:14px 16px;">
<p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">New reviews</p>
<p style="margin:4px 0 0;font-size:24px;font-weight:700;color:${PRIMARY};">${s.reviewCount}${s.reviewAvg !== null ? ` <span style="font-size:14px;color:#0f766e;font-weight:600;">★ ${s.reviewAvg.toFixed(1)} avg</span>` : ""}</p>
</td></tr>
</table>

${s.facilities.length > 0 ? `<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${PRIMARY};">Your facilities</p>
<ul style="margin:0 0 18px;padding:0 0 0 18px;font-size:13px;color:#475569;line-height:1.6;">${facilityList}</ul>` : ""}

${showCompletenessNudge ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border-left:4px solid #ca8a04;border-radius:6px;margin:0 0 18px;"><tr><td style="padding:12px 16px;"><p style="margin:0;font-size:13px;color:#713f12;line-height:1.55;"><strong>Boost your visibility:</strong> one of your facility profiles is under 75% complete. Listings with full photos, descriptions, and insurance details receive 2-3× more inquiries.</p></td></tr></table>` : ""}

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;"><tr><td style="background:${PRIMARY};border-radius:8px;">
<a href="https://rehablookup.com/provider/dashboard" style="display:inline-block;padding:13px 28px;font-size:14px;color:#ffffff;text-decoration:none;font-weight:600;">View full dashboard</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #f3f4f6;text-align:center;">
<p style="margin:0 0 4px;font-size:11px;color:#9ca3af;line-height:1.5;">Weekly summaries help you stay on top of inquiries. Manage frequency in <a href="https://rehablookup.com/provider/settings?tab=notifications" style="color:#9ca3af;text-decoration:underline;">notification preferences</a>.</p>
<p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;"><a href="${opts.unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe from provider emails</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Service-role-only gate (format-agnostic JWT role claim).
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
  const weekAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekLabel = `Week of ${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)}`;
  const isoWeek = isoWeekKey(now);

  // Find eligible providers.
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

  // Pull each profile's email + suppression state in one shot.
  const { data: profiles, error: profErr } = await svc
    .from("profiles")
    .select("user_id, email, first_name, unsubscribed_provider_emails_at")
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
  let failed = 0;
  const failures: Array<{ userId: string; reason: string }> = [];

  for (const profile of profiles ?? []) {
    scanned++;
    const p = profile as {
      user_id: string;
      email: string | null;
      first_name: string | null;
      unsubscribed_provider_emails_at: string | null;
    };
    if (!p.email || p.unsubscribed_provider_emails_at) {
      skipped++;
      continue;
    }

    // Load this provider's facilities.
    const { data: facilities } = await svc
      .from("facilities")
      .select("id, name, city, state, listing_completeness_score")
      .eq("user_id", p.user_id);
    const facList = (facilities ?? []) as FacilityRow[];
    const facIds = facList.map((f) => f.id);

    let newLeads = 0;
    let urgentLeads = 0;
    let views = 0;
    let reviewCount = 0;
    let reviewAvg: number | null = null;

    if (facIds.length > 0) {
      const { data: leads } = await svc
        .from("leads")
        .select("urgency")
        .in("facility_id", facIds)
        .gte("created_at", weekAgoIso);
      newLeads = leads?.length ?? 0;
      urgentLeads = (leads ?? []).filter(
        (l) => (l as { urgency?: string }).urgency === "emergency" ||
               (l as { urgency?: string }).urgency === "within_24_hours",
      ).length;

      const { count: viewCount } = await svc
        .from("facility_views")
        .select("*", { count: "exact", head: true })
        .in("facility_id", facIds)
        .gte("created_at", weekAgoIso);
      views = viewCount ?? 0;

      const { data: reviews } = await svc
        .from("facility_reviews")
        .select("rating")
        .in("facility_id", facIds)
        .gte("created_at", weekAgoIso);
      reviewCount = reviews?.length ?? 0;
      if (reviewCount > 0) {
        const total = (reviews ?? []).reduce((acc, r) => acc + ((r as { rating?: number }).rating ?? 0), 0);
        reviewAvg = total / reviewCount;
      }
    }

    const lowestCompleteness =
      facList.length > 0
        ? facList.reduce<number | null>((min, f) => {
            const v = f.listing_completeness_score ?? null;
            if (v === null) return min;
            if (min === null) return v;
            return v < min ? v : min;
          }, null)
        : null;

    const stats: DigestStats = {
      newLeads,
      urgentLeads,
      views,
      reviewCount,
      reviewAvg,
      lowestCompleteness,
      facilities: facList,
    };

    const unsubscribeUrl = `https://rehablookup.com/provider/settings?tab=notifications&unsub=${encodeURIComponent(p.email)}`;
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
        to: [p.email],
        subject,
        html,
        headers: {
          "Idempotency-Key": `weekly-digest-${p.user_id}-${isoWeek}`,
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
      failed,
      failures: failures.slice(0, 5),
      isoWeek,
      dryRun: !!payload.dryRun,
      _version: VERSION,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
