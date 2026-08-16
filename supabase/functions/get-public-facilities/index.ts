import { createServiceClient } from "../_shared/supabase-client.ts";
import { filterRowsWithKeys, pluckNonNull } from "../_shared/nullable-rows.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  // Browser cache 1 min, CDN cache 2 min, serve stale up to 1 hour while
  // revalidating in background. The tight s-maxage bounds the worst-case
  // staleness for newly approved facilities to ~2 min for first-time
  // visitors hitting the CDN; active sessions are refreshed via the
  // realtime invalidation hook in useStaticFacilities (instant), and
  // stale-while-revalidate keeps response latency low even on cache miss.
  // Pre-2026-05-21 this was max-age=300/s-maxage=600 (10-min CDN), which
  // meant admin-approved facilities took up to 10 min to appear in search.
  "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=3600",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GET-PUBLIC-FACILITIES] ${step}${detailsStr}`);
};

// Fetch EVERY row, paging past PostgREST's max-rows cap with .range(). Without
// this, large tables (facilities ~3.8k, facility_services ~17k,
// facility_insurance ~14k) are silently truncated to the API row limit
// (default 1000) — which starved directory/city/state/treatment/insurance
// pages of most facilities. Stops at the first short page.
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string,
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to fetch ${label}: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Strongly-typed service-role client — `.from(...).select/insert/update`
    // calls below are now fully inferred from the generated `Database` type.
    // Missing env vars throw inside the helper with a clear message.
    const supabase = createServiceClient();

    // Fetch all approved facilities with public-safe columns. Field set
    // intentionally tracks the consumers in src/hooks/useStaticFacilities.ts
    // and the search/sort pipeline in src/pages/SearchResults.tsx — adding a
    // field downstream without surfacing it here was the root cause of
    // several "sort silently does nothing" bugs (see docs/search-audit-
    // 2026-05-21.md §3).
    //
    // PHONE IS PRO-GATED — and it is the ONLY Pro-gated contact field.
    //   A previous revision of this comment claimed "phone/email/website are
    //   masked to null by the public_facilities view for non-Pro facilities".
    //   That was false on three counts: the view's Pro CASE on phone had been
    //   dropped (20260714000000) so nothing was masked at all, and `email`
    //   and `website` are not Pro-gated by product decision — website is
    //   ordinary directory metadata that Free listings keep.
    //
    //   The view now masks phone via has_active_pro(id)
    //   (20260831000000_pro_gate_public_facility_phone.sql). This function
    //   ALSO masks it below, on the canonical `is_pro` projection, because it
    //   reads with the SERVICE ROLE — which bypasses RLS by design and would
    //   happily serialize a raw phone if the view were ever rolled back,
    //   replaced, or queried before the migration is applied. Defence in
    //   depth: the response is safe on the OLD schema too.
    const facilitiesData = await fetchAll(
      (from, to) =>
        supabase
          .from("public_facilities")
          .select(`
            id,
            name,
            slug,
            city,
            state,
            zip_code,
            address,
            phone,
            email,
            website,
            description,
            featured,
            featured_pinned,
            verified,
            facility_type,
            bed_count,
            gender_served,
            logo_url,
            gallery_urls,
            year_established,
            calculated_ranking_score,
            listing_completeness_score,
            response_rate_score,
            accepts_international_patients,
            hours_of_operation,
            languages_spoken,
            accessibility_features,
            accepting_admissions,
            is_claimed,
            is_pro,
            data_source
          `)
          .range(from, to),
      "facilities",
    );

    const facilityIds = pluckNonNull(facilitiesData, "id");

    if (facilityIds.length === 0) {
      logStep("No facilities found");
      return new Response(
        JSON.stringify({ facilities: [], generatedAt: new Date().toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch related data in parallel — fully paged past the API row cap. We
    // page the whole tables rather than `.in(facilityIds)` with thousands of
    // ids (which risks URL limits AND the same cap) and index by facility_id;
    // lookups below only touch approved facilities, so extra rows are ignored.
    const [servicesRows, insuranceRows] = await Promise.all([
      fetchAll(
        (from, to) =>
          supabase.from("facility_services").select("facility_id, service_name").range(from, to),
        "facility_services",
      ),
      fetchAll(
        (from, to) =>
          supabase.from("facility_insurance").select("facility_id, insurance_name").range(from, to),
        "facility_insurance",
      ),
    ]);

    // Create lookup maps
    const servicesMap = new Map<string, string[]>();
    servicesRows.forEach((s) => {
      const existing = servicesMap.get(s.facility_id) || [];
      servicesMap.set(s.facility_id, [...existing, s.service_name]);
    });

    const insuranceMap = new Map<string, string[]>();
    insuranceRows.forEach((i) => {
      const existing = insuranceMap.get(i.facility_id) || [];
      insuranceMap.set(i.facility_id, [...existing, i.insurance_name]);
    });


    // Build complete facility objects. `public_facilities` is a view so
    // the generated `Database` type marks every column nullable; the
    // shared `filterRowsWithKeys` helper drops rows missing a primary key
    // and narrows the resulting type so downstream code can trust `f.id`.
    const facilities = filterRowsWithKeys(facilitiesData, ["id"])
      .map((f) => {
        // Canonical entitlement, exactly `=== true`. Featured, claimed,
        // verified and bed_count are all irrelevant here — only an active Pro
        // subscription publishes a phone number.
        const isPro = f.is_pro === true;
        return {
        id: f.id,
        name: f.name,
        slug: f.slug,
        city: f.city,
        state: f.state,
        zipCode: f.zip_code,
        address: f.address,
        // Fail closed: null unless Pro is positively confirmed.
        phone: isPro ? f.phone : null,
        email: f.email,
        website: f.website,
        description: f.description || "",
        featured: f.featured || false,
        featuredPinned: f.featured_pinned || false,
        verified: f.verified || false,
        facilityType: f.facility_type,
        bedCount: f.bed_count,
        genderServed: f.gender_served,
        logoUrl: f.logo_url,
        galleryUrls: f.gallery_urls || [],
        yearEstablished: f.year_established,
        calculatedRankingScore: f.calculated_ranking_score ?? 0,
        listingCompletenessScore: f.listing_completeness_score ?? 0,
        responseRateScore: f.response_rate_score ?? 0,
        acceptsInternationalPatients: f.accepts_international_patients ?? false,
        hoursOfOperation: f.hours_of_operation,
        languagesSpoken: f.languages_spoken || [],
        accessibilityFeatures: f.accessibility_features || [],
        acceptingAdmissions: f.accepting_admissions,
        isClaimed: f.is_claimed || false,
        isPro,
        dataSource: f.data_source,
        treatmentTypes: servicesMap.get(f.id) || [],
        insuranceAccepted: insuranceMap.get(f.id) || [],
        };
      });

    logStep("Successfully built facilities snapshot", { count: facilities.length });

    return new Response(
      JSON.stringify({
        facilities,
        generatedAt: new Date().toISOString(),
        count: facilities.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    logStep("Error in function", { error: String(error) });
    return new Response(
      JSON.stringify({ facilities: [], error: "Failed to fetch facilities" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
