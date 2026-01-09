import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-CONCIERGE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    logStep("Verifying session", { sessionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer'],
    });

    logStep("Session retrieved", { 
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
    });

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ 
          paid: false, 
          status: session.payment_status,
          message: "Payment not completed" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null;
    const customer = session.customer as Stripe.Customer | null;

    return new Response(
      JSON.stringify({
        paid: true,
        status: session.payment_status,
        email: session.customer_email || customer?.email,
        customerId: typeof session.customer === 'string' ? session.customer : customer?.id,
        paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : paymentIntent?.id,
        amountTotal: session.amount_total,
        metadata: session.metadata,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
