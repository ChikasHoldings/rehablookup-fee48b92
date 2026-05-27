import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { ApiError, apiErrorResponse } from "../_shared/validation.ts";

const VERSION = "1.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const logStep = (requestId: string, step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESPOND-INTL-CASE] [${VERSION}] [${requestId}] ${step}${detailsStr}`);
};

// UUID validation
const isValidUUID = (str: string): boolean => {
  if (!str || typeof str !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Sanitize notes input
const sanitizeNotes = (notes: unknown): string | null => {
  if (!notes || typeof notes !== "string") return null;
  return notes.trim().slice(0, 2000).replace(/[<>]/g, "");
};

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep(requestId, "Function started");

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

    const body = await req.json();
    const { action, matchId, data } = body;

    // Per-field validation so smoke tests / clients can pinpoint the missing input.
    if (!action || typeof action !== "string") {
      throw new ApiError("MISSING_FIELD_ACTION", "action is required", 400);
    }
    if (!matchId) {
      throw new ApiError("MISSING_FIELD_MATCH_ID", "matchId is required", 400);
    }
    if (!isValidUUID(matchId)) {
      throw new ApiError("INVALID_MATCH_ID", "Invalid matchId format", 400);
    }

    logStep(requestId, "Processing action", { action, matchId, providerId: user.id });

    switch (action) {
      case "respond": {
        const response = data?.response;
        const notes = sanitizeNotes(data?.notes);
        
        // Strict response validation
        if (!response || !["accepted", "declined"].includes(response)) {
          throw new Error("Invalid response value - must be 'accepted' or 'declined'");
        }

        // Verify match belongs to this provider
        const { data: match, error: matchError } = await supabase
          .from("international_case_facility_matches")
          .select("*, international_placement_cases(*)")
          .eq("id", matchId)
          .eq("provider_id", user.id)
          .single();

        if (matchError || !match) {
          logStep(requestId, "Match not found", { matchId, providerId: user.id, error: matchError?.message });
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

        logStep(requestId, "Response submitted", { matchId, response });
        
        return new Response(
          JSON.stringify({ success: true, requestId, _version: VERSION }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep(requestId, "ERROR", { message: errorMessage });
    return apiErrorResponse(error, corsHeaders, { requestId, _version: VERSION });
  }
});
