import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[REPORT-IMAGE] ${step}${detailsStr}`);
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

    // Get user from auth header (optional - anonymous reports use nil UUID)
    let reporterId = "00000000-0000-0000-0000-000000000000"; // Nil UUID for anonymous
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      if (user) {
        reporterId = user.id;
      }
    }

    const { facility_id, image_url, image_type, reason, details } = await req.json();

    // Validate required fields
    if (!facility_id || !image_url || !image_type || !reason) {
      return new Response(
        JSON.stringify({ error: "facility_id, image_url, image_type, and reason are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate reason
    const validReasons = ["inappropriate", "misleading", "low_quality", "copyright", "other"];
    if (!validReasons.includes(reason)) {
      return new Response(
        JSON.stringify({ error: `Invalid reason. Must be one of: ${validReasons.join(", ")}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate image type
    if (!["logo", "gallery"].includes(image_type)) {
      return new Response(
        JSON.stringify({ error: "image_type must be 'logo' or 'gallery'" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Validating facility exists", { facility_id });

    // Verify facility exists
    const { data: facility, error: facilityError } = await supabaseClient
      .from("facilities")
      .select("id, name")
      .eq("id", facility_id)
      .single();

    if (facilityError || !facility) {
      return new Response(
        JSON.stringify({ error: "Facility not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Check for duplicate report (same image, same reporter, within last 24 hours)
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
      return new Response(
        JSON.stringify({ error: "You have already reported this image recently" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    logStep("Creating flagged image record", { facility_id, image_type, reason });

    // Create the flagged image record
    const reasonWithDetails = details ? `${reason}: ${details}` : reason;
    
    const { error: insertError } = await supabaseClient
      .from("flagged_images")
      .insert({
        facility_id,
        image_url,
        image_type,
        reason: reasonWithDetails,
        flagged_by: reporterId,
        resolved: false,
      });

    if (insertError) {
      logStep("Error inserting flagged image", { error: insertError.message });
      throw insertError;
    }

    // Create admin notification
    await supabaseClient.from("admin_notifications").insert({
      title: "New Image Report",
      message: `An image from ${facility.name} was reported for: ${reason}`,
      type: "flagged_image",
      metadata: { facility_id, image_type, reason },
    });

    // Send notification email to facility owner
    logStep("Triggering owner notification email");
    try {
      const notifyResponse = await fetch(
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
      if (!notifyResponse.ok) {
        logStep("Owner notification failed (non-blocking)", { status: notifyResponse.status });
      } else {
        logStep("Owner notification sent");
      }
    } catch (notifyError) {
      logStep("Owner notification error (non-blocking)", { error: String(notifyError) });
    }

    logStep("Report created successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Report submitted successfully" }),
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
