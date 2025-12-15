import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  facilityId: string;
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
    const { facilityId, email }: VerificationRequest = await req.json();

    if (!facilityId) {
      return new Response(
        JSON.stringify({ error: "Facility ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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

    // Rate limit: max 3 codes per facility+email in 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("reply_email_verification_codes")
      .select("*", { count: "exact", head: true })
      .eq("facility_id", facilityId)
      .eq("email", normalizedEmail)
      .gte("created_at", oneHourAgo);

    if (count && count >= 3) {
      console.log(`Rate limit exceeded for facility ${facilityId}, email ${normalizedEmail}: ${count} attempts`);
      return new Response(
        JSON.stringify({ error: "Too many verification attempts. Please wait before trying again." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check cooldown: at least 60 seconds between sends
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentCode } = await supabase
      .from("reply_email_verification_codes")
      .select("created_at")
      .eq("facility_id", facilityId)
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .gte("created_at", sixtySecondsAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentCode) {
      return new Response(
        JSON.stringify({ error: "Please wait at least 60 seconds before requesting a new code." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Invalidate previous pending codes
    await supabase
      .from("reply_email_verification_codes")
      .update({ status: "expired" })
      .eq("facility_id", facilityId)
      .eq("email", normalizedEmail)
      .eq("status", "pending");

    // Generate new code with 10-minute expiry
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    console.log(`Generated reply email verification code for facility ${facilityId}, email ${normalizedEmail}`);

    // Store verification code
    const { error: insertError } = await supabase
      .from("reply_email_verification_codes")
      .insert({
        facility_id: facilityId,
        email: normalizedEmail,
        code,
        expires_at: expiresAt,
        attempts: 0,
        status: "pending",
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
      subject: "Verify your reply email for RehabLookup",
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
              <h1 style="color: #1B365D; font-size: 28px; margin: 0 0 8px 0;">Verify Your Reply Email</h1>
              <p style="color: #5E6B7A; font-size: 16px; margin: 0;">
                Enter this code in your provider settings to verify your reply email address
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
              Once verified, leads who respond to your emails will reach this address directly.
            </p>
            <p style="color: #9CA3AF; font-size: 12px; margin: 16px 0 0; text-align: center;">
              If you didn't request this verification, you can safely ignore this email.
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
      
      // Clean up the stored code
      await supabase
        .from("reply_email_verification_codes")
        .delete()
        .eq("facility_id", facilityId)
        .eq("email", normalizedEmail)
        .eq("code", code);
      
      return new Response(
        JSON.stringify({ error: "Failed to send verification email. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Verification email sent to ${normalizedEmail}, Resend ID: ${emailData?.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent to your email" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-reply-email-verification:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send verification code" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
