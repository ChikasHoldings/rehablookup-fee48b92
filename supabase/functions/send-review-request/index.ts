/**
 * send-review-request
 *
 * Provider portal → /provider/reviews fires this with a recipient
 * name + email + facility id. The function:
 *
 *   1. Authenticates the caller against the request's JWT.
 *   2. Calls create_review_request RPC (SECURITY DEFINER, validates
 *      ownership + rate-limit + dedupe). Returns the request id —
 *      duplicate requests reuse the existing row.
 *   3. Looks up the facility name/slug for the email body.
 *   4. Sends an HTML email via the shared resilient sender (retries
 *      + suppressed-emails + email_tracking_events ledger).
 *   5. Calls mark_review_request_sent via the service-role client
 *      so sent_at + resend_id land on the row.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  facility_id: string;
  recipient_name: string;
  recipient_email: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildEmail(opts: {
  facilityName: string;
  facilityCity: string | null;
  facilityState: string | null;
  recipientFirstName: string;
  reviewUrl: string;
  senderName: string;
}) {
  const subject = `${opts.facilityName} would love your feedback`;
  const cityState = [opts.facilityCity, opts.facilityState].filter(Boolean).join(", ");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f9;-webkit-font-smoothing:antialiased;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9">
  <tr><td align="center" style="padding:40px 20px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">
      <tr><td style="background:#1B365D;padding:24px 32px;text-align:left">
        <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600">Share your experience</h1>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55">Hi ${escapeHtml(opts.recipientFirstName)},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55">
          ${escapeHtml(opts.senderName)} at <strong>${escapeHtml(opts.facilityName)}</strong>${cityState ? ` in ${escapeHtml(cityState)}` : ""} asked us to invite you to share a brief review of your experience.
        </p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.55">
          Your honest feedback helps other families and individuals who are
          searching for treatment options. RehabLookup moderates every review
          before it goes live, so you have time to share what's real.
        </p>
        <div style="text-align:center;margin:28px 0">
          <a href="${opts.reviewUrl}" style="display:inline-block;background:#1B365D;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px">Leave a review →</a>
        </div>
        <p style="margin:0 0 16px;font-size:13px;line-height:1.55;color:#475569">
          This link is unique to you and expires in 30 days. If the button
          doesn't work, copy and paste this URL into your browser:
        </p>
        <p style="margin:0 0 24px;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all">
          <a href="${opts.reviewUrl}" style="color:#1B365D">${opts.reviewUrl}</a>
        </p>
        <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5">
          You're getting this email because a facility you've been in contact
          with asked us to invite a review. If you'd rather not, just ignore
          this email — no further follow-ups will be sent.
        </p>
      </td></tr>
      <tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
        <p style="margin:0;font-size:11px;color:#94a3b8">RehabLookup · Verified treatment directory</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const text = [
    `Hi ${opts.recipientFirstName},`,
    "",
    `${opts.senderName} at ${opts.facilityName}${cityState ? ` in ${cityState}` : ""} asked us to invite you to share a brief review of your experience.`,
    "",
    "Your honest feedback helps other families and individuals searching for treatment options. RehabLookup moderates every review before it goes live.",
    "",
    `Leave a review: ${opts.reviewUrl}`,
    "",
    "This link is unique to you and expires in 30 days.",
    "",
    "If you'd rather not, just ignore this email — no further follow-ups will be sent.",
    "",
    "RehabLookup · Verified treatment directory",
  ].join("\n");

  return { subject, html, text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return json({ error: "No authorization header" }, 401);
    }

    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND = Deno.env.get("RESEND_API_KEY");
    if (!RESEND) {
      return json({ error: "Email service not configured" }, 500);
    }

    const userClient = createClient(SB_URL, SB_ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    let body: Body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const facilityId = body.facility_id?.trim();
    const recipientName = body.recipient_name?.trim();
    const recipientEmail = body.recipient_email?.trim().toLowerCase();
    if (!facilityId || !recipientName || !recipientEmail) {
      return json({ error: "Missing required fields" }, 400);
    }

    // Create the review_requests row — RPC enforces ownership, rate
    // limit, and dedupe. We bubble the structured error message up so
    // the provider UI can show "Daily limit reached" verbatim.
    const { data: created, error: createError } = await userClient.rpc(
      "create_review_request",
      {
        p_facility_id: facilityId,
        p_recipient_name: recipientName,
        p_recipient_email: recipientEmail,
      },
    );
    if (createError) {
      console.error("[send-review-request] create_review_request failed:", createError);
      return json(
        { error: createError.message || "Could not create review request" },
        createError.code === "42501" ? 403 : 400,
      );
    }
    const requestPayload = created as {
      request_id: string;
      facility_id: string;
      recipient_name: string;
      recipient_email: string;
      duplicate: boolean;
    };

    // If this was a duplicate (same recipient, still-pending request
    // within 24h), don't re-send the email — that'd be spam. Return
    // success so the UI can show "already invited" cleanly.
    if (requestPayload.duplicate) {
      return json({
        ok: true,
        duplicate: true,
        request_id: requestPayload.request_id,
        message: "This recipient already has a pending review invitation. No new email sent.",
      });
    }

    // Fetch facility name + city/state and the sender's display name
    // for the email body. Service role bypasses RLS since we're
    // composing a transactional email server-side.
    const adminClient = createClient(SB_URL, SB_SVC);
    const [facilityRes, profileRes] = await Promise.all([
      adminClient
        .from("facilities")
        .select("name, slug, city, state")
        .eq("id", facilityId)
        .maybeSingle(),
      adminClient
        .from("profiles")
        .select("first_name, last_name, primary_contact_name")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (facilityRes.error || !facilityRes.data) {
      console.error("[send-review-request] facility lookup failed:", facilityRes.error);
      return json({ error: "Facility not found" }, 404);
    }
    const facility = facilityRes.data as {
      name: string; slug: string; city: string | null; state: string | null;
    };

    const senderName =
      profileRes.data?.primary_contact_name?.trim() ||
      [profileRes.data?.first_name, profileRes.data?.last_name].filter(Boolean).join(" ").trim() ||
      "The admissions team";

    const reviewUrl = `https://rehablookup.com/review/${requestPayload.request_id}`;
    const recipientFirstName = recipientName.split(/\s+/)[0] || "there";
    const { subject, html, text } = buildEmail({
      facilityName: facility.name,
      facilityCity: facility.city,
      facilityState: facility.state,
      recipientFirstName,
      reviewUrl,
      senderName,
    });

    const resend = new Resend(RESEND);
    // Run through the shared resilient sender so the email_tracking_events
    // ledger + retry + suppressed-emails + DLQ logic kick in. Idempotency
    // key tied to the request id prevents Resend from sending two emails
    // when the function is replayed within seconds.
    const sendResult = await sendEmailWithRetry(
      adminClient,
      resend,
      {
        from: "RehabLookup <reviews@rehablookup.com>",
        to: [recipientEmail],
        subject,
        html,
        replyTo: undefined,
        headers: { "X-Entity-Ref-ID": requestPayload.request_id },
      },
      {
        emailType: "review_request",
        idempotencyKey: `review-request-${requestPayload.request_id}`,
        metadata: { facility_id: facilityId, request_id: requestPayload.request_id },
      },
    );

    // The shared sender returns { success, emailId, suppressed, error }. The
    // previous code read `.id` / `.data.id` (shapes the sender never returns),
    // so resendId was ALWAYS null → mark_review_request_sent never fired and
    // every request was stuck "Pending" even after delivery, and the function
    // returned ok:true even when the email was suppressed/failed → a false
    // "request sent" toast with no recovery path. Decide on `success` and read
    // the real `emailId`.
    if (!sendResult.success) {
      // The review_requests row exists, but the invitation email did NOT go
      // out. Don't claim it was sent — tell the provider so they can follow up.
      // sent_at stays null and the row shows as Pending in the history.
      console.warn("[send-review-request] invite email not sent", {
        request_id: requestPayload.request_id,
        suppressed: sendResult.suppressed ?? false,
        error: sendResult.error ?? null,
      });
      return json({
        ok: false,
        email_sent: false,
        request_id: requestPayload.request_id,
        suppressed: sendResult.suppressed === true,
        message: sendResult.suppressed
          ? "This recipient has opted out of emails, so no review invitation was sent."
          : "We created the request, but couldn't send the invitation email. Please try again shortly.",
      });
    }

    // Email sent — stamp sent_at (+ resend id for open/click correlation).
    const resendId = sendResult.emailId ?? null;
    const { error: markError } = await adminClient.rpc(
      "mark_review_request_sent",
      { p_request_id: requestPayload.request_id, p_resend_id: resendId },
    );
    if (markError) {
      // Email already went out; only the sent_at/resend_id stamp failed.
      console.warn(
        "[send-review-request] mark_review_request_sent failed (email still sent):",
        markError,
      );
    }

    // The shared sender derives the text alternative; pass-through retained.
    void text;

    return json({
      ok: true,
      email_sent: true,
      request_id: requestPayload.request_id,
      review_url: reviewUrl,
    });
  } catch (err) {
    console.error("[send-review-request] Unexpected:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500,
    );
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
