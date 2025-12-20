import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all approved facilities with their slugs and updated_at
    const { data: facilities, error } = await supabase
      .from("facilities")
      .select("slug, updated_at, name, city, state, featured")
      .eq("status", "approved")
      .order("featured", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching facilities:", error);
      throw error;
    }

    const baseUrl = "https://rehablookup.com";
    const today = new Date().toISOString().split("T")[0];

    // Generate sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    // Add each facility to sitemap
    for (const facility of facilities || []) {
      if (!facility.slug) continue;
      
      const lastmod = facility.updated_at 
        ? new Date(facility.updated_at).toISOString().split("T")[0]
        : today;
      
      // Featured facilities get higher priority
      const priority = facility.featured ? "0.9" : "0.7";
      
      sitemap += `  <url>
    <loc>${baseUrl}/center/${facility.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>
`;
    }

    sitemap += `</urlset>`;

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate sitemap" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
