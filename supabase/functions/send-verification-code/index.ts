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

    // Check rate limit - max 3 codes per email in 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("email_verification_codes")
      .select("*", { count: "exact", head: true })
      .eq("email", normalizedEmail)
      .gte("created_at", tenMinutesAgo);

    if (count && count >= 3) {
      console.log(`Rate limit exceeded for ${normalizedEmail}: ${count} attempts`);
      return new Response(
        JSON.stringify({ error: "Too many verification attempts. Please wait 10 minutes." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // IMPORTANT: Invalidate ALL previous unverified codes for this email
    // This prevents code mismatch errors when user requests a new code
    const { error: invalidateError } = await supabase
      .from("email_verification_codes")
      .update({ 
        verified: true, // Mark as used so they can't be verified
        expires_at: new Date().toISOString() // Also expire them
      })
      .eq("email", normalizedEmail)
      .eq("verified", false);

    if (invalidateError) {
      console.warn("Failed to invalidate previous codes:", invalidateError);
      // Continue anyway - not critical
    }

    // Generate new code and expiry (10 minutes)
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    console.log(`Generated code for ${normalizedEmail}: ${code.substring(0, 2)}****`);

    // Store new verification code
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

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "RehabLookup <onboarding@resend.dev>",
      to: [normalizedEmail],
      subject: "Your RehabLookup Verification Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f8fb; padding: 40px 20px; margin: 0;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1B365D; font-size: 28px; margin: 0 0 8px 0;">Verify Your Email</h1>
              <p style="color: #5E6B7A; font-size: 16px; margin: 0;">
                Enter this code to complete your help request
              </p>
            </div>
            <div style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 42px; font-weight: 700; letter-spacing: 10px; color: #ffffff; font-family: 'Courier New', monospace;">${code}</span>
            </div>
            <div style="background: #FEF3C7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #92400E; font-size: 14px; margin: 0; text-align: center;">
                ⏱️ This code expires in <strong>10 minutes</strong>
              </p>
            </div>
            <p style="color: #5E6B7A; font-size: 14px; margin: 0; text-align: center;">
              If you didn't request this code, you can safely ignore this email.
            </p>
          </div>
          <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 24px;">
            © ${new Date().getFullYear()} RehabLookup.com — Helping people find treatment
          </p>
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
      
      // Check if it's a domain verification issue
      const errorMessage = emailError.message || JSON.stringify(emailError);
      const isDomainIssue = errorMessage.includes("verify a domain") || errorMessage.includes("validation_error");
      
      const userMessage = isDomainIssue 
        ? "Email service is being configured. Please try again later or use a different contact method."
        : "Failed to send verification email. Please check your email address and try again.";
      
      return new Response(
        JSON.stringify({ error: userMessage }),
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
