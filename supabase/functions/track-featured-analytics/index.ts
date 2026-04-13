import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BODY_SIZE = 5000;

const isValidUUID = (str: unknown): boolean =>
  typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

const validEventTypes = ["impression", "click", "lead_conversion"];

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[TRACK-FEATURED-ANALYTICS] ${step}${detailsStr}`);
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

    const facility_id = body.facility_id;
    const event_type = body.event_type;

    // Validate UUID
    if (!isValidUUID(facility_id)) {
      return new Response(JSON.stringify({ error: "Invalid facility_id format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate event type against whitelist
    if (!event_type || !validEventTypes.includes(String(event_type))) {
      return new Response(
        JSON.stringify({ error: `Invalid event_type. Must be one of: ${validEventTypes.join(", ")}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Tracking event", { event_type });

    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabaseClient
      .from("featured_placement_analytics")
      .select("id, event_count")
      .eq("facility_id", facility_id)
      .eq("event_type", event_type)
      .eq("event_date", today)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabaseClient
        .from("featured_placement_analytics")
        .update({ event_count: existing.event_count + 1, metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {} })
        .eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabaseClient
        .from("featured_placement_analytics")
        .insert({
          facility_id: facility_id as string,
          event_type: event_type as string,
          event_date: today,
          event_count: 1,
          metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {}
        });
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
