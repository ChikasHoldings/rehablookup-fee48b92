// Submit Page Issue Report
//
// Lightweight endpoint that lets visitors report a broken/missing page
// (e.g. a /center/:slug that no longer resolves). Records the report as an
// admin_notifications row so the ops team sees it in their existing inbox
// without requiring a new table or migration.
//
// Public endpoint — no auth required, but rate-limited by simple input
// validation and short field lengths.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReportPayload {
  url?: string;
  reason?: string;
  context?: string; // e.g. "center-not-found"
  attemptedSlug?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as ReportPayload;

    const url = (body.url ?? "").toString().trim().slice(0, 500);
    const reason = (body.reason ?? "").toString().trim().slice(0, 1000);
    const context = (body.context ?? "general").toString().trim().slice(0, 100);
    const attemptedSlug = body.attemptedSlug
      ? body.attemptedSlug.toString().trim().slice(0, 200)
      : null;

    if (!url || !reason) {
      return new Response(
        JSON.stringify({ error: "URL and reason are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (reason.length < 3) {
      return new Response(
        JSON.stringify({ error: "Please describe the issue in a bit more detail" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Try to attribute to a logged-in user (optional)
    let reporterId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const anonClient = createClient(
          supabaseUrl,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } },
        );
        const { data: { user } } = await anonClient.auth.getUser(token);
        if (user?.id) reporterId = user.id;
      } catch {
        // anonymous report — no problem
      }
    }

    const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;
    const referer = req.headers.get("referer")?.slice(0, 500) ?? null;

    const { error: insertError } = await supabase
      .from("admin_notifications")
      .insert({
        type: "page_issue_report",
        title: "Page issue reported by visitor",
        message: `Reported URL: ${url}\nReason: ${reason}`,
        metadata: {
          url,
          reason,
          context,
          attempted_slug: attemptedSlug,
          reporter_id: reporterId,
          user_agent: userAgent,
          referer,
          reported_at: new Date().toISOString(),
        },
      });

    if (insertError) {
      console.error("[submit-page-issue-report] insert failed", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to submit report" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Report submitted" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[submit-page-issue-report] unexpected error", err);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
