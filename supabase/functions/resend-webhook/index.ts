import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[RESEND-WEBHOOK] ${step}${detailsStr}`);
};

/**
 * Verify the Resend webhook signature using the svix scheme.
 *
 * Resend signs every webhook delivery using svix. The signature is:
 *   svix-signature: v1,<base64(HMAC-SHA256(secret, `${svix-id}.${svix-timestamp}.${body}`))>
 *
 * Multiple v1, signatures can appear (during secret rotation) — accept
 * if ANY one matches. svix-timestamp is also validated to be within a
 * 5-minute tolerance window to prevent replay attacks.
 *
 * RESEND_WEBHOOK_SECRET must be set in Supabase project secrets as
 * `whsec_<base64>` (the format Resend gives in the dashboard). The
 * function strips the `whsec_` prefix before HMAC.
 *
 * Returns { ok: true } on success or { ok: false, error: "..." }
 * with a structured error code so callers can decide how to respond.
 */
async function verifySvixSignature(
  body: string,
  headers: Headers,
  secret: string,
): Promise<{ ok: true } | { ok: false, error: string }> {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, error: "missing_svix_headers" };
  }

  // Replay protection — reject signatures older than 5 minutes.
  const tsSec = parseInt(svixTimestamp, 10);
  if (!Number.isFinite(tsSec)) {
    return { ok: false, error: "invalid_svix_timestamp" };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const driftSec = Math.abs(nowSec - tsSec);
  if (driftSec > 5 * 60) {
    return { ok: false, error: "svix_timestamp_out_of_window" };
  }

  // Strip the whsec_ prefix and base64-decode the secret.
  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes: Uint8Array;
  try {
    keyBytes = Uint8Array.from(atob(rawSecret), (c) => c.charCodeAt(0));
  } catch {
    return { ok: false, error: "invalid_secret_format" };
  }

  // HMAC-SHA256 the signed payload.
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedPayload = `${svixId}.${svixTimestamp}.${body}`;
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(signedPayload),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));

  // svix-signature can be multiple space-delimited `v1,<sig>` entries
  // (e.g. during secret rotation). Accept if ANY match.
  const provided = svixSignature
    .split(" ")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("v1,"))
    .map((s) => s.slice(3));

  if (provided.length === 0) {
    return { ok: false, error: "no_v1_signature" };
  }

  // Constant-time comparison.
  for (const candidate of provided) {
    if (candidate.length === expected.length) {
      let diff = 0;
      for (let i = 0; i < candidate.length; i++) {
        diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
      }
      if (diff === 0) return { ok: true };
    }
  }
  return { ok: false, error: "signature_mismatch" };
}

/**
 * Normalise a Resend webhook event name to the short form we store
 * in `email_tracking_events.event_type`.
 *
 * Resend sends e.g. "email.sent", "email.delivered", "email.bounced".
 * We strip the prefix so the value matches what `resilient-email-sender.ts`
 * writes ("sent", "failed", "retry", "dlq", "suppressed") and what the
 * Admin → Email Logs UI filters on.
 */
function normaliseEventType(rawType: string): string {
  if (!rawType) return "unknown";
  const trimmed = rawType.trim().toLowerCase();
  // "email.delivered" → "delivered"
  const short = trimmed.startsWith("email.") ? trimmed.slice(6) : trimmed;
  // Resend uses "complained" for spam complaints — keep as-is.
  return short;
}

/**
 * Try to resolve which email_type this Resend message belonged to so the
 * Admin → Email Logs UI can filter it correctly.
 *
 * We look in:
 *   1. `email_tracking_events`     — populated by `resilient-email-sender.ts`
 *      whenever we send through the queue (idempotencyKey == Resend id).
 *   2. `subscription_alerts`        — legacy retention emails.
 *
 * Falls back to "unknown" so a row is still recorded.
 */
async function resolveEmailType(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  emailId: string,
): Promise<string> {
  // 1. Resilient sender stores the Resend id in event_data.resendId on "sent" rows.
  const { data: tracked } = await supabase
    .from("email_tracking_events")
    .select("email_type")
    .or(`email_id.eq.${emailId},event_data->>resendId.eq.${emailId}`)
    .neq("email_type", "unknown")
    .limit(1)
    .maybeSingle();

  if (tracked?.email_type) return tracked.email_type as string;

  // 2. Legacy subscription alerts.
  const { data: alert } = await supabase
    .from("subscription_alerts")
    .select("alert_type")
    .eq("resend_id", emailId)
    .maybeSingle();

  if (alert?.alert_type) return alert.alert_type as string;

  return "unknown";
}

import { initSentry, withSentry, captureEdgeException } from "../_shared/sentry.ts";
initSentry({ functionSlug: "resend-webhook" });

Deno.serve(withSentry("resend-webhook", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    // Signature verification — Resend signs every delivery via svix.
    // Without this check, any unauthenticated caller could POST forged
    // bounce/complaint/unsubscribe events and force-suppress arbitrary
    // recipient addresses, denial-of-email-service-ing legitimate
    // platform mail. RESEND_WEBHOOK_SECRET is configured in Supabase
    // project secrets and matches the value Resend shows in its
    // webhook settings.
    //
    // We read the body as text BEFORE parsing JSON because the
    // signature is computed over the raw bytes — JSON.parse +
    // JSON.stringify would change whitespace and break verification.
    const rawBody = await req.text();

    const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("ERROR — RESEND_WEBHOOK_SECRET not configured; refusing to accept webhook");
      return new Response(
        JSON.stringify({ error: "webhook_misconfigured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sigCheck = await verifySvixSignature(rawBody, req.headers, webhookSecret);
    if (!sigCheck.ok) {
      logStep("Rejected — invalid svix signature", { error: sigCheck.error });
      return new Response(
        JSON.stringify({ error: "invalid_signature", code: sigCheck.error }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let payload: { type?: string; data?: { email_id?: string; to?: string[]; email?: string } };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      logStep("Rejected — malformed JSON");
      return new Response(
        JSON.stringify({ error: "invalid_json" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const rawEventType: string = payload.type || "";
    const emailId: string | undefined = payload.data?.email_id;
    const recipientEmail: string =
      payload.data?.to?.[0] || payload.data?.email || "";

    logStep("Payload parsed", { type: rawEventType, email_id: emailId });

    if (!emailId) {
      logStep("No email_id in payload, skipping");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const eventType = normaliseEventType(rawEventType);
    const emailType = await resolveEmailType(supabaseClient, emailId);

    // Idempotency: skip if we've already recorded this exact (emailId, eventType).
    // Resend retries deliveries on its side; without this we double-count.
    const { data: existing } = await supabaseClient
      .from("email_tracking_events")
      .select("id")
      .eq("email_id", emailId)
      .eq("event_type", eventType)
      .limit(1)
      .maybeSingle();

    if (existing) {
      logStep("Duplicate event ignored", { emailId, eventType });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await supabaseClient
      .from("email_tracking_events")
      .insert({
        email_id: emailId,
        email_type: emailType,
        recipient_email: recipientEmail,
        event_type: eventType,
        event_data: payload.data || {},
      });

    if (insertError) {
      logStep("Error inserting tracking event", { error: insertError.message });
    } else {
      logStep("Tracking event stored", { eventType, emailId, emailType });
    }

    // Review-request funnel tracking. send-review-request stores the
    // Resend message id on the review_requests row via
    // mark_review_request_sent, so we can correlate opens + clicks
    // back to the original invite using resend_id. COALESCE keeps the
    // FIRST event of each type (Resend may fire multiple opens as the
    // recipient revisits the email).
    if (emailType === "review_request" && (eventType === "opened" || eventType === "clicked")) {
      const column = eventType === "opened" ? "opened_at" : "clicked_at";
      const { error: funnelErr } = await supabaseClient
        .from("review_requests")
        .update({
          [column]: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("resend_id", emailId)
        .is(column, null);
      if (funnelErr) {
        logStep("Review-request funnel update failed (non-fatal)", {
          error: funnelErr.message,
          emailId,
          column,
        });
      } else {
        logStep("Review-request funnel updated", { emailId, column });
      }
    }

    // Suppression sync — block future sends to bad addresses.
    // Map Resend events → suppressed_emails.reason (CHECK constrained):
    //   bounced     → "bounced"      (hard bounce; permanent)
    //   complained  → "complained"   (spam complaint)
    //   unsubscribed → "unsubscribed" (recipient opted out via Resend list)
    // Soft bounces / opens / clicks / delivered are ignored here — they don't
    // suppress sending. Insert is best-effort and idempotent (unique on email).
    const SUPPRESSION_MAP: Record<string, string> = {
      bounced: "bounced",
      complained: "complained",
      unsubscribed: "unsubscribed",
    };
    const suppressionReason = SUPPRESSION_MAP[eventType];
    if (suppressionReason && recipientEmail) {
      const normalized = recipientEmail.toLowerCase().trim();
      const { error: suppressErr } = await supabaseClient
        .from("suppressed_emails")
        .upsert(
          {
            email: normalized,
            reason: suppressionReason,
            source: "resend_webhook",
            notes: `Resend ${rawEventType} for email_id ${emailId}`,
          },
          { onConflict: "email", ignoreDuplicates: true },
        );
      if (suppressErr) {
        // Don't fail the webhook — Resend will retry forever otherwise.
        logStep("Suppression upsert failed (non-fatal)", { error: suppressErr.message, normalized });
      } else {
        logStep("Recipient suppressed", { normalized, reason: suppressionReason });
      }
    }

    // Failure log — mirrors the rows that the outbound senders (send-lead-
    // email, notify-payment-failed, resend-lead-confirmation) drop when
    // Resend rejects the handoff. Bounces and complaints are post-handoff
    // delivery failures the admin daily digest needs to see in the same
    // place as pre-handoff failures so on-call doesn't have to scan two
    // tables. Unsubscribes are an explicit recipient choice — not a
    // failure — so we skip them here.
    //
    // idempotency_key is unique per (email_id, event_type) so a retried
    // webhook delivery never produces a duplicate failure row, even if
    // the email_tracking_events idempotency check above has been
    // bypassed by a transient race.
    if ((eventType === "bounced" || eventType === "complained") && recipientEmail) {
      const idempotencyKey = `resend:${emailId}:${eventType}`;
      const { error: failureErr } = await supabaseClient
        .from("email_send_failures")
        .upsert(
          {
            email_type: emailType,
            recipient_email: recipientEmail,
            error_message: `Resend ${rawEventType} (post-delivery)`,
            attempts: 1,
            idempotency_key: idempotencyKey,
            metadata: {
              source: "resend_webhook",
              email_id: emailId,
              event_type: eventType,
              raw_event_type: rawEventType,
              event_data: payload.data || {},
            },
          },
          { onConflict: "idempotency_key", ignoreDuplicates: true },
        );
      if (failureErr) {
        logStep("Failure-log upsert failed (non-fatal)", {
          error: failureErr.message,
          emailId,
          eventType,
        });
      } else {
        logStep("Failure logged", { emailId, eventType, recipientEmail });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    await captureEdgeException(error, { functionSlug: "resend-webhook" });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}));
