import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const VERSION = "1.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SAVE-PROVIDER-PAYMENT] [${VERSION}] ${step}${detailsStr}`);
};

// Determine verification status from ACH account status
function getVerificationStatus(achStatus: string | undefined): { isVerified: boolean; verificationStatus: string } {
  // ACH account status values from Stripe:
  // - new: Account was just added, verification not started
  // - validated: Account ownership validated but not verified for payments
  // - verified: Account is verified and can be charged
  // - verification_failed: Verification failed
  // - errored: An error occurred during verification
  switch (achStatus) {
    case 'verified':
    case 'validated':
      return { isVerified: true, verificationStatus: 'verified' };
    case 'new':
      return { isVerified: false, verificationStatus: 'pending' };
    case 'verification_failed':
      return { isVerified: false, verificationStatus: 'failed' };
    case 'errored':
      return { isVerified: false, verificationStatus: 'errored' };
    default:
      // Default to verified for unknown states (cards, etc.)
      return { isVerified: true, verificationStatus: 'verified' };
  }
}

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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR", { message: "STRIPE_SECRET_KEY not configured" });
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

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

    logStep("Saving payment method", { facilityId, paymentMethodId, setAsDefault });

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user owns this facility
    const { data: facility, error: facilityError } = await supabaseService
      .from('facilities')
      .select('id, user_id')
      .eq('id', facilityId)
      .eq('user_id', userData.user.id)
      .single();

    if (facilityError || !facility) {
      logStep("ERROR", { message: "Facility not found", facilityError });
      throw new Error("Facility not found or access denied");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve payment method details from Stripe
    logStep("Retrieving payment method from Stripe", { paymentMethodId });
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    logStep("Payment method retrieved", { 
      type: paymentMethod.type, 
      hasCard: !!paymentMethod.card,
      hasBankAccount: !!paymentMethod.us_bank_account,
      customer: paymentMethod.customer
    });

    let lastFour = '';
    let type = 'card';
    let bankName: string | null = null;
    let cardBrand: string | null = null;
    let expMonth: number | null = null;
    let expYear: number | null = null;
    let isVerified = true;
    let verificationStatus = 'verified';

    if (paymentMethod.type === 'card' && paymentMethod.card) {
      lastFour = paymentMethod.card.last4;
      type = 'card';
      cardBrand = paymentMethod.card.brand;
      expMonth = paymentMethod.card.exp_month;
      expYear = paymentMethod.card.exp_year;
      isVerified = true; // Cards are always verified via 3DS or CVV
      verificationStatus = 'verified';
      logStep("Processing card payment method", { brand: cardBrand, lastFour });
    } else if (paymentMethod.type === 'us_bank_account' && paymentMethod.us_bank_account) {
      lastFour = paymentMethod.us_bank_account.last4 || '';
      type = 'ach';
      bankName = paymentMethod.us_bank_account.bank_name || null;
      
      // Check the actual verification status from Stripe
      // The status field indicates the verification state of the bank account
      const achStatus = (paymentMethod.us_bank_account as any).status;
      const statusResult = getVerificationStatus(achStatus);
      isVerified = statusResult.isVerified;
      verificationStatus = statusResult.verificationStatus;
      
      logStep("Processing ACH payment method", { 
        bankName, 
        lastFour,
        accountType: paymentMethod.us_bank_account.account_type,
        accountHolderType: paymentMethod.us_bank_account.account_holder_type,
        stripeAchStatus: achStatus,
        isVerified,
        verificationStatus
      });
    } else {
      logStep("Unknown payment method type", { type: paymentMethod.type });
      throw new Error(`Unsupported payment method type: ${paymentMethod.type}`);
    }

    // Get customer ID from payment method
    const stripeCustomerId = paymentMethod.customer as string | null;

    // If setting as default, unset other defaults first
    if (setAsDefault) {
      const { error: unsetError } = await supabaseService
        .from('provider_payment_methods')
        .update({ is_default: false })
        .eq('facility_id', facilityId);
      
      if (unsetError) {
        logStep("Warning: Failed to unset previous defaults", { error: unsetError });
      } else {
        logStep("Unset previous default payment methods");
      }
    }

    // Check if this payment method already exists
    const { data: existing } = await supabaseService
      .from('provider_payment_methods')
      .select('id')
      .eq('stripe_payment_method_id', paymentMethodId)
      .maybeSingle();

    const paymentMethodData = {
      facility_id: facilityId,
      type,
      stripe_payment_method_id: paymentMethodId,
      stripe_customer_id: stripeCustomerId,
      last_four: lastFour,
      bank_name: bankName,
      card_brand: cardBrand,
      exp_month: expMonth,
      exp_year: expYear,
      is_default: setAsDefault ?? true,
      is_verified: isVerified,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Update existing
      const { error: updateError } = await supabaseService
        .from('provider_payment_methods')
        .update(paymentMethodData)
        .eq('id', existing.id);
      
      if (updateError) {
        logStep("ERROR", { message: "Failed to update payment method", updateError });
        throw new Error(`Failed to update payment method: ${updateError.message}`);
      }
      
      logStep("Updated existing payment method", { id: existing.id });
    } else {
      // Insert new payment method
      const { error: insertError } = await supabaseService
        .from('provider_payment_methods')
        .insert({
          ...paymentMethodData,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        logStep("ERROR", { message: "Failed to save payment method", insertError });
        throw new Error(`Failed to save payment method: ${insertError.message}`);
      }

      logStep("Saved new payment method", { type, lastFour });
    }

    // Set the default payment method on the Stripe customer for off-session charges
    if (stripeCustomerId && (setAsDefault ?? true)) {
      try {
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
        logStep("Updated Stripe customer default payment method");
      } catch (stripeErr) {
        // Non-fatal - continue even if this fails
        logStep("Warning: Could not set default on Stripe customer", { 
          error: stripeErr instanceof Error ? stripeErr.message : String(stripeErr) 
        });
      }
    }

    logStep("Payment method saved successfully", { 
      type, 
      lastFour, 
      bankName, 
      cardBrand,
      isVerified, 
      verificationStatus 
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        type,
        lastFour,
        bankName,
        cardBrand,
        isVerified,
        verificationStatus,
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
