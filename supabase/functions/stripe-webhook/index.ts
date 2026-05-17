import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { cancelSubscriptionAndRefund } from "../_shared/cancel-subscription.ts";
import {
  activateProBenefits,
  deactivateProBenefits,
  notifyProBenefitsPartialFailure,
} from "../_shared/pro-benefits.ts";
import {
  activateFeaturedAddon,
  deactivateFeaturedAddon,
  notifyFeaturedAddonPartialFailure,
} from "../_shared/featured-addon.ts";

// Version tracking for deployment verification
const VERSION = "1.2.0";
const DEPLOYED_AT = "2026-05-16T00:00:00Z";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Production logging with version
const generateRequestId = () => crypto.randomUUID().slice(0, 8);
const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] [${VERSION}] [${timestamp}] ${step}${detailsStr}`);
};

// Legacy product IDs that map to Pro tier
const PRO_PRODUCT_IDS = [
  "prod_TbalLOPujTIoUe", // legacy professional
  "prod_Tbyz1bf6iYyzYd", // professional
  "prod_TbalOeJZA2ZoJl", // legacy featured
  "prod_TbyzJVNOQL71NN", // featured
];

// New flat-fee monetization lookup keys (created by
// scripts/stripe-setup-monetization.ts). Six keys = three SKUs × two
// billing intervals. The webhook resolves both billing_period and the
// tier/addon flags from the lookup_key + price.recurring.interval.
const LOOKUP_KEYS = {
  PRO_MONTHLY: "rl_pro_monthly_v1",
  PRO_ANNUAL: "rl_pro_annual_v1",
  FEATURED_MONTHLY: "rl_featured_monthly_v1",
  FEATURED_ANNUAL: "rl_featured_annual_v1",
  CONCIERGE_MONTHLY: "rl_concierge_monthly_v1",
  CONCIERGE_ANNUAL: "rl_concierge_annual_v1",
} as const;

const PRO_KEYS = [LOOKUP_KEYS.PRO_MONTHLY, LOOKUP_KEYS.PRO_ANNUAL] as const;
const FEATURED_KEYS = [LOOKUP_KEYS.FEATURED_MONTHLY, LOOKUP_KEYS.FEATURED_ANNUAL] as const;
const CONCIERGE_KEYS = [LOOKUP_KEYS.CONCIERGE_MONTHLY, LOOKUP_KEYS.CONCIERGE_ANNUAL] as const;

// Per-tier full monthly rates in cents. Used both to compute the
// monthly_equivalent for cancellation math AND, on annual subscriptions,
// to reconstruct original_annual_cents + discount_applied_cents.
const FULL_MONTHLY_CENTS = {
  pro: 9900,        // $99
  featured: 59900,  // $599
  concierge: 100000, // $1,000
} as const;

/**
 * Inspect a Stripe subscription's items and return:
 *   - tier:                "pro" if any item matches a Pro lookup key
 *   - has_featured:        true if any item matches a Featured key
 *   - has_concierge_partner: true if any item matches a Concierge key
 *   - billing_period:      "monthly" | "annual" — inferred from the FIRST
 *                          matched item's recurring.interval. All items
 *                          on the same subscription share one interval
 *                          (Stripe requires this for a single subscription).
 *   - paid_amount_cents:   sum of unit_amount × quantity across all items
 *                          (= what Stripe just charged this period)
 *   - original_annual_cents: for annual subscriptions, the un-discounted
 *                            yearly sticker (full_monthly × 12 × pieces).
 *                            null for monthly.
 *   - discount_applied_cents: for annual, original − paid (≈15%). 0 for monthly.
 * Falls through to {tier:null, matched_new_lookup_keys:false} if no new
 * lookup keys are present (legacy subscriptions still flow through the
 * older code path that follows in checkout.session.completed).
 */
function deriveTierFlagsFromSubscription(sub: Stripe.Subscription) {
  let isPro = false;
  let hasFeatured = false;
  let hasConcierge = false;
  let paidAmountCents = 0;
  let interval: "month" | "year" | null = null;
  for (const item of sub.items.data) {
    const lookupKey = item.price.lookup_key as string | null;
    const itemInterval = item.price.recurring?.interval as "month" | "year" | undefined;
    if (lookupKey && (PRO_KEYS as readonly string[]).includes(lookupKey)) isPro = true;
    if (lookupKey && (FEATURED_KEYS as readonly string[]).includes(lookupKey)) hasFeatured = true;
    if (lookupKey && (CONCIERGE_KEYS as readonly string[]).includes(lookupKey)) hasConcierge = true;
    if (
      lookupKey &&
      itemInterval &&
      interval === null &&
      (
        (PRO_KEYS as readonly string[]).includes(lookupKey) ||
        (FEATURED_KEYS as readonly string[]).includes(lookupKey) ||
        (CONCIERGE_KEYS as readonly string[]).includes(lookupKey)
      )
    ) {
      interval = itemInterval;
    }
    paidAmountCents += (item.price.unit_amount ?? 0) * (item.quantity ?? 1);
  }
  const billingPeriod: "monthly" | "annual" | null =
    interval === "month" ? "monthly" : interval === "year" ? "annual" : null;

  // Reconstruct the sticker price + discount for annual subscribers.
  // For monthly, original = null and discount = 0 (no annual sticker).
  let originalAnnualCents: number | null = null;
  let discountAppliedCents = 0;
  if (billingPeriod === "annual" && (isPro || hasFeatured || hasConcierge)) {
    originalAnnualCents =
      (isPro ? FULL_MONTHLY_CENTS.pro * 12 : 0) +
      (hasFeatured ? FULL_MONTHLY_CENTS.featured * 12 : 0) +
      (hasConcierge ? FULL_MONTHLY_CENTS.concierge * 12 : 0);
    discountAppliedCents = Math.max(0, originalAnnualCents - paidAmountCents);
  }

  return {
    tier: isPro ? "pro" : null,
    has_featured: hasFeatured,
    has_concierge_partner: hasConcierge,
    billing_period: billingPeriod,
    paid_amount_cents: paidAmountCents,
    original_annual_cents: originalAnnualCents,
    discount_applied_cents: discountAppliedCents,
    matched_new_lookup_keys: isPro || hasFeatured || hasConcierge,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;
    
    // Verify webhook signature if secret is configured (production)
    const signature = req.headers.get("stripe-signature");
    
    // SECURITY: Always require webhook signature verification
    if (!webhookSecret) {
      logStep("CRITICAL - STRIPE_WEBHOOK_SECRET not configured, rejecting request");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!signature) {
      logStep("Rejected - Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Event verified with signature", { type: event.type, id: event.id });
    } catch (signatureError) {
      logStep("Webhook signature verification failed", { error: String(signatureError) });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // GLOBAL EVENT DEDUPLICATION
    // Stripe retries deliver the same evt_xxx multiple times. Even though
    // our financial uniques (credit_transactions, lead_unlocks, pro_subscriptions)
    // already prevent double-spend, retried events still re-run downstream
    // side effects (notifications, emails). Claim the event atomically; if
    // someone else already owns it, ack 200 and exit.
    // ============================================================
    try {
      const { data: claimed, error: claimError } = await supabaseAdmin.rpc(
        "claim_stripe_webhook_event",
        { p_event_id: event.id, p_event_type: event.type }
      );

      if (claimError) {
        logStep("WARN - claim_stripe_webhook_event failed, processing anyway", {
          eventId: event.id,
          error: claimError.message,
        });
        // Surface dedup-claim failures to an admin so silent retries
        // don't accumulate unnoticed. Best-effort insert.
        await supabaseAdmin.from("admin_notifications").insert({
          type: "webhook_dedup_failure",
          title: "Stripe webhook dedup-claim failed",
          message: `claim_stripe_webhook_event errored for ${event.type} (${event.id}). Event was processed but downstream side-effects may run twice on retry.`,
          metadata: {
            stripe_event_id: event.id,
            stripe_event_type: event.type,
            error: claimError.message,
          },
        }).then(({ error: notifyErr }) => {
          if (notifyErr) logStep("WARN - admin_notifications insert failed", { error: notifyErr.message });
        });
      } else if (claimed === false) {
        logStep("Duplicate Stripe event ignored", { eventId: event.id, type: event.type });
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (dedupErr) {
      logStep("WARN - dedup check threw, processing anyway", { error: String(dedupErr) });
    }

    // ==========================================
    // Handle checkout.session.completed
    // Handles: Lead unlocks, Credit purchases, Pro subscriptions, Additional listing slots
    // ==========================================
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadataType = session.metadata?.type;
      const purchaseType = session.metadata?.purchase_type;
      
      logStep("Checkout session completed", { 
        mode: session.mode, 
        type: metadataType,
        purchaseType,
        customerId: session.customer 
      });

      // INTERNATIONAL PLACEMENT PAYMENT
      if (session.mode === "payment" && metadataType === "international_placement") {
        const clientEmail = session.metadata?.client_email || session.customer_email;
        const clientName = session.metadata?.client_name;
        const clientCountry = session.metadata?.client_country;
        const userId = session.metadata?.user_id || null;
        const paymentIntentId = session.payment_intent as string;

        logStep("Processing international placement payment", { 
          sessionId: session.id, 
          email: clientEmail,
          paymentIntentId 
        });

        // Check if payment already processed (idempotency)
        const { data: existingPayment } = await supabaseAdmin
          .from("international_payments")
          .select("id, status")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle();

        if (existingPayment?.status === "succeeded") {
          logStep("Payment already processed, skipping", { paymentId: existingPayment.id });
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Upsert payment record
        const { error: paymentError } = await supabaseAdmin
          .from("international_payments")
          .upsert({
            id: existingPayment?.id,
            user_id: userId || null,
            email: clientEmail || "",
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            amount_cents: 9900,
            currency: "USD",
            status: "succeeded",
            client_name: clientName,
            client_country: clientCountry,
            metadata: {
              stripe_customer_id: session.customer,
              idempotency_key: session.metadata?.idempotency_key,
            },
            updated_at: new Date().toISOString(),
          }, { onConflict: "stripe_checkout_session_id" });

        if (paymentError) {
          logStep("Error updating payment record", { error: paymentError.message });
        } else {
          logStep("International payment recorded successfully");
        }

        // CREATE PENDING CASE RECORD (safety net for abandoned intake forms)
        const { data: existingCase } = await supabaseAdmin
          .from("international_placement_cases")
          .select("id")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle();

        if (!existingCase) {
          const { error: caseError } = await supabaseAdmin
            .from("international_placement_cases")
            .insert({
              client_name: clientName || "Pending Intake",
              client_email: clientEmail || "",
              client_country: clientCountry || "Unknown",
              user_id: userId || null,
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId,
              seeker_fee_amount_cents: 9900,
              seeker_fee_status: "paid",
              status: "pending_intake",
              intake_data: {},
            });

          if (caseError) {
            logStep("Error creating pending case", { error: caseError.message });
          } else {
            logStep("Pending international case created for follow-up");
          }
        }

        // Create admin notification
        await supabaseAdmin.from("admin_notifications").insert({
          type: "international_payment",
          title: "New International Placement Payment",
          message: `${clientName} from ${clientCountry} paid $99 for international placement`,
          metadata: {
            session_id: session.id,
            payment_intent_id: paymentIntentId,
            client_name: clientName,
            client_email: clientEmail,
            client_country: clientCountry,
          },
        });

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // DEPRECATED: Domestic concierge is now FREE. This handler is retained only as a
      // safety net for any legacy in-flight Stripe sessions that may still resolve.
      // No new checkout sessions are created — create-concierge-checkout has been removed.
      if (session.mode === "payment" && session.metadata?.service === "concierge_placement") {
        const email = session.customer_email || "";
        const userId = session.metadata?.user_id || null;
        const checkoutSessionId = session.id;
        const paymentIntentId = session.payment_intent as string;

        logStep("Processing domestic concierge payment", { 
          sessionId: checkoutSessionId, 
          email,
          userId 
        });

        // Check if inquiry already exists — search by checkout_session_id first, then draft_id fallback
        let existingInquiry: { id: string; payment_status: string } | null = null;
        
        const { data: bySession } = await supabaseAdmin
          .from("concierge_inquiries")
          .select("id, payment_status")
          .eq("checkout_session_id", checkoutSessionId)
          .maybeSingle();
        
        existingInquiry = bySession;

        // Fallback: look up by draft_id from Stripe metadata
        if (!existingInquiry && session.metadata?.draft_id) {
          const { data: byDraft } = await supabaseAdmin
            .from("concierge_inquiries")
            .select("id, payment_status")
            .eq("draft_id", session.metadata.draft_id)
            .maybeSingle();
          
          if (byDraft) {
            existingInquiry = byDraft;
            logStep("Found existing inquiry by draft_id fallback", { draftId: session.metadata.draft_id, inquiryId: byDraft.id });
          }
        }

        if (existingInquiry) {
          // Update payment status and link checkout session if not already paid
          const updatePayload: Record<string, unknown> = {
            checkout_session_id: checkoutSessionId,
            stripe_payment_intent_id: paymentIntentId,
            stripe_customer_id: session.customer as string,
            updated_at: new Date().toISOString(),
          };

          if (existingInquiry.payment_status !== "paid" && existingInquiry.payment_status !== "succeeded") {
            updatePayload.payment_status = "paid";
          }

          await supabaseAdmin
            .from("concierge_inquiries")
            .update(updatePayload)
            .eq("id", existingInquiry.id);
          logStep("Updated existing inquiry payment status", { inquiryId: existingInquiry.id });
        } else {
          // Create pending inquiry record (safety net — only if no draft exists at all)
          const { error: inquiryError } = await supabaseAdmin
            .from("concierge_inquiries")
            .insert({
              user_id: userId || null,
              user_name: "Pending Intake",
              user_email: email,
              user_phone: "",
              status: "pending_intake",
              payment_status: "paid",
              payment_amount_cents: 0,
              checkout_session_id: checkoutSessionId,
              stripe_payment_intent_id: paymentIntentId,
              stripe_customer_id: session.customer as string,
              idempotency_key: `intake_${checkoutSessionId}`,
              intake_data: {},
            });

          if (inquiryError) {
            logStep("Error creating pending concierge inquiry", { error: inquiryError.message });
          } else {
            logStep("Pending concierge inquiry created for follow-up");

            // Create admin notification for abandoned payment
            await supabaseAdmin.from("admin_notifications").insert({
              type: "concierge_payment_pending_intake",
              title: "Concierge Payment - Pending Intake",
              message: `Payment received from ${email || "unknown"} but intake form not yet submitted`,
              metadata: {
                session_id: checkoutSessionId,
                payment_intent_id: paymentIntentId,
                email,
                user_id: userId,
              },
            });
          }
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Legacy `additional_listing_slot`, `lead_unlock`, and
      // `credit_purchase` checkout sessions are no longer issued —
      // the monetization rebuild dropped those flows. The handler
      // blocks that processed them were removed; any in-flight legacy
      // event will fall through to the no-op below.

      // PRO_SUBSCRIPTION (annual)
      if (session.mode === "subscription" && metadataType === "pro_subscription") {
        const facilityId = session.metadata?.facility_id;
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (subscriptionId && facilityId && userId) {
          logStep("Activating Pro subscription", { subscriptionId, facilityId });

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

          // Derive new monetization flags from the subscription items.
          // Falls back to legacy price_cents if no new lookup keys
          // matched (older subscriptions still flow through here).
          const flagsCheckout = deriveTierFlagsFromSubscription(subscription);
          const monthlyEquivalentCents = flagsCheckout.matched_new_lookup_keys
            ? (FULL_MONTHLY_CENTS.pro +
                (flagsCheckout.has_featured ? FULL_MONTHLY_CENTS.featured : 0) +
                (flagsCheckout.has_concierge_partner ? FULL_MONTHLY_CENTS.concierge : 0))
            : 39900;
          // Annual subscriptions track period_start AND current_monthly_period_start
          // (the helpers that read monthly elapsed time look at the latter first,
          // falling back to period_start for annual). For monthly, both point at the
          // current 30-day window's start; for annual they stay aligned.
          const periodStartISO = new Date(subscription.current_period_start * 1000).toISOString();

          const { error: proError } = await supabaseAdmin
            .from("facility_subscriptions")
            .upsert({
              provider_id: userId,
              facility_id: facilityId,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              status: "active",
              unlock_discount_percent: 20,
              price_cents: monthlyEquivalentCents,
              tier: "pro",
              has_featured: flagsCheckout.has_featured,
              has_concierge_partner: flagsCheckout.has_concierge_partner,
              billing_period: flagsCheckout.billing_period ?? "annual",
              paid_amount_cents: flagsCheckout.matched_new_lookup_keys
                ? flagsCheckout.paid_amount_cents
                : null,
              original_annual_cents: flagsCheckout.original_annual_cents,
              discount_applied_cents: flagsCheckout.discount_applied_cents,
              period_start: periodStartISO,
              current_monthly_period_start: periodStartISO,
              started_at: new Date().toISOString(),
              current_period_end: currentPeriodEnd,
              updated_at: new Date().toISOString(),
            }, { onConflict: "facility_id" });

          if (proError) {
            logStep("Error creating pro_subscription", { error: proError.message });
          } else {
            logStep("Pro subscription activated", { facilityId, currentPeriodEnd });

            // Activate Pro benefits across every facility the provider
            // owns. The shared helper guards on `featured === true` so
            // a webhook retry doesn't double-apply the +50 ranking
            // boost. profiles.plan mirror is part of the helper.
            const proResult = await activateProBenefits(supabaseAdmin, userId);
            logStep("Pro benefits activation result (checkout.session.completed)", {
              updated: proResult.facilitiesUpdated.length,
              already: proResult.alreadyActive.length,
              failed: proResult.failed.length,
            });
            await notifyProBenefitsPartialFailure(supabaseAdmin, {
              userId,
              eventType: "checkout.session.completed",
              result: proResult,
              stripeEventId: event.id,
            });

            await supabaseAdmin.from("provider_notifications").insert({
              user_id: userId,
              facility_id: facilityId,
              type: "subscription_active",
              title: "Pro Subscription Activated!",
              message: "You now have 20% off all lead unlocks, featured placement, priority search ranking, and can list up to 5 facilities.",
              metadata: { subscription_id: subscriptionId },
            });
          }
        }
        
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ==========================================
    // Handle customer.subscription.updated
    // Keeps current_period_end and status in sync on renewals/changes
    // ==========================================
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Subscription updated", { 
        subscriptionId: subscription.id, 
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });

      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      const mappedStatus = subscription.status === "active" ? "active"
        : subscription.status === "past_due" ? "past_due"
        : subscription.status === "canceled" ? "canceled"
        : subscription.status;

      // Detect mid-period add-on removal by comparing DB-stored add-on flags
      // with the current subscription items. If Featured/Concierge were active
      // and the lookup key is no longer present in the items, the provider
      // dropped that add-on — refund + deactivate dependent rows via the
      // shared cancel module. cancelSubscriptionAndRefund handles flag
      // persistence + audit row + Stripe refund, so we skip the manual
      // flag-update below for the affected add-on.
      const { data: priorSubRow } = await supabaseAdmin
        .from("facility_subscriptions")
        .select("id, has_featured, has_concierge_partner")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();
      const currentFlags = deriveTierFlagsFromSubscription(subscription);
      const droppedFeatured = priorSubRow?.has_featured === true && !currentFlags.has_featured;
      const droppedConcierge = priorSubRow?.has_concierge_partner === true && !currentFlags.has_concierge_partner;
      if (priorSubRow && (droppedFeatured || droppedConcierge)) {
        try {
          if (droppedFeatured) {
            const r = await cancelSubscriptionAndRefund(priorSubRow.id, {
              scope: "addon-featured",
              reason: "stripe webhook: featured item removed from subscription",
            });
            logStep("Featured add-on refunded on item removal", { refundCents: r.featuredRefundCents, refundIds: r.stripeRefundIds });
          }
          if (droppedConcierge) {
            const r = await cancelSubscriptionAndRefund(priorSubRow.id, {
              scope: "addon-concierge",
              reason: "stripe webhook: concierge item removed from subscription",
            });
            logStep("Concierge add-on refunded on item removal", { refundCents: r.conciergeRefundCents, refundIds: r.stripeRefundIds });
          }
        } catch (addonErr) {
          logStep("ERROR refunding removed add-on", { error: String(addonErr) });
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from("facility_subscriptions")
        .update({
          status: mappedStatus,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: subscription.cancel_at_period_end ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      if (updateError) {
        logStep("Error updating subscription", { error: updateError.message });
      } else {
        logStep("Subscription updated successfully", { status: mappedStatus, currentPeriodEnd, cancelAtPeriodEnd: subscription.cancel_at_period_end });

        // Fetch the pro_subscription record for all status-change handling below
        const { data: proSub } = await supabaseAdmin
          .from("facility_subscriptions")
          .select("provider_id, facility_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        // BUGFIX: Restore Pro benefits when a past_due subscription is paid and returns to active.
        // Previously, benefits were only applied at checkout.session.completed and never re-applied
        // on recovery from past_due, leaving providers without featured/ranking boost after recovery.
        const previousStatus = (event.data.previous_attributes as Record<string, unknown>)?.status as string | undefined;
        if (mappedStatus === "active" && previousStatus === "past_due" && proSub) {
          logStep("Subscription recovered from past_due — restoring Pro benefits", { facilityId: proSub.facility_id });
          const { data: allFacilities } = await supabaseAdmin
            .from("facilities")
            .select("id, calculated_ranking_score, featured")
            .eq("user_id", proSub.provider_id);
          if (allFacilities) {
            for (const f of allFacilities) {
              // Only add the +50 boost if it wasn't already applied (featured=true means boost is active)
              const alreadyBoosted = f.featured === true;
              const currentScore = f.calculated_ranking_score ?? 0;
              await supabaseAdmin
                .from("facilities")
                .update({
                  featured: true,
                  calculated_ranking_score: alreadyBoosted ? currentScore : currentScore + 50,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", f.id);
            }
            logStep("Pro benefits restored on all provider facilities", { count: allFacilities.length });
          }
          await supabaseAdmin.from("provider_notifications").insert({
            user_id: proSub.provider_id,
            facility_id: proSub.facility_id,
            type: "subscription_recovered",
            title: "Pro Subscription Restored",
            message: "Your payment was received and your Pro benefits have been fully restored — featured placement, ranking boost, and lead discounts are all active again.",
            metadata: { subscription_id: subscription.id },
          });
          logStep("Recovery notification sent to provider");
        }

        // Notify provider on status transitions (past_due, cancel_at_period_end)
        if ((mappedStatus === "past_due" || subscription.cancel_at_period_end) && proSub) {
            if (mappedStatus === "past_due") {
              await supabaseAdmin.from("provider_notifications").insert({
                user_id: proSub.provider_id,
                facility_id: proSub.facility_id,
                type: "subscription_past_due",
                title: "Subscription Payment Past Due",
                message: "Your Pro subscription payment is past due. Please update your payment method to avoid losing Pro benefits.",
                metadata: { subscription_id: subscription.id, status: "past_due" },
              });
              logStep("Past-due notification sent to provider");
            }

            if (subscription.cancel_at_period_end) {
              const endDate = new Date(subscription.current_period_end * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
              await supabaseAdmin.from("provider_notifications").insert({
                user_id: proSub.provider_id,
                facility_id: proSub.facility_id,
                type: "subscription_pending_cancel",
                title: "Pro Cancellation Scheduled",
                message: `Your Pro subscription will end on ${endDate}. You'll retain Pro benefits until then. You can resubscribe anytime.`,
                metadata: { subscription_id: subscription.id, cancel_date: endDate },
              });
              logStep("Pending cancellation notification sent to provider");
            }
        }
      }
    }

    // ==========================================
    // Handle invoice.payment_failed
    // ==========================================
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceType = invoice.metadata?.type;
      
      // Skip if this is an international placement fee — handled separately below
      if (invoiceType === "international_placement_fee") {
        logStep("Skipping general payment_failed handler for international invoice");
      } else {
      logStep("Payment failed", { invoiceId: invoice.id, amountDue: invoice.amount_due });

      const customerId = invoice.customer as string;
      const customer = await stripe.customers.retrieve(customerId);
      
      if (customer.deleted) {
        logStep("Customer deleted, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customerEmail = (customer as Stripe.Customer).email;
      const customerName = (customer as Stripe.Customer).name || "Provider";
      const amountDue = (invoice.amount_due / 100).toFixed(2);
      const currency = invoice.currency.toUpperCase();

      // Find user
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, first_name, last_name")
        .eq("email", customerEmail)
        .limit(1);

      const profile = profiles?.[0];
      const providerName = profile ? `${profile.first_name} ${profile.last_name}` : customerName;

      let facilityName = "Unknown Facility";
      let facilityId = null;
      if (profile?.user_id) {
        const { data: facilities } = await supabaseAdmin
          .from("facilities")
          .select("id, name")
          .eq("user_id", profile.user_id)
          .limit(1);
        
        if (facilities?.[0]) {
          facilityName = facilities[0].name;
          facilityId = facilities[0].id;
        }
      }

      // Create admin notification
      await supabaseAdmin.from("admin_notifications").insert({
        type: "payment_failed",
        title: "Subscription Payment Failed",
        message: `Payment of ${currency} ${amountDue} failed for ${facilityName} (${providerName})`,
        metadata: {
          customer_id: customerId,
          customer_email: customerEmail,
          amount_due: amountDue,
          currency,
          invoice_id: invoice.id,
          facility_id: facilityId,
          facility_name: facilityName,
          provider_name: providerName,
        },
      });

      // Create provider notification
      if (profile?.user_id) {
        await supabaseAdmin.from("provider_notifications").insert({
          user_id: profile.user_id,
          facility_id: facilityId,
          type: "payment_failed",
          title: "Payment Failed",
          message: `Your subscription payment of ${currency} ${amountDue} failed. Please update your payment method.`,
          metadata: { amount_due: amountDue, currency, invoice_id: invoice.id },
        });
      }

      // Send emails
      if (resend && customerEmail) {
        try {
          await sendEmailWithRetry(supabaseAdmin, resend, {
            from: "RehabLookup <no-reply@rehablookup.com>",
            to: [customerEmail],
            subject: "Action Required: Payment Failed",
            html: `
              <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #1B365D; background: #1B365D; padding: 30px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: Arial, Helvetica, sans-serif;">Payment Failed</h1>
                </div>
                <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                  <p style="color: #374151;">Hi ${providerName},</p>
                  <p style="color: #374151;">We were unable to process your payment of <strong>${currency} ${amountDue}</strong>.</p>
                  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #991b1b;"><strong>Important:</strong> Your subscription may be suspended if payment is not updated.</p>
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://rehablookup.com/provider/billing" style="background: #1B365D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Update Payment Method</a>
                  </div>
                </div>
              </div>
            `,
          }, {
            emailType: "stripe_payment_failed",
              idempotencyKey: `stripe-payment-failed-${event.id}`,
          });
          logStep("Payment failure email sent");
        } catch (emailError) {
          logStep("Email send failed", { error: String(emailError) });
        }
      }
      }
    }

    // ==========================================
    // Handle invoice.payment_succeeded
    // ==========================================
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Invoice payment succeeded", { invoiceId: invoice.id, amountPaid: invoice.amount_paid });

      // Idempotency: check if this event was already processed
      const { data: existingPaymentEvent } = await supabaseAdmin
        .from("subscription_events")
        .select("id")
        .eq("stripe_event_id", event.id)
        .maybeSingle();

      if (existingPaymentEvent) {
        logStep("Payment event already processed (duplicate webhook), skipping", { eventId: event.id });
      } else if (invoice.subscription) {
        const customerId = invoice.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        
        if (!customer.deleted) {
          const customerEmail = (customer as Stripe.Customer).email;

          let userId = null;
          let facilityId = null;
          let planName = "Unknown";
          let planTier: string | null = null;

          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("user_id")
            .eq("email", customerEmail)
            .limit(1);

          if (profiles?.[0]) {
            userId = profiles[0].user_id;
            const { data: facilities } = await supabaseAdmin
              .from("facilities")
              .select("id")
              .eq("user_id", userId)
              .limit(1);
            facilityId = facilities?.[0]?.id || null;
          }

          try {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string, {
              expand: ["items.data.price.product"],
            });
            const product = subscription.items.data[0]?.price?.product as Stripe.Product;
            planName = product?.name || "Subscription";
            if (product?.id && PRO_PRODUCT_IDS.includes(product.id)) planTier = "pro";
          } catch (e) {
            logStep("Failed to get subscription details", { error: String(e) });
          }

          await supabaseAdmin.from("subscription_events").insert({
            event_type: "payment_succeeded",
            stripe_event_id: event.id,
            stripe_customer_id: customerId,
            stripe_subscription_id: invoice.subscription as string,
            user_id: userId,
            facility_id: facilityId,
            plan_name: planName,
            plan_tier: planTier,
            amount_cents: invoice.amount_paid,
            currency: invoice.currency.toUpperCase(),
            status: "completed",
            metadata: {
              invoice_id: invoice.id,
              customer_email: customerEmail,
              billing_reason: invoice.billing_reason,
            },
          });
          logStep("Payment event recorded");

          // On renewal (subscription_cycle), clear the renewal_reminder_*_sent_at
          // milestones so the daily cron can fire the 60/30/14/7-day reminders
          // for the new period. First payment of a subscription is
          // `subscription_create`; we skip resets in that case since the
          // columns are already NULL on a fresh row.
          if (invoice.billing_reason === "subscription_cycle" && invoice.subscription) {
            const { error: resetErr } = await supabaseAdmin
              .from("facility_subscriptions")
              .update({
                renewal_reminder_60d_sent_at: null,
                renewal_reminder_30d_sent_at: null,
                renewal_reminder_14d_sent_at: null,
                renewal_reminder_7d_sent_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_subscription_id", invoice.subscription as string);
            if (resetErr) {
              logStep("Failed to reset renewal reminder milestones", { error: resetErr.message });
            } else {
              logStep("Renewal reminder milestones reset for new period");
            }
          }

          // Send payment confirmation notification + email to provider (renewals & first payments)
          if (userId && facilityId) {
            const amountFormatted = (invoice.amount_paid / 100).toFixed(2);
            const currencyUpper = invoice.currency.toUpperCase();
            const isRenewal = invoice.billing_reason === "subscription_cycle";
            const isPro = planTier === "pro";

            await supabaseAdmin.from("provider_notifications").insert({
              user_id: userId,
              facility_id: facilityId,
              type: "payment_confirmation",
              title: isRenewal ? "Subscription Renewed" : "Payment Confirmed",
              message: isRenewal
                ? `Your ${planName} subscription has been renewed. ${currencyUpper} ${amountFormatted} charged.${isPro ? " Your 20% discount on leads and placement fees continues." : ""}`
                : `Payment of ${currencyUpper} ${amountFormatted} for ${planName} confirmed.`,
              metadata: {
                amount_cents: invoice.amount_paid,
                currency: currencyUpper,
                invoice_id: invoice.id,
                billing_reason: invoice.billing_reason,
                plan_tier: planTier,
              },
            });

            // Send payment confirmation email
            if (resend && customerEmail) {
              try {
                const { data: providerProfile } = await supabaseAdmin
                  .from("profiles")
                  .select("first_name")
                  .eq("user_id", userId)
                  .maybeSingle();
                const firstName = providerProfile?.first_name || "Provider";

                const proBenefits = isPro
                  ? `<div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
                       <p style="margin: 0; color: #047857; font-weight: 600;">Your Pro Benefits Are Active</p>
                       <p style="margin: 8px 0 0; color: #047857;">✓ 20% discount on lead unlocks & placement fees</p>
                       <p style="margin: 4px 0 0; color: #047857;">✓ Featured placement & priority ranking</p>
                       <p style="margin: 4px 0 0; color: #047857;">✓ Up to 5 facility listings</p>
                     </div>`
                  : "";

                await sendEmailWithRetry(supabaseAdmin, resend, {
                  from: "RehabLookup <no-reply@rehablookup.com>",
                  to: [customerEmail],
                  subject: isRenewal ? `✅ Subscription Renewed — ${planName}` : `✅ Payment Confirmed — ${planName}`,
                  html: `
                    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto;">
                      <div style="background-color: #1B365D; padding: 30px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ ${isRenewal ? "Subscription Renewed" : "Payment Confirmed"}</h1>
                      </div>
                      <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                        <p style="color: #374151;">Hi ${firstName},</p>
                        <p style="color: #374151;">Your payment of <strong>${currencyUpper} ${amountFormatted}</strong> for <strong>${planName}</strong> has been processed successfully.</p>
                        ${proBenefits}
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="https://rehablookup.com/provider/billing" style="background: #1B365D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Billing</a>
                        </div>
                      </div>
                    </div>
                  `,
                }, {
                  emailType: "stripe_payment_success",
                idempotencyKey: `stripe-payment-success-${event.id}`,
                });
                logStep("Payment confirmation email sent to provider");
              } catch (emailError) {
                logStep("Payment confirmation email failed", { error: String(emailError) });
              }
            }
          }
        }
      }
    }

    // ==========================================
    // Handle customer.subscription.created
    // ==========================================
    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      logStep("Subscription created", { subscriptionId: subscription.id, customerId });

      // Idempotency: skip if already processed.
      const { data: existingSubCreated } = await supabaseAdmin
        .from("subscription_events")
        .select("id")
        .eq("stripe_event_id", event.id)
        .maybeSingle();

      if (existingSubCreated) {
        logStep("Subscription created event already processed, skipping", { eventId: event.id });
      } else {

      // Add-on subscriptions (Featured/Concierge purchased separately
      // from Pro) carry a metadata.type marker set by create-checkout-
      // session. Route those to the dedicated activation helpers and
      // skip the Pro-subscription path below.
      const subMetadataType = subscription.metadata?.type as string | undefined;
      const addonFacilityId = subscription.metadata?.facility_id as string | undefined;

      if (subMetadataType === "featured_addon" && addonFacilityId) {
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
        const addonResult = await activateFeaturedAddon(supabaseAdmin, {
          facilityId: addonFacilityId,
          stripeSubscriptionId: subscription.id,
          currentPeriodEnd: periodEnd,
        });
        logStep("Featured add-on activated via subscription.created", {
          facilityId: addonFacilityId,
          stripeSubId: subscription.id,
          placementsInserted: addonResult.placements_inserted,
          placementsReactivated: addonResult.placements_reactivated,
          failed: addonResult.failed.length,
        });
        await notifyFeaturedAddonPartialFailure(supabaseAdmin, {
          eventType: "customer.subscription.created",
          facilityId: addonFacilityId,
          stripeSubscriptionId: subscription.id,
          stripeEventId: event.id,
          result: addonResult,
        });

        await supabaseAdmin.from("subscription_events").insert({
          event_type: "featured_addon_activated",
          stripe_event_id: event.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          facility_id: addonFacilityId,
          plan_tier: null,
          status: subscription.status,
          metadata: {
            placements_inserted: addonResult.placements_inserted,
            placements_reactivated: addonResult.placements_reactivated,
          },
        });

        const { data: facSubProvider } = await supabaseAdmin
          .from("facility_subscriptions")
          .select("provider_id")
          .eq("facility_id", addonFacilityId)
          .maybeSingle();
        if (facSubProvider) {
          await supabaseAdmin.from("provider_notifications").insert({
            user_id: (facSubProvider as { provider_id: string }).provider_id,
            facility_id: addonFacilityId,
            type: "featured_addon_active",
            title: "Featured is live",
            message:
              "Your facility is now in the Featured rotation on the homepage, statewide directory, your city, and global search results.",
            metadata: { stripe_subscription_id: subscription.id },
          });
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customer = await stripe.customers.retrieve(customerId);
      
      if (!customer.deleted) {
        const customerEmail = (customer as Stripe.Customer).email;
        const customerName = (customer as Stripe.Customer).name || "Provider";

        const priceItem = subscription.items.data[0];
        let planName = "Subscription";
        let planTier: string | null = null;
        let productId: string | null = null;
        const amount = priceItem?.price?.unit_amount || 0;
        const currency = (priceItem?.price?.currency || "usd").toUpperCase();

        // Try the new flat-fee monetization lookup keys first.
        // If the subscription has any of the six (Pro / Featured /
        // Concierge × monthly / annual), derive tier + addon flags and
        // billing_period from those. Falls through to the legacy
        // PRO_PRODUCT_IDS check otherwise.
        const flags = deriveTierFlagsFromSubscription(subscription);
        if (flags.matched_new_lookup_keys) {
          planTier = flags.tier;
          const intervalSuffix = flags.billing_period === "monthly" ? "monthly" : "annual";
          planName =
            flags.has_featured && flags.has_concierge_partner
              ? `Pro + Featured + Concierge (${intervalSuffix})`
              : flags.has_featured
                ? `Pro + Featured (${intervalSuffix})`
                : flags.has_concierge_partner
                  ? `Pro + Concierge (${intervalSuffix})`
                  : `Pro (${intervalSuffix})`;
        } else if (priceItem?.price?.product) {
          const product = await stripe.products.retrieve(priceItem.price.product as string);
          planName = product.name;
          productId = product.id;
          if (productId && PRO_PRODUCT_IDS.includes(productId)) planTier = "pro";
        }

        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("user_id, first_name, last_name")
          .eq("email", customerEmail)
          .limit(1);

        const profile = profiles?.[0];
        const providerName = profile ? `${profile.first_name} ${profile.last_name}` : customerName;

        let facilityName = "New Provider";
        let facilityId = null;
        if (profile?.user_id) {
          const { data: facilities } = await supabaseAdmin
            .from("facilities")
            .select("id, name")
            .eq("user_id", profile.user_id)
            .limit(1);
          
          if (facilities?.[0]) {
            facilityName = facilities[0].name;
            facilityId = facilities[0].id;
          }
        }

        // Pro upgrade — activate full benefits (profile.plan mirror,
        // facilities.featured, +50 ranking) via the shared helper. The
        // helper is idempotent so this branch is safe to re-enter on
        // webhook retry. Partial failures emit an admin notification.
        if (profile?.user_id && planTier === "pro") {
          const proResult = await activateProBenefits(supabaseAdmin, profile.user_id);
          logStep("Pro benefits activation result", {
            userId: profile.user_id,
            updated: proResult.facilitiesUpdated.length,
            already: proResult.alreadyActive.length,
            failed: proResult.failed.length,
            profileMirrored: proResult.profilePlanMirrored,
          });
          await notifyProBenefitsPartialFailure(supabaseAdmin, {
            userId: profile.user_id,
            eventType: "customer.subscription.created",
            result: proResult,
            stripeEventId: event.id,
          });

          const { data: suspendedFacilities } = await supabaseAdmin
            .from("facilities")
            .select("id, name")
            .eq("user_id", profile.user_id)
            .eq("suspended", true);

          if (suspendedFacilities && suspendedFacilities.length > 0) {
            for (const sf of suspendedFacilities) {
              await supabaseAdmin
                .from("facilities")
                .update({
                  suspended: false,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", sf.id);
            }
            logStep("Suspended facilities reactivated on upgrade", {
              count: suspendedFacilities.length,
              names: suspendedFacilities.map(f => f.name),
            });

            // Notify provider
            await supabaseAdmin.from("provider_notifications").insert({
              user_id: profile.user_id,
              facility_id: facilityId,
              type: "facilities_reactivated",
              title: "Facilities Reactivated",
              message: `${suspendedFacilities.length} listing(s) have been reactivated with your Pro upgrade!`,
              metadata: {
                reactivated_facility_ids: suspendedFacilities.map(f => f.id),
                reactivated_facility_names: suspendedFacilities.map(f => f.name),
              },
            });
          }
        }

        // Record event
        await supabaseAdmin.from("subscription_events").insert({
          event_type: "subscription_created",
          stripe_event_id: event.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          user_id: profile?.user_id || null,
          facility_id: facilityId,
          plan_name: planName,
          plan_tier: planTier,
          amount_cents: amount,
          currency: currency,
          status: "active",
          metadata: {
            customer_email: customerEmail,
            provider_name: providerName,
            facility_name: facilityName,
            product_id: productId,
          },
        });

        // Admin notification
        await supabaseAdmin.from("admin_notifications").insert({
          type: "new_subscription",
          title: "New Subscription Created",
          message: `${facilityName} subscribed to ${planName} (${currency} ${(amount / 100).toFixed(2)}/mo)`,
          metadata: {
            customer_id: customerId,
            customer_email: customerEmail,
            subscription_id: subscription.id,
            plan_name: planName,
            amount: (amount / 100).toFixed(2),
            currency,
            facility_id: facilityId,
            facility_name: facilityName,
            provider_name: providerName,
          },
        });

        // Send admin email
        if (resend) {
          try {
            await sendEmailWithRetry(supabaseAdmin, resend, {
              from: "RehabLookup <no-reply@rehablookup.com>",
              to: ["Support@rehablookup.com"],
              subject: `🎉 New Subscription - ${facilityName}`,
              html: `
                <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background-color: #1B365D; background: #1B365D; padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: Arial, Helvetica, sans-serif;">🎉 New Subscription</h1>
                  </div>
                  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                    <p style="color: #374151;">A new provider has subscribed!</p>
                    <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
                      <p style="margin: 0; color: #047857;"><strong>Facility:</strong> ${facilityName}</p>
                      <p style="margin: 8px 0 0; color: #047857;"><strong>Provider:</strong> ${providerName}</p>
                      <p style="margin: 8px 0 0; color: #047857;"><strong>Plan:</strong> ${planName}</p>
                      <p style="margin: 8px 0 0; color: #047857;"><strong>Amount:</strong> ${currency} ${(amount / 100).toFixed(2)}/month</p>
                    </div>
                  </div>
                </div>
              `,
            }, {
              emailType: "stripe_new_subscription_admin",
              idempotencyKey: `stripe-new-sub-admin-${event.id}`,
            });
          } catch (emailError) {
            logStep("Email failed", { error: String(emailError) });
          }
        }
      }
      } // end idempotency check
    }

    // ==========================================
    // Handle customer.subscription.deleted
    // ==========================================
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      logStep("Subscription deleted", { subscriptionId: subscription.id });

      // Idempotency: check if this event was already processed
      const { data: existingDeleteEvent } = await supabaseAdmin
        .from("subscription_events")
        .select("id")
        .eq("stripe_event_id", event.id)
        .maybeSingle();

      if (existingDeleteEvent) {
        logStep("Subscription deleted event already processed, skipping", { eventId: event.id });
      } else {

      // Add-on subscriptions (Featured/Concierge) — keyed off
      // metadata.type set when the sub was created via
      // create-checkout-session. Deactivate the helper's row(s) and
      // skip the full Pro cancellation path below.
      const delMetadataType = subscription.metadata?.type as string | undefined;
      const delAddonFacilityId = subscription.metadata?.facility_id as string | undefined;
      if (delMetadataType === "featured_addon") {
        const deactivateRes = await deactivateFeaturedAddon(supabaseAdmin, {
          facilityId: delAddonFacilityId,
          stripeSubscriptionId: subscription.id,
        });
        logStep("Featured add-on deactivated via subscription.deleted", {
          stripeSubId: subscription.id,
          placementsDeactivated: deactivateRes.placements_deactivated,
          failed: deactivateRes.failed.length,
        });
        await notifyFeaturedAddonPartialFailure(supabaseAdmin, {
          eventType: "customer.subscription.deleted",
          facilityId: delAddonFacilityId,
          stripeSubscriptionId: subscription.id,
          stripeEventId: event.id,
          result: deactivateRes,
        });

        await supabaseAdmin.from("subscription_events").insert({
          event_type: "featured_addon_deactivated",
          stripe_event_id: event.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          facility_id: delAddonFacilityId ?? null,
          plan_tier: null,
          status: "canceled",
          metadata: {
            placements_deactivated: deactivateRes.placements_deactivated,
          },
        });

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customer = await stripe.customers.retrieve(customerId);
      
      if (!customer.deleted) {
        const customerEmail = (customer as Stripe.Customer).email;
        
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("user_id, first_name, last_name")
          .eq("email", customerEmail)
          .limit(1);

        if (profiles?.[0]) {
          const { data: facilities } = await supabaseAdmin
            .from("facilities")
            .select("id, name")
            .eq("user_id", profiles[0].user_id)
            .limit(1);

          if (facilities?.[0]) {
            // Resolve the facility_subscriptions row id so cancelSubscriptionAndRefund
            // can refund per-tier (Pro + every active add-on), record audit
            // rows, and flip the row to canceled with has_featured=false +
            // has_concierge_partner=false in a single transactional call.
            const { data: subRow } = await supabaseAdmin
              .from("facility_subscriptions")
              .select("id")
              .eq("stripe_subscription_id", subscription.id)
              .maybeSingle();

            if (subRow?.id) {
              try {
                const cancelResult = await cancelSubscriptionAndRefund(subRow.id, {
                  scope: "all",
                  reason: subscription.cancellation_details?.reason
                    ? `stripe webhook: ${subscription.cancellation_details.reason}`
                    : "stripe webhook: subscription.deleted",
                });
                logStep("Cancellation refunds issued", {
                  totalRefundCents: cancelResult.totalRefundCents,
                  refundIds: cancelResult.stripeRefundIds,
                  rowIds: cancelResult.cancellationRowIds,
                });
              } catch (cancelErr) {
                logStep("ERROR running cancelSubscriptionAndRefund", { error: String(cancelErr) });
                // Surface to admin so the silent fallback (mark canceled
                // without refund) is visible.
                await supabaseAdmin.from("admin_notifications").insert({
                  type: "subscription_cancel_refund_failed",
                  title: "Refund executor failed on subscription.deleted",
                  message: `cancelSubscriptionAndRefund threw for facility_subscriptions.id=${subRow.id} (stripe_sub=${subscription.id}). Refund and benefit-revert did NOT complete; row was force-canceled. Manual review required.`,
                  metadata: {
                    facility_subscription_id: subRow.id,
                    stripe_subscription_id: subscription.id,
                    stripe_event_id: event.id,
                    error: String(cancelErr),
                  },
                }).then(({ error: notifyErr }) => {
                  if (notifyErr) logStep("WARN admin notify failed", { error: notifyErr.message });
                });
                // Fallback: at minimum mark the row canceled.
                await supabaseAdmin
                  .from("facility_subscriptions")
                  .update({
                    status: "canceled",
                    canceled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", subRow.id);
              }
            } else {
              logStep("No facility_subscriptions row found for cancelled Stripe sub — skipping refund executor", { stripeSubId: subscription.id });
            }

            // Revert Pro benefits via the shared helper (idempotent on
            // featured=false; mirrors profiles.plan='free').
            const providerId = profiles[0].user_id;
            const revertResult = await deactivateProBenefits(supabaseAdmin, providerId);
            logStep("Pro benefits revert result", {
              reverted: revertResult.facilitiesReverted.length,
              failed: revertResult.failed.length,
              profileReverted: revertResult.profilePlanReverted,
            });
            await notifyProBenefitsPartialFailure(supabaseAdmin, {
              userId: providerId,
              eventType: "customer.subscription.deleted",
              result: revertResult,
              stripeEventId: event.id,
            });

            // DOWNGRADE: re-read the full facility set for the
            // suspend-extras step below.
            const { data: allFacilities } = await supabaseAdmin
              .from("facilities")
              .select("id")
              .eq("user_id", providerId);
            if (allFacilities) {

              // DOWNGRADE: Suspend extra facilities beyond the free-tier limit of 1
              // Keep the oldest facility (by created_at) active, suspend the rest
              if (allFacilities.length > 1) {
                // Fetch all facilities with created_at to determine which to keep
                const { data: allFacilitiesOrdered } = await supabaseAdmin
                  .from("facilities")
                  .select("id, name, created_at")
                  .eq("user_id", providerId)
                  .order("created_at", { ascending: true });

                if (allFacilitiesOrdered && allFacilitiesOrdered.length > 1) {
                  // Keep the first (oldest) facility active, suspend the rest
                  const facilitiesToSuspend = allFacilitiesOrdered.slice(1);
                  for (const sf of facilitiesToSuspend) {
                    await supabaseAdmin
                      .from("facilities")
                      .update({
                        suspended: true,
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", sf.id);
                  }
                  logStep("Extra facilities suspended on downgrade", {
                    kept: allFacilitiesOrdered[0].name,
                    suspended: facilitiesToSuspend.map(f => f.name),
                  });

                  // Notify provider about suspended facilities
                  await supabaseAdmin.from("provider_notifications").insert({
                    user_id: providerId,
                    facility_id: allFacilitiesOrdered[0].id,
                    type: "facilities_suspended",
                    title: "Facilities Paused",
                    message: `${facilitiesToSuspend.length} additional listing(s) have been paused. Upgrade to Pro to reactivate them. No data has been deleted.`,
                    metadata: {
                      suspended_facility_ids: facilitiesToSuspend.map(f => f.id),
                      suspended_facility_names: facilitiesToSuspend.map(f => f.name),
                    },
                  });
                }
              }
            }

            // Record event
            await supabaseAdmin.from("subscription_events").insert({
              event_type: "subscription_cancelled",
              stripe_event_id: event.id,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              user_id: profiles[0].user_id,
              facility_id: facilities[0].id,
              status: "cancelled",
              metadata: {
                customer_email: customerEmail,
                provider_name: `${profiles[0].first_name} ${profiles[0].last_name}`,
                facility_name: facilities[0].name,
                cancel_reason: subscription.cancellation_details?.reason || null,
              },
            });

            // Admin notification
            await supabaseAdmin.from("admin_notifications").insert({
              type: "subscription_cancelled",
              title: "Subscription Cancelled",
              message: `${facilities[0].name} has cancelled their subscription`,
              metadata: {
                facility_id: facilities[0].id,
                facility_name: facilities[0].name,
                provider_name: `${profiles[0].first_name} ${profiles[0].last_name}`,
                customer_email: customerEmail,
              },
            });

            // Provider notification
            await supabaseAdmin.from("provider_notifications").insert({
              user_id: profiles[0].user_id,
              facility_id: facilities[0].id,
              type: "subscription_cancelled",
              title: "Pro Subscription Cancelled",
              message: "Your Pro benefits have been removed. Upgrade again to restore discounts and featured placement.",
              metadata: { subscription_id: subscription.id },
            });

            logStep("Subscription cancellation processed");

            // Send admin email
            if (resend) {
              try {
                await sendEmailWithRetry(supabaseAdmin, resend, {
                  from: "RehabLookup <no-reply@rehablookup.com>",
                  to: ["Support@rehablookup.com"],
                  subject: `⚠️ Subscription Cancelled - ${facilities[0].name}`,
                  html: `
                    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto;">
                      <div style="background-color: #1B365D; background: #1B365D; padding: 30px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: Arial, Helvetica, sans-serif;">⚠️ Subscription Cancelled</h1>
                      </div>
                      <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                          <p style="margin: 0; color: #92400e;"><strong>Facility:</strong> ${facilities[0].name}</p>
                          <p style="margin: 8px 0 0; color: #92400e;"><strong>Provider:</strong> ${profiles[0].first_name} ${profiles[0].last_name}</p>
                        </div>
                        <p style="color: #6b7280; font-size: 14px;">Consider reaching out to understand why they cancelled.</p>
                      </div>
                    </div>
                  `,
                }, {
                  emailType: "stripe_cancel_admin",
                idempotencyKey: `stripe-cancel-admin-${event.id}`,
                });
              } catch (emailError) {
                logStep("Cancel admin email failed", { error: String(emailError) });
              }

              // Send cancellation email to provider
              if (customerEmail) {
                try {
                  await sendEmailWithRetry(supabaseAdmin, resend, {
                    from: "RehabLookup <no-reply@rehablookup.com>",
                    to: [customerEmail],
                    subject: `Your Pro Subscription Has Been Cancelled`,
                    html: `
                      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background-color: #1B365D; padding: 30px; border-radius: 12px 12px 0 0;">
                          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Pro Subscription Cancelled</h1>
                        </div>
                        <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                          <p style="color: #374151;">Hi ${profiles[0].first_name},</p>
                          <p style="color: #374151;">Your Pro subscription for <strong>${facilities[0].name}</strong> has been cancelled.</p>
                          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #92400e; font-weight: 600;">What This Means</p>
                            <p style="margin: 8px 0 0; color: #92400e;">• Lead unlock & placement fee discounts (20%) removed</p>
                            <p style="margin: 4px 0 0; color: #92400e;">• Featured placement & priority ranking removed</p>
                            <p style="margin: 4px 0 0; color: #92400e;">• Extra listings paused (data preserved)</p>
                          </div>
                          <p style="color: #374151;">Your data is safe — nothing has been deleted. You can resubscribe anytime to restore all Pro benefits.</p>
                          <div style="text-align: center; margin: 30px 0;">
                            <a href="https://rehablookup.com/provider/pro-upgrade" style="background: #1B365D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Resubscribe to Pro</a>
                          </div>
                        </div>
                      </div>
                    `,
                  }, {
                    emailType: "stripe_cancel_provider",
                  idempotencyKey: `stripe-cancel-provider-${event.id}`,
                  });
                  logStep("Cancellation email sent to provider");
                } catch (provEmailError) {
                  logStep("Provider cancel email failed", { error: String(provEmailError) });
                }
              }
            }
          }
        }
      }
      } // end idempotency check
    }

    // ==========================================
    // payment_intent.payment_failed handler retired — it processed
    // placement_invoices failures, which is the dead pay-per-admission
    // flow. The placement_invoices table was dropped in the
    // monetization rebuild. International + concierge payment failure
    // handling continues below.


    // ==========================================
    // Handle charge.refunded (international payments)
    // ==========================================
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;
      
      if (paymentIntentId) {
        logStep("Processing refund", { chargeId: charge.id, paymentIntentId });

        // Check if this is an international payment
        const { data: intlPayment } = await supabaseAdmin
          .from("international_payments")
          .select("id, email, client_name")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();

        if (intlPayment) {
          logStep("Refunding international payment", { paymentId: intlPayment.id });

          const { error: updateError } = await supabaseAdmin
            .from("international_payments")
            .update({
              status: "refunded",
              updated_at: new Date().toISOString(),
              metadata: {
                refund_id: charge.refunds?.data[0]?.id,
                refunded_at: new Date().toISOString(),
              },
            })
            .eq("id", intlPayment.id);

          if (updateError) {
            logStep("Error updating payment to refunded", { error: updateError.message });
          } else {
            logStep("International payment marked as refunded");

            // Create admin notification
            await supabaseAdmin.from("admin_notifications").insert({
              type: "international_refund",
              title: "International Payment Refunded",
              message: `Refunded $99 to ${intlPayment.client_name} (${intlPayment.email})`,
              metadata: {
                payment_id: intlPayment.id,
                charge_id: charge.id,
                payment_intent_id: paymentIntentId,
              },
            });
          }
        }
      }
    }

    // ==========================================
    // Handle invoice.paid for International Facility Invoices
    // ==========================================
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceId = invoice.metadata?.invoice_id;
      const invoiceType = invoice.metadata?.type;

      if (invoiceType === "international_placement_fee" && invoiceId) {
        logStep("International facility invoice paid", { invoiceId, stripeInvoiceId: invoice.id });

        // Idempotency: check if already marked paid
        const { data: existingInvoice } = await supabaseAdmin
          .from("international_facility_invoices")
          .select("id, status")
          .eq("id", invoiceId)
          .maybeSingle();

        if (existingInvoice?.status === "paid") {
          logStep("International invoice already paid (duplicate webhook), skipping", { invoiceId });
        } else {
          const { error: updateError } = await supabaseAdmin
            .from("international_facility_invoices")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: invoice.payment_intent as string,
            })
            .eq("id", invoiceId);

          if (updateError) {
            logStep("Error updating invoice to paid", { error: updateError.message });
          } else {
            // Update case status
            const { data: dbInvoice } = await supabaseAdmin
              .from("international_facility_invoices")
              .select("case_id")
              .eq("id", invoiceId)
              .single();

            if (dbInvoice?.case_id) {
              await supabaseAdmin
                .from("international_placement_cases")
                .update({ facility_fee_status: "paid" })
                .eq("id", dbInvoice.case_id);

              await supabaseAdmin.from("international_case_events").insert({
                case_id: dbInvoice.case_id,
                event_type: "facility_fee_paid",
                actor_type: "system",
                event_data: { 
                  invoice_id: invoiceId,
                  stripe_invoice_id: invoice.id,
                  amount_paid: invoice.amount_paid,
                },
              });
            }

            // Create admin notification
            await supabaseAdmin.from("admin_notifications").insert({
              type: "international_invoice_paid",
              title: "International Invoice Paid",
              message: `Facility paid $${(invoice.amount_paid / 100).toLocaleString()} for international placement`,
              metadata: {
                invoice_id: invoiceId,
                stripe_invoice_id: invoice.id,
                case_id: invoice.metadata?.case_id,
              },
            });

            logStep("International facility invoice marked as paid");
          }
        }
      }
    }

    // ==========================================
    // Handle invoice.payment_failed for International Facility Invoices  
    // ==========================================
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceType = invoice.metadata?.type;
      const invoiceId = invoice.metadata?.invoice_id;

      if (invoiceType === "international_placement_fee" && invoiceId) {
        logStep("International facility invoice payment failed", { invoiceId });

        await supabaseAdmin
          .from("international_facility_invoices")
          .update({ status: "uncollectible" })
          .eq("id", invoiceId);

        const { data: dbInvoice } = await supabaseAdmin
          .from("international_facility_invoices")
          .select("case_id")
          .eq("id", invoiceId)
          .single();

        if (dbInvoice?.case_id) {
          await supabaseAdmin.from("international_case_events").insert({
            case_id: dbInvoice.case_id,
            event_type: "facility_invoice_payment_failed",
            actor_type: "system",
            event_data: { invoice_id: invoiceId, stripe_invoice_id: invoice.id },
          });
        }

        await supabaseAdmin.from("admin_notifications").insert({
          type: "international_invoice_failed",
          title: "International Invoice Payment Failed",
          message: `Payment failed for international placement invoice`,
          metadata: {
            invoice_id: invoiceId,
            stripe_invoice_id: invoice.id,
            case_id: invoice.metadata?.case_id,
          },
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
