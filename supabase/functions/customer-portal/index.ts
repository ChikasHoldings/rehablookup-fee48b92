import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { classifyStripeError } from "../_shared/stripe-errors.ts";
import { withTimeout } from "../_shared/with-timeout.ts";

const VERSION = "1.2.0";
const STRIPE_TIMEOUT_MS = 12_000;
const SUPABASE_TIMEOUT_MS = 8_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[CUSTOMER-PORTAL] [${VERSION}] [${requestId}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

Deno.serve(async (req) => {
  const requestId = generateRequestId();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep(requestId, "Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep(requestId, "Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep(requestId, "Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await withTimeout(
      supabaseClient.auth.getUser(token),
      SUPABASE_TIMEOUT_MS,
      "supabase.auth.getUser",
    );
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep(requestId, "User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await withTimeout(
      stripe.customers.list({ email: user.email, limit: 1 }),
      STRIPE_TIMEOUT_MS,
      "stripe.customers.list",
    );
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found. Please subscribe to a plan first.");
    }
    const customerId = customers.data[0].id;
    logStep(requestId, "Found Stripe customer", { customerId });

    const origin = req.headers.get("origin") || "https://rehablookup.com";
    const portalSession = await withTimeout(
      stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/provider/billing`,
      }),
      STRIPE_TIMEOUT_MS,
      "stripe.billingPortal.sessions.create",
    );
    logStep(requestId, "Customer portal session created", { sessionId: portalSession.id });

    return new Response(JSON.stringify({ url: portalSession.url, requestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const classified = classifyStripeError(error);
    const rawMessage = error instanceof Error ? error.message : String(error);
    logStep(requestId, "ERROR in customer-portal", {
      raw: rawMessage,
      code: classified.code,
      retryable: classified.retryable,
    });
    return new Response(JSON.stringify({
      error: classified.message,
      code: classified.code,
      retryable: classified.retryable,
      requestId,
      _version: VERSION,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: classified.httpStatus,
    });
  }
});
