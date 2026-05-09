/**
 * verify-admission
 * ================
 * Public endpoint for seekers to verify their admission status.
 * Called via a unique token link sent to the seeker's email.
 * No authentication required — uses the verification token as proof.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    let token: string | null = null;
    let confirmed: boolean | null = null;
    let denialReason: string | null = null;

    if (req.method === "POST") {
      const body = await req.json();
      token = body.token;
      confirmed = body.confirmed;
      denialReason = body.denial_reason || null;
    } else if (req.method === "GET") {
      const url = new URL(req.url);
      token = url.searchParams.get("token");
      const confirmedParam = url.searchParams.get("confirmed");
      confirmed = confirmedParam === "true";
      denialReason = url.searchParams.get("reason");
    } else {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    if (!token) {
      return new Response(JSON.stringify({ error: "Verification token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call the DB function
    const { data, error } = await supabase.rpc("seeker_verify_admission", {
      p_token: token,
      p_confirmed: confirmed ?? false,
      p_denial_reason: denialReason,
    });

    if (error) {
      console.error("[VERIFY-ADMISSION] RPC error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For GET requests (clicking email links), return a nice HTML page
    if (req.method === "GET") {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Admission Verification — RehabLookup</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8fafc; }
            .card { background: white; border-radius: 16px; padding: 48px; max-width: 480px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .icon { font-size: 48px; margin-bottom: 16px; }
            h1 { font-size: 24px; color: #1e293b; margin-bottom: 8px; }
            p { color: #64748b; line-height: 1.6; }
            .success { color: #16a34a; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">${confirmed ? "✅" : "📝"}</div>
            <h1 class="success">Thank You!</h1>
            <p>${confirmed
              ? "We've recorded that you were admitted. We hope your treatment is going well!"
              : "Thank you for letting us know. Our concierge team will follow up with you if you need further assistance."
            }</p>
            <p style="margin-top: 24px;"><a href="https://rehablookup.com" style="color: #2563eb;">Return to RehabLookup</a></p>
          </div>
        </body>
        </html>
      `;
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[VERIFY-ADMISSION] Error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
