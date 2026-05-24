/**
 * run-re-verification-sweep
 *
 * Nightly orchestrator for the re-verification monitoring engine.
 * Calls three SECURITY DEFINER RPCs in order:
 *
 *   1. run_data_feed_diff()    — primary continuous monitor against
 *                                staged_samhsa / staged_directory
 *   2. run_expiry_sweep()      — accreditation expiry warnings
 *                                (60d / 30d) + medium signal for past-due
 *   3. run_backstop_sweep(N)   — periodic revalidation for facilities
 *                                older than the configured backstop
 *                                window with no detected delta
 *
 * Cron-only: 4:50 UTC via pg_cron (migration registers the job). Uses
 * the shared X-Cron-Secret pattern.
 *
 * Each RPC returns a small JSON summary; we surface aggregate counts
 * back to the caller for monitoring.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { assertCronSecret } from "../_shared/cron-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = assertCronSecret(req);
  if (!auth.ok) return auth.response;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Server misconfigured: SUPABASE_URL / SERVICE_KEY missing" }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const started = Date.now();
  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  try {
    const { data, error } = await supabase.rpc("run_data_feed_diff");
    if (error) throw error;
    results.data_feed = data;
  } catch (err) {
    errors.push(`data_feed: ${(err as Error).message ?? err}`);
  }

  try {
    const { data, error } = await supabase.rpc("run_expiry_sweep");
    if (error) throw error;
    results.expiry = data;
  } catch (err) {
    errors.push(`expiry: ${(err as Error).message ?? err}`);
  }

  try {
    const { data, error } = await supabase.rpc("run_backstop_sweep", { p_limit: 200 });
    if (error) throw error;
    results.backstop = data;
  } catch (err) {
    errors.push(`backstop: ${(err as Error).message ?? err}`);
  }

  const durationMs = Date.now() - started;
  if (errors.length > 0) {
    console.error("[re-verification-sweep] partial failure", errors, results);
    return json({ ok: false, results, errors, duration_ms: durationMs }, 207);
  }

  console.log("[re-verification-sweep] complete", { duration_ms: durationMs, results });
  return json({ ok: true, results, duration_ms: durationMs });
});
