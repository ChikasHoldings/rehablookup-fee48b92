import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBMIT-CONCIERGE-INTAKE] ${step}${detailsStr}`);
};

interface IntakeData {
  // Step 1: Who needs help
  ageRange: string;
  gender: string;
  preferredLanguage: string;
  state: string;
  city: string;
  currentLivingSituation: string;
  relationship: string;
  mobilityNeeds: string;
  
  // Step 2: Care need
  primaryConcern: string;
  substanceUseFrequency: string;
  substanceUseDuration: string;
  detoxNeeded: string;
  levelOfCare: string;
  priorTreatment: boolean | null;
  priorTreatmentNotes: string;
  currentMedications: string;
  coOccurringConcerns: string[];
  suicideHistory: string;
  
  // Step 3: Logistics
  desiredState: string;
  desiredCity: string;
  radiusMiles: number;
  preferredEnvironment: string;
  timeline: string;
  faithBasedPreference: string;
  holisticInterest: boolean;
  amenityPreferences: string[];
  needsTransport: boolean;
  assessmentPreference: string;
  
  // Step 4: Payment
  paymentType: string;
  insuranceCarrier: string;
  insuranceMemberId: string;
  insuranceGroupNumber: string;
  employerName: string;
  benefitsVerified: boolean;
  budgetRange: string;
  scholarshipInterest: boolean;
  willingToTravel: boolean;
  
  // Step 5: Contact
  decisionMakerName: string;
  phone: string;
  email: string;
  bestTimeToCall: string;
  alternativeContactName: string;
  alternativeContactPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  referralSource: string;
  hipaaConsent: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionId, intakeData } = await req.json() as { 
      sessionId: string; 
      intakeData: IntakeData;
    };
    
    if (!sessionId) {
      throw new Error("Session ID is required");
    }
    if (!intakeData) {
      throw new Error("Intake data is required");
    }

    logStep("Processing intake submission", { sessionId, email: intakeData.email });

    // Verify payment with Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      throw new Error("Payment not verified");
    }

    logStep("Payment verified", { paymentStatus: session.payment_status });

    // Create idempotency key from session ID
    const idempotencyKey = `intake_${sessionId}`;

    // Check if already submitted (idempotency)
    const { data: existingInquiry } = await supabase
      .from('concierge_inquiries')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingInquiry) {
      logStep("Intake already submitted", { existingId: existingInquiry.id });
      return new Response(
        JSON.stringify({ 
          success: true, 
          inquiryId: existingInquiry.id,
          alreadySubmitted: true 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Insert the concierge inquiry
    const { data: inquiry, error: insertError } = await supabase
      .from('concierge_inquiries')
      .insert({
        user_name: intakeData.decisionMakerName,
        user_email: intakeData.email,
        user_phone: intakeData.phone,
        preferred_state: intakeData.desiredState,
        preferred_city: intakeData.desiredCity || intakeData.city,
        payment_status: 'paid',
        payment_amount_cents: 2900,
        status: 'pending',
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
        preferred_language: intakeData.preferredLanguage,
        current_living_situation: intakeData.currentLivingSituation,
        relationship_to_decision_maker: intakeData.relationship,
        mobility_needs: intakeData.mobilityNeeds,
        
        // Step 2: Care needs
        primary_concern: intakeData.primaryConcern,
        substance_use_frequency: intakeData.substanceUseFrequency,
        substance_use_duration: intakeData.substanceUseDuration,
        detox_needed: intakeData.detoxNeeded,
        level_of_care: intakeData.levelOfCare,
        prior_treatment_history: intakeData.priorTreatment,
        prior_treatment_notes: intakeData.priorTreatmentNotes,
        current_medications: intakeData.currentMedications,
        co_occurring_concerns: intakeData.coOccurringConcerns,
        suicide_history: intakeData.suicideHistory,
        
        // Step 3: Logistics
        desired_location_state: intakeData.desiredState,
        desired_location_city: intakeData.desiredCity,
        desired_radius_miles: intakeData.radiusMiles,
        preferred_environment: intakeData.preferredEnvironment,
        timeline_urgency: intakeData.timeline,
        faith_based_preference: intakeData.faithBasedPreference,
        holistic_interest: intakeData.holisticInterest,
        amenity_preferences: intakeData.amenityPreferences,
        needs_transport_help: intakeData.needsTransport,
        assessment_preference: intakeData.assessmentPreference,
        
        // Step 4: Payment
        payment_type: intakeData.paymentType,
        insurance_carrier: intakeData.insuranceCarrier,
        insurance_member_id: intakeData.insuranceMemberId,
        insurance_group_number: intakeData.insuranceGroupNumber,
        employer_name: intakeData.employerName,
        benefits_verified: intakeData.benefitsVerified,
        budget_range: intakeData.budgetRange,
        scholarship_interest: intakeData.scholarshipInterest,
        willing_to_travel: intakeData.willingToTravel,
        
        // Step 5: Contact
        decision_maker_name: intakeData.decisionMakerName,
        decision_maker_phone: intakeData.phone,
        best_time_to_call: intakeData.bestTimeToCall,
        alternative_contact_name: intakeData.alternativeContactName,
        alternative_contact_phone: intakeData.alternativeContactPhone,
        emergency_contact_name: intakeData.emergencyContactName,
        emergency_contact_phone: intakeData.emergencyContactPhone,
        notes: intakeData.notes,
        referral_source: intakeData.referralSource,
        hipaa_consent: intakeData.hipaaConsent,
        
        // Store full intake data as JSON backup
        intake_data: intakeData,
      })
      .select('id')
      .single();

    if (insertError) {
      logStep("Insert error", { error: insertError });
      throw new Error(`Failed to create inquiry: ${insertError.message}`);
    }

    logStep("Inquiry created successfully", { inquiryId: inquiry.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        inquiryId: inquiry.id,
        alreadySubmitted: false 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
