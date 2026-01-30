import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackingRequest {
  eventType: string;
  source?: string;
  facilityId?: string | null;
  stepNumber?: number;
  metadata?: Record<string, unknown>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventType, source, facilityId, stepNumber, metadata }: TrackingRequest = await req.json();

    if (!eventType) {
      return new Response(
        JSON.stringify({ error: "Event type is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store analytics event
    const { error } = await supabase.from("request_help_analytics").insert({
      event_type: eventType,
      source: source || "direct",
      facility_id: facilityId || null,
      step_number: stepNumber || null,
      metadata: {
        ...metadata,
        user_agent: req.headers.get("user-agent"),
        referer: req.headers.get("referer"),
      },
    });

    if (error) {
      // Table might not exist - log and continue silently
      console.log(`[track-request-help] Analytics storage skipped: ${error.message}`);
    }

    console.log(`[track-request-help] Event tracked: ${eventType}`, { source, facilityId, stepNumber });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[track-request-help] Error:", errorMsg);
    
    // Return success anyway to not block form submission
    return new Response(
      JSON.stringify({ success: true, note: "tracking_skipped" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
