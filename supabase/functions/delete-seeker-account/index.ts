import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate the caller from their JWT.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller has a seeker profile (and not a provider/admin).
    const [{ data: seekerProfile }, { data: providerProfile }, { data: adminRole }] = await Promise.all([
      adminClient.from("seeker_profiles").select("id").eq("user_id", user.id).maybeSingle(),
      adminClient.from("profiles").select("id").eq("user_id", user.id).maybeSingle(),
      adminClient.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
    ]);

    if (!seekerProfile) {
      return new Response(
        JSON.stringify({ error: "Account is not a client account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (providerProfile || adminRole) {
      return new Response(
        JSON.stringify({ error: "This account has elevated roles and cannot be self-deleted. Contact support." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Best-effort: remove the user's avatar files from storage.
    try {
      const { data: files } = await adminClient.storage
        .from("seeker-avatars")
        .list(user.id, { limit: 100 });
      if (files && files.length > 0) {
        const paths = files.map((f) => `${user.id}/${f.name}`);
        await adminClient.storage.from("seeker-avatars").remove(paths);
      }
    } catch (storageErr) {
      console.warn("[delete-seeker-account] avatar cleanup failed:", storageErr);
    }

    // Single source of truth: SECURITY DEFINER purge function handles every
    // seeker-owned row across notifications, favorites, reviews, sessions,
    // drafts, concierge surface, and email verification artefacts.
    const { error: purgeError } = await adminClient.rpc("purge_seeker_data", {
      p_user_id: user.id,
      p_user_email: user.email ?? null,
    });

    if (purgeError) {
      console.error("[delete-seeker-account] purge failed:", purgeError);
      return new Response(
        JSON.stringify({ error: "Failed to purge account data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Finally remove the auth identity. Cascades + the purge above leave
    // no orphan PII behind.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("[delete-seeker-account] auth delete failed:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[delete-seeker-account] unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
