// enforce-plan-grace-cron v1.0.0
// ──────────────────────────────
// Daily enforcement for provider_plan_grants (facility_cap_grace):
//
//   1. T-7 / T-1 reminders — in-app provider notification + best-effort email
//      nudging the provider to upgrade to Pro before the courtesy period ends.
//      Deduped per grant+stage via the notification `type` + metadata.grant_id.
//   2. Expiry enforcement — for grants past expires_at with no active Pro
//      subscription: suspend the provider's facilities beyond the Free cap
//      (keeping the OLDEST listing live), notify the provider + admins, and
//      stamp grant.enforced_at so the step is idempotent. Providers can still
//      reach Billing afterwards (ProviderShell no longer locks the portal on
//      suspension), so upgrading self-restores their listings via the
//      webhook's suspended-facility reactivation path.
//
// The cap itself never depends on this cron: enforce_facility_limit() compares
// expires_at at insert time, so an expired grant grants nothing even if this
// job is down. This cron only handles the human side (reminders) and the
// cleanup of already-over-cap listings.
//
// Auth: X-Cron-Secret (pg_cron job `plan_grace_enforcement`).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { assertCronSecret } from "../_shared/cron-auth.ts";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const VERSION = "1.0.0";
const FREE_CAP = 1;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const log = (msg: string, details?: Record<string, unknown>) =>
  console.log(`[PLAN-GRACE-CRON] [${VERSION}] ${msg}${details ? ` | ${JSON.stringify(details)}` : ""}`);

// Service-role client — untyped, matching the _shared/* edge-function helpers.
// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

async function providerHasActivePro(supabase: SupabaseClient, providerId: string): Promise<boolean> {
  const { data } = await supabase
    .from("facility_subscriptions")
    .select("tier, status, current_period_end")
    .eq("provider_id", providerId)
    .eq("tier", "pro")
    .in("status", ["active", "past_due"]);
  const now = Date.now();
  return (data ?? []).some(
    (r: { status: string; current_period_end: string | null }) =>
      r.status === "past_due" ||
      (r.status === "active" && (!r.current_period_end || new Date(r.current_period_end).getTime() > now)),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = assertCronSecret(req);
  if (!auth.ok) return auth.response;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const resend = resendKey ? new Resend(resendKey) : null;

  const results: Record<string, unknown> = { reminders: 0, enforced: 0, skippedPro: 0, errors: [] as string[] };

  try {
    // ── 1. Reminders (T-7 and T-1) ─────────────────────────────────────────
    const nowMs = Date.now();
    const { data: activeGrants, error: grantsErr } = await supabase
      .from("provider_plan_grants")
      .select("id, provider_id, max_facilities, expires_at")
      .eq("kind", "facility_cap_grace")
      .is("revoked_at", null)
      .is("enforced_at", null)
      .gt("expires_at", new Date().toISOString());
    if (grantsErr) throw new Error(`grants query failed: ${grantsErr.message}`);

    for (const grant of activeGrants ?? []) {
      const daysLeft = (new Date(grant.expires_at).getTime() - nowMs) / 86_400_000;
      const stage = daysLeft <= 1 ? "1d" : daysLeft <= 7 ? "7d" : null;
      if (!stage) continue;
      if (await providerHasActivePro(supabase, grant.provider_id)) continue; // upgraded — no nag

      const type = `plan_grace_expiring_${stage}`;
      const { data: already } = await supabase
        .from("provider_notifications")
        .select("id")
        .eq("user_id", grant.provider_id)
        .eq("type", type)
        .contains("metadata", { grant_id: grant.id })
        .limit(1)
        .maybeSingle();
      if (already) continue;

      const endDate = new Date(grant.expires_at).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      });
      const title = stage === "1d"
        ? "Your courtesy period ends tomorrow"
        : "Your courtesy period ends in 7 days";
      const message =
        `Your complimentary multi-listing period ends on ${endDate}. Upgrade to Pro ` +
        `to keep managing all ${grant.max_facilities} of your facility listings — otherwise ` +
        `listings beyond your Free plan's limit will be paused (your oldest listing stays live).`;

      const { error: notifErr } = await supabase.from("provider_notifications").insert({
        user_id: grant.provider_id,
        type,
        title,
        message,
        metadata: { grant_id: grant.id, expires_at: grant.expires_at, upgrade_url: "/provider/billing?upgrade=pro" },
      });
      if (notifErr) {
        (results.errors as string[]).push(`notify ${grant.id} ${stage}: ${notifErr.message}`);
        continue;
      }

      // Best-effort email — never blocks the run.
      if (resend) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, first_name")
            .eq("user_id", grant.provider_id)
            .maybeSingle();
          if (profile?.email) {
            await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup <no-reply@rehablookup.com>",
              to: [profile.email],
              subject: title,
              html:
                `<p>Hi ${profile.first_name ?? "there"},</p>` +
                `<p>${message}</p>` +
                `<p><a href="https://rehablookup.com/provider/billing?upgrade=pro">Upgrade to Pro</a> ` +
                `from your dashboard to keep everything live.</p>`,
            }, {
              emailType: "plan_grace_reminder",
              idempotencyKey: `plan-grace-${grant.id}-${stage}`,
            });
          }
        } catch (e) {
          log("reminder email failed (non-fatal)", { grantId: grant.id, error: String(e) });
        }
      }
      results.reminders = (results.reminders as number) + 1;
    }

    // ── 2. Expiry enforcement ──────────────────────────────────────────────
    const { data: expiredGrants, error: expErr } = await supabase
      .from("provider_plan_grants")
      .select("id, provider_id, max_facilities, expires_at")
      .eq("kind", "facility_cap_grace")
      .is("revoked_at", null)
      .is("enforced_at", null)
      .lte("expires_at", new Date().toISOString());
    if (expErr) throw new Error(`expired grants query failed: ${expErr.message}`);

    for (const grant of expiredGrants ?? []) {
      if (await providerHasActivePro(supabase, grant.provider_id)) {
        // Upgraded during grace — nothing to enforce.
        await supabase.from("provider_plan_grants")
          .update({ enforced_at: new Date().toISOString() })
          .eq("id", grant.id);
        results.skippedPro = (results.skippedPro as number) + 1;
        continue;
      }

      const { data: facilities, error: facErr } = await supabase
        .from("facilities")
        .select("id, name, suspended, created_at")
        .eq("user_id", grant.provider_id)
        .order("created_at", { ascending: true });
      if (facErr) {
        (results.errors as string[]).push(`facilities ${grant.provider_id}: ${facErr.message}`);
        continue;
      }

      // Keep the OLDEST `FREE_CAP` listings live; pause the rest.
      const toSuspend = (facilities ?? []).slice(FREE_CAP).filter((f) => !f.suspended);
      for (const f of toSuspend) {
        const { error: susErr } = await supabase
          .from("facilities")
          .update({ suspended: true, updated_at: new Date().toISOString() })
          .eq("id", f.id);
        if (susErr) (results.errors as string[]).push(`suspend ${f.id}: ${susErr.message}`);
      }

      await supabase.from("provider_notifications").insert({
        user_id: grant.provider_id,
        type: "plan_grace_expired",
        title: "Courtesy period ended — extra listings paused",
        message:
          `Your complimentary multi-listing period has ended. ${toSuspend.length} listing(s) beyond ` +
          `the Free plan's limit were paused (your oldest listing stays live). Upgrade to Pro from ` +
          `Billing to restore them instantly.`,
        metadata: {
          grant_id: grant.id,
          suspended_facility_ids: toSuspend.map((f) => f.id),
          upgrade_url: "/provider/billing?upgrade=pro",
        },
      });
      await supabase.from("admin_notifications").insert({
        type: "plan_grace_enforced",
        title: "Provider grace period enforced",
        message: `Grace grant ${grant.id} expired; ${toSuspend.length} over-cap listing(s) paused for provider ${grant.provider_id}.`,
        metadata: { grant_id: grant.id, provider_id: grant.provider_id, suspended_facility_ids: toSuspend.map((f) => f.id) },
      });

      await supabase.from("provider_plan_grants")
        .update({ enforced_at: new Date().toISOString() })
        .eq("id", grant.id);
      results.enforced = (results.enforced as number) + 1;
    }

    log("run complete", results);
    return new Response(JSON.stringify({ ok: true, ...results, _version: VERSION }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { error: msg });
    return new Response(JSON.stringify({ ok: false, error: msg, ...results, _version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
