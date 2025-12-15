import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportRequest {
  category: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SEND-SUPPORT-REQUEST] Function started");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("[SEND-SUPPORT-REQUEST] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create authenticated client to get user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[SEND-SUPPORT-REQUEST] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: SupportRequest = await req.json();
    const { category, subject, message } = body;

    if (!category || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[SEND-SUPPORT-REQUEST] Request:", { userId: user.id, category, subject });

    // Get provider profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("user_id", user.id)
      .maybeSingle();

    // Get facility info
    const { data: facility } = await supabase
      .from("facilities")
      .select("name, city, state")
      .eq("user_id", user.id)
      .maybeSingle();

    const providerName = profile ? `${profile.first_name} ${profile.last_name}` : "Unknown Provider";
    const providerEmail = user.email || profile?.email || "Unknown";
    const facilityInfo = facility ? `${facility.name} (${facility.city}, ${facility.state})` : "No facility";

    // Category labels
    const categoryLabels: Record<string, string> = {
      account: "Account Issues",
      billing: "Billing & Payments",
      listing: "Listing Help",
      leads: "Leads & Contacts",
      technical: "Technical Support",
      other: "Other",
    };

    const categoryLabel = categoryLabels[category] || category;

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1B365D; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 20px;">Provider Support Request</h1>
  </div>
  
  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #6b7280; width: 120px;">Category:</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${categoryLabel}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #6b7280;">Provider:</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${providerName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #6b7280;">Email:</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><a href="mailto:${providerEmail}" style="color: #1B365D;">${providerEmail}</a></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #6b7280;">Facility:</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${facilityInfo}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">User ID:</td>
        <td style="padding: 8px 0; font-size: 12px; color: #9ca3af;">${user.id}</td>
      </tr>
    </table>
    
    <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">Subject</h3>
      <p style="margin: 0; font-weight: 500;">${subject}</p>
    </div>
    
    <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">Message</h3>
      <p style="margin: 0; white-space: pre-wrap;">${message}</p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">
      This support request was submitted via the RehabLookup Provider Portal.
    </p>
  </div>
</body>
</html>
    `;

    // Send email via Resend
    const resend = new Resend(resendApiKey);
    const emailResponse = await resend.emails.send({
      from: "RehabLookup Support <noreply@resend.dev>",
      to: ["providers@rehablookup.com"], // Support team email
      subject: `[${categoryLabel}] ${subject}`,
      html: emailHtml,
      reply_to: providerEmail,
    });

    console.log("[SEND-SUPPORT-REQUEST] Email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Support request submitted successfully" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("[SEND-SUPPORT-REQUEST] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
