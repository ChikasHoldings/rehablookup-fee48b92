/**
 * RETIRED — 2026-05-18 monetization rebuild.
 *
 * `placement_invoices`, `placement_fee_events`, and
 * `provider_fee_status` (concierge_inquiries) were all dropped under
 * the EKRA-compliant flat-fee model. No replacement. Card failures on
 * Pro subscriptions are now handled by Stripe's native dunning loop +
 * `notify-payment-failed` + the dunning banner on
 * `/provider/billing`.
 *
 * Mirrors the deployed version (id 799e6a7f-… version 8).
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
      message: "This endpoint was retired with the monetization rebuild. placement_invoices, placement_fee_events, and provider_fee_status (concierge_inquiries) were all dropped under the EKRA-compliant flat-fee model. No replacement.",
      retired_at: "2026-05-18",
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
