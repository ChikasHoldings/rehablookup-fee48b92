// Live-handler tests for welcome email functions covering the
// `invalid_json` (400) and `validation_error` (400) error paths.
//
// Why live tests: the existing `provider-onboarding-smoke_test.ts` does
// source-contract assertions (regex on the file). These tests actually
// invoke `Deno.serve`'s registered handler via a captured fetch handler
// so we lock in the runtime behavior:
//   - exact HTTP status (400)
//   - exact `code` field in JSON body
//   - presence of `shortId` in body
//   - x-request-id response header propagation
//   - CORS `Access-Control-Allow-Origin` header
//
// Both error paths short-circuit BEFORE Resend or Supabase are touched,
// so these tests are safe to run without external side effects.

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Stub env vars BEFORE importing the handlers so the module-level
// `Deno.env.get(...)` calls inside the function bodies (which run inside
// the `Deno.serve` callback) see plausible values. The invalid_json /
// validation_error paths return before any of these are actually used,
// but we set them anyway for safety.
Deno.env.set("RESEND_API_KEY", "test_resend_key");
Deno.env.set("SUPABASE_URL", "https://stub.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test_service_role_key");

// Capture the handler registered by `Deno.serve(...)` so we can call it
// directly without binding a TCP port.
type Handler = (req: Request) => Response | Promise<Response>;
const captured: { welcome?: Handler; offer?: Handler } = {};

function patchServeFor(key: "welcome" | "offer") {
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = (handler: Handler) => {
    captured[key] = handler;
    // Return a no-op AbortController-like shim. The handler under test
    // never inspects the return value.
    return {
      finished: Promise.resolve(),
      shutdown: () => Promise.resolve(),
      ref: () => {},
      unref: () => {},
    };
  };
}

// Load each handler in isolation so a single `Deno.serve` capture
// doesn't collide.
patchServeFor("welcome");
await import("../send-provider-welcome-email/index.ts");

patchServeFor("offer");
await import("../send-provider-welcome-offer-email/index.ts");

assertExists(captured.welcome, "welcome handler must be captured");
assertExists(captured.offer, "offer handler must be captured");

const FN_URL = "https://stub.functions.local/x";

const cases = [
  { key: "welcome" as const, name: "send-provider-welcome-email" },
  { key: "offer" as const, name: "send-provider-welcome-offer-email" },
];

for (const c of cases) {
  Deno.test(`[${c.name}] malformed JSON body -> 400 + code:"invalid_json"`, async () => {
    const handler = captured[c.key]!;
    const res = await handler(
      new Request(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      }),
    );
    const body = await res.json();
    assertEquals(res.status, 400);
    assertEquals(body.code, "invalid_json");
    assertExists(body.shortId, "response must include shortId for log correlation");
    assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
    assertEquals(
      res.headers.get("x-request-id"),
      body.shortId,
      "x-request-id header must echo the body shortId",
    );
  });

  Deno.test(`[${c.name}] schema failure -> 400 + code:"validation_error"`, async () => {
    const handler = captured[c.key]!;
    const res = await handler(
      new Request(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Intentionally invalid: missing several required fields
          // and providing a non-uuid facilityId + a bad email.
          facilityId: "not-a-uuid",
          providerEmail: "not-an-email",
        }),
      }),
    );
    const body = await res.json();
    assertEquals(res.status, 400);
    assertEquals(body.code, "validation_error");
    assertExists(body.shortId);
    assertExists(body.fieldErrors, "response must include zod fieldErrors");
    assert(
      typeof body.fieldErrors === "object" && body.fieldErrors !== null,
      "fieldErrors must be an object",
    );
    // facilityId is malformed -> must be flagged
    assert(
      Array.isArray(body.fieldErrors.facilityId) &&
        body.fieldErrors.facilityId.length > 0,
      "fieldErrors.facilityId must be reported",
    );
    assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
    assertEquals(res.headers.get("x-request-id"), body.shortId);
  });

  Deno.test(`[${c.name}] honors inbound x-request-id header for correlation`, async () => {
    const handler = captured[c.key]!;
    const inbound = "trace-abc12345";
    const res = await handler(
      new Request(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": inbound,
        },
        body: "{still-not-json",
      }),
    );
    const body = await res.json();
    assertEquals(res.status, 400);
    assertEquals(body.code, "invalid_json");
    assertEquals(
      body.shortId,
      inbound,
      "shortId must adopt inbound x-request-id when provided",
    );
    assertEquals(res.headers.get("x-request-id"), inbound);
  });
}
