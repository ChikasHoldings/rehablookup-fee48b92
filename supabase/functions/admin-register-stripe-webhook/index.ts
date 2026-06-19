// admin-register-stripe-webhook
// ──────────────────────────────
// One-shot admin endpoint that registers our Supabase-hosted
// stripe-webhook function as a Stripe webhook endpoint with the
// full event set we care about. Idempotent: if an endpoint already
// exists for the target URL, returns it without creating a duplicate.
//
// Body (optional): { url?: string }   — defaults to the production
//                                       stripe-webhook URL.
//
// Returns: { endpointId, url, events, secret }
//   `secret` is the Stripe-issued signing secret for new endpoints
//   (only present when we just created it). PASTE THIS into Supabase
//   function secrets as STRIPE_WEBHOOK_SECRET so verifyEvent() can
//   validate inbound signatures. For pre-existing endpoints the
//   secret is not retrievable via the API — you must rotate it from
//   the Stripe Dashboard if you've lost it.
//
// Auth: service-role JWT only (format-agnostic).
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";

const VERSION = "1.0.0";

// Derive from the function's own environment so this isn't pinned to a single
// project ref (L8 — hygiene). Falls back to the prod URL only if SUPABASE_URL
// is somehow unset.
const DEFAULT_URL =
  `${Deno.env.get("SUPABASE_URL") ?? "https://mldbxpntzcjalgjmwnqa.supabase.co"}/functions/v1/stripe-webhook`;

const EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "invoice.paid",
  "charge.refunded",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Service-role gate
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  let role: string | null = null;
  try {
    const payload = token.split(".")[1];
    if (payload) {
      const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      role = decoded.role ?? null;
    }
  } catch { /* role stays null */ }
  if (role !== "service_role") {
    return new Response(JSON.stringify({ error: "Forbidden", _version: VERSION }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not configured", _version: VERSION }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });

  let body: { url?: string } = {};
  try { body = await req.json(); } catch { /* default body */ }
  const targetUrl = (body.url && body.url.trim()) || DEFAULT_URL;

  try {
    // (1) Look for an existing endpoint with this URL — idempotency.
    const existing = await stripe.webhookEndpoints.list({ limit: 100 });
    const match = existing.data.find((e) => e.url === targetUrl);

    if (match) {
      // Ensure the events list is current. Update if drift.
      const currentSet = new Set(match.enabled_events as string[]);
      const targetSet = new Set(EVENTS);
      const drift =
        currentSet.size !== targetSet.size ||
        EVENTS.some((e) => !currentSet.has(e));
      if (drift) {
        const updated = await stripe.webhookEndpoints.update(match.id, {
          enabled_events: EVENTS as Stripe.WebhookEndpointUpdateParams.EnabledEvent[],
        });
        return new Response(
          JSON.stringify({
            action: "updated_events",
            endpointId: updated.id,
            url: updated.url,
            events: updated.enabled_events,
            secret: null,
            note:
              "Endpoint already existed; events list updated. Signing secret was set when the endpoint was first created — rotate from Stripe Dashboard if you've lost it.",
            _version: VERSION,
          }, null, 2),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          action: "already_registered",
          endpointId: match.id,
          url: match.url,
          events: match.enabled_events,
          secret: null,
          note:
            "Endpoint already exists and event list matches. The signing secret is not retrievable via API; rotate from Stripe Dashboard if you've lost it.",
          _version: VERSION,
        }, null, 2),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // (2) Create new endpoint
    const created = await stripe.webhookEndpoints.create({
      url: targetUrl,
      enabled_events: EVENTS as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
      description: "RehabLookup main Stripe webhook (created by admin-register-stripe-webhook)",
    });

    return new Response(
      JSON.stringify({
        action: "created",
        endpointId: created.id,
        url: created.url,
        events: created.enabled_events,
        secret: created.secret,
        note:
          "Webhook created. COPY THE `secret` AND PASTE IT into Supabase function secrets as STRIPE_WEBHOOK_SECRET (or whatever env var stripe-webhook reads). The secret is shown ONLY on create — you cannot retrieve it later via API.",
        _version: VERSION,
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg, _version: VERSION }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
