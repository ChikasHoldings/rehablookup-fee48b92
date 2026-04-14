import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
  messageToSeekerEmail,
  messageToFacilityEmail,
  messageToAdvisorEmail,
  type MessageEmailData,
} from "../_shared/message-email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationPayload {
  notificationType: "message_to_seeker" | "message_to_facility" | "message_to_advisor";
  threadId: string;
  messageContent: string;
  senderType: "seeker" | "facility" | "advisor";
}

// Helper to send SMS via Twilio
async function sendSMS(phone: string, message: string): Promise<boolean> {
  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log("Twilio not configured, skipping SMS");
    return false;
  }

  // Format phone to E.164
  let formattedPhone = phone.replace(/\D/g, "");
  if (formattedPhone.length === 10) {
    formattedPhone = `+1${formattedPhone}`;
  } else if (formattedPhone.length === 11 && formattedPhone.startsWith("1")) {
    formattedPhone = `+${formattedPhone}`;
  } else {
    formattedPhone = `+${formattedPhone}`;
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    // Truncate message to SMS limit
    const truncatedMessage = message.length > 160 ? message.substring(0, 157) + "..." : message;

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: twilioPhoneNumber,
        Body: truncatedMessage,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Twilio error:", errorText);
      return false;
    }

    const result = await response.json();
    console.log("SMS sent successfully:", result.sid);
    return true;
  } catch (error) {
    console.error("SMS send error:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    console.log("Received notification request:", payload.notificationType);

    // Fetch thread details
    const { data: thread, error: threadError } = await supabase
      .from("concierge_threads")
      .select(`
        id,
        thread_type,
        inquiry_id,
        facility_id,
        user_id,
        concierge_inquiries (
          id,
          user_name,
          user_email,
          user_phone
        ),
        facilities (
          id,
          name,
          reply_email,
          email
        )
      `)
      .eq("id", payload.threadId)
      .single();

    if (threadError || !thread) {
      console.error("Thread fetch error:", threadError);
      throw new Error("Thread not found");
    }

    const inquiry = thread.concierge_inquiries as any;
    const facility = thread.facilities as any;

    const baseEmailData: MessageEmailData = {
      seekerName: inquiry?.user_name || "Client",
      seekerEmail: inquiry?.user_email || "",
      facilityName: facility?.name,
      senderName: "",
      senderType: payload.senderType,
      messagePreview: payload.messageContent,
      threadType: thread.thread_type as "advisor" | "facility",
    };

    const emails: Array<{ to: string; subject: string; html: string }> = [];
    let smsRecipient: { phone: string; message: string } | null = null;

    const portalLink = "https://rehablookup.com/account/concierge";

    switch (payload.notificationType) {
      case "message_to_seeker": {
        // Notify seeker when facility or advisor sends message
        if (inquiry?.user_email) {
          const senderLabel = payload.senderType === "advisor" 
            ? "Your Placement Advisor" 
            : facility?.name || "Treatment Center";
          
          emails.push({
            to: inquiry.user_email,
            subject: `New message from ${senderLabel}`,
            html: messageToSeekerEmail({
              ...baseEmailData,
              senderName: senderLabel,
            }),
          });

          // Also send SMS if phone is available
          if (inquiry?.user_phone) {
            const preview = payload.messageContent.length > 80 
              ? payload.messageContent.substring(0, 77) + "..." 
              : payload.messageContent;
            smsRecipient = {
              phone: inquiry.user_phone,
              message: `RehabLookup: New message from ${senderLabel}. "${preview}" View & reply: ${portalLink}`,
            };
          }
        }
        break;
      }

      case "message_to_facility": {
        // Notify facility when seeker sends message
        const facilityEmail = facility?.reply_email || facility?.email;
        if (facilityEmail) {
          emails.push({
            to: facilityEmail,
            subject: `New message from ${inquiry?.user_name || "Concierge Client"}`,
            html: messageToFacilityEmail({
              ...baseEmailData,
              senderName: inquiry?.user_name || "Client",
            }),
          });
        }
        break;
      }

      case "message_to_advisor": {
        // Notify admin team when seeker sends message in advisor thread
        const adminEmail = "placement@rehablookup.com";
        emails.push({
          to: adminEmail,
          subject: `Advisor message from ${inquiry?.user_name || "Concierge Client"}`,
          html: messageToAdvisorEmail({
            ...baseEmailData,
            senderName: inquiry?.user_name || "Client",
          }),
        });
        break;
      }
    }

    // Send all emails
    for (const email of emails) {
      try {
        const result = await resend.emails.send({
          from: "RehabLookup Concierge <no-reply@rehablookup.com>",
          to: [email.to],
          subject: email.subject,
          html: email.html,
        });
        console.log(`Email sent to ${email.to}:`, result);
      } catch (emailError) {
        console.error(`Failed to send email to ${email.to}:`, emailError);
      }
    }

    // Send SMS if applicable
    let smsSent = false;
    if (smsRecipient) {
      smsSent = await sendSMS(smsRecipient.phone, smsRecipient.message);
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent: emails.length, smsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-message-notifications:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
