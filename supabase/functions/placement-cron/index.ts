/**
 * RETIRED — superseded by `placement-monitor`.
 *
 * This function was never scheduled in pg_cron (only `placement-monitor`
 * is — see migration 20260827000300_schedule_placement_monitor_cron.sql),
 * and its source had drifted to reference columns that don't exist on the
 * current schema (`email` vs `user_email`) plus milestone columns from a
 * migration that was never applied. Rather than leave bug-carrying dead
 * code that could be revived by mistake, it now returns 410 Gone.
 *
 * The live placement lifecycle automation (SLA alerts, provider-timeout
 * auto-decline, seeker reminders, auto-introductions, stale-case cleanup)
 * runs in `placement-monitor`.
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
      message: "placement-cron was retired — it was never scheduled and superseded by placement-monitor.",
      retired_at: "2026-05-27",
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
