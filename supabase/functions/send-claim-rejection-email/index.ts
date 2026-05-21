// ============================================================================
// send-claim-rejection-email v1.0.0
// ----------------------------------------------------------------------------
// Notifies the claimant that their facility claim was rejected, surfacing
// the admin's rejection_reason so the user understands why and can decide
// whether to retry.
//
// Body:  { claimRequestId: uuid }
// Auth:  required (verify_jwt=true). Caller must be an admin.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify({ ...body, _version: VERSION }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (level: "INFO" | "WARN" | "ERROR", msg: string, details?: unknown) => {
  const d = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[SEND-CLAIM-REJECTION-EMAIL] [${VERSION}] [${level}] ${msg}${d}`);
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function emailHtml(
  claimantName: string,
  facilityName: string,
  reason: string,
  retryUrl: string,
  supportEmail: string,
): string {
  const esc = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const safeName = esc(facilityName);
  const safeClaimant = esc(claimantName || "there");
  const safeReason = esc(reason || "No reason provided.");
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#1B365D;padding:32px;text-align:center;">
<p style="margin:0 0 4px 0;font-size:11px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1.5px;">REHABLOOKUP</p>
<h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">Update on your claim</h1></td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px 0;color:#111827;font-size:15px;line-height:1.6;">Hi ${safeClaimant},</p>
<p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.6;">Thanks for submitting a claim for <strong>${safeName}</strong>. After review, we weren't able to approve this claim as submitted.</p>
<div style="margin:0 0 20px 0;padding:14px 16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;">
<p style="margin:0 0 6px 0;font-size:11px;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Reason</p>
<p style="margin:0;color:#78350f;font-size:14px;line-height:1.6;white-space:pre-wrap;">${safeReason}</p></div>
<p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.6;">If this was a misunderstanding, you're welcome to start a new claim with additional information — stronger verification (work email at the facility's domain, an SMS to the listed phone, or a state license document) usually resolves it quickly.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr>
<td style="border-radius:8px;background:#1B365D;"><a href="${retryUrl}" style="display:inline-block;padding:12px 20px;font-size:14px;color:#ffffff;text-decoration:none;font-weight:600;">Start a new claim</a></td>
<td style="width:8px;">&nbsp;</td>
<td><a href="mailto:${supportEmail}" style="display:inline-block;padding:12px 20px;font-size:14px;color:#1B365D;text-decoration:none;font-weight:600;border:1px solid #1B365D;border-radius:8px;">Contact support</a></td></tr></table>
<p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">We're happy to walk you through what we need.</p></td></tr>
<tr><td style="background:#1B365D;padding:20px 32px;text-align:center;">
<p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p></td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SRK || !RESEND_API_KEY) {
      log("ERROR", "Missing env");
      return json(500, { error: "Server misconfigured", code: "SERVER_MISCONFIGURED" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Authentication required", code: "AUTH_MISSING" });
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: u, error: uErr } = await anon.auth.getUser(token);
    if (uErr || !u?.user) return json(401, { error: "Invalid authentication", code: "AUTH_INVALID" });

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);

    const { data: adminCheck } = await svc.rpc("is_admin", { p_user_id: u.user.id });
    if (!adminCheck) return json(403, { error: "Admin only", code: "NOT_ADMIN" });

    let body: { claimRequestId?: string };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "BAD_JSON" }); }
    const claimRequestId = String(body.claimRequestId ?? "").trim();
    if (!UUID_REGEX.test(claimRequestId)) return json(400, { error: "claimRequestId required", code: "INVALID_CLAIM_ID" });

    const { data: claim, error: cErr } = await svc
      .from("facility_claim_requests")
      .select("id, claimant_user_id, claimant_email, claimant_name, status, rejection_reason, facilities!inner ( id, name, slug )")
      .eq("id", claimRequestId)
      .maybeSingle();
    if (cErr) { log("ERROR", "claim lookup", { error: cErr.message }); return json(500, { error: "Internal error", code: "DB_ERROR" }); }
    if (!claim) return json(404, { error: "Claim not found", code: "CLAIM_NOT_FOUND" });
    if (claim.status !== "rejected") {
      return json(409, { error: `Claim is ${claim.status}; can only email rejected claims via this function`, code: "CLAIM_NOT_REJECTED" });
    }

    // deno-lint-ignore no-explicit-any
    const fac = (claim as any).facilities;
    const facilityName = fac?.name ?? "your facility";
    const facilitySlug = fac?.slug ?? "";

    let recipientEmail = String(claim.claimant_email ?? "").trim();
    try {
      const { data: authUser } = await svc.auth.admin.getUserById(String(claim.claimant_user_id));
      if (authUser?.user?.email) recipientEmail = authUser.user.email;
    } catch (e) {
      log("WARN", "auth email lookup failed; using claim email", { error: String(e) });
    }
    if (!recipientEmail) return json(500, { error: "No recipient email available", code: "NO_RECIPIENT" });

    const baseUrl = SUPABASE_URL.includes("localhost") ? "http://localhost:8080" : "https://rehablookup.com";
    const retryUrl = facilitySlug ? `${baseUrl}/center/${facilitySlug}` : `${baseUrl}/`;
    const supportEmail = "support@rehablookup.com";

    try {
      const resend = new Resend(RESEND_API_KEY);
      // deno-lint-ignore no-explicit-any
      const sendRes = await (resend.emails as any).send({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: [recipientEmail],
        subject: `Update on your claim: ${facilityName}`,
        html: emailHtml(
          claim.claimant_name ?? "",
          facilityName,
          claim.rejection_reason ?? "",
          retryUrl,
          supportEmail,
        ),
      });
      if (sendRes?.error) {
        log("ERROR", "resend error", { error: sendRes.error });
        return json(502, { error: "Failed to send rejection email", code: "EMAIL_SEND_FAILED" });
      }
    } catch (sendErr) {
      log("ERROR", "resend exception", { error: String(sendErr) });
      return json(502, { error: "Failed to send rejection email", code: "EMAIL_SEND_FAILED" });
    }

    try {
      await svc.from("admin_notifications").insert({
        type: "claim_rejection_email_sent",
        title: "Claim rejection email sent",
        message: `Sent rejection email for "${facilityName}" to ${recipientEmail}.`,
        metadata: { claim_id: claimRequestId, recipient: recipientEmail },
      });
    } catch (notifErr) {
      log("WARN", "notification insert", { error: String(notifErr) });
    }

    log("INFO", "Rejection email sent", { claimRequestId });
    return json(200, { success: true, recipientMasked: recipientEmail.replace(/^(.{2}).*(@.*)$/, "$1***$2") });
  } catch (e) {
    log("ERROR", "unhandled", { error: e instanceof Error ? e.message : String(e) });
    return json(500, { error: "Internal error", code: "UNHANDLED" });
  }
});
