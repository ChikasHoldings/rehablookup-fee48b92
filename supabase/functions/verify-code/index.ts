import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Find the MOST RECENT unverified, unexpired code for this email
    const now = new Date().toISOString();
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

      console.log(`Invalid code attempt for ${normalizedEmail}: expected ${verificationRecord.code.substring(0, 2)}****, got ${normalizedCode.substring(0, 2)}****`);

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Code matches! Mark as verified
    const { error: updateError } = await supabase
      .from("email_verification_codes")
      .update({ verified: true })
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

serve(handler);
