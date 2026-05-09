import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { describeEmailInput } from "../_shared/email-input-diagnostics.ts";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const VERSION = "4.0.0"; // Migrated from Lovable gateway → sendEmailWithRetry

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "chikasholdings@gmail.com";
const FROM_EMAIL = "RehabLookup <no-reply@rehablookup.com>";
const MAX_BODY_SIZE = 50000; // 50KB

function sanitize(str: string, max = 200): string {
  return str.trim().slice(0, max).replace(/[<>]/g, "").replace(/\0/g, "");
}

function sanitizeName(str: string, max = 100): string {
  return str.trim().slice(0, max).replace(/[<>{}[\]\\\/`'"]/g, "").replace(/\0/g, "");
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254 && e.length >= 5;
}

function extractClientIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // POST-only enforcement
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Body size limit
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_SIZE) {
      return new Response(JSON.stringify({ error: "Request too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstName = sanitizeName(String(body.firstName || ""), 100);
    const lastName = sanitizeName(String(body.lastName || ""), 100);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 254);
    const phone = body.phone ? sanitize(String(body.phone), 30).replace(/[^\d+\-() ]/g, "") : null;
    const pageUrl = sanitize(String(body.pageUrl || "/"), 500);
    const treatmentType = sanitize(String(body.treatmentType || ""), 100);
    const preferredState = body.preferredState ? sanitize(String(body.preferredState), 100) : null;

    if (!firstName || firstName.length < 1) {
      return new Response(JSON.stringify({ error: "First name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.email || typeof body.email !== "string" || email.length === 0) {
      const code = "email_required";
      const message = "Email is required";
      const diag = describeEmailInput("email", body.email);
      console.warn(JSON.stringify({ fn: "submit-exit-intent-lead", level: "warn", code, ...diag }));
      return new Response(
        JSON.stringify({
          error: { code, message },
          code,
          reason: message,
          _version: VERSION,
          details: { field: "email" },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!isValidEmail(email)) {
      const code = "invalid_email";
      const message = "Valid email is required";
      const diag = describeEmailInput("email", body.email);
      console.warn(JSON.stringify({ fn: "submit-exit-intent-lead", level: "warn", code, ...diag }));
      return new Response(
        JSON.stringify({
          error: { code, message },
          code,
          reason: message,
          _version: VERSION,
          details: { field: "email" },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Blocked identifier check
    const { data: emailBlocked } = await supabase.rpc("is_identifier_blocked", { p_identifier: email });
    if (emailBlocked) {
      // Silent success to not reveal blocking
      return new Response(JSON.stringify({ success: true, message: "Already submitted" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute IP hash for rate limiting and storage
    const clientIp = extractClientIp(req);
    let ipHashForStorage: string | null = null;
    if (clientIp) {
      const ipHashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientIp + "exit-intent-salt-v2"));
      ipHashForStorage = Array.from(new Uint8Array(ipHashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // IP-based rate limiting: 10 exit-intent leads per hour per IP
    if (ipHashForStorage) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: ipCount } = await supabase
        .from("marketing_leads")
        .select("*", { count: "exact", head: true })
        .eq("ip_hash", ipHashForStorage)
        .eq("source", "exit_intent")
        .gte("created_at", oneHourAgo);

      if (ipCount && ipCount >= 10) {
        return new Response(JSON.stringify({ error: "Too many submissions. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Dedup: check for same email + exit_intent in last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("marketing_leads")
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

    // Per-email global rate limit: 15 leads per hour across all sources
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: emailHourCount } = await supabase
      .from("marketing_leads")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", oneHourAgo);

    if (emailHourCount && emailHourCount >= 15) {
      return new Response(JSON.stringify({ error: "Too many submissions. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert into marketing_leads (no facility_id required — this is a site-wide lead)
    const { data: lead, error: insertErr } = await supabase
      .from("marketing_leads")
      .insert({
        first_name: firstName,
        last_name: lastName || "",
        email,
        phone: phone || "",
        source: "exit_intent",
        status: "new",
        message: `Captured from: ${pageUrl}`,
        preferred_contact: "email",
        level_of_care: treatmentType || null,
        location_city_state: preferredState || null,
        landing_page: pageUrl,
        ip_hash: ipHashForStorage,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error(`[EXIT-INTENT v${VERSION}] Insert error:`, insertErr.message);
      return new Response(JSON.stringify({ error: "Failed to save lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send emails via resilient sender (non-blocking)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const resend = new Resend(resendKey);

      const adminHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1B365D;padding:20px 25px;border-radius:8px 8px 0 0">
            <h1 style="color:#ffffff;font-size:20px;margin:0">New Exit-Intent Lead</h1>
          </div>
          <div style="padding:25px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 12px"><strong>Name:</strong> ${firstName} ${lastName}</p>
            <p style="margin:0 0 12px"><strong>Email:</strong> ${email}</p>
            ${phone ? `<p style="margin:0 0 12px"><strong>Phone:</strong> ${phone}</p>` : ""}
            ${preferredState ? `<p style="margin:0 0 12px"><strong>State:</strong> ${preferredState}</p>` : ""}
            ${treatmentType ? `<p style="margin:0 0 12px"><strong>Treatment Type:</strong> ${treatmentType}</p>` : ""}
            <p style="margin:0 0 12px"><strong>Page:</strong> ${pageUrl}</p>
            <p style="margin:0;color:#6b7280;font-size:13px">Source: Exit Intent Capture</p>
          </div>
        </div>`;

      const userHtml = `
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
        </div>`;

      // Admin notification (fire-and-forget)
      sendEmailWithRetry(supabase, resend, {
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `New Exit-Intent Lead: ${firstName}`,
        html: adminHtml,
      }, {
        emailType: "exit_intent_admin",
        idempotencyKey: `exit-intent-admin-${lead.id}`,
      }).catch((e) => console.warn(`[EXIT-INTENT v${VERSION}] Admin email failed:`, e.message));

      // User confirmation (fire-and-forget)
      sendEmailWithRetry(supabase, resend, {
        from: FROM_EMAIL,
        to: [email],
        subject: "We're Here to Help — RehabLookup",
        html: userHtml,
      }, {
        emailType: "exit_intent_confirmation",
        idempotencyKey: `exit-intent-user-${lead.id}`,
      }).catch((e) => console.warn(`[EXIT-INTENT v${VERSION}] User email failed:`, e.message));
    }

    return new Response(
      JSON.stringify({ success: true, id: lead.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error(`[EXIT-INTENT v${VERSION}] Error:`, err instanceof Error ? err.message : String(err));
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
