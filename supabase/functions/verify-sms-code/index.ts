import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

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

    // Profile writes key off the JWT-authenticated id, never a
    // body-supplied userId. Anon callers (seeker-intake pre-signup)
    // still verify the code but skip the profile write.
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userRes?.user?.id) {
        logStep("Invalid auth token", { requestId, error: userErr?.message });
        return new Response(
          JSON.stringify({ error: "Invalid authentication", requestId }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      userId = userRes.user.id;
    }

    const { phone, code, userType } = body;

    if (!phone || !code) {
      logStep("Missing required fields", { requestId, hasPhone: !!phone, hasCode: !!code });
      return new Response(
        JSON.stringify({ error: "Phone and code are required", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: max 10 SMS code verification attempts per phone per 15 minutes
    const normalizedPhone = (phone || "").replace(/\D/g, "");
    if (normalizedPhone) {
      const rateLimitResult = await checkRateLimit(supabase, {
        identifier: `phone:${normalizedPhone}`,
        actionType: 'verify_sms_code',
        maxAttempts: 10,
        windowMinutes: 15,
      });
      if (!rateLimitResult.allowed) {
        return rateLimitResponse(corsHeaders);
      }
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

    // Find the verification code
    const { data: verificationCode, error: fetchError } = await supabase
      .from("phone_verification_codes")
      .select("id, code, attempts, expires_at, created_at")
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

    // Anti-abuse: a phone that's already verified on a DIFFERENT
    // account can't be re-verified onto this one. Spec §6:
    // "Block reuse of a phone already verified on another account."
    // We check provider profiles + seeker profiles so the rule
    // applies across user types.
    if (userId) {
      const conflictTable = userType === "seeker" ? "seeker_profiles" : "profiles";
      const { data: conflictRow } = await supabase
        .from(conflictTable)
        .select("user_id")
        .eq("phone", phone)
        .not("phone_verified_at", "is", null)
        .neq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (conflictRow) {
        logStep("Phone already verified on another account", { requestId });
        return new Response(
          JSON.stringify({
            error: "This phone number is already verified on another account. Use a different number or contact support.",
            requestId,
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

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
