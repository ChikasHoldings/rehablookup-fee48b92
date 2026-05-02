/**
 * check-not-found-alerts
 *
 * Daily digest of high-volume 404 patterns. Runs via pg_cron once per day,
 * groups recent not_found_events into route-prefix buckets, and emails admins
 * a digest of any buckets that crossed the threshold AND haven't been
 * alerted on yet (deduped via subscription_alerts).
 *
 * - Only counts SPA-route 404s (static asset 404s are noisy and triaged
 *   separately).
 * - Excludes obvious bot traffic from threshold calculation but still shows
 *   it in the digest body for context.
 * - Idempotency: one alert per pattern per (UTC) day, keyed in
 *   subscription_alerts(alert_type='not_found_pattern', alert_key=...).
 *
 * Manual invocation:
 *   curl -X POST <fn-url> -H "apikey: <anon-key>"
 */
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Lookback window — matches the cron cadence. */
const LOOKBACK_HOURS = 24;
/** Minimum hits a pattern needs (excluding bots) to fire an alert. */
const HIT_THRESHOLD = 25;
/** Maximum patterns to surface in a single digest, hottest first. */
const MAX_PATTERNS_IN_DIGEST = 10;
/** Sample paths to show per pattern. */
const SAMPLE_PATHS_PER_PATTERN = 5;

interface PatternRule {
  id: string;
  label: string;
  match: (path: string) => boolean;
}

// NOTE: Keep this list in sync with src/lib/notFoundPatterns.ts. Edge
// functions can't import from src/, so we duplicate the rule definitions.
// If you add/remove rules, update both files.
const RULES: PatternRule[] = [
  {
    id: "rehab-marketing-county-insurance",
    label: "/rehab-marketing/:state/county/:slug/insurance/:insurer",
    match: (p) =>
      p.startsWith("/rehab-marketing/") &&
      p.includes("/county/") &&
      p.includes("/insurance/"),
  },
  {
    id: "rehab-marketing-county-treatment",
    label: "/rehab-marketing/:state/county/:slug/:treatment",
    match: (p) => {
      if (!p.startsWith("/rehab-marketing/") || !p.includes("/county/")) return false;
      const parts = p.split("/").filter(Boolean);
      return parts.length >= 5 && parts[2] === "county";
    },
  },
  {
    id: "rehab-marketing-county",
    label: "/rehab-marketing/:state/county/:slug",
    match: (p) => p.startsWith("/rehab-marketing/") && p.includes("/county/"),
  },
  {
    id: "rehab-marketing-other",
    label: "/rehab-marketing/...",
    match: (p) => p.startsWith("/rehab-marketing/"),
  },
  {
    id: "best-rehab-centers",
    label: "/best-rehab-centers/...",
    match: (p) => p.startsWith("/best-rehab-centers/"),
  },
  {
    id: "rehab-centers-state-city-treatment",
    label: "/rehab-centers/:state/:city/:treatment",
    match: (p) => p.startsWith("/rehab-centers/") && p.split("/").filter(Boolean).length >= 4,
  },
  {
    id: "rehab-centers-state-city",
    label: "/rehab-centers/:state/:city",
    match: (p) => p.startsWith("/rehab-centers/") && p.split("/").filter(Boolean).length === 3,
  },
  {
    id: "rehab-centers-state",
    label: "/rehab-centers/:state",
    match: (p) => p.startsWith("/rehab-centers/"),
  },
  {
    id: "center-profile",
    label: "/center/:slug",
    match: (p) => p.startsWith("/center/"),
  },
  {
    id: "near-me",
    label: "/:something/near-me/...",
    match: (p) => p.includes("/near-me"),
  },
  {
    id: "insurance-cluster",
    label: "/insurance/...",
    match: (p) => p.startsWith("/insurance/"),
  },
  {
    id: "treatment-types-cluster",
    label: "/treatment-types/...",
    match: (p) => p.startsWith("/treatment-types/"),
  },
  {
    id: "resources-blog",
    label: "/resources/:slug",
    match: (p) => p.startsWith("/resources/"),
  },
  {
    id: "providers-resources",
    label: "/providers/resources/:slug",
    match: (p) => p.startsWith("/providers/resources/"),
  },
];

const FALLBACK: PatternRule = { id: "other", label: "Other", match: () => true };

function resolvePattern(path: string): PatternRule {
  for (const r of RULES) if (r.match(path)) return r;
  return FALLBACK;
}

function isBot(ua: string | null): boolean {
  if (!ua) return false;
  return /bot|crawler|spider|slurp|bingpreview|googlebot|facebookexternalhit/i.test(ua);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface PatternBucket {
  rule: PatternRule;
  hits: number;
  botHits: number;
  uniquePaths: Set<string>;
  topPaths: Map<string, number>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error("Supabase env not configured");
    if (!resendKey) throw new Error("RESEND_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceKey);
    const resend = new Resend(resendKey);

    const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

    // Pull recent SPA-route 404 events. Cap at 10k rows per run; if a
    // single day exceeds that we already have a much bigger problem to
    // surface separately.
    const { data: rows, error } = await supabase
      .from("not_found_events")
      .select("path, user_agent, created_at, request_kind")
      .gte("created_at", since)
      .eq("request_kind", "spa_route")
      .order("created_at", { ascending: false })
      .limit(10_000);
    if (error) throw error;

    const buckets = new Map<string, PatternBucket>();
    for (const r of rows || []) {
      const rule = resolvePattern(r.path as string);
      let b = buckets.get(rule.id);
      if (!b) {
        b = { rule, hits: 0, botHits: 0, uniquePaths: new Set(), topPaths: new Map() };
        buckets.set(rule.id, b);
      }
      b.hits += 1;
      if (isBot(r.user_agent as string | null)) b.botHits += 1;
      b.uniquePaths.add(r.path as string);
      b.topPaths.set(r.path as string, (b.topPaths.get(r.path as string) || 0) + 1);
    }

    // Filter to patterns over threshold (human hits only).
    const candidates = Array.from(buckets.values())
      .map((b) => ({ ...b, humanHits: b.hits - b.botHits }))
      .filter((b) => b.humanHits >= HIT_THRESHOLD)
      .sort((a, b) => b.humanHits - a.humanHits);

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ alertSent: false, reason: "no patterns above threshold", windowHours: LOOKBACK_HOURS }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Dedup against subscription_alerts. Key per pattern per UTC day.
    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const alertKeys = candidates.map((c) => `not_found_pattern_${c.rule.id}_${todayKey}`);
    const { data: existing } = await supabase
      .from("subscription_alerts")
      .select("alert_key")
      .eq("alert_type", "not_found_pattern")
      .in("alert_key", alertKeys);
    const alreadySent = new Set((existing || []).map((r) => r.alert_key as string));

    const newPatterns = candidates
      .filter((c) => !alreadySent.has(`not_found_pattern_${c.rule.id}_${todayKey}`))
      .slice(0, MAX_PATTERNS_IN_DIGEST);

    if (newPatterns.length === 0) {
      return new Response(
        JSON.stringify({ alertSent: false, reason: "all patterns already alerted today" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve admin recipients.
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (!adminRoles || adminRoles.length === 0) {
      return new Response(JSON.stringify({ error: "no admin users" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("email")
      .in("user_id", adminRoles.map((r) => r.user_id as string));
    const adminEmails = (adminProfiles || []).map((p) => p.email as string).filter(Boolean);
    if (adminEmails.length === 0) {
      return new Response(JSON.stringify({ error: "no admin emails" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build digest HTML.
    const rowsHtml = newPatterns
      .map((p) => {
        const samples = Array.from(p.topPaths.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, SAMPLE_PATHS_PER_PATTERN)
          .map(
            ([path, hits]) =>
              `<li style="font-family: ui-monospace, monospace; font-size: 12px;">${escapeHtml(path)} <span style="color:#6b7280;">· ${hits} hits</span></li>`,
          )
          .join("");
        return `
          <tr>
            <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb;">
              <div style="font-family: ui-monospace, monospace; font-size: 13px; color:#111827;">${escapeHtml(p.rule.label)}</div>
              <ul style="margin: 8px 0 0 16px; padding: 0;">${samples}</ul>
            </td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color:#dc2626;">${p.humanHits}</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color:#6b7280;">${p.uniquePaths.size}</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color:#9ca3af; font-size: 12px;">${p.botHits}</td>
          </tr>`;
      })
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html><body style="font-family: Arial, sans-serif; color:#1f2937; background:#f3f4f6; padding: 20px;">
        <div style="max-width: 720px; margin: 0 auto; background:#ffffff; border-radius: 12px; overflow:hidden; border:1px solid #e5e7eb;">
          <div style="background: linear-gradient(135deg, #b45309, #92400e); color:white; padding: 24px;">
            <h1 style="margin:0; font-size: 20px;">⚠️ 404 Pattern Digest — last ${LOOKBACK_HOURS}h</h1>
            <p style="margin: 6px 0 0; opacity:.9; font-size: 13px;">${newPatterns.length} pattern${newPatterns.length === 1 ? "" : "s"} crossed the ${HIT_THRESHOLD}-hit threshold</p>
          </div>
          <div style="padding: 20px 24px;">
            <table style="width:100%; border-collapse: collapse;">
              <thead>
                <tr style="text-align:left; color:#6b7280; font-size:12px; text-transform:uppercase;">
                  <th style="padding: 8px; border-bottom:1px solid #e5e7eb;">Pattern</th>
                  <th style="padding: 8px; border-bottom:1px solid #e5e7eb; text-align:right;">Human hits</th>
                  <th style="padding: 8px; border-bottom:1px solid #e5e7eb; text-align:right;">Unique paths</th>
                  <th style="padding: 8px; border-bottom:1px solid #e5e7eb; text-align:right;">Bot hits</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <p style="margin-top: 24px; text-align:center;">
              <a href="https://rehablookup.com/admin/not-found-events" style="display:inline-block; background:#1B365D; color:white; padding: 10px 20px; border-radius:8px; text-decoration:none; font-size:14px;">Open 404 Monitor</a>
            </p>
            <p style="font-size: 11px; color:#9ca3af; margin-top: 24px; text-align:center;">
              Each pattern is alerted on at most once per UTC day. Threshold: ${HIT_THRESHOLD} non-bot hits in ${LOOKBACK_HOURS}h.
            </p>
          </div>
        </div>
      </body></html>
    `;

    const subject = newPatterns.length === 1
      ? `⚠️ 404 spike: ${newPatterns[0].rule.label} (${newPatterns[0].humanHits} hits)`
      : `⚠️ 404 digest: ${newPatterns.length} patterns over threshold`;

    const idempotencyKey = `not-found-digest-${todayKey}-${newPatterns.map((p) => p.rule.id).join("_")}`;

    const { error: emailError } = await sendEmailWithRetry(
      supabase,
      resend,
      {
        from: "RehabLookup Admin <no-reply@rehablookup.com>",
        to: adminEmails,
        subject,
        html: emailHtml,
      },
      { emailType: "admin_not_found_alert", idempotencyKey },
    );
    if (emailError) throw new Error(`Email send failed: ${emailError}`);

    // Record dedup rows so the same pattern doesn't re-alert today.
    const dedupRows = newPatterns.map((p) => ({
      alert_type: "not_found_pattern",
      alert_key: `not_found_pattern_${p.rule.id}_${todayKey}`,
      user_id: adminRoles[0].user_id,
    }));
    await supabase.from("subscription_alerts").insert(dedupRows);

    // In-app admin notification (matches existing patterns).
    await supabase.from("admin_notifications").insert({
      type: "not_found_alert",
      title: `404 spike: ${newPatterns.length} pattern${newPatterns.length === 1 ? "" : "s"}`,
      message: `${newPatterns.map((p) => `${p.rule.label} (${p.humanHits})`).join(", ")} over ${LOOKBACK_HOURS}h.`,
      metadata: {
        version: VERSION,
        windowHours: LOOKBACK_HOURS,
        threshold: HIT_THRESHOLD,
        patterns: newPatterns.map((p) => ({
          id: p.rule.id,
          label: p.rule.label,
          humanHits: p.humanHits,
          botHits: p.botHits,
          uniquePaths: p.uniquePaths.size,
        })),
      },
    });

    return new Response(
      JSON.stringify({
        alertSent: true,
        recipients: adminEmails.length,
        patterns: newPatterns.length,
        windowHours: LOOKBACK_HOURS,
        threshold: HIT_THRESHOLD,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[check-not-found-alerts] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
