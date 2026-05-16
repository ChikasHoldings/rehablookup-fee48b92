/* eslint-disable no-console */
/**
 * scripts/featured-strip-fairness.ts
 *
 * Simulates 1,000 visitor seeds against one Featured placement
 * bucket, counts how many times each facility appears at each
 * position in the strip, and reports the per-facility variance.
 *
 * The rotation algorithm is pure round-robin on `seed % pool_size`,
 * so over uniformly-distributed seeds every facility should appear
 * an equal number of times at every position. The spec's bar is
 * variance < 5% of mean — anything higher means the algorithm has
 * drifted.
 *
 * Run locally:
 *   npx tsx scripts/featured-strip-fairness.ts \
 *     --bucket=homepage:national --slots=10 --seeds=1000
 *
 * Pool is read directly from Postgres so the simulation matches what
 * the edge function would return (modulo the activated_at sort
 * stability, which both share).
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY before running.");
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

const bucket = (args.bucket as string) || "homepage:national";
const slots = parseInt((args.slots as string) || "10", 10);
const seeds = parseInt((args.seeds as string) || "1000", 10);

const [placement_type, placement_value] = bucket.split(":");
if (!placement_type || !placement_value) {
  console.error("--bucket must be in form type:value (e.g. homepage:national)");
  process.exit(1);
}

(async () => {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: poolRaw, error } = await sb
    .from("featured_placements")
    .select(`
      facility_id,
      activated_at,
      facilities!inner ( name ),
      facility_subscriptions!inner ( has_featured, status )
    `)
    .eq("active", true)
    .eq("placement_type", placement_type)
    .eq("placement_value", placement_value)
    .eq("facility_subscriptions.has_featured", true)
    .eq("facility_subscriptions.status", "active")
    .order("activated_at", { ascending: true });

  if (error) {
    console.error("Pool fetch failed:", error);
    process.exit(1);
  }

  const pool = (poolRaw ?? []).map((row) => {
    const facility = (row as { facilities: { name: string } | { name: string }[] | null }).facilities;
    const f = Array.isArray(facility) ? facility[0] : facility;
    return {
      facility_id: (row as { facility_id: string }).facility_id,
      name: f?.name ?? "(unknown)",
    };
  });

  if (pool.length === 0) {
    console.log(`Empty pool for ${bucket}. Add some active Featured placements to simulate.`);
    process.exit(0);
  }

  console.log(`Pool size for ${bucket}: ${pool.length} facilities`);
  console.log(`Simulating ${seeds} visitor seeds × ${slots} slots/seed = ${seeds * slots} total impressions`);
  console.log("");

  // impressions[facility_id] = total count across all seeds
  // position[facility_id][slot] = count of times facility appeared at slot
  const impressions = new Map<string, number>();
  const byPosition: Map<string, number[]> = new Map();
  for (const f of pool) {
    impressions.set(f.facility_id, 0);
    byPosition.set(f.facility_id, new Array(slots).fill(0));
  }

  for (let s = 0; s < seeds; s++) {
    const seed = Math.floor(Math.random() * 100);
    const startIndex = seed % pool.length;
    const sliceLen = Math.min(slots, pool.length);
    for (let i = 0; i < sliceLen; i++) {
      const f = pool[(startIndex + i) % pool.length];
      impressions.set(f.facility_id, (impressions.get(f.facility_id) ?? 0) + 1);
      byPosition.get(f.facility_id)![i]++;
    }
  }

  const counts = Array.from(impressions.values());
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance =
    counts.reduce((acc, c) => acc + (c - mean) ** 2, 0) / counts.length;
  const stddev = Math.sqrt(variance);
  const cv = (stddev / mean) * 100;

  console.log("Per-facility impression counts:");
  for (const f of pool) {
    const total = impressions.get(f.facility_id) ?? 0;
    const positions = byPosition.get(f.facility_id) ?? [];
    console.log(
      `  ${f.name.padEnd(40)} total=${String(total).padStart(5)}  positions=[${positions.join(", ")}]`,
    );
  }
  console.log("");
  console.log(`mean      = ${mean.toFixed(2)}`);
  console.log(`stddev    = ${stddev.toFixed(2)}`);
  console.log(`CV (% of mean) = ${cv.toFixed(2)}%`);
  console.log("");
  if (cv < 5) {
    console.log("✅ Variance < 5% of mean — fair rotation confirmed.");
  } else {
    console.log("⚠️ Variance ≥ 5% of mean — rotation may have drifted from round-robin.");
  }
})();
