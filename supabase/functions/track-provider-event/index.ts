import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_EVENT_TYPES = ["listing_impression", "profile_view", "click_to_call", "website_click"];
const ALLOWED_PAGE_CONTEXTS = ["search", "profile", "other"];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST-only enforcement
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", code: "method_not_allowed", allowed: ["POST"] }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
      },
    );
  }


  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { facilityId, eventType, sessionId, pageContext = "other" } = await req.json();

    // Validate required fields
    if (!facilityId || !eventType || !sessionId) {
      console.error("[track-provider-event] Missing required fields:", { facilityId, eventType, sessionId });
      return new Response(
        JSON.stringify({ error: "Missing required fields: facilityId, eventType, sessionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate event type
    if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
      console.error("[track-provider-event] Invalid event type:", eventType);
      return new Response(
        JSON.stringify({ error: `Invalid event type. Allowed: ${ALLOWED_EVENT_TYPES.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate page context
    const validPageContext = ALLOWED_PAGE_CONTEXTS.includes(pageContext) ? pageContext : "other";

    // Check if facility exists and is active
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, status")
      .eq("id", facilityId)
      .eq("status", "approved")
      .maybeSingle();

    if (facilityError) {
      console.error("[track-provider-event] Facility lookup error:", facilityError);
      return new Response(
        JSON.stringify({ error: "Failed to verify facility" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!facility) {
      console.warn("[track-provider-event] Facility not found or not active:", facilityId);
      // Fail silently for invalid facilities - don't expose facility existence
      return new Response(
        JSON.stringify({ success: true, tracked: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // De-duplication: Check for recent duplicate event (same session, facility, type within 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    const { data: recentEvent } = await supabase
      .from("provider_events")
      .select("id")
      .eq("facility_id", facilityId)
      .eq("event_type", eventType)
      .eq("session_id", sessionId)
      .gte("created_at", thirtySecondsAgo)
      .limit(1)
      .maybeSingle();

    if (recentEvent) {
      console.log("[track-provider-event] Duplicate event detected, skipping:", { facilityId, eventType, sessionId });
      return new Response(
        JSON.stringify({ success: true, tracked: false, reason: "duplicate" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the event
    const { error: insertError } = await supabase
      .from("provider_events")
      .insert({
        facility_id: facilityId,
        event_type: eventType,
        session_id: sessionId,
        page_context: validPageContext,
      });

    if (insertError) {
      console.error("[track-provider-event] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to track event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[track-provider-event] Event tracked:", { facilityId, eventType, pageContext: validPageContext });

    return new Response(
      JSON.stringify({ success: true, tracked: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[track-provider-event] Unexpected error:", error);
    // Fail silently - don't block user experience
    return new Response(
      JSON.stringify({ success: true, tracked: false, reason: "error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
