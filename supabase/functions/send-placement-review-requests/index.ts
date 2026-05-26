// ============================================================================
// send-placement-review-requests v1.0.0
// ----------------------------------------------------------------------------
// Cron-triggered. For every concierge case that has been PLACED
// (placement_confirmed) and settled for >= SETTLE_DAYS, and that hasn't yet had
// a placement review requested, create a public review request for the placed
// facility (addressed to the seeker) and email the seeker the review link.
// Closes the family journey: pick a facility -> admission -> asked for a review.
//
// Idempotent: create_placement_review_request stamps
// concierge_inquiries.placement_review_requested_at atomically with the row
// creation, so a row is invited exactly once even across concurrent ticks.
//
// Schedule: pg_cron 'send-placement-review-requests' hourly (see migration
// 20260827001100_placement_review_requests.sql).
//
// Authorization: cron-secret gate + service_role JWT role claim (mirrors the
// other cron-only functions).
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { assertCronSecret } from "../_shared/cron-auth.ts";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const VERSION = "1.0.0";
const SETTLE_DAYS = 2; // let the placement settle before asking for a review
const BATCH = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify({ ...body, _version: VERSION }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (level: "INFO" | "WARN" | "ERROR", msg: string, details?: unknown) => {
  const d = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[PLACEMENT-REVIEW] [${VERSION}] [${level}] ${msg}${d}`);
};

function jwtRole(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload?.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function buildEmail(opts: {
  facilityName: string;
  facilityCity: string | null;
  facilityState: string | null;
  recipientFirstName: string;
  reviewUrl: string;
}) {
  const subject = `How was your experience with ${opts.facilityName}?`;
  const cityState = [opts.facilityCity, opts.facilityState].filter(Boolean).join(", ");
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9"><tr><td align="center" style="padding:40px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">
<tr><td style="background:#1B365D;padding:24px 32px"><h1 style="margin:0;color:#fff;font-size:18px;font-weight:600">Share your experience</h1></td></tr>
<tr><td style="padding:32px">
<p style="margin:0 0 16px;font-size:15px;line-height:1.55">Hi ${escapeHtml(opts.recipientFirstName)},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55">Our advisors recently helped connect you with <strong>${escapeHtml(opts.facilityName)}</strong>${cityState ? ` in ${escapeHtml(cityState)}` : ""}. We'd love to hear how it went.</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.55">Your honest review helps other families and individuals searching for treatment. RehabLookup moderates every review before it goes live, so you have time to share what's real.</p>
<div style="text-align:center;margin:28px 0"><a href="${opts.reviewUrl}" style="display:inline-block;background:#1B365D;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px">Leave a review →</a></div>
<p style="margin:0 0 16px;font-size:13px;line-height:1.55;color:#475569">This link is unique to you and expires in 30 days. If the button doesn't work, paste this URL into your browser:</p>
<p style="margin:0 0 24px;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all"><a href="${opts.reviewUrl}" style="color:#1B365D">${opts.reviewUrl}</a></p>
<p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5">You're getting this because you used our placement concierge. If you'd rather not review, just ignore this email — no further follow-ups will be sent.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center"><p style="margin:0;font-size:11px;color:#94a3b8">RehabLookup · Verified treatment directory</p></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html };
}

interface PlacedRow {
  id: string;
  placed_facility_id: string;
  placement_confirmed_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const cronAuth = assertCronSecret(req);
  if (!cronAuth.ok) return cronAuth.response;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!SUPABASE_URL || !SUPABASE_SRK || !RESEND_API_KEY) {
      log("ERROR", "Missing env");
      return json(500, { error: "Server misconfigured" });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const role = jwtRole(authHeader.replace(/^Bearer\s+/i, ""));
    if (role !== "service_role") {
      log("WARN", "Rejected non-service-role call", { role });
      return json(403, { error: "Forbidden" });
    }

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);
    const resend = new Resend(RESEND_API_KEY);

    const settleCutoff = new Date(Date.now() - SETTLE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: placed, error: fetchErr } = await svc
      .from("concierge_inquiries")
      .select("id, placed_facility_id, placement_confirmed_at")
      .eq("placement_confirmed", true)
      .not("placed_facility_id", "is", null)
      .is("placement_review_requested_at", null)
      .lt("placement_confirmed_at", settleCutoff)
      .order("placement_confirmed_at", { ascending: true })
      .limit(BATCH);
    if (fetchErr) {
      log("ERROR", "fetch placed cases failed", { error: fetchErr.message });
      return json(500, { error: "DB error", code: "FETCH_FAILED" });
    }

    const baseUrl = SUPABASE_URL.includes("localhost") ? "http://localhost:8080" : "https://rehablookup.com";
    const stats = { considered: 0, requested: 0, skipped: 0, errors: 0 };

    for (const row of (placed ?? []) as PlacedRow[]) {
      stats.considered++;
      try {
        // Atomically claims the row + creates (or reuses) the review_request.
        const { data: result, error: rpcErr } = await svc.rpc("create_placement_review_request", {
          p_inquiry_id: row.id,
        });
        if (rpcErr) {
          log("ERROR", "rpc failed", { inquiryId: row.id, error: rpcErr.message });
          stats.errors++;
          continue;
        }
        if (!result) {
          // Ineligible / unclaimed facility / bad email — already stamped.
          stats.skipped++;
          continue;
        }
        const r = result as {
          request_id: string;
          facility_id: string;
          recipient_name: string;
          recipient_email: string;
          facility_name: string;
          facility_city: string | null;
          facility_state: string | null;
          duplicate: boolean;
        };
        if (r.duplicate) {
          stats.skipped++;
          continue;
        }

        const reviewUrl = `${baseUrl}/review/${r.request_id}`;
        const firstName = (r.recipient_name || "there").split(/\s+/)[0] || "there";
        const { subject, html } = buildEmail({
          facilityName: r.facility_name,
          facilityCity: r.facility_city,
          facilityState: r.facility_state,
          recipientFirstName: firstName,
          reviewUrl,
        });

        const sendResult = await sendEmailWithRetry(
          svc,
          resend,
          {
            from: "RehabLookup <reviews@rehablookup.com>",
            to: [r.recipient_email],
            subject,
            html,
            headers: { "X-Entity-Ref-ID": r.request_id },
          },
          {
            emailType: "review_request",
            idempotencyKey: `placement-review-${r.request_id}`,
            metadata: { facility_id: r.facility_id, request_id: r.request_id, inquiry_id: row.id },
          },
        );

        const resendId =
          (sendResult as { id?: string | null })?.id ||
          (sendResult as { data?: { id?: string } })?.data?.id ||
          null;
        if (resendId) {
          await svc.rpc("mark_review_request_sent", { p_request_id: r.request_id, p_resend_id: resendId })
            .then(({ error }) => {
              if (error) log("WARN", "mark_review_request_sent failed (email sent)", { error: error.message });
            });
        }
        stats.requested++;
      } catch (err) {
        log("ERROR", "row failed", { inquiryId: row.id, error: err instanceof Error ? err.message : String(err) });
        stats.errors++;
      }
    }

    log("INFO", "Placement review sweep complete", stats);
    return json(200, { success: true, stats });
  } catch (e) {
    log("ERROR", "unhandled", { error: e instanceof Error ? e.message : String(e) });
    return json(500, { error: "Internal error" });
  }
});
