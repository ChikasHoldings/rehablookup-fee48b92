import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  sanitizeString,
  sanitizePhone,
  sanitizeEmail,
  sanitizeStringArray,
  jsonError,
  successResponse,
  sanitizeIntakeData,
} from "../_shared/validation.ts";

const VERSION = "2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[SAVE-INTL-DRAFT] [${VERSION}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Maximum request body size (100KB)
const MAX_BODY_SIZE = 100000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started", { version: VERSION });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonError("server_misconfigured", "Missing required environment variables", 500, corsHeaders, { _version: VERSION });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate content length
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      logStep("ERROR: Request too large", { size: contentLength });
      return jsonError("payload_too_large", "Request body too large", 413, corsHeaders, { _version: VERSION }, { maxBytes: MAX_BODY_SIZE, receivedBytes: parseInt(contentLength) });
    }

    // Parse and validate request body
    let body: Record<string, unknown>;
    try {
      const rawBody = await req.text();
      if (rawBody.length > MAX_BODY_SIZE) {
        return jsonError("payload_too_large", "Request body too large", 413, corsHeaders, { _version: VERSION }, { maxBytes: MAX_BODY_SIZE, receivedBytes: rawBody.length });
      }
      body = JSON.parse(rawBody);
    } catch {
      logStep("ERROR: Invalid JSON body");
      return jsonError("invalid_json", "Request body is not valid JSON", 400, corsHeaders, { _version: VERSION });
    }

    const { intakeData, emailVerifiedAt, draftId: existingDraftId } = body;

    if (!intakeData || typeof intakeData !== "object") {
      logStep("ERROR: Missing intake data");
      return jsonError("validation_error", "Intake data is required", 400, corsHeaders, { _version: VERSION }, { field: "intakeData" });
    }

    const data = intakeData as Record<string, unknown>;

    // Validate and sanitize required fields
    let email: string;
    try {
      email = sanitizeEmail(data.email);
    } catch {
      logStep("ERROR: Invalid email");
      return jsonError("invalid_email", "Valid email is required", 400, corsHeaders, { _version: VERSION }, { field: "intakeData.email" });
    }
    if (!email) {
      return jsonError("email_required", "Email is required", 400, corsHeaders, { _version: VERSION }, { field: "intakeData.email" });
    }

    const firstName = sanitizeString(data.first_name, 100);
    const lastName = sanitizeString(data.last_name, 100);
    const phone = sanitizePhone(data.phone);
    const country = sanitizeString(data.country, 100);
    const preferredLanguage = sanitizeString(data.preferred_language, 50) || "English";

    if (!firstName || !lastName) {
      logStep("ERROR: Missing required name fields");
      return jsonError("validation_error", "First name and last name are required", 400, corsHeaders, { _version: VERSION }, { fields: ["intakeData.first_name", "intakeData.last_name"] });
    }

    if (!country) {
      logStep("ERROR: Missing country");
      return jsonError("validation_error", "Country is required", 400, corsHeaders, { _version: VERSION }, { field: "intakeData.country" });
    }

    // Validate draft ID format if provided
    const validatedDraftId = existingDraftId && typeof existingDraftId === "string"
      ? sanitizeString(existingDraftId, 50).replace(/[^a-zA-Z0-9_-]/g, "")
      : null;

    // Generate draft ID if not provided
    const draftId = validatedDraftId || `intl_draft_${crypto.randomUUID().slice(0, 12)}`;

    // Rate limit check (3 drafts per email per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentDrafts } = await supabaseAdmin
      .from("international_placement_cases")
      .select("*", { count: "exact", head: true })
      .eq("client_email", email)
      .gte("created_at", oneHourAgo);

    if (recentDrafts && recentDrafts >= 3 && !validatedDraftId) {
      logStep("Rate limit exceeded", { email, count: recentDrafts });
      return jsonError("rate_limited", "Too many requests. Please try again later.", 429, corsHeaders, { _version: VERSION }, { limit: 3, windowSeconds: 3600, recentCount: recentDrafts });
    }

    // Sanitize all intake data
    const sanitizedData = sanitizeIntakeData(data);

    // Build the intake_data JSON
    const fullIntakeData = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      country: country,
      preferred_language: preferredLanguage,
      seeking_for: sanitizeString(sanitizedData.seeking_for as string, 50),
      age_range: sanitizeString(sanitizedData.age_range as string, 50),
      gender: sanitizeString(sanitizedData.gender as string, 50),
      level_of_care: sanitizeString(sanitizedData.level_of_care as string, 100),
      primary_concern: sanitizeString(sanitizedData.primary_concern as string, 100),
      co_occurring_conditions: sanitizeStringArray(sanitizedData.co_occurring_conditions, 20, 100),
      previous_treatment: sanitizeString(sanitizedData.previous_treatment as string, 50),
      budget_range: sanitizeString(sanitizedData.budget_range as string, 100),
      rehab_style: sanitizeString(sanitizedData.rehab_style as string, 100),
      treatment_duration: sanitizeString(sanitizedData.treatment_duration as string, 50),
      amenities: sanitizeStringArray(sanitizedData.amenities, 30, 100),
      special_requirements: sanitizeString(sanitizedData.special_requirements as string, 500),
      notes: sanitizeString(sanitizedData.notes as string, 1000),
    };

    const clientName = `${firstName} ${lastName}`.trim();
    const now = new Date().toISOString();

    // Validate email verified timestamp if provided
    let validatedEmailVerifiedAt: string | null = null;
    if (emailVerifiedAt && typeof emailVerifiedAt === "string") {
      try {
        const verifiedDate = new Date(emailVerifiedAt);
        const hoursSince = (Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60);
        if (hoursSince >= 0 && hoursSince <= 24) {
          validatedEmailVerifiedAt = verifiedDate.toISOString();
        }
      } catch {
        logStep("Invalid emailVerifiedAt timestamp, ignoring");
      }
    }

    // Check if draft already exists by draft_id in metadata
    if (validatedDraftId) {
      const { data: existingDraft } = await supabaseAdmin
        .from("international_placement_cases")
        .select("id, payment_status")
        .contains("metadata", { draft_id: validatedDraftId })
        .maybeSingle();

      if (existingDraft) {
        // Don't update if already paid
        if (existingDraft.payment_status === "paid" || existingDraft.payment_status === "succeeded") {
          logStep("Draft already paid, returning existing", { draftId: validatedDraftId });
          return successResponse({
            success: true,
            draftId: validatedDraftId,
            caseId: existingDraft.id,
            isUpdate: false,
            alreadyPaid: true,
            _version: VERSION,
          }, corsHeaders);
        }

        // Update existing draft
        const { error: updateError } = await supabaseAdmin
          .from("international_placement_cases")
          .update({
            client_name: clientName,
            client_email: email,
            client_phone: phone,
            client_country: country,
            preferred_language: preferredLanguage,
            intake_data: fullIntakeData,
            email_verified_at: validatedEmailVerifiedAt,
            form_completed_at: now,
            updated_at: now,
            metadata: {
              draft_id: draftId,
              email_verified_at: validatedEmailVerifiedAt,
              form_completed_at: now,
            },
          })
          .eq("id", existingDraft.id);

        if (updateError) {
          logStep("Error updating draft", { error: updateError.message });
          return jsonError("draft_update_failed", "Failed to update draft", 500, corsHeaders, { _version: VERSION }, { dbError: updateError.message, draftId, caseId: existingDraft.id });
        }

        logStep("Draft updated", { draftId, caseId: existingDraft.id });

        return successResponse({
          success: true,
          draftId,
          caseId: existingDraft.id,
          isUpdate: true,
          _version: VERSION,
        }, corsHeaders);
      }
    }

    // Create new draft
    const { data: newCase, error: insertError } = await supabaseAdmin
      .from("international_placement_cases")
      .insert({
        client_name: clientName,
        client_email: email,
        client_phone: phone,
        client_country: country,
        preferred_language: preferredLanguage,
        status: "draft",
        payment_status: "pending",
        payment_amount_cents: 29900,
        intake_data: fullIntakeData,
        email_verified_at: validatedEmailVerifiedAt,
        form_completed_at: now,
        priority: "normal",
        metadata: {
          draft_id: draftId,
          email_verified_at: validatedEmailVerifiedAt,
          form_completed_at: now,
        },
      })
      .select("id")
      .single();

    if (insertError) {
      logStep("Error creating draft", { error: insertError.message });
      throw new Error("Failed to create draft");
    }

    logStep("Draft created", { draftId, caseId: newCase.id });

    return successResponse({
      success: true,
      draftId,
      caseId: newCase.id,
      isUpdate: false,
      _version: VERSION,
    }, corsHeaders);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return errorResponse(errorMessage, 500, corsHeaders, { _version: VERSION });
  }
});
