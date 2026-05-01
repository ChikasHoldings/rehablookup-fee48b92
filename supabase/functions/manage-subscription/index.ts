import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[MANAGE-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const sendSubscriptionNotificationEmail = async (
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  resend: Resend,
  email: string,
  providerName: string,
  action: string,
  planName: string,
  reason?: string
) => {
  const actionMessages: Record<string, { subject: string; title: string; message: string }> = {
    cancel: {
      subject: "Your Subscription Has Been Set to Cancel",
      title: "Subscription Cancellation Notice",
      message: `Your ${planName} subscription has been set to cancel at the end of your current billing period. You will continue to have access to all features until then.`,
    },
    cancel_immediately: {
      subject: "Your Subscription Has Been Canceled",
      title: "Subscription Canceled",
      message: `Your ${planName} subscription has been canceled immediately. Your access to premium features has ended. If you believe this was done in error, please contact our support team.`,
    },
    pause: {
      subject: "Your Subscription Has Been Paused",
      title: "Subscription Paused",
      message: `Your ${planName} subscription has been paused. During this time, you won't be charged and your premium features are temporarily unavailable. Contact support if you have questions.`,
    },
    resume: {
      subject: "Your Subscription Has Been Resumed",
      title: "Subscription Resumed",
      message: `Great news! Your ${planName} subscription has been resumed. You now have full access to all premium features again.`,
    },
    reactivate: {
      subject: "Your Subscription Has Been Reactivated",
      title: "Subscription Reactivated",
      message: `Your ${planName} subscription cancellation has been reversed. Your subscription will continue as normal and you will maintain access to all premium features.`,
    },
  };

  const actionInfo = actionMessages[action];
  if (!actionInfo) return;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e3a5f; font-size: 24px; margin: 0;">RehabLookup</h1>
          </div>
          
          <h2 style="color: #1e3a5f; font-size: 20px; margin-bottom: 20px;">${actionInfo.title}</h2>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Hi ${providerName},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            ${actionInfo.message}
          </p>
          
          ${reason ? `
          <div style="background-color: #f8fafc; border-left: 4px solid #1e3a5f; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #64748b; font-size: 14px; margin: 0;"><strong>Reason:</strong> ${reason}</p>
          </div>
          ` : ''}
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-top: 24px;">
            If you have any questions, please don't hesitate to contact our support team at 
            <a href="mailto:Support@rehablookup.com" style="color: #1e3a5f;">Support@rehablookup.com</a>.
          </p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 24px;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} RehabLookup. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmailWithRetry(supabaseClient, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [email],
      subject: actionInfo.subject,
      html,
    });
    logStep("Notification email sent", { email, action });
  } catch (error) {
    logStep("Failed to send notification email", { error: String(error) });
  }
};

// Actions that don't require subscriptionId or customerId
const PROMO_CODE_ACTIONS = ["list_coupons", "create_coupon", "delete_coupon", "deactivate_promo_code", "get_promo_analytics"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    const body = await req.json();
    const { action, subscriptionId, customerId, reason } = body;
    
    if (!action) throw new Error("Action is required");
    
    // Only require subscriptionId/customerId for non-promo code actions
    if (!PROMO_CODE_ACTIONS.includes(action) && !subscriptionId && !customerId) {
      throw new Error("Subscription ID or Customer ID is required");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let result: any = null;
    let shouldSendEmail = false;
    let customerEmail = "";
    let providerName = "";
    let planName = "";

    // Helper to get customer details for email
    const getCustomerDetails = async (stripeCustomerId: string) => {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if (customer.deleted) return { email: "", name: "" };
      return {
        email: (customer as Stripe.Customer).email || "",
        name: (customer as Stripe.Customer).name || "Provider",
      };
    };

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
        
        const customerDetails = await getCustomerDetails(subscription.customer as string);
        customerEmail = customerDetails.email;
        providerName = customerDetails.name;
        planName = (subscription.items.data[0]?.price?.product as Stripe.Product)?.name || "subscription";
        shouldSendEmail = true;
        
        result = { success: true, subscription, message: "Subscription will cancel at period end" };
        break;
      }

      case "cancel_immediately": {
        // Cancel subscription immediately
        logStep("Canceling subscription immediately", { subscriptionId });
        
        // Get customer details before canceling
        const subBeforeCancel = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items.data.price.product"],
        });
        const customerDetails = await getCustomerDetails(subBeforeCancel.customer as string);
        customerEmail = customerDetails.email;
        providerName = customerDetails.name;
        planName = (subBeforeCancel.items.data[0]?.price?.product as Stripe.Product)?.name || "subscription";
        
        const subscription = await stripe.subscriptions.cancel(subscriptionId, {
          prorate: true,
        });
        
        shouldSendEmail = true;
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
        
        const customerDetails = await getCustomerDetails(subscription.customer as string);
        customerEmail = customerDetails.email;
        providerName = customerDetails.name;
        planName = (subscription.items.data[0]?.price?.product as Stripe.Product)?.name || "subscription";
        shouldSendEmail = true;
        
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
        
        const customerDetails = await getCustomerDetails(subscription.customer as string);
        customerEmail = customerDetails.email;
        providerName = customerDetails.name;
        planName = (subscription.items.data[0]?.price?.product as Stripe.Product)?.name || "subscription";
        shouldSendEmail = true;
        
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
        
        const customerDetails = await getCustomerDetails(subscription.customer as string);
        customerEmail = customerDetails.email;
        providerName = customerDetails.name;
        planName = (subscription.items.data[0]?.price?.product as Stripe.Product)?.name || "subscription";
        shouldSendEmail = true;
        
        result = { success: true, subscription, message: "Subscription reactivated" };
        break;
      }

      // Promo Code Management
      case "create_coupon": {
        const { name, percent_off, amount_off, currency, duration, duration_in_months, max_redemptions, expires_at } = body;
        logStep("Creating coupon", { name, percent_off, amount_off, expires_at });
        
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
        
        // Create a promotion code for the coupon with optional expiration
        const promoCodeParams: Stripe.PromotionCodeCreateParams = {
          coupon: coupon.id,
          code: name.toUpperCase().replace(/\s+/g, ""),
          metadata: {
            created_by: adminUser.id,
          },
        };

        if (expires_at) {
          promoCodeParams.expires_at = expires_at;
        }

        const promoCode = await stripe.promotionCodes.create(promoCodeParams);

        result = { success: true, coupon, promoCode, message: "Coupon and promo code created" };
        break;
      }

      case "list_coupons": {
        logStep("Listing coupons");
        const coupons = await stripe.coupons.list({ limit: 100 });
        // Get all promo codes (both active and inactive)
        const activePromoCodes = await stripe.promotionCodes.list({ limit: 100, active: true });
        const inactivePromoCodes = await stripe.promotionCodes.list({ limit: 100, active: false });
        
        // Combine and dedupe promo codes
        const allPromoCodes = [...activePromoCodes.data, ...inactivePromoCodes.data];
        const uniquePromoCodes = Array.from(new Map(allPromoCodes.map(pc => [pc.id, pc])).values());
        
        result = { success: true, coupons: coupons.data, promoCodes: uniquePromoCodes };
        break;
      }

      case "delete_coupon": {
        const { couponId } = body;
        logStep("Deleting coupon", { couponId });
        await stripe.coupons.del(couponId);
        result = { success: true, message: "Coupon deleted" };
        break;
      }

      case "deactivate_promo_code": {
        const { promoCodeId } = body;
        logStep("Deactivating promo code", { promoCodeId });
        const promoCode = await stripe.promotionCodes.update(promoCodeId, { active: false });
        result = { success: true, promoCode, message: "Promo code deactivated" };
        break;
      }

      case "get_promo_analytics": {
        logStep("Fetching promo code analytics");
        
        // Get all subscriptions with discounts (expand discount to get promo code details)
        const subscriptionsWithDiscounts = await stripe.subscriptions.list({
          limit: 100,
          expand: ["data.discount.promotion_code", "data.customer"],
        });
        
        // Get all promotion codes with their redemption counts
        const activePromoCodes = await stripe.promotionCodes.list({ limit: 100, active: true });
        const inactivePromoCodes = await stripe.promotionCodes.list({ limit: 100, active: false });
        const allPromoCodes = [...activePromoCodes.data, ...inactivePromoCodes.data];
        
        // Build analytics data - start with promo codes that have redemptions
        const promoUsage: Record<string, { 
          code: string; 
          timesRedeemed: number;
          redemptions: { 
            customerId: string; 
            customerEmail: string; 
            customerName: string;
            redeemedAt: number;
            subscriptionId?: string;
          }[] 
        }> = {};
        
        // Initialize from promo codes with redemption counts
        for (const promo of allPromoCodes) {
          if (promo.times_redeemed > 0) {
            promoUsage[promo.id] = {
              code: promo.code,
              timesRedeemed: promo.times_redeemed,
              redemptions: [],
            };
          }
        }
        
        // Add detailed redemption info from subscriptions
        for (const sub of subscriptionsWithDiscounts.data) {
          if (sub.discount?.promotion_code) {
            const promoCode = sub.discount.promotion_code as Stripe.PromotionCode;
            const customer = sub.customer as Stripe.Customer;
            
            if (!promoUsage[promoCode.id]) {
              promoUsage[promoCode.id] = {
                code: promoCode.code,
                timesRedeemed: 1,
                redemptions: [],
              };
            }
            
            promoUsage[promoCode.id].redemptions.push({
              customerId: customer.id,
              customerEmail: customer.email || "Unknown",
              customerName: customer.name || customer.email || "Unknown",
              redeemedAt: sub.created,
              subscriptionId: sub.id,
            });
          }
        }
        
        // Convert to array and sort by total redemptions
        const analytics = Object.entries(promoUsage).map(([promoCodeId, data]) => ({
          promoCodeId,
          code: data.code,
          totalRedemptions: data.timesRedeemed,
          redemptions: data.redemptions.sort((a, b) => b.redeemedAt - a.redeemedAt),
        })).sort((a, b) => b.totalRedemptions - a.totalRedemptions);
        
        result = { success: true, analytics };
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

    // Send notification email if needed
    if (shouldSendEmail && customerEmail) {
      await sendSubscriptionNotificationEmail(supabaseClient, resend, customerEmail, providerName, action, planName, reason);
    }

    // Log audit entry (only for non-list actions)
    if (action !== "list_coupons") {
      await supabaseClient.from("admin_audit_log").insert({
        admin_user_id: adminUser.id,
        action_type: `subscription_${action}`,
        target_type: PROMO_CODE_ACTIONS.includes(action) ? "promo_code" : "subscription",
        target_id: subscriptionId || customerId || body.couponId || body.promoCodeId || null,
        details: { action, reason, result: result?.message, emailSent: shouldSendEmail && !!customerEmail },
      });
    }

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
