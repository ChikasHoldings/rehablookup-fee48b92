import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SETUP-PROVIDER-PAYMENT] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST-only enforcement
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", code: "method_not_allowed", allowed: ["POST"] }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
      },
    );
  }


  try {
    logStep("Function started");

    // Validate Stripe key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR", { message: "STRIPE_SECRET_KEY not configured" });
      return new Response(
        JSON.stringify({
          error: "Payment system not configured",
          instructions: "STRIPE_SECRET_KEY must be set in Supabase secrets",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Validate key type
    if (stripeKey.startsWith("pk_")) {
      logStep("ERROR", { message: "Invalid key type - publishable key used" });
      return new Response(
        JSON.stringify({
          error: "Invalid Stripe key configuration",
          message: "Secret key required, not publishable key",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    const { facilityId } = await req.json();
    if (!facilityId) {
      throw new Error("Facility ID is required");
    }

    logStep("Setting up payment for facility", { facilityId, userId: userData.user.id });

    // Verify user owns this facility
    const supabaseService = createClient(
      supabaseUrl, 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { data: facility, error: facilityError } = await supabaseService
      .from('facilities')
      .select('id, name, email, user_id')
      .eq('id', facilityId)
      .eq('user_id', userData.user.id)
      .single();

    if (facilityError || !facility) {
      logStep("ERROR", { message: "Facility not found", facilityError });
      throw new Error("Facility not found or access denied");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer already exists for this facility
    const { data: existingMethods } = await supabaseService
      .from('provider_payment_methods')
      .select('stripe_payment_method_id, stripe_customer_id')
      .eq('facility_id', facilityId)
      .limit(1);

    let customerId: string;

    if (existingMethods && existingMethods.length > 0 && existingMethods[0].stripe_customer_id) {
      customerId = existingMethods[0].stripe_customer_id;
      logStep("Found existing customer from database", { customerId });
    } else {
      // Create new customer or find existing by email
      const email = facility.email || userData.user.email;
      
      // Check if Stripe customer exists
      const customers = await stripe.customers.list({ email, limit: 1 });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer by email", { customerId });
      } else {
        const customer = await stripe.customers.create({
          email,
          name: facility.name,
          metadata: {
            facility_id: facilityId,
            user_id: userData.user.id,
            source: 'placement_network',
          },
        });
        customerId = customer.id;
        logStep("Created new customer", { customerId });
      }
    }

    // Create SetupIntent with Financial Connections for ACH
    // Using instant verification with Financial Connections
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['us_bank_account', 'card'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method'],
          },
          verification_method: 'instant',
        },
      },
      metadata: {
        facility_id: facilityId,
        facility_name: facility.name,
        purpose: 'placement_billing',
      },
      usage: 'off_session',
    });

    logStep("SetupIntent created", { 
      setupIntentId: setupIntent.id,
      status: setupIntent.status,
      paymentMethodTypes: setupIntent.payment_method_types,
      hasClientSecret: !!setupIntent.client_secret
    });

    // Return publishable key for frontend Stripe initialization
    const publishableKey = Deno.env.get("VITE_STRIPE_PUBLISHABLE_KEY") || "";

    return new Response(
      JSON.stringify({
        clientSecret: setupIntent.client_secret,
        customerId,
        setupIntentId: setupIntent.id,
        publishableKey,
        facilityName: facility.name, // Include for pre-filling account holder name
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
