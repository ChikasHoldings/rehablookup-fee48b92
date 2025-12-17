import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[MANAGE-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const adminUser = userData.user;
    if (!adminUser) throw new Error("User not authenticated");

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Unauthorized: Admin access required");
    logStep("Admin verified", { adminId: adminUser.id });

    const { action, subscriptionId, customerId, reason } = await req.json();
    
    if (!action) throw new Error("Action is required");
    if (!subscriptionId && !customerId) throw new Error("Subscription ID or Customer ID is required");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let result: any = null;

    switch (action) {
      case "cancel": {
        // Cancel subscription at period end
        logStep("Canceling subscription at period end", { subscriptionId });
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            canceled_by: adminUser.id,
            canceled_reason: reason || "Admin cancellation",
            canceled_at: new Date().toISOString(),
          },
        });
        result = { success: true, subscription, message: "Subscription will cancel at period end" };
        break;
      }

      case "cancel_immediately": {
        // Cancel subscription immediately
        logStep("Canceling subscription immediately", { subscriptionId });
        const subscription = await stripe.subscriptions.cancel(subscriptionId, {
          prorate: true,
        });
        result = { success: true, subscription, message: "Subscription canceled immediately" };
        break;
      }

      case "pause": {
        // Pause subscription by setting pause_collection
        logStep("Pausing subscription", { subscriptionId });
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          pause_collection: {
            behavior: "void",
          },
          metadata: {
            paused_by: adminUser.id,
            paused_at: new Date().toISOString(),
          },
        });
        result = { success: true, subscription, message: "Subscription paused" };
        break;
      }

      case "resume": {
        // Resume a paused subscription
        logStep("Resuming subscription", { subscriptionId });
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          pause_collection: null,
          metadata: {
            resumed_by: adminUser.id,
            resumed_at: new Date().toISOString(),
          },
        });
        result = { success: true, subscription, message: "Subscription resumed" };
        break;
      }

      case "reactivate": {
        // Reactivate a subscription that was set to cancel at period end
        logStep("Reactivating subscription", { subscriptionId });
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false,
          metadata: {
            reactivated_by: adminUser.id,
            reactivated_at: new Date().toISOString(),
          },
        });
        result = { success: true, subscription, message: "Subscription reactivated" };
        break;
      }

      // Promo Code Management
      case "create_coupon": {
        const { name, percent_off, amount_off, currency, duration, duration_in_months, max_redemptions } = await req.json();
        logStep("Creating coupon", { name, percent_off, amount_off });
        
        const couponData: Stripe.CouponCreateParams = {
          name,
          duration: duration || "once",
        };

        if (percent_off) {
          couponData.percent_off = percent_off;
        } else if (amount_off) {
          couponData.amount_off = amount_off;
          couponData.currency = currency || "usd";
        }

        if (duration === "repeating" && duration_in_months) {
          couponData.duration_in_months = duration_in_months;
        }

        if (max_redemptions) {
          couponData.max_redemptions = max_redemptions;
        }

        const coupon = await stripe.coupons.create(couponData);
        
        // Create a promotion code for the coupon
        const promoCode = await stripe.promotionCodes.create({
          coupon: coupon.id,
          code: name.toUpperCase().replace(/\s+/g, ""),
          metadata: {
            created_by: adminUser.id,
          },
        });

        result = { success: true, coupon, promoCode, message: "Coupon and promo code created" };
        break;
      }

      case "list_coupons": {
        logStep("Listing coupons");
        const coupons = await stripe.coupons.list({ limit: 50 });
        const promoCodes = await stripe.promotionCodes.list({ limit: 100, active: true });
        result = { success: true, coupons: coupons.data, promoCodes: promoCodes.data };
        break;
      }

      case "delete_coupon": {
        const { couponId } = await req.json();
        logStep("Deleting coupon", { couponId });
        await stripe.coupons.del(couponId);
        result = { success: true, message: "Coupon deleted" };
        break;
      }

      case "deactivate_promo_code": {
        const { promoCodeId } = await req.json();
        logStep("Deactivating promo code", { promoCodeId });
        const promoCode = await stripe.promotionCodes.update(promoCodeId, { active: false });
        result = { success: true, promoCode, message: "Promo code deactivated" };
        break;
      }

      // Get subscription details
      case "get_subscription": {
        logStep("Getting subscription details", { subscriptionId });
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items.data.price.product"],
        });
        result = { success: true, subscription };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log audit entry
    await supabaseClient.from("admin_audit_log").insert({
      admin_user_id: adminUser.id,
      action_type: `subscription_${action}`,
      target_type: "subscription",
      target_id: subscriptionId || customerId,
      details: { action, reason, result: result?.message },
    });

    logStep("Action completed successfully", { action });
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
