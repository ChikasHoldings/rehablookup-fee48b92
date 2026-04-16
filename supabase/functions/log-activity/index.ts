import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BODY_SIZE = 10000;

const isValidUUID = (str: unknown): boolean =>
  typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

function sanitizeStr(str: unknown, maxLen = 500): string {
  if (!str || typeof str !== "string") return "";
  return str.trim().replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").replace(/\0/g, "").slice(0, maxLen);
}

const allowedEventTypes = [
  "login", "logout", "password_change", "email_change", "profile_update",
  "session_start", "session_end", "settings_change", "mfa_setup", "mfa_verify",
  "security_action", "account_action", "session_revoked", "all_sessions_revoked"
];

const allowedEventPrefixes = ["welcome_modal_"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST-only
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Body size limit
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_SIZE) {
      return new Response(JSON.stringify({ error: "Request too large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check - verify the caller is the user they claim to be
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authenticatedUserId = data.claims.sub as string;

    const user_id = typeof body.user_id === "string" ? body.user_id : "";
    const event_type = sanitizeStr(body.event_type, 100);
    const event_description = sanitizeStr(body.event_description, 500);

    if (!user_id || !event_type || !event_description) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate UUID format
    if (!isValidUUID(user_id)) {
      return new Response(JSON.stringify({ error: "Invalid user_id format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure caller can only log activity for themselves
    if (user_id !== authenticatedUserId) {
      return new Response(JSON.stringify({ error: "Cannot log activity for another user" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Whitelist allowed event types (exact match or prefix match)
    const isAllowed = allowedEventTypes.includes(event_type) ||
      allowedEventPrefixes.some(prefix => event_type.startsWith(prefix));
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Invalid event type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip_address = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                       req.headers.get("x-real-ip") || "Unknown";
    const user_agent = (req.headers.get("user-agent") || "Unknown").slice(0, 500);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from("account_activity_log")
      .insert({
        user_id,
        event_type,
        event_description,
        ip_address: ip_address.slice(0, 45),
        user_agent,
        metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
      });

    if (error) {
      console.error("Error logging activity:", error);
      return new Response(JSON.stringify({ error: "Failed to log activity" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in log-activity function:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
