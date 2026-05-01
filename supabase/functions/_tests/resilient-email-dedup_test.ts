// Unit tests for sendEmailWithRetry's idempotency / dedup contract.
//
// We don't bring up a real Supabase or Resend client — we feed in
// minimal stubs that emulate the two outcomes we care about:
//   1. No prior `sent` event for the idempotencyKey -> performs a real
//      send and returns { success: true, deduplicated: undefined }.
//   2. Prior `sent` event exists -> short-circuits with
//      { success: true, deduplicated: true, firstSentAt }.

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

// ---------------------------------------------------------------------------
// Supabase client stub: a tiny query-builder that returns canned responses
// based on which table+filter chain is being built.
// ---------------------------------------------------------------------------

type EventRow = { id: string; created_at: string };

function makeSupabaseStub(opts: {
  existingSentRow?: EventRow | null;
  inserts: Array<Record<string, unknown>>;
}) {
  // deno-lint-ignore no-explicit-any
  const builder: any = {
    _table: "",
    _filters: {} as Record<string, unknown>,
    select() { return builder; },
    eq(col: string, val: unknown) { builder._filters[col] = val; return builder; },
    order() { return builder; },
    limit() { return builder; },
    async maybeSingle() {
      if (
        builder._table === "email_tracking_events" &&
        builder._filters.event_type === "sent"
      ) {
        return { data: opts.existingSentRow ?? null, error: null };
      }
      if (builder._table === "suppressed_emails") {
        return { data: null, error: null };
      }
      return { data: null, error: null };
    },
    async insert(row: Record<string, unknown>) {
      opts.inserts.push({ table: builder._table, ...row });
      return { data: null, error: null };
    },
  };
  return {
    from(table: string) {
      // Reset per-chain state so consecutive .from() calls don't bleed.
      builder._table = table;
      builder._filters = {};
      return builder;
    },
  };
}

// Minimal Resend stub — only `.emails.send()` is reached on the non-dedup
// path. Returns a synthetic message id so we can assert it propagates.
function makeResendStub() {
  const calls: Array<Record<string, unknown>> = [];
  const stub = {
    emails: {
      // deno-lint-ignore no-explicit-any
      async send(params: any) {
        calls.push(params);
        return { data: { id: "resend-msg-123" }, error: null };
      },
    },
  };
  return { stub, calls };
}

const baseParams = {
  from: "Test <no-reply@example.com>",
  to: ["owner@example.com"],
  subject: "Hi",
  html: "<p>hi</p>",
};

Deno.test("sendEmailWithRetry: first call (no prior sent event) actually sends", async () => {
  const inserts: Array<Record<string, unknown>> = [];
  const supabase = makeSupabaseStub({ existingSentRow: null, inserts });
  const { stub: resend, calls } = makeResendStub();

  // deno-lint-ignore no-explicit-any
  const result = await sendEmailWithRetry(supabase as any, resend as any, baseParams, {
    emailType: "provider_welcome",
    idempotencyKey: "welcome-fac-1",
  });

  assertEquals(result.success, true);
  assertEquals(result.deduplicated, undefined, "first send must not be flagged as deduplicated");
  assertEquals(result.emailId, "resend-msg-123");
  assertEquals(calls.length, 1, "Resend.send must be invoked exactly once");
  // A `sent` tracking event must be inserted with the idempotency key as email_id.
  const sentInsert = inserts.find((r) => r.event_type === "sent");
  assertExists(sentInsert, "a 'sent' tracking event must be recorded");
  assertEquals(sentInsert!.email_id, "welcome-fac-1");
});

Deno.test("sendEmailWithRetry: second call with same key short-circuits to deduplicated", async () => {
  const inserts: Array<Record<string, unknown>> = [];
  const firstSentAt = "2026-05-01T07:00:00.000Z";
  const supabase = makeSupabaseStub({
    existingSentRow: { id: "evt-1", created_at: firstSentAt },
    inserts,
  });
  const { stub: resend, calls } = makeResendStub();

  // deno-lint-ignore no-explicit-any
  const result = await sendEmailWithRetry(supabase as any, resend as any, baseParams, {
    emailType: "provider_welcome",
    idempotencyKey: "welcome-fac-1",
  });

  assertEquals(result.success, true);
  assertEquals(result.deduplicated, true, "duplicate must be flagged");
  assertEquals(result.attempts, 0, "no Resend attempts on dedup path");
  assertEquals(result.firstSentAt, firstSentAt, "firstSentAt must echo the original send timestamp");
  assertEquals(result.emailId, "welcome-fac-1", "emailId echoes the idempotency key on dedup");
  assertEquals(calls.length, 0, "Resend.send must NOT be invoked on dedup");
  assert(
    !inserts.some((r) => r.event_type === "sent"),
    "no new 'sent' event should be recorded on dedup",
  );
});

Deno.test("sendEmailWithRetry: missing idempotencyKey skips dedup check", async () => {
  const inserts: Array<Record<string, unknown>> = [];
  // Even if a "sent" row existed, the dedup query should not be issued
  // because no key was provided.
  const supabase = makeSupabaseStub({
    existingSentRow: { id: "evt-x", created_at: "2026-01-01T00:00:00.000Z" },
    inserts,
  });
  const { stub: resend, calls } = makeResendStub();

  // deno-lint-ignore no-explicit-any
  const result = await sendEmailWithRetry(supabase as any, resend as any, baseParams, {
    emailType: "provider_welcome",
    // no idempotencyKey
  });

  assertEquals(result.success, true);
  assertEquals(result.deduplicated, undefined);
  assertEquals(calls.length, 1, "without a key, every call sends fresh");
});
