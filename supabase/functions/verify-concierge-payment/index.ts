import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-CONCIERGE-PAYMENT] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST only
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    // Validate sessionId format (Stripe checkout session IDs start with cs_)
    if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_') || sessionId.length > 200) {
      throw new Error("Invalid session ID format");
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

    // Check if already submitted (idempotency)
    const { data: existingInquiry } = await supabase
      .from('concierge_inquiries')
      .select('id')
      .eq('checkout_session_id', sessionId)
      .maybeSingle();

    logStep("Checked for existing inquiry", { 
      alreadySubmitted: !!existingInquiry,
      inquiryId: existingInquiry?.id 
    });

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
        alreadySubmitted: !!existingInquiry,
        inquiryId: existingInquiry?.id,
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
