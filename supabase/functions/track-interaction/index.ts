import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BODY_SIZE = 5000;

const isValidUUID = (str: unknown): boolean =>
  typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[TRACK-INTERACTION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST-only
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep("Function started");

    // Body size limit
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_SIZE) {
      return new Response(JSON.stringify({ error: "Request too large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const facilityId = body.facilityId;
    const interactionType = body.interactionType;

    // Validate facilityId is a valid UUID
    if (!isValidUUID(facilityId)) {
      return new Response(JSON.stringify({ error: "Invalid facilityId format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate interactionType against whitelist
    if (!interactionType || !["call", "website"].includes(String(interactionType))) {
      return new Response(JSON.stringify({ error: "Invalid interaction type. Must be 'call' or 'website'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Request validated", { facilityId, interactionType });

    const today = new Date().toISOString().split("T")[0];

    const { data: existing, error: selectError } = await supabaseClient
      .from("facility_interactions")
      .select("id, interaction_count")
      .eq("facility_id", facilityId)
      .eq("interaction_type", interactionType)
      .eq("interaction_date", today)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      const { error: updateError } = await supabaseClient
        .from("facility_interactions")
        .update({ interaction_count: existing.interaction_count + 1, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabaseClient
        .from("facility_interactions")
        .insert({ facility_id: facilityId as string, interaction_type: interactionType as string, interaction_date: today, interaction_count: 1 });
      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
