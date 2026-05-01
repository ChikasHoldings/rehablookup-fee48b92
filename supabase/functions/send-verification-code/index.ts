import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerificationRequest {
  email: string;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const { email }: VerificationRequest = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("email_verification_codes")
      .select("*", { count: "exact", head: true })
      .eq("email", normalizedEmail)
      .gte("created_at", tenMinutesAgo);

    if (count && count >= 3) {
      console.log(`Rate limit exceeded for ${normalizedEmail}: ${count} attempts`);
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please wait 10 minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invalidate previous codes by expiring them (NOT by setting verified: true)
    const { error: invalidateError } = await supabase
      .from("email_verification_codes")
      .update({ 
        expires_at: new Date().toISOString()
      })
      .eq("email", normalizedEmail)
      .eq("verified", false);

    if (invalidateError) {
      console.warn("Failed to invalidate previous codes:", invalidateError);
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Log without exposing code for security
    console.log(`Generated verification code for ${normalizedEmail.substring(0, 3)}***`);

    const { error: insertError } = await supabase
      .from("email_verification_codes")
      .insert({
        email: normalizedEmail,
        code,
        expires_at: expiresAt,
        verified: false,
        attempts: 0,
      });

    if (insertError) {
      console.error("Failed to store verification code:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create verification code. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { emailId: emailData, error: emailError } = await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [normalizedEmail],
      subject: `${code} is your verification code`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; font-family: Arial, Helvetica, sans-serif;">
                Verify Your Email
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px; background-color: #ffffff;">
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; text-align: center; line-height: 1.6;">
                Enter this code to continue with your account setup:
              </p>
              
              <!-- Code Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 28px 20px; text-align: center;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 700; letter-spacing: 8px; color: #1B365D;">${code}</span>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.5;">
                This code will expire in <strong style="color: #374151;">10 minutes</strong>.
              </p>
              <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.5;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 24px 32px;">
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
    }, {
      emailType: "verification_code",
      idempotencyKey: `verify-code-${normalizedEmail}-${code}`,
    });

    if (emailError) {
      console.error("Failed to send verification email:", emailError);
      
      // Clean up the stored code since email failed
      await supabase
        .from("email_verification_codes")
        .delete()
        .eq("email", normalizedEmail)
        .eq("code", code);
      
      const errorMessage = emailError || JSON.stringify(emailError);
      
      let userMessage: string;
      let errorCode: string;
      
      if (errorMessage.includes("verify a domain") || errorMessage.includes("validation_error")) {
        userMessage = "Our email service needs configuration. Please contact support or try again in a few minutes.";
        errorCode = "DOMAIN_NOT_VERIFIED";
      } else if (errorMessage.includes("rate limit") || errorMessage.includes("too many")) {
        userMessage = "Too many emails sent. Please wait a few minutes before trying again.";
        errorCode = "RATE_LIMITED";
      } else if (errorMessage.includes("invalid") && errorMessage.includes("email")) {
        userMessage = "This email address appears to be invalid. Please check and try again.";
        errorCode = "INVALID_EMAIL";
      } else if (errorMessage.includes("blocked") || errorMessage.includes("spam")) {
        userMessage = "This email address cannot receive messages. Please use a different email.";
        errorCode = "EMAIL_BLOCKED";
      } else {
        userMessage = "Unable to send verification email. Please check your email address and try again.";
        errorCode = "SEND_FAILED";
      }
      
      return new Response(
        JSON.stringify({ 
          error: userMessage,
          errorCode,
          retryable: errorCode !== "INVALID_EMAIL" && errorCode !== "EMAIL_BLOCKED"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Verification code sent to ${normalizedEmail}, Resend ID: ${emailData}`);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-verification-code:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send verification code" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
