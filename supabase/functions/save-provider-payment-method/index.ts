import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SAVE-PROVIDER-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
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

    const { facilityId, paymentMethodId, setAsDefault } = await req.json();
    if (!facilityId || !paymentMethodId) {
      throw new Error("Facility ID and payment method ID are required");
    }

    logStep("Saving payment method", { facilityId, paymentMethodId });

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user owns this facility
    const { data: facility, error: facilityError } = await supabaseService
      .from('facilities')
      .select('id, user_id')
      .eq('id', facilityId)
      .eq('user_id', userData.user.id)
      .single();

    if (facilityError || !facility) {
      throw new Error("Facility not found or access denied");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    let lastFour = '';
    let type = 'card';
    let bankName = null;

    if (paymentMethod.type === 'card' && paymentMethod.card) {
      lastFour = paymentMethod.card.last4;
      type = 'card';
    } else if (paymentMethod.type === 'us_bank_account' && paymentMethod.us_bank_account) {
      lastFour = paymentMethod.us_bank_account.last4;
      type = 'ach';
      bankName = paymentMethod.us_bank_account.bank_name;
    }

    logStep("Payment method details", { type, lastFour });

    // If setting as default, unset other defaults first
    if (setAsDefault) {
      await supabaseService
        .from('provider_payment_methods')
        .update({ is_default: false })
        .eq('facility_id', facilityId);
    }

    // Check if this payment method already exists
    const { data: existing } = await supabaseService
      .from('provider_payment_methods')
      .select('id')
      .eq('stripe_payment_method_id', paymentMethodId)
      .maybeSingle();

    if (existing) {
      // Update existing
      await supabaseService
        .from('provider_payment_methods')
        .update({
          is_default: setAsDefault ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      
      logStep("Updated existing payment method");
    } else {
      // Insert new payment method
      const { error: insertError } = await supabaseService
        .from('provider_payment_methods')
        .insert({
          facility_id: facilityId,
          type,
          stripe_payment_method_id: paymentMethodId,
          last_four: lastFour,
          bank_name: bankName,
          is_default: setAsDefault ?? true,
        });

      if (insertError) {
        throw new Error(`Failed to save payment method: ${insertError.message}`);
      }

      logStep("Saved new payment method");
    }

    return new Response(
      JSON.stringify({ success: true }),
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
