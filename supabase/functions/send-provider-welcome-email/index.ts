// send-provider-welcome-email v3.1.0
// EKRA-aligned: flat $99 Pro, Featured + Concierge as add-ons.
// Schema relaxed: facility fields + selectedPlan optional so the
// wizard's AccountStep/VerifyEmailStep can fire it pre-facility.
//
// Hardening (v3.1.0):
//   • If facilityId is provided, the plan is RECONCILED against
//     facility_subscriptions before sending — the caller can no
//     longer accidentally ship the "Welcome to Free" email to a
//     user who already has an active Pro subscription (Stripe
//     webhook reordering bug).
//   • Resend errors are sanitized in the client response (no raw
//     service internals leak via `details`).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";

const VERSION = "3.1.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

const PRIMARY = "#1B365D";
const PRO_PURPLE = "#7c3aed";

function esc(s: string): string {
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function generateWelcomeEmail(opts: {
  firstName: string;
  facilityName: string | null;
  plan: "free" | "pro";
  hasFeatured: boolean;
  hasConcierge: boolean;
}): { subject: string; html: string } {
  const safeName = esc(opts.firstName);
  const safeFac = opts.facilityName ? esc(opts.facilityName) : null;
  const isPro = opts.plan === "pro";
  const subject = isPro
    ? `⭐ Welcome to RehabLookup Pro, ${safeName}`
    : `Welcome to RehabLookup, ${safeName}`;

  const planBlock = isPro
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ff;border:2px solid ${PRO_PURPLE};border-radius:10px;margin:0 0 24px;"><tr><td style="padding:16px 18px;">
<p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${PRO_PURPLE};">⭐ You're on Pro — $99/month</p>
<p style="margin:0 0 8px;font-size:13px;color:#5b21b6;">Cancel anytime from billing. EKRA-clean flat fee.</p>
<p style="margin:0;font-size:13px;color:#374151;line-height:1.55;"><strong>Active benefits:</strong> up to 10 photos • 1 facility video • lead analytics • priority placement on city &amp; state pages • +50 ranking boost • Marketing Hub unlocked.</p>${opts.hasFeatured ? `<p style="margin:8px 0 0;font-size:12px;color:#5b21b6;"><strong>Featured Add-On active:</strong> rotating in homepage + statewide Featured slots.</p>` : ""}${opts.hasConcierge ? `<p style="margin:8px 0 0;font-size:12px;color:#5b21b6;"><strong>Concierge Add-On active:</strong> surfaced by advisors with verified-partner badge for matching seekers.</p>` : ""}</td></tr></table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;border:2px solid ${PRIMARY};border-radius:10px;margin:0 0 24px;"><tr><td style="padding:16px 18px;">
<p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${PRIMARY};">You're on the Free plan</p>
<p style="margin:0 0 8px;font-size:13px;color:#475569;line-height:1.55;">Your listing is in our directory. Families can find, save, and message you directly. No per-lead fees.</p>
<p style="margin:0;font-size:13px;color:#374151;line-height:1.55;"><strong>Free includes:</strong> 5 photos • contact form on your profile • directory placement.</p>
<p style="margin:10px 0 0;font-size:12px;color:#64748b;">Upgrade to Pro for 10 photos, video, lead analytics, priority placement, and +50 ranking — a flat $99/month, EKRA-clean.</p>
</td></tr></table>`;

  const facilityLine = safeFac
    ? `Thank you for joining RehabLookup with <strong style="color:${PRIMARY};">${safeFac}</strong>.`
    : "Thank you for joining RehabLookup.";

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,${PRIMARY} 0%,#0f766e 100%);padding:32px 28px;text-align:center;">
<p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.85);letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">REHABLOOKUP</p>
<h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${isPro ? "Welcome to Pro" : "Welcome to RehabLookup"}</h1>
</td></tr>
<tr><td style="padding:28px;">
<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1f2937;">Hi ${safeName},</p>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151;">${facilityLine} Families searching for treatment can find your listing, save it, and message you directly — no per-lead fees, ever.</p>
${planBlock}
<p style="margin:0 0 12px;font-size:15px;font-weight:700;color:${PRIMARY};">Get started</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr><td style="background:${PRIMARY};border-radius:8px;">
<a href="https://rehablookup.com/provider/dashboard" style="display:inline-block;padding:13px 28px;font-size:14px;color:#ffffff;text-decoration:none;font-weight:600;">Open your dashboard</a>
</td></tr></table>
<p style="margin:0 0 8px;font-size:13px;color:#475569;line-height:1.6;"><strong>Next steps:</strong></p>
<p style="margin:0 0 4px;font-size:13px;color:#475569;line-height:1.6;">• Upload photos and finalize your listing details</p>
<p style="margin:0 0 4px;font-size:13px;color:#475569;line-height:1.6;">• Configure services, insurance, and levels of care families can filter on</p>
<p style="margin:0 0 4px;font-size:13px;color:#475569;line-height:1.6;">• Set up SMS alerts so you never miss a new inquiry</p>
${!isPro ? `<p style="margin:16px 0 0;font-size:13px;color:#475569;line-height:1.6;">When you're ready for more visibility, <a href="https://rehablookup.com/provider/billing?upgrade=pro" style="color:${PRO_PURPLE};font-weight:600;text-decoration:underline;">upgrade to Pro</a> for analytics, video, and priority placement.</p>` : `<p style="margin:16px 0 0;font-size:13px;color:#475569;line-height:1.6;">${opts.hasFeatured || opts.hasConcierge ? "" : `For even more reach, the <a href="https://rehablookup.com/provider/marketing/featured" style="color:${PRO_PURPLE};font-weight:600;text-decoration:underline;">Featured Add-On</a> rotates you on the homepage + state pages, and <a href="https://rehablookup.com/provider/marketing/concierge" style="color:${PRO_PURPLE};font-weight:600;text-decoration:underline;">Concierge</a> surfaces you in advisor matching with a verified-partner badge.`}</p>`}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #f3f4f6;text-align:center;">
<p style="margin:0 0 4px;font-size:11px;color:#9ca3af;line-height:1.5;">RehabLookup — helping families find treatment, helping facilities receive direct inquiries.</p>
<p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;"><a href="https://rehablookup.com/provider/dashboard" style="color:#9ca3af;text-decoration:underline;">Dashboard</a> · <a href="https://rehablookup.com/provider/settings" style="color:#9ca3af;text-decoration:underline;">Email preferences</a></p>
</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed", _version: VERSION }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) return new Response(JSON.stringify({ error: "Email service not configured", _version: VERSION }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const body = await req.json().catch(() => ({}));
    const providerEmail = String(body.providerEmail ?? body.email ?? "").trim().toLowerCase();
    if (!providerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(providerEmail)) {
      return new Response(JSON.stringify({ error: "providerEmail required and must be valid", _version: VERSION }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Accept either providerFirstName or firstName for backward compat.
    const firstName = String(body.providerFirstName ?? body.firstName ?? "").trim() || "there";
    const facilityName = body.facilityName ? String(body.facilityName).trim() || null : null;
    const facilityId = body.facilityId ? String(body.facilityId).trim() : null;
    let selectedPlan = String(body.selectedPlan ?? "free").trim().toLowerCase();
    let plan: "free" | "pro" = selectedPlan === "pro" || selectedPlan === "professional" ? "pro" : "free";
    let hasFeatured = !!body.hasFeatured || selectedPlan === "featured";
    let hasConcierge = !!body.hasConcierge || selectedPlan === "concierge";

    // When a facility_id is provided, reconcile the caller-claimed plan
    // against the database source-of-truth (facility_subscriptions).
    // Stops a stale caller (Stripe webhook latency, double-fire from
    // the wizard) shipping a "Welcome to Free" email after the
    // upgrade webhook has already promoted the row to Pro.
    if (facilityId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseServiceKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
          });
          const { data: sub } = await supabase
            .from("facility_subscriptions")
            .select("tier, status, has_featured, has_concierge_partner")
            .eq("facility_id", facilityId)
            .maybeSingle();
          if (sub && (sub as { status?: string }).status === "active") {
            const dbTier = (sub as { tier?: string }).tier;
            if (dbTier === "pro" && plan !== "pro") {
              console.log("[send-provider-welcome-email] DB shows Pro, caller said Free — using Pro");
              plan = "pro";
              selectedPlan = "pro";
            }
            hasFeatured = hasFeatured || !!(sub as { has_featured?: boolean }).has_featured;
            hasConcierge = hasConcierge || !!(sub as { has_concierge_partner?: boolean }).has_concierge_partner;
          }
        } catch (lookupErr) {
          // Reconciliation is best-effort. If the DB read fails we
          // fall back to caller-provided values rather than blocking
          // the welcome email.
          console.warn("[send-provider-welcome-email] plan reconciliation failed", String(lookupErr));
        }
      }
    }

    const idempotencyKey = body.idempotencyKey ? String(body.idempotencyKey) : `welcome-${providerEmail}-${plan}`;

    const { subject, html } = generateWelcomeEmail({ firstName, facilityName, plan, hasFeatured, hasConcierge });
    const resend = new Resend(resendApiKey);
    // deno-lint-ignore no-explicit-any
    const { error: sendErr } = await (resend.emails as any).send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [providerEmail],
      subject,
      html,
      headers: { "Idempotency-Key": idempotencyKey },
    });
    if (sendErr) {
      // Log full Resend error server-side, return a sanitized message
      // to the client. We never want Resend internals (auth keys, raw
      // error payloads, domain-config hints) to surface in a public
      // API response.
      console.error("[send-provider-welcome-email] resend error", sendErr);
      return new Response(
        JSON.stringify({ error: "Failed to send welcome email", _version: VERSION }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ success: true, plan, hasFeatured, hasConcierge, _version: VERSION }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[send-provider-welcome-email] unhandled", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error", _version: VERSION }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
