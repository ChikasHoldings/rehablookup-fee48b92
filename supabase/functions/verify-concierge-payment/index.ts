/**
 * RETIRED — 2026-05-20 concierge workflow hardening.
 *
 * Domestic concierge is now FREE for seekers (the $29 intake fee was
 * retired in the 2026-05-18 monetization rebuild together with
 * create-concierge-checkout). This endpoint exists only as a 410 Gone
 * tombstone so any stale callers — old bookmarks, old `?session_id=`
 * deep-links, third-party Stripe Checkout redirects, etc. — fail loudly
 * with a structured error code instead of silently returning a 404 or
 * a misleading "payment not verified" message.
 *
 * If a client surfaces `code: "function_retired"` from this endpoint
 * that's a bug in the caller — track it down and route to the
 * supported flow (skipPayment:true on submit-concierge-intake).
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
      message: "This endpoint was retired with the 2026-05-18 monetization rebuild. Domestic concierge is now free for seekers; intakes submit directly via submit-concierge-intake with skipPayment:true.",
      retired_at: "2026-05-20",
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
