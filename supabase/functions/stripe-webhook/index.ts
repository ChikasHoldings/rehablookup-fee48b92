import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

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

          // H3 SECURITY: Stripe session metadata is mutable from the dashboard
          // and must NOT be trusted as authoritative for ownership. Cross-check
          // that the userId in metadata actually owns the facility being credited.
          // If a leaked Stripe key (or a malicious admin) edits a session's
          // metadata before the webhook fires, this check prevents the unlock
          // from being mis-attributed to another provider.
          const { data: facilityRow, error: facilityLookupErr } = await supabaseAdmin
            .from("facilities")
            .select("id, user_id")
            .eq("id", facilityId)
            .maybeSingle();

          if (facilityLookupErr || !facilityRow) {
            logStep("Lead unlock blocked: facility not found", {
              leadId, facilityId, userId, error: facilityLookupErr?.message,
            });
            await supabaseAdmin.from("admin_notifications").insert({
              type: "lead_unlock_attribution_failed",
              title: "Stripe lead unlock blocked: facility missing",
              message: `Webhook for session ${session.id} referenced facility ${facilityId} which does not exist. Manual review required.`,
              metadata: { session_id: session.id, lead_id: leadId, facility_id: facilityId, claimed_user_id: userId },
            });
            return new Response(JSON.stringify({ received: true, blocked: "facility_missing" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          if (facilityRow.user_id !== userId) {
            logStep("Lead unlock blocked: userId/facility ownership mismatch", {
              leadId, facilityId, claimedUserId: userId, actualOwnerId: facilityRow.user_id,
            });
            await supabaseAdmin.from("admin_notifications").insert({
              type: "lead_unlock_attribution_failed",
              title: "Stripe lead unlock blocked: ownership mismatch",
              message:
                `Webhook for session ${session.id} attempted to credit user ${userId} ` +
                `for an unlock on facility ${facilityId} owned by ${facilityRow.user_id}. ` +
                `Possible metadata tampering — manual review required.`,
              metadata: {
                session_id: session.id,
                lead_id: leadId,
                facility_id: facilityId,
                claimed_user_id: userId,
                actual_owner_id: facilityRow.user_id,
              },
            });
            return new Response(JSON.stringify({ received: true, blocked: "ownership_mismatch" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

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

              const unlockTimestamp = new Date().toISOString();

              // Update lead_distributions
              await supabaseAdmin
                .from("lead_distributions")
                .update({ unlocked_at: unlockTimestamp })
                .eq("lead_id", leadId)
                .eq("facility_id", facilityId);

              // PARITY FIX (C2): mark lead.status = 'unlocked' so reminders stop
              // and the provider UI reflects the unlocked state.
              await supabaseAdmin
                .from("leads")
                .update({ status: "unlocked" })
                .eq("id", leadId)
                .in("status", ["new", "expired"]);

              // PARITY FIX (C2): stamp ALL reminder columns so the cron
              // never queues another unlock-reminder email for this lead.
              await supabaseAdmin.from("leads").update({
                reminder_1h_sent_at: unlockTimestamp,
                reminder_2h_sent_at: unlockTimestamp,
                reminder_6h_sent_at: unlockTimestamp,
                reminder_12h_sent_at: unlockTimestamp,
                reminder_20h_sent_at: unlockTimestamp,
                reminder_24h_sent_at: unlockTimestamp,
              }).eq("id", leadId);

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

              // PARITY FIX (C2): track conversion event for analytics, mirror unlock-lead.
              try {
                const { data: leadCreated } = await supabaseAdmin
                  .from("leads")
                  .select("created_at")
                  .eq("id", leadId)
                  .maybeSingle();
                const unlockTimeHours = leadCreated?.created_at
                  ? (Date.now() - new Date(leadCreated.created_at).getTime()) / (1000 * 60 * 60)
                  : null;

                await supabaseAdmin.from("notification_events").insert({
                  lead_id: leadId,
                  facility_id: facilityId,
                  user_id: userId,
                  notification_stage: "unlock",
                  channel: "platform",
                  event_type: "unlocked",
                  notification_type: "conversion",
                  metadata: {
                    price_paid: amountTotal,
                    time_to_unlock_hours: unlockTimeHours ? Math.round(unlockTimeHours * 10) / 10 : null,
                    payment_method: "stripe",
                  },
                });

                await supabaseAdmin.from("notification_preferences").update({
                  last_unlock_at: unlockTimestamp,
                }).eq("user_id", userId);
              } catch (trackErr) {
                logStep("WARN - Failed to track Stripe unlock conversion", { error: String(trackErr) });
              }

              // PARITY FIX (C2): send the unlock-confirmation email to the provider
              // (the credit-path equivalent in unlock-lead/index.ts).
              try {
                if (resend) {
                  const { data: providerProfile } = await supabaseAdmin
                    .from("profiles")
                    .select("email, first_name")
                    .eq("user_id", userId)
                    .maybeSingle();

                  const { data: facilityRow } = await supabaseAdmin
                    .from("facilities")
                    .select("name")
                    .eq("id", facilityId)
                    .maybeSingle();

                  const { data: leadName } = await supabaseAdmin
                    .from("leads")
                    .select("name")
                    .eq("id", leadId)
                    .maybeSingle();

                  if (providerProfile?.email) {
                    const providerFirst = providerProfile.first_name || "there";
                    const facilityNameStr = facilityRow?.name || "your facility";
                    const seekerFirst = leadName?.name ? leadName.name.split(" ")[0] : "a seeker";

                    await sendEmailWithRetry(supabaseAdmin, resend, {
                      from: "RehabLookup <no-reply@rehablookup.com>",
                      to: [providerProfile.email],
                      subject: `Lead Unlocked — ${seekerFirst}'s contact details are ready`,
                      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#1B365D 0%,#2a4a7f 100%);padding:32px;text-align:center;"><div style="font-size:40px;margin-bottom:12px;">🔓</div><h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Lead Unlocked</h1></td></tr><tr><td style="padding:32px;"><p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;line-height:1.6;">Hi ${providerFirst},</p><p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">You've unlocked a lead for <strong>${facilityNameStr}</strong>. The contact details are now available in your dashboard.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:12px;margin-bottom:24px;"><tr><td style="padding:20px;"><p style="margin:0 0 8px;font-size:14px;color:#1e40af;"><strong>Amount:</strong> $${(amountTotal / 100).toFixed(2)}</p><p style="margin:0;font-size:14px;color:#1e40af;"><strong>Payment:</strong> Card</p></td></tr></table><p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">💡 <strong>Tip:</strong> Respond within 1 hour for the best chance of connecting with this lead.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="https://rehablookup.com/provider/inquiries" style="display:inline-block;background:#1B365D;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">View Lead Details</a></td></tr></table></td></tr><tr><td style="background:#1B365D;padding:24px;text-align:center;"><p style="margin:0;font-size:18px;font-weight:700;color:#fff;">RehabLookup</p><p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.6);">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`,
                    }, {
                      emailType: "lead_unlock_confirmation",
                      idempotencyKey: `unlock-confirm-${leadId}-${facilityId}`,
                    });
                    logStep("Unlock confirmation email sent (Stripe path)");
                  }
                }
              } catch (emailErr) {
                logStep("WARN - Failed to send Stripe unlock confirmation email", { error: String(emailErr) });
              }

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

              // 5. Send credit purchase confirmation email
              if (resend) {
                try {
                  const purchaseEmail = session.customer_email || session.customer_details?.email;
                  if (purchaseEmail) {
                    const amountFormatted = (amountCents / 100).toFixed(0);
                    const totalFormatted = (totalCreditsCents / 100).toFixed(0);
                    const balanceFormatted = typeof newBalance === "number" ? (newBalance / 100).toFixed(0) : "N/A";
                    await sendEmailWithRetry(supabaseAdmin, resend, {
                      from: "RehabLookup <no-reply@rehablookup.com>",
                      to: [purchaseEmail],
                      subject: `✅ Credit Purchase Confirmed — $${amountFormatted}`,
                      html: `
                        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto;">
                          <div style="background-color: #1B365D; background: #1B365D; padding: 30px; border-radius: 12px 12px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: Arial, Helvetica, sans-serif;">✅ Credits Added</h1>
                          </div>
                          <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                            <p style="color: #374151;">Your credit purchase has been confirmed.</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                              <tr><td style="padding: 8px 0; color: #6b7280;">Purchase Amount</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #374151;">$${amountFormatted}</td></tr>
                              ${safeBonusCents > 0 ? `<tr><td style="padding: 8px 0; color: #059669;">Bonus Credits</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #059669;">+$${(safeBonusCents / 100).toFixed(0)}</td></tr>` : ""}
                              <tr style="border-top: 2px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: 700; color: #374151;">Total Credits Added</td><td style="padding: 8px 0; text-align: right; font-weight: 700; color: #374151;">$${totalFormatted}</td></tr>
                              <tr><td style="padding: 8px 0; color: #6b7280;">New Balance</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1B365D;">$${balanceFormatted}</td></tr>
                            </table>
                            <div style="text-align: center; margin: 30px 0;">
                              <a href="https://rehablookup.com/provider/billing" style="background: #1B365D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Billing</a>
                            </div>
                          </div>
                          <div style="background-color: #1B365D; background: #1B365D; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="margin: 0; font-size: 13px; color: #cbd5e1; font-family: Arial, Helvetica, sans-serif;">RehabLookup — Connecting families with trusted treatment providers</p>
                          </div>
                        </div>
                      `,
                    }, { emailType: "credit_purchase_receipt", idempotencyKey: `credit-receipt-${session.id}` });
                    logStep("Credit purchase confirmation email sent", { email: purchaseEmail });
                  }
                } catch (emailErr) {
                  logStep("Warning: Credit purchase email failed (non-critical)", { error: String(emailErr) });
                }
              }

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

        // Notify provider on status transitions (past_due, cancel_at_period_end)
        if (mappedStatus === "past_due" || subscription.cancel_at_period_end) {
          const { data: proSub } = await supabaseAdmin
            .from("pro_subscriptions")
            .select("provider_id, facility_id")
            .eq("stripe_subscription_id", subscription.id)
            .maybeSingle();

          if (proSub) {
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

        // UPGRADE: Un-suspend any previously suspended facilities
        if (profile?.user_id && planTier === "pro") {
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
