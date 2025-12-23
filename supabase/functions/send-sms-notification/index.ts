import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSNotificationRequest {
  userId: string;
  notificationType: "new_lead" | "lead_status" | "lead_limit_warning" | "general";
  data: {
    leadName?: string;
    leadCity?: string;
    levelOfCare?: string;
    urgency?: string;
    facilityName?: string;
    usedLeads?: number;
    leadLimit?: number;
    customMessage?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, notificationType, data }: SMSNotificationRequest = await req.json();

    if (!userId || !notificationType) {
      return new Response(
        JSON.stringify({ error: "userId and notificationType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's notification preferences and phone
    const { data: notifPrefs, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("sms_lead_alerts")
      .eq("user_id", userId)
      .maybeSingle();

    if (prefsError) {
      console.error("Error fetching notification preferences:", prefsError);
    }

    // Check if SMS alerts are enabled
    if (!notifPrefs?.sms_lead_alerts) {
      console.log("SMS alerts disabled for user:", userId);
      return new Response(
        JSON.stringify({ success: true, sent: false, reason: "SMS alerts disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get provider profile with phone verification status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("phone, phone_verified")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile?.phone) {
      console.log("No phone number for user:", userId);
      return new Response(
        JSON.stringify({ success: true, sent: false, reason: "No phone number on file" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.phone_verified) {
      console.log("Phone not verified for user:", userId);
      return new Response(
        JSON.stringify({ success: true, sent: false, reason: "Phone not verified" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone to E.164
    let phone = profile.phone.replace(/\D/g, "");
    if (phone.length === 10) {
      phone = `+1${phone}`;
    } else if (phone.length === 11 && phone.startsWith("1")) {
      phone = `+${phone}`;
    } else {
      phone = `+${phone}`;
    }

    // Build message based on notification type
    let messageBody = "";
    
    switch (notificationType) {
      case "new_lead":
        messageBody = `RehabLookup: New lead from ${data.leadName || "a potential client"}`;
        if (data.leadCity) {
          messageBody += ` in ${data.leadCity}`;
        }
        if (data.levelOfCare) {
          messageBody += `. Seeking ${data.levelOfCare}`;
        }
        if (data.urgency === "within_24_hours" || data.urgency === "emergency") {
          messageBody += `. URGENT - needs immediate care`;
        }
        messageBody += `. Login to view details.`;
        break;
        
      case "lead_status":
        messageBody = `RehabLookup: Lead ${data.leadName || ""} status updated. Check your dashboard for details.`;
        break;
        
      case "lead_limit_warning":
        messageBody = `RehabLookup: You've used ${data.usedLeads || 0} of ${data.leadLimit || 100} leads this month (${Math.round(((data.usedLeads || 0) / (data.leadLimit || 100)) * 100)}%). Consider upgrading for more leads.`;
        break;
        
      case "general":
        messageBody = data.customMessage || "RehabLookup: You have a new notification. Check your dashboard.";
        break;
        
      default:
        messageBody = "RehabLookup: You have a new notification.";
    }

    // Truncate message to SMS limit (160 chars for single SMS)
    if (messageBody.length > 160) {
      messageBody = messageBody.substring(0, 157) + "...";
    }

    // Send SMS via Twilio
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({ success: false, sent: false, reason: "SMS service not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      console.error("Twilio error:", twilioError);
      return new Response(
        JSON.stringify({ success: false, sent: false, reason: "Failed to send SMS" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twilioResult = await twilioResponse.json();
    console.log("SMS sent successfully:", twilioResult.sid, "to:", phone);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: true,
        messageId: twilioResult.sid 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-sms-notification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
