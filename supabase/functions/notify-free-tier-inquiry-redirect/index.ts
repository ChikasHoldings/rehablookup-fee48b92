// notify-free-tier-inquiry-redirect
// ─────────────────────────────────
// Fires the upsell email + in-app notification to a Free-tier facility
// after a seeker submitted on their listing page and the inquiry was
// routed through the RehabLookup concierge.
//
// Honest framing, not manipulative: we tell the facility that a real
// inquiry arrived, that it's being handled by the concierge alongside
// 1-2 other matches, and that upgrading to Pro routes future inquiries
// straight to their inbox. No fake urgency, no scarcity, no "you're
// losing leads."
//
// The seeker's PII is NEVER included in the notification. Only the
// inquiry summary (LoC, insurance, urgency, location, timestamp) is
// shared. Contact info goes to the advisor's tool, not the facility.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  facility_id: z.string().uuid(),
  inquiry_id: z.string().uuid(),
  level_of_care: z.string().nullable().optional(),
  insurance: z.string().nullable().optional(),
  urgency: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
    });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Pull facility ownership + the recipient email.
  // claim_email is the canonical inbox for facility-side notifications;
  // public email is a fallback (some legacy SAMHSA-imported facilities
  // never had claim_email set).
  const { data: facility } = await supabase
    .from("facilities")
    .select("id, name, claim_email, email, user_id")
    .eq("id", parsed.data.facility_id)
    .single();
  if (!facility) {
    return new Response(JSON.stringify({ error: "Facility not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const recipient = facility.claim_email ?? facility.email ?? null;
  const facilityName = facility.name ?? "your facility";

  // Build the inquiry-summary block. Each value is sanitized on display
  // — even though it came from our own DB, it may contain user-provided
  // free-text from intake.
  const summaryRows: Array<[string, string | null | undefined]> = [
    ["Level of care needed", parsed.data.level_of_care],
    ["Insurance", parsed.data.insurance],
    ["Urgency", parsed.data.urgency],
    ["Location", parsed.data.location],
  ];
  const summaryHtml = summaryRows
    .filter(([, v]) => v && v.trim())
    .map(([label, v]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(v as string)}</li>`)
    .join("");

  const submittedAtStr = new Date().toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  // ── In-app notification (always — doesn't depend on Resend) ──
  if (facility.user_id) {
    await supabase.from("provider_notifications").insert({
      user_id: facility.user_id,
      facility_id: facility.id,
      type: "free_tier_inquiry_redirect",
      title: "A seeker inquired on your listing",
      message:
        "We've connected them with our concierge team, who will present your facility alongside 1-2 matched options. Upgrade to Pro to receive these directly.",
      metadata: {
        inquiry_id: parsed.data.inquiry_id,
        level_of_care: parsed.data.level_of_care,
        insurance: parsed.data.insurance,
        urgency: parsed.data.urgency,
      },
    });
  }

  // ── Email (skipped silently if Resend isn't configured) ──
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey || !recipient) {
    return new Response(JSON.stringify({ ok: true, email_sent: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resend = new Resend(resendKey);
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1B365D;padding:24px;border-radius:12px 12px 0 0">
        <h1 style="margin:0;color:#fff;font-size:20px">A seeker submitted an inquiry on your RehabLookup listing</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none">
        <p style="color:#374151">Hi ${escapeHtml(facilityName)},</p>
        <p style="color:#374151;line-height:1.55">
          A seeker just submitted an inquiry on your RehabLookup listing.
          Because you're on the Free plan, we've connected them with our
          concierge team, who will introduce you alongside 1-2 additional
          matched facilities at no cost to the seeker.
        </p>
        <div style="background:#f8fafc;border-left:4px solid #1B365D;padding:14px 16px;margin:18px 0;border-radius:0 6px 6px 0">
          <p style="margin:0 0 6px 0;font-weight:600;color:#1B365D;font-size:13px;text-transform:uppercase;letter-spacing:.5px">Inquiry summary</p>
          <ul style="margin:0;padding-left:18px;color:#374151;font-size:14px;line-height:1.7">
            ${summaryHtml || "<li>(No structured fields provided)</li>"}
            <li><strong>Time of submission:</strong> ${escapeHtml(submittedAtStr)}</li>
          </ul>
          <p style="margin:8px 0 0 0;font-size:12px;color:#6b7280;font-style:italic">
            Seeker contact info isn't shared at the Free tier — our concierge handles the introduction.
          </p>
        </div>
        <p style="color:#374151;line-height:1.55">
          Want these inquiries delivered <strong>directly to your inbox</strong> with full seeker contact details?
          Upgrade to Pro for <strong>$99/mo</strong> (or <strong>$1,009.80/yr — save 15%</strong>) and you'll
          receive every inquiry on your listing the moment we do, with the ability to respond before our
          concierge team even reaches out.
        </p>
        <div style="text-align:center;margin:24px 0 8px 0">
          <a href="https://rehablookup.com/provider/subscription" style="background:#1B365D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block">
            Upgrade to Pro →
          </a>
        </div>
        <p style="color:#374151;line-height:1.55">— The RehabLookup team</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
        <p style="color:#9ca3af;font-size:11px;line-height:1.55">
          You're receiving this because a seeker submitted on your listing's inquiry form.
          We don't sell or share your data. Reply STOP to unsubscribe from inquiry notifications.
        </p>
      </div>
    </div>
  `;

  try {
    // Route through the resilient sender (retry + dead-letter + suppression
    // check + tracking) instead of a raw Resend call. The per-inquiry
    // idempotency key also makes a duplicate POST a no-op rather than a
    // double-send (this endpoint had no idempotency before).
    await sendEmailWithRetry(
      supabase,
      resend,
      {
        from: "RehabLookup <inquiries@rehablookup.com>",
        to: recipient,
        subject: "A seeker submitted an inquiry on your RehabLookup listing",
        html,
      },
      {
        emailType: "free_tier_inquiry_redirect",
        idempotencyKey: `free-tier-redirect-${parsed.data.inquiry_id}`,
        metadata: { facility_id: parsed.data.facility_id, inquiry_id: parsed.data.inquiry_id },
      },
    );
  } catch (err) {
    console.error("[notify-free-tier-inquiry-redirect] email send failed", err);
    // Non-fatal — in-app notification already created.
  }

  return new Response(JSON.stringify({ ok: true, email_sent: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
