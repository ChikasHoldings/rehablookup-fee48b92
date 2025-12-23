import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, code, userId, userType } = await req.json();

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: "Phone and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
      console.error("Error fetching verification code:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to verify code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!verificationCode) {
      return new Response(
        JSON.stringify({ error: "No valid verification code found. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max attempts (5 attempts allowed)
    if (verificationCode.attempts >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many failed attempts. Please request a new code." }),
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
      return new Response(
        JSON.stringify({ 
          error: `Invalid code. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining.` : 'Please request a new code.'}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
          console.error("Error updating seeker profile:", updateError);
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
          console.error("Error updating provider profile:", updateError);
        }
      }
    }

    // Clean up old verification codes for this phone
    await supabase
      .from("phone_verification_codes")
      .delete()
      .eq("phone", phone)
      .neq("id", verificationCode.id);

    console.log("Phone verified successfully:", phone);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Phone number verified successfully",
        verified: true
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in verify-sms-code:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
