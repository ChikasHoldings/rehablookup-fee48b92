// ============================================================================
// initiate-claim-email-verification v1.0.0
// ----------------------------------------------------------------------------
// Verification path 1 of 3: WORK EMAIL DOMAIN.
// Sends a 6-digit OTP via Resend to an email at the facility's web domain.
//
// Body:  { claimRequestId: uuid, email: string }
// Auth:  required (verify_jwt=true). Caller must be the claimant.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";

const VERSION = "1.0.0";
const OTP_TTL_MIN = 10;
const MAX_ACTIVE_CODES = 3;

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
  console.log(`[INITIATE-CLAIM-EMAIL] [${VERSION}] [${level}] ${msg}${d}`);
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function extractDomain(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null;
  try {
    const u = new URL(input.startsWith("http") ? input : `https://${input}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function emailDomainMatchesWebsite(email: string, websiteDomain: string): boolean {
  const emailDomain = email.split("@")[1]?.toLowerCase();
  if (!emailDomain) return false;
  const wd = websiteDomain.toLowerCase();
  return emailDomain === wd || emailDomain.endsWith(`.${wd}`);
}

function sixDigit(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

function emailHtml(code: string, facilityName: string, expiryMin: number): string {
  const safe = facilityName.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);padding:32px;text-align:center;">
<p style="margin:0 0 4px 0;font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1.5px;">REHABLOOKUP</p>
<h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">Verify your claim</h1></td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px 0;color:#111827;font-size:15px;line-height:1.6;">Hi,</p>
<p style="margin:0 0 24px 0;color:#374151;font-size:15px;line-height:1.6;">You're verifying your claim of <strong style="color:#0f766e;">${safe}</strong> on RehabLookup. Enter the code below to confirm you have access to this email address.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;margin-bottom:24px;"><tr><td style="padding:24px;text-align:center;">
<p style="margin:0 0 8px 0;font-size:12px;color:#0f766e;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Your verification code</p>
<p style="margin:0;font-size:36px;font-weight:700;color:#0f766e;letter-spacing:6px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${code}</p>
<p style="margin:12px 0 0 0;font-size:13px;color:#115e59;">Expires in ${expiryMin} minutes</p></td></tr></table>
<p style="margin:0 0 12px 0;color:#374151;font-size:14px;line-height:1.6;">Didn't try to claim this listing? Ignore this email or reply to let us know.</p>
<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">For your security, never share this code with anyone.</p></td></tr>
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
    const callerId = u.user.id;

    let body: { claimRequestId?: string; email?: string };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "BAD_JSON" }); }
    const claimRequestId = String(body.claimRequestId ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!UUID_REGEX.test(claimRequestId)) return json(400, { error: "claimRequestId required", code: "INVALID_CLAIM_ID" });
    if (!EMAIL_REGEX.test(email) || email.length > 200) return json(400, { error: "Valid email required", code: "INVALID_EMAIL" });

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);

    const { data: claim, error: cErr } = await svc
      .from("facility_claim_requests")
      .select("id, claimant_user_id, status, verification_status, facilities!inner ( id, name, website )")
      .eq("id", claimRequestId)
      .maybeSingle();
    if (cErr) { log("ERROR", "claim lookup", { error: cErr.message }); return json(500, { error: "Internal error", code: "DB_ERROR" }); }
    if (!claim) return json(404, { error: "Claim not found", code: "CLAIM_NOT_FOUND" });
    if (claim.claimant_user_id !== callerId) return json(403, { error: "Not the claimant on this request", code: "NOT_CLAIMANT" });
    if (!("status" in claim) || (claim.status !== "pending" && claim.status !== "under_review")) {
      return json(409, { error: `Claim is ${claim.status}; cannot start verification`, code: "CLAIM_NOT_OPEN" });
    }

    // deno-lint-ignore no-explicit-any
    const fac = (claim as any).facilities;
    if (!fac?.website) return json(409, {
      error: "This facility has no website on file, so email-domain verification isn't available. Try SMS or document upload.",
      code: "WEBSITE_NOT_AVAILABLE",
    });
    const fDomain = extractDomain(fac.website);
    if (!fDomain) return json(409, { error: "Facility website is not a parseable URL", code: "WEBSITE_UNPARSEABLE" });
    if (!emailDomainMatchesWebsite(email, fDomain)) {
      return json(422, {
        error: `Email must be on the facility's domain (@${fDomain} or a subdomain).`,
        code: "DOMAIN_MISMATCH",
        expectedDomain: fDomain,
      });
    }

    const { count: activeCodes } = await svc
      .from("email_verification_codes")
      .select("id", { count: "exact", head: true })
      .eq("claim_request_id", claimRequestId)
      .eq("purpose", "claim_verification")
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString());
    if ((activeCodes ?? 0) >= MAX_ACTIVE_CODES) {
      return json(429, { error: "Too many active codes. Wait for them to expire (10 min) or check your inbox.", code: "TOO_MANY_CODES" });
    }

    const code = sixDigit();
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString();
    const { error: insErr } = await svc.from("email_verification_codes").insert({
      email, code, expires_at: expiresAt, attempts: 0, verified: false,
      claim_request_id: claimRequestId, purpose: "claim_verification",
    });
    if (insErr) { log("ERROR", "otp insert", { error: insErr.message }); return json(500, { error: "Failed to issue code", code: "OTP_INSERT_FAILED" }); }

    const { error: updErr } = await svc.from("facility_claim_requests").update({
      verification_method: "email_domain",
      verification_status: "pending",
      verification_email: email,
      updated_at: new Date().toISOString(),
    }).eq("id", claimRequestId);
    if (updErr) log("WARN", "claim update", { error: updErr.message });

    try {
      const resend = new Resend(RESEND_API_KEY);
      // deno-lint-ignore no-explicit-any
      const sendRes = await (resend.emails as any).send({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: [email],
        subject: `Your verification code: ${code}`,
        html: emailHtml(code, fac.name, OTP_TTL_MIN),
      });
      if (sendRes?.error) {
        log("ERROR", "resend error", { error: sendRes.error });
        return json(502, { error: "Failed to send verification email", code: "EMAIL_SEND_FAILED" });
      }
    } catch (sendErr) {
      log("ERROR", "resend exception", { error: String(sendErr) });
      return json(502, { error: "Failed to send verification email", code: "EMAIL_SEND_FAILED" });
    }

    log("INFO", "Code sent", { claimRequestId, email: email.slice(0, 3) + "***" });
    return json(200, {
      success: true,
      method: "email_domain",
      expiresAt,
      maskedEmail: email.replace(/^(.{2}).*(@.*)$/, "$1***$2"),
    });
  } catch (e) {
    log("ERROR", "unhandled", { error: e instanceof Error ? e.message : String(e) });
    return json(500, { error: "Internal error", code: "UNHANDLED" });
  }
});
