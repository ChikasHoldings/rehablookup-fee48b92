import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";
const ADMIN_EMAIL = "chikasholdings@gmail.com";
const FROM_EMAIL = "RehabLookup <no-reply@rehablookup.com>";

function sanitize(str: string, max = 200): string {
  return str.trim().slice(0, max).replace(/[<>]/g, "").replace(/\0/g, "");
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254 && e.length >= 5;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const firstName = sanitize(String(body.firstName || ""), 100);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 254);
    const phone = body.phone ? sanitize(String(body.phone), 30).replace(/[^\d+\-() ]/g, "") : null;
    const pageUrl = sanitize(String(body.pageUrl || "/"), 500);

    if (!firstName || firstName.length < 1) {
      return new Response(JSON.stringify({ error: "First name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Dedup: check for same email + exit_intent in last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("source", "exit_intent")
      .gte("created_at", since);

    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "duplicate", message: "Already submitted" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert lead
    const { data: lead, error: insertErr } = await supabase
      .from("leads")
      .insert({
        name: firstName,
        email,
        phone: phone || "",
        source: "exit_intent",
        status: "new",
        message: `Captured from: ${pageUrl}`,
        preferred_contact: "email",
        inquiry_type: "request_info",
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr.message);
      return new Response(JSON.stringify({ error: "Failed to save lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send emails via Resend (non-blocking)
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (lovableKey && resendKey) {
      const sendEmail = (to: string, subject: string, html: string) =>
        fetch(`${RESEND_GATEWAY}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": resendKey,
          },
          body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
        }).catch((e) => console.warn("Email send failed:", e.message));

      // Admin notification
      sendEmail(
        ADMIN_EMAIL,
        `New Exit-Intent Lead: ${firstName}`,
        `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1B365D;padding:20px 25px;border-radius:8px 8px 0 0">
            <h1 style="color:#ffffff;font-size:20px;margin:0">New Exit-Intent Lead</h1>
          </div>
          <div style="padding:25px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 12px"><strong>Name:</strong> ${firstName}</p>
            <p style="margin:0 0 12px"><strong>Email:</strong> ${email}</p>
            ${phone ? `<p style="margin:0 0 12px"><strong>Phone:</strong> ${phone}</p>` : ""}
            <p style="margin:0 0 12px"><strong>Page:</strong> ${pageUrl}</p>
            <p style="margin:0;color:#6b7280;font-size:13px">Source: Exit Intent Capture</p>
          </div>
        </div>`
      );

      // User confirmation
      sendEmail(
        email,
        "We're Here to Help — RehabLookup",
        `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1B365D;padding:20px 25px;border-radius:8px 8px 0 0">
            <h1 style="color:#ffffff;font-size:20px;margin:0">Thank You, ${firstName}</h1>
          </div>
          <div style="padding:25px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <p style="color:#374151;line-height:1.6;margin:0 0 16px">
              Thank you for reaching out. A treatment specialist will contact you soon to help find the right options for your situation.
            </p>
            <p style="color:#374151;line-height:1.6;margin:0 0 16px">
              Everything is 100% free and confidential. You are not alone, and help is available.
            </p>
            <div style="text-align:center;margin:24px 0">
              <a href="https://rehablookup.com/search" style="background:#1B365D;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
                Browse Treatment Centers
              </a>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin:20px 0 0;text-align:center">
              RehabLookup.com — Helping you find the right path to recovery
            </p>
          </div>
        </div>`
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: lead.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Exit-intent error:", err instanceof Error ? err.message : String(err));
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
