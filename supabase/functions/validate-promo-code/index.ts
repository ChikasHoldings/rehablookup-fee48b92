import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VALIDATE-PROMO] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { promoCode, plan } = await req.json();
    
    if (!promoCode || typeof promoCode !== "string") {
      return new Response(
        JSON.stringify({ valid: false, message: "Please enter a promo code" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const code = promoCode.trim().toUpperCase();
    logStep("Validating promo code", { code, plan });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Search for promotion code by code string
    const promoCodes = await stripe.promotionCodes.list({
      code: code,
      active: true,
      limit: 1,
    });

    if (promoCodes.data.length === 0) {
      logStep("Promo code not found or inactive", { code });
      return new Response(
        JSON.stringify({ valid: false, message: "Invalid or expired promo code" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const promoCodeObj = promoCodes.data[0];
    const coupon = promoCodeObj.coupon;
    logStep("Promo code found", { promoCodeId: promoCodeObj.id, couponId: coupon.id });

    // Check if coupon has redemption limits
    if (promoCodeObj.max_redemptions && promoCodeObj.times_redeemed >= promoCodeObj.max_redemptions) {
      logStep("Promo code max redemptions reached");
      return new Response(
        JSON.stringify({ valid: false, message: "This promo code has reached its usage limit" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check expiration
    if (promoCodeObj.expires_at && promoCodeObj.expires_at * 1000 < Date.now()) {
      logStep("Promo code expired");
      return new Response(
        JSON.stringify({ valid: false, message: "This promo code has expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Build discount description
    let discountDescription = "";
    if (coupon.percent_off) {
      discountDescription = `${coupon.percent_off}% off`;
    } else if (coupon.amount_off) {
      const amount = (coupon.amount_off / 100).toFixed(2);
      const currency = (coupon.currency || "usd").toUpperCase();
      discountDescription = `$${amount} ${currency} off`;
    }

    // Add duration info
    if (coupon.duration === "once") {
      discountDescription += " (first payment)";
    } else if (coupon.duration === "repeating" && coupon.duration_in_months) {
      discountDescription += ` for ${coupon.duration_in_months} months`;
    } else if (coupon.duration === "forever") {
      discountDescription += " (forever)";
    }

    logStep("Promo code valid", { discount: discountDescription });

    return new Response(
      JSON.stringify({
        valid: true,
        message: "Promo code applied!",
        discount: discountDescription,
        couponName: coupon.name || code,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in validate-promo-code", { message: errorMessage });
    return new Response(
      JSON.stringify({ valid: false, message: "Unable to validate promo code" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
