import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ??
  Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/get-public-facilities`;

// Whitelist of fields that the edge function is permitted to expose.
// This list MUST exactly match the camelCase keys built in index.ts.
// If you intentionally add a public field, update this list AND the view.
const ALLOWED_FACILITY_KEYS = new Set<string>([
  "id",
  "name",
  "slug",
  "city",
  "state",
  "zipCode",
  "address",
  "phone",
  "description",
  "featured",
  "verified",
  "facilityType",
  "logoUrl",
  "galleryUrls",
  "yearEstablished",
  "treatmentTypes",
  "insuranceAccepted",
]);

// Fields that must NEVER be present in the response. These exist on the
// underlying `facilities` table but are excluded by `public_facilities`.
const FORBIDDEN_KEYS = [
  "user_id",
  "userId",
  "admin_notes",
  "adminNotes",
  "email",
  "reply_email",
  "replyEmail",
  "concierge_admissions_email",
  "concierge_admissions_phone",
  "concierge_admissions_contact",
  "concierge_notes",
  "concierge_network_opted_in",
  "lead_limit_override",
  "leadLimitOverride",
  "bonus_leads",
  "bonusLeads",
  "stripe_customer_id",
  "calculated_ranking_score",
  "calculatedRankingScore",
  "status",
  "suspended",
];

async function fetchFacilities() {
  const res = await fetch(FUNCTION_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });
  const body = await res.json();
  return { res, body };
}

Deno.test("get-public-facilities responds 200 with facilities array", async () => {
  const { res, body } = await fetchFacilities();
  assertEquals(res.status, 200);
  assertExists(body.facilities);
  assert(Array.isArray(body.facilities), "facilities must be an array");
});

Deno.test("get-public-facilities returns CDN cache headers", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });
  await res.text();
  const cacheControl = res.headers.get("cache-control") ?? "";
  assert(
    cacheControl.includes("max-age") || cacheControl.includes("s-maxage"),
    `Expected Cache-Control header, got: ${cacheControl}`,
  );
});

Deno.test("get-public-facilities only returns whitelisted fields", async () => {
  const { body } = await fetchFacilities();
  const facilities = body.facilities as Array<Record<string, unknown>>;

  if (facilities.length === 0) {
    console.warn("[test] No facilities returned — schema check skipped.");
    return;
  }

  for (const facility of facilities) {
    const keys = Object.keys(facility);
    for (const key of keys) {
      assert(
        ALLOWED_FACILITY_KEYS.has(key),
        `Facility ${facility.id} contains disallowed field "${key}". ` +
          `Allowed fields: ${Array.from(ALLOWED_FACILITY_KEYS).join(", ")}`,
      );
    }
  }
});

Deno.test("get-public-facilities never leaks PII or internal columns", async () => {
  const { body } = await fetchFacilities();
  const facilities = body.facilities as Array<Record<string, unknown>>;

  for (const facility of facilities) {
    for (const forbidden of FORBIDDEN_KEYS) {
      assert(
        !(forbidden in facility),
        `Facility ${facility.id} leaked forbidden field "${forbidden}"`,
      );
    }
  }
});

Deno.test("get-public-facilities returns expected shape for each facility", async () => {
  const { body } = await fetchFacilities();
  const facilities = body.facilities as Array<Record<string, unknown>>;

  if (facilities.length === 0) return;

  const sample = facilities[0];
  // Required core identity fields
  assertExists(sample.id, "id is required");
  assertExists(sample.name, "name is required");
  assertExists(sample.city, "city is required");
  assertExists(sample.state, "state is required");

  // Array fields must be arrays (never null) so the client can safely map.
  assert(Array.isArray(sample.galleryUrls), "galleryUrls must be an array");
  assert(Array.isArray(sample.treatmentTypes), "treatmentTypes must be an array");
  assert(
    Array.isArray(sample.insuranceAccepted),
    "insuranceAccepted must be an array",
  );

  // Boolean flags must be booleans (the function coerces nulls -> false).
  assertEquals(typeof sample.featured, "boolean");
  assertEquals(typeof sample.verified, "boolean");
});

Deno.test("get-public-facilities response top-level keys are stable", async () => {
  const { body } = await fetchFacilities();
  const topKeys = Object.keys(body);
  assertArrayIncludes(topKeys, ["facilities", "generatedAt", "count"]);
});
