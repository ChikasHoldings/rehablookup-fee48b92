// ============================================================================
// send-claim-approval-email v1.0.0
// ----------------------------------------------------------------------------
// Notifies the claimant that their facility claim was approved.
//
// Body:  { claimRequestId: uuid }
// Auth:  Gateway verify_jwt is disabled for this function (see config.toml);
//        authorization is enforced in the body. Accepts EITHER (a) an admin
//        user JWT (verified via getUser + is_admin), OR (b) a trusted system
//        caller presenting the project service-role key as the Bearer token —
//        used by the DB auto-approval trigger (handle_claim_request_approval)
//        to email a claimant whose claim was auto-approved by the verification
//        engine with no admin in the loop.
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
  console.log(`[SEND-CLAIM-APPROVAL-EMAIL] [${VERSION}] [${level}] ${msg}${d}`);
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function emailHtml(claimantName: string, facilityName: string, dashboardUrl: string): string {
  const esc = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const safeName = esc(facilityName);
  const safeClaimant = esc(claimantName || "there");
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:32px;text-align:center;">
<p style="margin:0 0 4px 0;font-size:11px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1.5px;">REHABLOOKUP</p>
<h1 style="margin:0;font-size:24px;color:#ffffff;font-weight:600;">Your claim is approved</h1></td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px 0;color:#111827;font-size:15px;line-height:1.6;">Hi ${safeClaimant},</p>
<p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.6;">Good news — your claim of <strong style="color:#059669;">${safeName}</strong> on RehabLookup has been approved. Ownership of the listing has transferred to your account.</p>
<p style="margin:0 0 24px 0;color:#374151;font-size:15px;line-height:1.6;">Anything you submitted while claiming (logo, photos, services, insurance, accreditations, contact updates, description) is now live on the public listing.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="border-radius:8px;background:#059669;">
<a href="${dashboardUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;color:#ffffff;text-decoration:none;font-weight:600;">Open your provider dashboard</a></td></tr></table>
<p style="margin:0 0 8px 0;color:#374151;font-size:14px;line-height:1.6;"><strong>What you can do now:</strong></p>
<ul style="margin:0 0 16px 0;padding-left:20px;color:#374151;font-size:14px;line-height:1.7;"><li>Edit or polish your listing</li><li>Track inquiries and leads</li><li>Upgrade to Pro for direct contact display and priority placement</li></ul>
<p style="margin:24px 0 0 0;color:#6b7280;font-size:13px;line-height:1.6;">Questions? Just reply to this email — we're here to help.</p></td></tr>
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
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);

    // Trusted system caller: the DB auto-approval trigger
    // (handle_claim_request_approval) invokes this function with the
    // service-role key — a server-only secret that never reaches a browser —
    // to notify a claimant whose claim was auto-approved by the verification
    // engine with no admin in the loop. Those calls skip the interactive
    // admin gate. Every other caller must present a valid admin user JWT.
    const isSystemCaller = token.length > 0 && token === SUPABASE_SRK;
    if (!isSystemCaller) {
      const anon = createClient(SUPABASE_URL, SUPABASE_ANON);
      const { data: u, error: uErr } = await anon.auth.getUser(token);
      if (uErr || !u?.user) return json(401, { error: "Invalid authentication", code: "AUTH_INVALID" });
      const { data: adminCheck } = await svc.rpc("is_admin", { p_user_id: u.user.id });
      if (!adminCheck) return json(403, { error: "Admin only", code: "NOT_ADMIN" });
    }

    let body: { claimRequestId?: string };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "BAD_JSON" }); }
    const claimRequestId = String(body.claimRequestId ?? "").trim();
    if (!UUID_REGEX.test(claimRequestId)) return json(400, { error: "claimRequestId required", code: "INVALID_CLAIM_ID" });

    const { data: claim, error: cErr } = await svc
      .from("facility_claim_requests")
      .select("id, claimant_user_id, claimant_email, claimant_name, status, facilities!inner ( id, name, slug )")
      .eq("id", claimRequestId)
      .maybeSingle();
    if (cErr) { log("ERROR", "claim lookup", { error: cErr.message }); return json(500, { error: "Internal error", code: "DB_ERROR" }); }
    if (!claim) return json(404, { error: "Claim not found", code: "CLAIM_NOT_FOUND" });
    if (claim.status !== "approved") {
      return json(409, { error: `Claim is ${claim.status}; can only email approved claims via this function`, code: "CLAIM_NOT_APPROVED" });
    }

    // deno-lint-ignore no-explicit-any
    const fac = (claim as any).facilities;
    const facilityName = fac?.name ?? "your facility";

    let recipientEmail = String(claim.claimant_email ?? "").trim();
    try {
      const { data: authUser } = await svc.auth.admin.getUserById(String(claim.claimant_user_id));
      if (authUser?.user?.email) recipientEmail = authUser.user.email;
    } catch (e) {
      log("WARN", "auth email lookup failed; using claim email", { error: String(e) });
    }
    if (!recipientEmail) return json(500, { error: "No recipient email available", code: "NO_RECIPIENT" });

    const dashboardUrl = `${SUPABASE_URL.includes("localhost") ? "http://localhost:8080" : "https://rehablookup.com"}/provider/dashboard`;

    try {
      const resend = new Resend(RESEND_API_KEY);
      // deno-lint-ignore no-explicit-any
      const sendRes = await (resend.emails as any).send({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: [recipientEmail],
        subject: `Your claim is approved: ${facilityName}`,
        html: emailHtml(claim.claimant_name ?? "", facilityName, dashboardUrl),
      });
      if (sendRes?.error) {
        log("ERROR", "resend error", { error: sendRes.error });
        return json(502, { error: "Failed to send approval email", code: "EMAIL_SEND_FAILED" });
      }
    } catch (sendErr) {
      log("ERROR", "resend exception", { error: String(sendErr) });
      return json(502, { error: "Failed to send approval email", code: "EMAIL_SEND_FAILED" });
    }

    try {
      await svc.from("admin_notifications").insert({
        type: "claim_approval_email_sent",
        title: "Claim approval email sent",
        message: `Sent approval email for "${facilityName}" to ${recipientEmail}.`,
        metadata: { claim_id: claimRequestId, recipient: recipientEmail },
      });
    } catch (notifErr) {
      log("WARN", "notification insert", { error: String(notifErr) });
    }

    log("INFO", "Approval email sent", { claimRequestId });
    return json(200, { success: true, recipientMasked: recipientEmail.replace(/^(.{2}).*(@.*)$/, "$1***$2") });
  } catch (e) {
    log("ERROR", "unhandled", { error: e instanceof Error ? e.message : String(e) });
    return json(500, { error: "Internal error", code: "UNHANDLED" });
  }
});
