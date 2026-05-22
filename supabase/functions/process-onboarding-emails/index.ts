// process-onboarding-emails
// ─────────────────────────
// Cron-callable drain of emails_outbox for the unified provider
// onboarding wizard's drip sequences:
//
//   free_to_pro      — 5 emails over 14 days (Day 0, 1, 3, 7, 14)
//   pro_to_featured  — 4 emails over 21 days (Day 1, 7, 14, 21)
//
// Per spec §9, EVERY scheduled send re-reads state before dispatch
// and BAILS (status='skipped' with skipped_reason) when:
//
//   - users.unsubscribed_provider_emails_at is set
//   - profiles.email_verified_at is null (belt-and-braces)
//   - sequence='free_to_pro' AND profiles.plan='pro' now
//   - sequence='pro_to_featured' AND facility_subscriptions.has_featured
//     is true for any facility owned by this provider
//
// Resend dispatches go through the resilient-email-sender wrapper so
// retries + tracking + suppression are all preserved.
//
// verify_jwt: true — only invoked by Supabase cron (which authenticates
// via the service-role key) or by an admin runbook. NOT a public
// endpoint.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { assertCronSecret } from "../_shared/cron-auth.ts";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry, sleep, BULK_SEND_DELAY_MS } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_LIMIT = 50;
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "https://rehablookup.com";

interface OutboxRow {
  id: string;
  user_id: string;
  sequence: "free_to_pro" | "pro_to_featured";
  step: number;
  scheduled_for: string;
  attempts: number;
}

interface UserProfile {
  user_id: string;
  email: string | null;
  first_name: string | null;
  plan: "free" | "pro" | null;
  email_verified_at: string | null;
  unsubscribed_provider_emails_at: string | null;
}

/**
 * Build the unsubscribe link that flips profiles.
 * unsubscribed_provider_emails_at when clicked. The token is a
 * lightweight payload (user_id base64) — the unsubscribe edge fn
 * validates + writes server-side. Not bearer-token-secure on its
 * own; the worst case is an attacker unsubscribing a user from
 * marketing emails, which is the user's intent anyway.
 */
function unsubscribeUrl(userId: string): string {
  const token = btoa(userId);
  return `${PUBLIC_SITE_URL}/api/provider-emails/unsubscribe?u=${token}`;
}

interface SequenceContent {
  subject: string;
  html: string;
}

function template({
  subject,
  greeting,
  bodyParagraphs,
  ctaLabel,
  ctaUrl,
  unsubLink,
}: {
  subject: string;
  greeting: string;
  bodyParagraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  unsubLink: string;
}): SequenceContent {
  return {
    subject,
    html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
        <tr><td style="padding:28px 28px 12px;">
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">RehabLookup</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${subject}</h1>
        </td></tr>
        <tr><td style="padding:8px 28px;">
          <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#1f2937;">${greeting}</p>
          ${bodyParagraphs.map((p) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#374151;">${p}</p>`).join("")}
          <div style="margin:22px 0 6px;">
            <a href="${ctaUrl}" style="display:inline-block;background:#1B365D;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px;">
              ${ctaLabel}
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:22px 28px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">
            You're receiving this because you registered a provider account at RehabLookup.
            <br>
            <a href="${unsubLink}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe from these emails</a>
            &nbsp;·&nbsp; <a href="${PUBLIC_SITE_URL}/provider/dashboard" style="color:#9ca3af;text-decoration:underline;">Open dashboard</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

function freeToProContent(step: number, firstName: string, unsub: string): SequenceContent {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const dashboardUrl = `${PUBLIC_SITE_URL}/provider/dashboard`;
  const upgradeUrl = `${PUBLIC_SITE_URL}/provider/billing?upgrade=pro`;
  switch (step) {
    case 1:
      return template({
        subject: "Welcome to RehabLookup — your listing is live",
        greeting,
        bodyParagraphs: [
          "Your facility is now in our directory. Families searching for treatment in your area can find you, save you to favorites, and message you directly.",
          "On Free, you've got a basic listing with up to 5 photos and standard placement. When you're ready to stand out, Pro unlocks 10 photos, video, priority placement, and lead analytics for $99/month.",
        ],
        ctaLabel: "Open your dashboard",
        ctaUrl: dashboardUrl,
        unsubLink: unsub,
      });
    case 2:
      return template({
        subject: "What Pro providers get that Free providers don't",
        greeting,
        bodyParagraphs: [
          "<strong>Pro $99/mo</strong> unlocks the things families actually weight when choosing a facility:",
          "• 10 photos + 1 facility video<br>• Priority placement on city + state pages<br>• Lead analytics — see who's reaching out and from where<br>• Dedicated provider support",
          "Most providers see the bump in inquiries within the first 2 weeks of upgrading.",
        ],
        ctaLabel: "Upgrade to Pro",
        ctaUrl: upgradeUrl,
        unsubLink: unsub,
      });
    case 3:
      return template({
        subject: "Your facility was viewed this week",
        greeting,
        bodyParagraphs: [
          "We've been tracking how families are finding your listing.",
          "Pro providers see the full breakdown — searches that surfaced your listing, profile views, message-button clicks, and which states + insurance carriers your visitors filter on.",
          "Free providers see the aggregate count only. If you want the granular view, Pro unlocks the analytics dashboard.",
        ],
        ctaLabel: "See full analytics on Pro",
        ctaUrl: upgradeUrl,
        unsubLink: unsub,
      });
    case 4:
      return template({
        subject: "How one Pro facility 3x'd inquiries in 30 days",
        greeting,
        bodyParagraphs: [
          "A West Coast detox program upgraded to Pro last quarter. Within 30 days they were getting 3x the inquiry volume from RehabLookup.",
          "The difference wasn't search — it was conversion. With the enriched profile, 10 photos, the video walkthrough, and the priority slot on their state page, families had everything they needed to message without leaving the listing.",
          "Pro is $99/month flat. Cancel anytime from your dashboard.",
        ],
        ctaLabel: "Upgrade to Pro",
        ctaUrl: upgradeUrl,
        unsubLink: unsub,
      });
    case 5:
    default:
      return template({
        subject: "Last touch — Pro is $99/month flat",
        greeting,
        bodyParagraphs: [
          "Pro is a flat $99/month. No setup fee, no per-lead pricing, no commission on admissions — EKRA-clean by design.",
          "You'll see the upgrade in your dashboard immediately: 10 photos, video, priority placement, lead analytics. Cancel anytime from billing if it doesn't move the needle.",
        ],
        ctaLabel: "Upgrade to Pro",
        ctaUrl: upgradeUrl,
        unsubLink: unsub,
      });
  }
}

function proToFeaturedContent(step: number, firstName: string, unsub: string): SequenceContent {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const dashboardUrl = `${PUBLIC_SITE_URL}/provider/dashboard`;
  const featuredUrl = `${PUBLIC_SITE_URL}/provider/marketing/featured`;
  switch (step) {
    case 1:
      return template({
        subject: "You're a Pro provider — here's how to maximize it",
        greeting,
        bodyParagraphs: [
          "Welcome to Pro. Your enriched profile, photo gallery, and analytics dashboard are all unlocked.",
          "A few quick wins for the first week:<br>• Upload all 10 photos — listings with 8+ photos see 2x more clicks<br>• Add the facility video — pages with video keep visitors on-listing 3x longer<br>• Fill in services + insurance — the more complete the profile, the higher you rank in directory search",
          "Once those are dialed in, the next lever is Featured placement — priority surfacing on the homepage + state directory.",
        ],
        ctaLabel: "Open your dashboard",
        ctaUrl: dashboardUrl,
        unsubLink: unsub,
      });
    case 2:
      return template({
        subject: "Featured listings get 4x more views",
        greeting,
        bodyParagraphs: [
          "Pro gets you on the directory. Featured puts you at the top.",
          "Across our network, Featured facilities pull 4x the profile views of comparable non-Featured listings in the same state. The math compounds — more views, more saves, more direct messages, more admissions.",
          "Featured is a flat $599/month add-on. EKRA-clean, no per-call fees, no commission on admissions.",
        ],
        ctaLabel: "Add Featured to your account",
        ctaUrl: featuredUrl,
        unsubLink: unsub,
      });
    case 3:
      return template({
        subject: "How a Pro facility used Featured to fill capacity",
        greeting,
        bodyParagraphs: [
          "A mid-size Texas residential program added Featured in February. By April they were sitting at 80% bed utilization — the highest they'd run in two years.",
          "Their take: \"Pro got us discovered. Featured got us picked.\" The combination gave them the directory presence and the priority placement to win against larger national chains in their state.",
          "Featured is a flat $599/month, cancel anytime. Slot availability varies by state.",
        ],
        ctaLabel: "Check Featured availability",
        ctaUrl: featuredUrl,
        unsubLink: unsub,
      });
    case 4:
    default:
      return template({
        subject: "Last call — Featured pricing",
        greeting,
        bodyParagraphs: [
          "We're nearing the end of our intro window for Featured. After this month, the standard $599/month rate locks in.",
          "If Featured is on your radar, now's the best time to lock the slot. Most states have 4–6 Featured slots total; once they're claimed, you're on the waitlist.",
        ],
        ctaLabel: "Reserve a Featured slot",
        ctaUrl: featuredUrl,
        unsubLink: unsub,
      });
  }
}

interface ProcessResult {
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
}

async function processRow(
  supabase: ReturnType<typeof createClient>,
  resend: Resend,
  row: OutboxRow,
): Promise<"sent" | "skipped" | "failed"> {
  // Re-read state per row.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("user_id, email, first_name, plan, email_verified_at, unsubscribed_provider_emails_at")
    .eq("user_id", row.user_id)
    .maybeSingle();
  const profile = (profileRow as unknown as UserProfile | null) ?? null;
  if (!profile) {
    await supabase.from("emails_outbox").update({
      status: "skipped",
      skipped_reason: "no_profile_row",
    } as never).eq("id", row.id);
    return "skipped";
  }

  if (!profile.email) {
    await supabase.from("emails_outbox").update({
      status: "skipped",
      skipped_reason: "no_email_on_profile",
    } as never).eq("id", row.id);
    return "skipped";
  }

  if (profile.unsubscribed_provider_emails_at) {
    await supabase.from("emails_outbox").update({
      status: "skipped",
      skipped_reason: "user_unsubscribed",
    } as never).eq("id", row.id);
    return "skipped";
  }

  if (!profile.email_verified_at) {
    await supabase.from("emails_outbox").update({
      status: "skipped",
      skipped_reason: "email_not_verified",
    } as never).eq("id", row.id);
    return "skipped";
  }

  // Sequence-specific bail.
  if (row.sequence === "free_to_pro" && profile.plan === "pro") {
    await supabase.from("emails_outbox").update({
      status: "skipped",
      skipped_reason: "user_already_pro",
    } as never).eq("id", row.id);
    return "skipped";
  }

  if (row.sequence === "pro_to_featured") {
    const { data: featuredRow } = await supabase
      .from("facility_subscriptions")
      .select("id")
      .eq("provider_id", row.user_id)
      .eq("status", "active")
      .eq("has_featured", true)
      .limit(1)
      .maybeSingle();
    if (featuredRow) {
      await supabase.from("emails_outbox").update({
        status: "skipped",
        skipped_reason: "user_already_featured",
      } as never).eq("id", row.id);
      return "skipped";
    }
  }

  // Compose the email.
  const unsub = unsubscribeUrl(row.user_id);
  const firstName = profile.first_name ?? "";
  const content = row.sequence === "free_to_pro"
    ? freeToProContent(row.step, firstName, unsub)
    : proToFeaturedContent(row.step, firstName, unsub);

  const { error: sendErr } = await sendEmailWithRetry(supabase, resend, {
    from: "RehabLookup <no-reply@rehablookup.com>",
    to: [profile.email],
    subject: content.subject,
    html: content.html,
    headers: {
      "X-Sequence": row.sequence,
      "X-Sequence-Step": String(row.step),
    },
  }, {
    emailType: `onboarding_${row.sequence}_step_${row.step}`,
    idempotencyKey: `outbox-${row.id}`,
    metadata: { sequence: row.sequence, step: row.step },
  });

  if (sendErr) {
    await supabase.from("emails_outbox").update({
      status: "failed",
      last_error: typeof sendErr === "string" ? sendErr : JSON.stringify(sendErr),
      attempts: row.attempts + 1,
    } as never).eq("id", row.id);
    return "failed";
  }

  await supabase.from("emails_outbox").update({
    status: "sent",
    sent_at: new Date().toISOString(),
    attempts: row.attempts + 1,
  } as never).eq("id", row.id);
  return "sent";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const __cronAuth = assertCronSecret(req);
  if (!__cronAuth.ok) return __cronAuth.response;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const resend = new Resend(resendKey);

  // Pull a batch of pending rows whose scheduled_for has elapsed.
  const { data: rows, error: fetchErr } = await supabase
    .from("emails_outbox")
    .select("id, user_id, sequence, step, scheduled_for, attempts")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(BATCH_LIMIT);
  if (fetchErr) {
    return new Response(
      JSON.stringify({ error: "fetch_failed", details: fetchErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const result: ProcessResult = { scanned: rows?.length ?? 0, sent: 0, skipped: 0, failed: 0 };

  for (const row of (rows ?? []) as unknown as OutboxRow[]) {
    try {
      const outcome = await processRow(supabase, resend, row);
      result[outcome] += 1;
    } catch (e) {
      console.error("[process-onboarding-emails] row processing failed", row.id, e);
      result.failed += 1;
    }
    await sleep(BULK_SEND_DELAY_MS);
  }

  return new Response(
    JSON.stringify(result),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
