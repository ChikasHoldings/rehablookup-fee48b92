import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const VERSION = "1.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BODY_SIZE = 10000;

const isValidUUID = (str: unknown): boolean =>
  typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

function sanitizeStr(str: unknown, maxLen = 500): string {
  if (!str || typeof str !== "string") return "";
  return str.trim().replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").replace(/\0/g, "").slice(0, maxLen);
}

function sanitizeUrl(url: unknown, maxLen = 2000): string {
  if (!url || typeof url !== "string") return "";
  const cleaned = url.trim().slice(0, maxLen);
  if (/^(javascript|data|vbscript):/i.test(cleaned)) return "";
  return cleaned;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[REPORT-IMAGE] [${VERSION}] ${step}${detailsStr}`);
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

    // Get user from auth header (optional - anonymous reports use nil UUID)
    let reporterId = "00000000-0000-0000-0000-000000000000";
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      if (user) {
        reporterId = user.id;
      }
    }

    const facility_id = body.facility_id;
    const image_url = sanitizeUrl(body.image_url, 2000);
    const image_type = typeof body.image_type === "string" ? body.image_type : "";
    const reason = typeof body.reason === "string" ? body.reason : "";
    const details = sanitizeStr(body.details, 1000);

    // Validate facility_id UUID
    if (!isValidUUID(facility_id)) {
      return new Response(JSON.stringify({ error: "Invalid facility_id format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!image_url) {
      return new Response(JSON.stringify({ error: "Valid image_url is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate reason against whitelist
    const validReasons = ["inappropriate", "misleading", "low_quality", "copyright", "other"];
    if (!validReasons.includes(reason)) {
      return new Response(
        JSON.stringify({ error: `Invalid reason. Must be one of: ${validReasons.join(", ")}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate image type against whitelist
    if (!["logo", "gallery"].includes(image_type)) {
      return new Response(JSON.stringify({ error: "image_type must be 'logo' or 'gallery'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify facility exists
    const { data: facility, error: facilityError } = await supabaseClient
      .from("facilities")
      .select("id, name")
      .eq("id", facility_id)
      .single();

    if (facilityError || !facility) {
      return new Response(JSON.stringify({ error: "Facility not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate report
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingReport } = await supabaseClient
      .from("flagged_images")
      .select("id")
      .eq("facility_id", facility_id)
      .eq("image_url", image_url)
      .eq("flagged_by", reporterId)
      .gte("flagged_at", twentyFourHoursAgo)
      .maybeSingle();

    if (existingReport) {
      return new Response(JSON.stringify({ error: "You have already reported this image recently" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reasonWithDetails = details ? `${reason}: ${details}` : reason;

    const { error: insertError } = await supabaseClient
      .from("flagged_images")
      .insert({
        facility_id: facility_id as string,
        image_url,
        image_type,
        reason: reasonWithDetails.slice(0, 1000),
        flagged_by: reporterId,
        resolved: false,
      });

    if (insertError) throw insertError;

    await supabaseClient.from("admin_notifications").insert({
      title: "New Image Report",
      message: `An image from ${facility.name.slice(0, 50)} was reported for: ${reason}`,
      type: "flagged_image",
      metadata: { facility_id, image_type, reason },
    });

    // Notify facility owner (non-blocking)
    try {
      await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-flagged-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ facility_id, image_type, reason: reasonWithDetails, image_url }),
        }
      );
    } catch {
      logStep("Owner notification error (non-blocking)");
    }

    return new Response(JSON.stringify({ success: true, message: "Report submitted successfully" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
