import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Legacy product IDs that map to Pro tier
const PRO_PRODUCT_IDS = [
  "prod_TbalLOPujTIoUe", // legacy professional
  "prod_Tbyz1bf6iYyzYd", // professional
  "prod_TbalOeJZA2ZoJl", // legacy featured
  "prod_TbyzJVNOQL71NN", // featured
];

serve(async (req) => {
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

    let event: Stripe.Event;
    
    try {
      event = JSON.parse(body) as Stripe.Event;
      logStep("Event parsed", { type: event.type, id: event.id });
    } catch (parseError) {
      logStep("Failed to parse event body", { error: String(parseError) });
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // Handle checkout.session.completed
    // Handles: Credit purchases, Pro subscriptions, Additional listing slots
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

      // CREDIT PURCHASE FULFILLMENT
      if (session.mode === "payment" && metadataType === "credit_purchase") {
        const amountCents = parseInt(session.metadata?.amount_cents || "0", 10);
        const facilityId = session.metadata?.facility_id;
        const userId = session.metadata?.user_id;

        if (amountCents > 0 && userId && facilityId) {
          logStep("Processing credit purchase", { amountCents, facilityId, userId });

          // Get current credit balance
          const { data: existingCredits } = await supabaseAdmin
            .from("provider_credits")
            .select("balance_cents")
            .eq("provider_id", userId)
            .maybeSingle();

          const currentBalance = existingCredits?.balance_cents ?? 0;
          const newBalance = currentBalance + amountCents;

          // Upsert credit balance
          const { error: creditError } = await supabaseAdmin
            .from("provider_credits")
            .upsert({
              provider_id: userId,
              facility_id: facilityId,
              balance_cents: newBalance,
              updated_at: new Date().toISOString(),
            }, { onConflict: "provider_id" });

          if (creditError) {
            logStep("Error updating credits", { error: creditError.message });
          } else {
            logStep("Credits added successfully", { previousBalance: currentBalance, newBalance });

            // Log the credit transaction
            await supabaseAdmin.from("credit_transactions").insert({
              provider_id: userId,
              facility_id: facilityId,
              amount_cents: amountCents,
              transaction_type: "purchase",
              reference_id: session.id,
              description: `Purchased $${(amountCents / 100).toFixed(2)} in credits`,
              stripe_payment_intent_id: session.payment_intent as string,
            });

            // Create provider notification
            await supabaseAdmin.from("provider_notifications").insert({
              user_id: userId,
              facility_id: facilityId,
              type: "credits_added",
              title: "Credits Added",
              message: `$${(amountCents / 100).toFixed(2)} credits have been added to your account.`,
              metadata: { amount_cents: amountCents, new_balance: newBalance },
            });

            logStep("Credit purchase fully processed");
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

            await supabaseAdmin.from("provider_notifications").insert({
              user_id: userId,
              facility_id: facilityId,
              type: "subscription_active",
              title: "Pro Subscription Activated!",
              message: "You now have 20% off all lead unlocks, featured placement, and can list up to 5 facilities.",
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
    // Handle invoice.payment_failed
    // ==========================================
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
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
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1B365D 0%, #2d4a7c 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">Payment Failed</h1>
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

    // ==========================================
    // Handle invoice.payment_succeeded
    // ==========================================
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Invoice payment succeeded", { invoiceId: invoice.id, amountPaid: invoice.amount_paid });

      if (invoice.subscription) {
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
              to: ["help@rehablookup.com"],
              subject: `🎉 New Subscription - ${facilityName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">🎉 New Subscription</h1>
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
    }

    // ==========================================
    // Handle customer.subscription.deleted
    // ==========================================
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      logStep("Subscription deleted", { subscriptionId: subscription.id });

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
                  to: ["help@rehablookup.com"],
                  subject: `⚠️ Subscription Cancelled - ${facilities[0].name}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Subscription Cancelled</h1>
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
    }

    // ==========================================
    // Handle payment_intent.payment_failed (placement fees)
    // ==========================================
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const invoiceId = paymentIntent.metadata?.invoice_id;
      
      if (invoiceId) {
        logStep("Placement fee payment failed", { paymentIntentId: paymentIntent.id, invoiceId });
        
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
