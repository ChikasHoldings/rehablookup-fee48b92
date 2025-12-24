import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewRequestBody {
  facilityId: string;
  recipientName: string;
  recipientEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { facilityId, recipientName, recipientEmail }: ReviewRequestBody = await req.json();

    // Validate required fields
    if (!facilityId || !recipientName || !recipientEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user owns this facility
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, name, city, state, slug, user_id")
      .eq("id", facilityId)
      .eq("user_id", user.id)
      .single();

    if (facilityError || !facility) {
      console.error("Facility not found or unauthorized:", facilityError);
      return new Response(JSON.stringify({ error: "Facility not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if we already sent a request to this email for this facility recently (within 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: existingRequest } = await supabase
      .from("review_requests")
      .select("id, sent_at")
      .eq("facility_id", facilityId)
      .eq("recipient_email", recipientEmail.toLowerCase())
      .gte("sent_at", thirtyDaysAgo.toISOString())
      .limit(1);

    if (existingRequest && existingRequest.length > 0) {
      return new Response(JSON.stringify({ 
        error: "A review request was already sent to this email within the last 30 days" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate review link
    const baseUrl = Deno.env.get("SITE_URL") || "https://pathwayhub.com";
    const reviewLink = `${baseUrl}/center/${facility.slug}?action=review`;

    // Create the review request record first (pending status)
    const { data: reviewRequest, error: insertError } = await supabase
      .from("review_requests")
      .insert({
        facility_id: facilityId,
        sender_user_id: user.id,
        recipient_name: recipientName,
        recipient_email: recipientEmail.toLowerCase(),
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating review request:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create review request" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send the email using Resend's default domain for testing
    // In production, replace with your verified domain
    const emailResponse = await resend.emails.send({
      from: "PathwayHub <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `${facility.name} would love to hear about your experience`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Share Your Experience</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi ${recipientName},
              </p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                We hope you're doing well! <strong>${facility.name}</strong> in ${facility.city}, ${facility.state} 
                would love to hear about your experience with their services.
              </p>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Your feedback helps others who are searching for the right care. Would you take a moment to leave a review?
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${reviewLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                          color: white; padding: 14px 35px; border-radius: 8px; text-decoration: none; 
                          font-weight: 600; font-size: 16px;">
                  Leave a Review
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">
                Your review will help others find the care they need. Thank you for taking the time to share your experience.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                This email was sent by ${facility.name} via PathwayHub.<br>
                If you believe you received this email in error, you can safely ignore it.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email response:", JSON.stringify(emailResponse));

    // Check if email sending failed
    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      // Still mark as failed but don't block
      await supabase
        .from("review_requests")
        .update({
          status: "failed",
        })
        .eq("id", reviewRequest.id);

      return new Response(JSON.stringify({ 
        error: `Failed to send email: ${emailResponse.error.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the review request with sent status and resend_id
    const { error: updateError } = await supabase
      .from("review_requests")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        resend_id: emailResponse.data?.id || null,
      })
      .eq("id", reviewRequest.id);

    if (updateError) {
      console.error("Error updating review request:", updateError);
    }

    console.log("Review request sent successfully:", reviewRequest.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Review request sent successfully",
      requestId: reviewRequest.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in send-review-request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
