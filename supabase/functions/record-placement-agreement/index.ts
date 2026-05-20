/**
 * RETIRED — 2026-05-18 monetization rebuild.
 *
 * Domestic pay-per-admission placement agreements no longer exist
 * (EKRA compliance). This endpoint is kept alive as a 410 Gone
 * tombstone so any stale callers fail loudly.
 *
 * Mirrors the deployed version (id 1de68d8b-… version 4).
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
      message: "This endpoint was retired with the monetization rebuild. Domestic pay-per-admission placement agreements no longer exist (EKRA compliance).",
      retired_at: "2026-05-18",
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
