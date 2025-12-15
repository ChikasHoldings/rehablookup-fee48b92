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

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: facility } = await supabase
      .from("facilities")
      .select("name, city, state")
      .eq("user_id", user.id)
      .maybeSingle();

    const providerName = profile ? `${profile.first_name} ${profile.last_name}` : "Unknown";
    const providerEmail = user.email || profile?.email || "Unknown";
    const facilityInfo = facility ? `${facility.name} (${facility.city}, ${facility.state})` : "No facility";

    const categoryLabels: Record<string, string> = {
      account: "Account",
      billing: "Billing",
      listing: "Listing",
      leads: "Leads",
      technical: "Technical",
      other: "Other",
    };

    const categoryLabel = categoryLabels[category] || category;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f6f8fb;">
  <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <div style="background: #1B365D; padding: 20px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 16px; font-weight: 600;">Support Request: ${categoryLabel}</h1>
    </div>
    
    <div style="padding: 24px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 80px;">From:</td>
          <td style="padding: 6px 0;">${providerName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Email:</td>
          <td style="padding: 6px 0;"><a href="mailto:${providerEmail}" style="color: #1B365D;">${providerEmail}</a></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Facility:</td>
          <td style="padding: 6px 0;">${facilityInfo}</td>
        </tr>
      </table>
      
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Subject</p>
        <p style="margin: 0; font-weight: 500;">${subject}</p>
      </div>
      
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Message</p>
        <p style="margin: 0; white-space: pre-wrap;">${message}</p>
      </div>
      
      <p style="font-size: 11px; color: #94a3b8; margin: 16px 0 0 0;">
        User ID: ${user.id}
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const resend = new Resend(resendApiKey);
    const emailResponse = await resend.emails.send({
      from: "RehabLookup Support <noreply@resend.dev>",
      to: ["providers@rehablookup.com"],
      subject: `[${categoryLabel}] ${subject}`,
      html: emailHtml,
      reply_to: providerEmail,
    });

    console.log("[SEND-SUPPORT-REQUEST] Email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Support request submitted" 
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
