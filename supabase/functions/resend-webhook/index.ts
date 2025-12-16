import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[RESEND-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const payload = await req.json();
    logStep("Payload received", { type: payload.type, email_id: payload.data?.email_id });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Extract event data
    const eventType = payload.type; // email.sent, email.delivered, email.opened, email.clicked, email.bounced
    const emailId = payload.data?.email_id;
    const recipientEmail = payload.data?.to?.[0] || payload.data?.email || "";
    
    if (!emailId) {
      logStep("No email_id in payload, skipping");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine email type by looking up the subscription_alerts table
    let emailType = "unknown";
    const { data: alert } = await supabaseClient
      .from("subscription_alerts")
      .select("alert_type")
      .eq("resend_id", emailId)
      .single();

    if (alert) {
      emailType = alert.alert_type;
    }

    // Store the tracking event
    const { error: insertError } = await supabaseClient
      .from("email_tracking_events")
      .insert({
        email_id: emailId,
        email_type: emailType,
        recipient_email: recipientEmail,
        event_type: eventType,
        event_data: payload.data || {},
      });

    if (insertError) {
      logStep("Error inserting tracking event", { error: insertError.message });
    } else {
      logStep("Tracking event stored", { eventType, emailId, emailType });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
