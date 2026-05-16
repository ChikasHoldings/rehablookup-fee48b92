// send-renewal-reminder
// ─────────────────────
// Email dispatcher invoked by the daily Postgres cron
// `send_subscription_renewal_reminders()`. Receives:
//   { subscription_id: uuid, milestone_days: 60|30|14|7 }
//
// Loads the facility_subscription row + provider email + facility name,
// composes the renewal-reminder email, sends via Resend. The cron has
// ALREADY timestamped the matching renewal_reminder_*_sent_at column
// before invoking us — so even if Resend fails here, we don't retry
// at this layer (the duplicate-suppression guard prevents the next
// day's cron from re-firing for this milestone). A failed send shows
// up as a Resend error in logs, and the support team manually re-sends
// from there.
//
// verify_jwt is intentionally `false` — this is a service-to-service
// call from inside the same Supabase project (cron → edge function).
// Authentication happens via the SERVICE_ROLE bearer set by pg_net.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  subscription_id: z.string().uuid(),
  milestone_days: z.union([z.literal(60), z.literal(30), z.literal(14), z.literal(7)]),
});

function fmtMoney(cents: number | null): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function urgencyLine(daysOut: number): string {
  if (daysOut === 7) return "Your subscription renews in about a week.";
  if (daysOut === 14) return "Your subscription renews in two weeks.";
  if (daysOut === 30) return "Your subscription renews in about a month.";
  return "A heads-up that your subscription renews in 60 days.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
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
    return new Response(JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data: sub, error: subErr } = await supabase
    .from("facility_subscriptions")
    .select(
      "id, facility_id, provider_id, current_period_end, tier, has_featured, has_concierge_partner, paid_amount_cents, stripe_customer_id, facilities(name, email), profiles!facility_subscriptions_provider_id_fkey(email, first_name)",
    )
    .eq("id", parsed.data.subscription_id)
    .single();

  if (subErr || !sub) {
    console.error("[send-renewal-reminder] subscription not found", parsed.data.subscription_id, subErr);
    return new Response(JSON.stringify({ error: "Subscription not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const subscription = sub as unknown as {
    id: string;
    current_period_end: string | null;
    has_featured: boolean | null;
    has_concierge_partner: boolean | null;
    paid_amount_cents: number | null;
    facilities: { name: string; email: string | null } | null;
    profiles: { email: string | null; first_name: string | null } | null;
  };

  const recipientEmail =
    subscription.profiles?.email ?? subscription.facilities?.email ?? null;
  if (!recipientEmail) {
    console.warn(
      `[send-renewal-reminder] no recipient email for subscription ${subscription.id}`,
    );
    return new Response(
      JSON.stringify({ ok: false, reason: "no_recipient" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const tierLabel = subscription.has_featured && subscription.has_concierge_partner
    ? "Pro + Featured + Concierge"
    : subscription.has_featured
      ? "Pro + Featured"
      : subscription.has_concierge_partner
        ? "Pro + Concierge"
        : "Pro";

  const renewalDate = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : "your renewal date";

  const firstName = subscription.profiles?.first_name ?? "there";
  const days = parsed.data.milestone_days;

  const html = `
    <p>Hi ${firstName},</p>
    <p>${urgencyLine(days)}</p>
    <p>
      Your RehabLookup subscription renews on <strong>${renewalDate}</strong>
      for <strong>${fmtMoney(subscription.paid_amount_cents)}</strong>.
      This includes: <strong>${tierLabel}</strong>.
    </p>
    <p>
      If you need to make changes — cancel, remove an add-on, or update
      your payment method — log in at
      <a href="https://rehablookup.com/provider/billing">/provider/billing</a>
      before the renewal date.
    </p>
    <p style="font-size:.9em;color:#666;">
      After renewal, normal cancellation refund terms apply: full monthly
      rate for months used, 15% discount applies only to fully completed
      years.
    </p>
    <p>— RehabLookup</p>
  `;

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("[send-renewal-reminder] RESEND_API_KEY not set — skipping send");
    return new Response(JSON.stringify({ ok: false, reason: "resend_not_configured" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resend = new Resend(resendKey);
  try {
    const { data: sendResult, error: sendErr } = await resend.emails.send({
      from: "RehabLookup <subscriptions@rehablookup.com>",
      to: recipientEmail,
      subject: `Your RehabLookup subscription renews ${days === 7 ? "next week" : `in ${days} days`}`,
      html,
    });
    if (sendErr) throw sendErr;
    return new Response(
      JSON.stringify({ ok: true, milestone_days: days, email_id: sendResult?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[send-renewal-reminder] resend failed", err);
    return new Response(
      JSON.stringify({ ok: false, reason: "resend_failed", message: String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
