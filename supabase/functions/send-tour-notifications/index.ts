import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  tourRequestedFacilityEmail,
  tourRequestedAdminEmail,
  tourProposedUserEmail,
  tourConfirmedFacilityEmail,
  tourCancelledFacilityEmail,
  tourCancelledUserEmail,
  TourEmailData,
} from "../_shared/tour-email-templates.ts";

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

    // Build email data object
    const emailData: TourEmailData = {
      seekerName: tour.inquiry?.user_name || "Seeker",
      facilityName: tour.facility?.name || "Facility",
      facilityCity: tour.facility?.city || "",
      facilityState: tour.facility?.state || "",
      tourType: tour.tour_type === "virtual" ? "virtual" : "in-person",
      preferredDates: Array.isArray(tour.preferred_dates) ? tour.preferred_dates : [],
      proposedDateTime: tour.proposed_datetime || undefined,
      confirmedDateTime: tour.confirmed_datetime || undefined,
      notes: tour.notes || undefined,
      contactPreference: tour.contact_preference || undefined,
      facilityNotes: tour.facility_response_notes || undefined,
    };

    // Send notifications based on type
    switch (type) {
      case "tour_requested": {
        // Notify facility
        const facilityEmail = tour.facility?.concierge_admissions_email;
        
        if (resend && facilityEmail) {
          try {
            const emailResult = await resend.emails.send({
              from: "RehabLookup Concierge <placement@rehablookup.com>",
              to: [facilityEmail],
              subject: `New Tour Request - ${emailData.seekerName}`,
              html: tourRequestedFacilityEmail(emailData),
            });
            results.facilityEmail = emailResult;
            console.log("Facility email sent:", emailResult);
          } catch (emailErr) {
            console.error("Failed to send facility email:", emailErr);
          }
        }

        // Create in-app notification for provider
        if (tour.facility?.user_id) {
          await supabase.from("provider_notifications").insert({
            user_id: tour.facility.user_id,
            type: "tour_request",
            title: "New Tour Request",
            message: `${emailData.seekerName} has requested a ${tour.tour_type} tour.`,
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
              subject: `[Tour Requested] ${emailData.seekerName} → ${emailData.facilityName}`,
              html: tourRequestedAdminEmail(emailData),
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

        if (resend && userEmail) {
          try {
            const emailResult = await resend.emails.send({
              from: "RehabLookup Concierge <placement@rehablookup.com>",
              to: [userEmail],
              subject: `Tour Time Proposed - ${emailData.facilityName}`,
              html: tourProposedUserEmail(emailData),
            });
            results.userEmail = emailResult;
            console.log("User email sent:", emailResult);
          } catch (e) {
            console.error("User email failed:", e);
          }
        }

        // Create in-app notification for seeker
        if (tour.user_id) {
          await supabase.from("seeker_notifications").insert({
            user_id: tour.user_id,
            type: "tour_proposed",
            title: "Tour Time Proposed",
            message: `${emailData.facilityName} has proposed a tour time.`,
            link: "/account/concierge",
          });
        }
        break;
      }

      case "tour_confirmed": {
        // Notify facility that user accepted
        const facilityEmail = tour.facility?.concierge_admissions_email;

        if (resend && facilityEmail) {
          try {
            const emailResult = await resend.emails.send({
              from: "RehabLookup Concierge <placement@rehablookup.com>",
              to: [facilityEmail],
              subject: `Tour Confirmed - ${emailData.seekerName}`,
              html: tourConfirmedFacilityEmail(emailData),
            });
            results.facilityEmail = emailResult;
            console.log("Facility confirmation email sent:", emailResult);
          } catch (e) {
            console.error("Facility email failed:", e);
          }
        }

        // In-app notification for provider
        if (tour.facility?.user_id) {
          const confirmedTime = emailData.confirmedDateTime 
            ? new Date(emailData.confirmedDateTime).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
              })
            : "confirmed";
          await supabase.from("provider_notifications").insert({
            user_id: tour.facility.user_id,
            type: "tour_confirmed",
            title: "Tour Confirmed",
            message: `${emailData.seekerName} confirmed the tour for ${confirmedTime}.`,
            link: "/provider/concierge",
          });
        }

        // Notify admin
        if (resend) {
          try {
            await resend.emails.send({
              from: "RehabLookup Concierge <placement@rehablookup.com>",
              to: ["placement@rehablookup.com"],
              subject: `[Tour Confirmed] ${emailData.seekerName} → ${emailData.facilityName}`,
              html: `<div style="font-family: Arial; padding: 20px;">
                <h3>Tour Confirmed</h3>
                <p><strong>Seeker:</strong> ${emailData.seekerName}</p>
                <p><strong>Facility:</strong> ${emailData.facilityName}</p>
                <p><strong>Time:</strong> ${emailData.confirmedDateTime || "See details"}</p>
              </div>`,
            });
            results.adminEmail = true;
          } catch (e) {
            console.error("Admin email failed:", e);
          }
        }
        break;
      }

      case "tour_cancelled": {
        const cancelledBy = metadata?.cancelledBy as string || "user";
        
        if (cancelledBy === "user" && resend) {
          // User cancelled - notify facility
          const facilityEmail = tour.facility?.concierge_admissions_email;
          if (facilityEmail) {
            try {
              await resend.emails.send({
                from: "RehabLookup Concierge <placement@rehablookup.com>",
                to: [facilityEmail],
                subject: `Tour Cancelled - ${emailData.seekerName}`,
                html: tourCancelledFacilityEmail(emailData),
              });
              results.facilityEmail = true;
            } catch (e) {
              console.error("Cancel email failed:", e);
            }
          }

          // In-app notification for provider
          if (tour.facility?.user_id) {
            await supabase.from("provider_notifications").insert({
              user_id: tour.facility.user_id,
              type: "tour_cancelled",
              title: "Tour Cancelled",
              message: `${emailData.seekerName} cancelled their tour request.`,
              link: "/provider/concierge",
            });
          }
        } else if (cancelledBy === "facility" && resend) {
          // Facility cancelled - notify user
          const userEmail = tour.inquiry?.user_email;
          if (userEmail) {
            try {
              await resend.emails.send({
                from: "RehabLookup Concierge <placement@rehablookup.com>",
                to: [userEmail],
                subject: `Tour Update - ${emailData.facilityName}`,
                html: tourCancelledUserEmail(emailData),
              });
              results.userEmail = true;
            } catch (e) {
              console.error("User cancel email failed:", e);
            }
          }

          // In-app notification for user
          if (tour.user_id) {
            await supabase.from("seeker_notifications").insert({
              user_id: tour.user_id,
              type: "tour_cancelled",
              title: "Tour Update",
              message: `${emailData.facilityName} is unable to accommodate your tour.`,
              link: "/account/concierge",
            });
          }
        }

        // Notify admin of all cancellations
        if (resend) {
          try {
            await resend.emails.send({
              from: "RehabLookup Concierge <placement@rehablookup.com>",
              to: ["placement@rehablookup.com"],
              subject: `[Tour Cancelled] ${emailData.seekerName} → ${emailData.facilityName}`,
              html: `<div style="font-family: Arial; padding: 20px;">
                <h3>Tour Cancelled</h3>
                <p><strong>Cancelled By:</strong> ${cancelledBy}</p>
                <p><strong>Seeker:</strong> ${emailData.seekerName}</p>
                <p><strong>Facility:</strong> ${emailData.facilityName}</p>
              </div>`,
            });
          } catch (e) {
            console.error("Admin cancel email failed:", e);
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
