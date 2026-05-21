/**
 * RETIRED — 2026-05-20 international placement product wind-down.
 *
 * The paid international placement product ($3,000-per-admission) is
 * fully retired across the platform. This endpoint, which previously
 * persisted in-progress intake drafts from the 11-step international
 * application form, is kept as a 410 Gone tombstone so any stale
 * callers (browser refreshes mid-form, bookmarked draft URLs) fail
 * loudly.
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
      message: "The paid international placement product was retired 2026-05-20. No new intake drafts are persisted.",
      retired_at: "2026-05-20",
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
