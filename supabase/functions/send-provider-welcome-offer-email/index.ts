import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { createLogger } from "../_shared/structured-logger.ts";
import { checkRecipientEmail } from "../_shared/recipient-email-guard.ts";

const WelcomeOfferRequestSchema = z.object({
  facilityId: z.string().uuid({ message: "facilityId must be a valid UUID" }),
  facilityName: z.string().trim().min(1).max(255),
  providerEmail: z.string().trim().email().max(255),
  providerFirstName: z.string().trim().min(1).max(120),
  selectedPlan: z.string().trim().min(1).max(50),
  idempotencyKey: z.string().trim().min(1).max(255).optional(),
});
import {
  emailStart,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailGreeting,
  emailParagraph,
  emailFooter,
  emailEnd,
  emailDivider,
  type PlanType,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-request-id",
};

type WelcomeOfferRequest = z.infer<typeof WelcomeOfferRequestSchema>;

const P = "#1B365D";
const GOLD = "#CDA223";
const PRO = "#7c3aed";

function generateWelcomeOfferEmail(
  providerFirstName: string,
  facilityName: string,
  selectedPlan: string
): string {
  const isPro = selectedPlan === "pro" || selectedPlan === "professional" || selectedPlan === "featured";
  const plan: PlanType = isPro ? "pro" : "free";
  const discountLabel = isPro ? "20% Pro discount on top" : "";

  let html = emailStart();
  html += emailHeader("Your Welcome Credit Offer", plan, {
    icon: "🎁",
    subtitle: "Exclusive limited-time offer for new providers",
  });
  html += emailBodyStart();
  html += emailGreeting(providerFirstName);

  html += emailParagraph(`Congratulations on registering <strong style="color:${P};">${facilityName}</strong> on RehabLookup! To help you hit the ground running, we've prepared an <strong>exclusive welcome credit offer</strong> — available only to new providers for a limited time.`);

  // Urgency banner
  html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;margin-bottom:24px;">
    <tr><td style="padding:14px 18px;text-align:center;">
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;font-weight:600;color:#991b1b;">⏰ This offer expires 7 days after signup — don't miss out</p>
    </td></tr>
  </table>`;

  // Why credits matter
  html += `<p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:700;color:${P};">Why Credits Matter</p>`;
  html += emailParagraph("When families inquire about your facility, you'll see their basic details — but to view full contact information and respond directly, you need to <strong>unlock the lead with credits</strong>. The faster you respond, the more likely families are to choose your facility.");

  html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">`;
  const points = [
    { icon: "⚡", text: "Respond first, win the referral — speed matters in treatment placement" },
    { icon: "📈", text: "Every unlocked lead is a potential admission worth thousands" },
    { icon: "🔒", text: "Without credits, inquiries expire and families move on" },
  ];
  for (const pt of points) {
    html += `<tr><td style="padding:6px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:28px;vertical-align:top;font-size:16px;">${pt.icon}</td>
        <td style="padding-left:10px;">
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#334155;line-height:1.5;">${pt.text}</p>
        </td>
      </tr></table>
    </td></tr>`;
  }
  html += `</table>`;

  html += emailDivider();

  // Credit tiers
  html += `<p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:700;color:${P};">Welcome Credit Bundles</p>`;
  html += emailParagraph("Choose your first top-up and get <strong>bonus credits</strong> to unlock more leads:");

  const tiers = [
    { amount: "$200", bonus: "—", label: "Starter", highlight: false },
    { amount: "$500", bonus: "+$50 bonus", label: "Growth", highlight: false },
    { amount: "$1,000", bonus: "+$200 bonus", label: "Best Value", highlight: true },
  ];

  html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">`;
  for (const tier of tiers) {
    const bg = tier.highlight ? "#f0f7ff" : "#f8fafc";
    const border = tier.highlight ? `2px solid ${P}` : "1px solid #e2e8f0";
    const bonusColor = tier.highlight ? P : "#059669";
    html += `<tr><td style="padding:4px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border:${border};border-radius:10px;">
        <tr>
          <td style="padding:14px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:700;color:${P};">${tier.amount} <span style="font-size:12px;font-weight:400;color:#64748b;">— ${tier.label}</span></p>
              </td>
              <td style="text-align:right;">
                ${tier.bonus !== "—"
                  ? `<span style="display:inline-block;background:${tier.highlight ? '#dbeafe' : '#d1fae5'};color:${bonusColor};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">${tier.bonus}</span>`
                  : `<span style="font-size:12px;color:#94a3b8;">Standard</span>`
                }
              </td>
            </tr></table>
          </td>
        </tr>
      </table>
    </td></tr>`;
  }
  html += `</table>`;

  if (isPro) {
    html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ff;border-left:4px solid ${PRO};border-radius:0 8px 8px 0;margin-bottom:24px;">
      <tr><td style="padding:14px 16px;">
        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#5b21b6;line-height:1.5;">⭐ <strong>Pro Bonus:</strong> Your 20% lead unlock discount applies on top of bundle bonuses — maximizing every dollar.</p>
      </td></tr>
    </table>`;
  }

  // Primary CTA
  html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
    <tr><td align="center">
      <a href="https://rehablookup.com/provider/billing?purchase_credits=true&welcome=true" style="display:inline-block;background:${GOLD};color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Claim My Welcome Credits →</a>
    </td></tr>
  </table>`;

  html += `<p style="margin:0 0 20px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#94a3b8;">No commitment required. Credits never expire once purchased.</p>`;

  html += emailDivider();

  // Don't miss section
  html += `<p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:700;color:${P};">Don't Let Leads Slip Away</p>`;
  html += emailParagraph("Families searching for treatment are making decisions <strong>right now</strong>. Every inquiry you don't respond to is a potential admission lost to another provider. With credits ready, you can unlock and contact leads the moment they reach out.");

  // Secondary CTAs
  html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
    <tr><td align="center">
      <a href="https://rehablookup.com/provider/listings" style="display:inline-block;background:${P};color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Complete My Listing</a>
    </td></tr>
  </table>`;

  html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;margin-bottom:8px;">
    <tr><td align="center">
      <a href="https://rehablookup.com/provider/dashboard" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:${P};text-decoration:underline;">View My Dashboard</a>
    </td></tr>
  </table>`;

  if (!isPro) {
    html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;margin-bottom:8px;">
      <tr><td align="center">
        <a href="https://rehablookup.com/provider/pro-upgrade" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:${PRO};font-weight:600;text-decoration:underline;">⭐ Upgrade to Pro for 20% off all unlocks</a>
      </td></tr>
    </table>`;
  }

  html += `<div style="height:12px;"></div>`;
  html += emailBodyEnd();
  html += emailFooter();
  html += emailEnd();

  return html;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST-only enforcement
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", code: "method_not_allowed", allowed: ["POST"] }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
      },
    );
  }


  const inboundReqId = req.headers.get("x-request-id")?.trim().slice(0, 64) || undefined;
  const log = createLogger("send-provider-welcome-offer-email", inboundReqId);
  const { shortId } = log;
  const idHeaders = { "x-request-id": shortId };

  try {
    log.info("started", { code: "request_received" });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      log.error("missing_resend_key", {
        code: "email_service_not_configured",
        reason: "RESEND_API_KEY env var is not set",
      });
      return new Response(
        JSON.stringify({ error: "Email service not configured", code: "email_service_not_configured", shortId }),
        { status: 500, headers: { ...corsHeaders, ...idHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (_e) {
      log.warn("invalid_json_body", { code: "invalid_json", reason: "Body is not valid JSON" });
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", code: "invalid_json", shortId }),
        { status: 400, headers: { ...corsHeaders, ...idHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = WelcomeOfferRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      log.warn("validation_failed", {
        code: "validation_error",
        reason: "Request payload failed schema validation",
        fieldErrors,
      });
      return new Response(
        JSON.stringify({
          error: "Invalid request payload",
          code: "validation_error",
          shortId,
          fieldErrors,
        }),
        { status: 400, headers: { ...corsHeaders, ...idHeaders, "Content-Type": "application/json" } },
      );
    }

    const { facilityId, facilityName, providerEmail, providerFirstName, selectedPlan, idempotencyKey }: WelcomeOfferRequest = parsed.data;

    const recipientCheck = checkRecipientEmail(providerEmail);
    if (!recipientCheck.ok) {
      log.warn("recipient_rejected", {
        code: "email_rejected",
        reason: recipientCheck.detail,
        rejectionReason: recipientCheck.reason,
        providerEmail,
        facilityId,
      });
      return new Response(
        JSON.stringify({
          error: recipientCheck.detail,
          code: "email_rejected",
          shortId,
          fieldErrors: { providerEmail: [recipientCheck.detail] },
          rejectionReason: recipientCheck.reason,
        }),
        { status: 400, headers: { ...corsHeaders, ...idHeaders, "Content-Type": "application/json" } },
      );
    }

    log.info("payload_validated", {
      code: "payload_ok",
      facilityId,
      facilityName,
      providerEmail,
      selectedPlan,
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const emailHtml = generateWelcomeOfferEmail(providerFirstName, facilityName, selectedPlan);

    const result = await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [providerEmail],
      subject: `🎁 ${providerFirstName}, your welcome credit offer is waiting — claim bonus credits now`,
      html: emailHtml,
    }, {
      emailType: "provider_welcome_offer",
      idempotencyKey: idempotencyKey || `welcome-offer-${facilityId}`,
      metadata: { facilityId, facilityName },
    });

    if (!result.success && !result.deduplicated) {
      const sendReason = typeof result.error === "string"
        ? result.error
        : (result.error as { message?: string } | undefined)?.message ?? "Unknown send error";
      log.error("welcome_offer_email_send_failed", {
        code: "email_send_failed",
        reason: sendReason,
        deadLettered: result.deadLettered ?? false,
        facilityId,
      });
      return new Response(
        JSON.stringify({
          error: "Failed to send welcome offer email",
          code: "email_send_failed",
          shortId,
          reason: sendReason,
          deadLettered: result.deadLettered ?? false,
        }),
        { status: 500, headers: { ...corsHeaders, ...idHeaders, "Content-Type": "application/json" } }
      );
    }

    log.info(
      result.deduplicated ? "welcome_offer_email_deduplicated" : "welcome_offer_email_sent",
      {
        code: result.deduplicated ? "email_deduplicated" : "email_sent",
        facilityId,
      },
    );
    return new Response(
      JSON.stringify({
        success: true,
        shortId,
        code: result.deduplicated ? "email_deduplicated" : "email_sent",
        deduplicated: result.deduplicated,
      }),
      { status: 200, headers: { ...corsHeaders, ...idHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("unhandled_exception", {
      code: "internal_error",
      reason: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(
      JSON.stringify({ error: errorMessage, code: "internal_error", shortId }),
      { status: 500, headers: { ...corsHeaders, ...idHeaders, "Content-Type": "application/json" } }
    );
  }
});
