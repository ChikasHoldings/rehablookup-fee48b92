/**
 * RETIRED — 2026-05-20 international placement product wind-down.
 *
 * The paid international placement product ($3,000-per-admission) is
 * fully retired across the platform. This endpoint, which previously
 * advanced case status / issued invoices / triggered payment events,
 * is kept as a 410 Gone tombstone so any stale callers (admin UI
 * bookmarks, external webhooks) fail loudly with a structured
 * `function_retired` code.
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
      message: "The paid international placement product was retired 2026-05-20. No new case mutations are accepted.",
      retired_at: "2026-05-20",
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
