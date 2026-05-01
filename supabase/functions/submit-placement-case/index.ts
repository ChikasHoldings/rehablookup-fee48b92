import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { jsonError } from "../_shared/validation.ts";

const VERSION = "2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[SUBMIT-PLACEMENT-CASE] [${VERSION}] [${requestId}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Input sanitization
const sanitizeString = (str: unknown, maxLength = 500): string => {
  if (!str || typeof str !== "string") return "";
  return str.toString().trim().slice(0, maxLength).replace(/<[^>]*>/g, "").replace(/javascript:/gi, "");
};

const sanitizeEmail = (email: unknown): string => {
  if (!email || typeof email !== "string") throw new Error("Email is required");
  const sanitized = email.toString().trim().toLowerCase().slice(0, 255);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) throw new Error("Invalid email format");
  return sanitized;
};

const sanitizePhone = (phone: unknown): string => {
  if (!phone || typeof phone !== "string") return "";
  return phone.toString().replace(/[^\d+\-() ]/g, "").slice(0, 20);
};

const sanitizeStringArray = (arr: unknown, maxItems = 20, maxLen = 100): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item): item is string => typeof item === "string")
    .slice(0, maxItems)
    .map(s => sanitizeString(s, maxLen))
    .filter(Boolean);
};

// Allowed enum values
const VALID_URGENCY = ["immediate", "within_week", "within_month", "flexible"];
const VALID_LEVEL_OF_CARE = ["detox", "residential", "inpatient", "php", "iop", "outpatient", "sober_living", "not_sure"];
const VALID_PAYMENT_TYPES = ["insurance", "self_pay", "va_tricare", "medicaid", "medicare", "sliding_scale", "not_sure"];
const VALID_CONTACT_METHODS = ["phone", "email", "text", "any"];
const VALID_AGE_RANGES = ["under_18", "18-25", "26-35", "36-50", "51+"];
const VALID_WHO_SEEKING = ["self", "loved_one", "professional_referral", "other"];

const validateEnum = (value: unknown, allowed: string[], fallback: string): string => {
  if (!value || typeof value !== "string") return fallback;
  const lower = value.toLowerCase().trim();
  return allowed.includes(lower) ? lower : fallback;
};

const MAX_BODY_SIZE = 50000; // 50KB

interface PlacementCaseRequest {
  seekerName: string;
  seekerEmail: string;
  seekerPhone: string;
  whoSeekingHelp: string;
  primaryIssues: string[];
  levelOfCare: string;
  paymentType: string;
  insuranceCarrier?: string;
  insurancePlan?: string;
  selfPayBudget?: string;
  preferredStates: string[];
  preferredCities?: string;
  urgency: string;
  ageRange: string;
  gender?: string;
  specialConsiderations: string[];
  additionalNotes?: string;
  preferredContactMethod: string;
  bestTimeToContact?: string;
  idempotencyKey?: string;
}

Deno.serve(async (req) => {
  const requestId = generateRequestId();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST only
  if (req.method !== "POST") {
    return jsonError("method_not_allowed", "Method not allowed", 405, corsHeaders, { _version: VERSION }, { allowed: ["POST", "OPTIONS"] });
  }

  try {
    logStep(requestId, "Function started", { version: VERSION });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonError("server_misconfigured", "Supabase configuration missing", 500, corsHeaders, { requestId, _version: VERSION });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate content length
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      logStep(requestId, "Request too large", { size: contentLength });
      return jsonError("payload_too_large", "Request too large", 413, corsHeaders, { requestId, _version: VERSION }, { maxBytes: MAX_BODY_SIZE, receivedBytes: parseInt(contentLength) });
    }

    // Parse body with size guard
    let rawBody: string;
    try {
      rawBody = await req.text();
      if (rawBody.length > MAX_BODY_SIZE) {
        return jsonError("payload_too_large", "Request too large", 413, corsHeaders, { requestId, _version: VERSION }, { maxBytes: MAX_BODY_SIZE, receivedBytes: rawBody.length });
      }
    } catch {
      return jsonError("body_read_failed", "Failed to read request body", 400, corsHeaders, { requestId, _version: VERSION });
    }

    let body: PlacementCaseRequest;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonError("invalid_json", "Request body is not valid JSON", 400, corsHeaders, { requestId, _version: VERSION });
    }

    // Sanitize and validate all inputs
    const seekerName = sanitizeString(body.seekerName, 100);
    let seekerEmail: string;
    try {
      seekerEmail = sanitizeEmail(body.seekerEmail);
    } catch (emailErr) {
      const message = emailErr instanceof Error ? emailErr.message : "Invalid email";
      const code = message === "Email is required" ? "email_required" : "invalid_email";
      logStep(requestId, "Email validation failed", { code, reason: message });
      return jsonError(code, message, 400, corsHeaders, { requestId, _version: VERSION }, { field: "seekerEmail" });
    }
    const seekerPhone = sanitizePhone(body.seekerPhone);

    if (!seekerName) {
      return jsonError("name_required", "Name is required", 400, corsHeaders, { requestId, _version: VERSION }, { field: "seekerName" });
    }
    if (!seekerPhone) {
      return jsonError("phone_required", "Phone is required", 400, corsHeaders, { requestId, _version: VERSION }, { field: "seekerPhone" });
    }

    // Validate enums
    const urgency = validateEnum(body.urgency, VALID_URGENCY, "flexible");
    const levelOfCare = validateEnum(body.levelOfCare, VALID_LEVEL_OF_CARE, "not_sure");
    const paymentType = validateEnum(body.paymentType, VALID_PAYMENT_TYPES, "not_sure");
    const preferredContactMethod = validateEnum(body.preferredContactMethod, VALID_CONTACT_METHODS, "any");
    const ageRange = validateEnum(body.ageRange, VALID_AGE_RANGES, "26-35");
    const whoSeekingHelp = validateEnum(body.whoSeekingHelp, VALID_WHO_SEEKING, "self");

    // Sanitize arrays
    const primaryIssues = sanitizeStringArray(body.primaryIssues, 10, 100);
    const specialConsiderations = sanitizeStringArray(body.specialConsiderations, 15, 100);
    const preferredStates = sanitizeStringArray(body.preferredStates, 50, 5);

    // Sanitize optional strings
    const insuranceCarrier = sanitizeString(body.insuranceCarrier, 100);
    const insurancePlan = sanitizeString(body.insurancePlan, 100);
    const selfPayBudget = sanitizeString(body.selfPayBudget, 50);
    const preferredCities = sanitizeString(body.preferredCities, 200);
    const gender = sanitizeString(body.gender, 20);
    const additionalNotes = sanitizeString(body.additionalNotes, 1000);
    const bestTimeToContact = sanitizeString(body.bestTimeToContact, 100);

    // Idempotency key
    const idempotencyKey = body.idempotencyKey
      ? sanitizeString(body.idempotencyKey, 64).replace(/[^a-zA-Z0-9_-]/g, "")
      : `pc_${seekerEmail}_${Date.now()}`;

    // Rate limiting: 3 cases per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCases } = await supabase
      .from("placement_cases")
      .select("*", { count: "exact", head: true })
      .eq("seeker_email", seekerEmail)
      .gte("created_at", oneHourAgo);

    if (recentCases && recentCases >= 3) {
      logStep(requestId, "Rate limit exceeded", { email: seekerEmail, count: recentCases });
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency check - prevent duplicate submissions
    const { data: existingCase } = await supabase
      .from("placement_cases")
      .select("id")
      .eq("seeker_email", seekerEmail)
      .eq("seeker_phone", seekerPhone)
      .eq("level_of_care", levelOfCare)
      .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()) // within 5 minutes
      .maybeSingle();

    if (existingCase) {
      logStep(requestId, "Duplicate submission detected", { existingId: existingCase.id });
      const caseNumber = existingCase.id.slice(0, 8).toUpperCase();
      return new Response(
        JSON.stringify({ success: true, caseId: existingCase.id, caseNumber, alreadySubmitted: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep(requestId, "Creating placement case", { email: seekerEmail, urgency, levelOfCare });

    // Create the placement case with sanitized data
    const { data: caseData, error: insertError } = await supabase
      .from("placement_cases")
      .insert({
        seeker_name: seekerName,
        seeker_email: seekerEmail,
        seeker_phone: seekerPhone,
        who_seeking_help: whoSeekingHelp,
        primary_issue: primaryIssues,
        level_of_care: levelOfCare,
        payment_type: paymentType,
        insurance_carrier: insuranceCarrier || null,
        insurance_plan: insurancePlan || null,
        self_pay_budget: selfPayBudget || null,
        preferred_states: preferredStates.length > 0 ? preferredStates : null,
        preferred_cities: preferredCities
          ? preferredCities.split(",").map((c: string) => sanitizeString(c.trim(), 50)).filter(Boolean)
          : null,
        urgency,
        age_range: ageRange,
        gender: gender || null,
        special_considerations: specialConsiderations.length > 0 ? { needs: specialConsiderations } : {},
        additional_notes: additionalNotes || null,
        preferred_contact_method: preferredContactMethod,
        best_time_to_contact: bestTimeToContact || null,
        status: "new",
      })
      .select("id")
      .single();

    if (insertError) {
      logStep(requestId, "Insert error", { error: insertError.message });
      return new Response(
        JSON.stringify({ error: "Failed to create placement case" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const caseNumber = caseData.id.slice(0, 8).toUpperCase();
    logStep(requestId, "Case created", { caseId: caseData.id, caseNumber });

    // Create in-app admin notification
    try {
      const urgencyLabel: Record<string, string> = {
        immediate: "🔴 IMMEDIATE",
        within_week: "🟠 This Week",
        within_month: "🟡 Within 30 Days",
        flexible: "🟢 Flexible",
      };
      await supabase.from("admin_notifications").insert({
        type: "placement_case",
        title: `New Placement Case ${urgencyLabel[urgency] || ""}`.trim(),
        message: `${seekerName} — ${primaryIssues.join(", ") || "General"} | ${levelOfCare} | ${preferredStates.join(", ") || "No state pref"}`,
        metadata: {
          case_id: caseData.id,
          case_number: caseNumber,
          urgency,
          level_of_care: levelOfCare,
          payment_type: paymentType,
        },
      });
      logStep(requestId, "Admin in-app notification created");
    } catch (notifErr) {
      logStep(requestId, "Warning: Failed to create admin notification", { error: String(notifErr) });
    }

    // Send confirmation email to user
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      try {
        await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [seekerEmail],
          subject: `Your Placement Request Received - Case #${caseNumber}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #1B365D; background: #1B365D; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
                .content { background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px; }
                .case-number { background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
                .case-number span { font-size: 24px; font-weight: bold; font-family: monospace; color: #1B365D; }
                .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; font-size: 14px; }
                a { color: #1B365D; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 24px;">We've Received Your Request</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">A placement specialist will be in touch soon</p>
                </div>
                <div class="content">
                  <p>Hi ${seekerName},</p>
                  <p>Thank you for reaching out to RehabLookup's Placement Service. We understand this is an important step, and we're here to help you find the right treatment center.</p>
                  
                  <div class="case-number">
                    <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Your Case Number</p>
                    <span>#${caseNumber}</span>
                  </div>
                  
                  <h3 style="margin-top: 25px;">What Happens Next?</h3>
                  <p>📋 <strong>Case Review</strong> — A specialist reviews your information within 24 hours</p>
                  <p>📞 <strong>Personal Call</strong> — We'll call to discuss your situation and answer questions</p>
                  <p>🤝 <strong>Facility Introductions</strong> — We connect you with facilities that match your needs</p>
                  
                  <p style="background: #fef3c7; padding: 12px; border-radius: 8px; font-size: 14px;">
                    <strong>Need immediate help?</strong> If this is an emergency, please call 911 or the SAMHSA National Helpline at <a href="tel:1-800-662-4357">1-800-662-4357</a>.
                  </p>
                  
                  <div class="footer">
                    <p style="font-size: 12px; color: #999;">This is a free, confidential service. We do not share your information without your consent.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        });
        logStep(requestId, "User confirmation email sent");
      } catch (emailError) {
        logStep(requestId, "Warning: Failed to send user email", { error: String(emailError) });
      }

      // Send admin notification
      try {
        const urgencyLabel: Record<string, string> = {
          immediate: "🔴 IMMEDIATE",
          within_week: "🟠 This Week",
          within_month: "🟡 Within 30 Days",
          flexible: "🟢 Flexible",
        };

        await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup System <system@rehablookup.com>",
          to: ["placement@rehablookup.com"],
          subject: `[NEW CASE] ${urgencyLabel[urgency] || urgency} - ${seekerName} - ${levelOfCare}`,
          html: `
            <h2>New Placement Case Submitted</h2>
            <p><strong>Case #:</strong> ${caseNumber}</p>
            <p><strong>Request ID:</strong> ${requestId}</p>
            <p><strong>Urgency:</strong> ${urgencyLabel[urgency] || urgency}</p>
            <hr>
            <h3>Contact Info</h3>
            <p><strong>Name:</strong> ${seekerName}</p>
            <p><strong>Email:</strong> ${seekerEmail}</p>
            <p><strong>Phone:</strong> ${seekerPhone}</p>
            <p><strong>Preferred Contact:</strong> ${preferredContactMethod}${bestTimeToContact ? ` (${bestTimeToContact})` : ""}</p>
            <hr>
            <h3>Treatment Needs</h3>
            <p><strong>Who Needs Help:</strong> ${whoSeekingHelp}</p>
            <p><strong>Primary Issues:</strong> ${primaryIssues.join(", ") || "—"}</p>
            <p><strong>Level of Care:</strong> ${levelOfCare}</p>
            <p><strong>Age Range:</strong> ${ageRange}</p>
            ${gender ? `<p><strong>Gender:</strong> ${gender}</p>` : ""}
            ${specialConsiderations.length > 0 ? `<p><strong>Special Considerations:</strong> ${specialConsiderations.join(", ")}</p>` : ""}
            <hr>
            <h3>Payment</h3>
            <p><strong>Payment Type:</strong> ${paymentType}</p>
            ${insuranceCarrier ? `<p><strong>Insurance:</strong> ${insuranceCarrier}${insurancePlan ? ` - ${insurancePlan}` : ""}</p>` : ""}
            ${selfPayBudget ? `<p><strong>Self-Pay Budget:</strong> ${selfPayBudget}</p>` : ""}
            <hr>
            <h3>Preferences</h3>
            <p><strong>Preferred States:</strong> ${preferredStates.length > 0 ? preferredStates.join(", ") : "No preference"}</p>
            ${preferredCities ? `<p><strong>Preferred Cities:</strong> ${preferredCities}</p>` : ""}
            ${additionalNotes ? `<p><strong>Additional Notes:</strong> ${additionalNotes}</p>` : ""}
          `,
        });
        logStep(requestId, "Admin notification email sent");
      } catch (adminEmailError) {
        logStep(requestId, "Warning: Failed to send admin email", { error: String(adminEmailError) });
      }
    }

    // Create initial status message
    try {
      await supabase.from("placement_case_messages").insert({
        case_id: caseData.id,
        message_type: "status_update",
        content: "Your placement request has been received. A specialist will review your case within 24 hours.",
        is_internal: false,
      });
    } catch (msgError) {
      logStep(requestId, "Warning: Failed to create status message", { error: String(msgError) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        caseId: caseData.id,
        caseNumber,
        requestId,
        _version: VERSION,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep(requestId, "ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage, requestId, _version: VERSION }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
