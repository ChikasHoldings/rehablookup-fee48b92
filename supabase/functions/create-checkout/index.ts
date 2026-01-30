import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pro subscription price ID - $399/mo RehabLookup Pro
const PRO_PRICE_ID = "price_1Sel1C9fxdThyiakWLfgbl9K";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { promoCode, action } = await req.json();
    logStep("Request received", { action, promoCode: promoCode ? "provided" : "none" });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    let existingSubscription: Stripe.Subscription | null = null;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });

      // Check for existing active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        existingSubscription = subscriptions.data[0];
        logStep("Found existing subscription", { 
          subscriptionId: existingSubscription.id,
          currentPriceId: existingSubscription.items.data[0]?.price.id
        });
      }
    }

    const origin = req.headers.get("origin") || "https://rehablookup.com";

    // If already has Pro subscription
    if (existingSubscription) {
      const currentPriceId = existingSubscription.items.data[0]?.price.id;
      
      // Already on Pro
      if (currentPriceId === PRO_PRICE_ID) {
        return new Response(
          JSON.stringify({ error: "You are already on the Pro plan", alreadySubscribed: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Upgrading from legacy plan to Pro
      if (action === "upgrade") {
        logStep("Updating existing subscription to Pro", { 
          subscriptionId: existingSubscription.id,
          fromPrice: currentPriceId,
          toPrice: PRO_PRICE_ID
        });

        await stripe.subscriptions.update(existingSubscription.id, {
          items: [{
            id: existingSubscription.items.data[0].id,
            price: PRO_PRICE_ID,
          }],
          proration_behavior: 'create_prorations',
          metadata: {
            user_id: user.id,
            plan: "pro",
            upgraded_at: new Date().toISOString(),
          },
        });

        logStep("Subscription upgraded to Pro successfully");

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Upgraded to Pro successfully",
            upgraded: true 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Look up promo code if provided
    let discounts: { promotion_code: string }[] | undefined;
    if (promoCode) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: promoCode.trim().toUpperCase(),
          active: true,
          limit: 1,
        });
        if (promoCodes.data.length > 0) {
          const promoCodeObj = promoCodes.data[0];
          discounts = [{ promotion_code: promoCodeObj.id }];
          logStep("Promo code applied", { promoCodeId: promoCodeObj.id });
        } else {
          logStep("Promo code not found or inactive", { promoCode });
        }
      } catch (promoErr) {
        logStep("Error looking up promo code", { error: promoErr });
      }
    }

    // Build checkout session config for Pro subscription
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      // Required for existing customers with tax_id_collection
      customer_update: customerId ? {
        name: "auto",
        address: "auto",
      } : undefined,
      billing_address_collection: "required",
      payment_method_types: ["card"],
      line_items: [
        {
          price: PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/provider/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/provider/billing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan: "pro",
        plan_name: "Pro",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: "pro",
          plan_name: "Pro",
          created_via: "checkout",
        },
      },
      // Custom text for the checkout page
      custom_text: {
        submit: {
          message: "Get 20% off all lead unlocks and featured placement immediately after checkout.",
        },
      },
      // Allow tax ID collection for business customers
      tax_id_collection: {
        enabled: true,
      },
      // Phone number collection
      phone_number_collection: {
        enabled: true,
      },
    };

    // Apply discount if promo code was valid, otherwise allow manual entry
    if (discounts) {
      sessionConfig.discounts = discounts;
    } else {
      sessionConfig.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { 
      sessionId: session.id, 
      hasDiscount: !!discounts,
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
