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
  // Step A: Who needs help
  ageRange: string;
  state: string;
  city: string;
  relationship: string;
  
  // Step B: Care need
  primaryConcern: string;
  levelOfCare: string;
  priorTreatment: boolean;
  priorTreatmentNotes?: string;
  coOccurringConcerns: string[];
  
  // Step C: Logistics
  desiredState: string;
  desiredCity?: string;
  radiusMiles: number;
  timeline: string;
  needsTransport: boolean;
  assessmentPreference: string;
  
  // Step D: Payment
  paymentType: string;
  insuranceCarrier?: string;
  budgetRange?: string;
  willingToTravel: boolean;
  
  // Step E: Contact
  decisionMakerName: string;
  phone: string;
  email: string;
  bestTimeToCall: string;
  notes: string;
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
        
        // Enhanced intake fields
        age_range: intakeData.ageRange,
        relationship_to_decision_maker: intakeData.relationship,
        primary_concern: intakeData.primaryConcern,
        level_of_care: intakeData.levelOfCare,
        prior_treatment_history: intakeData.priorTreatment,
        prior_treatment_notes: intakeData.priorTreatmentNotes,
        co_occurring_concerns: intakeData.coOccurringConcerns,
        desired_location_state: intakeData.desiredState,
        desired_location_city: intakeData.desiredCity,
        desired_radius_miles: intakeData.radiusMiles,
        timeline_urgency: intakeData.timeline,
        needs_transport_help: intakeData.needsTransport,
        assessment_preference: intakeData.assessmentPreference,
        payment_type: intakeData.paymentType,
        insurance_carrier: intakeData.insuranceCarrier,
        budget_range: intakeData.budgetRange,
        willing_to_travel: intakeData.willingToTravel,
        decision_maker_name: intakeData.decisionMakerName,
        decision_maker_phone: intakeData.phone,
        best_time_to_call: intakeData.bestTimeToCall,
        notes: intakeData.notes,
        
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
