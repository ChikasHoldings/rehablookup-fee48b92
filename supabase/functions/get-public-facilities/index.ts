import { createServiceClient } from "../_shared/supabase-client.ts";
import { filterRowsWithKeys, pluckNonNull } from "../_shared/nullable-rows.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  // Browser cache 5 min, CDN cache 10 min, serve stale up to 1 hour while revalidating in background.
  // stale-while-revalidate absorbs traffic spikes by letting the CDN serve cached responses
  // even after they expire, while it refreshes in the background — zero user-facing latency.
  "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GET-PUBLIC-FACILITIES] ${step}${detailsStr}`);
};

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
    // 2026-05-21.md §3). Pro-gated fields (phone/email/website) are masked
    // to null by the `public_facilities` view for non-Pro facilities; we
    // pass them through unchanged.
    const { data: facilitiesData, error: facilitiesError } = await supabase
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
      `);

    if (facilitiesError) {
      logStep("Error fetching facilities", { error: facilitiesError.message });
      throw new Error(`Failed to fetch facilities: ${facilitiesError.message}`);
    }

    const facilityIds = pluckNonNull(facilitiesData, "id");

    if (facilityIds.length === 0) {
      logStep("No facilities found");
      return new Response(
        JSON.stringify({ facilities: [], generatedAt: new Date().toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch related data in parallel
    const [servicesResult, insuranceResult] = await Promise.all([
      supabase
        .from("facility_services")
        .select("facility_id, service_name")
        .in("facility_id", facilityIds),
      supabase
        .from("facility_insurance")
        .select("facility_id, insurance_name")
        .in("facility_id", facilityIds),
    ]);

    // Create lookup maps
    const servicesMap = new Map<string, string[]>();
    (servicesResult.data || []).forEach((s) => {
      const existing = servicesMap.get(s.facility_id) || [];
      servicesMap.set(s.facility_id, [...existing, s.service_name]);
    });

    const insuranceMap = new Map<string, string[]>();
    (insuranceResult.data || []).forEach((i) => {
      const existing = insuranceMap.get(i.facility_id) || [];
      insuranceMap.set(i.facility_id, [...existing, i.insurance_name]);
    });


    // Build complete facility objects. `public_facilities` is a view so
    // the generated `Database` type marks every column nullable; the
    // shared `filterRowsWithKeys` helper drops rows missing a primary key
    // and narrows the resulting type so downstream code can trust `f.id`.
    const facilities = filterRowsWithKeys(facilitiesData, ["id"])
      .map((f) => ({
        id: f.id,
        name: f.name,
        slug: f.slug,
        city: f.city,
        state: f.state,
        zipCode: f.zip_code,
        address: f.address,
        phone: f.phone,
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
        isPro: f.is_pro || false,
        dataSource: f.data_source,
        treatmentTypes: servicesMap.get(f.id) || [],
        insuranceAccepted: insuranceMap.get(f.id) || [],
      }));

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
