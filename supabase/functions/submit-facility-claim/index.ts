// ============================================================================
// submit-facility-claim v2.0.0
// ----------------------------------------------------------------------------
// Authenticated endpoint that creates OR updates a facility claim request.
//
// v2 changes from v1:
//   - Idempotent on (claimant_user_id, facility_id, active status). If the
//     caller already has a pending/under_review claim for this facility, this
//     UPDATES it rather than 409-ing. Wizard can call multiple times across
//     steps to persist progress.
//   - Accepts optional verificationMethod ('email_domain'|'sms_phone'|'document_upload').
//     For document_upload: server sets verification_status='pending' so admin
//     will review the uploaded docs in /admin/claims and mark verified.
//     For email/sms: server records the method intent; actual code-issuance
//     happens via the separate initiate-claim-*-verification endpoints.
//   - Accepts optional pendingEnrichments JSONB blob — wizard captures
//     description, photos, services, etc. and the approval trigger
//     materializes these into the facility on approve.
//
// Backwards compat: omitting verificationMethod and pendingEnrichments yields
// exactly v1 behavior. Existing ClaimListingModal callers continue to work.
//
// Required body fields:
//   facilityId, claimantName, claimantEmail, claimantRole
// Optional body fields:
//   claimantPhone, evidenceUrl, evidenceNotes,
//   verificationMethod, pendingEnrichments
//
// Returns:
//   200 { claimRequestId, status, action: 'created'|'updated' }
//   400 validation, 401 auth, 404 facility not found,
//   409 facility already claimed or not approved
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

// 2.1.0 (2026-07-03): owned facilities (user_id set) are non-claimable even
// when claimed_at is NULL — closes third-party claims against provider-created
// listings.
const VERSION = "2.1.0";

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
  console.log(`[SUBMIT-FACILITY-CLAIM] [${VERSION}] [${level}] ${msg}${d}`);
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_METHODS = new Set(["email_domain", "sms_phone", "document_upload"]);

const ENRICHMENT_KEYS = new Set([
  "description",
  "corrected_contact",
  "logo_path",
  "photo_paths",
  "services",
  "insurances",
  "accreditations",
]);

function sanitizeEnrichments(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (ENRICHMENT_KEYS.has(k) && v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SRK) {
      log("ERROR", "Missing env");
      return json(500, { error: "Server misconfigured", code: "SERVER_MISCONFIGURED" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Authentication required", code: "AUTH_MISSING" });
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: u, error: uErr } = await anon.auth.getUser(token);
    if (uErr || !u?.user) return json(401, { error: "Invalid authentication", code: "AUTH_INVALID" });
    const claimantUserId = u.user.id;

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "BAD_JSON" }); }

    const facilityId = String(body.facilityId ?? "").trim();
    const claimantName = String(body.claimantName ?? "").trim();
    const claimantEmail = String(body.claimantEmail ?? "").trim().toLowerCase();
    const claimantRole = String(body.claimantRole ?? "").trim();
    const claimantPhone = body.claimantPhone ? String(body.claimantPhone).trim() : null;
    const evidenceUrl = body.evidenceUrl ? String(body.evidenceUrl).trim() : null;
    const evidenceNotes = body.evidenceNotes ? String(body.evidenceNotes).trim() : null;
    const verificationMethod = body.verificationMethod ? String(body.verificationMethod).trim() : null;
    const pendingEnrichments = sanitizeEnrichments(body.pendingEnrichments);

    if (!UUID_REGEX.test(facilityId)) return json(400, { error: "facilityId must be a valid UUID", code: "INVALID_FACILITY_ID" });
    if (claimantName.length < 2 || claimantName.length > 120) return json(400, { error: "claimantName must be 2-120 chars", code: "INVALID_NAME" });
    if (!EMAIL_REGEX.test(claimantEmail) || claimantEmail.length > 200) return json(400, { error: "claimantEmail must be a valid email", code: "INVALID_EMAIL" });
    if (claimantRole.length < 2 || claimantRole.length > 100) return json(400, { error: "claimantRole must be 2-100 chars", code: "INVALID_ROLE" });
    if (claimantPhone && (claimantPhone.length < 7 || claimantPhone.length > 30)) return json(400, { error: "claimantPhone must be 7-30 chars", code: "INVALID_PHONE" });
    if (evidenceUrl && evidenceUrl.length > 500) return json(400, { error: "evidenceUrl too long", code: "INVALID_EVIDENCE_URL" });
    if (evidenceNotes && evidenceNotes.length > 2000) return json(400, { error: "evidenceNotes too long", code: "INVALID_EVIDENCE_NOTES" });
    if (verificationMethod && !VALID_METHODS.has(verificationMethod)) {
      return json(400, { error: "verificationMethod must be one of email_domain, sms_phone, document_upload", code: "INVALID_VERIFICATION_METHOD" });
    }

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);

    const { data: facility, error: fErr } = await svc
      .from("facilities")
      .select("id, name, user_id, claimed_at, status")
      .eq("id", facilityId)
      .maybeSingle();
    if (fErr) { log("ERROR", "facility lookup", { error: fErr.message }); return json(500, { error: "Internal error", code: "FACILITY_LOOKUP_FAILED" }); }
    if (!facility) return json(404, { error: "Facility not found", code: "FACILITY_NOT_FOUND" });
    if (facility.status !== "approved") return json(409, { error: "This facility is not currently accepting claims", code: "FACILITY_NOT_CLAIMABLE" });
    // Ownership (user_id set) makes a listing non-claimable, however it was
    // established. The old guard required claimed_at TOO, which is only ever
    // written by the claim-approval flow — so provider-CREATED facilities
    // (user_id set, claimed_at NULL) were claimable by third parties
    // (2026-07-03 audit, gap G1).
    if (facility.user_id) return json(409, { error: "This facility is already managed by a provider account", code: "FACILITY_ALREADY_CLAIMED" });

    const { data: existing, error: exErr } = await svc
      .from("facility_claim_requests")
      .select("id, status, verification_method, verification_status")
      .eq("facility_id", facilityId)
      .eq("claimant_user_id", claimantUserId)
      .in("status", ["pending", "under_review"])
      .maybeSingle();
    if (exErr) { log("ERROR", "existing claim lookup", { error: exErr.message }); return json(500, { error: "Internal error", code: "DB_ERROR" }); }

    const verStatusForDocUpload = verificationMethod === "document_upload" ? "pending" : null;

    if (existing) {
      const updatePayload: Record<string, unknown> = {
        claimant_name: claimantName,
        claimant_email: claimantEmail,
        claimant_phone: claimantPhone,
        claimant_role: claimantRole,
        evidence_url: evidenceUrl,
        evidence_notes: evidenceNotes,
        pending_enrichments: pendingEnrichments,
        updated_at: new Date().toISOString(),
      };
      if (verificationMethod) {
        updatePayload.verification_method = verificationMethod;
        if (verStatusForDocUpload) updatePayload.verification_status = verStatusForDocUpload;
      }

      const { error: updErr } = await svc
        .from("facility_claim_requests")
        .update(updatePayload)
        .eq("id", existing.id);
      if (updErr) { log("ERROR", "update failed", { error: updErr.message }); return json(500, { error: "Failed to update claim", code: "CLAIM_UPDATE_FAILED" }); }

      log("INFO", "Claim updated", { claimId: existing.id });
      return json(200, {
        success: true,
        claimRequestId: existing.id,
        status: existing.status,
        action: "updated",
        message: "Your claim has been updated.",
      });
    }

    const insertPayload: Record<string, unknown> = {
      facility_id: facilityId,
      claimant_user_id: claimantUserId,
      claimant_email: claimantEmail,
      claimant_phone: claimantPhone,
      claimant_name: claimantName,
      claimant_role: claimantRole,
      evidence_url: evidenceUrl,
      evidence_notes: evidenceNotes,
      pending_enrichments: pendingEnrichments,
      status: "pending",
    };
    if (verificationMethod) {
      insertPayload.verification_method = verificationMethod;
      if (verStatusForDocUpload) insertPayload.verification_status = verStatusForDocUpload;
    }

    const { data: claim, error: insErr } = await svc
      .from("facility_claim_requests")
      .insert(insertPayload)
      .select("id, status, created_at")
      .single();
    if (insErr) {
      if (insErr.code === "23505") {
        const { data: race } = await svc
          .from("facility_claim_requests")
          .select("id, status")
          .eq("facility_id", facilityId)
          .eq("claimant_user_id", claimantUserId)
          .in("status", ["pending", "under_review"])
          .maybeSingle();
        if (race) {
          return json(200, { success: true, claimRequestId: race.id, status: race.status, action: "updated", message: "Your claim is on file." });
        }
        return json(409, { error: "You already have a pending claim for this facility", code: "CLAIM_ALREADY_PENDING" });
      }
      log("ERROR", "insert failed", { error: insErr.message });
      return json(500, { error: "Failed to submit claim", code: "CLAIM_INSERT_FAILED" });
    }

    try {
      await svc.from("admin_notifications").insert({
        type: "facility_claim_submitted",
        title: "New Facility Claim",
        message: `${claimantName} (${claimantRole}) submitted a claim for "${facility.name}".${verificationMethod ? ` Verification method: ${verificationMethod.replace("_", " ")}.` : ""} Review in /admin/claims.`,
        metadata: {
          claim_id: claim.id,
          facility_id: facilityId,
          facility_name: facility.name,
          claimant_user_id: claimantUserId,
          claimant_email: claimantEmail,
          verification_method: verificationMethod,
        },
      });
    } catch (notifError) {
      log("WARN", "admin notification insert failed", { error: String(notifError) });
    }

    log("INFO", "Claim created", { claimId: claim.id, method: verificationMethod ?? "none" });
    return json(200, {
      success: true,
      claimRequestId: claim.id,
      status: claim.status,
      action: "created",
      createdAt: claim.created_at,
      message: "Your claim has been submitted. Our team will review it within 1–2 business days.",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", "Unhandled exception", { error: errorMessage });
    return json(500, { error: "Internal error", code: "UNHANDLED_EXCEPTION" });
  }
});
