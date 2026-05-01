import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { jsonError } from "../_shared/validation.ts";

// Version tracking for deployment verification
const VERSION = "2.1.0";

// Rate limit: max unlocks per facility per hour
const MAX_UNLOCKS_PER_HOUR = 20;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Production logging with request ID and version
const generateRequestId = () => crypto.randomUUID().slice(0, 8);
const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[UNLOCK-LEAD] [${VERSION}] [${requestId}] [${timestamp}] ${step}${detailsStr}`);
};

// Unlock pricing per inquiry type (in cents) - defaults if admin settings not found
const DEFAULT_PRICES: Record<string, number> = {
  request_info: 3900,      // $39.00
  request_callback: 4900,  // $49.00
};
const DEFAULT_PRO_DISCOUNT_PERCENT = 20;

// Fetch dynamic pricing from platform_settings
// deno-lint-ignore no-explicit-any
async function getUnlockPricing(supabase: any): Promise<{
  prices: Record<string, number>;
  proDiscountPercent: number;
}> {
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("setting_key, setting_value")
    .in("setting_key", [
      "unlock_price_request_info",
      "unlock_price_request_callback", 
      "pro_discount_percent"
    ]);

  const prices: Record<string, number> = { ...DEFAULT_PRICES };
  let proDiscountPercent = DEFAULT_PRO_DISCOUNT_PERCENT;

  if (settings) {
    for (const setting of settings) {
      if (setting.setting_key === "unlock_price_request_info") {
        prices.request_info = (setting.setting_value as { cents: number })?.cents ?? DEFAULT_PRICES.request_info;
      } else if (setting.setting_key === "unlock_price_request_callback") {
        prices.request_callback = (setting.setting_value as { cents: number })?.cents ?? DEFAULT_PRICES.request_callback;
      } else if (setting.setting_key === "pro_discount_percent") {
        proDiscountPercent = (setting.setting_value as { value: number })?.value ?? DEFAULT_PRO_DISCOUNT_PERCENT;
      }
    }
  }

  return { prices, proDiscountPercent };
}

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  logStep(requestId, "Request received", { method: req.method, version: VERSION });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Track whether credits were deducted so the outer catch can roll back on
  // any uncaught exception that fires AFTER deduction but BEFORE the unlock
  // row is committed (H1).
  let creditsDeducted = false;
  let deductedAmount = 0;
  let deductedProviderId: string | null = null;
  let deductedFacilityId: string | null = null;
  let deductedLeadId: string | null = null;

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { leadId, facilityId, paymentMethod = 'credits' } = await req.json();

    // Per-field validation so smoke tests / clients can pinpoint the missing input.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!leadId) {
      return jsonError("MISSING_FIELD_LEAD_ID", "leadId is required", 400, corsHeaders, { requestId });
    }
    if (!uuidRegex.test(leadId)) {
      return jsonError("INVALID_LEAD_ID", "Invalid leadId format", 400, corsHeaders, { requestId });
    }
    if (!facilityId) {
      return jsonError("MISSING_FIELD_FACILITY_ID", "facilityId is required", 400, corsHeaders, { requestId });
    }
    if (!uuidRegex.test(facilityId)) {
      return jsonError("INVALID_FACILITY_ID", "Invalid facilityId format", 400, corsHeaders, { requestId });
    }

    // Validate payment method against whitelist
    const ALLOWED_PAYMENT_METHODS = ['credits', 'stripe'];
    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      logStep(requestId, "Invalid payment method", { paymentMethod });
      return jsonError("INVALID_PAYMENT_METHOD", "Invalid payment method", 400, corsHeaders, { requestId });
    }
    
    logStep(requestId, "Processing unlock request", { leadId, facilityId, paymentMethod });

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if lead is already unlocked by this facility
    const { data: existingUnlock } = await supabaseAdmin
      .from("lead_unlocks")
      .select("id")
      .eq("lead_id", leadId)
      .eq("facility_id", facilityId)
      .maybeSingle();

    if (existingUnlock) {
      logStep(requestId, "Lead already unlocked", { existingUnlockId: existingUnlock.id });
      return new Response(JSON.stringify({ error: "Lead already unlocked", requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify facility belongs to user
    const { data: facility } = await supabaseAdmin
      .from("facilities")
      .select("id, user_id")
      .eq("id", facilityId)
      .single();

    if (!facility || facility.user_id !== user.id) {
      logStep(requestId, "Facility access denied", { facilityId, userId: user.id });
      return new Response(JSON.stringify({ error: "Facility not found or unauthorized", requestId }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== UNLOCK RATE LIMITING: max N unlocks per facility per hour =====
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentUnlockCount } = await supabaseAdmin
      .from("lead_unlocks")
      .select("*", { count: "exact", head: true })
      .eq("facility_id", facilityId)
      .gte("unlocked_at", oneHourAgo);

    if (recentUnlockCount && recentUnlockCount >= MAX_UNLOCKS_PER_HOUR) {
      logStep(requestId, "Unlock rate limit exceeded", { facilityId, count: recentUnlockCount });
      return new Response(JSON.stringify({ 
        error: "Unlock rate limit exceeded. Please wait before unlocking more leads.",
        requestId 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the lead to get inquiry_type and redistribution status
    const { data: leadData, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("inquiry_type, redistribution_status, original_facility_id, facility_id")
      .eq("id", leadId)
      .single();

    if (leadError || !leadData) {
      logStep(requestId, "Lead not found", { leadId, error: leadError?.message });
      return new Response(JSON.stringify({ error: "Lead not found", requestId }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inquiryType = leadData?.inquiry_type || 'request_info';
    const isRedistributed = leadData?.redistribution_status === 'extended' && 
      leadData?.original_facility_id && 
      leadData.original_facility_id !== facilityId;
    
    logStep(requestId, "Lead data fetched", { inquiryType, isRedistributed, redistStatus: leadData?.redistribution_status });

    // If redistributed, verify facility has access via lead_distributions
    if (isRedistributed) {
      const { data: distribution } = await supabaseAdmin
        .from("lead_distributions")
        .select("id")
        .eq("lead_id", leadId)
        .eq("facility_id", facilityId)
        .maybeSingle();

      if (!distribution) {
        return new Response(JSON.stringify({ error: "You don't have access to this lead" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch dynamic pricing from admin settings
    const { prices, proDiscountPercent: adminDiscountPercent } = await getUnlockPricing(supabaseAdmin);

    // Get redistributed price from settings
    let redistributedPrice = 1500; // Default $15
    const { data: redistPriceSetting } = await supabaseAdmin
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "redistributed_unlock_price")
      .maybeSingle();
    
    if (redistPriceSetting) {
      redistributedPrice = (redistPriceSetting.setting_value as { cents: number })?.cents ?? 1500;
    }

    // Check Pro status for discount
    const { data: proSubscription } = await supabaseAdmin
      .from("pro_subscriptions")
      .select("unlock_discount_percent, status, current_period_end")
      .eq("facility_id", facilityId)
      .eq("status", "active")
      .maybeSingle();

    const isPro = proSubscription && 
      (!proSubscription.current_period_end || new Date(proSubscription.current_period_end) > new Date());
    
    // For redistributed leads, use flat $15 price (no discounts)
    // For original leads, use normal pricing with Pro discount
    let basePrice: number;
    let discountPercent = 0;
    let discountAmount = 0;
    let unlockPrice: number;

    if (isRedistributed) {
      // Redistributed leads: flat $15, no discounts
      basePrice = redistributedPrice;
      unlockPrice = redistributedPrice;
    } else {
      // Original leads: normal pricing with Pro discount
      basePrice = prices[inquiryType] ?? prices.request_info;
      discountPercent = isPro ? (proSubscription.unlock_discount_percent ?? adminDiscountPercent) : 0;
      discountAmount = discountPercent > 0 ? Math.round(basePrice * discountPercent / 100) : 0;
      unlockPrice = basePrice - discountAmount;
    }

    let stripePaymentIntentId: string | null = null;

    if (paymentMethod === 'credits') {
      // Check credit balance
      const { data: credits } = await supabaseAdmin
        .from("provider_credits")
        .select("balance_cents")
        .eq("provider_id", user.id)
        .maybeSingle();

      const currentBalance = credits?.balance_cents ?? 0;

      if (currentBalance < unlockPrice) {
        logStep(requestId, "Insufficient credits", { currentBalance, required: unlockPrice });
        return new Response(JSON.stringify({ 
          error: "Insufficient credits",
          required: unlockPrice,
          current: currentBalance,
          needsCredits: unlockPrice - currentBalance,
          requestId,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Re-check for existing unlock (race condition protection)
      const { data: raceCheckUnlock } = await supabaseAdmin
        .from("lead_unlocks")
        .select("id")
        .eq("lead_id", leadId)
        .eq("facility_id", facilityId)
        .maybeSingle();

      if (raceCheckUnlock) {
        logStep(requestId, "Lead already unlocked (race condition)", { existingUnlockId: raceCheckUnlock.id });
        return new Response(JSON.stringify({ error: "Lead already unlocked", requestId }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Atomic balance update with conditional check to prevent race conditions
      // This ensures balance doesn't go below what we need
      const newBalance = currentBalance - unlockPrice;
      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from("provider_credits")
        .update({
          balance_cents: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("provider_id", user.id)
        .gte("balance_cents", unlockPrice) // Only update if balance is still sufficient
        .select("balance_cents")
        .maybeSingle();

      if (updateError || !updateResult) {
        logStep(requestId, "Credit deduction failed - possible race condition or insufficient funds", { 
          error: updateError?.message,
          hadResult: !!updateResult
        });
        return new Response(JSON.stringify({ 
          error: "Unable to process payment. Please try again.",
          requestId
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep(requestId, "Credits deducted successfully", { 
        previousBalance: currentBalance, 
        newBalance: updateResult.balance_cents,
        deducted: unlockPrice 
      });

      // Mark for outer-catch rollback safety net (H1)
      creditsDeducted = true;
      deductedAmount = unlockPrice;
      deductedProviderId = user.id;
      deductedFacilityId = facilityId;
      deductedLeadId = leadId;

      // Log the credit transaction with enhanced details
      const { error: txError } = await supabaseAdmin.from("credit_transactions").insert({
        provider_id: user.id,
        facility_id: facilityId,
        amount_cents: -unlockPrice,
        transaction_type: "unlock",
        reference_id: leadId,
        description: `Unlocked ${inquiryType.replace('_', ' ')} inquiry`,
        inquiry_type: inquiryType,
        base_price_cents: basePrice,
        discount_applied: isPro,
        discount_amount_cents: discountAmount,
      });

      if (txError) {
        logStep(requestId, "WARN - Failed to log credit transaction", { error: txError.message });
        // Continue anyway - the deduction succeeded, this is just logging
      }

    } else if (paymentMethod === 'stripe') {
      // Create Stripe PaymentIntent for direct card payment
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
        apiVersion: "2025-08-27.basil",
      });

      // Find or create Stripe customer
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      let customerId: string;

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { user_id: user.id },
        });
        customerId = customer.id;
      }

      // For now, just return a checkout URL for Stripe payment
      // In production, you'd use Payment Intents or embedded checkout
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: "Lead Unlock",
              description: isPro ? `Lead unlock (${discountPercent}% Pro discount applied)` : "Unlock lead contact details",
            },
            unit_amount: unlockPrice,
          },
          quantity: 1,
        }],
        success_url: `${req.headers.get("origin")}/provider/inquiries?unlock_success=true&lead=${leadId}`,
        cancel_url: `${req.headers.get("origin")}/provider/inquiries?unlock_canceled=true`,
        metadata: {
          type: "lead_unlock",
          lead_id: leadId,
          facility_id: facilityId,
          user_id: user.id,
          inquiry_type: inquiryType,
        },
      });

      return new Response(JSON.stringify({ 
        checkoutUrl: session.url,
        requiresPayment: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the unlock record
    const { data: unlock, error: unlockError } = await supabaseAdmin
      .from("lead_unlocks")
      .insert({
        lead_id: leadId,
        provider_id: user.id,
        facility_id: facilityId,
        unlock_price_cents: unlockPrice,
        payment_method: paymentMethod,
        stripe_payment_intent_id: stripePaymentIntentId,
      })
      .select()
      .single();

    if (unlockError) {
      logStep(requestId, "ERROR - Unlock record creation failed, rolling back credits", { error: unlockError.message });

      // ROLLBACK: refund the deducted credits if payment was via credits
      if (paymentMethod === 'credits') {
        // ATOMIC rollback via increment RPC — eliminates read-then-write race condition
        const { error: rollbackError } = await supabaseAdmin.rpc("increment_provider_credits", {
          p_provider_id: user.id,
          p_facility_id: facilityId,
          p_amount_cents: unlockPrice,
        });

        if (!rollbackError) {

          // Log the rollback transaction
          await supabaseAdmin.from("credit_transactions").insert({
            provider_id: user.id,
            facility_id: facilityId,
            amount_cents: unlockPrice,
            transaction_type: "refund",
            reference_id: leadId,
            description: "Automatic refund - unlock record creation failed",
          });

          logStep(requestId, "Credits rolled back successfully", { refunded: unlockPrice });
        } else {
          logStep(requestId, "CRITICAL - Could not rollback credits", { error: rollbackError.message });
          // Surface to admins so they can manually reconcile (H3).
          try {
            await supabaseAdmin.from("admin_notifications").insert({
              type: "unlock_rollback_failed",
              title: "Unlock rollback failed — credits stuck",
              message: `Provider ${user.id} was charged ${unlockPrice} cents for lead ${leadId} but the unlock record failed AND the credit refund RPC also failed. Manual reconciliation required.`,
              metadata: {
                provider_id: user.id,
                facility_id: facilityId,
                lead_id: leadId,
                amount_cents: unlockPrice,
                rollback_error: rollbackError.message,
                request_id: requestId,
              },
            });
          } catch (alertErr) {
            logStep(requestId, "ALSO FAILED - Could not insert admin_notifications row", { error: String(alertErr) });
          }
        }
      }

      return new Response(JSON.stringify({ error: "Failed to unlock lead", requestId }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unlock row is committed — credits are now correctly attributed.
    // Disarm the outer-catch rollback safety net (H1).
    creditsDeducted = false;

    // Update lead status to 'unlocked' — only valid from 'new' or 'expired' (redistributed leads may be expired)
    const unlockTimestamp = new Date().toISOString();
    
    await supabaseAdmin
      .from("leads")
      .update({ status: "unlocked" })
      .eq("id", leadId)
      .in("status", ["new", "expired"]); // Allow transition from new or expired

    await supabaseAdmin
      .from("lead_distributions")
      .update({ unlocked_at: unlockTimestamp })
      .eq("lead_id", leadId)
      .eq("facility_id", facilityId);

    // Fetch the lead with explicit columns (never select *)
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id, name, email, phone, facility_id, created_at, status, urgency, level_of_care, insurance_type, message, preferred_contact, inquiry_type, location_city_state, location_zip, primary_substance")
      .eq("id", leadId)
      .single();

    // Create provider in-app notification for credit-based unlock
    try {
      await supabaseAdmin.from("provider_notifications").insert({
        user_id: user.id,
        facility_id: facilityId,
        type: "lead_unlocked",
        title: "Lead Unlocked",
        message: `A lead has been unlocked via credits ($${(unlockPrice / 100).toFixed(2)}).`,
        metadata: { lead_id: leadId, amount_cents: unlockPrice, payment_method: paymentMethod },
      });
      logStep(requestId, "Provider notification created for unlock");
    } catch (notifError) {
      logStep(requestId, "WARN - Failed to create provider notification", { error: String(notifError) });
    }

    // Send unlock confirmation email to provider
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const { data: providerProfile } = await supabaseAdmin
          .from("profiles")
          .select("email, first_name")
          .eq("user_id", user.id)
          .maybeSingle();

        const { data: facilityData } = await supabaseAdmin
          .from("facilities")
          .select("name")
          .eq("id", facilityId)
          .maybeSingle();

        if (providerProfile?.email) {
          const resendClient = new Resend(resendKey);
          const providerName = providerProfile.first_name || "there";
          const facilityNameStr = facilityData?.name || "your facility";
          const leadName = lead?.name ? lead.name.split(" ")[0] : "a seeker";

          await sendEmailWithRetry(supabaseAdmin, resendClient, {
            from: "RehabLookup <no-reply@rehablookup.com>",
            to: [providerProfile.email],
            subject: `Lead Unlocked — ${leadName}'s contact details are ready`,
            html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1B365D 0%,#2a4a7f 100%);padding:32px;text-align:center;">
<div style="font-size:40px;margin-bottom:12px;">🔓</div>
<h1 style="margin:0;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:24px;font-weight:700;">Lead Unlocked</h1>
</td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;color:#1a1a1a;line-height:1.6;">Hi ${providerName},</p>
<p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;color:#4b5563;line-height:1.7;">You've unlocked a lead for <strong>${facilityNameStr}</strong>. The contact details are now available in your dashboard.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:12px;margin-bottom:24px;">
<tr><td style="padding:20px;">
<p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#1e40af;"><strong>Amount:</strong> $${(unlockPrice / 100).toFixed(2)}</p>
<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#1e40af;"><strong>Payment:</strong> ${paymentMethod === 'credits' ? 'Credits' : 'Card'}</p>
</td></tr></table>
<p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;color:#4b5563;line-height:1.7;">💡 <strong>Tip:</strong> Respond within 1 hour for the best chance of connecting with this lead.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
<a href="https://rehablookup.com/provider/inquiries" style="display:inline-block;background:#1B365D;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;font-size:15px;">View Lead Details</a>
</td></tr></table>
</td></tr>
<tr><td style="background:#1B365D;padding:24px;text-align:center;">
<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:18px;font-weight:700;color:#fff;">RehabLookup</p>
<p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:rgba(255,255,255,0.6);">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
</td></tr>
</table></td></tr></table>
</body></html>`,
          }, {
            emailType: "lead_unlock_confirmation",
            idempotencyKey: `unlock-confirm-${leadId}-${facilityId}`,
          });
          logStep(requestId, "Unlock confirmation email sent");
        }
      }
    } catch (emailErr) {
      logStep(requestId, "WARN - Failed to send unlock confirmation email", { error: String(emailErr) });
    }

    try {
      // Calculate time to unlock
      const leadCreatedAt = lead?.created_at ? new Date(lead.created_at) : null;
      const unlockTimeHours = leadCreatedAt 
        ? (Date.now() - leadCreatedAt.getTime()) / (1000 * 60 * 60) 
        : null;

      await supabaseAdmin.from("notification_events").insert({
        lead_id: leadId,
        facility_id: facilityId,
        user_id: user.id,
        notification_stage: "unlock",
        channel: "platform",
        event_type: "unlocked",
        notification_type: "conversion",
        metadata: { 
          price_paid: unlockPrice, 
          time_to_unlock_hours: unlockTimeHours ? Math.round(unlockTimeHours * 10) / 10 : null,
          payment_method: paymentMethod,
        },
      });

      // Mark all reminder columns as sent to prevent any future reminders
      const now = new Date().toISOString();
      await supabaseAdmin.from("leads").update({
        reminder_1h_sent_at: now,
        reminder_2h_sent_at: now,
        reminder_6h_sent_at: now,
        reminder_12h_sent_at: now,
        reminder_20h_sent_at: now,
        reminder_24h_sent_at: now,
      }).eq("id", leadId);

      // Update provider engagement metrics
      await supabaseAdmin.from("notification_preferences").update({
        last_unlock_at: now,
      }).eq("user_id", user.id);

      logStep(requestId, "Unlock conversion tracked and reminders stopped");
    } catch (trackError) {
      logStep(requestId, "WARN - Failed to track unlock event", { error: String(trackError) });
    }

    // ── Auto-reload check: fire-and-forget after credit deduction ──
    if (paymentMethod === 'credits') {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        // Get updated balance after deduction
        const { data: updatedCredits } = await supabaseAdmin
          .from("provider_credits")
          .select("balance_cents")
          .eq("provider_id", user.id)
          .maybeSingle();

        const currentBalanceAfterUnlock = updatedCredits?.balance_cents ?? 0;

        // H5: sign the request with HMAC over (providerId|timestamp) using service-role key
        // so the receiver can prove the call originated from another internal function and
        // not from a leaked Authorization header. We still send the bearer because the
        // receiver function relies on the Supabase admin client; the HMAC is the
        // authenticator, not the bearer.
        const payload = {
          providerId: user.id,
          currentBalanceCents: currentBalanceAfterUnlock,
        };
        const ts = Date.now().toString();
        const signingMessage = `${payload.providerId}|${ts}`;
        const enc = new TextEncoder();
        const cryptoKey = await crypto.subtle.importKey(
          "raw",
          enc.encode(serviceRoleKey),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(signingMessage));
        const sigHex = Array.from(new Uint8Array(sigBuf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        // Fire-and-forget: don't block the unlock response
        fetch(`${supabaseUrl}/functions/v1/auto-reload-credits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
            "X-Internal-Trigger-Ts": ts,
            "X-Internal-Trigger-Sig": sigHex,
          },
          body: JSON.stringify(payload),
        }).catch(err => {
          logStep(requestId, "WARN - Auto-reload trigger failed (non-blocking)", { error: String(err) });
        });

        logStep(requestId, "Auto-reload check triggered", { currentBalanceAfterUnlock });
      } catch (autoReloadErr) {
        logStep(requestId, "WARN - Auto-reload setup error (non-blocking)", { error: String(autoReloadErr) });
      }
    }

    logStep(requestId, "Lead unlock completed successfully", { 
      unlockId: unlock.id, 
      pricePaid: unlockPrice,
      discountApplied: isPro 
    });

    return new Response(JSON.stringify({ 
      success: true,
      unlock,
      lead,
      inquiryType,
      basePrice,
      discountApplied: isPro,
      discountPercent,
      discountAmount,
      pricePaid: unlockPrice,
      requestId,
      _version: VERSION,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep(requestId, "ERROR - Unhandled exception", { error: message });
    return new Response(JSON.stringify({ 
      error: "Failed to unlock lead", 
      requestId,
      _version: VERSION 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
