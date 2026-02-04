import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[TRACK-INTERACTION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
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

    const { facilityId, interactionType } = await req.json();
    logStep("Request parsed", { facilityId, interactionType });

    if (!facilityId || !interactionType) {
      throw new Error("Missing required parameters: facilityId and interactionType");
    }

    if (!["call", "website"].includes(interactionType)) {
      throw new Error("Invalid interaction type. Must be 'call' or 'website'");
    }

    const today = new Date().toISOString().split("T")[0];

    // Try to update existing record first
    const { data: existing, error: selectError } = await supabaseClient
      .from("facility_interactions")
      .select("id, interaction_count")
      .eq("facility_id", facilityId)
      .eq("interaction_type", interactionType)
      .eq("interaction_date", today)
      .maybeSingle();

    if (selectError) {
      logStep("Select error", { error: selectError.message });
      throw selectError;
    }

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabaseClient
        .from("facility_interactions")
        .update({ 
          interaction_count: existing.interaction_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);

      if (updateError) {
        logStep("Update error", { error: updateError.message });
        throw updateError;
      }
      logStep("Updated existing record", { newCount: existing.interaction_count + 1 });
    } else {
      // Insert new record
      const { error: insertError } = await supabaseClient
        .from("facility_interactions")
        .insert({
          facility_id: facilityId,
          interaction_type: interactionType,
          interaction_date: today,
          interaction_count: 1
        });

      if (insertError) {
        logStep("Insert error", { error: insertError.message });
        throw insertError;
      }
      logStep("Inserted new record");
    }

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
