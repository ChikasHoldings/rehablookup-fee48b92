import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

// Version tracking for deployment verification
const VERSION = "1.1.0";
const DEPLOYED_AT = "2026-04-06T00:00:00Z";

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
            amount_cents: 29900,
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
              seeker_fee_amount_cents: 29900,
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
          message: `${clientName} from ${clientCountry} paid $299 for international placement`,
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

      // DOMESTIC CONCIERGE PAYMENT (safety net for abandoned intake forms)
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

        // Check if inquiry already exists for this checkout session
        const { data: existingInquiry } = await supabaseAdmin
          .from("concierge_inquiries")
          .select("id, payment_status")
          .eq("checkout_session_id", checkoutSessionId)
          .maybeSingle();

        if (existingInquiry) {
          // Update payment status if not already paid
          if (existingInquiry.payment_status !== "paid" && existingInquiry.payment_status !== "succeeded") {
            await supabaseAdmin
              .from("concierge_inquiries")
              .update({
                payment_status: "paid",
                stripe_payment_intent_id: paymentIntentId,
                stripe_customer_id: session.customer as string,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingInquiry.id);
            logStep("Updated existing inquiry payment status", { inquiryId: existingInquiry.id });
          }
        } else {
          // Create pending inquiry record (safety net)
          const { error: inquiryError } = await supabaseAdmin
            .from("concierge_inquiries")
            .insert({
              user_id: userId || null,
              user_name: "Pending Intake",
              user_email: email,
              user_phone: "",
              status: "pending_intake",
              payment_status: "paid",
              payment_amount_cents: 2900,
              checkout_session_id: checkoutSessionId,
              stripe_payment_intent_id: paymentIntentId,
              stripe_customer_id: session.customer as string,
              idempotency_key: session.metadata?.idempotency_key || null,
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

      // ADDITIONAL LISTING SLOT PURCHASE
      if (session.mode === "payment" && purchaseType === "additional_listing_slot") {
        const userId = session.metadata?.user_id;
        
        if (userId) {
          logStep("Processing additional listing slot purchase", { userId, sessionId: session.id });

          // Update the pending record to completed
          const { error: updateError } = await supabaseAdmin
            .from("purchased_listing_slots")
            .update({
              status: "completed",
              stripe_payment_intent_id: session.payment_intent as string,
              completed_at: new Date().toISOString(),
            })
            .eq("stripe_checkout_session_id", session.id)
            .eq("user_id", userId);

          if (updateError) {
            logStep("Error updating listing slot purchase", { error: updateError.message });
          } else {
            logStep("Listing slot purchase completed successfully");

            // Get user's facility for notification
            const { data: facilities } = await supabaseAdmin
              .from("facilities")
              .select("id")
              .eq("user_id", userId)
              .limit(1);

            const facilityId = facilities?.[0]?.id || null;

            // Create provider notification
            await supabaseAdmin.from("provider_notifications").insert({
              user_id: userId,
              facility_id: facilityId,
              type: "listing_slot_purchased",
              title: "Additional Listing Slot Purchased",
              message: "You can now add one more facility listing to your account.",
              metadata: { session_id: session.id },
            });
          }
        }
        
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // LEAD UNLOCK VIA STRIPE (card payment)
      if (session.mode === "payment" && metadataType === "lead_unlock") {
        const leadId = session.metadata?.lead_id;
        const facilityId = session.metadata?.facility_id;
        const userId = session.metadata?.user_id;
        const paymentIntentId = session.payment_intent as string;

        if (leadId && facilityId && userId) {
          logStep("Processing lead unlock payment", { leadId, facilityId, userId });

          // Idempotency: check if already unlocked
          const { data: existingUnlock } = await supabaseAdmin
            .from("lead_unlocks")
            .select("id")
            .eq("lead_id", leadId)
            .eq("facility_id", facilityId)
            .maybeSingle();

          if (existingUnlock) {
            logStep("Lead already unlocked (duplicate webhook), skipping", { leadId, existingUnlockId: existingUnlock.id });
          } else {
            // Get the lead to determine price
            const amountTotal = session.amount_total || 0;

            // Create unlock record
            const { error: unlockError } = await supabaseAdmin
              .from("lead_unlocks")
              .insert({
                lead_id: leadId,
                provider_id: userId,
                facility_id: facilityId,
                unlock_price_cents: amountTotal,
                payment_method: "stripe",
                stripe_payment_intent_id: paymentIntentId,
              });

            if (unlockError) {
              logStep("Error creating lead unlock", { error: unlockError.message });
            } else {
              logStep("Lead unlock created via Stripe", { leadId, facilityId, priceCents: amountTotal });

              // Update lead_distributions
              await supabaseAdmin
                .from("lead_distributions")
                .update({ unlocked_at: new Date().toISOString() })
                .eq("lead_id", leadId)
                .eq("facility_id", facilityId);

              // Log credit transaction for record keeping
              await supabaseAdmin.from("credit_transactions").insert({
                provider_id: userId,
                facility_id: facilityId,
                amount_cents: -amountTotal,
                transaction_type: "unlock",
                reference_id: leadId,
                description: "Lead unlocked via card payment",
                stripe_payment_intent_id: paymentIntentId,
                base_price_cents: amountTotal,
                discount_applied: false,
                discount_amount_cents: 0,
                inquiry_type: session.metadata?.inquiry_type || null,
              });

              // Create provider notification
              await supabaseAdmin.from("provider_notifications").insert({
                user_id: userId,
                facility_id: facilityId,
                type: "lead_unlocked",
                title: "Lead Unlocked",
                message: `A lead has been unlocked via card payment ($${(amountTotal / 100).toFixed(2)}).`,
                metadata: { lead_id: leadId, amount_cents: amountTotal },
              });

              // Notify seeker that the facility is reviewing their inquiry
              try {
                const { data: leadData } = await supabaseAdmin
                  .from("leads")
                  .select("email")
                  .eq("id", leadId)
                  .maybeSingle();

                if (leadData?.email) {
                  // Find the seeker's user_id from their email via seeker_profiles + auth
                  const { data: seekerUser } = await supabaseAdmin.rpc(
                    "get_seeker_emails_for_admin"
                  );
                  const seekerMatch = (seekerUser || []).find(
                    (s: { email: string }) => s.email?.toLowerCase() === leadData.email.toLowerCase()
                  );

                  if (seekerMatch?.user_id) {
                    // Get facility name for a meaningful notification
                    const { data: facilityData } = await supabaseAdmin
                      .from("facilities")
                      .select("name")
                      .eq("id", facilityId)
                      .maybeSingle();

                    const facilityName = facilityData?.name || "A treatment center";

                    await supabaseAdmin.from("seeker_notifications").insert({
                      user_id: seekerMatch.user_id,
                      type: "facility_contacted_you",
                      title: "Facility Reviewing Your Inquiry",
                      message: `${facilityName} has reviewed your inquiry and may reach out to you soon.`,
                      link: "/account/requests",
                      metadata: { lead_id: leadId, facility_id: facilityId },
                    });
                    logStep("Seeker notification created for lead unlock", { seekerUserId: seekerMatch.user_id });
                  }
                }
              } catch (seekerNotifErr) {
                logStep("Non-critical: seeker notification failed", { error: String(seekerNotifErr) });
              }

              logStep("Lead unlock fully processed via Stripe");
            }
          }
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // CREDIT PURCHASE FULFILLMENT
      if (session.mode === "payment" && metadataType === "credit_purchase") {
        const amountCents = parseInt(session.metadata?.amount_cents || "0", 10);
        const bonusCents = parseInt(session.metadata?.bonus_cents || "0", 10);
        const facilityId = session.metadata?.facility_id;
        const userId = session.metadata?.user_id;
        const paymentIntentId = session.payment_intent as string;

        // Validate required fields
        if (amountCents <= 0 || !userId || !facilityId) {
          logStep("WARN - Invalid credit purchase metadata", { amountCents, userId, facilityId });
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Validate amount is a recognized tier (server-side enforcement)
        const validTiers = new Set([20000, 50000, 100000]);
        if (!validTiers.has(amountCents)) {
          logStep("WARN - Unrecognized credit tier", { amountCents });
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Validate bonus matches tier: $500 = 5000 (+10%), $1,000 = 20000 (+20%)
        const TIER_BONUSES: Record<number, number> = { 20000: 0, 50000: 5000, 100000: 20000 };
        const expectedBonus = TIER_BONUSES[amountCents] ?? 0;
        const safeBonusCents = Math.min(bonusCents, expectedBonus);
        const totalCreditsCents = amountCents + safeBonusCents;

        // HARDENING: Verify actual payment status from Stripe (don't trust event alone)
        let verifiedAmount: number;
        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (pi.status !== "succeeded") {
            logStep("WARN - PaymentIntent not succeeded, skipping credit grant", { piStatus: pi.status, paymentIntentId });
            return new Response(JSON.stringify({ received: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          verifiedAmount = pi.amount;
          if (verifiedAmount !== amountCents) {
            logStep("WARN - PaymentIntent amount mismatch", { piAmount: verifiedAmount, metadataAmount: amountCents });
            return new Response(JSON.stringify({ received: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (piErr) {
          logStep("ERROR - Could not verify PaymentIntent", { error: String(piErr) });
          return new Response(JSON.stringify({ error: "Payment verification failed" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        logStep("Processing credit purchase (verified)", { amountCents, bonusCents: safeBonusCents, totalCreditsCents, facilityId, userId });

        // Idempotency check: prevent double-crediting from duplicate webhooks
        const { data: existingTx } = await supabaseAdmin
          .from("credit_transactions")
          .select("id")
          .eq("reference_id", session.id)
          .eq("transaction_type", "purchase")
          .maybeSingle();

        if (existingTx) {
          logStep("Credit purchase already processed (duplicate webhook), skipping", { sessionId: session.id, existingTxId: existingTx.id });
        } else {
          // 1. Insert purchase transaction as idempotency gate
          const { error: txInsertError } = await supabaseAdmin.from("credit_transactions").insert({
            provider_id: userId,
            facility_id: facilityId,
            amount_cents: amountCents,
            transaction_type: "purchase",
            reference_id: session.id,
            description: `Purchased $${(amountCents / 100).toFixed(0)} in credits`,
            stripe_payment_intent_id: paymentIntentId,
          });

          if (txInsertError) {
            // If insert fails with unique constraint, it's a concurrent duplicate — safe to skip
            logStep("Credit transaction insert failed (likely duplicate)", { error: txInsertError.message });
          } else {
            // 2. If bonus credits, insert separate bonus transaction for audit trail
            if (safeBonusCents > 0) {
              const { error: bonusError } = await supabaseAdmin.from("credit_transactions").insert({
                provider_id: userId,
                facility_id: facilityId,
                amount_cents: safeBonusCents,
                transaction_type: "bonus",
                reference_id: `${session.id}_bonus`,
                description: `Bonus credits for $${(amountCents / 100).toFixed(0)} purchase`,
                stripe_payment_intent_id: paymentIntentId,
              });

              if (bonusError) {
                logStep("WARN - Bonus transaction insert failed", { error: bonusError.message });
              } else {
                logStep("Bonus credits transaction logged", { bonusCents: safeBonusCents });
              }
            }

            // 3. ATOMIC balance increment — eliminates race condition
            const { data: newBalance, error: creditError } = await supabaseAdmin
              .rpc("increment_provider_credits", {
                p_provider_id: userId,
                p_facility_id: facilityId,
                p_amount_cents: totalCreditsCents,
              });

            if (creditError) {
              logStep("ERROR - Failed to increment credits balance", { error: creditError.message });
            } else {
              logStep("Credits added successfully (atomic)", { newBalance, totalCreditsCents });

              // 4. Provider notification
              const bonusMsg = safeBonusCents > 0
                ? ` (includes $${(safeBonusCents / 100).toFixed(0)} bonus!)`
                : "";
              await supabaseAdmin.from("provider_notifications").insert({
                user_id: userId,
                facility_id: facilityId,
                type: "credits_added",
                title: "Credits Added",
                message: `$${(totalCreditsCents / 100).toFixed(0)} in credits added to your account${bonusMsg}`,
                metadata: {
                  purchase_amount_cents: amountCents,
                  bonus_cents: safeBonusCents,
                  total_credits_cents: totalCreditsCents,
                  new_balance: newBalance,
                  payment_intent_id: paymentIntentId,
                  checkout_session_id: session.id,
                },
              });

              logStep("Credit purchase fully processed", { newBalance });
            }
          }
        }
        
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // PRO SUBSCRIPTION ACTIVATION
      if (session.mode === "subscription" && metadataType === "pro_subscription") {
        const facilityId = session.metadata?.facility_id;
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (subscriptionId && facilityId && userId) {
          logStep("Activating Pro subscription", { subscriptionId, facilityId });

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

          const { error: proError } = await supabaseAdmin
            .from("pro_subscriptions")
            .upsert({
              provider_id: userId,
              facility_id: facilityId,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              status: "active",
              unlock_discount_percent: 20,
              price_cents: 39900,
              started_at: new Date().toISOString(),
              current_period_end: currentPeriodEnd,
              updated_at: new Date().toISOString(),
            }, { onConflict: "facility_id" });

          if (proError) {
            logStep("Error creating pro_subscription", { error: proError.message });
          } else {
            logStep("Pro subscription activated", { facilityId, currentPeriodEnd });

            // ACTIVATE PRO BENEFITS ON FACILITY
            // 1. Set featured = true for homepage/search placement
            // 2. Add +50 ranking boost to calculated_ranking_score
            const { data: currentFacility } = await supabaseAdmin
              .from("facilities")
              .select("calculated_ranking_score")
              .eq("id", facilityId)
              .maybeSingle();

            const currentScore = currentFacility?.calculated_ranking_score ?? 0;
            const { error: facilityUpdateError } = await supabaseAdmin
              .from("facilities")
              .update({
                featured: true,
                calculated_ranking_score: currentScore + 50,
                updated_at: new Date().toISOString(),
              })
              .eq("id", facilityId);

            if (facilityUpdateError) {
              logStep("Error activating facility Pro benefits", { error: facilityUpdateError.message });
            } else {
              logStep("Facility Pro benefits activated (featured + ranking boost)", { facilityId });
            }

            // Also activate featured on ALL other facilities owned by this provider
            const { data: otherFacilities } = await supabaseAdmin
              .from("facilities")
              .select("id, calculated_ranking_score")
              .eq("user_id", userId)
              .neq("id", facilityId);

            if (otherFacilities && otherFacilities.length > 0) {
              for (const f of otherFacilities) {
                const fScore = f.calculated_ranking_score ?? 0;
                await supabaseAdmin
                  .from("facilities")
                  .update({
                    featured: true,
                    calculated_ranking_score: fScore + 50,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", f.id);
              }
              logStep("Pro benefits applied to all provider facilities", { count: otherFacilities.length });
            }

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

      const { error: updateError } = await supabaseAdmin
        .from("pro_subscriptions")
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
          await resend.emails.send({
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

      // Idempotency: check if this event was already processed
      const { data: existingSubCreated } = await supabaseAdmin
        .from("subscription_events")
        .select("id")
        .eq("stripe_event_id", event.id)
        .maybeSingle();

      if (existingSubCreated) {
        logStep("Subscription created event already processed, skipping", { eventId: event.id });
      } else {
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

        if (priceItem?.price?.product) {
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
            await resend.emails.send({
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
            // Update pro_subscriptions to cancelled
            await supabaseAdmin
              .from("pro_subscriptions")
              .update({ 
                status: "canceled", 
                canceled_at: new Date().toISOString(),
                updated_at: new Date().toISOString() 
              })
              .eq("stripe_subscription_id", subscription.id);

            // DEACTIVATE PRO BENEFITS: remove featured flag and ranking boost from ALL provider facilities
            const providerId = profiles[0].user_id;
            const { data: allFacilities } = await supabaseAdmin
              .from("facilities")
              .select("id, calculated_ranking_score")
              .eq("user_id", providerId);

            if (allFacilities) {
              for (const f of allFacilities) {
                const currentScore = f.calculated_ranking_score ?? 0;
                await supabaseAdmin
                  .from("facilities")
                  .update({
                    featured: false,
                    calculated_ranking_score: Math.max(0, currentScore - 50),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", f.id);
              }
              logStep("Pro benefits removed from all provider facilities", { count: allFacilities.length });
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
                await resend.emails.send({
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
                });
              } catch (emailError) {
                logStep("Cancel email failed", { error: String(emailError) });
              }
            }
          }
        }
      }
      } // end idempotency check
    }

    // ==========================================
    // Handle payment_intent.payment_failed (placement fees)
    // ==========================================
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const invoiceId = paymentIntent.metadata?.invoice_id;
      
      if (invoiceId) {
        logStep("Placement fee payment failed", { paymentIntentId: paymentIntent.id, invoiceId });

        // Idempotency: check if this failure event was already recorded
        const { data: existingFailEvent } = await supabaseAdmin
          .from('placement_fee_events')
          .select('id')
          .eq('invoice_id', invoiceId)
          .eq('event_type', 'failed')
          .eq('details->>payment_intent_id', paymentIntent.id)
          .maybeSingle();

        if (existingFailEvent) {
          logStep("Payment failure already recorded (duplicate webhook), skipping", { invoiceId, eventId: event.id });
        } else {
          const { data: invoice } = await supabaseAdmin
            .from('placement_invoices')
            .update({ status: 'failed' })
            .eq('id', invoiceId)
            .select('*, facilities(id, name, email, user_id)')
            .single();

          if (invoice) {
            await supabaseAdmin.from('placement_fee_events').insert({
              invoice_id: invoiceId,
              inquiry_id: invoice.inquiry_id,
              facility_id: invoice.facility_id,
              event_type: 'failed',
              actor_type: 'system',
              amount_cents: invoice.amount_cents,
              details: {
                payment_intent_id: paymentIntent.id,
                failure_code: paymentIntent.last_payment_error?.code,
                failure_message: paymentIntent.last_payment_error?.message,
              },
            });

            if (invoice.facilities?.user_id) {
              await supabaseAdmin.from('provider_notifications').insert({
                user_id: invoice.facilities.user_id,
                facility_id: invoice.facility_id,
                type: 'payment_failed',
                title: 'Placement Fee Payment Failed',
                message: `Your payment of $${(invoice.amount_cents / 100).toFixed(2)} failed. Please update your payment method.`,
                metadata: { invoice_id: invoiceId, amount_cents: invoice.amount_cents },
              });
            }

            await supabaseAdmin.from('admin_notifications').insert({
              type: 'placement_payment_failed',
              title: 'Placement Fee Payment Failed',
              message: `Payment failed for ${invoice.facilities?.name || 'Unknown'} - $${(invoice.amount_cents / 100).toFixed(2)}`,
              metadata: { invoice_id: invoiceId, facility_id: invoice.facility_id, amount_cents: invoice.amount_cents },
            });
          }
        }
      }
    }

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
              message: `Refunded $299 to ${intlPayment.client_name} (${intlPayment.email})`,
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
