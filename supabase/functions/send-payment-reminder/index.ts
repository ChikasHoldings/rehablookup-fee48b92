/**
 * RETIRED — monetization rebuild.
 *
 * This per-placement payment-reminder function queried `placement_invoices`
 * and `placement_cases`, both dropped under the EKRA-compliant flat-fee model,
 * so it errored ("Unknown error occurred") on every run. Its cron
 * (`send_payment_reminder`) has been unscheduled. Subscription billing
 * reminders are now handled by send-renewal-reminder /
 * send_subscription_renewal_reminders, and card failures by
 * notify-payment-failed + send-dunning-emails + the dunning banner on
 * /provider/billing. No replacement for placement-fee reminders.
 *
 * Mirrors the retry-failed-payments tombstone (same retired model).
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
      message: "This endpoint was retired with the monetization rebuild. placement_invoices and placement_cases were dropped under the EKRA-compliant flat-fee model. Subscription reminders are handled by send-renewal-reminder; card failures by notify-payment-failed + send-dunning-emails. No replacement.",
      retired_at: "2026-05-18",
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
