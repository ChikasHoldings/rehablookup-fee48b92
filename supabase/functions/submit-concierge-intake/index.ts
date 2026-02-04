import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const VERSION = "1.0.1";

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
  decisionMakerName: string;
  email: string;
  phone?: string;
}

type IntakeData = FullIntakeData | InlineIntakeData;

serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
    
    if (!sessionId) {
      throw new Error("Session ID is required");
    }
    if (!intakeData) {
      throw new Error("Intake data is required");
    }

    // Use authenticated user ID first, then passed userId
    const finalUserId = authenticatedUserId || passedUserId || null;

    logStep(requestId, "Processing intake submission", { 
      sessionId, 
      email: intakeData.email,
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

    // Check if already submitted (idempotency)
    const { data: existingInquiry } = await supabase
      .from('concierge_inquiries')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingInquiry) {
      logStep(requestId, "Intake already submitted", { existingId: existingInquiry.id });
      return new Response(
        JSON.stringify({ 
          success: true, 
          inquiryId: existingInquiry.id,
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

    // Normalize field names - handle both inline and full intake formats
    // Inline format uses currentState/currentCity, full format uses state/city
    const currentState = (intakeData as InlineIntakeData).currentState || (intakeData as FullIntakeData).state || '';
    const currentCity = (intakeData as InlineIntakeData).currentCity || (intakeData as FullIntakeData).city || '';
    
    // Insert the concierge inquiry with normalized data
    const { data: inquiry, error: insertError } = await supabase
      .from('concierge_inquiries')
      .insert({
        // Link to authenticated user if available
        user_id: effectiveUserId,
        
        // Core required fields
        user_name: intakeData.decisionMakerName,
        user_email: intakeData.email,
        user_phone: intakeData.phone || '',
        preferred_state: intakeData.desiredState,
        preferred_city: intakeData.desiredCity || currentCity,
        payment_status: 'paid',
        payment_amount_cents: 2900,
        status: 'new',
        checkout_session_id: sessionId,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : null,
        stripe_customer_id: typeof session.customer === 'string' 
          ? session.customer 
          : null,
        idempotency_key: idempotencyKey,
        intake_submitted_at: new Date().toISOString(),
        
        // Step 1: Who needs help
        age_range: intakeData.ageRange,
        gender: intakeData.gender,
        preferred_language: (intakeData as FullIntakeData).preferredLanguage || null,
        current_living_situation: (intakeData as FullIntakeData).currentLivingSituation || null,
        relationship_to_decision_maker: intakeData.relationship || 'self',
        mobility_needs: (intakeData as FullIntakeData).mobilityNeeds || null,
        
        // Step 2: Care needs
        primary_concern: intakeData.primaryConcern,
        substance_use_frequency: (intakeData as FullIntakeData).substanceUseFrequency || null,
        substance_use_duration: (intakeData as FullIntakeData).substanceUseDuration || null,
        detox_needed: intakeData.detoxNeeded,
        level_of_care: intakeData.levelOfCare,
        prior_treatment_history: intakeData.priorTreatment ?? null,
        prior_treatment_notes: (intakeData as FullIntakeData).priorTreatmentNotes || null,
        current_medications: (intakeData as FullIntakeData).currentMedications || null,
        co_occurring_concerns: (intakeData as FullIntakeData).coOccurringConcerns || null,
        suicide_history: (intakeData as FullIntakeData).suicideHistory || null,
        
        // Step 3: Logistics
        desired_location_state: intakeData.desiredState,
        desired_location_city: intakeData.desiredCity || null,
        desired_radius_miles: (intakeData as FullIntakeData).radiusMiles || null,
        preferred_environment: (intakeData as FullIntakeData).preferredEnvironment || null,
        timeline_urgency: intakeData.timeline,
        faith_based_preference: (intakeData as FullIntakeData).faithBasedPreference || null,
        holistic_interest: (intakeData as FullIntakeData).holisticInterest ?? null,
        amenity_preferences: (intakeData as FullIntakeData).amenityPreferences || null,
        needs_transport_help: (intakeData as FullIntakeData).needsTransport ?? null,
        assessment_preference: (intakeData as FullIntakeData).assessmentPreference || 'phone',
        
        // Step 4: Payment
        payment_type: intakeData.paymentType,
        insurance_carrier: intakeData.insuranceCarrier || null,
        insurance_member_id: (intakeData as FullIntakeData).insuranceMemberId || null,
        insurance_group_number: (intakeData as FullIntakeData).insuranceGroupNumber || null,
        employer_name: (intakeData as FullIntakeData).employerName || null,
        benefits_verified: (intakeData as FullIntakeData).benefitsVerified ?? null,
        budget_range: (intakeData as FullIntakeData).budgetRange || null,
        scholarship_interest: (intakeData as FullIntakeData).scholarshipInterest ?? null,
        willing_to_travel: (intakeData as FullIntakeData).willingToTravel ?? null,
        
        // Step 5: Contact
        decision_maker_name: intakeData.decisionMakerName,
        decision_maker_phone: intakeData.phone || null,
        best_time_to_call: (intakeData as FullIntakeData).bestTimeToCall || null,
        alternative_contact_name: (intakeData as FullIntakeData).alternativeContactName || null,
        alternative_contact_phone: (intakeData as FullIntakeData).alternativeContactPhone || null,
        emergency_contact_name: (intakeData as FullIntakeData).emergencyContactName || null,
        emergency_contact_phone: (intakeData as FullIntakeData).emergencyContactPhone || null,
        notes: intakeData.notes || null,
        referral_source: (intakeData as FullIntakeData).referralSource || (effectiveUserId ? 'account_concierge' : 'public_concierge'),
        hipaa_consent: intakeData.hipaaConsent,
        
        // Store full intake data as JSON backup
        intake_data: intakeData,
      })
      .select('id')
      .single();

    if (insertError) {
      logStep(requestId, "Insert error", { error: insertError.message });
      throw new Error(`Failed to create inquiry: ${insertError.message}`);
    }

    logStep(requestId, "Inquiry created successfully", { inquiryId: inquiry.id, userId: effectiveUserId });

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
          inquiryId: inquiry.id,
        }),
      });
      logStep(requestId, "Intake received notification sent");
    } catch (notifError) {
      logStep(requestId, "Warning: Failed to send notification", { error: String(notifError) });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        inquiryId: inquiry.id,
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
    return new Response(
      JSON.stringify({ error: errorMessage, requestId, _version: VERSION }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
