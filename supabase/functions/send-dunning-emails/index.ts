// ============================================================================
// send-dunning-emails v1.0.0
// ----------------------------------------------------------------------------
// Cron-triggered driver. For every facility_subscription with status='past_due',
// computes days-past-due (now - past_due_since), and for each milestone
// (day_1, day_3, day_7) that has elapsed but not yet been emailed, sends a
// templated Resend dunning notification.
//
// Idempotency:
//   - The dunning_milestones_sent text[] on facility_subscriptions is
//     appended to after a successful send. The next cron tick filters
//     out subs that already have the milestone token.
//   - A unique Resend Idempotency-Key keyed on (sub_id, milestone)
//     prevents duplicate sends within Resend's dedup window if the
//     append-on-success race ever loses.
//
// Tier-aware copy:
//   - Day 1: friendly "we couldn't charge your card" + Stripe portal link.
//   - Day 3: stronger urgency + "your benefits start to degrade soon".
//   - Day 7: final notice — "subscription will be canceled if payment
//            fails again". Includes the specific tier names so the
//            provider knows what's at risk (Pro vs Pro+Featured etc).
//
// Authorization: hard-coded service-role JWT check; the cron is the
// only legitimate caller.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify({ ...body, _version: VERSION }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (level: "INFO" | "WARN" | "ERROR", msg: string, details?: unknown) => {
  const d = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[SEND-DUNNING-EMAILS] [${VERSION}] [${level}] ${msg}${d}`);
};

type Milestone = "day_1" | "day_3" | "day_7";
const MILESTONES: { token: Milestone; daysElapsed: number; order: number }[] = [
  { token: "day_1", daysElapsed: 1, order: 1 },
  { token: "day_3", daysElapsed: 3, order: 2 },
  { token: "day_7", daysElapsed: 7, order: 3 },
];

interface SubRow {
  id: string;
  provider_id: string;
  facility_id: string;
  tier: string | null;
  has_featured: boolean | null;
  has_concierge_partner: boolean | null;
  past_due_since: string;
  dunning_milestones_sent: string[];
  stripe_customer_id: string | null;
}

function tierLabel(s: SubRow): string {
  const parts: string[] = [];
  if (s.tier === "pro") parts.push("Pro");
  if (s.has_featured) parts.push("Featured");
  if (s.has_concierge_partner) parts.push("Concierge");
  return parts.length > 0 ? parts.join(" + ") : "subscription";
}

function emailHtml(args: {
  milestone: Milestone;
  facilityName: string;
  tierLabel: string;
  daysSince: number;
  portalUrl: string;
}): string {
  const esc = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const safeFacility = esc(args.facilityName);
  const safeTier = esc(args.tierLabel);

  const headline =
    args.milestone === "day_1"
      ? "We couldn't charge your card"
      : args.milestone === "day_3"
        ? "Your subscription is still past due"
        : "Final notice — your subscription is about to cancel";

  const body =
    args.milestone === "day_1"
      ? `Hi there,

We tried to renew your <strong>${safeTier}</strong> subscription for
<strong>${safeFacility}</strong> and the charge was declined.

Stripe will automatically retry over the next several days — please update
your payment method to avoid any interruption to your placement and benefits.`
      : args.milestone === "day_3"
        ? `Hi there,

It's been ${args.daysSince} days since your <strong>${safeTier}</strong> renewal
for <strong>${safeFacility}</strong> failed. Stripe is still retrying, but the
benefits attached to your subscription may start to degrade if the charge
doesn't succeed soon.

Please update your card now — it takes 30 seconds.`
        : `Hi there,

Your <strong>${safeTier}</strong> subscription for <strong>${safeFacility}</strong>
has been past due for ${args.daysSince} days. If Stripe's final retry fails,
your subscription will be canceled and you'll lose:

<ul>
  <li>Your placement in homepage / state / city Featured rotations (if you have Featured)</li>
  <li>Concierge Partner status in advisor matching (if you have Concierge)</li>
  <li>Your Pro photo cap, video tile, and ranking boost</li>
</ul>

Please update your payment method immediately to keep these benefits.`;

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#b45309;padding:32px;text-align:center;">
<p style="margin:0 0 4px 0;font-size:11px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1.5px;">REHABLOOKUP — Billing</p>
<h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">${headline}</h1></td></tr>
<tr><td style="padding:32px;">
<div style="color:#374151;font-size:15px;line-height:1.7;">${body.replace(/\n/g, "<br>")}</div>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr>
<td style="border-radius:8px;background:#1B365D;">
<a href="${args.portalUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;color:#ffffff;text-decoration:none;font-weight:600;">Update payment method</a>
</td></tr></table>
<p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
If you've already updated your card, you can ignore this email — your next
renewal attempt should succeed and we'll stop these notifications.
</p>
</td></tr>
<tr><td style="background:#1B365D;padding:20px 32px;text-align:center;">
<p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!SUPABASE_URL || !SUPABASE_SRK || !RESEND_API_KEY) {
      log("ERROR", "Missing env");
      return json(500, { error: "Server misconfigured" });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token || token !== SUPABASE_SRK) {
      log("WARN", "Rejected non-service-role call");
      return json(403, { error: "Forbidden" });
    }

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);
    const resend = new Resend(RESEND_API_KEY);

    const { data: subs, error: subsErr } = await svc
      .from("facility_subscriptions")
      .select(
        "id, provider_id, facility_id, tier, has_featured, has_concierge_partner, past_due_since, dunning_milestones_sent, stripe_customer_id",
      )
      .eq("status", "past_due")
      .not("past_due_since", "is", null)
      .order("past_due_since", { ascending: true })
      .limit(500);
    if (subsErr) {
      log("ERROR", "fetch past_due failed", { error: subsErr.message });
      return json(500, { error: "DB error" });
    }

    const stats = { considered: 0, sent: 0, skipped_already_sent: 0, skipped_no_email: 0, errors: 0 };
    const baseUrl = SUPABASE_URL.includes("localhost") ? "http://localhost:8080" : "https://rehablookup.com";
    // Stripe customer portal URL: providers can use the in-app billing
    // page to launch the portal, so we route them there rather than
    // hard-linking to a portal session (which requires a server call
    // per recipient).
    const portalUrl = `${baseUrl}/provider/billing`;

    for (const subRaw of (subs ?? []) as SubRow[]) {
      stats.considered++;
      const sub = subRaw;
      const pastDueSince = new Date(sub.past_due_since);
      const daysSince = Math.floor((Date.now() - pastDueSince.getTime()) / (24 * 60 * 60 * 1000));

      for (const m of MILESTONES) {
        if (daysSince < m.daysElapsed) continue; // not yet
        if (sub.dunning_milestones_sent?.includes(m.token)) continue; // already sent

        try {
          // Resolve recipient + facility name.
          const [userRes, facRes] = await Promise.all([
            svc.auth.admin.getUserById(sub.provider_id),
            svc.from("facilities").select("name").eq("id", sub.facility_id).maybeSingle(),
          ]);
          const recipient = userRes?.data?.user?.email;
          const facilityName = (facRes.data as { name?: string } | null)?.name ?? "your facility";
          if (!recipient) {
            stats.skipped_no_email++;
            continue;
          }

          // Mark as sent BEFORE the network call — same claim-first
          // pattern as drain-addon-waitlist. If we crash mid-send,
          // the user just doesn't get this milestone (next milestone
          // will still fire); much safer than potential double-send.
          const { error: claimErr } = await svc
            .from("facility_subscriptions")
            .update({
              dunning_milestones_sent: [...(sub.dunning_milestones_sent ?? []), m.token],
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id)
            // Make sure no concurrent tick already claimed.
            .not("dunning_milestones_sent", "cs", `{${m.token}}`);
          if (claimErr) {
            // Race or other update failure — skip this milestone for now.
            log("INFO", "milestone already claimed or update raced", { subId: sub.id, milestone: m.token });
            continue;
          }

          // deno-lint-ignore no-explicit-any
          const sendRes = await (resend.emails as any).send({
            from: "RehabLookup Billing <billing@rehablookup.com>",
            to: [recipient],
            subject:
              m.token === "day_1"
                ? `Action needed — we couldn't charge your card for ${facilityName}`
                : m.token === "day_3"
                  ? `Reminder: your ${tierLabel(sub)} subscription is past due`
                  : `Final notice: your ${tierLabel(sub)} subscription will cancel`,
            html: emailHtml({
              milestone: m.token,
              facilityName,
              tierLabel: tierLabel(sub),
              daysSince,
              portalUrl,
            }),
            headers: { "Idempotency-Key": `dunning:${sub.id}:${m.token}` },
          });
          if (sendRes?.error) {
            log("ERROR", "resend failed", { subId: sub.id, milestone: m.token, error: sendRes.error });
            stats.errors++;
            await svc.from("admin_notifications").insert({
              type: "dunning_email_failed",
              title: "Dunning email failed to send",
              message: `Could not send ${m.token} dunning email for facility_subscriptions.id=${sub.id}. The milestone is marked sent but the user did not receive the email; consider manual outreach.`,
              metadata: { facility_subscription_id: sub.id, milestone: m.token, recipient, error: sendRes.error },
            }).then(() => undefined);
            continue;
          }
          stats.sent++;
        } catch (err) {
          log("ERROR", "dunning row failed", { subId: sub.id, milestone: m.token, error: err instanceof Error ? err.message : String(err) });
          stats.errors++;
        }
      }
    }

    log("INFO", "Dunning sweep complete", stats);
    return json(200, { success: true, stats });
  } catch (e) {
    log("ERROR", "unhandled", { error: e instanceof Error ? e.message : String(e) });
    return json(500, { error: "Internal error" });
  }
});
