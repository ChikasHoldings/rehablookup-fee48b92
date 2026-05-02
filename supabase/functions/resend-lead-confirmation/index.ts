// Resends the seeker confirmation email for a previously-submitted lead.
// Triggered by the "Resend confirmation email" button on the success screen.
//
// Rate-limit policy (server-side, authoritative):
//   - 60-second cooldown between resends per (email, lead_id).
//   - Hard ceiling of 3 resends per (email, lead_id) per 24h. After 3, the
//     window must roll over before another resend is allowed.
//   - Both limits return HTTP 429 with `retryAfterSeconds` so the UI can
//     re-arm its cooldown timer instead of guessing.
//
// We deliberately keep the lookup window tight (24h since lead creation):
// stale leads can't be resent, and the email field on the lead row is the
// canonical recipient (preventing an attacker who only knows a leadId from
// pivoting the resend to a different inbox).
//
// POST-only. Public (no JWT) — same posture as submit-qualified-lead. The
// service-role client is used solely for reading from `leads` + writing to
// the rate-limit table; nothing else is exposed to anonymous callers.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const VERSION = "1.0.0";
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COOLDOWN_SECONDS = 60;
const MAX_RESENDS_PER_WINDOW = 3;
const WINDOW_HOURS = 24;
// Leads older than this window can no longer be resent — discourages using
// the endpoint as a generic "spray-old-emails" amplifier.
const LEAD_FRESHNESS_HOURS = 24;

const BodySchema = z.object({
  // Either leadId OR (email + facilityId) — both branches resolve to the
  // same canonical lead row and the lead's stored email is what we send to.
  leadId: z.string().uuid().optional(),
  email: z.string().email().max(254),
  facilityId: z.string().uuid().optional(),
}).refine(
  (v) => Boolean(v.leadId || v.facilityId),
  { message: "Either `leadId` or `facilityId` must be provided." },
);

function jsonResponse(status: number, body: Record<string, unknown>, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify({ ...body, _version: VERSION }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(extraHeaders ?? {}) },
  });
}

function errorResponse(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return jsonResponse(status, { error: { code, message }, code, ...(extra ?? {}) });
}

function getSeekerConfirmationEmail(name: string, facilityName: string): string {
  const firstName = name.split(" ")[0];
  // Mirrors submit-qualified-lead's confirmation template. Kept inline so
  // this function has zero coupling to the submit handler's lifecycle.
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
          <div style="font-size:48px;margin-bottom:16px;">✉️</div>
          <p style="margin:0 0 8px 0;font-size:12px;color:rgba(255,255,255,0.7);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-transform:uppercase;letter-spacing:1px;">REHABLOOKUP</p>
          <h1 style="margin:0;font-size:24px;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;">Inquiry Confirmation (Resent)</h1>
          <p style="margin:8px 0 0 0;color:rgba(255,255,255,0.8);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;">Here's another copy of your confirmation</p>
        </td></tr>
        <tr><td style="background:#ffffff;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
          <p style="margin:0 0 20px 0;color:#374151;font-size:16px;line-height:1.6;">Hi ${firstName},</p>
          <p style="margin:0 0 24px 0;color:#374151;font-size:15px;line-height:1.6;">You requested another copy of your confirmation. Your inquiry to <strong style="color:#0f766e;">${facilityName}</strong> has been received and a representative will reach out shortly.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:20px;">
              <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#0f766e;">📞 What happens next?</p>
              <ul style="margin:0;padding:0 0 0 20px;color:#115e59;font-size:14px;line-height:1.8;">
                <li>The facility will review your inquiry shortly</li>
                <li>A representative will contact you within 24-48 hours</li>
                <li>They'll reach out using your preferred contact method</li>
              </ul>
            </td></tr>
          </table>
          <p style="margin:0 0 24px 0;color:#6b7280;font-size:14px;line-height:1.6;">Questions? Reach us at <a href="mailto:Support@rehablookup.com" style="color:#0f766e;text-decoration:none;">Support@rehablookup.com</a>.</p>
        </td></tr>
        <tr><td style="background:#1B365D;padding:24px 32px;border-radius:0 0 12px 12px;text-align:center;">
          <p style="margin:0 0 12px 0;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;">RehabLookup</p>
          <p style="margin:0 0 16px 0;color:#93c5fd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;">Connecting families with quality care</p>
          <p style="margin:0;color:rgba(255,255,255,0.5);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse(405, "method_not_allowed", "Use POST.");

  const requestId = crypto.randomUUID().slice(0, 8);

  let raw: unknown;
  try { raw = await req.json(); } catch { return errorResponse(400, "invalid_json", "Body must be valid JSON."); }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(400, "validation_failed", "Invalid request body.", {
      details: parsed.error.flatten().fieldErrors,
    });
  }
  const { leadId, email, facilityId } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ─── Resolve canonical lead row ────────────────────────────────────────
  // The lead.email column is the source of truth for the recipient — never
  // trust the request body's email beyond using it as a lookup hint.
  const freshnessCutoff = new Date(Date.now() - LEAD_FRESHNESS_HOURS * 3600 * 1000).toISOString();

  let leadQuery = supabase
    .from("leads")
    .select("id, name, email, facility_id, created_at")
    .gte("created_at", freshnessCutoff)
    .order("created_at", { ascending: false })
    .limit(1);

  if (leadId) {
    leadQuery = leadQuery.eq("id", leadId).eq("email", normalizedEmail);
  } else {
    leadQuery = leadQuery.eq("email", normalizedEmail).eq("facility_id", facilityId!);
  }

  const { data: lead, error: leadErr } = await leadQuery.maybeSingle();
  if (leadErr) {
    console.error(`[${requestId}] lead lookup failed`, leadErr);
    return errorResponse(500, "lookup_failed", "Could not look up the original request.");
  }
  if (!lead) {
    // Don't leak whether the email/lead exists — return a generic 404.
    return errorResponse(404, "lead_not_found", "We couldn't find a recent request matching that email.");
  }

  // ─── Rate-limit gate ───────────────────────────────────────────────────
  const { data: existingAttempt } = await supabase
    .from("lead_email_resend_attempts")
    .select("count, last_sent_at, window_started_at")
    .eq("email", lead.email)
    .eq("lead_id", lead.id)
    .maybeSingle();

  const nowMs = Date.now();
  if (existingAttempt) {
    const lastSentMs = new Date(existingAttempt.last_sent_at).getTime();
    const sinceLastSec = Math.floor((nowMs - lastSentMs) / 1000);
    if (sinceLastSec < COOLDOWN_SECONDS) {
      const retryAfterSeconds = COOLDOWN_SECONDS - sinceLastSec;
      return jsonResponse(
        429,
        {
          error: { code: "cooldown_active", message: "Please wait before requesting another email." },
          code: "cooldown_active",
          retryAfterSeconds,
        },
        { "Retry-After": String(retryAfterSeconds) },
      );
    }

    const windowStartedMs = new Date(existingAttempt.window_started_at).getTime();
    const windowAgeMs = nowMs - windowStartedMs;
    const windowMs = WINDOW_HOURS * 3600 * 1000;
    const windowExpired = windowAgeMs >= windowMs;
    const countInWindow = windowExpired ? 0 : existingAttempt.count;

    if (countInWindow >= MAX_RESENDS_PER_WINDOW) {
      const retryAfterSeconds = Math.ceil((windowMs - windowAgeMs) / 1000);
      return jsonResponse(
        429,
        {
          error: { code: "daily_limit_reached", message: `You can resend at most ${MAX_RESENDS_PER_WINDOW} times per day.` },
          code: "daily_limit_reached",
          retryAfterSeconds,
        },
        { "Retry-After": String(retryAfterSeconds) },
      );
    }
  }

  // ─── Look up facility name for the email body ─────────────────────────
  const { data: facility, error: facilityErr } = await supabase
    .from("facilities")
    .select("id, name")
    .eq("id", lead.facility_id)
    .maybeSingle();
  if (facilityErr || !facility) {
    return errorResponse(404, "facility_not_found", "The original facility is no longer available.");
  }

  // ─── Send email ────────────────────────────────────────────────────────
  // Idempotency key includes a coarse minute-bucket so accidental rapid
  // double-clicks in the same minute dedupe to a single send even if the
  // cooldown check above were bypassed.
  const minuteBucket = Math.floor(nowMs / 60000);
  try {
    await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [lead.email],
      subject: `Your inquiry to ${facility.name} — confirmation resent`,
      html: getSeekerConfirmationEmail(lead.name, facility.name),
    }, {
      emailType: "seeker_inquiry_confirmation",
      idempotencyKey: `seeker-resend-${lead.id}-${minuteBucket}`,
    });
  } catch (e) {
    console.error(`[${requestId}] resend failed`, e);
    return errorResponse(502, "send_failed", "We couldn't send the email right now. Please try again shortly.");
  }

  // ─── Record the attempt ────────────────────────────────────────────────
  // Upsert: if the row exists, increment count (or reset if window rolled).
  const nowIso = new Date(nowMs).toISOString();
  if (existingAttempt) {
    const windowStartedMs = new Date(existingAttempt.window_started_at).getTime();
    const windowExpired = nowMs - windowStartedMs >= WINDOW_HOURS * 3600 * 1000;
    await supabase
      .from("lead_email_resend_attempts")
      .update({
        count: windowExpired ? 1 : existingAttempt.count + 1,
        last_sent_at: nowIso,
        window_started_at: windowExpired ? nowIso : existingAttempt.window_started_at,
        updated_at: nowIso,
      })
      .eq("email", lead.email)
      .eq("lead_id", lead.id);
  } else {
    await supabase
      .from("lead_email_resend_attempts")
      .insert({
        email: lead.email,
        lead_id: lead.id,
        count: 1,
        last_sent_at: nowIso,
        window_started_at: nowIso,
      });
  }

  return jsonResponse(200, {
    ok: true,
    cooldownSeconds: COOLDOWN_SECONDS,
    remainingResends: Math.max(
      0,
      MAX_RESENDS_PER_WINDOW - ((existingAttempt && nowMs - new Date(existingAttempt.window_started_at).getTime() < WINDOW_HOURS * 3600 * 1000) ? existingAttempt.count + 1 : 1),
    ),
  });
});
