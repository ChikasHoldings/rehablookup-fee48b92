import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BODY_SIZE = 5000;

const isValidUUID = (str: unknown): boolean =>
  typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

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

    const facility_id = body.facility_id || body.facilityId;

    // Validate UUID format
    if (!isValidUUID(facility_id)) {
      return new Response(JSON.stringify({ error: "Invalid facility_id format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[TRACK-VIEW] [${VERSION}] Tracking view for facility`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, status")
      .eq("id", facility_id)
      .maybeSingle();

    if (facilityError) {
      return new Response(JSON.stringify({ error: "Failed to verify facility" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!facility || facility.status !== "approved") {
      return new Response(JSON.stringify({ error: "Facility not found or not approved" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: existingView, error: selectError } = await supabase
      .from("facility_views")
      .select("id, view_count")
      .eq("facility_id", facility_id)
      .eq("view_date", today)
      .maybeSingle();

    if (selectError) {
      return new Response(JSON.stringify({ error: "Failed to check existing views" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingView) {
      const { error: updateError } = await supabase
        .from("facility_views")
        .update({ view_count: existingView.view_count + 1 })
        .eq("id", existingView.id);
      if (updateError) {
        return new Response(JSON.stringify({ error: "Failed to update view count" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { error: insertError } = await supabase
        .from("facility_views")
        .insert({ facility_id: facility_id as string, view_date: today, view_count: 1 });
      if (insertError) {
        return new Response(JSON.stringify({ error: "Failed to record view" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[TRACK-VIEW] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
