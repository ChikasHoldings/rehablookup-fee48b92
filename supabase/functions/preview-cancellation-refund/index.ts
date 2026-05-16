// preview-cancellation-refund
// ────────────────────────────
// Read-only preview of what cancellation would refund for a given
// facility subscription, scoped to one or all pieces. NO side effects —
// no Stripe calls, no DB writes. Powers the cancel-flow preview screen
// that shows the customer the math BEFORE they confirm.
//
// For monthly subscribers the math always returns refund=0 with the
// "no refund, access through period_end" disclosure. For annual
// subscribers the math returns the full month_used × full_monthly_rate
// refund.
//
// verify_jwt = true. Caller must own the facility_subscriptions row or
// be admin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";
import {
  computeCancellationRefund,
  TIER_PRICING,
  type BillingPeriod,
} from "../_shared/subscription-math.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  subscription_id: z.string().uuid(),
  scope: z.enum(["all", "addon-featured", "addon-concierge"]),
});

interface FacilitySubscriptionRow {
  id: string;
  facility_id: string;
  provider_id: string | null;
  billing_period: BillingPeriod;
  has_featured: boolean;
  has_concierge_partner: boolean;
  period_start: string | null;
  current_period_end: string | null;
  paid_amount_cents: number | null;
}

interface RefundPiece {
  tier: "pro" | "featured" | "concierge";
  paidAmountCents: number;
  monthsUsed: number;
  chargeForUseCents: number;
  refundCents: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "auth_failed" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data: subRow, error: subErr } = await admin
    .from("facility_subscriptions")
    .select("id, facility_id, provider_id, billing_period, has_featured, has_concierge_partner, period_start, current_period_end, paid_amount_cents")
    .eq("id", parsed.data.subscription_id)
    .maybeSingle();
  if (subErr || !subRow) {
    return new Response(JSON.stringify({ error: "Subscription not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sub = subRow as FacilitySubscriptionRow;

  // Ownership check — provider must own the facility, OR be admin.
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin = (roleRows ?? []).some((r: { role: string }) =>
    ["admin", "super_admin"].includes(r.role),
  );
  if (!isAdmin && sub.provider_id !== user.id) {
    return new Response(JSON.stringify({ error: "Not your subscription", code: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const periodStart = sub.period_start ? new Date(sub.period_start) : new Date();
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : undefined;
  const isMonthly = sub.billing_period === "monthly";

  // Resolve per-piece paid amount (matches cancel-subscription.ts semantics).
  const paidForPro = isMonthly
    ? TIER_PRICING.pro.fullMonthlyRateCents
    : TIER_PRICING.pro.discountedAnnualCents;
  const paidForFeatured = isMonthly
    ? TIER_PRICING.featured.fullMonthlyRateCents
    : TIER_PRICING.featured.discountedAnnualCents;
  const paidForConcierge = isMonthly
    ? TIER_PRICING.concierge.fullMonthlyRateCents
    : TIER_PRICING.concierge.discountedAnnualCents;

  const pieces: RefundPiece[] = [];

  if (parsed.data.scope === "all" || parsed.data.scope === "addon-featured" || parsed.data.scope === "addon-concierge") {
    if (parsed.data.scope === "all") {
      const proRefund = computeCancellationRefund({
        billingPeriod: sub.billing_period,
        paidAmountCents: paidForPro,
        fullMonthlyRateCents: TIER_PRICING.pro.fullMonthlyRateCents,
        periodStart,
        periodEnd,
      });
      pieces.push({
        tier: "pro",
        paidAmountCents: paidForPro,
        monthsUsed: proRefund.monthsUsed,
        chargeForUseCents: proRefund.chargeForUseCents,
        refundCents: proRefund.refundCents,
      });

      if (sub.has_featured) {
        const fRefund = computeCancellationRefund({
          billingPeriod: sub.billing_period,
          paidAmountCents: paidForFeatured,
          fullMonthlyRateCents: TIER_PRICING.featured.fullMonthlyRateCents,
          periodStart,
          periodEnd,
        });
        pieces.push({
          tier: "featured",
          paidAmountCents: paidForFeatured,
          monthsUsed: fRefund.monthsUsed,
          chargeForUseCents: fRefund.chargeForUseCents,
          refundCents: fRefund.refundCents,
        });
      }

      if (sub.has_concierge_partner) {
        const cRefund = computeCancellationRefund({
          billingPeriod: sub.billing_period,
          paidAmountCents: paidForConcierge,
          fullMonthlyRateCents: TIER_PRICING.concierge.fullMonthlyRateCents,
          periodStart,
          periodEnd,
        });
        pieces.push({
          tier: "concierge",
          paidAmountCents: paidForConcierge,
          monthsUsed: cRefund.monthsUsed,
          chargeForUseCents: cRefund.chargeForUseCents,
          refundCents: cRefund.refundCents,
        });
      }
    } else if (parsed.data.scope === "addon-featured" && sub.has_featured) {
      const f = computeCancellationRefund({
        billingPeriod: sub.billing_period,
        paidAmountCents: paidForFeatured,
        fullMonthlyRateCents: TIER_PRICING.featured.fullMonthlyRateCents,
        periodStart,
        periodEnd,
      });
      pieces.push({
        tier: "featured",
        paidAmountCents: paidForFeatured,
        monthsUsed: f.monthsUsed,
        chargeForUseCents: f.chargeForUseCents,
        refundCents: f.refundCents,
      });
    } else if (parsed.data.scope === "addon-concierge" && sub.has_concierge_partner) {
      const c = computeCancellationRefund({
        billingPeriod: sub.billing_period,
        paidAmountCents: paidForConcierge,
        fullMonthlyRateCents: TIER_PRICING.concierge.fullMonthlyRateCents,
        periodStart,
        periodEnd,
      });
      pieces.push({
        tier: "concierge",
        paidAmountCents: paidForConcierge,
        monthsUsed: c.monthsUsed,
        chargeForUseCents: c.chargeForUseCents,
        refundCents: c.refundCents,
      });
    }
  }

  const totalRefundCents = pieces.reduce((acc, p) => acc + p.refundCents, 0);

  return new Response(
    JSON.stringify({
      billing_period: sub.billing_period,
      period_end: sub.current_period_end,
      scope: parsed.data.scope,
      pieces,
      total_refund_cents: totalRefundCents,
      // Convenience flag for the UI — monthly always shows the
      // "no refund needed, access through period_end" disclosure.
      no_refund_monthly: isMonthly,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
