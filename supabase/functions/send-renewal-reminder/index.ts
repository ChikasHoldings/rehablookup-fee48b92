// send-renewal-reminder
// ─────────────────────
// Email dispatcher invoked by the daily Postgres cron
// `send_subscription_renewal_reminders()`. Receives one of:
//
//   { subscription_id: uuid, milestone: '60' | '30' | '14' | '7' }
//     → standard annual renewal-reminder email
//   { subscription_id: uuid, milestone: 'cancel_reactivation' }
//     → 60-day "you can still reactivate" offer for canceling subs
//   { subscription_id: uuid, milestone: 'payment_warning' }
//     → past_due card-on-file warning (annual + monthly)
//
// Flow per call:
//   1. Load the facility_subscription + recipient email.
//   2. Render the milestone-specific HTML body.
//   3. Send via `sendEmailWithRetry` (the shared resilient sender —
//      idempotency, retry, suppression, email_tracking_events).
//   4. On success: mark the appropriate `*_sent_at` column on the
//      subscription, AND insert a subscription_events row with
//      status='sent'. The column update is the idempotency guarantee
//      — the next cron run won't re-dispatch this milestone.
//   5. On failure: insert subscription_events with status='failed' and
//      the error message; DO NOT mark the column so tomorrow's cron
//      retries.
//
// verify_jwt is intentionally `false` — service-to-service call from
// pg_net inside the same Supabase project, authenticated via the
// SERVICE_ROLE bearer set by the cron driver.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { assertCronSecret } from "../_shared/cron-auth.ts";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  subscription_id: z.string().uuid(),
  milestone: z.enum(["60", "30", "14", "7", "cancel_reactivation", "payment_warning"]),
});

type Milestone = z.infer<typeof RequestSchema>["milestone"];

const BRAND_NAVY = "#1B365D";
const BILLING_URL = "https://rehablookup.com/provider/billing";

// ── Money helpers ──────────────────────────────────────────────────────
function fmtMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "your renewal date";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

// ── Subscription shape ──────────────────────────────────────────────────
interface SubRow {
  id: string;
  facility_id: string | null;
  provider_id: string | null;
  billing_period: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  has_featured: boolean | null;
  has_concierge_partner: boolean | null;
  paid_amount_cents: number | null;
  stripe_customer_id: string | null;
  facilities: { name: string | null; email: string | null } | null;
  profiles: { email: string | null; first_name: string | null } | null;
}

// ── Brand-wrapped email shell ───────────────────────────────────────────
function emailShell(args: { preheader: string; bodyHtml: string }): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>RehabLookup</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <div style="display:none;font-size:1px;color:#f5f6f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${args.preheader}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f6f8;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:${BRAND_NAVY};padding:18px 24px;">
                <span style="font-family:Georgia,serif;font-weight:700;font-size:18px;color:#ffffff;letter-spacing:.2px;">RehabLookup</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;font-size:15px;line-height:1.55;color:#1f2937;">
                ${args.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
                RehabLookup · An independent rehab directory. We charge facilities
                flat subscription fees only — never per call, lead, or admission.
                <br/>
                <a href="https://rehablookup.com/how-we-make-money" style="color:${BRAND_NAVY};">How we make money →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ── Per-template renderers ──────────────────────────────────────────────
function renderRenewalReminder(sub: SubRow, days: 60 | 30 | 14 | 7): { subject: string; html: string } {
  const firstName = sub.profiles?.first_name ?? "there";
  const renewalDate = fmtDate(sub.current_period_end);
  const total = fmtMoney(sub.paid_amount_cents);

  // Line items — only show add-ons that are actually on the sub.
  const lineItems: string[] = ['Pro Annual …………………… $1,009.80'];
  if (sub.has_featured) lineItems.push('Featured Annual ………… $6,108.60');
  if (sub.has_concierge_partner) lineItems.push('Concierge Annual …… $10,200.00');

  const itemsHtml = `<pre style="font-family:Menlo,Monaco,'Courier New',monospace;font-size:13px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px 16px;margin:12px 0;white-space:pre-wrap;">${lineItems.join("\n")}\n────────────────────────────\nTotal ……………………………………… ${total}</pre>`;

  const subjectByDays: Record<number, string> = {
    60: "Your RehabLookup subscription renews in 60 days",
    30: "Your RehabLookup subscription renews in 30 days",
    14: "RehabLookup subscription renewal — 14 days",
    7: "Final reminder — RehabLookup renews in 7 days",
  };

  const headlineByDays: Record<number, string> = {
    60: `Your RehabLookup annual subscription renews on <strong>${renewalDate}</strong> — about 60 days from today.`,
    30: `Your RehabLookup annual subscription renews on <strong>${renewalDate}</strong> — about 30 days from today.`,
    14: `Your RehabLookup annual subscription renews on <strong>${renewalDate}</strong> — 14 days from today.`,
    7: `Your RehabLookup annual subscription renews in 7 days, on <strong>${renewalDate}</strong>. Your saved payment method will be charged <strong>${total}</strong> automatically.`,
  };

  const closingByDays: Record<number, string> = {
    60: "If you're happy with your current setup, there's nothing you need to do. You'll get one more email closer to the renewal date.",
    30: "If everything still looks right, you don't need to do anything. Your saved payment method will be charged on the renewal date.",
    14: "Two weeks out. You can still switch from annual to monthly at the renewal date if you'd prefer — see the link above. After that the next reminder will be the final one.",
    7: "If nothing's changed, you're all set.",
  };

  const bodyHtml = `
    <p>Hi ${firstName},</p>
    <p>${headlineByDays[days]}</p>
    ${days === 7 ? "" : `
      <p style="margin-top:18px;font-weight:600;color:${BRAND_NAVY};">What renews and what you'll be charged:</p>
      ${itemsHtml}
      <p style="font-size:13px;color:#6b7280;">Pricing reflects the standard 15% annual discount. Your saved payment method will be charged automatically on the renewal date.</p>
    `}
    <p style="margin-top:18px;font-weight:600;color:${BRAND_NAVY};">Want to make changes?</p>
    <ul style="margin:6px 0 0;padding-left:18px;">
      <li><a href="${BILLING_URL}?switch_to_monthly=1" style="color:${BRAND_NAVY};">Switch to monthly billing at renewal</a></li>
      <li><a href="${BILLING_URL}" style="color:${BRAND_NAVY};">Remove an add-on</a></li>
      <li><a href="${BILLING_URL}/cancel" style="color:${BRAND_NAVY};">Cancel</a></li>
      <li><a href="${BILLING_URL}" style="color:${BRAND_NAVY};">Update your payment method</a></li>
    </ul>
    <p style="margin-top:18px;">${closingByDays[days]}</p>
    <p>— RehabLookup</p>
  `;

  return {
    subject: subjectByDays[days],
    html: emailShell({
      preheader: `RehabLookup renews ${days === 7 ? "in 7 days" : `in ${days} days`} on ${renewalDate}.`,
      bodyHtml,
    }),
  };
}

function renderCancelReactivation(sub: SubRow): { subject: string; html: string } {
  const firstName = sub.profiles?.first_name ?? "there";
  const cancelDate = fmtDate(sub.current_period_end);

  const bodyHtml = `
    <p>Hi ${firstName},</p>
    <p>Just a heads up — your annual subscription is set to cancel on <strong>${cancelDate}</strong>.</p>
    <p style="margin-top:16px;font-weight:600;color:${BRAND_NAVY};">After that date:</p>
    <ul style="margin:6px 0 0;padding-left:18px;">
      <li>Your facility moves to the Free tier</li>
      <li>Your verified badge, direct contact display, and lead inbox PII access end</li>
      <li>Active Featured placements and Concierge Partner geos end</li>
    </ul>
    <p style="margin-top:18px;">If you change your mind, you can reactivate any time before <strong>${cancelDate}</strong> — just visit your billing page and the cancellation will be reversed. No data loss.</p>
    <p style="margin-top:18px;">
      <a href="${BILLING_URL}/cancel?reactivate=1"
         style="display:inline-block;background:${BRAND_NAVY};color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">Reactivate subscription →</a>
    </p>
    <p style="margin-top:18px;">If you're sure, no action needed. Subscription ends as scheduled.</p>
    <p>— RehabLookup</p>
  `;

  return {
    subject: "Your RehabLookup cancellation goes into effect in 60 days",
    html: emailShell({
      preheader: `Subscription ends ${cancelDate}. Reactivate any time before then.`,
      bodyHtml,
    }),
  };
}

function renderPaymentWarning(sub: SubRow): { subject: string; html: string } {
  const firstName = sub.profiles?.first_name ?? "there";

  const bodyHtml = `
    <p>Hi ${firstName},</p>
    <p>We tried to charge your saved payment method for your RehabLookup subscription and it didn't go through. To avoid interruption, please update your card on file:</p>
    <p style="margin-top:18px;">
      <a href="${BILLING_URL}"
         style="display:inline-block;background:${BRAND_NAVY};color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">Update payment method →</a>
    </p>
    <p style="margin-top:18px;">Your subscription is still active for now. Stripe will retry the charge a few more times over the next 7 days, and if it keeps failing your subscription will go into a paused state.</p>
    <p style="font-size:13px;color:#6b7280;margin-top:18px;">If you've already updated your card, you can ignore this email.</p>
    <p>— RehabLookup</p>
  `;

  return {
    subject: "Update your RehabLookup payment method",
    html: emailShell({
      preheader: "Your last subscription charge didn't go through.",
      bodyHtml,
    }),
  };
}

// ── Column-update map per milestone ─────────────────────────────────────
//
// On a successful send, set the matching column to now(). On failure,
// we leave it NULL so tomorrow's cron retries.
const COLUMN_BY_MILESTONE: Record<Milestone, string> = {
  "60": "renewal_reminder_60d_sent_at",
  "30": "renewal_reminder_30d_sent_at",
  "14": "renewal_reminder_14d_sent_at",
  "7": "renewal_reminder_7d_sent_at",
  // The cancel_reactivation email occupies the 60d slot — both are sent
  // exactly once at the 60-day window, and they're mutually exclusive
  // (the cron picks one or the other based on cancel_at_period_end).
  cancel_reactivation: "renewal_reminder_60d_sent_at",
  payment_warning: "payment_method_warning_sent_at",
};

const EVENT_TYPE_BY_MILESTONE: Record<Milestone, string> = {
  "60": "renewal_reminder_60d",
  "30": "renewal_reminder_30d",
  "14": "renewal_reminder_14d",
  "7": "renewal_reminder_7d",
  cancel_reactivation: "cancel_reactivation_offer",
  payment_warning: "payment_method_warning",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const __cronAuth = assertCronSecret(req);
  if (!__cronAuth.ok) return __cronAuth.response;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
    });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch {
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

  const { subscription_id, milestone } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data: subRaw, error: subErr } = await supabase
    .from("facility_subscriptions")
    .select("id, facility_id, provider_id, billing_period, current_period_end, cancel_at_period_end, has_featured, has_concierge_partner, paid_amount_cents, stripe_customer_id, facilities(name, email), profiles!facility_subscriptions_provider_id_fkey(email, first_name)")
    .eq("id", subscription_id)
    .single();

  if (subErr || !subRaw) {
    console.error("[send-renewal-reminder] subscription not found", subscription_id, subErr);
    return new Response(JSON.stringify({ error: "Subscription not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sub = subRaw as unknown as SubRow;

  // Recipient: provider profile email first (the human who owns the
  // billing relationship), facility's general email second.
  const recipientEmail = sub.profiles?.email ?? sub.facilities?.email ?? null;
  if (!recipientEmail) {
    console.warn(`[send-renewal-reminder] no recipient email for subscription ${sub.id}`);
    await supabase.from("subscription_events").insert({
      event_type: EVENT_TYPE_BY_MILESTONE[milestone],
      facility_id: sub.facility_id,
      stripe_customer_id: sub.stripe_customer_id,
      status: "failed",
      metadata: { reason: "no_recipient_email", milestone },
    });
    return new Response(JSON.stringify({ ok: false, reason: "no_recipient" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Render the right template.
  let rendered: { subject: string; html: string };
  if (milestone === "cancel_reactivation") {
    rendered = renderCancelReactivation(sub);
  } else if (milestone === "payment_warning") {
    rendered = renderPaymentWarning(sub);
  } else {
    rendered = renderRenewalReminder(sub, Number(milestone) as 60 | 30 | 14 | 7);
  }

  // Send via the shared resilient sender (handles Resend retries +
  // suppression + email_tracking_events logging).
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("[send-renewal-reminder] RESEND_API_KEY not set — skipping send");
    await supabase.from("subscription_events").insert({
      event_type: EVENT_TYPE_BY_MILESTONE[milestone],
      facility_id: sub.facility_id,
      stripe_customer_id: sub.stripe_customer_id,
      status: "failed",
      metadata: { reason: "resend_not_configured", milestone },
    });
    return new Response(JSON.stringify({ ok: false, reason: "resend_not_configured" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const resend = new Resend(resendKey);

  // Idempotency key combines subscription + milestone so a duplicate
  // dispatch within the same cron window is a no-op (no second email
  // sent). The reminder_sent_at column is the primary guarantee;
  // this is a defense-in-depth second layer.
  const idempotencyKey = `renewal_reminder:${sub.id}:${milestone}`;

  const result = await sendEmailWithRetry(
    supabase,
    resend,
    {
      from: "RehabLookup <subscriptions@rehablookup.com>",
      to: recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
    },
    {
      emailType: EVENT_TYPE_BY_MILESTONE[milestone],
      idempotencyKey,
      metadata: {
        subscription_id: sub.id,
        facility_id: sub.facility_id,
        milestone,
      },
    },
  );

  if (!result.success) {
    console.error("[send-renewal-reminder] send failed", { subscription_id, milestone, error: result.error });
    await supabase.from("subscription_events").insert({
      event_type: EVENT_TYPE_BY_MILESTONE[milestone],
      facility_id: sub.facility_id,
      stripe_customer_id: sub.stripe_customer_id,
      status: "failed",
      metadata: {
        milestone,
        error: result.error ?? "unknown",
        attempts: result.attempts,
      },
    });
    // 200 so pg_net doesn't retry; we've logged the failure and the
    // column is still NULL so tomorrow's cron will retry naturally.
    return new Response(JSON.stringify({ ok: false, reason: "send_failed", error: result.error }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Success path: mark the column + log subscription_events.
  const column = COLUMN_BY_MILESTONE[milestone];
  const { error: updateErr } = await supabase
    .from("facility_subscriptions")
    .update({ [column]: new Date().toISOString() })
    .eq("id", sub.id);

  if (updateErr) {
    console.error("[send-renewal-reminder] column update failed", { subscription_id, column, updateErr });
    // The email DID go out; logging the failure but returning 200 so
    // the cron doesn't get confused. The downside: next cron may
    // re-dispatch (sendEmailWithRetry's idempotency guards against an
    // actual duplicate email landing in the inbox).
  }

  await supabase.from("subscription_events").insert({
    event_type: EVENT_TYPE_BY_MILESTONE[milestone],
    facility_id: sub.facility_id,
    stripe_customer_id: sub.stripe_customer_id,
    status: "sent",
    metadata: {
      milestone,
      recipient: recipientEmail,
      email_id: result.emailId ?? null,
      attempts: result.attempts,
      deduplicated: result.deduplicated ?? false,
    },
  });

  return new Response(
    JSON.stringify({ ok: true, milestone, email_id: result.emailId ?? null }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
