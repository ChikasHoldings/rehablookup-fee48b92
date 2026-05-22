// Daily / weekly digest emails for user-defined saved searches.
//
// Runs daily via pg_cron. For each saved search with
// alert_frequency in ('daily', 'weekly') we:
//  1. resolve when we last alerted this search,
//  2. count facilities matching its criteria that were created or updated
//     since that timestamp,
//  3. send a Resend digest if there are any matches and the cadence is due,
//  4. stamp last_alert_sent_at + last_match_count.
//
// Matching mirrors the public search filters: state, facility_type, and
// criteria.insuranceTypes / criteria.treatmentTypes / criteria.amenities.
// We deliberately keep the SQL simple — a richer fuzzy match would belong in
// a stored function later. The goal is "good enough alerts," not parity with
// the live JS-side filter pipeline.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { assertCronSecret } from "../_shared/cron-auth.ts";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";

// Minimal inline sender. We deliberately don't import the project-wide
// resilient-email-sender helper because (a) cross-function imports aren't
// available in the MCP edge-function deploy path used here, and (b) the
// dedup/idempotency we need is already enforced upstream via
// saved_searches.last_alert_sent_at + isDue().
const BULK_SEND_DELAY_MS = 200;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface EmailParams {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}

async function sendEmailWithRetry(
  resend: Resend,
  params: EmailParams,
  maxAttempts = 2
): Promise<{ success: boolean; error?: string }> {
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await resend.emails.send(params);
      if ((res as { error?: { message?: string } } | undefined)?.error) {
        const errMsg = (res as { error?: { message?: string } }).error?.message ?? "unknown";
        lastErr = errMsg;
      } else {
        return { success: true };
      }
    } catch (err) {
      lastErr = err;
    }
    if (attempt < maxAttempts) await sleep(500 * attempt);
  }
  return { success: false, error: String(lastErr) };
}

const VERSION = "1.0.0";
const LOG = `[SAVED-SEARCH-ALERTS v${VERSION}]`;
const SITE_URL = "https://rehablookup.com";
const FROM_ADDRESS = "RehabLookup <no-reply@rehablookup.com>";
const MAX_FACILITIES_IN_EMAIL = 8;
const MAX_SEARCHES_PER_RUN = 500;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SavedSearchRow {
  id: string;
  user_id: string;
  name: string;
  criteria: Record<string, unknown>;
  search_url: string;
  alert_frequency: "daily" | "weekly";
  last_alert_sent_at: string | null;
}

interface FacilityRow {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  state: string | null;
  facility_type: string | null;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

function escHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c] as string));
}

/** Lower-case helper that tolerates undefined / non-string values. */
const lc = (v: unknown): string => (typeof v === "string" ? v.toLowerCase() : "");

/** Heuristic state normalizer — accepts "California" or "CA" and lowercases. */
function normalizeState(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase();
  return v || undefined;
}

function getSinceForSearch(row: SavedSearchRow, now: Date): Date {
  // Hard floor: anything older than 30 days is irrelevant.
  const floor = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (!row.last_alert_sent_at) return floor;
  const last = new Date(row.last_alert_sent_at);
  return last < floor ? floor : last;
}

function isDue(row: SavedSearchRow, now: Date): boolean {
  if (!row.last_alert_sent_at) return true;
  const last = new Date(row.last_alert_sent_at).getTime();
  const elapsed = now.getTime() - last;
  if (row.alert_frequency === "daily") return elapsed >= 20 * 60 * 60 * 1000; // ~20h
  if (row.alert_frequency === "weekly") return elapsed >= 6.5 * 24 * 60 * 60 * 1000;
  return false;
}

interface MatchResult {
  matches: FacilityRow[];
  totalCount: number;
}

async function findMatches(
  supabase: ReturnType<typeof createClient>,
  criteria: Record<string, unknown>,
  since: Date
): Promise<MatchResult> {
  let q = supabase
    .from("public_facilities")
    .select("id, name, slug, city, state, facility_type, description, logo_url, created_at, updated_at", { count: "exact" })
    .eq("status", "active")
    .or(`created_at.gte.${since.toISOString()},updated_at.gte.${since.toISOString()}`)
    .order("updated_at", { ascending: false })
    .limit(MAX_FACILITIES_IN_EMAIL);

  const state = normalizeState(criteria.state ?? criteria.location);
  if (state && state.length === 2) {
    q = q.ilike("state", state);
  } else if (state && state.length > 2) {
    // Accept either full-name match on state or city match against location.
    q = q.or(`state.ilike.${state},city.ilike.${state}`);
  }

  const type = lc(criteria.type);
  if (type) {
    q = q.ilike("facility_type", `%${type}%`);
  }

  const { data, count, error } = await q;
  if (error) {
    console.warn(LOG, "public_facilities query error:", error.message);
    return { matches: [], totalCount: 0 };
  }
  return { matches: (data ?? []) as FacilityRow[], totalCount: count ?? 0 };
}

async function getFirstName(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("first_name, full_name, email")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return "there";
  const first = (data as { first_name?: string | null; full_name?: string | null; email?: string | null });
  if (first.first_name && first.first_name.trim()) return first.first_name.trim();
  if (first.full_name && first.full_name.trim()) return first.full_name.trim().split(/\s+/)[0];
  return "there";
}

async function getUserEmail(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

function renderEmailHtml(opts: {
  firstName: string;
  searchName: string;
  searchUrl: string;
  matches: FacilityRow[];
  totalCount: number;
  cadence: "daily" | "weekly";
  savedSearchesUrl: string;
}): string {
  const cardsHtml = opts.matches
    .map((f) => {
      const where = [f.city, f.state].filter(Boolean).join(", ");
      const facilityUrl = f.slug ? `${SITE_URL}/center/${f.slug}` : `${SITE_URL}/rehab-centers`;
      const desc = f.description ? f.description.slice(0, 180) : "";
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
            <a href="${facilityUrl}" style="color:#1e1b4b;text-decoration:none;">
              <strong style="font-size:15px;color:#0f172a;">${escHtml(f.name)}</strong>
              ${where ? `<div style="font-size:13px;color:#64748b;margin-top:2px;">${escHtml(where)}</div>` : ""}
              ${desc ? `<div style="font-size:13px;color:#334155;margin-top:6px;">${escHtml(desc)}…</div>` : ""}
              <div style="margin-top:8px;font-size:12px;color:#4338ca;font-weight:600;">View profile →</div>
            </a>
          </td>
        </tr>`;
    })
    .join("");

  const overflowNote = opts.totalCount > opts.matches.length
    ? `<p style="font-size:13px;color:#64748b;margin:12px 0 0;">…and ${opts.totalCount - opts.matches.length} more. <a href="${escHtml(opts.searchUrl)}" style="color:#4338ca;">See all matches</a>.</p>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="background:#1e1b4b;padding:28px;border-radius:12px 12px 0 0;text-align:left;">
        <p style="margin:0;font-size:11px;color:#fbbf24;letter-spacing:1.5px;font-weight:700;">REHABLOOKUP · ${opts.cadence === "daily" ? "DAILY" : "WEEKLY"} ALERT</p>
        <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700;">New matches for "${escHtml(opts.searchName)}"</h1>
      </td></tr>
      <tr><td style="background:#ffffff;padding:24px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
        <p style="margin:0 0 14px;color:#0f172a;font-size:15px;">Hi ${escHtml(opts.firstName)},</p>
        <p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.55;">
          ${opts.totalCount === 1
            ? "We found <strong>1 new facility</strong> that matches your saved search."
            : `We found <strong>${opts.totalCount} new facilities</strong> that match your saved search.`}
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cardsHtml}</table>
        ${overflowNote}
        <p style="margin:20px 0 0;">
          <a href="${escHtml(opts.searchUrl)}" style="display:inline-block;background:#4338ca;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;font-size:14px;">See all matches</a>
        </p>
      </td></tr>
      <tr><td style="background:#f1f5f9;padding:18px 28px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;color:#64748b;font-size:12px;line-height:1.5;">
        You're receiving this ${opts.cadence === "daily" ? "daily" : "weekly"} digest because you saved a search on RehabLookup.
        <a href="${escHtml(opts.savedSearchesUrl)}" style="color:#4338ca;">Change frequency or pause alerts</a>.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const __cronAuth = assertCronSecret(req);
  if (!__cronAuth.ok) return __cronAuth.response;

  try {
    console.log(LOG, "starting run");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const now = new Date();

    const { data: rows, error: rowsError } = await supabase
      .from("saved_searches")
      .select("id, user_id, name, criteria, search_url, alert_frequency, last_alert_sent_at")
      .in("alert_frequency", ["daily", "weekly"])
      .order("last_alert_sent_at", { ascending: true, nullsFirst: true })
      .limit(MAX_SEARCHES_PER_RUN);

    if (rowsError) throw new Error(`saved_searches fetch: ${rowsError.message}`);

    const searches = (rows ?? []) as SavedSearchRow[];
    console.log(LOG, `candidate searches: ${searches.length}`);

    let sent = 0;
    let skippedNotDue = 0;
    let skippedNoMatches = 0;
    let skippedNoEmail = 0;
    let failed = 0;

    for (const s of searches) {
      if (!isDue(s, now)) {
        skippedNotDue++;
        continue;
      }

      const since = getSinceForSearch(s, now);
      const { matches, totalCount } = await findMatches(supabase, s.criteria, since);
      if (matches.length === 0) {
        // Touch last_alert_sent_at anyway so we don't keep re-checking a
        // dormant search every run. The user still owns the saved search.
        await supabase
          .from("saved_searches")
          .update({ last_alert_sent_at: now.toISOString(), last_match_count: 0 })
          .eq("id", s.id);
        skippedNoMatches++;
        continue;
      }

      const email = await getUserEmail(supabase, s.user_id);
      if (!email) {
        skippedNoEmail++;
        continue;
      }

      const firstName = await getFirstName(supabase, s.user_id);
      const fullSearchUrl = s.search_url.startsWith("http")
        ? s.search_url
        : `${SITE_URL}${s.search_url.startsWith("/") ? "" : "/"}${s.search_url}`;

      const html = renderEmailHtml({
        firstName,
        searchName: s.name,
        searchUrl: fullSearchUrl,
        matches,
        totalCount,
        cadence: s.alert_frequency,
        savedSearchesUrl: `${SITE_URL}/account/saved-searches`,
      });

      try {
        const result = await sendEmailWithRetry(resend, {
          from: FROM_ADDRESS,
          to: [email],
          subject: `${totalCount} new ${totalCount === 1 ? "match" : "matches"} for "${s.name}"`,
          html,
        });
        if (result.success) {
          sent++;
          await supabase
            .from("saved_searches")
            .update({
              last_alert_sent_at: now.toISOString(),
              last_match_count: totalCount,
            })
            .eq("id", s.id);
        } else {
          failed++;
        }
      } catch (sendErr) {
        failed++;
        console.warn(LOG, `send failed for search ${s.id}:`, sendErr);
      }

      await sleep(BULK_SEND_DELAY_MS);
    }

    const summary = { sent, skippedNotDue, skippedNoMatches, skippedNoEmail, failed, total: searches.length };
    console.log(LOG, "done", summary);

    return new Response(JSON.stringify({ success: true, ...summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(LOG, "ERROR", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
