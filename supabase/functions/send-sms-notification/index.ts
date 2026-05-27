import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SMSNotificationRequest {
  userId: string;
  notificationType: "new_lead" | "lead_status" | "subscription_alert" | "general";
  data: {
    leadName?: string;
    leadCity?: string;
    levelOfCare?: string;
    urgency?: string;
    facilityName?: string;
    customMessage?: string;
    alertType?: string;
  };
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SMS-NOTIFICATION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { requestId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("Missing Supabase credentials", { requestId });
      return new Response(
        JSON.stringify({ error: "Server configuration error", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Internal-only: invoked exclusively by other edge functions with the
    // service-role key. verify_jwt is false (callers don't carry a user JWT),
    // so we MUST assert the service-role bearer here — otherwise the open
    // endpoint is an SMS relay: an unauthenticated POST could text any
    // SMS-opted-in user arbitrary content via the "general" customMessage.
    const callerBearer = (req.headers.get("Authorization") || req.headers.get("authorization") || "")
      .replace(/^Bearer\s+/i, "");
    if (callerBearer !== supabaseServiceKey) {
      logStep("Forbidden — caller is not service-role", { requestId });
      return new Response(
        JSON.stringify({ error: "Forbidden", requestId }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      logStep("Twilio credentials not configured", { requestId });
      return new Response(
        JSON.stringify({ success: false, sent: false, reason: "SMS service not configured", requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: SMSNotificationRequest;
    try {
      body = await req.json();
    } catch {
      logStep("Invalid JSON body", { requestId });
      return new Response(
        JSON.stringify({ error: "Invalid request body", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, notificationType, data } = body;

    if (!userId || !notificationType) {
      logStep("Missing required fields", { requestId, hasUserId: !!userId, hasType: !!notificationType });
      return new Response(
        JSON.stringify({ error: "userId and notificationType are required", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validTypes = ["new_lead", "lead_status", "subscription_alert", "general"];
    if (!validTypes.includes(notificationType)) {
      logStep("Invalid notification type", { requestId, type: notificationType });
      return new Response(
        JSON.stringify({ error: "Invalid notification type", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Processing request", { requestId, userId: userId.slice(0, 8), notificationType });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: notifPrefs, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("sms_lead_alerts, notify_new_leads")
      .eq("user_id", userId)
      .maybeSingle();

    if (prefsError) {
      logStep("Error fetching notification preferences", { requestId, error: prefsError.message });
    }

    // Respect the master switch — when the provider has turned off
    // lead-related notifications entirely, no SMS regardless of the
    // per-channel sms_lead_alerts toggle. Default to TRUE for both
    // when prefs are missing (matches submit-qualified-lead behavior).
    const masterEnabled = notifPrefs?.notify_new_leads ?? true;
    const smsChannelEnabled = notifPrefs?.sms_lead_alerts ?? false;
    if (!masterEnabled || !smsChannelEnabled) {
      logStep("SMS alerts disabled for user", {
        requestId,
        userId: userId.slice(0, 8),
        masterEnabled,
        smsChannelEnabled,
      });
      return new Response(
        JSON.stringify({ success: true, sent: false, reason: "SMS alerts disabled", requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("phone, phone_verified, sms_opted_out_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      logStep("Error fetching profile", { requestId, error: profileError.message });
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile?.phone) {
      logStep("No phone number for user", { requestId, userId: userId.slice(0, 8) });
      return new Response(
        JSON.stringify({ success: true, sent: false, reason: "No phone number on file", requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TCPA: refuse to send to a number that replied STOP. The
    // twilio-sms-inbound webhook sets sms_opted_out_at when it receives
    // any STOP-class keyword (STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT).
    if (profile.sms_opted_out_at) {
      logStep("User opted out of SMS", { requestId, userId: userId.slice(0, 8) });
      return new Response(
        JSON.stringify({ success: true, sent: false, reason: "User opted out via STOP", requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.phone_verified) {
      logStep("Phone not verified for user", { requestId, userId: userId.slice(0, 8) });
      return new Response(
        JSON.stringify({ success: true, sent: false, reason: "Phone not verified", requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reject obviously malformed inputs before any normalization (control chars, letters, etc.)
    const rawPhone = typeof profile.phone === "string" ? profile.phone.trim() : "";
    if (!rawPhone || !/^[+\d\s().\-]{7,32}$/.test(rawPhone)) {
      logStep("Malformed recipient phone (pre-normalization)", { requestId, userId: userId.slice(0, 8) });
      return new Response(
        JSON.stringify({
          success: false,
          sent: false,
          error: "Malformed recipient phone number",
          code: "phone_rejected",
          requestId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let phone = rawPhone.replace(/\D/g, "");
    if (phone.length === 10) {
      phone = `+1${phone}`;
    } else if (phone.length === 11 && phone.startsWith("1")) {
      phone = `+${phone}`;
    } else if (!phone.startsWith("+")) {
      phone = `+${phone}`;
    }

    // Strict E.164 US format check (Twilio destination)
    const phoneRegex = /^\+1\d{10}$/;
    if (!phoneRegex.test(phone)) {
      logStep("Invalid phone format after normalization", { requestId, phoneLength: phone.length });
      return new Response(
        JSON.stringify({
          success: false,
          sent: false,
          error: "Recipient phone number failed E.164 validation",
          code: "phone_rejected",
          requestId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let messageBody = "";
    
    switch (notificationType) {
      case "new_lead":
        messageBody = `RehabLookup: New lead from ${data?.leadName || "a potential client"}`;
        if (data?.leadCity) {
          messageBody += ` in ${data.leadCity}`;
        }
        if (data?.levelOfCare) {
          messageBody += `. Seeking ${data.levelOfCare}`;
        }
        // The lead intake form stores urgency as immediate/within-week/flexible;
        // older payloads used within_24_hours/emergency. Match all "now" variants
        // so the most urgent leads actually get the URGENT marker.
        const urgencyVal = String(data?.urgency || "").toLowerCase();
        if (["immediate", "immediately", "urgent", "within_24_hours", "emergency"].includes(urgencyVal)) {
          messageBody += `. URGENT - needs immediate care`;
        }
        messageBody += `. Login to view details.`;
        break;
        
      case "lead_status":
        messageBody = `RehabLookup: Lead ${data?.leadName || ""} status updated. Check your dashboard for details.`;
        break;
        
      case "subscription_alert":
        if (data?.alertType === "expiring") {
          messageBody = `RehabLookup: Your subscription is expiring soon. Renew now to keep receiving leads.`;
        } else if (data?.alertType === "expired") {
          messageBody = `RehabLookup: Your subscription has expired. Renew now to resume receiving leads.`;
        } else {
          messageBody = `RehabLookup: Important subscription update. Please check your account.`;
        }
        break;
        
      case "general":
        messageBody = data?.customMessage || "RehabLookup: You have a new notification. Check your dashboard.";
        break;
        
      default:
        messageBody = "RehabLookup: You have a new notification.";
    }

    if (messageBody.length > 160) {
      messageBody = messageBody.substring(0, 157) + "...";
    }

    // Per-user daily SMS budget. A bug that loops a lead-event handler
    // (or a malicious actor with valid-looking submit-qualified-lead
    // payloads) could otherwise rack up hundreds of dollars in Twilio
    // charges in minutes. Cap at 50 sends per provider per rolling 24h.
    // We count successful Twilio sends in sms_inbound_log? No — that's
    // inbound. We count from a notification audit trail. If
    // sms_outbound_log doesn't exist yet, skip the budget check
    // gracefully so this hardening lands ahead of the migration.
    const DAILY_SMS_CAP = 50;
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: outboundCount, error: budgetErr } = await supabase
        .from("sms_outbound_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", oneDayAgo);
      if (!budgetErr && (outboundCount ?? 0) >= DAILY_SMS_CAP) {
        logStep("Daily SMS cap reached for user", {
          requestId,
          userId: userId.slice(0, 8),
          count: outboundCount,
          cap: DAILY_SMS_CAP,
        });
        return new Response(
          JSON.stringify({
            success: true,
            sent: false,
            reason: "Daily SMS cap reached for this user",
            requestId,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch (_budgetCheckErr) {
      // Budget check failure must NEVER prevent a legitimate send —
      // it's a guardrail, not a gate. Fall through.
    }

    logStep("Sending SMS via Twilio", { requestId, notificationType, messageLength: messageBody.length });

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    // Two-attempt retry with 500ms backoff for transient 5xx / network
    // errors. We treat 4xx as permanent (bad phone, account suspended,
    // STOP'd at the carrier layer) and do not retry — retrying would
    // just burn quota without changing the outcome.
    let twilioResponse: Response | null = null;
    let lastBody = "";
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        twilioResponse = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authHeader}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: phone,
            From: twilioPhoneNumber,
            Body: messageBody,
          }),
        });
        if (twilioResponse.ok) break;
        lastBody = await twilioResponse.text();
        // Permanent: 4xx (except 429 throttle). Stop retrying.
        if (twilioResponse.status >= 400 && twilioResponse.status < 500 && twilioResponse.status !== 429) {
          break;
        }
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500));
        }
      } catch (fetchErr) {
        lastBody = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    if (!twilioResponse || !twilioResponse.ok) {
      const status = twilioResponse?.status ?? 0;
      logStep("Twilio API error after retries", { requestId, status, error: lastBody.slice(0, 200) });
      // Best-effort audit row so admin dashboards can spot SMS
      // outages without grepping logs.
      try {
        await supabase.from("sms_outbound_log").insert({
          user_id: userId,
          notification_type: notificationType,
          recipient_phone: phone,
          status: "failed",
          twilio_status: status || null,
          error_message: lastBody.slice(0, 500),
        });
      } catch (_logErr) {
        // sms_outbound_log may not exist yet — non-fatal.
      }
      return new Response(
        JSON.stringify({ success: false, sent: false, reason: "Failed to send SMS", requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twilioResult = await twilioResponse.json();
    logStep("SMS sent successfully", { requestId, messageId: twilioResult.sid, notificationType });

    // Audit-trail row for the daily-cap query above + admin visibility.
    try {
      await supabase.from("sms_outbound_log").insert({
        user_id: userId,
        notification_type: notificationType,
        recipient_phone: phone,
        status: "sent",
        twilio_sid: twilioResult.sid,
      });
    } catch (_logErr) {
      // sms_outbound_log may not exist yet — non-fatal.
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: true,
        messageId: twilioResult.sid,
        requestId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logStep("Unexpected error", { requestId, error: error instanceof Error ? error.message : "Unknown error" });
    return new Response(
      JSON.stringify({ error: "Internal server error", requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
