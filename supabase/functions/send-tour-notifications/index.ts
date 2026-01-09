import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TourNotificationRequest {
  type: "tour_requested" | "tour_proposed" | "tour_confirmed" | "tour_cancelled";
  tourId: string;
  metadata?: Record<string, unknown>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, tourId, metadata }: TourNotificationRequest = await req.json();
    console.log("Tour notification request:", { type, tourId });

    if (!type || !tourId) {
      return new Response(JSON.stringify({ error: "Missing type or tourId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch tour request with related data
    const { data: tour, error: tourError } = await supabase
      .from("concierge_tour_requests")
      .select(`
        *,
        facility:facilities(id, name, city, state, concierge_admissions_email, user_id),
        inquiry:concierge_inquiries(id, user_name, user_email, user_phone)
      `)
      .eq("id", tourId)
      .single();

    if (tourError || !tour) {
      console.error("Tour not found:", tourError);
      return new Response(JSON.stringify({ error: "Tour not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const results: Record<string, unknown> = {};

    const tourTypeLabel = tour.tour_type === "virtual" ? "Virtual Tour" : "In-Person Tour";
    const preferredDates = Array.isArray(tour.preferred_dates) 
      ? tour.preferred_dates.map((d: string) => new Date(d).toLocaleDateString("en-US", { 
          weekday: "short", month: "short", day: "numeric" 
        })).join(", ")
      : "Not specified";

    // Send notifications based on type
    switch (type) {
      case "tour_requested": {
        // Notify facility + admin
        const facilityEmail = tour.facility?.concierge_admissions_email;
        
        if (resend && facilityEmail) {
          try {
            const emailResult = await resend.emails.send({
              from: "RehabLookup Concierge <placement@rehablookup.com>",
              to: [facilityEmail],
              subject: `New Tour Request - ${tour.inquiry?.user_name || "Seeker"}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1a365d;">New Tour Request</h2>
                  <p>A concierge seeker has requested a tour at ${tour.facility?.name}.</p>
                  
                  <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Seeker:</strong> ${tour.inquiry?.user_name || "Unknown"}</p>
                    <p><strong>Tour Type:</strong> ${tourTypeLabel}</p>
                    <p><strong>Preferred Dates:</strong> ${preferredDates}</p>
                    <p><strong>Contact Preference:</strong> ${tour.contact_preference || "Not specified"}</p>
                    ${tour.notes ? `<p><strong>Notes:</strong> ${tour.notes}</p>` : ""}
                  </div>
                  
                  <p>Please log in to your provider dashboard to respond to this request.</p>
                  
                  <a href="https://rehablookup.com/provider/concierge" 
                     style="display: inline-block; background: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
                    View Tour Request
                  </a>
                </div>
              `,
            });
            results.facilityEmail = emailResult;
            console.log("Facility email sent:", emailResult);
          } catch (emailErr) {
            console.error("Failed to send facility email:", emailErr);
          }
        }

        // Create in-app notification for provider
        if (tour.facility?.user_id) {
          await supabase.from("admin_user_notifications").insert({
            user_id: tour.facility.user_id,
            type: "tour_request",
            title: "New Tour Request",
            message: `${tour.inquiry?.user_name || "A seeker"} has requested a ${tour.tour_type} tour.`,
            link: "/provider/concierge",
          });
          results.providerNotification = true;
        }

        // Notify admin team
        if (resend) {
          try {
            await resend.emails.send({
              from: "RehabLookup Concierge <placement@rehablookup.com>",
              to: ["placement@rehablookup.com"],
              subject: `[Tour Requested] ${tour.inquiry?.user_name} → ${tour.facility?.name}`,
              html: `
                <div style="font-family: Arial, sans-serif;">
                  <h3>Tour Request Created</h3>
                  <p><strong>Seeker:</strong> ${tour.inquiry?.user_name} (${tour.inquiry?.user_email})</p>
                  <p><strong>Facility:</strong> ${tour.facility?.name}</p>
                  <p><strong>Type:</strong> ${tourTypeLabel}</p>
                  <p><strong>Dates:</strong> ${preferredDates}</p>
                </div>
              `,
            });
            results.adminEmail = true;
          } catch (e) {
            console.error("Admin email failed:", e);
          }
        }
        break;
      }

      case "tour_proposed": {
        // Notify user that facility proposed a time
        const userEmail = tour.inquiry?.user_email;
        const proposedTime = tour.proposed_datetime 
          ? new Date(tour.proposed_datetime).toLocaleString("en-US", {
              weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit"
            })
          : "See details";

        if (resend && userEmail) {
          try {
            const emailResult = await resend.emails.send({
              from: "RehabLookup Concierge <placement@rehablookup.com>",
              to: [userEmail],
              subject: `Tour Time Proposed - ${tour.facility?.name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1a365d;">Tour Time Proposed</h2>
                  <p>Hi ${tour.inquiry?.user_name?.split(" ")[0] || "there"},</p>
                  <p>${tour.facility?.name} has proposed a time for your ${tour.tour_type} tour.</p>
                  
                  <div style="background: #ebf8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3182ce;">
                    <p style="font-size: 18px; margin: 0;"><strong>Proposed Time:</strong></p>
                    <p style="font-size: 20px; color: #2b6cb0; margin: 10px 0;">${proposedTime}</p>
                    ${tour.facility_response_notes ? `<p style="color: #666;"><em>${tour.facility_response_notes}</em></p>` : ""}
                  </div>
                  
                  <p>Please log in to accept or request a different time.</p>
                  
                  <a href="https://rehablookup.com/account/concierge" 
                     style="display: inline-block; background: #38a169; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
                    View & Respond
                  </a>
                </div>
              `,
            });
            results.userEmail = emailResult;
          } catch (e) {
            console.error("User email failed:", e);
          }
        }
        break;
      }

      case "tour_confirmed": {
        // Notify facility that user accepted
        const facilityEmail = tour.facility?.concierge_admissions_email;
        const confirmedTime = tour.confirmed_datetime 
          ? new Date(tour.confirmed_datetime).toLocaleString("en-US", {
              weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit"
            })
          : "Confirmed";

        if (resend && facilityEmail) {
          try {
            const emailResult = await resend.emails.send({
              from: "RehabLookup Concierge <placement@rehablookup.com>",
              to: [facilityEmail],
              subject: `Tour Confirmed - ${tour.inquiry?.user_name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #276749;">Tour Confirmed!</h2>
                  <p>${tour.inquiry?.user_name} has accepted your proposed tour time.</p>
                  
                  <div style="background: #f0fff4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #38a169;">
                    <p><strong>Confirmed Time:</strong> ${confirmedTime}</p>
                    <p><strong>Tour Type:</strong> ${tourTypeLabel}</p>
                    <p><strong>Seeker:</strong> ${tour.inquiry?.user_name}</p>
                    <p><strong>Contact:</strong> ${tour.inquiry?.user_email}</p>
                  </div>
                  
                  <p>Please ensure you're prepared for the tour at the scheduled time.</p>
                </div>
              `,
            });
            results.facilityEmail = emailResult;
          } catch (e) {
            console.error("Facility email failed:", e);
          }
        }

        // In-app notification
        if (tour.facility?.user_id) {
          await supabase.from("admin_user_notifications").insert({
            user_id: tour.facility.user_id,
            type: "tour_confirmed",
            title: "Tour Confirmed",
            message: `${tour.inquiry?.user_name || "Seeker"} confirmed the tour for ${confirmedTime}.`,
            link: "/provider/concierge",
          });
        }
        break;
      }

      case "tour_cancelled": {
        // Notify the other party about cancellation
        const cancelledBy = metadata?.cancelledBy as string || "user";
        
        if (cancelledBy === "user" && resend) {
          // Notify facility
          const facilityEmail = tour.facility?.concierge_admissions_email;
          if (facilityEmail) {
            try {
              await resend.emails.send({
                from: "RehabLookup Concierge <placement@rehablookup.com>",
                to: [facilityEmail],
                subject: `Tour Cancelled - ${tour.inquiry?.user_name}`,
                html: `
                  <div style="font-family: Arial, sans-serif;">
                    <h2 style="color: #c53030;">Tour Cancelled</h2>
                    <p>${tour.inquiry?.user_name} has cancelled their tour request at ${tour.facility?.name}.</p>
                  </div>
                `,
              });
              results.facilityEmail = true;
            } catch (e) {
              console.error("Cancel email failed:", e);
            }
          }
        }
        break;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Tour notification error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
