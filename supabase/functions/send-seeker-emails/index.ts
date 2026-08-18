import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { sendSms } from "../_shared/twilio-sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-SEEKER-EMAILS] ${step}`, details ? JSON.stringify(details) : "");
};

/**
 * The ONLY type this function still sends.
 *
 * Directory cutover stage 3 retired the consumer account product, and with it
 * every account-lifecycle email this function used to carry: welcome,
 * welcome_followup, tips_finding_treatment, account_reminder, weekly_digest,
 * request_followup, placement_intro, password_changed and security_alert.
 * Their senders are gone — the seeker drip, the followup-reminder cron, the
 * weekly digest and the seeker signup/login screens — and the /account
 * destinations they linked are now 301s to /search-results.
 *
 * `facility_contacted_you` is NOT part of that retirement. It is live
 * directory product: a visitor contacts a facility through the public
 * listing, the provider (or an admin) marks the inquiry responded in their
 * panel, and this tells the person who asked. It works for anonymous
 * inquirers — no account required, which is the whole point of the
 * directory model.
 *
 * NOTE: `request_confirmation` was removed earlier (Gap G1 cleanup). The live
 * inquiry-confirmation email goes out from submit-qualified-lead/index.ts via
 * a direct sendEmailWithRetry call keyed by lead.id.
 */
type EmailType = "facility_contacted_you";

interface SeekerEmailRequest {
  type: EmailType;
  // seekerId is optional when leadId is provided — the function resolves
  // seekerId from the lead row's email so guest submissions still get
  // their notification.
  seekerId?: string;
  email?: string;
  metadata?: Record<string, unknown>;
  // Used by the facility_contacted_you flow so the function can derive
  // facility name + seeker email from the lead row and key idempotency
  // by lead id (so a seeker with multiple inquiries gets one email per
  // facility response, not just one ever).
  leadId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      logStep("Error: RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, seekerId: bodySeekerId, email, metadata: bodyMetadata, leadId }: SeekerEmailRequest = await req.json();
    logStep("Received request", { type, seekerId: bodySeekerId, hasEmail: !!email, leadId });

    // AUTHZ for the leadId-driven path (facility_contacted_you). This endpoint
    // runs with the service-role key and derives the seeker recipient from the
    // lead row, so without a caller check anyone could POST an arbitrary leadId
    // to spam a known seeker AND poison the per-lead idempotency key (which
    // would suppress the legitimate "a facility responded" notification later).
    // Require the caller to either present the service-role key (trusted server
    // callers) OR be able to READ the lead under RLS — i.e. the facility owner,
    // a team member, an admin, or the seeker themself (leads_select_consolidated
    // / leads_team_select). Other email types (welcome/digest/security/etc.) are
    // unaffected.
    if (leadId) {
      const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const isServiceCaller = token.length > 0 && token === srk;
      if (!isServiceCaller) {
        if (!token) {
          return new Response(
            JSON.stringify({ error: "Authentication required" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false },
        });
        const { data: visibleLead } = await userClient
          .from("leads")
          .select("id")
          .eq("id", leadId)
          .maybeSingle();
        if (!visibleLead) {
          logStep("Blocked unauthorized facility_contacted_you attempt", { leadId });
          return new Response(
            JSON.stringify({ error: "Not authorized for this lead" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // Allow callers to pass `leadId` instead of seekerId+email+metadata.
    // Used by the facility_contacted_you flow (provider marks a lead as
    // contacted/scheduled/etc in /provider/leads → InquiryDetailPanel).
    // The function then derives everything from the lead row using the
    // service-role client. Resolving server-side keeps the client call
    // tiny + tamper-resistant (a malicious client can't forge a
    // facilityName for a different lead's email).
    let seekerId = bodySeekerId;
    let seekerEmail = email;
    let metadata: Record<string, unknown> | undefined = bodyMetadata;
    let seekerProfile: any = null;
    let notificationPrefs: any = null;

    if (leadId) {
      const { data: leadRow, error: leadErr } = await supabase
        .from("leads")
        .select("id, email, name, facility_id, provider_response_status")
        .eq("id", leadId)
        .maybeSingle();
      if (leadErr || !leadRow) {
        logStep("Lead lookup failed", { leadId, error: leadErr?.message });
        return new Response(
          JSON.stringify({ error: "Lead not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      seekerEmail = seekerEmail || leadRow.email || undefined;

      // Look up facility name (for the email subject/body) once here so
      // the client doesn't have to.
      if (leadRow.facility_id) {
        const { data: fac } = await supabase
          .from("facilities")
          .select("name, slug")
          .eq("id", leadRow.facility_id)
          .maybeSingle();
        metadata = {
          ...(metadata || {}),
          facilityName: (fac?.name as string) || (metadata?.facilityName as string) || "the treatment center",
          facilitySlug: fac?.slug ?? null,
          leadName: leadRow.name ?? null,
        };
      }

      // Resolve a seeker user_id from the lead's email — needed so the
      // preference gate (email_lead_alerts) reads the right row. Guest
      // submissions (no account) skip this branch; defaultPrefs apply.
      if (!seekerId && seekerEmail) {
        try {
          // deno-lint-ignore no-explicit-any
          const { data: users } = await (supabase.auth.admin as any).listUsers({
            filter: `email.eq.${seekerEmail.toLowerCase()}`,
            perPage: 1,
          });
          const user = (users?.users ?? [])[0];
          if (user?.id) seekerId = user.id as string;
        } catch (e) {
          logStep("seeker lookup-by-email failed", { error: String(e) });
        }
      }
    }

    // AUTHZ for a call made WITHOUT a leadId. That path resolves the recipient
    // from the request body, so without a caller check anyone holding the
    // public anon key could relay branded RehabLookup emails to arbitrary
    // addresses (spam / domain-reputation abuse). Require EITHER the
    // service-role key (trusted server callers) OR an authenticated user, in
    // which case the recipient is forced to that user's OWN email.
    //
    // Stage 3 note: the account-lifecycle types this guard was written for
    // (welcome, security_alert, password_changed, drip, digest,
    // account_reminder) are all gone, and the one surviving type —
    // facility_contacted_you — is invoked with a leadId by the provider and
    // admin inquiry panels, so it takes the branch below instead. The guard
    // stays because the no-leadId fallback is still reachable and still
    // relay-abusable; a narrower surface is not a closed one.
    if (!leadId) {
      const naAuthHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
      const naToken = naAuthHeader.replace(/^Bearer\s+/i, "");
      const naSrk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const isServiceCaller = naToken.length > 0 && naToken === naSrk;
      if (!isServiceCaller) {
        if (!naToken) {
          return new Response(
            JSON.stringify({ error: "Authentication required" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const { data: naAuth, error: naErr } = await supabase.auth.getUser(naToken);
        if (naErr || !naAuth?.user?.email) {
          return new Response(
            JSON.stringify({ error: "Invalid authentication" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        // Force recipient to the authenticated user — a signed-in caller may only
        // email themselves, never a body-supplied address.
        seekerId = naAuth.user.id;
        seekerEmail = naAuth.user.email;
      }
    }

    if (!seekerEmail && seekerId) {
      const { data: authUser } = await supabase.auth.admin.getUserById(seekerId);
      seekerEmail = authUser?.user?.email;
    }

    if (seekerId) {
      // Fetch profile and notification preferences in parallel
      const [profileResult, prefsResult] = await Promise.all([
        supabase
          .from("seeker_profiles")
          .select("display_name, first_name, phone_verified, phone, sms_opted_in_at, sms_opted_out_at")
          .eq("user_id", seekerId)
          .single(),
        supabase
          .from("notification_preferences")
          .select("email_lead_alerts, email_weekly_digest, email_product_updates, browser_notifications, followup_reminders_enabled")
          .eq("user_id", seekerId)
          .maybeSingle()
      ]);
      seekerProfile = profileResult.data;
      notificationPrefs = prefsResult.data;
    }

    if (!seekerEmail) {
      logStep("Error: No email found for seeker");
      return new Response(
        JSON.stringify({ error: "Seeker email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check notification preferences - map email types to preference keys.
    // One entry, because one type survives. email_lead_alerts is the
    // "a facility responded to me" switch.
    const emailTypePreferenceMap: Record<string, keyof typeof defaultPrefs> = {
      "facility_contacted_you": "email_lead_alerts",
    };

    const defaultPrefs = {
      email_lead_alerts: true,
      email_weekly_digest: true,
      email_product_updates: false,
      browser_notifications: true,
      followup_reminders_enabled: true,
    };

    const prefs = { ...defaultPrefs, ...notificationPrefs };
    const prefKey = emailTypePreferenceMap[type];
    
    // The account-lifecycle and security types that used to be exempt from
    // the preference gate are gone with the account product, so the gate is
    // now unconditional: a recipient who turned off "a facility responded"
    // alerts does not get one.
    if (prefKey && !prefs[prefKey]) {
      logStep("Email skipped due to user preferences", { type, prefKey, enabled: prefs[prefKey] });
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "User preference disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = seekerProfile?.display_name || seekerProfile?.first_name || "there";
    logStep("Seeker info", { email: seekerEmail, displayName, prefsEnabled: prefs[prefKey] ?? true });

    let subject = "";
    let html = "";

    switch (type) {
      case "facility_contacted_you": {
        const contactFacility = metadata?.facilityName as string || "A treatment center";
        subject = `${contactFacility} Responded to Your Request`;
        html = generateFacilityContactedEmail(displayName, contactFacility, metadata);
        break;
      }

      default:
        logStep("Unknown email type", { type });
        return new Response(
          JSON.stringify({ error: "Unknown email type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Idempotency key. leadId scopes per-inquiry uniqueness so someone with
    // N inquiries gets N emails — one per facility response — rather than
    // one ever. The password_changed (minute-window) and security_alert
    // (per-day, per-device-fingerprint) branches went with those types in
    // stage 3. The seekerId / email fallbacks remain for a
    // facility_contacted_you call made without a leadId.
    let idempotencyKey: string;
    if (leadId) {
      idempotencyKey = `seeker-${type}-${leadId}`;
    } else if (seekerId) {
      idempotencyKey = `seeker-${type}-${seekerId}`;
    } else {
      idempotencyKey = `seeker-${type}-${seekerEmail}`;
    }

    const { emailId: emailResult, error: emailError } = await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [seekerEmail],
      subject,
      html,
      headers: {
        "List-Unsubscribe": `<mailto:no-reply@rehablookup.com?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }, {
      emailType: `seeker_${type}`,
      idempotencyKey,
    });

    if (emailError) {
      logStep("Error sending email", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The in-app notification write that used to live here is gone. It
    // inserted seeker_notifications rows whose links pointed at /account,
    // /account/requests and /concierge, to be read by the seeker
    // notification bell and inbox — all three retired in stage 3. Writing
    // rows no surface can render is not a notification, so the email (and
    // the SMS below) is now the whole delivery path. Existing rows are left
    // untouched.

    // SMS to the seeker when a facility responds — TCPA-gated. Only fires
    // for an account-holder whose phone is VERIFIED and who explicitly
    // opted into SMS (and hasn't replied STOP). Guests / unverified /
    // opted-out get email + in-app only. Best-effort: never blocks the
    // email response that already succeeded above.
    if (type === "facility_contacted_you" && seekerId && seekerProfile) {
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");
      const phoneVerified = seekerProfile.phone_verified === true && !!seekerProfile.phone;
      const smsConsented = !!seekerProfile.sms_opted_in_at && !seekerProfile.sms_opted_out_at;
      if (twilioSid && twilioToken && twilioFrom && phoneVerified && smsConsented) {
        const facilityName = (metadata?.facilityName as string) || "A treatment center";
        try {
          const smsResult = await sendSms(
            supabase,
            { accountSid: twilioSid, authToken: twilioToken, fromNumber: twilioFrom },
            {
              to: seekerProfile.phone as string,
              body: `RehabLookup: ${facilityName} responded to your inquiry. Check your email for their message. Reply STOP to opt out.`,
              userId: seekerId,
              notificationType: "facility_contacted_you",
            },
          );
          logStep("Seeker SMS attempt", { sent: smsResult.sent, reason: smsResult.reason });
        } catch (smsErr) {
          logStep("Seeker SMS failed (non-blocking)", { error: String(smsErr) });
        }
      }
    }

    logStep("Email sent successfully", { type, to: seekerEmail, resendId: emailResult });

    return new Response(
      JSON.stringify({ success: true, messageId: emailResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    logStep("Error in send-seeker-emails", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateFacilityContactedEmail(name: string, facilityName: string, metadata?: Record<string, unknown>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #7c3aed; background: #7c3aed; padding: 36px 32px; text-align: center;">
              <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">📬</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700;">
                You Have a Response!
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: #1B365D; font-weight: 600;">
                Hi ${name},
              </p>
              
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #475569; line-height: 1.6;">
                Great news! <strong>${facilityName}</strong> has responded to your inquiry. Check your phone and email for their message.
              </p>
              
              <div style="background: #f5f3ff; border: 1px solid #c4b5fd; padding: 20px; border-radius: 12px; margin: 24px 0;">
                <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #5b21b6; font-weight: 600;">
                  Questions to ask them:
                </p>
                <ul style="margin: 0; padding-left: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #5b21b6; line-height: 1.8;">
                  <li>What types of treatment do you specialize in?</li>
                  <li>Do you accept my insurance?</li>
                  <li>What's the average length of stay?</li>
                  <li>What does a typical day look like?</li>
                </ul>
              </div>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px auto;">
                <tr>
                  <td style="background-color: #1B365D; background: #1B365D; border-radius: 8px;">
                    <a href="https://rehablookup.com/search-results" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Compare More Treatment Centers
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #475569;">
                Good luck,<br>
                <strong>The RehabLookup Team</strong>
              </p>
            </td>
          </tr>
          
          ${generateEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateEmailFooter(): string {
  return `
          <!-- Footer -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; color: #ffffff;">
                      RehabLookup
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #cbd5e1;">
                      Connecting families with trusted treatment providers
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #94a3b8;">
                      <a href="https://rehablookup.com/search-results" style="color: #93c5fd; text-decoration: underline;">Search treatment centers</a>
                       · 
                      <a href="https://rehablookup.com" style="color: #93c5fd; text-decoration: underline;">Visit RehabLookup</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}
