import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyRequest {
  facilityId: string;
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { facilityId, email, code }: VerifyRequest = await req.json();

    if (!facilityId || !email || !code) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the latest pending verification code
    const { data: verificationRecord, error: fetchError } = await supabase
      .from("reply_email_verification_codes")
      .select("*")
      .eq("facility_id", facilityId)
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching verification record:", fetchError);
      return new Response(
        JSON.stringify({ error: "Verification failed. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!verificationRecord) {
      return new Response(
        JSON.stringify({ error: "No pending verification found. Please request a new code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if expired
    if (new Date(verificationRecord.expires_at) < new Date()) {
      await supabase
        .from("reply_email_verification_codes")
        .update({ status: "expired" })
        .eq("id", verificationRecord.id);

      return new Response(
        JSON.stringify({ error: "Verification code has expired. Please request a new code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check attempt limit (max 5 attempts)
    if (verificationRecord.attempts >= 5) {
      await supabase
        .from("reply_email_verification_codes")
        .update({ status: "expired" })
        .eq("id", verificationRecord.id);

      return new Response(
        JSON.stringify({ error: "Too many incorrect attempts. Please request a new code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Increment attempts
    await supabase
      .from("reply_email_verification_codes")
      .update({ attempts: verificationRecord.attempts + 1 })
      .eq("id", verificationRecord.id);

    // Verify code
    if (verificationRecord.code !== normalizedCode) {
      const remainingAttempts = 5 - (verificationRecord.attempts + 1);
      return new Response(
        JSON.stringify({ 
          error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.` 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Code is valid - update verification record
    await supabase
      .from("reply_email_verification_codes")
      .update({ status: "verified" })
      .eq("id", verificationRecord.id);

    // Update facility with verified reply email
    const { error: updateError } = await supabase
      .from("facilities")
      .update({ 
        reply_email: normalizedEmail,
        reply_email_verified: true,
        reply_email_verified_at: new Date().toISOString()
      })
      .eq("id", facilityId);

    if (updateError) {
      console.error("Error updating facility:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update facility. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Reply email verified for facility ${facilityId}: ${normalizedEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: "Reply email verified successfully!" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-reply-email-code:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Verification failed" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
