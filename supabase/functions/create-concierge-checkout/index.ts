/**
 * RETIRED — 2026-05-18 monetization rebuild.
 *
 * Domestic concierge is now FREE for seekers. Providers subscribe to the
 * Concierge Partner add-on via `create-checkout-session` instead. This
 * endpoint is kept alive as a 410 Gone tombstone so any stale callers
 * fail loudly with a structured error code rather than silently no-op.
 *
 * If a client surfaces `code: "function_retired"` from this endpoint,
 * that's a bug in the caller — track it down and route to the
 * supported flow.
 *
 * Mirrors the deployed version (id f97c45a7-… version 7).
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
      message: "This endpoint was retired with the monetization rebuild. Domestic concierge is now free for seekers; providers subscribe to the Concierge Partner add-on via create-checkout-session.",
      retired_at: "2026-05-18",
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
