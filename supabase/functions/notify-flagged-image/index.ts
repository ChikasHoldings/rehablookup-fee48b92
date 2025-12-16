import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FlaggedImageNotificationRequest {
  facilityId: string;
  facilityName: string;
  imageType: "logo" | "gallery";
  reason: string;
  providerEmail: string;
  providerName: string;
}

const REASON_LABELS: Record<string, string> = {
  inappropriate: "Inappropriate content",
  misleading: "Misleading or fake image",
  low_quality: "Low quality / unprofessional",
  copyright: "Copyright violation",
  other: "Policy violation",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-flagged-image function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the request is from an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      console.error("User is not an admin");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const {
      facilityId,
      facilityName,
      imageType,
      reason,
      providerEmail,
      providerName,
    }: FlaggedImageNotificationRequest = await req.json();

    console.log("Sending flagged image notification to:", providerEmail);

    const reasonText = REASON_LABELS[reason] || reason || "Policy violation";
    const imageTypeText = imageType === "logo" ? "facility logo" : "gallery image";

    // Send email notification using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: [providerEmail],
        subject: `Action Required: Your ${imageTypeText} has been flagged`,
        html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1B365D 0%, #2d4a7c 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Image Review Notice</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${providerName},</p>
              
              <p style="margin-bottom: 20px;">Our admin team has reviewed your facility listing for <strong>${facilityName}</strong> and flagged your <strong>${imageTypeText}</strong> for the following reason:</p>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #92400e; font-weight: 600;">
                  ⚠️ ${reasonText}
                </p>
              </div>
              
              <p style="margin-bottom: 20px;">To maintain the quality and professionalism of your listing, please upload a replacement image that meets our guidelines.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://rehablookup.com/provider/listing" 
                   style="display: inline-block; background: #1B365D; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Update Your Images
                </a>
              </div>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 25px;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">Image Guidelines</h3>
                <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px;">
                  <li>Use high-quality, professional photos</li>
                  <li>Ensure images accurately represent your facility</li>
                  <li>Avoid stock photos or misleading imagery</li>
                  <li>Logos should be clear and properly sized</li>
                </ul>
              </div>
              
              <p style="margin-top: 25px; color: #64748b; font-size: 14px;">
                If you believe this flag was made in error, please contact our support team.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                This is an automated message from RehabLookup.<br>
                Please do not reply directly to this email.
              </p>
            </div>
          </body>
        </html>
      `,
      }),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-flagged-image function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
