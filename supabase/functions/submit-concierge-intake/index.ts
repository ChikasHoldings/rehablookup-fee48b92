import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[SUBMIT-CONCIERGE-INTAKE] [${VERSION}] [${requestId}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Full intake data structure (public flow - 5 steps)
interface FullIntakeData {
  ageRange: string;
  gender: string;
  preferredLanguage?: string;
  state?: string;
  city?: string;
  currentLivingSituation?: string;
  relationship?: string;
  mobilityNeeds?: string;
  primaryConcern: string;
  substanceUseFrequency?: string;
  substanceUseDuration?: string;
  detoxNeeded: string;
  levelOfCare: string;
  priorTreatment?: boolean | null;
  priorTreatmentNotes?: string;
  currentMedications?: string;
  coOccurringConcerns?: string[];
  suicideHistory?: string;
  desiredState: string;
  desiredCity?: string;
  radiusMiles?: number;
  preferredEnvironment?: string;
  timeline: string;
  faithBasedPreference?: string;
  holisticInterest?: boolean;
  amenityPreferences?: string[];
  needsTransport?: boolean;
  assessmentPreference?: string;
  paymentType: string;
  insuranceCarrier?: string;
  insuranceMemberId?: string;
  insuranceGroupNumber?: string;
  employerName?: string;
  benefitsVerified?: boolean;
  budgetRange?: string;
  scholarshipInterest?: boolean;
  willingToTravel?: boolean;
  firstName?: string;
  lastName?: string;
  decisionMakerName: string;
  phone: string;
  email: string;
  bestTimeToCall?: string;
  alternativeContactName?: string;
  alternativeContactPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  referralSource?: string;
  hipaaConsent: boolean;
}

// Simplified inline intake data (logged-in user flow - 4 steps)
interface InlineIntakeData {
  ageRange: string;
  gender: string;
  currentState: string;
  currentCity: string;
  relationship: string;
  primaryConcern: string;
  levelOfCare: string;
  detoxNeeded: string;
  priorTreatment?: boolean | null;
  desiredState: string;
  desiredCity?: string;
  timeline: string;
  paymentType: string;
  insuranceCarrier?: string;
  notes?: string;
  hipaaConsent: boolean;
  firstName?: string;
  lastName?: string;
  decisionMakerName: string;
  email: string;
  phone?: string;
}

type IntakeData = FullIntakeData | InlineIntakeData;

// Input sanitization helpers
const sanitizeString = (str: string | undefined | null, maxLength = 500): string => {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential XSS characters
};

const sanitizeEmail = (email: string | undefined | null): string => {
  if (!email) return '';
  const sanitized = email.toString().trim().toLowerCase().slice(0, 255);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error("Invalid email format");
  }
  return sanitized;
};

const sanitizePhone = (phone: string | undefined | null): string => {
  if (!phone) return '';
  return phone.toString().replace(/[^\d+\-() ]/g, '').slice(0, 20);
};

// UUID validation
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // POST-only enforcement
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep(requestId, "Function started", { version: VERSION });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to get authenticated user from request
    let authenticatedUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && supabaseAnonKey) {
      try {
        const anonClient = createClient(supabaseUrl, supabaseAnonKey);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await anonClient.auth.getUser(token);
        if (user) {
          authenticatedUserId = user.id;
          logStep(requestId, "Authenticated user found", { userId: user.id });
        }
      } catch (authErr) {
        logStep(requestId, "Auth check failed, proceeding as anonymous", { error: String(authErr) });
      }
    }

    const { sessionId, intakeData, userId: passedUserId } = await req.json() as { 
      sessionId: string; 
      intakeData: IntakeData;
      userId?: string;
    };
    
    // Validate required fields
    if (!sessionId) {
      throw new Error("Session ID is required");
    }
    if (!intakeData) {
      throw new Error("Intake data is required");
    }

    // Validate and sanitize critical intake fields
    if (!intakeData.email || typeof intakeData.email !== "string" || intakeData.email.trim().length === 0) {
      const code = "email_required";
      const message = "Email is required";
      return new Response(
        JSON.stringify({
          error: { code, message },
          code,
          reason: message,
          requestId,
          _version: VERSION,
          details: { field: "intakeData.email" },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    
    // Compute decisionMakerName from firstName + lastName if not provided
    const firstName = sanitizeString(intakeData.firstName, 50);
    const lastName = sanitizeString(intakeData.lastName, 50);
    const computedName = [firstName, lastName].filter(Boolean).join(" ");
    const decisionMakerName = computedName || intakeData.decisionMakerName;
    
    if (!decisionMakerName) {
      throw new Error("Name is required (first and last name)");
    }
    if (!intakeData.hipaaConsent) {
      throw new Error("HIPAA consent is required");
    }

    // Sanitize user-provided data
    const sanitizedEmail = sanitizeEmail(intakeData.email);
    const sanitizedName = sanitizeString(decisionMakerName, 100);
    const sanitizedPhone = sanitizePhone(intakeData.phone);

    // Validate userId if passed
    if (passedUserId && !isValidUUID(passedUserId)) {
      logStep(requestId, "Invalid passedUserId format, ignoring", { passedUserId });
    }

    // Use authenticated user ID first, then passed userId (if valid)
    const finalUserId = authenticatedUserId || (passedUserId && isValidUUID(passedUserId) ? passedUserId : null);

    logStep(requestId, "Processing intake submission", { 
      sessionId, 
      email: sanitizedEmail,
      userId: finalUserId,
      hasAuthHeader: !!authHeader
    });

    // Verify payment with Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      throw new Error("Payment not verified");
    }

    // Get user_id from session metadata if not already set
    const sessionUserId = session.metadata?.user_id || null;
    const effectiveUserId = finalUserId || sessionUserId;

    logStep(requestId, "Payment verified", { 
      paymentStatus: session.payment_status,
      effectiveUserId 
    });

    // Create idempotency key from session ID
    const idempotencyKey = `intake_${sessionId}`;

    // Check if already submitted (idempotency) — search by idempotency_key OR checkout_session_id
    const { data: existingByKey } = await supabase
      .from('concierge_inquiries')
      .select('id, intake_submitted_at, payment_status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    // If found by idempotency key AND already has intake data, it's a true duplicate
    if (existingByKey && existingByKey.intake_submitted_at) {
      logStep(requestId, "Intake already submitted (idempotency key)", { existingId: existingByKey.id });
      return new Response(
        JSON.stringify({ 
          success: true, 
          inquiryId: existingByKey.id,
          alreadySubmitted: true,
          requestId,
          _version: VERSION,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Look for an existing record to update (draft from save-placement-draft or safety-net from webhook)
    // Priority: 1) by checkout_session_id, 2) by idempotency_key (without intake), 3) by draft_id from metadata
    let existingRecordId: string | null = existingByKey?.id || null;

    if (!existingRecordId) {
      const { data: bySession } = await supabase
        .from('concierge_inquiries')
        .select('id, payment_status')
        .eq('checkout_session_id', sessionId)
        .maybeSingle();
      if (bySession) {
        existingRecordId = bySession.id;
        logStep(requestId, "Found existing record by checkout_session_id", { id: bySession.id, paymentStatus: bySession.payment_status });
      }
    }

    // Also check by draft_id from Stripe metadata
    if (!existingRecordId && session.metadata?.draft_id) {
      const { data: byDraft } = await supabase
        .from('concierge_inquiries')
        .select('id, payment_status')
        .eq('draft_id', session.metadata.draft_id)
        .maybeSingle();
      if (byDraft) {
        existingRecordId = byDraft.id;
        logStep(requestId, "Found existing record by draft_id", { id: byDraft.id, draftId: session.metadata.draft_id });
      }
    }

    // Normalize field names - handle both inline and full intake formats
    const currentState = (intakeData as InlineIntakeData).currentState || (intakeData as FullIntakeData).state || '';
    const currentCity = (intakeData as InlineIntakeData).currentCity || (intakeData as FullIntakeData).city || '';

    // Build the full record payload
    const intakeRecord = {
      user_id: effectiveUserId,
      user_name: sanitizedName,
      user_email: sanitizedEmail,
      user_phone: sanitizedPhone,
      preferred_state: sanitizeString(intakeData.desiredState, 50),
      preferred_city: sanitizeString(intakeData.desiredCity || currentCity, 100),
      payment_status: 'paid',
      payment_amount_cents: 2900,
      status: 'new',
      checkout_session_id: sessionId,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
      idempotency_key: idempotencyKey,
      intake_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      age_range: sanitizeString(intakeData.ageRange, 50),
      gender: sanitizeString(intakeData.gender, 50),
      preferred_language: sanitizeString((intakeData as FullIntakeData).preferredLanguage, 50) || null,
      current_living_situation: sanitizeString((intakeData as FullIntakeData).currentLivingSituation, 100) || null,
      relationship_to_decision_maker: sanitizeString(intakeData.relationship, 50) || 'self',
      mobility_needs: sanitizeString((intakeData as FullIntakeData).mobilityNeeds, 200) || null,
      primary_concern: sanitizeString(intakeData.primaryConcern, 100),
      substance_use_frequency: sanitizeString((intakeData as FullIntakeData).substanceUseFrequency, 50) || null,
      substance_use_duration: sanitizeString((intakeData as FullIntakeData).substanceUseDuration, 50) || null,
      detox_needed: sanitizeString(intakeData.detoxNeeded, 50),
      level_of_care: sanitizeString(intakeData.levelOfCare, 50),
      prior_treatment_history: intakeData.priorTreatment ?? null,
      prior_treatment_notes: sanitizeString((intakeData as FullIntakeData).priorTreatmentNotes, 500) || null,
      current_medications: sanitizeString((intakeData as FullIntakeData).currentMedications, 500) || null,
      co_occurring_concerns: (intakeData as FullIntakeData).coOccurringConcerns || null,
      suicide_history: sanitizeString((intakeData as FullIntakeData).suicideHistory, 100) || null,
      desired_location_state: sanitizeString(intakeData.desiredState, 50),
      desired_location_city: sanitizeString(intakeData.desiredCity, 100) || null,
      desired_radius_miles: (intakeData as FullIntakeData).radiusMiles || null,
      preferred_environment: sanitizeString((intakeData as FullIntakeData).preferredEnvironment, 50) || null,
      timeline_urgency: sanitizeString(intakeData.timeline, 50),
      faith_based_preference: sanitizeString((intakeData as FullIntakeData).faithBasedPreference, 50) || null,
      holistic_interest: (intakeData as FullIntakeData).holisticInterest ?? null,
      amenity_preferences: (intakeData as FullIntakeData).amenityPreferences || null,
      needs_transport_help: (intakeData as FullIntakeData).needsTransport ?? null,
      assessment_preference: sanitizeString((intakeData as FullIntakeData).assessmentPreference, 50) || 'phone',
      payment_type: sanitizeString(intakeData.paymentType, 50),
      insurance_carrier: sanitizeString(intakeData.insuranceCarrier, 100) || null,
      insurance_member_id: sanitizeString((intakeData as FullIntakeData).insuranceMemberId, 100) || null,
      insurance_group_number: sanitizeString((intakeData as FullIntakeData).insuranceGroupNumber, 100) || null,
      employer_name: sanitizeString((intakeData as FullIntakeData).employerName, 100) || null,
      benefits_verified: (intakeData as FullIntakeData).benefitsVerified ?? null,
      budget_range: sanitizeString((intakeData as FullIntakeData).budgetRange, 50) || null,
      scholarship_interest: (intakeData as FullIntakeData).scholarshipInterest ?? null,
      willing_to_travel: (intakeData as FullIntakeData).willingToTravel ?? null,
      decision_maker_name: sanitizedName,
      decision_maker_phone: sanitizedPhone || null,
      best_time_to_call: sanitizeString((intakeData as FullIntakeData).bestTimeToCall, 50) || null,
      alternative_contact_name: sanitizeString((intakeData as FullIntakeData).alternativeContactName, 100) || null,
      alternative_contact_phone: sanitizePhone((intakeData as FullIntakeData).alternativeContactPhone) || null,
      emergency_contact_name: sanitizeString((intakeData as FullIntakeData).emergencyContactName, 100) || null,
      emergency_contact_phone: sanitizePhone((intakeData as FullIntakeData).emergencyContactPhone) || null,
      notes: sanitizeString(intakeData.notes, 1000) || null,
      referral_source: sanitizeString((intakeData as FullIntakeData).referralSource, 100) || (effectiveUserId ? 'account_concierge' : 'public_concierge'),
      hipaa_consent: intakeData.hipaaConsent,
      intake_data: {
        age_range: sanitizeString(intakeData.ageRange, 50),
        gender: sanitizeString(intakeData.gender, 50),
        preferred_language: sanitizeString((intakeData as FullIntakeData).preferredLanguage, 50),
        state: sanitizeString(currentState, 50),
        city: sanitizeString(currentCity, 100),
        current_living_situation: sanitizeString((intakeData as FullIntakeData).currentLivingSituation, 100),
        relationship: sanitizeString(intakeData.relationship, 50),
        mobility_needs: sanitizeString((intakeData as FullIntakeData).mobilityNeeds, 200),
        primary_concern: sanitizeString(intakeData.primaryConcern, 100),
        substance_use_frequency: sanitizeString((intakeData as FullIntakeData).substanceUseFrequency, 50),
        substance_use_duration: sanitizeString((intakeData as FullIntakeData).substanceUseDuration, 50),
        detox_needed: sanitizeString(intakeData.detoxNeeded, 50),
        level_of_care: sanitizeString(intakeData.levelOfCare, 50),
        prior_treatment: intakeData.priorTreatment ?? null,
        prior_treatment_notes: sanitizeString((intakeData as FullIntakeData).priorTreatmentNotes, 500),
        current_medications: sanitizeString((intakeData as FullIntakeData).currentMedications, 500),
        co_occurring_concerns: (intakeData as FullIntakeData).coOccurringConcerns || [],
        suicide_history: sanitizeString((intakeData as FullIntakeData).suicideHistory, 100),
        desired_state: sanitizeString(intakeData.desiredState, 50),
        desired_city: sanitizeString(intakeData.desiredCity, 100),
        radius_miles: (intakeData as FullIntakeData).radiusMiles || null,
        preferred_environment: sanitizeString((intakeData as FullIntakeData).preferredEnvironment, 50),
        timeline: sanitizeString(intakeData.timeline, 50),
        faith_based_preference: sanitizeString((intakeData as FullIntakeData).faithBasedPreference, 50),
        holistic_interest: (intakeData as FullIntakeData).holisticInterest ?? false,
        amenity_preferences: (intakeData as FullIntakeData).amenityPreferences || [],
        needs_transport: (intakeData as FullIntakeData).needsTransport ?? false,
        assessment_preference: sanitizeString((intakeData as FullIntakeData).assessmentPreference, 50),
        payment_type: sanitizeString(intakeData.paymentType, 50),
        insurance_carrier: sanitizeString(intakeData.insuranceCarrier, 100),
        best_time_to_call: sanitizeString((intakeData as FullIntakeData).bestTimeToCall, 50),
        notes: sanitizeString(intakeData.notes, 1000),
        referral_source: sanitizeString((intakeData as FullIntakeData).referralSource, 100),
        hipaa_consent: !!intakeData.hipaaConsent,
      },
    };

    let inquiryId: string;

    if (existingRecordId) {
      // UPDATE existing draft/webhook record instead of creating a duplicate
      const { error: updateError } = await supabase
        .from('concierge_inquiries')
        .update(intakeRecord)
        .eq('id', existingRecordId);

      if (updateError) {
        logStep(requestId, "Update error", { error: updateError.message, existingId: existingRecordId });
        throw new Error(`Failed to update inquiry: ${updateError.message}`);
      }

      inquiryId = existingRecordId;
      logStep(requestId, "Existing inquiry updated with full intake", { inquiryId, userId: effectiveUserId });
    } else {
      // No existing record found — insert new
      const { data: inquiry, error: insertError } = await supabase
        .from('concierge_inquiries')
        .insert(intakeRecord)
        .select('id')
        .single();

      if (insertError) {
        logStep(requestId, "Insert error", { error: insertError.message });
        throw new Error(`Failed to create inquiry: ${insertError.message}`);
      }

      inquiryId = inquiry.id;
      logStep(requestId, "Inquiry created successfully", { inquiryId, userId: effectiveUserId });
    }

    // Create admin notification so admins see new placements in the dashboard
    try {
      await supabase.from('admin_notifications').insert({
        type: 'concierge_intake',
        title: 'New Placement Request',
        message: `New concierge placement from ${sanitizedName} — ${sanitizeString(intakeData.primaryConcern, 100) || 'General'} | ${sanitizeString(intakeData.desiredState, 50) || 'No state pref'} | ${sanitizeString(intakeData.timeline, 50) || 'Flexible'}`,
        metadata: {
          inquiry_id: inquiryId,
          seeker_name: sanitizedName,
          primary_concern: sanitizeString(intakeData.primaryConcern, 100),
          level_of_care: sanitizeString(intakeData.levelOfCare, 50),
          timeline: sanitizeString(intakeData.timeline, 50),
          payment_type: sanitizeString(intakeData.paymentType, 50),
          desired_state: sanitizeString(intakeData.desiredState, 50),
        },
      });
      logStep(requestId, "Admin notification created");
    } catch (adminNotifErr) {
      logStep(requestId, "Warning: Failed to create admin notification", { error: String(adminNotifErr) });
    }

    // Log case creation event for timeline
    try {
      await supabase.from('concierge_case_events').insert({
        inquiry_id: inquiryId,
        event_type: 'case_created',
        event_data: { 
          source: effectiveUserId ? 'account_concierge' : 'public_concierge',
          payment_status: 'paid',
        },
        actor_type: effectiveUserId ? 'seeker' : 'system',
        actor_id: effectiveUserId || null,
      });
    } catch (eventErr) {
      logStep(requestId, "Warning: Failed to log case creation event", { error: String(eventErr) });
    }

    // Send intake_received notification
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-concierge-notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          type: 'intake_received',
          inquiryId: inquiryId,
        }),
      });
      logStep(requestId, "Intake received notification sent");
    } catch (notifError) {
      logStep(requestId, "Warning: Failed to send notification", { error: String(notifError) });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        inquiryId: inquiryId,
        alreadySubmitted: false,
        requestId,
        _version: VERSION,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep(requestId, "ERROR", { message: errorMessage });
    // Return 400 for client/validation errors, 500 for unexpected failures
    const isClientError = errorMessage.includes("required") ||
      errorMessage.includes("Invalid") ||
      errorMessage.includes("not verified") ||
      errorMessage.includes("Session ID") ||
      errorMessage.includes("HIPAA") ||
      errorMessage.includes("Name is") ||
      errorMessage.includes("email format");
    return new Response(
      JSON.stringify({ error: errorMessage, requestId, _version: VERSION }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: isClientError ? 400 : 500,
      }
    );
  }
});
