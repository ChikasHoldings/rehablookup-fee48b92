import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SMSNotificationRequest {
  userId: string;
  notificationType: "new_lead" | "lead_status" | "lead_limit_warning" | "subscription_alert" | "general";
  data: {
    leadName?: string;
    leadCity?: string;
    levelOfCare?: string;
    urgency?: string;
    facilityName?: string;
    usedLeads?: number;
    leadLimit?: number;
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

    const validTypes = ["new_lead", "lead_status", "lead_limit_warning", "subscription_alert", "general"];
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
      .select("sms_lead_alerts")
      .eq("user_id", userId)
      .maybeSingle();

    if (prefsError) {
      logStep("Error fetching notification preferences", { requestId, error: prefsError.message });
    }

    if (!notifPrefs?.sms_lead_alerts) {
      logStep("SMS alerts disabled for user", { requestId, userId: userId.slice(0, 8) });
      return new Response(
        JSON.stringify({ success: true, sent: false, reason: "SMS alerts disabled", requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("phone, phone_verified")
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

    if (!profile.phone_verified) {
      logStep("Phone not verified for user", { requestId, userId: userId.slice(0, 8) });
      return new Response(
        JSON.stringify({ success: true, sent: false, reason: "Phone not verified", requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let phone = profile.phone.replace(/\D/g, "");
    if (phone.length === 10) {
      phone = `+1${phone}`;
    } else if (phone.length === 11 && phone.startsWith("1")) {
      phone = `+${phone}`;
    } else if (!phone.startsWith("+")) {
      phone = `+${phone}`;
    }

    const phoneRegex = /^\+1\d{10}$/;
    if (!phoneRegex.test(phone)) {
      logStep("Invalid phone format after normalization", { requestId, phoneLength: phone.length });
      return new Response(
        JSON.stringify({ success: true, sent: false, reason: "Invalid phone number format", requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        if (data?.urgency === "within_24_hours" || data?.urgency === "emergency") {
          messageBody += `. URGENT - needs immediate care`;
        }
        messageBody += `. Login to view details.`;
        break;
        
      case "lead_status":
        messageBody = `RehabLookup: Lead ${data?.leadName || ""} status updated. Check your dashboard for details.`;
        break;
        
      case "lead_limit_warning":
        const usedLeads = data?.usedLeads || 0;
        const leadLimit = data?.leadLimit || 100;
        const percentage = Math.round((usedLeads / leadLimit) * 100);
        messageBody = `RehabLookup: You've used ${usedLeads} of ${leadLimit} leads this month (${percentage}%). Consider upgrading for more leads.`;
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

    logStep("Sending SMS via Twilio", { requestId, notificationType, messageLength: messageBody.length });

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const twilioResponse = await fetch(twilioUrl, {
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

    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.text();
      logStep("Twilio API error", { requestId, status: twilioResponse.status, error: twilioError.slice(0, 200) });
      return new Response(
        JSON.stringify({ success: false, sent: false, reason: "Failed to send SMS", requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twilioResult = await twilioResponse.json();
    logStep("SMS sent successfully", { requestId, messageId: twilioResult.sid, notificationType });

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
