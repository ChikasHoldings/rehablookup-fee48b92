import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate a random recovery code
function generateRecoveryCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    if (i === 5) code += "-";
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Simple hash function for recovery codes
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code.toUpperCase().replace(/-/g, ""));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, code } = await req.json();

    if (action === "generate") {
      // Delete any existing recovery codes for this user
      await supabaseClient
        .from("admin_mfa_recovery_codes")
        .delete()
        .eq("user_id", user.id);

      // Generate 10 new recovery codes
      const codes: string[] = [];
      const codeRecords = [];

      for (let i = 0; i < 10; i++) {
        const plainCode = generateRecoveryCode();
        codes.push(plainCode);
        codeRecords.push({
          user_id: user.id,
          code_hash: await hashCode(plainCode),
        });
      }

      // Store hashed codes
      const { error: insertError } = await supabaseClient
        .from("admin_mfa_recovery_codes")
        .insert(codeRecords);

      if (insertError) {
        console.error("Error storing recovery codes:", insertError);
        return new Response(JSON.stringify({ error: "Failed to store recovery codes" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return plain codes (only time they're visible)
      return new Response(JSON.stringify({ codes }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      if (!code) {
        return new Response(JSON.stringify({ error: "Recovery code required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const codeHash = await hashCode(code);

      // Find unused matching code
      const { data: matchingCode, error: findError } = await supabaseClient
        .from("admin_mfa_recovery_codes")
        .select("id")
        .eq("user_id", user.id)
        .eq("code_hash", codeHash)
        .is("used_at", null)
        .maybeSingle();

      if (findError || !matchingCode) {
        return new Response(JSON.stringify({ error: "Invalid recovery code", valid: false }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark code as used
      await supabaseClient
        .from("admin_mfa_recovery_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", matchingCode.id);

      return new Response(JSON.stringify({ valid: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "count") {
      // Count remaining unused codes
      const { count, error } = await supabaseClient
        .from("admin_mfa_recovery_codes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("used_at", null);

      return new Response(JSON.stringify({ count: count || 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in manage-mfa-recovery:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
