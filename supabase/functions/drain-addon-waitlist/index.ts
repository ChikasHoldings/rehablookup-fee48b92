// ============================================================================
// drain-addon-waitlist v1.0.1
// ----------------------------------------------------------------------------
// Cron-triggered drain. For every open waitlist row whose scope currently
// has at least one free slot, send the requester an "invite" email via
// Resend and flip the row to status='invited'. Idempotent: the flip happens
// inside the same transaction as the "send attempt" decision, so if
// concurrent runs race we get exactly-one invite via the partial-unique
// index that already guarantees one open row per (facility, scope).
//
// Schedule: pg_cron job 'drain-addon-waitlist' every 5 minutes
// (see migration 20260605000000_addon_waitlist_drain_cron.sql).
//
// Authorization: verify_jwt:true at the platform level validates the JWT
// signature; this function additionally asserts the JWT's role claim is
// 'service_role' so non-cron callers (with any other valid JWT) are
// rejected with 403. We do NOT compare against env SUPABASE_SERVICE_ROLE_KEY
// literally because Supabase has migrated to sb_secret_* keys for new
// projects while the legacy JWT-shaped service-role keys still pass
// platform validation; comparing literals breaks across key formats.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { assertCronSecret } from "../_shared/cron-auth.ts";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";

const VERSION = "1.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify({ ...body, _version: VERSION }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (level: "INFO" | "WARN" | "ERROR", msg: string, details?: unknown) => {
  const d = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[DRAIN-ADDON-WAITLIST] [${VERSION}] [${level}] ${msg}${d}`);
};

/** Decode a JWT payload without verifying signature. The platform's
 *  verify_jwt:true has already validated the signature; we only need
 *  the role claim. */
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

interface WaitlistRow {
  id: string;
  addon_type: "featured" | "concierge";
  facility_id: string;
  requested_by: string;
  scope_type: string | null;
  scope_value: string | null;
  geo_state: string | null;
  geo_city: string | null;
  level_of_care: string[] | null;
  requested_at: string;
  auto_invite_opt_out: boolean | null;
}

/** Days an invited row stays open before auto-expiry. */
const INVITE_EXPIRY_DAYS = 7;

function emailHtml(args: {
  facilityName: string;
  addonLabel: string;
  scopeLabel: string;
  manageUrl: string;
  expiryDate: string;
}): string {
  const safe = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#1B365D;padding:32px;text-align:center;">
<p style="margin:0 0 4px 0;font-size:11px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1.5px;">REHABLOOKUP</p>
<h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">A slot just opened up — claim by ${safe(args.expiryDate)}</h1></td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px 0;color:#111827;font-size:15px;line-height:1.6;">Hi there,</p>
<p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.6;">
You opted in to the waitlist for <strong>${safe(args.addonLabel)}</strong> on
<strong>${safe(args.scopeLabel)}</strong> for <strong>${safe(args.facilityName)}</strong>. A
slot has just freed up — you can claim it now.
</p>
<div style="margin:0 0 24px 0;padding:16px;border-radius:8px;background:#fef3c7;border:1px solid #fbbf24;">
<p style="margin:0;color:#92400e;font-size:14px;font-weight:600;">⏰ Claim by ${safe(args.expiryDate)}</p>
<p style="margin:4px 0 0 0;color:#78350f;font-size:13px;line-height:1.5;">
Slots are first-come first-served. If unclaimed after ${INVITE_EXPIRY_DAYS} days, this
invitation expires and the slot is offered to the next provider in line.
</p>
</div>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="border-radius:8px;background:#1B365D;">
<a href="${args.manageUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;color:#ffffff;text-decoration:none;font-weight:600;">Claim your slot now →</a>
</td></tr></table>
<p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
If you no longer want this placement, you can remove yourself from the waitlist
via the dashboard — or simply do nothing and your invitation will expire on
<strong>${safe(args.expiryDate)}</strong> so the next provider in line can be notified.
</p></td></tr>
<tr><td style="background:#1B365D;padding:20px 32px;text-align:center;">
<p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const __cronAuth = assertCronSecret(req);
  if (!__cronAuth.ok) return __cronAuth.response;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!SUPABASE_URL || !SUPABASE_SRK || !RESEND_API_KEY) {
      log("ERROR", "Missing env");
      return json(500, { error: "Server misconfigured" });
    }

    // Service-role gate via the JWT's `role` claim. verify_jwt:true at
    // the platform level already validated the signature, so we trust
    // the payload here.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const role = jwtRole(token);
    if (role !== "service_role") {
      log("WARN", "Rejected non-service-role call", { role });
      return json(403, { error: "Forbidden" });
    }

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);
    const resend = new Resend(RESEND_API_KEY);

    // Pull at most 200 waiting rows ordered oldest-first. We re-check
    // availability per row to avoid stale slot counts.
    const { data: waiting, error: waitErr } = await svc
      .from("addon_waitlist")
      .select(
        "id, addon_type, facility_id, requested_by, scope_type, scope_value, geo_state, geo_city, level_of_care, requested_at, auto_invite_opt_out",
      )
      .eq("status", "waiting")
      .eq("auto_invite_opt_out", false)
      .order("requested_at", { ascending: true })
      .limit(200);
    if (waitErr) {
      log("ERROR", "fetch waiting failed", { error: waitErr.message });
      return json(500, { error: "DB error", code: "FETCH_FAILED" });
    }

    // ── Auto-expire stale invited rows ────────────────────────────────────
    // Invited rows are closed (freeing the slot for the next provider on this
    // tick) when their expires_at has passed. A second pass defensively expires
    // rows invited by a path that didn't stamp expires_at (e.g. an admin manual
    // flip) once their invited_at is older than INVITE_EXPIRY_DAYS. Two simple
    // UPDATEs rather than one .or() so the ISO-timestamp values can't trip the
    // PostgREST filter parser.
    const nowIso = new Date().toISOString();
    const fallbackThreshold = new Date();
    fallbackThreshold.setDate(fallbackThreshold.getDate() - INVITE_EXPIRY_DAYS);
    let expiredCount = 0;
    const { data: expiredByDate, error: expireErr } = await svc
      .from("addon_waitlist")
      .update({ status: "expired", closed_at: nowIso })
      .eq("status", "invited")
      .lt("expires_at", nowIso)
      .select("id");
    if (expireErr) {
      log("WARN", "failed to expire stale invited rows (by expires_at)", { error: expireErr.message });
    } else {
      expiredCount += (expiredByDate ?? []).length;
    }
    const { data: expiredFallback, error: expireFallbackErr } = await svc
      .from("addon_waitlist")
      .update({ status: "expired", closed_at: nowIso })
      .eq("status", "invited")
      .is("expires_at", null)
      .lt("invited_at", fallbackThreshold.toISOString())
      .select("id");
    if (expireFallbackErr) {
      log("WARN", "failed to expire stale invited rows (null expires_at fallback)", { error: expireFallbackErr.message });
    } else {
      expiredCount += (expiredFallback ?? []).length;
    }
    log("INFO", `Expired ${expiredCount} stale invited rows`);

    const stats = { considered: 0, invited: 0, slot_taken: 0, errors: 0, skipped: 0 };

    for (const row of (waiting ?? []) as WaitlistRow[]) {
      stats.considered++;
      try {
        // Check availability for this row's scope.
        let remaining = 0;
        if (row.addon_type === "featured" && row.scope_type && row.scope_value) {
          const { data, error } = await svc.rpc("get_placement_availability", {
            p_type: row.scope_type,
            p_value: row.scope_value,
          });
          if (error) throw new Error(error.message);
          remaining = (data as { remaining: number }[] | null)?.[0]?.remaining ?? 0;
        } else if (row.addon_type === "concierge" && row.geo_state) {
          const { data, error } = await svc.rpc("get_concierge_availability", {
            p_state: row.geo_state,
            p_city: row.geo_city,
          });
          if (error) throw new Error(error.message);
          remaining = (data as { remaining: number }[] | null)?.[0]?.remaining ?? 0;
        } else {
          stats.skipped++;
          continue;
        }
        if (remaining <= 0) {
          stats.slot_taken++;
          continue;
        }

        // Resolve requester email + facility name. service_role lets us
        // read auth.users.
        const [userRes, facRes] = await Promise.all([
          svc.auth.admin.getUserById(row.requested_by),
          svc.from("facilities").select("name").eq("id", row.facility_id).maybeSingle(),
        ]);
        const recipient = userRes?.data?.user?.email;
        const facilityName = (facRes.data as { name?: string } | null)?.name ?? "your facility";
        if (!recipient) {
          log("WARN", "no recipient email", { waitlistId: row.id });
          stats.skipped++;
          continue;
        }

        const scopeLabel =
          row.addon_type === "featured"
            ? `${row.scope_type}=${row.scope_value}`
            : `${row.geo_state}${row.geo_city ? "/" + row.geo_city : " (statewide)"}`;
        const addonLabel = row.addon_type === "featured" ? "Featured placement" : "Concierge Partner";
        const baseUrl = SUPABASE_URL.includes("localhost") ? "http://localhost:8080" : "https://rehablookup.com";
        const manageUrl =
          row.addon_type === "featured"
            ? `${baseUrl}/provider/marketing/featured`
            : `${baseUrl}/provider/marketing/concierge`;
        const expiryDt = new Date();
        expiryDt.setDate(expiryDt.getDate() + INVITE_EXPIRY_DAYS);
        const expiryDate = expiryDt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

        // Mark as invited BEFORE sending so a crash mid-send doesn't
        // get the user invited twice on the next cron tick. The partial
        // UNIQUE index already prevents duplicate open rows; we filter
        // on status='waiting' so a concurrent run picks a different row.
        // expires_at powers both the auto-expiry check above and the
        // "claim by" deadline displayed in the invite email.
        const { data: claimed, error: claimErr } = await svc
          .from("addon_waitlist")
          .update({
            status: "invited",
            invited_at: new Date().toISOString(),
            expires_at: expiryDt.toISOString(),
          })
          .eq("id", row.id)
          .eq("status", "waiting")
          .select("id");
        if (claimErr || !claimed || claimed.length === 0) {
          log("INFO", "row already claimed by concurrent drain", { waitlistId: row.id });
          stats.skipped++;
          continue;
        }

        // deno-lint-ignore no-explicit-any
        const sendRes = await (resend.emails as any).send({
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [recipient],
          subject: `A ${addonLabel} slot opened — claim by ${expiryDate}`,
          html: emailHtml({ facilityName, addonLabel, scopeLabel, manageUrl, expiryDate }),
          // Resend idempotency: same waitlist id ⇒ same Resend message id
          // if the send is retried within Resend's dedup window.
          headers: { "Idempotency-Key": `addon-waitlist-invite:${row.id}` },
        });
        if (sendRes?.error) {
          log("ERROR", "resend failed", { waitlistId: row.id, error: sendRes.error });
          stats.errors++;
          // Surface the failure so admin can re-invite by hand. Don't
          // revert status because the partial-unique index would let
          // someone else claim; admin can flip via the UI.
          await svc.from("admin_notifications").insert({
            type: "addon_waitlist_invite_email_failed",
            title: "Waitlist invite email failed to send",
            message: `Could not send the invite email for waitlist ${row.id}. The row is marked 'invited' but the user did not receive the email. Reach out manually.`,
            metadata: {
              waitlist_id: row.id,
              facility_id: row.facility_id,
              recipient,
              error: sendRes.error,
            },
          }).then(() => undefined);
          continue;
        }

        stats.invited++;
      } catch (err) {
        log("ERROR", "drain row failed", { waitlistId: row.id, error: err instanceof Error ? err.message : String(err) });
        stats.errors++;
      }
    }

    log("INFO", "Drain complete", stats);
    return json(200, { success: true, stats });
  } catch (e) {
    log("ERROR", "unhandled", { error: e instanceof Error ? e.message : String(e) });
    return json(500, { error: "Internal error" });
  }
});
