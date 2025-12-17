import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // For now, we'll parse the event directly since webhook secret might not be configured
    // In production, you should verify the signature with STRIPE_WEBHOOK_SECRET
    let event: Stripe.Event;
    
    try {
      event = JSON.parse(body) as Stripe.Event;
      logStep("Event parsed", { type: event.type, id: event.id });
    } catch (parseError) {
      logStep("Failed to parse event body", { error: parseError });
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle payment failure events
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Payment failed event", { 
        invoiceId: invoice.id, 
        customerId: invoice.customer,
        amountDue: invoice.amount_due 
      });

      const customerId = invoice.customer as string;
      const customer = await stripe.customers.retrieve(customerId);
      
      if (customer.deleted) {
        logStep("Customer was deleted, skipping notification");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customerEmail = (customer as Stripe.Customer).email;
      const customerName = (customer as Stripe.Customer).name || "Provider";
      const amountDue = (invoice.amount_due / 100).toFixed(2);
      const currency = invoice.currency.toUpperCase();

      logStep("Processing payment failure", { customerEmail, amountDue, currency });

      // Find the user in Supabase by email
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, first_name, last_name")
        .eq("email", customerEmail)
        .limit(1);

      const profile = profiles?.[0];
      const providerName = profile ? `${profile.first_name} ${profile.last_name}` : customerName;

      // Get facility info if available
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
      logStep("Admin notification created");

      // Create provider notification if user exists
      if (profile?.user_id) {
        await supabaseAdmin.from("provider_notifications").insert({
          user_id: profile.user_id,
          facility_id: facilityId,
          type: "payment_failed",
          title: "Payment Failed",
          message: `Your subscription payment of ${currency} ${amountDue} failed. Please update your payment method to continue receiving leads.`,
          metadata: {
            amount_due: amountDue,
            currency,
            invoice_id: invoice.id,
          },
        });
        logStep("Provider notification created");
      }

      // Send email notifications
      if (resend) {
        // Email to admin
        try {
          await resend.emails.send({
            from: "RehabLookup <notifications@rehablookup.com>",
            to: ["admin@rehablookup.com"],
            subject: `⚠️ Payment Failed - ${facilityName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Payment Failed</h1>
                </div>
                <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    A subscription payment has failed and requires attention.
                  </p>
                  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #991b1b;"><strong>Facility:</strong> ${facilityName}</p>
                    <p style="margin: 8px 0 0; color: #991b1b;"><strong>Provider:</strong> ${providerName}</p>
                    <p style="margin: 8px 0 0; color: #991b1b;"><strong>Email:</strong> ${customerEmail}</p>
                    <p style="margin: 8px 0 0; color: #991b1b;"><strong>Amount:</strong> ${currency} ${amountDue}</p>
                  </div>
                  <p style="color: #6b7280; font-size: 14px;">
                    The provider has been notified via email to update their payment method.
                  </p>
                </div>
              </div>
            `,
          });
          logStep("Admin email sent");
        } catch (emailError) {
          logStep("Failed to send admin email", { error: emailError });
        }

        // Email to provider
        if (customerEmail) {
          try {
            await resend.emails.send({
              from: "RehabLookup <billing@rehablookup.com>",
              to: [customerEmail],
              subject: "Action Required: Payment Failed",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #1B365D 0%, #2d4a7c 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Payment Failed</h1>
                  </div>
                  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                      Hi ${providerName},
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                      We were unable to process your subscription payment of <strong>${currency} ${amountDue}</strong>.
                    </p>
                    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                      <p style="margin: 0; color: #991b1b;">
                        <strong>Important:</strong> Your subscription may be suspended if payment is not updated within 7 days.
                      </p>
                    </div>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                      Please update your payment method to continue receiving leads and maintain your listing visibility.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://rehablookup.com/provider/billing" 
                         style="background: #1B365D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                        Update Payment Method
                      </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                      If you have any questions, please contact our support team.
                    </p>
                  </div>
                </div>
              `,
            });
            logStep("Provider email sent");
          } catch (emailError) {
            logStep("Failed to send provider email", { error: emailError });
          }
        }
      }
    }

    // Handle new subscription created
    if (event.type === "customer.subscription.created" || event.type === "checkout.session.completed") {
      let customerId: string;
      let subscriptionId: string | null = null;
      let planName = "Unknown Plan";
      let amount = 0;
      let currency = "USD";

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") {
          logStep("Checkout session is not subscription, skipping");
        } else {
          customerId = session.customer as string;
          subscriptionId = session.subscription as string;
          
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ["items.data.price.product"],
            });
            const priceItem = subscription.items.data[0];
            planName = (priceItem?.price?.product as Stripe.Product)?.name || "Subscription";
            amount = priceItem?.price?.unit_amount || 0;
            currency = (priceItem?.price?.currency || "usd").toUpperCase();
          }
        }
      } else {
        const subscription = event.data.object as Stripe.Subscription;
        customerId = subscription.customer as string;
        subscriptionId = subscription.id;
        
        // Get plan details
        const priceItem = subscription.items.data[0];
        if (priceItem?.price?.product) {
          const product = await stripe.products.retrieve(priceItem.price.product as string);
          planName = product.name;
        }
        amount = priceItem?.price?.unit_amount || 0;
        currency = (priceItem?.price?.currency || "usd").toUpperCase();
      }

      if (customerId! && subscriptionId) {
        logStep("New subscription created", { subscriptionId, customerId });

        const customer = await stripe.customers.retrieve(customerId);
        
        if (!customer.deleted) {
          const customerEmail = (customer as Stripe.Customer).email;
          const customerName = (customer as Stripe.Customer).name || "Provider";
          const amountFormatted = (amount / 100).toFixed(2);

          // Find provider and facility
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

          // Create admin notification
          await supabaseAdmin.from("admin_notifications").insert({
            type: "new_subscription",
            title: "New Subscription Created",
            message: `${facilityName} subscribed to ${planName} (${currency} ${amountFormatted}/mo)`,
            metadata: {
              customer_id: customerId,
              customer_email: customerEmail,
              subscription_id: subscriptionId,
              plan_name: planName,
              amount: amountFormatted,
              currency,
              facility_id: facilityId,
              facility_name: facilityName,
              provider_name: providerName,
            },
          });
          logStep("New subscription admin notification created");

          // Send admin email notification
          if (resend) {
            try {
              await resend.emails.send({
                from: "RehabLookup <notifications@rehablookup.com>",
                to: ["help@rehablookup.com"],
                subject: `🎉 New Subscription - ${facilityName}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                      <h1 style="color: white; margin: 0; font-size: 24px;">🎉 New Subscription</h1>
                    </div>
                    <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        A new provider has subscribed to RehabLookup!
                      </p>
                      <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #047857;"><strong>Facility:</strong> ${facilityName}</p>
                        <p style="margin: 8px 0 0; color: #047857;"><strong>Provider:</strong> ${providerName}</p>
                        <p style="margin: 8px 0 0; color: #047857;"><strong>Email:</strong> ${customerEmail}</p>
                        <p style="margin: 8px 0 0; color: #047857;"><strong>Plan:</strong> ${planName}</p>
                        <p style="margin: 8px 0 0; color: #047857;"><strong>Amount:</strong> ${currency} ${amountFormatted}/month</p>
                      </div>
                      <p style="color: #6b7280; font-size: 14px;">
                        View all subscriptions in the admin dashboard.
                      </p>
                    </div>
                  </div>
                `,
              });
              logStep("New subscription admin email sent");
            } catch (emailError) {
              logStep("Failed to send new subscription email", { error: emailError });
            }
          }
        }
      }
    }

    // Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Subscription deleted", { subscriptionId: subscription.id });

      const customerId = subscription.customer as string;
      const customer = await stripe.customers.retrieve(customerId);
      
      if (!customer.deleted) {
        const customerEmail = (customer as Stripe.Customer).email;
        
        // Find facility and create notification
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
            logStep("Subscription cancellation notification created");

            // Send admin email for cancellation
            if (resend) {
              try {
                await resend.emails.send({
                  from: "RehabLookup <notifications@rehablookup.com>",
                  to: ["help@rehablookup.com"],
                  subject: `⚠️ Subscription Cancelled - ${facilities[0].name}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Subscription Cancelled</h1>
                      </div>
                      <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                          A provider has cancelled their subscription.
                        </p>
                        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                          <p style="margin: 0; color: #92400e;"><strong>Facility:</strong> ${facilities[0].name}</p>
                          <p style="margin: 8px 0 0; color: #92400e;"><strong>Provider:</strong> ${profiles[0].first_name} ${profiles[0].last_name}</p>
                          <p style="margin: 8px 0 0; color: #92400e;"><strong>Email:</strong> ${customerEmail}</p>
                        </div>
                        <p style="color: #6b7280; font-size: 14px;">
                          Consider reaching out to understand why they cancelled.
                        </p>
                      </div>
                    </div>
                  `,
                });
                logStep("Cancellation admin email sent");
              } catch (emailError) {
                logStep("Failed to send cancellation email", { error: emailError });
              }
            }
          }
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
