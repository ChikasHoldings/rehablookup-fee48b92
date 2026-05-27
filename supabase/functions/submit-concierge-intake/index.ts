import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { describeEmailInput } from "../_shared/email-input-diagnostics.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

// v3.0.0 — 2026-05-20: dropped the legacy paid-seeker concierge flow.
// Domestic concierge is FREE for seekers; the Stripe Checkout pre-step
// was retired with create-concierge-checkout (→ 410 Gone) and
// verify-concierge-payment (→ 410 Gone). This function now has a
// single submission path — no sessionId / no Stripe lookups. For
// anonymous public intakes phone verification (`phoneVerifiedAt`
// recent within 60 minutes) is the proof-of-control gate; for
// authenticated seekers the JWT itself is the proof and the OTP
// requirement is waived.
const VERSION = "3.0.0";

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

    const { intakeData, userId: passedUserId, emailVerifiedAt, phoneVerifiedAt, isInternational, clientCountry } = await req.json() as {
      intakeData: IntakeData;
      userId?: string;
      emailVerifiedAt?: string | null;
      phoneVerifiedAt?: string | null;
      isInternational?: boolean;
      clientCountry?: string;
    };

    // International placements run through the same free concierge pipeline
    // as domestic ones; the only difference is they're tagged so ops can
    // filter/segment them. The flag is route-driven (the /international intake
    // sets it) — there's no separate paid product anymore.
    const intlFlag = isInternational === true;
    const intlCountry = intlFlag ? sanitizeString(clientCountry, 100) || null : null;

    // Validate required fields
    if (!intakeData) {
      throw new Error("Intake data is required");
    }

    // Phone verification is the proof-of-control for anonymous public
    // intakes (the form bakes phone OTP into the funnel). Authenticated
    // seekers (signed-in account) bypass the recency check — their
    // identity is already proven by the JWT — but a bearer token is
    // still required for that path.
    if (!authenticatedUserId) {
      const phoneOk = (() => {
        if (!phoneVerifiedAt || typeof phoneVerifiedAt !== "string") return false;
        const t = Date.parse(phoneVerifiedAt);
        if (Number.isNaN(t)) return false;
        // Accept anything within the last 60 minutes.
        return Date.now() - t <= 60 * 60 * 1000;
      })();
      if (!phoneOk) {
        const code = "phone_verification_required";
        logStep(requestId, code, { phoneVerifiedAtPresent: !!phoneVerifiedAt });
        return new Response(
          JSON.stringify({
            error: { code, message: "Phone verification is required and must be recent." },
            code,
            reason: "Phone verification is required and must be recent.",
            requestId,
            _version: VERSION,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Validate and sanitize critical intake fields
    if (!intakeData.email || typeof intakeData.email !== "string" || intakeData.email.trim().length === 0) {
      const code = "email_required";
      const message = "Email is required";
      const diag = describeEmailInput("intakeData.email", intakeData.email);
      logStep(requestId, "email_required", { code, ...diag });
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
    let sanitizedEmail: string;
    try {
      sanitizedEmail = sanitizeEmail(intakeData.email);
    } catch {
      const code = "invalid_email";
      const message = "Valid email is required";
      const diag = describeEmailInput("intakeData.email", intakeData.email);
      logStep(requestId, "invalid_email", { code, ...diag });
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
    // Rate limiting: max 10 concierge intake submissions per email per hour
    const rateLimitResult = await checkRateLimit(supabase, {
      identifier: `email:${sanitizedEmail}`,
      actionType: 'submit_concierge_intake',
      maxAttempts: 10,
      windowMinutes: 60,
    });
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(corsHeaders);
    }

    const sanitizedName = sanitizeString(decisionMakerName, 100);
    const sanitizedPhone = sanitizePhone(intakeData.phone);

    // Validate userId if passed
    if (passedUserId && !isValidUUID(passedUserId)) {
      logStep(requestId, "Invalid passedUserId format, ignoring", { passedUserId });
    }

    // Use authenticated user ID first, then passed userId (if valid)
    const finalUserId = authenticatedUserId || (passedUserId && isValidUUID(passedUserId) ? passedUserId : null);

    logStep(requestId, "Processing intake submission", {
      email: sanitizedEmail,
      userId: finalUserId,
      hasAuthHeader: !!authHeader
    });

    const effectiveUserId = finalUserId;

    // Idempotency: email + 1-minute window collapses accidental retries
    // (browser double-submit, network retry, strict-mode useEffect double-fire).
    const idempotencyKey = `intake_free_${sanitizedEmail}_${Math.floor(Date.now() / 60000)}`;

    // Check if already submitted
    const { data: existingByKey } = await supabase
      .from('concierge_inquiries')
      .select('id, intake_submitted_at')
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

    // Existing draft record (from save-placement-draft on the same browser
    // session) may already exist — update it in place rather than create a
    // duplicate row.
    const existingRecordId: string | null = existingByKey?.id || null;

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
      status: 'intake_submitted',
      idempotency_key: idempotencyKey,
      intake_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_verified_at: emailVerifiedAt || new Date().toISOString(),
      // Auth bypass: when an authenticated seeker submits, the JWT is the
      // proof-of-control rather than a fresh OTP — stamp the verification
      // timestamp anyway so downstream reports treat the row as verified.
      phone_verified_at: phoneVerifiedAt || (authenticatedUserId ? new Date().toISOString() : null),
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
        is_international: intlFlag,
        client_country: intlCountry,
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

    // Crisis flag — when the seeker self-reports active suicidal ideation
    // or self-harm history, ops must see this in front of everything else.
    // We surface 988 inside the form itself (StepCareNeed) and also raise
    // a SECOND admin notification with elevated copy so an advisor picks
    // it up faster than the 24-hour SLA on a routine intake.
    const isCrisis = sanitizeString((intakeData as FullIntakeData).suicideHistory, 100).toLowerCase() === "yes";

    // Create admin notification so admins see new placements in the dashboard
    try {
      const intlTag = intlFlag ? `🌍 International${intlCountry ? ` (${intlCountry})` : ''} — ` : '';
      await supabase.from('admin_notifications').insert({
        type: 'concierge_intake',
        title: isCrisis
          ? `🚨 CRISIS — New Placement Request`
          : `${intlTag}New Placement Request`,
        message: `New concierge placement from ${sanitizedName} — ${sanitizeString(intakeData.primaryConcern, 100) || 'General'} | ${sanitizeString(intakeData.desiredState, 50) || 'No state pref'} | ${sanitizeString(intakeData.timeline, 50) || 'Flexible'}`,
        metadata: {
          inquiry_id: inquiryId,
          seeker_name: sanitizedName,
          primary_concern: sanitizeString(intakeData.primaryConcern, 100),
          level_of_care: sanitizeString(intakeData.levelOfCare, 50),
          timeline: sanitizeString(intakeData.timeline, 50),
          payment_type: sanitizeString(intakeData.paymentType, 50),
          desired_state: sanitizeString(intakeData.desiredState, 50),
          crisis_flag: isCrisis,
          is_international: intlFlag,
          client_country: intlCountry,
        },
      });
      logStep(requestId, "Admin notification created", { crisis: isCrisis });
    } catch (adminNotifErr) {
      logStep(requestId, "Warning: Failed to create admin notification", { error: String(adminNotifErr) });
    }

    // SECOND notification for active crisis cases — elevates above the
    // routine intake stream so the on-call advisor sees it immediately,
    // and gives ops a separate row to filter on.
    if (isCrisis) {
      try {
        await supabase.from('admin_notifications').insert({
          type: 'concierge_intake_crisis',
          title: '🚨 CRISIS intake — seeker reports active risk',
          message: `${sanitizedName} (${sanitizedEmail}) marked "yes" on self-harm/suicidal-thoughts history. Call within 15 minutes if possible. Inquiry ${inquiryId}.`,
          metadata: {
            inquiry_id: inquiryId,
            seeker_name: sanitizedName,
            seeker_email: sanitizedEmail,
            seeker_phone: sanitizedPhone,
            sla_target_minutes: 15,
            crisis_flag: true,
          },
        });
        logStep(requestId, "🚨 CRISIS admin notification created", { inquiryId });
      } catch (crisisNotifErr) {
        logStep(requestId, "Warning: Failed to create crisis admin notification", { error: String(crisisNotifErr) });
      }
    }

    // Log case creation event for timeline
    try {
      await supabase.from('concierge_case_events').insert({
        inquiry_id: inquiryId,
        event_type: 'case_created',
        event_data: {
          source: effectiveUserId ? 'account_concierge' : 'public_concierge',
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

    // Auto-assign advisor (round-robin) to reduce admin manual work
    try {
      const { data: advisors } = await supabase
        .from('admin_user_profiles')
        .select('user_id')
        .eq('admin_role', 'advisor')
        .eq('status', 'active');
      if (advisors && advisors.length > 0) {
        // Round-robin: pick advisor with fewest active cases
        const { data: caseLoads } = await supabase
          .from('concierge_inquiries')
          .select('assigned_advisor_id')
          .not('status', 'in', '("closed","completed")')
          .not('assigned_advisor_id', 'is', null);
        const loadMap = new Map<string, number>();
        for (const a of advisors) loadMap.set(a.user_id, 0);
        for (const c of (caseLoads || [])) {
          if (c.assigned_advisor_id && loadMap.has(c.assigned_advisor_id)) {
            loadMap.set(c.assigned_advisor_id, (loadMap.get(c.assigned_advisor_id) || 0) + 1);
          }
        }
        const sorted = [...loadMap.entries()].sort((a, b) => a[1] - b[1]);
        const pickedAdvisor = sorted[0]?.[0];
        if (pickedAdvisor) {
          await supabase
            .from('concierge_inquiries')
            .update({ assigned_advisor_id: pickedAdvisor })
            .eq('id', inquiryId)
            .is('assigned_advisor_id', null);
          logStep(requestId, "Auto-assigned advisor", { advisorId: pickedAdvisor, caseLoad: sorted[0]?.[1] });
        }
      }
    } catch (advisorErr) {
      logStep(requestId, "Warning: Failed to auto-assign advisor", { error: String(advisorErr) });
    }

    // ─── AUTO-MATCHING & AUTO-INTRODUCTION ─────────────────────────────────────
    // Fully automated placement pipeline:
    // 1. Match facilities immediately based on intake criteria
    // 2. Auto-send introductions to top matches
    // 3. Set response deadlines for providers (72h default)
    // If any step fails, the placement-cron will retry and admin can intervene.
    try {
      // Check if auto-matching is enabled
      const { data: autoMatchSetting } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'placement_auto_match_enabled')
        .maybeSingle();
      // Default OFF: concierge stays advisor-driven unless an admin explicitly
      // enables automation (setting_value true). Avoids any auto-match /
      // auto-email firing on intake without an opt-in.
      const autoMatchEnabled = autoMatchSetting?.setting_value === true || autoMatchSetting?.setting_value === 'true';

      if (!autoMatchEnabled) {
        logStep(requestId, "Auto-matching disabled — case will need manual matching");
      } else {
        const matchResponse = await fetch(`${supabaseUrl}/functions/v1/match-concierge-intake`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ inquiryId }),
        });
        const matchResult = await matchResponse.json();

        if (matchResult?.matched && matchResult.matchedFacilityIds?.length > 0) {
          logStep(requestId, "Auto-matching completed", {
            matchedCount: matchResult.matchedFacilityIds.length,
            facilityIds: matchResult.matchedFacilityIds,
          });

          // Mark case as auto-matched and advance status
          await supabase
            .from('concierge_inquiries')
            .update({
              status: 'matched',
              auto_matched: true,
              auto_matched_at: new Date().toISOString(),
            })
            .eq('id', inquiryId);

          // ─── AUTO-INTRODUCE: Send introductions to top matches ─────────────
          const { data: introSetting } = await supabase
            .from('platform_settings')
            .select('setting_value')
            .eq('setting_key', 'placement_auto_introduce_enabled')
            .maybeSingle();
          // Default OFF — matched providers are only auto-emailed when enabled.
          const autoIntroEnabled = introSetting?.setting_value === true || introSetting?.setting_value === 'true';

          if (autoIntroEnabled) {
            const { data: maxSetting } = await supabase
              .from('platform_settings')
              .select('setting_value')
              .eq('setting_key', 'placement_auto_introduce_max')
              .maybeSingle();
            const maxIntros = parseInt(String(maxSetting?.setting_value ?? '5'), 10);
            const facilityIds = matchResult.matchedFacilityIds.slice(0, maxIntros);

            // Calculate response deadline (default 72h)
            const { data: timeoutSetting } = await supabase
              .from('platform_settings')
              .select('setting_value')
              .eq('setting_key', 'placement_provider_response_timeout_hours')
              .maybeSingle();
            const timeoutHours = parseInt(String(timeoutSetting?.setting_value ?? '72'), 10);
            const responseDeadline = new Date(Date.now() + timeoutHours * 60 * 60 * 1000).toISOString();

            let sentCount = 0;
            for (const facilityId of facilityIds) {
              try {
                const introResponse = await fetch(`${supabaseUrl}/functions/v1/send-concierge-introduction`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    inquiryId,
                    facilityId,
                    responseDeadline,
                  }),
                });
                if (introResponse.ok) sentCount++;
              } catch (introErr) {
                logStep(requestId, `Warning: Failed to send introduction to facility ${facilityId}`, { error: String(introErr) });
              }
            }

            if (sentCount > 0) {
              // Update case with auto-introduction stats and advance status
              await supabase
                .from('concierge_inquiries')
                .update({
                  auto_introductions_sent_at: new Date().toISOString(),
                  auto_introduction_count: sentCount,
                  status: 'provider_prequalification', // Introductions sent, awaiting provider responses
                })
                .eq('id', inquiryId);

              logStep(requestId, `Auto-introductions sent: ${sentCount}/${facilityIds.length}`, { sentCount, responseDeadline });
            } else {
              logStep(requestId, "Warning: All auto-introductions failed — placement-cron will retry");
            }
          } else {
            logStep(requestId, "Auto-introduce disabled — admin will send introductions manually");
          }
        } else {
          // Auto-matching returned zero facilities — case sits at
          // intake_submitted until an advisor manually intervenes.
          // Surface this to ops via admin_notifications so they know to
          // either broaden the search (state/care type) or close the
          // case with a transparent "no matches available" outcome —
          // rather than the seeker silently waiting for a coordinator
          // who has nothing to offer.
          logStep(requestId, "Auto-matching returned no results — case will need manual matching", { result: matchResult });
          try {
            await supabase.from("admin_notifications").insert({
              type: "concierge_no_matches",
              title: "⚠️ No facilities matched seeker intake",
              message: `No facilities matched ${sanitizedName}'s intake (${sanitizeString(intakeData.levelOfCare, 50) || "any LoC"} in ${sanitizeString(intakeData.desiredState, 50) || "any state"}). Manual matching or broadened search needed.`,
              metadata: {
                inquiry_id: inquiryId,
                seeker_name: sanitizedName,
                level_of_care: sanitizeString(intakeData.levelOfCare, 50),
                desired_state: sanitizeString(intakeData.desiredState, 50),
                desired_city: sanitizeString(intakeData.desiredCity, 100),
                primary_concern: sanitizeString(intakeData.primaryConcern, 100),
                timeline: sanitizeString(intakeData.timeline, 50),
                payment_type: sanitizeString(intakeData.paymentType, 50),
                crisis_flag: isCrisis,
              },
            });
          } catch (noMatchNotifErr) {
            logStep(requestId, "Warning: Failed to create no-matches admin notification", {
              error: String(noMatchNotifErr),
            });
          }
        }
      }
    } catch (matchErr) {
      logStep(requestId, "Warning: Auto-matching failed — admin will need to match manually", { error: String(matchErr) });
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
