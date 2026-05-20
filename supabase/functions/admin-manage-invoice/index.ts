/**
 * RETIRED — 2026-05-18 monetization rebuild.
 *
 * `placement_invoices` and `provider_fee_status` were dropped under
 * the EKRA-compliant flat-fee model. The admin-side invoice editing UI
 * the master plan referenced is intentionally not built — Stripe-side
 * invoice management for Pro / Featured / Concierge subscriptions
 * lives in the Stripe Dashboard (admins access via the
 * customer-portal flow from /provider/billing or directly through
 * Stripe). International placement invoicing is handled by
 * `manage-international-case`.
 *
 * This endpoint is kept alive as a 410 Gone tombstone so any stale
 * callers fail loudly with a structured error code rather than
 * silently no-op.
 *
 * Mirrors the deployed version (id fc96c4db-… version 7).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
};
Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(
    JSON.stringify({
      error: "gone",
      code: "function_retired",
      message: "This endpoint was retired with the monetization rebuild. placement_invoices and provider_fee_status were dropped under the EKRA-compliant flat-fee model. Stripe-side invoice management for the surviving international flow is in manage-international-case.",
      retired_at: "2026-05-18",
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
