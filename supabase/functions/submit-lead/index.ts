import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadRequest {
  facilityId: string;
  facilityName: string;
  facilityEmail?: string | null;
  name: string;
  phone: string;
  email: string;
  message?: string | null;
  preferredContact: "call" | "email";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: LeadRequest = await req.json();
    console.log("Received lead submission:", JSON.stringify({
      facilityId: body.facilityId,
      facilityName: body.facilityName,
      name: body.name,
      preferredContact: body.preferredContact,
    }));

    // Validate required fields
    if (!body.facilityId || !body.name || !body.phone || !body.email) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify facility exists and is approved
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, status, email, name")
      .eq("id", body.facilityId)
      .eq("status", "approved")
      .maybeSingle();

    if (facilityError || !facility) {
      console.error("Facility not found or not approved:", facilityError);
      return new Response(
        JSON.stringify({ error: "Facility not found or not approved" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Insert lead into database
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        facility_id: body.facilityId,
        name: body.name,
        phone: body.phone,
        email: body.email,
        message: body.message || null,
        preferred_contact: body.preferredContact,
      })
      .select()
      .single();

    if (leadError) {
      console.error("Failed to create lead:", leadError);
      return new Response(
        JSON.stringify({ error: "Failed to create lead" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Lead created successfully:", lead.id);

    // Send email notification to facility if they have an email
    const facilityEmailAddress = body.facilityEmail || facility.email;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (facilityEmailAddress && resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #fff; margin: 0; font-size: 24px;">New Contact Request</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">via RehabLookup</p>
            </div>
            
            <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; margin-bottom: 24px;">
                You have received a new contact request for <strong>${body.facilityName}</strong>.
              </p>
              
              <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1B365D;">Contact Details</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; width: 140px;">Name:</td>
                    <td style="padding: 8px 0; font-weight: 600;">${body.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
                    <td style="padding: 8px 0;"><a href="tel:${body.phone}" style="color: #1B365D; text-decoration: none; font-weight: 600;">${body.phone}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                    <td style="padding: 8px 0;"><a href="mailto:${body.email}" style="color: #1B365D; text-decoration: none;">${body.email}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Preferred Contact:</td>
                    <td style="padding: 8px 0; text-transform: capitalize;">${body.preferredContact}</td>
                  </tr>
                </table>
              </div>
              
              ${body.message ? `
              <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1B365D;">Message</h3>
                <p style="margin: 0; color: #374151;">${body.message}</p>
              </div>
              ` : ''}
              
              <div style="text-align: center; margin-top: 24px;">
                <a href="tel:${body.phone}" style="display: inline-block; background: #1B365D; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Call ${body.name}
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
              
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                This lead was submitted via RehabLookup.com. Please respond within 24 hours for the best chance of conversion.
              </p>
            </div>
          </body>
          </html>
        `;

        const emailResponse = await resend.emails.send({
          from: "RehabLookup <noreply@resend.dev>",
          to: [facilityEmailAddress],
          subject: `New Contact Request from ${body.name} - RehabLookup`,
          html: emailHtml,
        });

        console.log("Email sent successfully:", emailResponse);
      } catch (emailError) {
        // Log email error but don't fail the request
        console.error("Failed to send email notification:", emailError);
      }
    } else {
      console.log("Email notification skipped - no facility email or API key");
    }

    return new Response(
      JSON.stringify({ success: true, leadId: lead.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in submit-lead function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
