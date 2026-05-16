// provider-interest-submit
// ────────────────────────
// Public endpoint backing the /for-providers interest-capture form
// (claude/for-providers-sales-page). Validates the submission, inserts
// a row into `provider_interest` (service role — RLS bypassed), and
// fires an admin notification email so the sales team can follow up
// within the promised 48 hours.
//
// Anon-callable. Hard rate limits live in Supabase's edge runtime; we
// add basic shape validation here so malformed bodies don't make it
// to the DB.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "chikasholdings@gmail.com";
const FROM_ADDRESS = "RehabLookup Sales <sales@rehablookup.com>";

const VOLUME_VALUES = ["<10/mo", "10-25/mo", "25-50/mo", "50-100/mo", "100+/mo"] as const;
const TIER_VALUES = ["pro", "pro_featured", "pro_concierge", "all"] as const;
const BILLING_INTERVAL_VALUES = ["monthly", "annual", "either", "not_sure"] as const;

const ProviderInterestSchema = z.object({
  facilityName: z.string().trim().min(1).max(255),
  contactName: z.string().trim().min(1).max(255),
  contactTitle: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(64).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().min(1).max(120),
  admissionVolume: z.enum(VOLUME_VALUES),
  tierInterest: z.enum(TIER_VALUES),
  // Optional for backwards-compat with older form submissions that pre-date
  // the monthly/annual toggle.
  billingInterval: z.enum(BILLING_INTERVAL_VALUES).optional(),
  pricingFrustration: z.string().trim().max(2000).optional().or(z.literal("")),
  utm: z
    .object({
      source: z.string().max(120).optional(),
      medium: z.string().max(120).optional(),
      campaign: z.string().max(120).optional(),
    })
    .optional(),
  landingPage: z.string().max(2048).optional(),
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function tierLabel(t: string): string {
  switch (t) {
    case "pro": return "Pro ($99/mo)";
    case "pro_featured": return "Pro + Featured ($698/mo)";
    case "pro_concierge": return "Pro + Concierge ($1,099/mo)";
    case "all": return "All (Pro + Featured + Concierge — $1,698/mo)";
    default: return t;
  }
}

function intervalLabel(i: string | undefined): string {
  switch (i) {
    case "monthly": return "Monthly";
    case "annual": return "Annual (save 15%)";
    case "either": return "Either";
    case "not_sure": return "Not sure yet";
    default: return "(not provided)";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", code: "method_not_allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body", code: "invalid_json" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const parsed = ProviderInterestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        code: "validation_failed",
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const body = parsed.data;

  const { data: inserted, error: insertError } = await supabase
    .from("provider_interest")
    .insert({
      facility_name: body.facilityName,
      contact_name: body.contactName,
      contact_title: body.contactTitle,
      email: body.email,
      phone: body.phone || null,
      city: body.city,
      state: body.state,
      admission_volume: body.admissionVolume,
      tier_interest: body.tierInterest,
      billing_interval: body.billingInterval ?? null,
      pricing_frustration: body.pricingFrustration || null,
      utm_source: body.utm?.source ?? null,
      utm_medium: body.utm?.medium ?? null,
      utm_campaign: body.utm?.campaign ?? null,
      landing_page: body.landingPage ?? null,
    })
    .select("id, created_at")
    .single();

  if (insertError || !inserted) {
    console.error("[provider-interest-submit] insert failed", insertError);
    return new Response(
      JSON.stringify({ error: "Failed to save submission", code: "db_insert_failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Admin notification — non-blocking. If Resend isn't configured the
  // row is already saved; admin can still see it in the table.
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const html = `
        <h2>New /for-providers interest submission</h2>
        <p><strong>Facility:</strong> ${escapeHtml(body.facilityName)} — ${escapeHtml(body.city)}, ${escapeHtml(body.state)}</p>
        <p><strong>Contact:</strong> ${escapeHtml(body.contactName)} (${escapeHtml(body.contactTitle)})</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(body.email)}">${escapeHtml(body.email)}</a></p>
        ${body.phone ? `<p><strong>Phone:</strong> ${escapeHtml(body.phone)}</p>` : ""}
        <p><strong>Volume:</strong> ${escapeHtml(body.admissionVolume)}</p>
        <p><strong>Tier interest:</strong> ${escapeHtml(tierLabel(body.tierInterest))}</p>
        <p><strong>Billing interest:</strong> ${escapeHtml(intervalLabel(body.billingInterval))}</p>
        ${body.pricingFrustration
          ? `<p><strong>Pricing frustration:</strong><br>${escapeHtml(body.pricingFrustration).replace(/\n/g, "<br>")}</p>`
          : ""}
        <hr>
        <p style="color:#666;font-size:.9em">
          Submission ID: ${inserted.id}<br>
          Submitted: ${inserted.created_at}<br>
          Source: for_providers_v2_interest
        </p>
      `;
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: ADMIN_EMAIL,
        subject: `[Sales] ${body.facilityName} (${body.city}, ${body.state}) — ${tierLabel(body.tierInterest)}`,
        html,
      });
      await supabase
        .from("provider_interest")
        .update({ admin_notified: true, admin_notified_at: new Date().toISOString() })
        .eq("id", inserted.id);
    } catch (emailErr) {
      console.error("[provider-interest-submit] resend send failed", emailErr);
      // Row stays inserted; just log and move on.
    }
  }

  return new Response(
    JSON.stringify({ ok: true, id: inserted.id }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
