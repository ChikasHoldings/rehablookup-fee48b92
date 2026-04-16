import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("Missing environment variables");
      return new Response(
        JSON.stringify({ facilities: [], error: "Configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Fetch all approved facilities with public data only
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
        description,
        featured,
        verified,
        facility_type,
        logo_url,
        gallery_urls,
        year_established
      `);

    if (facilitiesError) {
      logStep("Error fetching facilities", { error: facilitiesError.message });
      throw new Error(`Failed to fetch facilities: ${facilitiesError.message}`);
    }

    const facilityIds = (facilitiesData || []).map((f) => f.id).filter(Boolean) as string[];

    if (facilityIds.length === 0) {
      logStep("No facilities found");
      return new Response(
        JSON.stringify({ facilities: [], generatedAt: new Date().toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch related data in parallel
    const [servicesResult, insuranceResult, reviewsResult] = await Promise.all([
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


    // Build complete facility objects
    const facilities = (facilitiesData || []).map((f) => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      city: f.city,
      state: f.state,
      zipCode: f.zip_code,
      address: f.address,
      phone: f.phone,
      description: f.description || "",
      featured: f.featured || false,
      verified: f.verified || false,
      facilityType: f.facility_type,
      logoUrl: f.logo_url,
      galleryUrls: f.gallery_urls || [],
      yearEstablished: f.year_established,
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
