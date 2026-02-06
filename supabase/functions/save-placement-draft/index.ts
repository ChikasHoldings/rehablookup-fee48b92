import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[SAVE-PLACEMENT-DRAFT] [${VERSION}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Input validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

const sanitizeString = (str: string, maxLength: number = 500): string => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength).replace(/[<>]/g, '');
};

const sanitizePhone = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/[^\d+\-() ]/g, '').slice(0, 20);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started", { version: VERSION });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      logStep("ERROR: Invalid JSON body");
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { intakeData, emailVerifiedAt, draftId: existingDraftId } = body;

    if (!intakeData || typeof intakeData !== 'object') {
      logStep("ERROR: Missing intake data");
      return new Response(
        JSON.stringify({ error: "Intake data is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const data = intakeData as Record<string, unknown>;

    // Validate required fields
    const email = sanitizeString(data.email as string, 254).toLowerCase();
    if (!isValidEmail(email)) {
      logStep("ERROR: Invalid email", { email });
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const firstName = sanitizeString(data.firstName as string, 100);
    const lastName = sanitizeString(data.lastName as string, 100);
    const phone = sanitizePhone(data.phone as string);

    if (!firstName || !lastName || !phone) {
      logStep("ERROR: Missing required contact fields");
      return new Response(
        JSON.stringify({ error: "First name, last name, and phone are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Generate draft ID if not provided
    const draftId = existingDraftId || `draft_${crypto.randomUUID().slice(0, 12)}`;

    // Build the intake_data JSON
    const fullIntakeData = {
      // Step 1: Who needs help
      age_range: sanitizeString(data.ageRange as string, 50),
      gender: sanitizeString(data.gender as string, 50),
      preferred_language: sanitizeString(data.preferredLanguage as string, 50) || "english",
      state: sanitizeString(data.state as string, 50),
      city: sanitizeString(data.city as string, 100),
      current_living_situation: sanitizeString(data.currentLivingSituation as string, 100),
      relationship: sanitizeString(data.relationship as string, 50),
      mobility_needs: sanitizeString(data.mobilityNeeds as string, 200),
      
      // Step 2: Care needs
      primary_concern: sanitizeString(data.primaryConcern as string, 100),
      substance_use_frequency: sanitizeString(data.substanceUseFrequency as string, 50),
      substance_use_duration: sanitizeString(data.substanceUseDuration as string, 50),
      detox_needed: sanitizeString(data.detoxNeeded as string, 50),
      level_of_care: sanitizeString(data.levelOfCare as string, 50),
      prior_treatment: data.priorTreatment,
      prior_treatment_notes: sanitizeString(data.priorTreatmentNotes as string, 500),
      current_medications: sanitizeString(data.currentMedications as string, 500),
      co_occurring_concerns: Array.isArray(data.coOccurringConcerns) 
        ? data.coOccurringConcerns.map(c => sanitizeString(String(c), 100))
        : [],
      suicide_history: sanitizeString(data.suicideHistory as string, 50),
      
      // Step 3: Logistics
      desired_state: sanitizeString(data.desiredState as string, 50),
      desired_city: sanitizeString(data.desiredCity as string, 100),
      radius_miles: Number(data.radiusMiles) || 50,
      preferred_environment: sanitizeString(data.preferredEnvironment as string, 50),
      timeline: sanitizeString(data.timeline as string, 50),
      faith_based_preference: sanitizeString(data.faithBasedPreference as string, 50),
      holistic_interest: Boolean(data.holisticInterest),
      amenity_preferences: Array.isArray(data.amenityPreferences)
        ? data.amenityPreferences.map(a => sanitizeString(String(a), 100))
        : [],
      needs_transport: Boolean(data.needsTransport),
      assessment_preference: sanitizeString(data.assessmentPreference as string, 50),
      
      // Step 4: Payment
      payment_type: sanitizeString(data.paymentType as string, 50),
      insurance_carrier: sanitizeString(data.insuranceCarrier as string, 100),
      insurance_member_id: sanitizeString(data.insuranceMemberId as string, 50),
      insurance_group_number: sanitizeString(data.insuranceGroupNumber as string, 50),
      employer_name: sanitizeString(data.employerName as string, 100),
      benefits_verified: Boolean(data.benefitsVerified),
      budget_range: sanitizeString(data.budgetRange as string, 50),
      scholarship_interest: Boolean(data.scholarshipInterest),
      willing_to_travel: Boolean(data.willingToTravel),
      
      // Step 5: Contact
      best_time_to_call: sanitizeString(data.bestTimeToCall as string, 50),
      alternative_contact_name: sanitizeString(data.alternativeContactName as string, 100),
      alternative_contact_phone: sanitizePhone(data.alternativeContactPhone as string),
      emergency_contact_name: sanitizeString(data.emergencyContactName as string, 100),
      emergency_contact_phone: sanitizePhone(data.emergencyContactPhone as string),
      notes: sanitizeString(data.notes as string, 1000),
      referral_source: sanitizeString(data.referralSource as string, 100),
      hipaa_consent: Boolean(data.hipaaConsent),
    };

    const userName = `${firstName} ${lastName}`.trim();
    const now = new Date().toISOString();

    // Check if draft already exists by draft_id
    if (existingDraftId) {
      const { data: existingDraft } = await supabase
        .from("concierge_inquiries")
        .select("id, payment_status")
        .eq("draft_id", existingDraftId)
        .maybeSingle();

      if (existingDraft) {
        // Update existing draft
        const { error: updateError } = await supabase
          .from("concierge_inquiries")
          .update({
            user_name: userName,
            user_email: email,
            user_phone: phone,
            intake_data: fullIntakeData,
            email_verified_at: emailVerifiedAt || null,
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

        return new Response(
          JSON.stringify({ 
            success: true, 
            draftId,
            inquiryId: existingDraft.id,
            isUpdate: true,
            _version: VERSION 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Create new draft
    const { data: newInquiry, error: insertError } = await supabase
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
        email_verified_at: emailVerifiedAt || null,
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        draftId,
        inquiryId: newInquiry.id,
        isUpdate: false,
        _version: VERSION 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage, _version: VERSION }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
