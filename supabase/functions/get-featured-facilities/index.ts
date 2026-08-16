import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY homepage-Featured selector.
//
// ENTITLEMENT CONTRACT (Stage-3 amendment, B2.8)
//   PRO IS NOT FEATURED. An active $99/mo Pro subscription buys product
//   features — public phone + Call CTA, enhanced-profile media, analytics. It
//   does NOT buy visibility inventory. A Pro subscriber must therefore never
//   enter the homepage Featured rotation, carry a Featured badge, or be
//   counted as paid Featured inventory merely for being Pro.
//
//   Until v2.1.0 this function did exactly that: every active subscription
//   row was pushed into `eligibleFacilities` with plan_type='pro', so buying
//   Pro bought homepage placement. `proFacilityIds` is still computed and
//   still returned, because callers legitimately need to know who is Pro —
//   but it is now strictly an ENTITLEMENT signal and is kept structurally
//   separate from Featured eligibility.
//
//   v2.2.0 fixes what `proFacilityIds` MEANS. It was assembled from generic
//   `facility_subscriptions` rows with status='active' — no tier predicate,
//   so any active subscription of any product was reported as Pro. It is now
//   read from the canonical projection `public_facilities.is_pro`
//   (= has_active_pro(id)). Pro is defined in exactly one place; this
//   function does not reimplement it.
//
//   It also accepted `facilities.featured = true` as "legacy Featured".
//   That raw boolean is of unproven provenance: production carries exactly
//   two such rows, both plan=free with zero facility_subscriptions, zero
//   featured_placements, zero subscription_events and zero admin_audit_log
//   entries covering the period they were set (the audit table only begins
//   2026-06-20; both facilities predate it by four months). It was also the
//   flag the retired pro-benefits Pro activation used to set. An unproven
//   boolean cannot authorize paid placement, so it no longer confers
//   eligibility here. The rows are NOT mutated — see the amendment doc.
//
//   The canonical paid-Featured engine is get-featured-rotation over
//   featured_placements + facility_subscriptions.has_featured. This function
//   remains only for the legacy homepage surface and the Stripe
//   Featured-product path below.
// ─────────────────────────────────────────────────────────────────────────────
const VERSION = "2.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  // Browser 5 min, CDN 10 min, stale-while-revalidate 1 hour for spike absorption.
  "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
};

const FEATURED_PRODUCT_IDS = ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"];
const PRO_PRODUCT_IDS = ["prod_TbalLOPujTIoUe", "prod_Tbyz1bf6iYyzYd"];
const DEFAULT_MAX_HOMEPAGE_FEATURED = 6;

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GET-FEATURED-FACILITIES v${VERSION}] ${step}${detailsStr}`);
};

const getDailySeed = (): number => {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const seededShuffle = <T>(array: T[], seed: number): T[] => {
  const shuffled = [...array];
  let currentSeed = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
    const j = currentSeed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

type NotificationSettings = {
  rotation_notifications_enabled: boolean;
  notify_on_featured: boolean;
  notify_on_unfeatured: boolean;
  notification_timing: "immediate" | "daily_digest" | "weekly_digest";
  admin_email_recipients: string[];
};

const defaultNotificationSettings: NotificationSettings = {
  rotation_notifications_enabled: true,
  notify_on_featured: true,
  notify_on_unfeatured: false,
  notification_timing: "immediate",
  admin_email_recipients: ["help@rehablookup.com"],
};

interface EligibleFacility {
  id: string;
  user_id: string;
  featured_pinned: boolean;
  last_featured_shown_at: string | null;
  featured_display_order: number | null;
  provider_email?: string;
  provider_name?: string;
  facility_name?: string;
  /** Only 'featured' remains eligible. 'pro' was removed in v2.1.0 — Pro is
   *  an entitlement, not Featured inventory. */
  plan_type?: 'featured';
}

// In-memory cache (persists across warm invocations, ~5 min TTL)
let cachedResponse: { data: unknown; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function sendFeaturedEmail(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  resend: Resend | null,
  providerEmail: string,
  providerName: string,
  facilityName: string,
  adminRecipients: string[],
  facilityId: string
) {
  if (!resend) return;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f6f8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f8fb;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
            <tr><td style="background:linear-gradient(135deg,#1B365D 0%,#2A4A7F 100%);padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">🌟 You're Featured!</h1>
              <p style="color:#94A3B8;font-size:14px;margin:0;">Your facility is on the homepage today</p>
            </td></tr>
            <tr><td style="padding:32px 40px;">
              <p style="color:#334155;font-size:16px;">Hi ${providerName || "there"},</p>
              <p style="color:#334155;font-size:16px;"><strong>${facilityName}</strong> is being featured on the RehabLookup homepage today, giving you maximum visibility to families seeking treatment.</p>
              <div style="text-align:center;margin:24px 0;">
                <a href="https://rehablookup.com" style="background:#1B365D;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">View Homepage</a>
              </div>
            </td></tr>
            <tr><td style="background-color:#f6f8fb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9CA3AF;font-size:12px;margin:0;">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  try {
    await sendEmailWithRetry(supabaseClient, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [providerEmail],
      subject: `🌟 ${facilityName} is Featured on Homepage Today!`,
      html: emailHtml,
    }, { emailType: "featured_facility_provider", idempotencyKey: `featured-provider-${facilityId}-${new Date().toISOString().slice(0,10)}` });
    if (adminRecipients.length > 0) {
      await sendEmailWithRetry(supabaseClient, resend, {
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: adminRecipients,
        subject: `[Admin] Featured Rotation: ${facilityName}`,
        html: `<div style="background:#FEF3C7;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;"><strong>Admin Copy:</strong> Sent to ${providerEmail} for "${facilityName}"</div>${emailHtml}`,
      }, { emailType: "featured_facility_admin", idempotencyKey: `featured-admin-${facilityId}-${new Date().toISOString().slice(0,10)}` });
    }
  } catch (emailError) {
    logStep("Error sending featured email", { error: String(emailError) });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    logStep("Function started");

    // Return cached response if still valid
    if (cachedResponse && Date.now() < cachedResponse.expiresAt) {
      logStep("Returning cached response", { ageMs: cachedResponse.expiresAt - Date.now() });
      return new Response(JSON.stringify(cachedResponse.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!stripeKey) {
      logStep("No Stripe key, returning empty");
      const empty = { featuredFacilityIds: [], homepageFeaturedIds: [], allEligibleIds: [], professionalFacilityIds: [], proFacilityIds: [], paidFacilityIds: [] };
      return new Response(JSON.stringify(empty), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // BATCH: Fetch all data in parallel instead of sequential queries
    const [settingsResult, platformResult, facilitiesResult, canonicalProResult, allProfilesResult] = await Promise.all([
      supabaseClient.from("platform_settings").select("setting_value").eq("setting_key", "featured_notification_settings").maybeSingle(),
      supabaseClient.from("platform_settings").select("setting_value").eq("setting_key", "featured_platform_settings").maybeSingle(),
      supabaseClient.from("facilities").select("id, user_id, featured, featured_pinned, last_featured_shown_at, suspended, name, featured_display_order").eq("status", "approved").or("suspended.is.null,suspended.eq.false"),
      // CANONICAL PRO IDENTITY — public_facilities.is_pro, which is exactly
      // has_active_pro(id). See the proFacilityIds block below for why this is
      // NOT a facility_subscriptions query.
      supabaseClient.from("public_facilities").select("id, is_pro"),
      supabaseClient.from("profiles").select("user_id, email, first_name, last_name"),
    ]);

    let notificationSettings = defaultNotificationSettings;
    if (settingsResult.data?.setting_value) {
      notificationSettings = settingsResult.data.setting_value as NotificationSettings;
    }

    let maxHomepageFeatured = DEFAULT_MAX_HOMEPAGE_FEATURED;
    if (platformResult.data?.setting_value) {
      const ps = platformResult.data.setting_value as { max_homepage_featured?: number };
      if (ps.max_homepage_featured && ps.max_homepage_featured > 0) {
        maxHomepageFeatured = ps.max_homepage_featured;
      }
    }

    const facilities = facilitiesResult.data || [];
    const canonicalProRows = canonicalProResult.data || [];
    logStep("Fetched all data in parallel", { facilities: facilities.length, publicRows: canonicalProRows.length });

    // Build profiles lookup map (eliminates N+1 profile queries)
    const profilesMap = new Map<string, { email: string; first_name: string | null; last_name: string | null }>();
    (allProfilesResult.data || []).forEach(p => {
      profilesMap.set(p.user_id, p);
    });

    const eligibleFacilities: EligibleFacility[] = [];
    const professionalFacilityIds: string[] = [];
    const proFacilityIds: string[] = [];

    // Identify Pro facilities — ENTITLEMENT ONLY, never Featured eligibility.
    //
    // CANONICAL SOURCE: public_facilities.is_pro, which the view defines as
    // has_active_pro(id). Pro is NOT reimplemented here.
    //
    // Until this hotfix the set was built from every facility_subscriptions row
    // with status='active' and a future current_period_end. That is not Pro. It
    // carries no tier predicate at all, so ANY active subscription row — of any
    // product — was published as a Pro entitlement. B3 will need to represent a
    // Featured-only subscription that stays status='active' (get-featured-
    // rotation INNER JOINs on it), and under the old expression that row would
    // have silently become Pro. Reading the canonical projection makes that
    // impossible by construction rather than by a tier filter that a later
    // schema change could outgrow.
    //
    // Deriving from has_active_pro also inherits its lifecycle semantics for
    // free — notably that past_due remains Pro through the grace window — so
    // there is no second, drifting copy of the entitlement clock here.
    //
    // These ids are returned so callers can resolve Pro product features. They
    // are deliberately NOT pushed into `eligibleFacilities`: Pro does not buy
    // homepage placement, a Featured badge, or a slot in the rotation. If a
    // Pro subscriber is also to be Featured, they must hold Featured
    // separately (Stripe Featured product below, or featured_placements /
    // facility_subscriptions.has_featured via get-featured-rotation).
    for (const row of canonicalProRows) {
      // Fail closed: only an explicit boolean true is Pro.
      if (row.id && row.is_pro === true) {
        proFacilityIds.push(row.id);
      }
    }

    // BATCH Stripe check: collect unique emails, then batch lookup
    // Instead of N individual stripe calls, get unique provider emails and batch
    const facilityEmailMap = new Map<string, typeof facilities[0]>();
    for (const facility of facilities) {
      if (eligibleFacilities.some(ef => ef.id === facility.id)) continue;
      const profile = profilesMap.get(facility.user_id);
      if (profile?.email) {
        facilityEmailMap.set(facility.id, facility);
      }
    }

    // Batch Stripe: check all customers at once using search (much faster than N individual lookups)
    const uniqueEmails = new Set<string>();
    for (const facility of facilityEmailMap.values()) {
      const profile = profilesMap.get(facility.user_id);
      if (profile?.email) uniqueEmails.add(profile.email);
    }

    // Build email->subscription mapping with batched Stripe calls
    const emailSubscriptionMap = new Map<string, { productId: string }>();
    
    // Process emails in batches of 10 for parallelism
    const emailArray = [...uniqueEmails];
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < emailArray.length; i += BATCH_SIZE) {
      const batch = emailArray.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (email) => {
          try {
            const customers = await stripe.customers.list({ email, limit: 1 });
            if (customers.data.length === 0) return null;
            const subs = await stripe.subscriptions.list({
              customer: customers.data[0].id,
              status: "active",
              limit: 1,
            });
            if (subs.data.length > 0) {
              const productId = subs.data[0].items.data[0].price.product as string;
              return { email, productId };
            }
            return null;
          } catch {
            return null;
          }
        })
      );
      
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          emailSubscriptionMap.set(result.value.email, { productId: result.value.productId });
        }
      }
    }

    logStep("Batched Stripe lookups complete", { uniqueEmails: uniqueEmails.size, found: emailSubscriptionMap.size });

    // Now assign facilities based on Stripe results
    for (const [facilityId, facility] of facilityEmailMap) {
      const profile = profilesMap.get(facility.user_id);
      if (!profile?.email) continue;

      const sub = emailSubscriptionMap.get(profile.email);
      if (!sub) continue;

      if (FEATURED_PRODUCT_IDS.includes(sub.productId)) {
        eligibleFacilities.push({
          id: facility.id,
          user_id: facility.user_id,
          featured_pinned: facility.featured_pinned || false,
          last_featured_shown_at: facility.last_featured_shown_at,
          featured_display_order: facility.featured_display_order,
          provider_email: profile.email,
          provider_name: profile.first_name || "",
          facility_name: facility.name || "",
          plan_type: 'featured',
        });
      } else if (PRO_PRODUCT_IDS.includes(sub.productId)) {
        professionalFacilityIds.push(facility.id);
      }
    }

    // NO LEGACY `facilities.featured = true` PATH.
    //
    // The raw boolean used to grant Featured eligibility here. It cannot: it
    // is the same column the retired pro-benefits Pro activation wrote, so
    // "featured=true" is not evidence of a Featured purchase, and the two rows
    // that currently carry it have no subscription, placement, or audit record
    // behind them. Granting paid placement on it would be fabricating an
    // entitlement. Provenance is logged for operator visibility and the rows
    // are left untouched; B3 establishes the canonical Featured representation
    // and decides their disposition.
    const unprovenLegacyFeatured = facilities.filter(
      (f) => f.featured === true && !eligibleFacilities.some((ef) => ef.id === f.id),
    );
    if (unprovenLegacyFeatured.length > 0) {
      logStep("Ignoring unproven legacy facilities.featured rows (no paid Featured entitlement)", {
        count: unprovenLegacyFeatured.length,
        ids: unprovenLegacyFeatured.map((f) => f.id),
      });
    }

    logStep("Total eligible", {
      count: eligibleFacilities.length,
      professional: professionalFacilityIds.length,
      proEntitledButNotFeatured: proFacilityIds.length,
    });

    const allEligibleIds = eligibleFacilities.map(f => f.id);

    // Select homepage featured with rotation
    let homepageFeaturedIds: string[] = [];
    const newlyFeaturedFacilities: EligibleFacility[] = [];

    if (eligibleFacilities.length <= maxHomepageFeatured) {
      const sorted = [...eligibleFacilities].sort((a, b) => {
        if (a.featured_pinned && !b.featured_pinned) return -1;
        if (!a.featured_pinned && b.featured_pinned) return 1;
        if (a.featured_display_order !== null && b.featured_display_order !== null) return a.featured_display_order - b.featured_display_order;
        if (a.featured_display_order !== null) return -1;
        if (b.featured_display_order !== null) return 1;
        return 0;
      });
      homepageFeaturedIds = sorted.map(f => f.id);
    } else {
      const pinned = eligibleFacilities.filter(f => f.featured_pinned).sort((a, b) => {
        if (a.featured_display_order !== null && b.featured_display_order !== null) return a.featured_display_order - b.featured_display_order;
        if (a.featured_display_order !== null) return -1;
        if (b.featured_display_order !== null) return 1;
        return 0;
      });
      const unpinned = eligibleFacilities.filter(f => !f.featured_pinned);

      unpinned.sort((a, b) => {
        if (a.featured_display_order !== null && b.featured_display_order !== null) return a.featured_display_order - b.featured_display_order;
        if (a.featured_display_order !== null) return -1;
        if (b.featured_display_order !== null) return 1;
        if (!a.last_featured_shown_at && !b.last_featured_shown_at) return 0;
        if (!a.last_featured_shown_at) return -1;
        if (!b.last_featured_shown_at) return 1;
        return new Date(a.last_featured_shown_at).getTime() - new Date(b.last_featured_shown_at).getTime();
      });

      const withOrder = unpinned.filter(f => f.featured_display_order !== null);
      const withoutOrder = unpinned.filter(f => f.featured_display_order === null);
      const shuffledWithoutOrder = seededShuffle(withoutOrder, getDailySeed());

      const combined = [...pinned, ...withOrder, ...shuffledWithoutOrder];
      const selectedFacilities = combined.slice(0, maxHomepageFeatured);
      homepageFeaturedIds = selectedFacilities.map(f => f.id);

      // Update last_featured_shown_at in batch
      const today = new Date().toISOString();
      const todayDate = today.split('T')[0];

      // Batch update all selected facilities at once
      await Promise.all(selectedFacilities.map(async (facility) => {
        const wasAlreadyFeaturedToday = facility.last_featured_shown_at?.startsWith(todayDate);
        
        await supabaseClient.from("facilities").update({ last_featured_shown_at: today }).eq("id", facility.id);
        
        if (!wasAlreadyFeaturedToday) {
          newlyFeaturedFacilities.push(facility);
          const { data: existing } = await supabaseClient
            .from("provider_notifications")
            .select("id")
            .eq("user_id", facility.user_id)
            .eq("facility_id", facility.id)
            .eq("type", "featured_rotation")
            .gte("created_at", todayDate)
            .maybeSingle();
          
          if (!existing) {
            await supabaseClient.from("provider_notifications").insert({
              user_id: facility.user_id,
              facility_id: facility.id,
              type: "featured_rotation",
              title: "Featured on Homepage! 🌟",
              message: `Your facility "${facility.facility_name}" is being featured on the homepage today.`,
              metadata: { featured_date: todayDate },
            });
          }
        }
      }));
    }

    // Send emails for newly featured (non-blocking)
    if (
      notificationSettings.rotation_notifications_enabled &&
      notificationSettings.notify_on_featured &&
      notificationSettings.notification_timing === "immediate" &&
      newlyFeaturedFacilities.length > 0
    ) {
      // Fire and forget - don't block response
      Promise.all(
        newlyFeaturedFacilities
          .filter(f => f.provider_email)
          .map(f => sendFeaturedEmail(supabaseClient, resend, f.provider_email!, f.provider_name || "", f.facility_name || "Your facility", notificationSettings.admin_email_recipients, f.id))
      ).catch(err => logStep("Email batch error", { error: String(err) }));
    }

    const responseData = {
      featuredFacilityIds: allEligibleIds,
      homepageFeaturedIds,
      allEligibleIds,
      professionalFacilityIds,
      proFacilityIds,
      paidFacilityIds: [...new Set([...allEligibleIds, ...professionalFacilityIds, ...proFacilityIds])],
    };

    // Cache the response
    cachedResponse = { data: responseData, expiresAt: Date.now() + CACHE_TTL_MS };

    logStep("Completed", { totalMs: Date.now() - startTime, eligible: allEligibleIds.length, homepage: homepageFeaturedIds.length });

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({
      error: errorMessage,
      featuredFacilityIds: [], homepageFeaturedIds: [], allEligibleIds: [],
      professionalFacilityIds: [], proFacilityIds: [], paidFacilityIds: [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
