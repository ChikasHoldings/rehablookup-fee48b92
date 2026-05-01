import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[LINK-INQUIRY-TO-USER v${VERSION}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Missing required environment variables");
    }

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { inquiryId, userId } = await req.json();

    // Validate that the requesting user matches the userId
    if (userId !== user.id) {
      logStep("User mismatch", { requestedUserId: userId, authUserId: user.id });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!inquiryId || !uuidRegex.test(inquiryId)) {
      return new Response(JSON.stringify({ error: "Invalid inquiry ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the inquiry belongs to this user's email
    const { data: inquiry } = await supabaseAdmin
      .from("concierge_inquiries")
      .select("id, user_email, user_id")
      .eq("id", inquiryId)
      .maybeSingle();

    if (!inquiry) {
      return new Response(JSON.stringify({ error: "Inquiry not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only link if the inquiry email matches the user email
    if (inquiry.user_email.toLowerCase() !== user.email?.toLowerCase()) {
      logStep("Email mismatch - cannot link", { 
        inquiryEmail: inquiry.user_email, 
        userEmail: user.email 
      });
      return new Response(JSON.stringify({ error: "Email does not match inquiry" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only update if not already linked to a different user
    if (inquiry.user_id && inquiry.user_id !== user.id) {
      logStep("Inquiry already linked to different user");
      return new Response(JSON.stringify({ error: "Inquiry already linked" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Link the inquiry
    const { error: updateError } = await supabaseAdmin
      .from("concierge_inquiries")
      .update({ user_id: user.id })
      .eq("id", inquiryId);

    if (updateError) {
      logStep("Failed to link inquiry", { error: updateError.message });
      throw new Error("Failed to link inquiry");
    }

    logStep("Inquiry linked successfully", { inquiryId, userId: user.id });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
