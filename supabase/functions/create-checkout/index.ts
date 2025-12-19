import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Price IDs for subscription plans
const PRICE_IDS = {
  professional: "price_1Sel1C9fxdThyiakWLfgbl9K", // $399/mo - 100 shared leads
  featured: "price_1Sel1P9fxdThyiakj5MaAvOE", // $1,099/mo - 100 exclusive leads
};

const PLAN_NAMES = {
  professional: "Professional",
  featured: "Featured",
};

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

    const { plan, promoCode, action } = await req.json();
    logStep("Request received", { plan, action, promoCode: promoCode ? "provided" : "none" });

    // Validate plan
    if (!plan || !PRICE_IDS[plan as keyof typeof PRICE_IDS]) {
      throw new Error("Invalid plan selected. Available plans: professional, featured");
    }

    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];
    const planName = PLAN_NAMES[plan as keyof typeof PLAN_NAMES];
    logStep("Using price ID", { priceId, planName });

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

    // If upgrading existing subscription, use Stripe's billing portal or update directly
    if (existingSubscription && action === "upgrade") {
      const currentPriceId = existingSubscription.items.data[0]?.price.id;
      
      // If same plan, no change needed
      if (currentPriceId === priceId) {
        return new Response(
          JSON.stringify({ error: "You are already on this plan", alreadySubscribed: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Update subscription with proration
      logStep("Updating existing subscription", { 
        subscriptionId: existingSubscription.id,
        fromPrice: currentPriceId,
        toPrice: priceId
      });

      await stripe.subscriptions.update(existingSubscription.id, {
        items: [{
          id: existingSubscription.items.data[0].id,
          price: priceId,
        }],
        proration_behavior: 'create_prorations',
        metadata: {
          user_id: user.id,
          plan: plan,
          upgraded_at: new Date().toISOString(),
        },
      });

      logStep("Subscription upgraded successfully");

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Upgraded to ${planName} successfully`,
          upgraded: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
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
          discounts = [{ promotion_code: promoCodes.data[0].id }];
          logStep("Promo code applied", { promoCodeId: promoCodes.data[0].id });
        } else {
          logStep("Promo code not found or inactive", { promoCode });
        }
      } catch (promoErr) {
        logStep("Error looking up promo code", { error: promoErr });
      }
    }

    // Build checkout session config
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      customer_creation: customerId ? undefined : "always",
      billing_address_collection: "required",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/provider/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/provider/billing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan: plan,
        plan_name: planName,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: plan,
          plan_name: planName,
          created_via: "checkout",
        },
      },
      // Custom text for the checkout page
      custom_text: {
        submit: {
          message: `Start receiving ${plan === 'featured' ? 'exclusive' : 'qualified'} leads immediately after checkout.`,
        },
        after_submit: {
          message: "Your subscription will begin immediately and renew monthly.",
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
      planName 
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
