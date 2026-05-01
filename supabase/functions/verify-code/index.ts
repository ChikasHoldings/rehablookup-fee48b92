import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyRequest {
  email: string;
  code: string;
}

const MAX_ATTEMPTS = 5;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyRequest = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email and code are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.toString().trim();

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(normalizedCode)) {
      return new Response(
        JSON.stringify({ error: "Code must be 6 digits" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // First check if email was already verified recently (handle retries/double-clicks gracefully)
    // Use verified_at to distinguish actual verifications from invalidated codes
    const { data: recentlyVerified, error: recentlyVerifiedError } = await supabase
      .from("email_verification_codes")
      .select("id, verified, created_at, verified_at")
      .eq("email", normalizedEmail)
      .eq("verified", true)
      .not("verified_at", "is", null)
      .gte("verified_at", twentyFourHoursAgo)
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!recentlyVerifiedError && recentlyVerified) {
      console.log(`Email already verified (retry detected): ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ success: true, verified: true, alreadyVerified: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Find the MOST RECENT unverified, unexpired code for this email
    const { data: verificationRecord, error: fetchError } = await supabase
      .from("email_verification_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("verified", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching verification code:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to verify code. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // No valid code found - use consistent error message to prevent email enumeration
    // This prevents attackers from determining if an email exists in the system
    if (!verificationRecord) {
      // Log internally for debugging but return generic message
      console.log(`No valid verification code found for email: ${normalizedEmail.substring(0, 3)}***`);
      
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification code. Please request a new code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check attempt limit
    const attempts = verificationRecord.attempts || 0;
    if (attempts >= MAX_ATTEMPTS) {
      // Mark code as expired due to too many attempts
      await supabase
        .from("email_verification_codes")
        .update({ expires_at: new Date().toISOString() })
        .eq("id", verificationRecord.id);

      return new Response(
        JSON.stringify({ error: "Too many incorrect attempts. Please request a new code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Compare codes (string comparison)
    if (verificationRecord.code !== normalizedCode) {
      // Increment attempt count
      await supabase
        .from("email_verification_codes")
        .update({ attempts: attempts + 1 })
        .eq("id", verificationRecord.id);

      const remainingAttempts = MAX_ATTEMPTS - attempts - 1;
      const errorMessage = remainingAttempts > 0
        ? `Invalid code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
        : "Invalid code. Too many incorrect attempts. Please request a new code.";

      // Log without exposing codes for security
      console.log(`Invalid code attempt for ${normalizedEmail.substring(0, 3)}***: attempt ${attempts + 1}/${MAX_ATTEMPTS}`);

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Code matches! Mark as verified with timestamp
    const { error: updateError } = await supabase
      .from("email_verification_codes")
      .update({ 
        verified: true,
        verified_at: new Date().toISOString() // Track actual verification time
      })
      .eq("id", verificationRecord.id);

    if (updateError) {
      console.error("Error marking code as verified:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to verify code. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Email verified successfully: ${normalizedEmail}`);

    return new Response(
      JSON.stringify({ success: true, verified: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-code:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to verify code" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
