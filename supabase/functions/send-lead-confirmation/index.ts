import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadConfirmationRequest {
  leadFirstName: string;
  leadEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SEND-LEAD-CONFIRMATION] Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendKey);
    const { leadFirstName, leadEmail }: LeadConfirmationRequest = await req.json();

    console.log("[SEND-LEAD-CONFIRMATION] Sending to:", leadEmail);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f6f8fb;">
  <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <div style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 28px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 600;">We've received your request</h1>
    </div>
    
    <div style="padding: 32px 28px;">
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">Hi ${leadFirstName},</p>
      
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #4b5563;">Thank you for reaching out to RehabLookup.</p>
      
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #4b5563;">Your request for information has been received and successfully reviewed. Based on what you shared, your inquiry has been forwarded to a treatment provider that matches your needs and location.</p>
      
      <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563;">There's no obligation at any point. If a provider reaches out, you're free to ask questions, take your time, and decide what feels right for you or your loved one.</p>
      
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1B365D;">What to expect next</p>
        <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px;">
          <li style="margin-bottom: 8px;">A treatment provider may contact you using your preferred method</li>
          <li style="margin-bottom: 8px;">You can learn more about available options and next steps</li>
          <li style="margin-bottom: 0;">If you choose not to move forward, no action is required</li>
        </ul>
      </div>
      
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280;">If you have any questions about your request or need assistance, our support team is here to help at <a href="mailto:support@rehablookup.com" style="color: #1B365D; text-decoration: none;">support@rehablookup.com</a>.</p>
      
      <p style="margin: 0 0 4px 0; font-size: 15px; color: #4b5563;">Thank you for taking this step.</p>
      <p style="margin: 0 0 4px 0; font-size: 15px; color: #4b5563;">Warm regards,</p>
      <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1B365D;">The RehabLookup Team</p>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280; font-style: italic;">Connecting people with trusted treatment options</p>
    </div>
    
    <div style="background: #f8fafc; padding: 20px 28px; border-top: 1px solid #e5e7eb;">
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
        <span style="font-size: 14px; color: #6b7280;">🔒 Your information is secure and confidential</span>
      </div>
      <p style="margin: 0; font-size: 11px; color: #9ca3af; text-align: center; line-height: 1.5;">
        This email was sent by RehabLookup in response to your request for treatment information.
        <br>If you did not make this request, please disregard this email.
        <br><a href="https://rehablookup.com/privacy-policy" style="color: #6b7280;">Privacy Policy</a> · <a href="https://rehablookup.com/terms-of-service" style="color: #6b7280;">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const { error } = await resend.emails.send({
      from: "RehabLookup <notifications@rehablookup.com>",
      to: [leadEmail],
      subject: "We've received your request",
      html: emailHtml,
    });

    if (error) {
      console.error("[SEND-LEAD-CONFIRMATION] Email error:", error);
      throw error;
    }

    console.log("[SEND-LEAD-CONFIRMATION] Email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SEND-LEAD-CONFIRMATION] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
