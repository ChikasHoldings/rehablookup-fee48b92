// Resend provider-failure contract tests.
//
// These tests simulate the failure modes Resend can throw at us
// (permanent validation errors, transient 5xx, network exceptions,
// 429 rate-limit) and verify that `sendEmailWithRetry` — the shared
// path used by every email-sending edge function in this project —
// returns a stable, sanitized result shape and never leaks raw
// vendor errors, stack traces, or internal HTML to callers.
//
// We stub Supabase (no DB) and Resend (no network) so the tests run
// hermetically in CI.

import {
  assert,
  assertEquals,
  assertExists,
  assertFalse,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

function makeSupabaseStub() {
  const inserts: Array<Record<string, unknown>> = [];
  // deno-lint-ignore no-explicit-any
  const builder: any = {
    _table: "",
    select() { return builder; },
    eq() { return builder; },
    order() { return builder; },
    limit() { return builder; },
    async maybeSingle() { return { data: null, error: null }; },
    insert(row: Record<string, unknown>) {
      inserts.push({ table: builder._table, ...row });
      return { error: null };
    },
  };
  // deno-lint-ignore no-explicit-any
  const client: any = {
    from(table: string) {
      builder._table = table;
      return builder;
    },
    _inserts: inserts,
  };
  return client;
}

interface FakeResendOpts {
  /** Sequence of outcomes for successive .send() calls. */
  outcomes: Array<
    | { kind: "error"; error: { message: string; name?: string; statusCode?: number } }
    | { kind: "throw"; error: Error }
    | { kind: "success"; id: string }
  >;
}

function makeResendStub(opts: FakeResendOpts) {
  let i = 0;
  const calls: Array<Record<string, unknown>> = [];
  // deno-lint-ignore no-explicit-any
  const stub: any = {
    emails: {
      send: async (params: Record<string, unknown>) => {
        calls.push(params);
        const outcome = opts.outcomes[Math.min(i, opts.outcomes.length - 1)];
        i++;
        if (outcome.kind === "throw") {
          throw outcome.error;
        }
        if (outcome.kind === "error") {
          return { data: null, error: outcome.error };
        }
        return { data: { id: outcome.id }, error: null };
      },
    },
    _calls: calls,
  };
  return stub;
}

const baseParams = {
  from: "RehabLookup <no-reply@rehablookup.com>",
  to: "user@example.com",
  subject: "Test",
  html: "<p>Hello</p>",
};

// Stable, sanitized result fields the caller is allowed to see.
const ALLOWED_RESULT_KEYS = new Set([
  "success",
  "deduplicated",
  "suppressed",
  "emailId",
  "error",
  "attempts",
  "deadLettered",
  "firstSentAt",
]);

function assertResultShapeIsSanitized(result: Record<string, unknown>) {
  for (const key of Object.keys(result)) {
    assert(
      ALLOWED_RESULT_KEYS.has(key),
      `Result leaked unexpected key "${key}". Allowed keys: ${[...ALLOWED_RESULT_KEYS].join(", ")}`,
    );
  }
  // Vendor internals must not appear under any spelling.
  const serialized = JSON.stringify(result).toLowerCase();
  for (const forbidden of ["statuscode", "stack", "<html", "<body", "<!doctype"]) {
    assertFalse(
      serialized.includes(forbidden),
      `Result leaked vendor/internal token "${forbidden}": ${serialized}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

Deno.test("resend failures: permanent validation error returns success=false in 1 attempt, no leak", async () => {
  const supabase = makeSupabaseStub();
  const resend = makeResendStub({
    outcomes: [
      {
        kind: "error",
        error: {
          // Realistic Resend permanent error
          name: "validation_error",
          message: "validation_error: The `to` field must contain a valid email address",
          statusCode: 422,
        },
      },
    ],
  });

  const result = await sendEmailWithRetry(supabase, resend, baseParams, {
    emailType: "test_permanent",
    maxRetries: 3,
  });

  assertEquals(result.success, false);
  assertEquals(result.attempts, 1, "permanent error must short-circuit after first attempt");
  assertFalse(result.deadLettered, "permanent errors are not dead-lettered");
  assertExists(result.error, "must surface a sanitized error string");
  // Only one Resend call (no retries on permanent errors)
  assertEquals(resend._calls.length, 1);
  assertResultShapeIsSanitized(result as unknown as Record<string, unknown>);
});

Deno.test("resend failures: transient 5xx is retried then dead-lettered with stable shape", async () => {
  const supabase = makeSupabaseStub();
  const resend = makeResendStub({
    outcomes: Array.from({ length: 3 }, () => ({
      kind: "error" as const,
      error: {
        name: "internal_server_error",
        message: "internal_server_error: upstream temporarily unavailable",
        statusCode: 503,
      },
    })),
  });

  const result = await sendEmailWithRetry(supabase, resend, baseParams, {
    emailType: "test_transient",
    maxRetries: 3,
  });

  assertEquals(result.success, false);
  assertEquals(result.attempts, 3, "transient errors must consume all retries");
  assertEquals(result.deadLettered, true, "must dead-letter after maxRetries");
  assertExists(result.error);
  assertEquals(resend._calls.length, 3);
  assertResultShapeIsSanitized(result as unknown as Record<string, unknown>);

  // DLQ tracking event must have been recorded
  const dlqEvents = supabase._inserts.filter(
    (r: Record<string, unknown>) => r.event_type === "dlq",
  );
  assertEquals(dlqEvents.length, 1, "exactly one DLQ tracking row");
});

Deno.test("resend failures: network exception is caught, retried, dead-lettered (never thrown)", async () => {
  const supabase = makeSupabaseStub();
  const networkErr = new Error("ECONNRESET: socket hang up");
  // Inject a stack trace to confirm we don't surface it.
  networkErr.stack = "Error: ECONNRESET\n    at TLSSocket.onHangup (node:_tls_wrap:123:45)";
  const resend = makeResendStub({
    outcomes: [
      { kind: "throw", error: networkErr },
      { kind: "throw", error: networkErr },
      { kind: "throw", error: networkErr },
    ],
  });

  // Must NOT throw — must resolve to a sanitized result.
  const result = await sendEmailWithRetry(supabase, resend, baseParams, {
    emailType: "test_network",
    maxRetries: 3,
  });

  assertEquals(result.success, false);
  assertEquals(result.attempts, 3);
  assertEquals(result.deadLettered, true);
  assertResultShapeIsSanitized(result as unknown as Record<string, unknown>);
  // Stack must not be leaked into the public error string
  assertFalse(
    (result.error ?? "").toLowerCase().includes("at tlssocket"),
    "stack trace must not leak into result.error",
  );
});

Deno.test("resend failures: 429 rate-limit is treated as transient and retried", async () => {
  const supabase = makeSupabaseStub();
  const resend = makeResendStub({
    outcomes: [
      {
        kind: "error",
        error: {
          name: "rate_limit_exceeded",
          message: "rate_limit_exceeded: too many requests, retry after 1s",
          statusCode: 429,
        },
      },
      // Eventually succeeds on the 2nd attempt
      { kind: "success", id: "resend_msg_abc123" },
    ],
  });

  const result = await sendEmailWithRetry(supabase, resend, baseParams, {
    emailType: "test_rate_limit",
    maxRetries: 3,
  });

  assertEquals(result.success, true);
  assertEquals(result.attempts, 2, "should succeed on the second attempt after 429");
  assertFalse(result.deadLettered);
  assertEquals(result.emailId, "resend_msg_abc123");
  assertResultShapeIsSanitized(result as unknown as Record<string, unknown>);
});

Deno.test("resend failures: result shape contains only allow-listed fields across all paths", async () => {
  const supabase = makeSupabaseStub();
  // Mix: permanent error path
  const resendPermanent = makeResendStub({
    outcomes: [{
      kind: "error",
      error: { message: "validation_error: invalid email format", statusCode: 422 },
    }],
  });
  const r1 = await sendEmailWithRetry(supabase, resendPermanent, baseParams, {
    emailType: "shape_check",
    maxRetries: 2,
  });
  assertResultShapeIsSanitized(r1 as unknown as Record<string, unknown>);

  // DLQ path
  const resendDlq = makeResendStub({
    outcomes: [
      { kind: "error", error: { message: "internal_server_error", statusCode: 500 } },
      { kind: "error", error: { message: "internal_server_error", statusCode: 500 } },
    ],
  });
  const r2 = await sendEmailWithRetry(supabase, resendDlq, baseParams, {
    emailType: "shape_check",
    maxRetries: 2,
  });
  assertResultShapeIsSanitized(r2 as unknown as Record<string, unknown>);

  // Success path
  const resendOk = makeResendStub({
    outcomes: [{ kind: "success", id: "ok_1" }],
  });
  const r3 = await sendEmailWithRetry(supabase, resendOk, baseParams, {
    emailType: "shape_check",
  });
  assertResultShapeIsSanitized(r3 as unknown as Record<string, unknown>);
  assertEquals(r3.success, true);
});
