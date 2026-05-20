/**
 * submit-insurance-verification — accepts a verification-of-benefits
 * (VOB) request from the seeker form at /insurance-verification.
 *
 * The `insurance_verification_requests` table has RLS enabled with
 * only a service-role INSERT policy (no anon/authenticated insert
 * path), so this function is the ONLY way new VOB requests enter
 * the system.
 *
 * What it does:
 *   1. Validates input (name, email, phone, carrier required; field
 *      lengths enforced; preferred_contact/urgency/relationship are
 *      enum-checked against allowed values)
 *   2. Rate-limits: 5 submissions per email per 60 minutes (mirrors
 *      submit-qualified-lead pattern)
 *   3. Hashes client IP (SHA-256 + salt) for fraud / duplicate
 *      detection without storing the raw IP
 *   4. Captures `linked_user_id` if the caller is authenticated, so
 *      the seeker can see their own VOB requests in their dashboard
 *      via the existing `Seekers can read their own linked VOB
 *      requests` RLS policy
 *   5. Inserts via service-role client (bypasses RLS-deny for
 *      anonymous inserts)
 *   6. Writes admin_notifications row so ops sees pending requests
 *      on the dashboard
 *   7. Returns { requestId } so the frontend can show a confirmation
 *      reference number
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PREFERRED_CONTACT_VALUES = new Set(["phone", "email", "text"]);
const URGENCY_VALUES = new Set(["immediate", "within_week", "flexible"]);
const RELATIONSHIP_VALUES = new Set(["self", "spouse", "parent", "child", "other"]);

const MAX_EMAIL_SUBMISSIONS_PER_HOUR = 5;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitize(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength).replace(/[<>]/g, "");
}

function sanitizePhone(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[^\d+\-() ]/g, "").slice(0, 32);
}

async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const salt = "ivr-salt-v1";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + salt));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Use POST", code: "method_not_allowed" });

  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error(`[submit-insurance-verification] missing env`);
      return json(500, { error: "Server misconfigured", code: "server_misconfigured" });
    }
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    // ── Required fields ──────────────────────────────────────────
    const firstName = sanitize(body.firstName, 100);
    const lastName = sanitize(body.lastName, 100);
    const phone = sanitizePhone(body.phone);
    const email = sanitize(body.email, 255).toLowerCase();
    const carrier = sanitize(body.carrier, 200);

    if (!firstName) return json(400, { error: "firstName is required", code: "missing_first_name" });
    if (!lastName) return json(400, { error: "lastName is required", code: "missing_last_name" });
    if (phone.replace(/\D/g, "").length < 10) {
      return json(400, { error: "phone must have at least 10 digits", code: "invalid_phone" });
    }
    if (!EMAIL_REGEX.test(email)) {
      return json(400, { error: "Valid email is required", code: "invalid_email" });
    }
    if (!carrier) return json(400, { error: "carrier is required", code: "missing_carrier" });

    // ── Enum-validated fields ────────────────────────────────────
    const preferredContact = sanitize(body.preferredContact, 20) || "phone";
    if (!PREFERRED_CONTACT_VALUES.has(preferredContact)) {
      return json(400, {
        error: `preferredContact must be one of: ${Array.from(PREFERRED_CONTACT_VALUES).join(", ")}`,
        code: "invalid_preferred_contact",
      });
    }

    const urgencyRaw = sanitize(body.urgency, 30) || null;
    const urgency = urgencyRaw && URGENCY_VALUES.has(urgencyRaw) ? urgencyRaw : null;

    const relationshipRaw = sanitize(body.policyHolderRelationship, 20) || null;
    const policyHolderRelationship = relationshipRaw && RELATIONSHIP_VALUES.has(relationshipRaw) ? relationshipRaw : null;

    // ── Optional sanitized fields ─────────────────────────────────
    const dateOfBirth = (() => {
      const raw = sanitize(body.dateOfBirth, 20);
      if (!raw) return null;
      // Accept YYYY-MM-DD only; let Postgres validate the rest
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
      return raw;
    })();
    const memberId = sanitize(body.memberId, 100) || null;
    const groupNumber = sanitize(body.groupNumber, 100) || null;
    const policyHolderName = sanitize(body.policyHolderName, 200) || null;
    const primarySubstance = sanitize(body.primarySubstance, 100) || null;
    const levelOfCare = sanitize(body.levelOfCare, 100) || null;
    const preferredState = sanitize(body.preferredState, 50) || null;
    const preferredCity = sanitize(body.preferredCity, 100) || null;
    const notes = sanitize(body.notes, 2000) || null;
    const landingPage = sanitize(body.landingPage, 500) || null;
    const referrer = sanitize(body.referrer, 500) || null;
    const utmSource = sanitize(body.utmSource, 100) || null;
    const utmMedium = sanitize(body.utmMedium, 100) || null;
    const utmCampaign = sanitize(body.utmCampaign, 100) || null;

    // ── Capture user agent + IP-hash for fraud detection ─────────
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ??
      null;
    const ipHash = await hashIp(clientIp);

    // ── Capture linked_user_id when authenticated ────────────────
    // The seeker form can be submitted by anonymous users; if a
    // logged-in seeker submits we link the record so they see it
    // in their /seeker/insurance-verifications dashboard.
    let linkedUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await anonClient.auth.getUser();
        if (user) linkedUserId = user.id;
      } catch {
        // Treat as anonymous; not blocking
      }
    }

    // ── Rate-limit per email ─────────────────────────────────────
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await adminClient
      .from("insurance_verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= MAX_EMAIL_SUBMISSIONS_PER_HOUR) {
      return json(429, {
        error: "Too many verification requests from this email. Please wait before submitting again.",
        code: "rate_limit_exceeded",
        retryAfterSeconds: 60 * 60,
      });
    }

    // ── Insert ───────────────────────────────────────────────────
    const { data: inserted, error: insertErr } = await adminClient
      .from("insurance_verification_requests")
      .insert({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        phone,
        email,
        preferred_contact: preferredContact,
        carrier,
        member_id: memberId,
        group_number: groupNumber,
        policy_holder_name: policyHolderName,
        policy_holder_relationship: policyHolderRelationship,
        primary_substance: primarySubstance,
        urgency,
        level_of_care: levelOfCare,
        preferred_state: preferredState,
        preferred_city: preferredCity,
        notes,
        source: "insurance_verification_form",
        landing_page: landingPage,
        user_agent: userAgent,
        ip_hash: ipHash,
        referrer,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        linked_user_id: linkedUserId,
        // status defaults to 'new' via the column default
      })
      .select("id, created_at")
      .single();

    if (insertErr || !inserted) {
      console.error(`[submit-insurance-verification] insert failed`, insertErr);
      return json(500, { error: "Could not save verification request", code: "insert_failed" });
    }

    // ── Notify admin ops ─────────────────────────────────────────
    try {
      await adminClient.from("admin_notifications").insert({
        type: "insurance_verification_submitted",
        title: "New insurance verification request",
        message: `${firstName} ${lastName} (${carrier}) — ${urgency ?? "flexible"}${preferredState ? ` — ${preferredState}` : ""}`,
        metadata: {
          request_id: inserted.id,
          carrier,
          urgency,
          preferred_state: preferredState,
          preferred_city: preferredCity,
          level_of_care: levelOfCare,
          linked_user_id: linkedUserId,
        },
      });
    } catch (notifErr) {
      console.warn(`[submit-insurance-verification] admin_notifications insert failed (non-blocking)`, notifErr);
    }

    return json(200, {
      success: true,
      requestId: inserted.id,
      _version: VERSION,
    });
  } catch (err) {
    console.error(`[submit-insurance-verification] unexpected error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
