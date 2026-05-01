import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CheckRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: CheckRequest = await req.json();

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

    // Check for a recently verified email (within last 24 hours)
    // Use verified_at to distinguish actual verifications from invalidated codes
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: verifiedRecord, error: fetchError } = await supabase
      .from("email_verification_codes")
      .select("id, verified, created_at, verified_at")
      .eq("email", normalizedEmail)
      .eq("verified", true)
      .not("verified_at", "is", null) // Only count actual verifications, not invalidated codes
      .gte("verified_at", twentyFourHoursAgo) // Check verified_at, not created_at
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error checking email verification:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to check verification status" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isVerified = !!verifiedRecord;
    console.log(`Email verification check for ${normalizedEmail.substring(0, 3)}***: ${isVerified ? 'verified' : 'not verified'}`);

    return new Response(
      JSON.stringify({ verified: isVerified }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in check-email-verified:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to check email status" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
