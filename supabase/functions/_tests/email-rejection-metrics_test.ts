// Tests for the structured email_rejected metric counter.
//
// Verifies:
//   1. Each rejection emits a single, machine-parseable JSON log line
//      with the stable shape `{ metric:"email_rejected", reason, fn,
//      domain, count:1, ... }`.
//   2. PII safety: the local part of the email never appears in the log
//      payload — only the lowercased domain.
//   3. In-process counters bucket correctly by reason and accumulate
//      across calls.

import {
  assert,
  assertEquals,
  assertFalse,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  _resetEmailRejectionCountersForTests,
  getEmailRejectionCounters,
  recordEmailRejection,
} from "../_shared/email-rejection-metrics.ts";

function captureConsoleLog<T>(fn: () => T): { lines: string[]; result: T } {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  };
  try {
    const result = fn();
    return { lines, result };
  } finally {
    console.log = original;
  }
}

Deno.test("email rejection metric: emits stable JSON line per rejection", () => {
  _resetEmailRejectionCountersForTests();

  const { lines } = captureConsoleLog(() =>
    recordEmailRejection({
      fn: "send-provider-welcome-email",
      reason: "format",
      email: "not-an-email",
      shortId: "abc12345",
      facilityId: "fac-1",
      detail: "Email is malformed",
    })
  );

  assertEquals(lines.length, 1, "exactly one log line per rejection");
  const payload = JSON.parse(lines[0]);
  assertEquals(payload.metric, "email_rejected");
  assertEquals(payload.reason, "format");
  assertEquals(payload.fn, "send-provider-welcome-email");
  assertEquals(payload.count, 1);
  assertEquals(payload.runningTotal, 1);
  assertEquals(payload.shortId, "abc12345");
  assertEquals(payload.facilityId, "fac-1");
  assertEquals(payload.detail, "Email is malformed");
});

Deno.test("email rejection metric: only logs domain, never the local part (PII safety)", () => {
  _resetEmailRejectionCountersForTests();

  const { lines } = captureConsoleLog(() =>
    recordEmailRejection({
      fn: "send-provider-welcome-offer-email",
      reason: "disposable",
      email: "Sensitive.User+tag@MAILINATOR.COM",
      detail: "Disposable email domain (mailinator.com) is not allowed",
    })
  );

  const raw = lines[0];
  const payload = JSON.parse(raw);
  assertEquals(payload.domain, "mailinator.com", "domain must be lowercased");
  assertFalse(
    raw.toLowerCase().includes("sensitive.user"),
    "local part must NOT appear in the metric line",
  );
  assertFalse(
    raw.includes("+tag"),
    "address tags must NOT appear in the metric line",
  );
});

Deno.test("email rejection metric: counters bucket by reason and accumulate", () => {
  _resetEmailRejectionCountersForTests();

  captureConsoleLog(() => {
    recordEmailRejection({ fn: "fn-a", reason: "format", email: "x@y.z" });
    recordEmailRejection({ fn: "fn-a", reason: "format", email: "x2@y.z" });
    recordEmailRejection({ fn: "fn-a", reason: "disposable", email: "u@mailinator.com" });
    recordEmailRejection({ fn: "fn-a", reason: "role", email: "admin@example.com" });
    recordEmailRejection({ fn: "fn-a", reason: "role", email: "postmaster@example.com" });
  });

  const c = getEmailRejectionCounters();
  assertEquals(c.format, 2);
  assertEquals(c.disposable, 1);
  assertEquals(c.role, 2);
});

Deno.test("email rejection metric: handles unknown/invalid email shapes gracefully", () => {
  _resetEmailRejectionCountersForTests();
  const { lines } = captureConsoleLog(() => {
    recordEmailRejection({ fn: "fn-x", reason: "format", email: "" });
    recordEmailRejection({ fn: "fn-x", reason: "format", email: "no-at-symbol" });
    recordEmailRejection({ fn: "fn-x", reason: "format", email: "trailing@" });
  });

  for (const line of lines) {
    const payload = JSON.parse(line);
    assertEquals(payload.domain, "unknown");
    assertEquals(payload.metric, "email_rejected");
  }
  assert(getEmailRejectionCounters().format >= 3);
});
