import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  messageToSeekerEmail,
  messageToFacilityEmail,
  messageToAdvisorEmail,
  type MessageEmailData,
} from "../_shared/message-email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  notificationType: "message_to_seeker" | "message_to_facility" | "message_to_advisor";
  threadId: string;
  messageContent: string;
  senderType: "seeker" | "facility" | "advisor";
}

serve(async (req) => {
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
          user_email
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
          from: "RehabLookup Concierge <placement@rehablookup.com>",
          to: [email.to],
          subject: email.subject,
          html: email.html,
        });
        console.log(`Email sent to ${email.to}:`, result);
      } catch (emailError) {
        console.error(`Failed to send email to ${email.to}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent: emails.length }),
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
