// ============================================================================
// send-verification-code v2.0.0
// ----------------------------------------------------------------------------
// Sends a 6-digit OTP for email verification. Scoped by `purpose` so signup
// codes and password-reset codes never collide — invalidating previous codes
// only touches rows with the same purpose.
//
// Body: { email, purpose? = 'signup' }
// Allowed purpose values are enforced by the email_verification_codes_purpose_check
// constraint (see migration 20260612000000_expand_email_verification_codes_purpose).
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";

const VERSION = "2.0.0";
const OTP_TTL_MIN = 10;
const MAX_PER_10MIN = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function emailHtml(code: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:#1B365D;padding:36px 32px;text-align:center;">
<p style="margin:0 0 4px 0;font-size:11px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1.5px;">REHABLOOKUP</p>
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Verify your email</h1></td></tr>
<tr><td style="padding:36px 32px;text-align:center;">
<p style="margin:0 0 24px 0;color:#374151;font-size:15px;line-height:1.6;">Enter this 6-digit code to continue.</p>
<div style="display:inline-block;padding:18px 28px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
<p style="margin:0;font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#1B365D;">${code}</p></div>
<p style="margin:24px 0 0 0;color:#6b7280;font-size:13px;">Expires in <strong>10 minutes</strong>. If you didn't request this, ignore this email.</p></td></tr>
<tr><td style="background:#1B365D;padding:18px;text-align:center;">
<p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;">© ${new Date().getFullYear()} RehabLookup</p></td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const email = String((body as { email?: string }).email ?? "").toLowerCase().trim();
    const purpose = String((body as { purpose?: string }).purpose ?? "signup");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate-limit per (email, purpose) so signup vs reset have independent budgets.
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("email_verification_codes")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("purpose", purpose)
      .gte("created_at", tenMinAgo);

    if ((count ?? 0) >= MAX_PER_10MIN) {
      return new Response(JSON.stringify({ error: "Too many attempts. Please wait 10 minutes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Invalidate previous unused codes for THIS purpose only.
    await supabase
      .from("email_verification_codes")
      .update({ expires_at: new Date().toISOString() })
      .eq("email", email)
      .eq("purpose", purpose)
      .eq("verified", false);

    const code = generateCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from("email_verification_codes")
      .insert({
        email,
        code,
        expires_at: expiresAt,
        verified: false,
        attempts: 0,
        purpose,
      });

    if (insertError) {
      console.error("[SEND-VERIFICATION-CODE] insert failed", insertError.message);
      return new Response(JSON.stringify({ error: "Failed to create verification code" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const resend = new Resend(resendApiKey);
      // deno-lint-ignore no-explicit-any
      const { error: sendErr } = await (resend.emails as any).send({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: [email],
        subject: `${code} is your verification code`,
        html: emailHtml(code),
      });
      if (sendErr) {
        console.error("[SEND-VERIFICATION-CODE] resend error", sendErr);
        await supabase
          .from("email_verification_codes")
          .delete()
          .eq("email", email)
          .eq("code", code);
        const msg = String(sendErr?.message ?? sendErr).toLowerCase();
        let userMessage = "Unable to send verification email. Please check your email address and try again.";
        let errorCode = "SEND_FAILED";
        if (msg.includes("verify a domain") || msg.includes("validation_error")) {
          userMessage = "Our email service needs configuration. Please contact support or try again in a few minutes.";
          errorCode = "DOMAIN_NOT_VERIFIED";
        } else if (msg.includes("rate limit") || msg.includes("too many")) {
          userMessage = "Too many emails sent. Please wait a few minutes before trying again.";
          errorCode = "RATE_LIMITED";
        } else if (msg.includes("blocked") || msg.includes("spam")) {
          userMessage = "This email address cannot receive messages. Please use a different email.";
          errorCode = "EMAIL_BLOCKED";
        }
        return new Response(JSON.stringify({ error: userMessage, errorCode }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (sendThrow) {
      console.error("[SEND-VERIFICATION-CODE] resend threw", String(sendThrow));
      return new Response(JSON.stringify({ error: "Unable to send verification email", errorCode: "SEND_FAILED" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent", _version: VERSION }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[SEND-VERIFICATION-CODE] unhandled", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "Failed to send verification code" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
