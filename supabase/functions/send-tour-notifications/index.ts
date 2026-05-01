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
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { jsonError } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TourNotificationRequest {
  type: "tour_requested" | "tour_proposed" | "tour_confirmed" | "tour_cancelled";
  tourId: string;
  metadata?: Record<string, unknown>;
}

// SMS helper function
async function sendSMS(phone: string, message: string): Promise<boolean> {
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!twilioSid || !twilioToken || !twilioPhone) {
    console.log("Twilio not configured, skipping SMS");
    return false;
  }

  // Format phone to E.164
  let formatted = phone.replace(/\D/g, "");
  if (formatted.length === 10) {
    formatted = `+1${formatted}`;
  } else if (!formatted.startsWith("+")) {
    formatted = `+${formatted}`;
  }

  // Truncate message to 160 chars
  const smsMessage = message.length > 160 ? message.substring(0, 157) + "..." : message;

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const authHeader = btoa(`${twilioSid}:${twilioToken}`);
    
    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formatted,
        From: twilioPhone,
        Body: smsMessage,
      }),
    });

    if (response.ok) {
      console.log("SMS sent successfully to", formatted);
      return true;
    } else {
      const errorText = await response.text();
      console.error("SMS failed:", errorText);
      return false;
    }
  } catch (error) {
    console.error("SMS error:", error);
    return false;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("method_not_allowed", "Method not allowed", 405, corsHeaders, {}, { allowed: ["POST", "OPTIONS"] });
  }

  try {
    let parsed: TourNotificationRequest;
    try {
      parsed = await req.json();
    } catch {
      return jsonError("invalid_json", "Request body is not valid JSON", 400, corsHeaders);
    }

    const { type, tourId, metadata } = parsed;
    console.log("Tour notification request:", { type, tourId });

    if (!type || !tourId) {
      const missing = [!type && "type", !tourId && "tourId"].filter(Boolean);
      return jsonError("validation_error", "Missing type or tourId", 400, corsHeaders, {}, { missing });
    }

    const ALLOWED_TYPES = ["tour_requested", "tour_proposed", "tour_confirmed", "tour_cancelled"] as const;
    if (!(ALLOWED_TYPES as readonly string[]).includes(type)) {
      return jsonError("invalid_type", "Unsupported notification type", 400, corsHeaders, {}, { field: "type", allowed: ALLOWED_TYPES });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch tour request with related data
    const { data: tour, error: tourError } = await supabase
      .from("concierge_tour_requests")
      .select(`
        *,
        facility:facilities(id, name, city, state, concierge_admissions_email, concierge_admissions_phone, user_id),
        inquiry:concierge_inquiries(id, user_name, user_email, user_phone, user_id)
      `)
      .eq("id", tourId)
      .single();

    if (tourError || !tour) {
      console.error("Tour not found:", tourError);
      return jsonError("tour_not_found", "Tour not found", 404, corsHeaders, {}, { tourId, dbError: tourError?.message });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const results: Record<string, unknown> = {};

    // Build email data object
    const emailData: TourEmailData = {
      seekerName: tour.inquiry?.user_name || "Client",
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

    // Helper for formatted datetime
    const formatDateTime = (dt: string | null | undefined): string => {
      if (!dt) return "TBD";
      return new Date(dt).toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric", 
        hour: "numeric", minute: "2-digit"
      });
    };

    // Send notifications based on type
    switch (type) {
      case "tour_requested": {
        // Notify facility
        const facilityEmail = tour.facility?.concierge_admissions_email;
        
        if (resend && facilityEmail) {
          try {
            const emailResult = await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Concierge <no-reply@rehablookup.com>",
              to: [facilityEmail],
              subject: `New Tour Request - ${emailData.seekerName}`,
              html: tourRequestedFacilityEmail(emailData),
            }, {
              emailType: "tour_requested_facility",
              idempotencyKey: `tour-req-facility-${tourId}`,
            });
            results.facilityEmail = emailResult;
            console.log("Facility email sent:", emailResult);
          } catch (emailErr) {
            console.error("Failed to send facility email:", emailErr);
          }
        }

        // SMS to facility
        const facilityPhone = tour.facility?.concierge_admissions_phone;
        if (facilityPhone) {
          const smsMessage = `RehabLookup: New tour request from ${emailData.seekerName}. Type: ${tour.tour_type}. View in provider dashboard: https://rehablookup.com/provider/concierge`;
          const smsSent = await sendSMS(facilityPhone, smsMessage);
          results.facilitySMS = smsSent;
        }

        // Create in-app notification for provider
        if (tour.facility?.user_id) {
          await supabase.from("provider_notifications").insert({
            user_id: tour.facility.user_id,
            type: "tour_request",
            title: "New Tour Request",
            message: `${emailData.seekerName} has requested a ${tour.tour_type} tour.`,
            link: "/provider/placement-network",
          });
          results.providerNotification = true;
        }

        // Log case event
        await supabase.from("concierge_case_events").insert({
          inquiry_id: tour.inquiry?.id,
          event_type: "tour_requested",
          event_data: { facility_id: tour.facility?.id, tour_type: tour.tour_type },
          actor_type: "seeker",
        });

        // Notify admin team
        if (resend) {
          try {
            await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Concierge <no-reply@rehablookup.com>",
              to: ["placement@rehablookup.com"],
              subject: `[Tour Requested] ${emailData.seekerName} → ${emailData.facilityName}`,
              html: tourRequestedAdminEmail(emailData),
            }, {
              emailType: "tour_requested_admin",
              idempotencyKey: `tour-req-admin-${tourId}`,
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
        const userPhone = tour.inquiry?.user_phone;

        if (resend && userEmail) {
          try {
            const emailResult = await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Concierge <no-reply@rehablookup.com>",
              to: [userEmail],
              subject: `Tour Time Proposed - ${emailData.facilityName}`,
              html: tourProposedUserEmail(emailData),
            }, {
              emailType: "tour_proposed_user",
              idempotencyKey: `tour-proposed-user-${tourId}`,
            });
            results.userEmail = emailResult;
            console.log("User email sent:", emailResult);
          } catch (e) {
            console.error("User email failed:", e);
          }
        }

        // SMS to seeker
        if (userPhone) {
          const proposedTime = formatDateTime(tour.proposed_datetime);
          const smsMessage = `RehabLookup: ${emailData.facilityName} proposed tour for ${proposedTime}. Confirm here: https://rehablookup.com/account/concierge`;
          const smsSent = await sendSMS(userPhone, smsMessage);
          results.userSMS = smsSent;
        }

        // Create in-app notification for seeker
        if (tour.inquiry?.user_id) {
          await supabase.from("seeker_notifications").insert({
            user_id: tour.inquiry.user_id,
            type: "tour_proposed",
            title: "Tour Time Proposed",
            message: `${emailData.facilityName} has proposed a tour time: ${formatDateTime(tour.proposed_datetime)}.`,
            link: "/account/concierge",
          });
        }

        // Log case event
        await supabase.from("concierge_case_events").insert({
          inquiry_id: tour.inquiry?.id,
          event_type: "tour_proposed",
          event_data: { facility_id: tour.facility?.id, proposed_datetime: tour.proposed_datetime },
          actor_type: "provider",
        });
        break;
      }

      case "tour_confirmed": {
        // Notify facility that user accepted
        const facilityEmail = tour.facility?.concierge_admissions_email;
        const facilityPhone = tour.facility?.concierge_admissions_phone;

        if (resend && facilityEmail) {
          try {
            const emailResult = await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Concierge <no-reply@rehablookup.com>",
              to: [facilityEmail],
              subject: `Tour Confirmed - ${emailData.seekerName}`,
              html: tourConfirmedFacilityEmail(emailData),
            }, {
              emailType: "tour_confirmed_facility",
              idempotencyKey: `tour-confirmed-facility-${tourId}`,
            });
            results.facilityEmail = emailResult;
            console.log("Facility confirmation email sent:", emailResult);
          } catch (e) {
            console.error("Facility email failed:", e);
          }
        }

        // SMS to facility
        if (facilityPhone) {
          const confirmedTime = formatDateTime(tour.confirmed_datetime);
          const smsMessage = `RehabLookup: Tour CONFIRMED! ${emailData.seekerName} will tour on ${confirmedTime}. Contact: ${tour.inquiry?.user_phone}`;
          const smsSent = await sendSMS(facilityPhone, smsMessage);
          results.facilitySMS = smsSent;
        }

        // In-app notification for provider
        if (tour.facility?.user_id) {
          const confirmedTime = formatDateTime(emailData.confirmedDateTime);
          await supabase.from("provider_notifications").insert({
            user_id: tour.facility.user_id,
            type: "tour_confirmed",
            title: "Tour Confirmed",
            message: `${emailData.seekerName} confirmed the tour for ${confirmedTime}.`,
            link: "/provider/placement-network",
          });
        }

        // Log case event
        await supabase.from("concierge_case_events").insert({
          inquiry_id: tour.inquiry?.id,
          event_type: "tour_confirmed",
          event_data: { facility_id: tour.facility?.id, confirmed_datetime: tour.confirmed_datetime },
          actor_type: "seeker",
        });

        // Notify admin
        if (resend) {
          try {
            await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Concierge <no-reply@rehablookup.com>",
              to: ["placement@rehablookup.com"],
              subject: `[Tour Confirmed] ${emailData.seekerName} → ${emailData.facilityName}`,
              html: `<div style="font-family: Arial; padding: 20px;">
                <h3>Tour Confirmed</h3>
                <p><strong>Seeker:</strong> ${emailData.seekerName}</p>
                <p><strong>Facility:</strong> ${emailData.facilityName}</p>
                <p><strong>Time:</strong> ${formatDateTime(emailData.confirmedDateTime)}</p>
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
          const facilityPhone = tour.facility?.concierge_admissions_phone;

          if (facilityEmail) {
            try {
              await sendEmailWithRetry(supabase, resend, {
                from: "RehabLookup Concierge <no-reply@rehablookup.com>",
                to: [facilityEmail],
                subject: `Tour Cancelled - ${emailData.seekerName}`,
                html: tourCancelledFacilityEmail(emailData),
              });
              results.facilityEmail = true;
            } catch (e) {
              console.error("Cancel email failed:", e);
            }
          }

          // SMS to facility
          if (facilityPhone) {
            const smsMessage = `RehabLookup: Tour cancelled by ${emailData.seekerName}. We'll continue matching them with other facilities.`;
            await sendSMS(facilityPhone, smsMessage);
          }

          // In-app notification for provider
          if (tour.facility?.user_id) {
            await supabase.from("provider_notifications").insert({
              user_id: tour.facility.user_id,
              type: "tour_cancelled",
              title: "Tour Cancelled",
              message: `${emailData.seekerName} cancelled their tour request.`,
              link: "/provider/placement-network",
            });
          }
        } else if (cancelledBy === "facility" && resend) {
          // Facility cancelled - notify user
          const userEmail = tour.inquiry?.user_email;
          const userPhone = tour.inquiry?.user_phone;

          if (userEmail) {
            try {
              await sendEmailWithRetry(supabase, resend, {
                from: "RehabLookup Concierge <no-reply@rehablookup.com>",
                to: [userEmail],
                subject: `Tour Update - ${emailData.facilityName}`,
                html: tourCancelledUserEmail(emailData),
              });
              results.userEmail = true;
            } catch (e) {
              console.error("User cancel email failed:", e);
            }
          }

          // SMS to seeker
          if (userPhone) {
            const smsMessage = `RehabLookup: Unfortunately, ${emailData.facilityName} had to reschedule. View other options: https://rehablookup.com/account/concierge`;
            await sendSMS(userPhone, smsMessage);
          }

          // In-app notification for user
          if (tour.inquiry?.user_id) {
            await supabase.from("seeker_notifications").insert({
              user_id: tour.inquiry.user_id,
              type: "tour_cancelled",
              title: "Tour Update",
              message: `${emailData.facilityName} is unable to accommodate your tour.`,
              link: "/account/concierge",
            });
          }
        }

        // Log case event
        await supabase.from("concierge_case_events").insert({
          inquiry_id: tour.inquiry?.id,
          event_type: "tour_cancelled",
          event_data: { facility_id: tour.facility?.id, cancelled_by: cancelledBy },
          actor_type: cancelledBy === "user" ? "seeker" : "provider",
        });

        // Notify admin of all cancellations
        if (resend) {
          try {
            await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Concierge <no-reply@rehablookup.com>",
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
    const message = error instanceof Error ? error.message : String(error);
    return jsonError("internal_error", message, 500, corsHeaders);
  }
});
