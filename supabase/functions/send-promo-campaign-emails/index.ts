// ============================================================================
// send-promo-campaign-emails v1.0.0
// ----------------------------------------------------------------------------
// Cron-driven FOMO promo sequence. For each LIVE promotion, computes the
// current milestone (launch -> midpoint -> last_chance) from the campaign
// window, selects the eligible provider cohort (audience-matched facility
// owners, not unsubscribed, not suppressed, not already sent that milestone,
// 'pro' audience excludes add-on holders) via get_promo_email_cohort, and emails
// each one a time-sensitive upgrade offer with the discounted price + a CTA that
// carries the promo id to checkout.
//
// Idempotency: promotion_email_sends (promotion_id,user_id,milestone) is the
// cohort filter AND is written after each successful send; sendEmailWithRetry's
// idempotencyKey guards against double-send within Resend's window.
//
// Compliance: marketing email — honors the provider unsubscribe token + the
// suppressed_emails ledger; every email carries the unsubscribe footer.
//
// Schedule: pg_cron 'send-promo-campaign-emails' hourly (migration
// 20260827001300). Auth: cron-secret + service-role role claim.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { assertCronSecret } from "../_shared/cron-auth.ts";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { TIER_PRICING } from "../_shared/subscription-math.ts";
import { signUnsubscribeToken } from "../_shared/unsubscribe-token.ts";

const VERSION = "1.0.0";
const BATCH = 200;
const SITE_URL = "https://rehablookup.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify({ ...body, _version: VERSION }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (level: "INFO" | "WARN" | "ERROR", msg: string, details?: unknown) => {
  const d = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[PROMO-EMAILS] [${VERSION}] [${level}] ${msg}${d}`);
};

function jwtRole(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload?.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

const esc = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;

interface Promo {
  id: string;
  audience: string;
  target_product: "pro" | "featured" | "concierge";
  discount_percent: number | null;
  discount_duration_months: number | null;
  headline: string;
  subcopy: string | null;
  urgency_label: string | null;
  cta_label: string | null;
  starts_at: string;
  ends_at: string;
}

function targetPath(p: Promo): string {
  switch (p.target_product) {
    case "pro": return `/provider/billing?upgrade=pro&promo=${p.id}`;
    case "featured": return `/provider/marketing/featured?promo=${p.id}`;
    case "concierge": return `/provider/marketing/concierge?promo=${p.id}`;
  }
}

function currentMilestone(p: Promo, now: number): "launch" | "midpoint" | "last_chance" {
  const start = new Date(p.starts_at).getTime();
  const end = new Date(p.ends_at).getTime();
  if (now >= end - 24 * 3600 * 1000) return "last_chance";
  if (now >= start + (end - start) / 2) return "midpoint";
  return "launch";
}

function discountLabel(p: Promo): string {
  const monthly = TIER_PRICING[p.target_product]?.fullMonthlyRateCents ?? 0;
  const pct = p.discount_percent ?? 0;
  if (!monthly || pct <= 0) return "";
  const discounted = Math.round((monthly * (100 - pct)) / 100);
  const dur = p.discount_duration_months ? ` for ${p.discount_duration_months} months` : "";
  const then = p.discount_duration_months ? `, then ${fmt(monthly)}/mo` : "";
  return `${pct}% off — ${fmt(discounted)}/mo${dur}${then}`;
}

function buildEmail(opts: {
  firstName: string;
  promo: Promo;
  milestone: string;
  ctaUrl: string;
  unsubUrl: string;
}): { subject: string; html: string } {
  const { firstName, promo, milestone, ctaUrl, unsubUrl } = opts;
  const endsLabel = new Date(promo.ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const urgency =
    milestone === "last_chance" ? `Last chance — ends ${endsLabel}` :
    milestone === "midpoint" ? `Offer ends ${endsLabel}` :
    (promo.urgency_label || `Limited time — ends ${endsLabel}`);
  const subjectPrefix =
    milestone === "last_chance" ? "Last chance: " : milestone === "midpoint" ? "Ending soon: " : "";
  const subject = `${subjectPrefix}${promo.headline}`;
  const discount = discountLabel(promo);
  const ctaLabel = promo.cta_label || "Claim this offer";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9"><tr><td align="center" style="padding:40px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">
<tr><td style="background:#1B365D;padding:24px 32px"><h1 style="margin:0;color:#fff;font-size:19px;font-weight:700">${esc(promo.headline)}</h1></td></tr>
<tr><td style="padding:32px">
<p style="margin:0 0 12px;font-size:15px;line-height:1.55">Hi ${esc(firstName)},</p>
<div style="display:inline-block;background:#fef2f2;color:#b91c1c;font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px;margin-bottom:16px">⏰ ${esc(urgency)}</div>
${promo.subcopy ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#374151">${esc(promo.subcopy)}</p>` : ""}
${discount ? `<div style="margin:0 0 20px;padding:16px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a;text-align:center"><p style="margin:0;font-size:18px;font-weight:700;color:#0f172a">${esc(discount)}</p></div>` : ""}
<div style="text-align:center;margin:24px 0"><a href="${ctaUrl}" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px">${esc(ctaLabel)} →</a></div>
<p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">You're receiving this because you have a provider account on RehabLookup. <a href="${unsubUrl}" style="color:#64748b">Unsubscribe from these emails</a>.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center"><p style="margin:0;font-size:11px;color:#94a3b8">RehabLookup · Verified treatment directory</p></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const cronAuth = assertCronSecret(req);
  if (!cronAuth.ok) return cronAuth.response;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!SUPABASE_URL || !SUPABASE_SRK || !RESEND_API_KEY) {
      log("ERROR", "Missing env");
      return json(500, { error: "Server misconfigured" });
    }
    const role = jwtRole((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));
    if (role !== "service_role") {
      log("WARN", "Rejected non-service-role call", { role });
      return json(403, { error: "Forbidden" });
    }

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);
    const resend = new Resend(RESEND_API_KEY);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const { data: promos, error: promoErr } = await svc
      .from("promotions")
      .select("id, audience, target_product, discount_percent, discount_duration_months, headline, subcopy, urgency_label, cta_label, starts_at, ends_at")
      .eq("active", true)
      .lte("starts_at", nowIso)
      .gt("ends_at", nowIso);
    if (promoErr) {
      log("ERROR", "fetch promos failed", { error: promoErr.message });
      return json(500, { error: "DB error" });
    }

    const stats = { promos: 0, sent: 0, skipped: 0, errors: 0 };

    for (const promo of (promos ?? []) as Promo[]) {
      stats.promos++;
      const milestone = currentMilestone(promo, now);
      const { data: cohort, error: cohortErr } = await svc.rpc("get_promo_email_cohort", {
        p_audience: promo.audience,
        p_promotion_id: promo.id,
        p_milestone: milestone,
        p_limit: BATCH,
      });
      if (cohortErr) {
        log("ERROR", "cohort fetch failed", { promoId: promo.id, error: cohortErr.message });
        stats.errors++;
        continue;
      }

      for (const row of (cohort ?? []) as { user_id: string; email: string; first_name: string | null }[]) {
        // Claim-first: insert the send record BEFORE sending (idempotent on the
        // PK). The cohort RPC already excludes claimed rows; claiming up front
        // closes the gap where a send succeeds but the record write fails and
        // the next run re-sends (spam). A duplicate-key error means a concurrent
        // tick already took this provider → skip.
        const { error: claimErr } = await svc.from("promotion_email_sends").insert({
          promotion_id: promo.id,
          user_id: row.user_id,
          milestone,
        });
        if (claimErr) {
          stats.skipped++;
          continue;
        }
        try {
          const unsubUrl = `${SITE_URL}/api/provider-emails/unsubscribe?u=${await signUnsubscribeToken(row.user_id)}`;
          const { subject, html } = buildEmail({
            firstName: (row.first_name || "there").trim(),
            promo,
            milestone,
            ctaUrl: `${SITE_URL}${targetPath(promo)}`,
            unsubUrl,
          });
          await sendEmailWithRetry(
            svc,
            resend,
            { from: "RehabLookup <no-reply@rehablookup.com>", to: [row.email], subject, html },
            {
              emailType: "promo_campaign",
              idempotencyKey: `promo-${promo.id}-${milestone}-${row.user_id}`,
              metadata: { promotion_id: promo.id, milestone, target: promo.target_product },
            },
          );
          stats.sent++;
        } catch (err) {
          // Roll back the claim so a transient failure retries on the next run
          // rather than silently dropping the email.
          await svc.from("promotion_email_sends").delete()
            .eq("promotion_id", promo.id).eq("user_id", row.user_id).eq("milestone", milestone);
          log("ERROR", "send failed", { promoId: promo.id, userId: row.user_id, error: err instanceof Error ? err.message : String(err) });
          stats.errors++;
        }
      }
    }

    log("INFO", "Promo email sweep complete", stats);
    return json(200, { success: true, stats });
  } catch (e) {
    log("ERROR", "unhandled", { error: e instanceof Error ? e.message : String(e) });
    return json(500, { error: "Internal error" });
  }
});
