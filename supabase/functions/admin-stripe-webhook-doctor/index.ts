// admin-stripe-webhook-doctor v1.0.0
// Service-role-only diagnostic for the Stripe -> stripe-webhook pipeline.
// Reports (read-only, no mutations):
//   - whether STRIPE_WEBHOOK_SECRET / STRIPE_SECRET_KEY env are set
//   - the Stripe webhook endpoint for this project's stripe-webhook URL
//     (status, enabled events, api_version)
//   - the most recent Stripe account events (type, created, pending_webhooks)
//     so "no rows in stripe_webhook_events" can be attributed to either
//     "no events ever happened" or "events happened but delivery failed".
// Never returns secret values, only booleans.
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";

const VERSION = "1.0.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify({ ...body, _version: VERSION }, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Service-role gate (same shape as admin-register-stripe-webhook).
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  let role: string | null = null;
  try {
    const payload = token.split(".")[1];
    if (payload) role = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).role ?? null;
  } catch { /* null */ }
  if (role !== "service_role") return json(403, { error: "Forbidden" });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecretSet = !!Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey) return json(500, { error: "STRIPE_SECRET_KEY not configured", webhookSecretSet });

  const stripeMode = stripeKey.startsWith("sk_live_") || stripeKey.startsWith("rk_live_")
    ? "live"
    : stripeKey.startsWith("sk_test_") || stripeKey.startsWith("rk_test_") ? "test" : "unknown";

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const targetUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/stripe-webhook`;

  try {
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const endpoint = endpoints.data.find((e) => e.url === targetUrl) ?? null;

    const events = await stripe.events.list({ limit: 20 });
    const recentEvents = events.data.map((e) => ({
      id: e.id,
      type: e.type,
      created: new Date(e.created * 1000).toISOString(),
      pending_webhooks: e.pending_webhooks,
      livemode: e.livemode,
    }));

    return json(200, {
      stripeMode,
      webhookSecretSet,
      endpoint: endpoint
        ? {
            id: endpoint.id,
            url: endpoint.url,
            status: endpoint.status,
            api_version: endpoint.api_version,
            enabled_events: endpoint.enabled_events,
            created: new Date(endpoint.created * 1000).toISOString(),
          }
        : null,
      otherEndpoints: endpoints.data
        .filter((e) => e.url !== targetUrl)
        .map((e) => ({ id: e.id, url: e.url, status: e.status })),
      accountEventCountSampled: events.data.length,
      hasMoreEvents: events.has_more,
      recentEvents,
    });
  } catch (e) {
    return json(502, { error: e instanceof Error ? e.message : String(e), stripeMode, webhookSecretSet });
  }
});
