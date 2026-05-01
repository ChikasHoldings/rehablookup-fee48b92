import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { createLogger } from "../_shared/structured-logger.ts";
import { checkRecipientEmail } from "../_shared/recipient-email-guard.ts";
import {
  WelcomeEmailRequestSchema,
  type WelcomeEmailRequest,
} from "../_shared/contracts/welcome-email-contracts.ts";
import {
  emailStart,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailGreeting,
  emailParagraph,
  proInsightsBox,
  ctaButton,
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

// WelcomeEmailRequest type imported from shared contracts.

const P = "#1B365D";
const GOLD = "#CDA223";
const PRO = "#7c3aed";

function btn(text: string, url: string, bg: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
    <tr><td align="center">
      <a href="${url}" style="display:inline-block;background:${bg};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${text}</a>
    </td></tr>
  </table>`;
}

function linkBtn(text: string, url: string, color: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
    <tr><td align="center">
      <a href="${url}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:${color};font-weight:600;text-decoration:underline;">${text}</a>
    </td></tr>
  </table>`;
}

function generateWelcomeEmail(
  providerFirstName: string,
  facilityName: string,
  selectedPlan: string
): string {
  const isPro = selectedPlan === "pro" || selectedPlan === "professional" || selectedPlan === "featured";
  const plan: PlanType = isPro ? "pro" : "free";

  let html = emailStart();
  html += emailHeader("Welcome to RehabLookup!", plan, {
    subtitle: "Your provider account is ready — start receiving inquiries today",
  });
  html += emailBodyStart();
  html += emailGreeting(providerFirstName);
  html += emailParagraph(`Thank you for registering <strong style="color:${P};">${facilityName}</strong> on RehabLookup. We connect treatment providers with families actively searching for care — and you're now part of that network.`);

  // How it works
  html += `<p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:700;color:${P};">How It Works</p>`;

  const steps = [
    { icon: "🏥", title: "List your facility", desc: "Showcase programs, services, and insurance accepted" },
    { icon: "📩", title: "Receive inquiries", desc: "Families contact you directly from your profile page" },
    { icon: "🔓", title: "Unlock leads", desc: "Use credits to view full contact details instantly" },
    { icon: "🤝", title: "Join placements", desc: "Opt in for pre-screened referrals from our concierge team" },
  ];

  html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">`;
  for (const s of steps) {
    html += `<tr><td style="padding:8px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:36px;vertical-align:top;font-size:20px;">${s.icon}</td>
        <td style="padding-left:10px;">
          <p style="margin:0 0 2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;color:${P};">${s.title}</p>
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#64748b;line-height:1.5;">${s.desc}</p>
        </td>
      </tr></table>
    </td></tr>`;
  }
  html += `</table>`;

  html += emailDivider();

  // Free vs Pro
  html += `<p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:700;color:${P};">Free vs Pro</p>`;

  const freeHighlight = !isPro ? `border:2px solid ${P};` : `border:1px solid #e2e8f0;`;
  const proHighlight = isPro ? `border:2px solid ${PRO};` : `border:1px solid #e2e8f0;`;
  const freeBg = !isPro ? "#f0f7ff" : "#f8fafc";
  const proBg = isPro ? "#faf5ff" : "#f8fafc";

  html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
    <td style="width:50%;vertical-align:top;padding-right:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${freeBg};${freeHighlight}border-radius:10px;">
        <tr><td style="padding:14px;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${P};">Free</p>
          <p style="margin:0 0 4px;font-size:12px;color:#475569;">✓ 1 facility listing</p>
          <p style="margin:0 0 4px;font-size:12px;color:#475569;">✓ Direct inquiries</p>
          <p style="margin:0 0 4px;font-size:12px;color:#475569;">✓ Placement network</p>
          <p style="margin:0;font-size:12px;color:#475569;">✓ Performance tracking</p>
        </td></tr>
      </table>
    </td>
    <td style="width:50%;vertical-align:top;padding-left:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${proBg};${proHighlight}border-radius:10px;">
        <tr><td style="padding:14px;">
          <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:${PRO};">⭐ Pro <span style="font-size:11px;font-weight:400;color:#64748b;">$399/mo</span></p>
          <p style="margin:0 0 8px;font-size:11px;color:#7c3aed;">Everything in Free, plus:</p>
          <p style="margin:0 0 4px;font-size:12px;color:#334155;font-weight:500;">✓ Up to 5 listings</p>
          <p style="margin:0 0 4px;font-size:12px;color:#334155;font-weight:500;">✓ 20% off lead unlocks</p>
          <p style="margin:0 0 4px;font-size:12px;color:#334155;font-weight:500;">✓ 20% off placement fees</p>
          <p style="margin:0;font-size:12px;color:#334155;font-weight:500;">✓ Featured & priority ranking</p>
        </td></tr>
      </table>
    </td>
  </tr></table>`;

  if (isPro) {
    html += proInsightsBox("Your Pro membership is active! Enjoy 20% off lead unlocks, up to 5 facility listings, featured placement, and priority visibility in search results.");
  }

  html += emailDivider();

  // Welcome credit offer
  html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef9e7;border:1px solid ${GOLD}50;border-radius:10px;margin-bottom:24px;">
    <tr><td style="padding:20px;">
      <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${P};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">🎁 Welcome Credit Offer</p>
      <p style="margin:0 0 14px;font-size:13px;color:#78350f;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Get <strong>bonus credits</strong> on your first top-up — limited-time offer for new providers. Use credits to unlock leads and connect with families faster.</p>
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="background:${GOLD};border-radius:8px;">
          <a href="https://rehablookup.com/provider/billing?purchase_credits=true" style="display:inline-block;padding:10px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Claim Welcome Credits →</a>
        </td>
      </tr></table>
    </td></tr>
  </table>`;

  // Pending review
  html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:0 10px 10px 0;margin-bottom:24px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#92400e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">⏳ Listing under review</p>
      <p style="margin:0;font-size:12px;color:#78350f;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">We'll review and approve your listing within 24–48 hours. You'll be notified once it's live.</p>
    </td></tr>
  </table>`;

  html += emailDivider();

  // CTAs
  html += `<p style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:700;color:${P};text-align:center;">Get Started</p>`;
  html += btn("Complete My Listing", "https://rehablookup.com/provider/listings", P);
  html += linkBtn("View My Dashboard", "https://rehablookup.com/provider/dashboard", P);

  if (!isPro) {
    html += linkBtn("⭐ Upgrade to Pro", "https://rehablookup.com/provider/pro-upgrade", PRO);
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
  const log = createLogger("send-provider-welcome-email", inboundReqId);
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

    const parsed = WelcomeEmailRequestSchema.safeParse(rawBody);
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

    const { facilityId, facilityName, providerEmail, providerFirstName, selectedPlan, idempotencyKey }: WelcomeEmailRequest = parsed.data;

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

    const emailHtml = generateWelcomeEmail(providerFirstName, facilityName, selectedPlan);
    const isPro = selectedPlan === "pro" || selectedPlan === "professional" || selectedPlan === "featured";

    const result = await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [providerEmail],
      subject: `${isPro ? "⭐ " : ""}Welcome to RehabLookup, ${providerFirstName} — your provider account is ready!`,
      html: emailHtml,
    }, {
      emailType: "provider_welcome",
      idempotencyKey: idempotencyKey || `welcome-${facilityId}`,
      metadata: { facilityId, facilityName },
    });

    if (result.deduplicated) {
      log.info("welcome_email_deduplicated", {
        code: "email_deduplicated",
        reason: "Duplicate idempotencyKey suppressed by sender",
        facilityId,
      });
    } else if (result.success) {
      log.info("welcome_email_sent", {
        code: "email_sent",
        facilityId,
      });
    } else {
      const sendReason = typeof result.error === "string"
        ? result.error
        : (result.error as { message?: string } | undefined)?.message ?? "Unknown send error";
      log.error("welcome_email_send_failed", {
        code: "email_send_failed",
        reason: sendReason,
        deadLettered: result.deadLettered ?? false,
        facilityId,
      });
      return new Response(
        JSON.stringify({
          error: "Failed to send welcome email",
          code: "email_send_failed",
          shortId,
          reason: sendReason,
          deadLettered: result.deadLettered ?? false,
        }),
        { status: 500, headers: { ...corsHeaders, ...idHeaders, "Content-Type": "application/json" } }
      );
    }

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
