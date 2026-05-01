import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SMS-VERIFICATION-SEND] ${step}${detailsStr}`);
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
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("Missing Supabase credentials", { requestId });
      return new Response(
        JSON.stringify({ error: "Server configuration error", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      logStep("Twilio credentials not configured", { requestId });
      return new Response(
        JSON.stringify({ error: "SMS service not configured", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    let body: { phone?: string; userType?: string };
    try {
      body = await req.json();
    } catch {
      logStep("Invalid JSON body", { requestId });
      return new Response(
        JSON.stringify({ error: "Invalid request body", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { phone, userType } = body;

    if (!phone) {
      logStep("Missing phone number", { requestId });
      return new Response(
        JSON.stringify({ error: "Phone number is required", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format (E.164 format: +1XXXXXXXXXX)
    const phoneRegex = /^\+1\d{10}$/;
    if (!phoneRegex.test(phone)) {
      logStep("Invalid phone format", { requestId, phone: phone.slice(0, 4) + "..." });
      return new Response(
        JSON.stringify({ error: "Invalid phone format. Use E.164 format: +1XXXXXXXXXX", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Processing verification request", { requestId, userType: userType || "unknown" });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: Check recent attempts (max 3 per 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentCodes, error: countError } = await supabase
      .from("phone_verification_codes")
      .select("id")
      .eq("phone", phone)
      .gte("created_at", tenMinutesAgo);

    if (countError) {
      logStep("Error checking rate limit", { requestId, error: countError.message });
    }

    if (recentCodes && recentCodes.length >= 3) {
      logStep("Rate limit exceeded", { requestId, attempts: recentCodes.length });
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait 10 minutes before trying again.", requestId }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store verification code
    const { error: insertError } = await supabase
      .from("phone_verification_codes")
      .insert({
        phone,
        code,
        expires_at: expiresAt,
        verified: false,
        attempts: 0,
      });

    if (insertError) {
      logStep("Error storing verification code", { requestId, error: insertError.message });
      return new Response(
        JSON.stringify({ error: "Failed to create verification code", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Verification code created", { requestId, expiresAt });

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const messageBody = `Your RehabLookup verification code is: ${code}. This code expires in 10 minutes. Do not share this code.`;

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        From: twilioPhoneNumber,
        Body: messageBody,
      }),
    });

    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.text();
      logStep("Twilio API error", { requestId, status: twilioResponse.status, error: twilioError.slice(0, 200) });
      
      // Clean up the verification code since SMS failed
      await supabase
        .from("phone_verification_codes")
        .delete()
        .eq("phone", phone)
        .eq("code", code);

      return new Response(
        JSON.stringify({ error: "Failed to send SMS. Please try again.", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twilioResult = await twilioResponse.json();
    logStep("SMS sent successfully", { requestId, messageId: twilioResult.sid });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification code sent",
        expiresAt,
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
