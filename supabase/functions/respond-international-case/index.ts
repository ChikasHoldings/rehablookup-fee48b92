import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESPOND-INTL-CASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    // Verify provider user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, matchId, data } = await req.json();

    logStep("Processing action", { action, matchId, providerId: user.id });

    switch (action) {
      case "respond": {
        const { response, notes } = data;
        
        if (!["accepted", "declined"].includes(response)) {
          throw new Error("Invalid response value");
        }

        // Verify match belongs to this provider
        const { data: match, error: matchError } = await supabase
          .from("international_case_facility_matches")
          .select("*, international_placement_cases(*)")
          .eq("id", matchId)
          .eq("provider_id", user.id)
          .single();

        if (matchError || !match) {
          throw new Error("Match not found or access denied");
        }

        // Update match status
        const { error: updateError } = await supabase
          .from("international_case_facility_matches")
          .update({
            status: response,
            responded_at: new Date().toISOString(),
            provider_notes: notes || null,
          })
          .eq("id", matchId);

        if (updateError) throw updateError;

        // Log event
        await supabase.from("international_case_events").insert({
          case_id: match.case_id,
          event_type: response === "accepted" ? "facility_interested" : "facility_declined",
          actor_id: user.id,
          actor_type: "provider",
          event_data: { 
            facility_id: match.facility_id,
            notes: notes || null,
          },
        });

        // If accepted, check if case status should update
        if (response === "accepted") {
          const { data: caseData } = await supabase
            .from("international_placement_cases")
            .select("status")
            .eq("id", match.case_id)
            .single();

          if (caseData?.status === "introductions_sent") {
            await supabase
              .from("international_placement_cases")
              .update({ 
                status: "in_contact",
                updated_at: new Date().toISOString(),
              })
              .eq("id", match.case_id);
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
