/**
 * sync-google-reviews
 *
 * Two operating modes, sharing the same Google-Places fetch logic:
 *
 *   1. CRON mode (X-Cron-Secret header set):
 *      Nightly batch refresh of facility_reviews_config rows ordered
 *      by last_updated_at NULLS FIRST. Capped at MAX_PER_RUN per
 *      invocation. Scheduled at 04:35 UTC by migration
 *      20260730000000.
 *
 *   2. PROVIDER mode (Authorization header set + body.facility_id):
 *      Single-facility refresh fired from GoogleReviewsConfigCard
 *      right after the provider saves a new place_id, so the
 *      rating + count populate within seconds instead of waiting
 *      up to 24h for the cron. The Supabase client built from the
 *      caller JWT verifies the provider owns the facility via the
 *      existing user_owns_facility() helper — no separate auth.
 *
 * Both modes hit the same Place Details endpoint (Places API New v1)
 * with a tight X-Goog-FieldMask=id,rating,userRatingCount so we hit
 * the cheapest billing SKU instead of paying for the full payload.
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

type SyncCounts = {
  processed: number;
  updated: number;
  unchanged: number;
  notFound: number;
  failed: number;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchGooglePlace(placeId: string, key: string): Promise<
  | { kind: "ok"; place: GooglePlace }
  | { kind: "not_found" }
  | { kind: "error"; status: number; body: string }
> {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "id,rating,userRatingCount",
      Accept: "application/json",
    },
  });
  if (res.status === 404) return { kind: "not_found" };
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { kind: "error", status: res.status, body: body.slice(0, 200) };
  }
  const place = (await res.json()) as GooglePlace;
  return { kind: "ok", place };
}

// deno-lint-ignore no-explicit-any
async function applyPlaceToRow(supabase: any, row: ConfigRow, place: GooglePlace): Promise<"updated" | "unchanged" | "failed"> {
  const newRating =
    typeof place.rating === "number" && isFinite(place.rating)
      ? Math.round(place.rating * 100) / 100
      : null;
  const newCount =
    typeof place.userRatingCount === "number" && isFinite(place.userRatingCount)
      ? Math.max(0, Math.floor(place.userRatingCount))
      : null;

  const ratingChanged = (row.google_rating ?? null) !== newRating;
  const countChanged = (row.google_review_count ?? null) !== newCount;

  const { error } = await supabase
    .from("facility_reviews_config")
    .update({
      google_rating: newRating,
      google_review_count: newCount,
      last_updated_at: new Date().toISOString(),
    })
    .eq("facility_id", row.facility_id);

  if (error) {
    console.warn(
      "[sync-google-reviews] update failed for facility",
      row.facility_id,
      error.message,
    );
    return "failed";
  }
  return ratingChanged || countChanged ? "updated" : "unchanged";
}

// deno-lint-ignore no-explicit-any
async function syncRows(supabase: any, rows: ConfigRow[], key: string, paced: boolean): Promise<SyncCounts> {
  const counts: SyncCounts = { processed: 0, updated: 0, unchanged: 0, notFound: 0, failed: 0 };
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    counts.processed++;
    if (!row.google_place_id?.trim()) {
      counts.failed++;
      continue;
    }
    let result: Awaited<ReturnType<typeof fetchGooglePlace>>;
    try {
      result = await fetchGooglePlace(row.google_place_id.trim(), key);
    } catch (err) {
      counts.failed++;
      console.warn(
        "[sync-google-reviews] fetch threw:",
        err instanceof Error ? err.message : String(err),
      );
      if (paced && i < rows.length - 1) await sleep(REQUEST_DELAY_MS);
      continue;
    }
    if (result.kind === "not_found") {
      counts.notFound++;
      console.warn("[sync-google-reviews] place not found:", row.google_place_id);
    } else if (result.kind === "error") {
      counts.failed++;
      console.warn("[sync-google-reviews] non-OK response:", result.status, result.body);
    } else {
      const outcome = await applyPlaceToRow(supabase, row, result.place);
      counts[outcome]++;
    }
    if (paced && i < rows.length - 1) await sleep(REQUEST_DELAY_MS);
  }
  return counts;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SB_URL = Deno.env.get("SUPABASE_URL");
  const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY");
  const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const G_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

  if (!SB_URL || !SB_SVC || !SB_ANON) {
    return json({ error: "Missing Supabase credentials" }, 500);
  }
  if (!G_KEY) {
    console.error("[sync-google-reviews] GOOGLE_PLACES_API_KEY not configured");
    return json({ error: "Sync service not configured" }, 500);
  }

  const supabase = createClient(SB_URL, SB_SVC);
  const startedAt = Date.now();

  // ─── Auth-mode selection ─────────────────────────────────────────────
  // If the caller sends X-Cron-Secret, run the batch path. Otherwise
  // expect a provider JWT + body.facility_id and refresh just that one
  // facility. Each path validates its own credentials — no mode can
  // bypass the other's check by mixing headers.
  const hasCronSecret = !!req.headers.get("x-cron-secret");

  if (hasCronSecret) {
    const auth = assertCronSecret(req);
    if (!auth.ok) return auth.response;

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
      return json({ ok: true, mode: "cron", processed: 0, message: "No configured facilities to sync." });
    }
    const counts = await syncRows(supabase, rows, G_KEY, /* paced */ true);
    return json({ ok: true, mode: "cron", elapsed_ms: Date.now() - startedAt, ...counts });
  }

  // ─── Provider single-facility mode ──────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return json({ error: "Missing authorization" }, 401);
  }

  // User-scoped client so RLS / user_owns_facility can verify the
  // caller actually owns the facility they're asking us to sync.
  const userClient = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: { facility_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const facilityId = body.facility_id?.trim();
  if (!facilityId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(facilityId)) {
    return json({ error: "facility_id (uuid) required" }, 400);
  }

  // Ownership check via the same helper RLS uses. Service-role
  // client does the function call so we don't double-pass the JWT
  // header (and so the call works the same regardless of admin
  // role on the calling JWT).
  const { data: ownsRaw, error: ownErr } = await supabase.rpc("user_owns_facility", {
    _facility_id: facilityId,
    _user_id: user.id,
  });
  if (ownErr) {
    console.warn("[sync-google-reviews] user_owns_facility error:", ownErr.message);
    return json({ error: "Authorization check failed" }, 500);
  }
  if (!ownsRaw) {
    return json({ error: "Forbidden — facility not owned by caller" }, 403);
  }

  const { data: configRow, error: configErr } = await supabase
    .from("facility_reviews_config")
    .select("facility_id, google_place_id, google_rating, google_review_count, last_updated_at")
    .eq("facility_id", facilityId)
    .maybeSingle();

  if (configErr) {
    return json({ error: "Could not load config" }, 500);
  }
  if (!configRow || !configRow.google_place_id) {
    return json({ ok: true, mode: "provider", message: "No place_id configured for this facility yet." });
  }

  const counts = await syncRows(supabase, [configRow as ConfigRow], G_KEY, /* paced */ false);
  return json({ ok: true, mode: "provider", facility_id: facilityId, elapsed_ms: Date.now() - startedAt, ...counts });
});
