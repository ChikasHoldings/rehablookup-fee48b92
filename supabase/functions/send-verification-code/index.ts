import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  email: string;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);
    const { email }: VerificationRequest = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { error: invalidateError } = await supabase
      .from("email_verification_codes")
      .update({ 
        verified: true,
        expires_at: new Date().toISOString()
      })
      .eq("email", normalizedEmail)
      .eq("verified", false);

    if (invalidateError) {
      console.warn("Failed to invalidate previous codes:", invalidateError);
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    console.log(`Generated code for ${normalizedEmail}: ${code.substring(0, 2)}****`);

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
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [normalizedEmail],
      subject: `${code} is your verification code`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f8fb; padding: 40px 20px; margin: 0;">
  <div style="max-width: 420px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <div style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 28px; text-align: center;">
      <h1 style="color: #fff; font-size: 20px; margin: 0; font-weight: 600;">Verify Your Email</h1>
    </div>
    
    <div style="padding: 32px;">
      <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0; text-align: center;">
        Enter this code to continue:
      </p>
      
      <div style="background: #f1f5f9; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1B365D; font-family: 'Courier New', monospace;">${code}</span>
      </div>
      
      <p style="color: #94a3b8; font-size: 13px; margin: 0; text-align: center;">
        This code expires in 10 minutes
      </p>
    </div>
    
    <div style="background: #1B365D; padding: 20px; border-radius: 0 0 12px 12px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #fff; text-align: center;">RehabLookup</p>
      <p style="margin: 0 0 12px 0; font-size: 11px; color: rgba(255,255,255,0.7); text-align: center;">Connecting families with trusted treatment providers</p>
      <p style="color: rgba(255,255,255,0.5); font-size: 10px; margin: 0; text-align: center;">
        Didn't request this? Just ignore this email.
      </p>
    </div>
  </div>
</body>
</html>
      `,
    });

    if (emailError) {
      console.error("Failed to send verification email:", emailError);
      
      // Clean up the stored code since email failed
      await supabase
        .from("email_verification_codes")
        .delete()
        .eq("email", normalizedEmail)
        .eq("code", code);
      
      const errorMessage = emailError.message || JSON.stringify(emailError);
      
      // Categorize error types for better user messaging
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
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Verification code sent to ${normalizedEmail}, Resend ID: ${emailData?.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-verification-code:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send verification code" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
