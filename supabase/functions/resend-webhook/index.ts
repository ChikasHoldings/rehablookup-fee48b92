import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[RESEND-WEBHOOK] ${step}${detailsStr}`);
};

/**
 * Normalise a Resend webhook event name to the short form we store
 * in `email_tracking_events.event_type`.
 *
 * Resend sends e.g. "email.sent", "email.delivered", "email.bounced".
 * We strip the prefix so the value matches what `resilient-email-sender.ts`
 * writes ("sent", "failed", "retry", "dlq", "suppressed") and what the
 * Admin → Email Logs UI filters on.
 */
function normaliseEventType(rawType: string): string {
  if (!rawType) return "unknown";
  const trimmed = rawType.trim().toLowerCase();
  // "email.delivered" → "delivered"
  const short = trimmed.startsWith("email.") ? trimmed.slice(6) : trimmed;
  // Resend uses "complained" for spam complaints — keep as-is.
  return short;
}

/**
 * Try to resolve which email_type this Resend message belonged to so the
 * Admin → Email Logs UI can filter it correctly.
 *
 * We look in:
 *   1. `email_tracking_events`     — populated by `resilient-email-sender.ts`
 *      whenever we send through the queue (idempotencyKey == Resend id).
 *   2. `subscription_alerts`        — legacy retention emails.
 *
 * Falls back to "unknown" so a row is still recorded.
 */
async function resolveEmailType(
  supabase: ReturnType<typeof createClient>,
  emailId: string,
): Promise<string> {
  // 1. Resilient sender stores the Resend id in event_data.resendId on "sent" rows.
  const { data: tracked } = await supabase
    .from("email_tracking_events")
    .select("email_type")
    .or(`email_id.eq.${emailId},event_data->>resendId.eq.${emailId}`)
    .neq("email_type", "unknown")
    .limit(1)
    .maybeSingle();

  if (tracked?.email_type) return tracked.email_type;

  // 2. Legacy subscription alerts.
  const { data: alert } = await supabase
    .from("subscription_alerts")
    .select("alert_type")
    .eq("resend_id", emailId)
    .maybeSingle();

  if (alert?.alert_type) return alert.alert_type;

  return "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const payload = await req.json();
    const rawEventType: string = payload.type || "";
    const emailId: string | undefined = payload.data?.email_id;
    const recipientEmail: string =
      payload.data?.to?.[0] || payload.data?.email || "";

    logStep("Payload parsed", { type: rawEventType, email_id: emailId });

    if (!emailId) {
      logStep("No email_id in payload, skipping");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const eventType = normaliseEventType(rawEventType);
    const emailType = await resolveEmailType(supabaseClient, emailId);

    // Idempotency: skip if we've already recorded this exact (emailId, eventType).
    // Resend retries deliveries on its side; without this we double-count.
    const { data: existing } = await supabaseClient
      .from("email_tracking_events")
      .select("id")
      .eq("email_id", emailId)
      .eq("event_type", eventType)
      .limit(1)
      .maybeSingle();

    if (existing) {
      logStep("Duplicate event ignored", { emailId, eventType });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
