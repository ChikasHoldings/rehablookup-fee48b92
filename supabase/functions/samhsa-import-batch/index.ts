// SAMHSA facility import — batch upsert.
//
// POST a JSON body of up to MAX_PER_BATCH facilities. Idempotent: re-running
// the same batch is safe because we dedupe on (data_source='samhsa_import',
// samhsa_facility_id) via the unique index.
//
// Body shape:
// {
//   "batch_id": "optional-string-for-tracing",
//   "facilities": [
//     {
//       "samhsa_facility_id": "1-1234567890-1",   // REQUIRED — SAMHSA's own ID
//       "name": "Sunrise Recovery Center",         // REQUIRED
//       "facility_type": "Treatment Facility",     // REQUIRED — see SAMHSA_TYPE_MAP
//       "address": "123 Main St",                  // REQUIRED
//       "city": "Los Angeles",                     // REQUIRED
//       "state": "California",                     // REQUIRED — full state name
//       "zip_code": "90001",                       // REQUIRED
//       "phone": "+13105551234",                   // optional
//       "website": "https://example.com",          // optional
//       "description": "...",                      // optional
//       "year_established": 1998,                  // optional (int)
//       "gender_served": "All",                    // optional ("All" | "Male" | "Female")
//       "services": ["Outpatient", "Detox"],       // optional → facility_services
//       "insurance": ["Medicare", "Medicaid"],     // optional → facility_insurance
//       "age_groups": ["Adult", "Adolescent"],     // optional → facility_age_groups
//       "accreditations": ["SAMHSA", "CARF"]       // optional → facility_accreditations
//     }
//   ]
// }
//
// Auth: service-role JWT required (`Authorization: Bearer <SERVICE_ROLE_KEY>`).
// This is an admin/back-office tool — never callable by anonymous browsers.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

import { assertCronSecret } from "../_shared/cron-auth.ts";
const VERSION = "1.0.0";
const LOG = `[SAMHSA-IMPORT v${VERSION}]`;

const MAX_PER_BATCH = 500;
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};

interface SamhsaFacility {
  samhsa_facility_id: string;
  name: string;
  facility_type: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  year_established?: number;
  gender_served?: string;
  services?: string[];
  insurance?: string[];
  age_groups?: string[];
  accreditations?: string[];
}

interface RowResult {
  samhsa_facility_id: string;
  status: "inserted" | "updated" | "skipped" | "error";
  facility_id?: string;
  error?: string;
}

function trim(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function trimRequired(value: unknown, max: number, fieldName: string): string {
  const t = trim(value, max);
  if (!t) throw new Error(`required field "${fieldName}" is empty`);
  return t;
}

function asStringArray(value: unknown, max = 32): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => typeof v === "string" && v.trim())
    .map((v) => (v as string).trim().slice(0, 120))
    .slice(0, max);
}

// SAMHSA's gender field is sometimes "Male", "Female", "Both genders accepted",
// or various phrasings. Normalize to the project's enum-ish values.
function normalizeGender(raw?: string): string | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("female") && !s.includes("male")) return "Female";
  if (s.includes("male") && !s.includes("female")) return "Male";
  return "All";
}

async function processOne(
  admin: ReturnType<typeof createClient>,
  raw: unknown,
): Promise<RowResult> {
  if (!raw || typeof raw !== "object") {
    return {
      samhsa_facility_id: "<unparseable>",
      status: "error",
      error: "row is not an object",
    };
  }
  const r = raw as Record<string, unknown>;
  let samhsaId: string;

  try {
    samhsaId = trimRequired(r.samhsa_facility_id, 64, "samhsa_facility_id");
    const name = trimRequired(r.name, 200, "name");
    const facilityType = trimRequired(r.facility_type, 80, "facility_type");
    const address = trimRequired(r.address, 200, "address");
    const city = trimRequired(r.city, 80, "city");
    const state = trimRequired(r.state, 80, "state");
    const zipCode = trimRequired(r.zip_code, 12, "zip_code");

    // Look up an existing row by SAMHSA ID (idempotency key).
    const { data: existing, error: lookupErr } = await admin
      .from("facilities")
      .select("id, slug")
      .eq("data_source", "samhsa_import")
      .eq("samhsa_facility_id", samhsaId)
      .maybeSingle();
    if (lookupErr) throw new Error(`lookup failed: ${lookupErr.message}`);

    // Build the facility payload — common fields.
    const payload: Record<string, unknown> = {
      name,
      facility_type: facilityType,
      address,
      city,
      state,
      zip_code: zipCode,
      phone: trim(r.phone, 32),
      email: trim(r.email, 200),
      website: trim(r.website, 500),
      description: trim(r.description, 4000),
      gender_served: normalizeGender(typeof r.gender_served === "string" ? r.gender_served : undefined),
      year_established: typeof r.year_established === "number" && Number.isInteger(r.year_established)
        ? r.year_established
        : null,
      data_source: "samhsa_import",
      samhsa_facility_id: samhsaId,
      // SAMHSA-imported facilities start as approved + unverified +
      // unclaimed. They are not "featured". They become "verified" only
      // when SAMHSA accreditation is confirmed via the lookup-table side
      // (facility_accreditations).
      status: "approved",
      verified: false,
      featured: false,
    };

    let facilityId: string;
    let action: "inserted" | "updated";

    if (existing?.id) {
      // Update — keep existing slug to preserve URL stability. We omit slug
      // from the payload entirely so the BEFORE-UPDATE trigger doesn't
      // recompute it (it only regenerates when slug is NULL/empty).
      const { error: updErr } = await admin
        .from("facilities")
        .update(payload)
        .eq("id", existing.id);
      if (updErr) throw new Error(`update failed: ${updErr.message}`);
      facilityId = existing.id as string;
      action = "updated";
    } else {
      // Insert — leave slug unset; the BEFORE-INSERT trigger
      // `generate_facility_slug()` on the facilities table will derive a
      // unique slug from name+city+state and handle collisions by
      // appending an incrementing counter. Relying on the trigger removes
      // the previous fragile dependency on a same-named RPC (whose DDL was
      // not in the migrations folder) — if that RPC ever drifted out of
      // the DB the import would break completely.
      const { data: inserted, error: insErr } = await admin
        .from("facilities")
        .insert(payload)
        .select("id")
        .single();
      if (insErr) throw new Error(`insert failed: ${insErr.message}`);
      facilityId = (inserted as { id: string }).id;
      action = "inserted";
    }

    // ── Side tables: services / insurance / age_groups / accreditations
    // Replace strategy: delete-then-insert, scoped to this facility. Cheap
    // because each facility usually has <20 rows per side-table.

    const services = asStringArray(r.services);
    const insurance = asStringArray(r.insurance);
    const ageGroups = asStringArray(r.age_groups);
    const accreditations = asStringArray(r.accreditations);

    if (services.length > 0 || existing) {
      await admin.from("facility_services").delete().eq("facility_id", facilityId);
      if (services.length > 0) {
        await admin
          .from("facility_services")
          .insert(services.map((s) => ({ facility_id: facilityId, service_name: s })));
      }
    }
    if (insurance.length > 0 || existing) {
      await admin.from("facility_insurance").delete().eq("facility_id", facilityId);
      if (insurance.length > 0) {
        await admin
          .from("facility_insurance")
          .insert(insurance.map((i) => ({ facility_id: facilityId, insurance_name: i })));
      }
    }
    if (ageGroups.length > 0 || existing) {
      await admin.from("facility_age_groups").delete().eq("facility_id", facilityId);
      if (ageGroups.length > 0) {
        await admin
          .from("facility_age_groups")
          .insert(ageGroups.map((a) => ({ facility_id: facilityId, age_group: a })));
      }
    }
    if (accreditations.length > 0 || existing) {
      await admin.from("facility_accreditations").delete().eq("facility_id", facilityId);
      if (accreditations.length > 0) {
        await admin
          .from("facility_accreditations")
          .insert(accreditations.map((a) => ({
            facility_id: facilityId,
            accreditation_type: a,
            verified: false,
          })));
      }
    }

    return { samhsa_facility_id: samhsaId, status: action, facility_id: facilityId };
  } catch (err) {
    return {
      samhsa_facility_id: samhsaId ?? "<unknown>",
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const __cronAuth = assertCronSecret(req);
  if (!__cronAuth.ok) return __cronAuth.response;
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Service-role required. We deliberately don't accept a user JWT — this
  // function bypasses RLS to mass-insert public directory data and must
  // not be callable from a browser.
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) {
    return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
  }
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== serviceKey) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
    }
    const admin = createClient(supabaseUrl, serviceKey);

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return new Response("Payload too large", { status: 413, headers: corsHeaders });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
    }

    const facilities = Array.isArray((parsed as { facilities?: unknown[] })?.facilities)
      ? ((parsed as { facilities: unknown[] }).facilities)
      : Array.isArray(parsed)
      ? (parsed as unknown[])
      : [];

    const batchId = (parsed as { batch_id?: string })?.batch_id ?? "anonymous";

    if (facilities.length === 0) {
      return new Response(
        JSON.stringify({ batch_id: batchId, processed: 0, results: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (facilities.length > MAX_PER_BATCH) {
      return new Response(
        `Too many facilities in one batch (max ${MAX_PER_BATCH})`,
        { status: 413, headers: corsHeaders },
      );
    }

    console.log(LOG, `batch=${batchId} count=${facilities.length} starting`);

    const results: RowResult[] = [];
    // Sequential for predictable rate-limit + log ordering. A SAMHSA
    // import is a low-frequency back-office task, not a hot path.
    for (const f of facilities) {
      results.push(await processOne(admin, f as SamhsaFacility));
    }

    const summary = {
      inserted: results.filter((r) => r.status === "inserted").length,
      updated: results.filter((r) => r.status === "updated").length,
      errors: results.filter((r) => r.status === "error").length,
    };
    console.log(LOG, `batch=${batchId} done`, summary);

    return new Response(
      JSON.stringify({ batch_id: batchId, processed: results.length, summary, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(LOG, "ERROR", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
