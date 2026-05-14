import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.1.0";

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

    if (authError || !user || !user.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { inquiryId, userId } = body as { inquiryId?: string; userId?: string };

    if (userId && userId !== user.id) {
      logStep("User mismatch", { requestedUserId: userId, authUserId: user.id });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const normalizedEmail = user.email.toLowerCase();

    // ──────────────────────────────────────────────
    // Single-link mode (backward compatible): caller passes inquiryId
    // ──────────────────────────────────────────────
    if (inquiryId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(inquiryId)) {
        return new Response(JSON.stringify({ error: "Invalid inquiry ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      if (inquiry.user_email.toLowerCase() !== normalizedEmail) {
        return new Response(JSON.stringify({ error: "Email does not match inquiry" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (inquiry.user_id && inquiry.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Inquiry already linked" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabaseAdmin
        .from("concierge_inquiries")
        .update({ user_id: user.id })
        .eq("id", inquiryId);

      if (updateError) {
        logStep("Failed to link inquiry", { error: updateError.message });
        throw new Error("Failed to link inquiry");
      }

      logStep("Inquiry linked successfully", { inquiryId, userId: user.id });
      return new Response(JSON.stringify({ success: true, linked: { concierge_inquiries: 1 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ──────────────────────────────────────────────
    // Bulk-link mode: link every matching unowned row across all seeker-side
    // tables to this user by email match.
    // ──────────────────────────────────────────────
    const result = { concierge_inquiries: 0, international_placement_cases: 0, insurance_verification_requests: 0 };

    const { data: conciergeRows, error: conciergeErr } = await supabaseAdmin
      .from("concierge_inquiries")
      .update({ user_id: user.id })
      .ilike("user_email", normalizedEmail)
      .is("user_id", null)
      .select("id");
    if (conciergeErr) {
      logStep("concierge_inquiries link error", { error: conciergeErr.message });
    } else {
      result.concierge_inquiries = conciergeRows?.length || 0;
    }

    const { data: intlRows, error: intlErr } = await supabaseAdmin
      .from("international_placement_cases")
      .update({ user_id: user.id })
      .ilike("client_email", normalizedEmail)
      .is("user_id", null)
      .select("id");
    if (intlErr) {
      logStep("international_placement_cases link error", { error: intlErr.message });
    } else {
      result.international_placement_cases = intlRows?.length || 0;
    }

    const { data: vobRows, error: vobErr } = await supabaseAdmin
      .from("insurance_verification_requests")
      .update({ linked_user_id: user.id })
      .ilike("email", normalizedEmail)
      .is("linked_user_id", null)
      .select("id");
    if (vobErr) {
      logStep("insurance_verification_requests link error", { error: vobErr.message });
    } else {
      result.insurance_verification_requests = vobRows?.length || 0;
    }

    logStep("Bulk link complete", { userId: user.id, ...result });

    return new Response(JSON.stringify({ success: true, linked: result }), {
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
