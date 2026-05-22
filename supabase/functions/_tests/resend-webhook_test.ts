// Resend webhook signature + suppression harness.
//
// Verifies the contract documented at supabase/functions/resend-webhook/
// index.ts:31-104:
//   svix-signature = v1,<base64 HMAC-SHA256 of `${svix-id}.${svix-timestamp}.${body}`>
// with 5-minute replay window on svix-timestamp.
//
// What this covers
// ────────────────
//   1. Missing svix-* headers              → 401, no DB rows
//   2. Invalid svix-signature              → 401, no DB rows
//   3. Stale svix-timestamp (>5 min)       → 401, no DB rows
//   4. Valid bounced event                 → 200, suppressed_emails row,
//                                            email_send_failures row
//   5. Valid complained event              → 200, suppressed_emails row,
//                                            email_send_failures row
//   6. Valid unsubscribed event            → 200, suppressed_emails row,
//                                            NO email_send_failures row
//                                            (unsubscribe is a recipient
//                                            choice, not a delivery failure)
//   7. Duplicate retried bounce            → 200 {duplicate:true}, single
//                                            email_send_failures row only
//
// Required env (tests skip when missing):
//   RESEND_WEBHOOK_URL        e.g. https://<project>.functions.supabase.co/resend-webhook
//   RESEND_WEBHOOK_SECRET     the SAME secret the function validates with
//                             (the raw secret, NOT the whsec_ prefixed form)
//   SUPABASE_TEST_URL         test project URL for assertion queries
//   SUPABASE_TEST_SRK         service-role key for assertion queries
//
// Run:
//   deno test --allow-net --allow-env \
//     supabase/functions/_tests/resend-webhook_test.ts
//
// Each test that writes rows cleans them up by recipient_email (or by
// idempotency_key for email_send_failures) in a `finally` block.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const env = {
  url: Deno.env.get("RESEND_WEBHOOK_URL"),
  secret: Deno.env.get("RESEND_WEBHOOK_SECRET"),
  supabaseUrl: Deno.env.get("SUPABASE_TEST_URL"),
  supabaseSrk: Deno.env.get("SUPABASE_TEST_SRK"),
};

const READY = !!(env.url && env.secret && env.supabaseUrl && env.supabaseSrk);

if (!READY) {
  Deno.test({
    name: "resend-webhook — SKIPPED (missing env)",
    ignore: true,
    fn: () => {
      // See file header for required env vars.
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Signing helpers — mirror the function's verifySvixSignature() algorithm
// exactly. Re-keying via crypto.subtle so we never have to embed test
// fixtures with hardcoded HMACs.
// ─────────────────────────────────────────────────────────────────────────

async function hmacSha256B64(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

interface SvixHeaders {
  "svix-id": string;
  "svix-timestamp": string;
  "svix-signature": string;
}

async function svixHeaders(
  secret: string,
  body: string,
  opts: { id?: string; tsSec?: number } = {},
): Promise<SvixHeaders> {
  const id = opts.id ?? `msg_test_${Math.random().toString(36).slice(2, 10)}`;
  const ts = opts.tsSec ?? Math.floor(Date.now() / 1000);
  const sig = await hmacSha256B64(secret, `${id}.${ts}.${body}`);
  return {
    "svix-id": id,
    "svix-timestamp": String(ts),
    "svix-signature": `v1,${sig}`,
  };
}

function svc() {
  return createClient(env.supabaseUrl!, env.supabaseSrk!);
}

function uniqueEmailId(): string {
  return `test_email_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueRecipient(label: string): string {
  return `${label}+${Date.now().toString(36)}@rl-webhook-test.invalid`;
}

function payload(
  type: "email.bounced" | "email.complained" | "email.unsubscribed",
  opts: { emailId: string; to: string },
): string {
  return JSON.stringify({
    type,
    created_at: new Date().toISOString(),
    data: {
      email_id: opts.emailId,
      to: [opts.to],
      from: "noreply@rehablookup.com",
      subject: "Test",
    },
  });
}

async function cleanup(opts: { recipient?: string; idempotencyKey?: string; emailId?: string }) {
  const s = svc();
  try {
    if (opts.recipient) {
      await s.from("suppressed_emails").delete().eq("email", opts.recipient.toLowerCase());
    }
    if (opts.idempotencyKey) {
      await s.from("email_send_failures").delete().eq("idempotency_key", opts.idempotencyKey);
    }
    if (opts.emailId) {
      await s.from("email_tracking_events").delete().eq("email_id", opts.emailId);
    }
  } catch {
    // best-effort
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Missing svix headers → 401, no rows
// ─────────────────────────────────────────────────────────────────────────

if (READY) Deno.test("resend-webhook: missing svix headers → 401", async () => {
  const emailId = uniqueEmailId();
  const recipient = uniqueRecipient("missing");
  const body = payload("email.bounced", { emailId, to: recipient });
  const res = await fetch(env.url!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  assertEquals(res.status, 401);

  const s = svc();
  const sup = await s.from("suppressed_emails").select("email").eq("email", recipient.toLowerCase()).maybeSingle();
  assertEquals(sup.data, null);
  const fail = await s.from("email_send_failures").select("id").eq("recipient_email", recipient).maybeSingle();
  assertEquals(fail.data, null);
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Wrong-secret signature → 401, no rows
// ─────────────────────────────────────────────────────────────────────────

if (READY) Deno.test("resend-webhook: invalid svix-signature → 401", async () => {
  const emailId = uniqueEmailId();
  const recipient = uniqueRecipient("badsig");
  const body = payload("email.bounced", { emailId, to: recipient });
  const headers = await svixHeaders("wrong_secret", body);
  const res = await fetch(env.url!, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
  assertEquals(res.status, 401);

  const s = svc();
  const sup = await s.from("suppressed_emails").select("email").eq("email", recipient.toLowerCase()).maybeSingle();
  assertEquals(sup.data, null);
  const fail = await s.from("email_send_failures").select("id").eq("recipient_email", recipient).maybeSingle();
  assertEquals(fail.data, null);
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Stale timestamp → 401 (replay window)
// ─────────────────────────────────────────────────────────────────────────

if (READY) Deno.test("resend-webhook: stale svix-timestamp → 401", async () => {
  const emailId = uniqueEmailId();
  const recipient = uniqueRecipient("stale");
  const body = payload("email.bounced", { emailId, to: recipient });
  // 10 minutes in the past — outside the function's 5-minute window.
  const tsSec = Math.floor(Date.now() / 1000) - 600;
  const headers = await svixHeaders(env.secret!, body, { tsSec });
  const res = await fetch(env.url!, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
  assertEquals(res.status, 401);
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Valid bounced → suppression + failure log
// ─────────────────────────────────────────────────────────────────────────

if (READY) Deno.test("resend-webhook: valid bounced → suppressed_emails + email_send_failures", async () => {
  const emailId = uniqueEmailId();
  const recipient = uniqueRecipient("bounce");
  const idempotencyKey = `resend:${emailId}:bounced`;
  const body = payload("email.bounced", { emailId, to: recipient });
  const headers = await svixHeaders(env.secret!, body);

  try {
    const res = await fetch(env.url!, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body,
    });
    assertEquals(res.status, 200);

    const s = svc();
    const sup = await s
      .from("suppressed_emails")
      .select("email, reason, source")
      .eq("email", recipient.toLowerCase())
      .maybeSingle();
    assert(sup.data, "expected suppressed_emails row");
    assertEquals(sup.data!.reason, "bounced");
    assertEquals(sup.data!.source, "resend_webhook");

    const fail = await s
      .from("email_send_failures")
      .select("idempotency_key, recipient_email, error_message")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    assert(fail.data, "expected email_send_failures row for bounced");
    assertEquals(fail.data!.recipient_email, recipient);
    assert(
      fail.data!.error_message?.includes("bounced"),
      `error_message should mention 'bounced': ${fail.data!.error_message}`,
    );
  } finally {
    await cleanup({ recipient, idempotencyKey, emailId });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Valid complained → suppression + failure log
// ─────────────────────────────────────────────────────────────────────────

if (READY) Deno.test("resend-webhook: valid complained → suppressed_emails + email_send_failures", async () => {
  const emailId = uniqueEmailId();
  const recipient = uniqueRecipient("complaint");
  const idempotencyKey = `resend:${emailId}:complained`;
  const body = payload("email.complained", { emailId, to: recipient });
  const headers = await svixHeaders(env.secret!, body);

  try {
    const res = await fetch(env.url!, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body,
    });
    assertEquals(res.status, 200);

    const s = svc();
    const sup = await s
      .from("suppressed_emails")
      .select("email, reason")
      .eq("email", recipient.toLowerCase())
      .maybeSingle();
    assert(sup.data, "expected suppressed_emails row");
    assertEquals(sup.data!.reason, "complained");

    const fail = await s
      .from("email_send_failures")
      .select("idempotency_key")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    assert(fail.data, "expected email_send_failures row for complained");
  } finally {
    await cleanup({ recipient, idempotencyKey, emailId });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Valid unsubscribed → suppression only, NO failure-log row
// ─────────────────────────────────────────────────────────────────────────

if (READY) Deno.test("resend-webhook: valid unsubscribed → suppression only, no failure row", async () => {
  const emailId = uniqueEmailId();
  const recipient = uniqueRecipient("unsub");
  const idempotencyKey = `resend:${emailId}:unsubscribed`;
  const body = payload("email.unsubscribed", { emailId, to: recipient });
  const headers = await svixHeaders(env.secret!, body);

  try {
    const res = await fetch(env.url!, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body,
    });
    assertEquals(res.status, 200);

    const s = svc();
    const sup = await s
      .from("suppressed_emails")
      .select("email, reason")
      .eq("email", recipient.toLowerCase())
      .maybeSingle();
    assert(sup.data, "expected suppressed_emails row for unsubscribe");
    assertEquals(sup.data!.reason, "unsubscribed");

    // Unsubscribe is a recipient choice, NOT a delivery failure — no
    // email_send_failures row should exist.
    const fail = await s
      .from("email_send_failures")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    assertEquals(fail.data, null);
  } finally {
    await cleanup({ recipient, idempotencyKey, emailId });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 7. Duplicate bounce → still 200, single failure row only
// ─────────────────────────────────────────────────────────────────────────

if (READY) Deno.test("resend-webhook: duplicate retried bounce → single email_send_failures row", async () => {
  const emailId = uniqueEmailId();
  const recipient = uniqueRecipient("dup");
  const idempotencyKey = `resend:${emailId}:bounced`;
  const body = payload("email.bounced", { emailId, to: recipient });

  try {
    // First delivery.
    const h1 = await svixHeaders(env.secret!, body);
    const r1 = await fetch(env.url!, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...h1 },
      body,
    });
    assertEquals(r1.status, 200);

    // Replayed delivery with fresh svix-id + timestamp (signature
    // recomputed accordingly so the request is itself valid, but the
    // payload's email_id + event_type are identical → de-duped by
    // email_tracking_events check).
    const h2 = await svixHeaders(env.secret!, body);
    const r2 = await fetch(env.url!, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...h2 },
      body,
    });
    assertEquals(r2.status, 200);
    const body2 = await r2.json();
    assertEquals(body2.duplicate, true);

    // Exactly ONE email_send_failures row for this idempotency_key.
    const s = svc();
    const { count } = await s
      .from("email_send_failures")
      .select("id", { count: "exact", head: true })
      .eq("idempotency_key", idempotencyKey);
    assertEquals(count, 1);
  } finally {
    await cleanup({ recipient, idempotencyKey, emailId });
  }
});
