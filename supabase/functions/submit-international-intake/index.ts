import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBMIT-INTL-INTAKE] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { sessionId, intakeData } = await req.json();

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    logStep("Verifying payment session", { sessionId });

    // Verify payment was successful
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    logStep("Payment verified", { paymentStatus: session.payment_status });

    // Extract data from intake
    const clientName = intakeData?.firstName && intakeData?.lastName 
      ? `${intakeData.firstName} ${intakeData.lastName}`.trim()
      : session.metadata?.client_name || "";
    const clientEmail = intakeData?.email || session.customer_email || session.metadata?.client_email || "";
    const clientPhone = intakeData?.phone || session.metadata?.client_phone || "";
    const clientCountry = intakeData?.country || session.metadata?.client_country || "";
    const preferredLanguage = intakeData?.preferredLanguage || "English";

    // Verify email if provided
    let emailVerified = false;
    if (clientEmail) {
      const { data: verificationRecord } = await supabase
        .from("email_verification_codes")
        .select("verified")
        .eq("email", clientEmail.toLowerCase())
        .eq("verified", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      emailVerified = verificationRecord?.verified === true;
      logStep("Email verification status", { email: clientEmail, verified: emailVerified });
    }

    // Get user from auth header if available
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    // Check if case already exists for this session
    const { data: existingCase } = await supabase
      .from("international_placement_cases")
      .select("id")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();

    if (existingCase) {
      logStep("Case already exists, updating intake data", { caseId: existingCase.id });
      
      const { error: updateError } = await supabase
        .from("international_placement_cases")
        .update({
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          client_country: clientCountry,
          preferred_language: preferredLanguage,
          intake_data: intakeData || {},
          intake_submitted_at: new Date().toISOString(),
          status: emailVerified ? "in_review" : "pending_verification",
          email_verified: emailVerified,
          user_id: userId || undefined,
        })
        .eq("id", existingCase.id);

      if (updateError) throw updateError;

      // Log event
      await supabase.from("international_case_events").insert({
        case_id: existingCase.id,
        event_type: "intake_submitted",
        actor_id: userId,
        actor_type: userId ? "client" : "system",
        event_data: { 
          intake_submitted: true,
          primary_concern: intakeData?.primaryConcern,
          urgency: intakeData?.urgency,
        },
      });

      return new Response(
        JSON.stringify({ success: true, caseId: existingCase.id }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Create new case
    logStep("Creating new international placement case");

    const { data: newCase, error: insertError } = await supabase
      .from("international_placement_cases")
      .insert({
        user_id: userId,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        client_country: clientCountry,
        preferred_language: preferredLanguage,
        payment_status: "paid",
        payment_amount_cents: 29900,
        stripe_checkout_session_id: sessionId,
        stripe_payment_intent_id: session.payment_intent as string,
        intake_data: intakeData || {},
        intake_submitted_at: new Date().toISOString(),
        status: emailVerified ? "in_review" : "pending_verification",
        priority: "normal",
        email_verified: emailVerified,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    logStep("Case created successfully", { caseId: newCase.id });

    // Log the event
    await supabase.from("international_case_events").insert({
      case_id: newCase.id,
      event_type: "case_created",
      actor_id: userId,
      actor_type: userId ? "client" : "system",
      event_data: { 
        payment_verified: true,
        intake_submitted: true,
        primary_concern: intakeData?.primaryConcern,
        urgency: intakeData?.urgency,
      },
    });

    // Create admin notification
    await supabase.from("admin_notifications").insert({
      type: "international_case",
      title: "New International Placement Case",
      message: `New placement case from ${clientName} (${clientCountry}). Primary concern: ${intakeData?.primaryConcern || "—"}`,
      metadata: {
        case_id: newCase.id,
        client_country: clientCountry,
        urgency: intakeData?.urgency,
      },
    });

    return new Response(
      JSON.stringify({ success: true, caseId: newCase.id }),
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