import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SMS-VERIFICATION-VERIFY] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { requestId });

    // Validate environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("Missing Supabase credentials", { requestId });
      return new Response(
        JSON.stringify({ error: "Server configuration error", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    let body: { phone?: string; code?: string; userId?: string; userType?: string };
    try {
      body = await req.json();
    } catch {
      logStep("Invalid JSON body", { requestId });
      return new Response(
        JSON.stringify({ error: "Invalid request body", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { phone, code, userId, userType } = body;

    if (!phone || !code) {
      logStep("Missing required fields", { requestId, hasPhone: !!phone, hasCode: !!code });
      return new Response(
        JSON.stringify({ error: "Phone and code are required", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      logStep("Invalid code format", { requestId });
      return new Response(
        JSON.stringify({ error: "Invalid code format. Must be 6 digits.", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Processing verification", { requestId, userType: userType || "unknown", hasUserId: !!userId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the verification code
    const { data: verificationCode, error: fetchError } = await supabase
      .from("phone_verification_codes")
      .select("*")
      .eq("phone", phone)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      logStep("Error fetching verification code", { requestId, error: fetchError.message });
      return new Response(
        JSON.stringify({ error: "Failed to verify code", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!verificationCode) {
      logStep("No valid verification code found", { requestId });
      return new Response(
        JSON.stringify({ error: "No valid verification code found. Please request a new one.", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max attempts (5 attempts allowed)
    if (verificationCode.attempts >= 5) {
      logStep("Too many failed attempts", { requestId, attempts: verificationCode.attempts });
      return new Response(
        JSON.stringify({ error: "Too many failed attempts. Please request a new code.", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment attempts
    await supabase
      .from("phone_verification_codes")
      .update({ attempts: verificationCode.attempts + 1 })
      .eq("id", verificationCode.id);

    // Verify the code
    if (verificationCode.code !== code) {
      const remainingAttempts = 4 - verificationCode.attempts;
      logStep("Invalid code provided", { requestId, remainingAttempts });
      return new Response(
        JSON.stringify({ 
          error: `Invalid code. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining.` : 'Please request a new code.'}`,
          requestId
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Code verified successfully", { requestId });

    // Mark code as verified
    await supabase
      .from("phone_verification_codes")
      .update({ verified: true })
      .eq("id", verificationCode.id);

    // Update user profile if userId is provided
    if (userId) {
      const now = new Date().toISOString();
      
      if (userType === "seeker") {
        const { error: updateError } = await supabase
          .from("seeker_profiles")
          .update({ 
            phone_verified: true, 
            phone_verified_at: now,
            phone: phone 
          })
          .eq("user_id", userId);

        if (updateError) {
          logStep("Error updating seeker profile", { requestId, error: updateError.message });
        } else {
          logStep("Seeker profile updated", { requestId });
        }
      } else if (userType === "provider") {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ 
            phone_verified: true, 
            phone_verified_at: now,
            phone: phone 
          })
          .eq("user_id", userId);

        if (updateError) {
          logStep("Error updating provider profile", { requestId, error: updateError.message });
        } else {
          logStep("Provider profile updated", { requestId });
        }
      }
    }

    // Clean up old verification codes for this phone
    const { error: cleanupError } = await supabase
      .from("phone_verification_codes")
      .delete()
      .eq("phone", phone)
      .neq("id", verificationCode.id);

    if (cleanupError) {
      logStep("Error cleaning up old codes", { requestId, error: cleanupError.message });
    }

    logStep("Verification complete", { requestId });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Phone number verified successfully",
        verified: true,
        requestId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logStep("Unexpected error", { requestId, error: error instanceof Error ? error.message : "Unknown error" });
    return new Response(
      JSON.stringify({ error: "Internal server error", requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
