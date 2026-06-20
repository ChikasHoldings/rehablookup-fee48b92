import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { ApiError, apiErrorResponse } from "../_shared/validation.ts";
import { getCaseEventActorType } from "../_shared/case-event-actor.ts";

const VERSION = "1.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[SEND-CONCIERGE-INTRO] [${VERSION}] [${requestId}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// UUID validation
const isValidUUID = (str: string): boolean => {
  if (!str || typeof str !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

interface IntroductionRequest {
  inquiryId: string;
  facilityId: string;
  introductionId?: string; // Optional for auto-introduction (system will create the row)
  responseDeadline?: string; // ISO timestamp for provider response deadline
}

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // POST only
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep(requestId, "Function started", { version: VERSION });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    // Authenticate caller - must be admin OR service_role (for automated introductions)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep(requestId, "Unauthorized: missing Authorization header");
      throw new ApiError("UNAUTHORIZED", "Missing Authorization header", 401);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    let actorType = 'system';
    let isServiceRole = false;
    let callerUserId: string | null = null;

    // Check if this is a service_role call (from other edge functions)
    if (token === supabaseKey) {
      isServiceRole = true;
      actorType = 'system';
      logStep(requestId, "Service-role call (automated introduction)");
    } else {
      // Verify as admin user
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: userData, error: userError } = await anonClient.auth.getUser(token);
      if (userError || !userData.user) {
        logStep(requestId, "Unauthorized: invalid token", { error: userError?.message });
        throw new ApiError("UNAUTHORIZED", "Authentication failed", 401);
      }

      // Verify admin role
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      // Resolve granular admin role for actor_type attribution
      const { data: adminProfile } = await supabase
        .from("admin_user_profiles")
        .select("admin_role")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      actorType = getCaseEventActorType(adminProfile?.admin_role ?? null);

      if (!adminRole) {
        throw new ApiError("FORBIDDEN", "Only administrators can send introductions", 403);
      }

      callerUserId = userData.user.id;
      logStep(requestId, "Admin authenticated", { adminId: callerUserId });
    }

    const resend = new Resend(resendKey);
    
    const body = await req.json();
    const { inquiryId, facilityId, introductionId, responseDeadline }: IntroductionRequest = body;

    // Per-field validation
    if (!inquiryId)  throw new ApiError("MISSING_FIELD_INQUIRY_ID", "inquiryId is required", 400);
    if (!facilityId) throw new ApiError("MISSING_FIELD_FACILITY_ID", "facilityId is required", 400);
    if (!isValidUUID(inquiryId))  throw new ApiError("INVALID_INQUIRY_ID", "Invalid inquiryId format", 400);
    if (!isValidUUID(facilityId)) throw new ApiError("INVALID_FACILITY_ID", "Invalid facilityId format", 400);

    // introductionId is optional for auto-introductions (system creates the row)
    let resolvedIntroductionId = introductionId;
    if (!resolvedIntroductionId) {
      // Auto-create the introduction row (system-initiated)
      const { data: newIntro, error: insertErr } = await supabase
        .from('concierge_introductions')
        .insert({
          inquiry_id: inquiryId,
          facility_id: facilityId,
          provider_response: 'pending',
          response_deadline_at: responseDeadline || null,
        })
        .select('id')
        .single();
      if (insertErr || !newIntro) {
        // Check if it already exists (idempotency)
        const { data: existing } = await supabase
          .from('concierge_introductions')
          .select('id')
          .eq('inquiry_id', inquiryId)
          .eq('facility_id', facilityId)
          .maybeSingle();
        if (existing) {
          resolvedIntroductionId = existing.id;
        } else {
          throw new ApiError("INSERT_FAILED", `Failed to create introduction: ${insertErr?.message}`, 500);
        }
      } else {
        resolvedIntroductionId = newIntro.id;
      }
      logStep(requestId, "Auto-created introduction row", { introductionId: resolvedIntroductionId });
    } else {
      if (!isValidUUID(resolvedIntroductionId)) throw new ApiError("INVALID_INTRODUCTION_ID", "Invalid introductionId format", 400);
    }

    logStep(requestId, "Processing", { inquiryId, facilityId, introductionId: resolvedIntroductionId });

    // Idempotency: check if introduction already sent
    const { data: existingIntro } = await supabase
      .from("concierge_introductions")
      .select("id, sent_at")
      .eq("id", resolvedIntroductionId)
      .single();

    if (existingIntro?.sent_at) {
      logStep(requestId, "Introduction already sent - idempotent return", { introductionId: resolvedIntroductionId });
      return new Response(JSON.stringify({ 
        success: true, 
        alreadySent: true, 
        requestId, 
        _version: VERSION 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch inquiry details
    const { data: inquiry, error: inquiryError } = await supabase
      .from("concierge_inquiries")
      .select("id, status, level_of_care, insurance_carrier, insurance_member_id, payment_type, preferred_city, preferred_state, gender, age_range, timeline_urgency, primary_concern")
      .eq("id", inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      throw new Error("Inquiry not found");
    }

    // Guard: don't send introductions for closed/placed cases
    if (inquiry.status === 'closed' || inquiry.status === 'placed') {
      throw new Error(`Cannot send introduction: case is ${inquiry.status}`);
    }

    // Fetch facility details
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, name, city, state, concierge_admissions_email, concierge_admissions_contact, email, reply_email, user_id")
      .eq("id", facilityId)
      .single();

    if (facilityError || !facility) {
      throw new Error("Facility not found");
    }

    // Determine recipient email - prioritize concierge email, then reply_email, then regular email
    const recipientEmail = facility.concierge_admissions_email || facility.reply_email || facility.email;
    
    if (!recipientEmail) {
      // Surface as a non-2xx so the batch caller counts it as a failure to
      // retry/fix, rather than a 200 that's silently tallied as "sent". The
      // partner genuinely can't be reached by the primary channel without an
      // email on file — an admin needs to add one.
      console.log("[SEND-CONCIERGE-INTRODUCTION] No email configured for facility:", facility.name);
      return new Response(JSON.stringify({
        success: false,
        error: "No email configured for this facility",
        code: "NO_EMAIL",
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contactName = facility.concierge_admissions_contact || "Admissions Team";
    const responseUrl = `https://rehablookup.com/provider/marketing/concierge`;

    // Format case details for email
    const levelOfCare = inquiry.level_of_care || "—";
    const insuranceInfo = inquiry.insurance_carrier 
      ? `${inquiry.insurance_carrier}${inquiry.insurance_member_id ? ` (ID: ${inquiry.insurance_member_id})` : ""}`
      : inquiry.payment_type === "self_pay" ? "Self-Pay" : "—";
    const location = inquiry.preferred_state 
      ? `${inquiry.preferred_city || "Any city"}, ${inquiry.preferred_state}`
      : "Flexible";
    const gender = inquiry.gender || "—";
    const ageRange = inquiry.age_range || "—";
    const urgency = inquiry.timeline_urgency || "Standard";
    const primaryConcern = inquiry.primary_concern || "—";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Concierge Introduction</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700;">
                New Concierge Case Introduction
              </h1>
              <p style="margin: 12px 0 0 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 15px;">
                A potential client has been matched to your facility
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #1a1a1a;">
                Hi ${contactName},
              </p>
              
              <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #4b5563; line-height: 1.6;">
                RehabLookup's Concierge Service has identified <strong>${facility.name}</strong> as a potential match for a family seeking treatment. Please review the case details below.
              </p>
              
              <!-- Case Details Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #1B365D;">
                      Case Summary
                    </h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; width: 140px; vertical-align: top;">Level of Care:</td>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${levelOfCare}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; vertical-align: top;">Primary Concern:</td>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${primaryConcern}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; vertical-align: top;">Insurance/Payment:</td>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${insuranceInfo}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; vertical-align: top;">Preferred Location:</td>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${location}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; vertical-align: top;">Gender:</td>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${gender}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; vertical-align: top;">Age Range:</td>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${ageRange}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; vertical-align: top;">Timeline:</td>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${urgency}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${responseUrl}" style="display: inline-block; background-color: #1B365D; background: #1B365D; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      Respond to This Introduction
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6;">
                You can also respond by replying directly to this email with your availability and interest level.
              </p>
              
              <!-- Note Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #92400e;">
                      <strong>Note:</strong> Full contact details will be provided once you indicate interest and the client confirms they'd like to connect with your facility.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280;">
                Questions? Contact our Concierge team at <a href="mailto:concierge@rehablookup.com" style="color: #1B365D;">concierge@rehablookup.com</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; color: #ffffff;">
                RehabLookup Concierge
              </p>
              <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #cbd5e1;">
                © ${new Date().getFullYear()} RehabLookup. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const result = await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup Concierge <no-reply@rehablookup.com>",
      to: [recipientEmail],
      subject: `New Concierge Case Introduction - ${levelOfCare}`,
      html: emailHtml,
      replyTo: "concierge@rehablookup.com",
    }, {
      emailType: "concierge_introduction",
      idempotencyKey: `intro-${resolvedIntroductionId}`,
      metadata: { inquiryId, facilityId, introductionId: resolvedIntroductionId },
    });

    if (!result.success) {
      console.error("[SEND-CONCIERGE-INTRODUCTION] Email failed:", result.error);
      throw new Error(result.error || "Email send failed");
    }

    console.log("[SEND-CONCIERGE-INTRODUCTION] Email sent successfully to:", recipientEmail);

    // Mark the introduction as sent (idempotency key for future calls)
    await supabase
      .from("concierge_introductions")
      .update({ sent_at: new Date().toISOString(), ...(callerUserId ? { sent_by: callerUserId } : {}) })
      .eq("id", resolvedIntroductionId);

    // Log case event for introduction sent
    await supabase.from("concierge_case_events").insert({
      inquiry_id: inquiryId,
      event_type: "introduction_sent",
      event_data: { facility_id: facilityId, facility_name: facility.name },
      actor_id: callerUserId,
      actor_type: actorType,
    });

    // Create provider notification
    const { data: facilityFull } = await supabase
      .from("facilities")
      .select("user_id")
      .eq("id", facilityId)
      .single();

    if (facilityFull?.user_id) {
      // provider_notifications has no `link` column — a top-level `link` here
      // threw PGRST204 and silently dropped the notification AND skipped the
      // SMS below (the insert was un-try/caught). The deep link comes from the
      // notification registry (placement_introduction → /provider/marketing/
      // concierge). Best-effort so a notification hiccup can't break the
      // introduction or its SMS.
      try {
        await supabase.from("provider_notifications").insert({
          user_id: facilityFull.user_id,
          type: "placement_introduction",
          title: "New Placement Introduction",
          message: `A potential client (${levelOfCare}) has been matched to your facility. Review and respond in your Placement Network.`,
          metadata: { inquiry_id: inquiryId, introduction_id: resolvedIntroductionId },
        });
      } catch (notifErr) {
        console.warn("[send-concierge-introduction] provider notification insert failed", notifErr);
      }

      // SMS channel — best-effort, but AWAITED with a bounded timeout so it
      // actually dispatches (an un-awaited fetch can be cut off when the
      // isolate suspends on return, silently dropping the SMS) while a slow or
      // down SMS service can't delay/break the introduction. send-sms-notification
      // enforces the provider's prefs, phone verification, TCPA opt-out, and
      // daily budget, and no-ops gracefully when SMS isn't configured.
      try {
        const smsMsg = `RehabLookup: A family was matched to your facility by our advisors (${levelOfCare}). Open your Placement Network to respond.`;
        const smsCtrl = new AbortController();
        const smsTimer = setTimeout(() => smsCtrl.abort(), 5000);
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
            body: JSON.stringify({
              userId: facilityFull.user_id,
              notificationType: "general",
              data: { customMessage: smsMsg },
            }),
            signal: smsCtrl.signal,
          });
        } finally {
          clearTimeout(smsTimer);
        }
      } catch (smsErr) {
        logStep(requestId, "Warning: intro SMS dispatch failed (non-fatal)", { error: String(smsErr) });
      }
    }

    logStep(requestId, "Email sent successfully", { sentTo: recipientEmail, emailId: result.emailId });

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: result.emailId,
      sentTo: recipientEmail,
      requestId,
      _version: VERSION,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep(requestId, "ERROR", { message: errorMessage });
    return apiErrorResponse(error, corsHeaders, { requestId, _version: VERSION });
  }
});
