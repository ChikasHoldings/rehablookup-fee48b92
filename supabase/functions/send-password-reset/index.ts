import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, redirectTo } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit: max 3 resets per email per 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("email_verification_codes")
      .select("*", { count: "exact", head: true })
      .eq("email", `reset:${normalizedEmail}`)
      .gte("created_at", fifteenMinutesAgo);

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many reset attempts. Please wait 15 minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate the actual Supabase password reset link using admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: {
        redirectTo: redirectTo || "https://rehablookup.com/reset-password",
      },
    });

    if (linkError) {
      console.error("Generate link error:", linkError);
      // Don't reveal whether user exists - always show success
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resetLink = linkData?.properties?.action_link;

    if (!resetLink) {
      console.error("No action_link returned");
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Track the reset request for rate limiting
    await supabase.from("email_verification_codes").insert({
      email: `reset:${normalizedEmail}`,
      code: "000000",
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      verified: false,
      attempts: 0,
    });

    const resend = new Resend(resendApiKey);

    const { error: emailError } = await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [normalizedEmail],
      subject: "Reset your password",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1B365D; padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; font-family: Arial, Helvetica, sans-serif;">
                Reset Your Password
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px; background-color: #ffffff;">
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; text-align: center; line-height: 1.6;">
                We received a request to reset your password. Click the button below to choose a new one.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; background-color: #1B365D; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-family: Arial, Helvetica, sans-serif;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.5;">
                This link will expire in <strong style="color: #374151;">1 hour</strong>.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.5;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
              
              <!-- Fallback Link -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                      Button not working? Copy this link:
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #1B365D; word-break: break-all; line-height: 1.4;">
                      ${resetLink}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1B365D; padding: 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <p style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
                      RehabLookup
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 13px; color: #cbd5e1; font-family: Arial, Helvetica, sans-serif; line-height: 1.5;">
                      Connecting families with trusted treatment providers
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    }, { emailType: "password_reset" });

    if (emailError) {
      console.error("Resend email error:", emailError);
    }

    console.log(`Password reset email sent to ${normalizedEmail.substring(0, 3)}*** via Resend v${VERSION}`);

    // Always return success to prevent email enumeration
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset:", error);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
