import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[CLEANUP-RATE-LIMIT-LOGS] Starting cleanup job");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete rate limit logs older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error, count } = await supabase
      .from("rate_limit_log")
      .delete()
      .lt("created_at", sevenDaysAgo)
      .select("id");

    if (error) {
      console.error("[CLEANUP-RATE-LIMIT-LOGS] Error deleting old logs:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const deletedCount = data?.length || 0;
    console.log(`[CLEANUP-RATE-LIMIT-LOGS] Deleted ${deletedCount} old rate limit logs`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_count: deletedCount,
        cutoff_date: sevenDaysAgo 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CLEANUP-RATE-LIMIT-LOGS] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});