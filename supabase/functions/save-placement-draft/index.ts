import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import {
  sanitizeString,
  sanitizePhone,
  sanitizeEmail,
  sanitizeStringArray,
  isValidEmail,
  errorResponse,
  jsonError,
  successResponse,
  sanitizeIntakeData,
} from "../_shared/validation.ts";
import { describeEmailInput } from "../_shared/email-input-diagnostics.ts";

const VERSION = "2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[SAVE-PLACEMENT-DRAFT] [${VERSION}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate content length
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      logStep("ERROR: Request too large", { size: contentLength });
      return errorResponse("Request body too large", 413, corsHeaders);
    }

    // Parse and validate request body
    let body: Record<string, unknown>;
    try {
      const rawBody = await req.text();
      if (rawBody.length > MAX_BODY_SIZE) {
        return errorResponse("Request body too large", 413, corsHeaders);
      }
      body = JSON.parse(rawBody);
    } catch {
      logStep("ERROR: Invalid JSON body");
      return errorResponse("Invalid request body", 400, corsHeaders);
    }

    const { intakeData, emailVerifiedAt, draftId: existingDraftId } = body;

    if (!intakeData || typeof intakeData !== "object") {
      logStep("ERROR: Missing intake data");
      return errorResponse("Intake data is required", 400, corsHeaders);
    }

    const data = intakeData as Record<string, unknown>;

    // Validate and sanitize required fields.
    // Pre-check: catch missing / non-string / whitespace-only BEFORE sanitizeEmail
    // so we never rely on its thrown exception for the email_required path.
    if (typeof data.email !== "string" || data.email.trim() === "") {
      const diag = describeEmailInput("intakeData.email", data.email);
      logStep("ERROR: email_required", { code: "email_required", ...diag });
      return jsonError("email_required", "Email is required", 400, corsHeaders, { _version: VERSION }, { field: "intakeData.email" });
    }

    let email: string;
    try {
      email = sanitizeEmail(data.email);
    } catch {
      const diag = describeEmailInput("intakeData.email", data.email);
      logStep("ERROR: invalid_email", { code: "invalid_email", ...diag });
      return jsonError("invalid_email", "Valid email is required", 400, corsHeaders, { _version: VERSION }, { field: "intakeData.email" });
    }
    if (!email) {
      // Defensive — shared sanitizeEmail returns "" on falsy/non-string input.
      const diag = describeEmailInput("intakeData.email", data.email);
      logStep("ERROR: email_required (post-sanitize)", { code: "email_required", ...diag });
      return jsonError("email_required", "Email is required", 400, corsHeaders, { _version: VERSION }, { field: "intakeData.email" });
    }

    const firstName = sanitizeString(data.firstName, 100);
    const lastName = sanitizeString(data.lastName, 100);
    const phone = sanitizePhone(data.phone);

    if (!firstName || !lastName) {
      logStep("ERROR: Missing required name fields");
      return errorResponse("First name and last name are required", 400, corsHeaders);
    }

    if (!phone) {
      logStep("ERROR: Missing phone");
      return errorResponse("Phone number is required", 400, corsHeaders);
    }

    // Validate draft ID format if provided
    const validatedDraftId = existingDraftId && typeof existingDraftId === "string" 
      ? sanitizeString(existingDraftId, 50).replace(/[^a-zA-Z0-9_-]/g, "")
      : null;

    // Generate draft ID if not provided
    const draftId = validatedDraftId || `draft_${crypto.randomUUID().slice(0, 12)}`;

    // Rate limit check (5 drafts per email per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentDrafts } = await supabaseAdmin
      .from("concierge_inquiries")
      .select("*", { count: "exact", head: true })
      .eq("user_email", email)
      .gte("created_at", oneHourAgo);

    if (recentDrafts && recentDrafts >= 5 && !validatedDraftId) {
      logStep("Rate limit exceeded", { email, count: recentDrafts });
      return errorResponse("Too many requests. Please try again later.", 429, corsHeaders);
    }

    // Sanitize all intake data
    const sanitizedData = sanitizeIntakeData(data);

    // Build the intake_data JSON with comprehensive sanitization
    const fullIntakeData = {
      // Step 1: Who needs help
      age_range: sanitizeString(sanitizedData.ageRange as string, 50),
      gender: sanitizeString(sanitizedData.gender as string, 50),
      preferred_language: sanitizeString(sanitizedData.preferredLanguage as string, 50) || "english",
      state: sanitizeString(sanitizedData.state as string, 50),
      city: sanitizeString(sanitizedData.city as string, 100),
      current_living_situation: sanitizeString(sanitizedData.currentLivingSituation as string, 100),
      relationship: sanitizeString(sanitizedData.relationship as string, 50),
      mobility_needs: sanitizeString(sanitizedData.mobilityNeeds as string, 200),

      // Step 2: Care needs
      primary_concern: sanitizeString(sanitizedData.primaryConcern as string, 100),
      substance_use_frequency: sanitizeString(sanitizedData.substanceUseFrequency as string, 50),
      substance_use_duration: sanitizeString(sanitizedData.substanceUseDuration as string, 50),
      detox_needed: sanitizeString(sanitizedData.detoxNeeded as string, 50),
      level_of_care: sanitizeString(sanitizedData.levelOfCare as string, 50),
      prior_treatment: typeof sanitizedData.priorTreatment === "boolean" ? sanitizedData.priorTreatment : null,
      prior_treatment_notes: sanitizeString(sanitizedData.priorTreatmentNotes as string, 500),
      current_medications: sanitizeString(sanitizedData.currentMedications as string, 500),
      co_occurring_concerns: sanitizeStringArray(sanitizedData.coOccurringConcerns, 20, 100),
      suicide_history: sanitizeString(sanitizedData.suicideHistory as string, 50),

      // Step 3: Logistics
      desired_state: sanitizeString(sanitizedData.desiredState as string, 50),
      desired_city: sanitizeString(sanitizedData.desiredCity as string, 100),
      radius_miles: Math.max(10, Math.min(500, Number(sanitizedData.radiusMiles) || 50)),
      preferred_environment: sanitizeString(sanitizedData.preferredEnvironment as string, 50),
      timeline: sanitizeString(sanitizedData.timeline as string, 50),
      faith_based_preference: sanitizeString(sanitizedData.faithBasedPreference as string, 50),
      holistic_interest: Boolean(sanitizedData.holisticInterest),
      amenity_preferences: sanitizeStringArray(sanitizedData.amenityPreferences, 30, 100),
      needs_transport: Boolean(sanitizedData.needsTransport),
      assessment_preference: sanitizeString(sanitizedData.assessmentPreference as string, 50),

      // Step 4: Payment
      payment_type: sanitizeString(sanitizedData.paymentType as string, 50),
      insurance_carrier: sanitizeString(sanitizedData.insuranceCarrier as string, 100),
      insurance_member_id: sanitizeString(sanitizedData.insuranceMemberId as string, 50),
      insurance_group_number: sanitizeString(sanitizedData.insuranceGroupNumber as string, 50),
      employer_name: sanitizeString(sanitizedData.employerName as string, 100),
      benefits_verified: Boolean(sanitizedData.benefitsVerified),
      budget_range: sanitizeString(sanitizedData.budgetRange as string, 50),
      scholarship_interest: Boolean(sanitizedData.scholarshipInterest),
      willing_to_travel: Boolean(sanitizedData.willingToTravel),

      // Step 5: Contact
      best_time_to_call: sanitizeString(sanitizedData.bestTimeToCall as string, 50),
      alternative_contact_name: sanitizeString(sanitizedData.alternativeContactName as string, 100),
      alternative_contact_phone: sanitizePhone(sanitizedData.alternativeContactPhone),
      emergency_contact_name: sanitizeString(sanitizedData.emergencyContactName as string, 100),
      emergency_contact_phone: sanitizePhone(sanitizedData.emergencyContactPhone),
      notes: sanitizeString(sanitizedData.notes as string, 1000),
      referral_source: sanitizeString(sanitizedData.referralSource as string, 100),
      hipaa_consent: Boolean(sanitizedData.hipaaConsent),
    };

    const userName = `${firstName} ${lastName}`.trim();
    const now = new Date().toISOString();

    // Validate email verified timestamp if provided
    let validatedEmailVerifiedAt: string | null = null;
    if (emailVerifiedAt && typeof emailVerifiedAt === "string") {
      try {
        const verifiedDate = new Date(emailVerifiedAt);
        // Must be within last 24 hours and not in future
        const hoursSince = (Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60);
        if (hoursSince >= 0 && hoursSince <= 24) {
          validatedEmailVerifiedAt = verifiedDate.toISOString();
        }
      } catch {
        logStep("Invalid emailVerifiedAt timestamp, ignoring");
      }
    }

    // Check if draft already exists by draft_id
    if (validatedDraftId) {
      const { data: existingDraft } = await supabaseAdmin
        .from("concierge_inquiries")
        .select("id, payment_status")
        .eq("draft_id", validatedDraftId)
        .maybeSingle();

      if (existingDraft) {
        // Don't update if already paid
        if (existingDraft.payment_status === "succeeded" || existingDraft.payment_status === "paid") {
          logStep("Draft already paid, returning existing", { draftId: validatedDraftId });
          return successResponse({
            success: true,
            draftId: validatedDraftId,
            inquiryId: existingDraft.id,
            isUpdate: false,
            alreadyPaid: true,
            _version: VERSION,
          }, corsHeaders);
        }

        // Update existing draft
        const { error: updateError } = await supabaseAdmin
          .from("concierge_inquiries")
          .update({
            user_name: userName,
            user_email: email,
            user_phone: phone,
            intake_data: fullIntakeData,
            email_verified_at: validatedEmailVerifiedAt,
            form_completed_at: now,
            updated_at: now,
            // Map normalized fields
            age_range: fullIntakeData.age_range,
            gender: fullIntakeData.gender,
            preferred_language: fullIntakeData.preferred_language,
            current_living_situation: fullIntakeData.current_living_situation,
            relationship_to_seeker: fullIntakeData.relationship,
            mobility_needs: fullIntakeData.mobility_needs,
            primary_concern: fullIntakeData.primary_concern,
            substance_use_frequency: fullIntakeData.substance_use_frequency,
            substance_use_duration: fullIntakeData.substance_use_duration,
            detox_needed: fullIntakeData.detox_needed,
            level_of_care: fullIntakeData.level_of_care,
            prior_treatment_history: fullIntakeData.prior_treatment,
            prior_treatment_notes: fullIntakeData.prior_treatment_notes,
            current_medications: fullIntakeData.current_medications,
            co_occurring_concerns: fullIntakeData.co_occurring_concerns,
            suicide_history: fullIntakeData.suicide_history,
            desired_location_state: fullIntakeData.desired_state,
            desired_location_city: fullIntakeData.desired_city,
            desired_radius_miles: fullIntakeData.radius_miles,
            preferred_environment: fullIntakeData.preferred_environment,
            timeline_urgency: fullIntakeData.timeline,
            faith_based_preference: fullIntakeData.faith_based_preference,
            holistic_interest: fullIntakeData.holistic_interest,
            amenity_preferences: fullIntakeData.amenity_preferences,
            needs_transport_help: fullIntakeData.needs_transport,
            assessment_preference: fullIntakeData.assessment_preference,
            payment_type: fullIntakeData.payment_type,
            insurance_carrier: fullIntakeData.insurance_carrier,
            insurance_member_id: fullIntakeData.insurance_member_id,
            insurance_group_number: fullIntakeData.insurance_group_number,
            employer_name: fullIntakeData.employer_name,
            benefits_verified: fullIntakeData.benefits_verified,
            budget_range: fullIntakeData.budget_range,
            scholarship_interest: fullIntakeData.scholarship_interest,
            willing_to_travel: fullIntakeData.willing_to_travel,
            best_time_to_call: fullIntakeData.best_time_to_call,
            alternative_contact_name: fullIntakeData.alternative_contact_name,
            alternative_contact_phone: fullIntakeData.alternative_contact_phone,
            emergency_contact_name: fullIntakeData.emergency_contact_name,
            emergency_contact_phone: fullIntakeData.emergency_contact_phone,
            notes: fullIntakeData.notes,
            referral_source: fullIntakeData.referral_source,
            hipaa_consent: fullIntakeData.hipaa_consent,
          })
          .eq("id", existingDraft.id);

        if (updateError) {
          logStep("Error updating draft", { error: updateError.message });
          throw new Error("Failed to update draft");
        }

        logStep("Draft updated", { draftId, inquiryId: existingDraft.id });

        return successResponse({
          success: true,
          draftId,
          inquiryId: existingDraft.id,
          isUpdate: true,
          _version: VERSION,
        }, corsHeaders);
      }
    }

    // Create new draft
    const { data: newInquiry, error: insertError } = await supabaseAdmin
      .from("concierge_inquiries")
      .insert({
        draft_id: draftId,
        user_name: userName,
        user_email: email,
        user_phone: phone,
        status: "new",
        payment_status: "pending",
        payment_amount_cents: 2900,
        intake_data: fullIntakeData,
        email_verified_at: validatedEmailVerifiedAt,
        form_completed_at: now,
        // Map all normalized fields
        age_range: fullIntakeData.age_range,
        gender: fullIntakeData.gender,
        preferred_language: fullIntakeData.preferred_language,
        current_living_situation: fullIntakeData.current_living_situation,
        relationship_to_seeker: fullIntakeData.relationship,
        mobility_needs: fullIntakeData.mobility_needs,
        primary_concern: fullIntakeData.primary_concern,
        substance_use_frequency: fullIntakeData.substance_use_frequency,
        substance_use_duration: fullIntakeData.substance_use_duration,
        detox_needed: fullIntakeData.detox_needed,
        level_of_care: fullIntakeData.level_of_care,
        prior_treatment_history: fullIntakeData.prior_treatment,
        prior_treatment_notes: fullIntakeData.prior_treatment_notes,
        current_medications: fullIntakeData.current_medications,
        co_occurring_concerns: fullIntakeData.co_occurring_concerns,
        suicide_history: fullIntakeData.suicide_history,
        desired_location_state: fullIntakeData.desired_state,
        desired_location_city: fullIntakeData.desired_city,
        desired_radius_miles: fullIntakeData.radius_miles,
        preferred_environment: fullIntakeData.preferred_environment,
        timeline_urgency: fullIntakeData.timeline,
        faith_based_preference: fullIntakeData.faith_based_preference,
        holistic_interest: fullIntakeData.holistic_interest,
        amenity_preferences: fullIntakeData.amenity_preferences,
        needs_transport_help: fullIntakeData.needs_transport,
        assessment_preference: fullIntakeData.assessment_preference,
        payment_type: fullIntakeData.payment_type,
        insurance_carrier: fullIntakeData.insurance_carrier,
        insurance_member_id: fullIntakeData.insurance_member_id,
        insurance_group_number: fullIntakeData.insurance_group_number,
        employer_name: fullIntakeData.employer_name,
        benefits_verified: fullIntakeData.benefits_verified,
        budget_range: fullIntakeData.budget_range,
        scholarship_interest: fullIntakeData.scholarship_interest,
        willing_to_travel: fullIntakeData.willing_to_travel,
        best_time_to_call: fullIntakeData.best_time_to_call,
        alternative_contact_name: fullIntakeData.alternative_contact_name,
        alternative_contact_phone: fullIntakeData.alternative_contact_phone,
        emergency_contact_name: fullIntakeData.emergency_contact_name,
        emergency_contact_phone: fullIntakeData.emergency_contact_phone,
        notes: fullIntakeData.notes,
        referral_source: fullIntakeData.referral_source,
        hipaa_consent: fullIntakeData.hipaa_consent,
        preferred_state: fullIntakeData.desired_state,
        preferred_city: fullIntakeData.desired_city,
      })
      .select("id")
      .single();

    if (insertError) {
      logStep("Error creating draft", { error: insertError.message });
      throw new Error("Failed to create draft");
    }

    logStep("Draft created", { draftId, inquiryId: newInquiry.id });

    return successResponse({
      success: true,
      draftId,
      inquiryId: newInquiry.id,
      isUpdate: false,
      _version: VERSION,
    }, corsHeaders);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return errorResponse(errorMessage, 500, corsHeaders, { _version: VERSION });
  }
});
