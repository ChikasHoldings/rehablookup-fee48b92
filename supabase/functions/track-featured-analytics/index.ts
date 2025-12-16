import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[TRACK-FEATURED-ANALYTICS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { facility_id, event_type, metadata } = await req.json();

    if (!facility_id || !event_type) {
      return new Response(
        JSON.stringify({ error: "facility_id and event_type are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate event type
    const validEventTypes = ["impression", "click", "lead_conversion"];
    if (!validEventTypes.includes(event_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid event_type. Must be one of: ${validEventTypes.join(", ")}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Tracking event", { facility_id, event_type });

    const today = new Date().toISOString().split("T")[0];

    // Upsert the analytics record (increment count if exists)
    const { data: existing } = await supabaseClient
      .from("featured_placement_analytics")
      .select("id, event_count")
      .eq("facility_id", facility_id)
      .eq("event_type", event_type)
      .eq("event_date", today)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabaseClient
        .from("featured_placement_analytics")
        .update({ 
          event_count: existing.event_count + 1,
          metadata: metadata || {}
        })
        .eq("id", existing.id);

      if (updateError) {
        logStep("Error updating analytics", { error: updateError.message });
        throw updateError;
      }

      logStep("Updated existing record", { id: existing.id, newCount: existing.event_count + 1 });
    } else {
      // Insert new record
      const { error: insertError } = await supabaseClient
        .from("featured_placement_analytics")
        .insert({
          facility_id,
          event_type,
          event_date: today,
          event_count: 1,
          metadata: metadata || {}
        });

      if (insertError) {
        logStep("Error inserting analytics", { error: insertError.message });
        throw insertError;
      }

      logStep("Created new record");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
