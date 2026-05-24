/**
 * sync-google-reviews
 *
 * Nightly cron-driven sync that refreshes Google rating + review-count
 * for every facility_reviews_config row a provider has configured a
 * place_id on. Writes the latest aggregate values back so the public
 * profile (and the GoogleReviewsConfigCard in the provider portal)
 * surfaces the right numbers.
 *
 * Calls Google Maps "Places API (New)" v1 Place Details endpoint with
 * a tight field mask (rating + userRatingCount only) so the API cost
 * stays at the cheapest billing SKU.
 *
 *   GET https://places.googleapis.com/v1/places/<place_id>
 *     ?fields=id,rating,userRatingCount
 *   Headers:
 *     X-Goog-Api-Key:    <env GOOGLE_PLACES_API_KEY>
 *     X-Goog-FieldMask:  id,rating,userRatingCount
 *
 * Auth model:
 *   - X-Cron-Secret header required (assertCronSecret).
 *   - No JWT verification (pg_cron has no user context).
 *   - GOOGLE_PLACES_API_KEY is a Supabase project secret; never
 *     embedded in source or logged at any level.
 *
 * Idempotency / rate limits:
 *   - Re-running the function is safe: each fetch is independent, and
 *     UPDATEs are stamped with now() each pass.
 *   - We sort configs by last_updated_at NULLS FIRST so the oldest
 *     row in the queue gets refreshed first, then walk the list with
 *     a 120ms inter-request delay (≈8 req/s — well under Google's
 *     default per-key quota and gentle enough to avoid 429s).
 *   - Caps at 500 facilities per run so a misconfigured key on a
 *     large dataset doesn't blow through the daily quota in one go.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { assertCronSecret } from "../_shared/cron-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const MAX_PER_RUN = 500;
const REQUEST_DELAY_MS = 120;

interface ConfigRow {
  facility_id: string;
  google_place_id: string;
  google_rating: number | null;
  google_review_count: number | null;
  last_updated_at: string | null;
}

interface GooglePlace {
  id?: string;
  rating?: number;
  userRatingCount?: number;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = assertCronSecret(req);
  if (!auth.ok) return auth.response;

  const SB_URL = Deno.env.get("SUPABASE_URL");
  const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const G_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

  if (!SB_URL || !SB_SVC) {
    return json({ error: "Missing Supabase credentials" }, 500);
  }
  if (!G_KEY) {
    // Fail loudly so the cron retry queue surfaces the misconfig in
    // logs but never leak the env-var name into a user response.
    console.error("[sync-google-reviews] GOOGLE_PLACES_API_KEY not configured");
    return json({ error: "Sync service not configured" }, 500);
  }

  const supabase = createClient(SB_URL, SB_SVC);

  // Pull the next batch — oldest-stale-first so we don't starve any
  // single facility while always-refreshing the most-recently-edited.
  const { data: configs, error: fetchErr } = await supabase
    .from("facility_reviews_config")
    .select("facility_id, google_place_id, google_rating, google_review_count, last_updated_at")
    .not("google_place_id", "is", null)
    .order("last_updated_at", { ascending: true, nullsFirst: true })
    .limit(MAX_PER_RUN);

  if (fetchErr) {
    console.error("[sync-google-reviews] config fetch failed:", fetchErr.message);
    return json({ error: "Could not load review configs" }, 500);
  }

  const rows = (configs ?? []) as ConfigRow[];
  if (rows.length === 0) {
    return json({ ok: true, processed: 0, message: "No configured facilities to sync." });
  }

  const startedAt = Date.now();
  const counts = { processed: 0, updated: 0, unchanged: 0, notFound: 0, failed: 0 };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    counts.processed++;

    const placeId = row.google_place_id?.trim();
    if (!placeId) {
      counts.failed++;
      continue;
    }

    let place: GooglePlace | null = null;
    try {
      const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": G_KEY,
          "X-Goog-FieldMask": "id,rating,userRatingCount",
          Accept: "application/json",
        },
      });
      if (res.status === 404) {
        // The place ID the provider entered is invalid (typo or
        // Google replaced the entry). Skip silently — we don't want
        // to NULL out an existing rating just because one fetch
        // failed; admin can flag this row out-of-band if the failure
        // is persistent. Logging here lets us notice the pattern.
        counts.notFound++;
        console.warn("[sync-google-reviews] place not found:", placeId);
        continue;
      }
      if (!res.ok) {
        counts.failed++;
        const body = await res.text().catch(() => "");
        // Truncate response in logs so a Google error containing the
        // full request URL (with key) can't accidentally leak even
        // though we don't pass the key in the URL anyway.
        console.warn(
          "[sync-google-reviews] non-OK response:",
          res.status,
          body.slice(0, 200),
        );
        continue;
      }
      place = (await res.json()) as GooglePlace;
    } catch (err) {
      counts.failed++;
      console.warn(
        "[sync-google-reviews] fetch threw:",
        err instanceof Error ? err.message : String(err),
      );
      // Pace before the next iteration even on failure so a flaky
      // Google endpoint doesn't trigger a tight retry loop.
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    if (!place) {
      counts.failed++;
      continue;
    }

    const newRating =
      typeof place.rating === "number" && isFinite(place.rating) ? Math.round(place.rating * 100) / 100 : null;
    const newCount =
      typeof place.userRatingCount === "number" && isFinite(place.userRatingCount)
        ? Math.max(0, Math.floor(place.userRatingCount))
        : null;

    const ratingChanged = (row.google_rating ?? null) !== newRating;
    const countChanged = (row.google_review_count ?? null) !== newCount;

    if (!ratingChanged && !countChanged) {
      counts.unchanged++;
    } else {
      counts.updated++;
    }

    const { error: updErr } = await supabase
      .from("facility_reviews_config")
      .update({
        google_rating: newRating,
        google_review_count: newCount,
        last_updated_at: new Date().toISOString(),
      })
      .eq("facility_id", row.facility_id);

    if (updErr) {
      counts.failed++;
      console.warn(
        "[sync-google-reviews] update failed for facility",
        row.facility_id,
        updErr.message,
      );
    }

    // Pace between requests so we stay below Google's per-key QPS.
    // Skip the sleep on the last iteration so the function returns
    // promptly to the cron caller.
    if (i < rows.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  const elapsedMs = Date.now() - startedAt;
  return json({
    ok: true,
    elapsed_ms: elapsedMs,
    ...counts,
  });
});
