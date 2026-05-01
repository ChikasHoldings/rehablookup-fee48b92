// Provider onboarding smoke-test suite.
//
// Covers the three onboarding edge functions:
//   - notify-admin-provider-signup
//   - send-provider-welcome-email
//   - send-provider-welcome-offer-email
//
// Asserted invariants (per function):
//   1. Status codes
//      - non-POST            -> 405 with `code: "method_not_allowed"`
//      - invalid JSON        -> 400 with `code: "invalid_json"`
//      - schema failure      -> 400 with `code: "validation_error"`
//      - unhandled exception -> 500 with `code: "internal_error"`
//        (i.e. 4xx is reserved for client mistakes, 5xx for server faults)
//   2. CORS — every response code path includes `corsHeaders`
//      (success, validation error, json error, method-not-allowed, catch-all)
//   3. Idempotency — sendEmailWithRetry is called with a stable
//      `idempotencyKey` derived from facilityId so duplicate POSTs
//      collapse to a single email send.
//
// These are source-contract assertions (à la auto-reload-credits_test.ts),
// not live HTTP calls — running the live functions would attempt to send
// real emails via Resend and hit production Supabase.

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const FUNCTIONS = [
  {
    name: "notify-admin-provider-signup",
    path: "../notify-admin-provider-signup/index.ts",
    schema: "SignupNotificationSchema",
    idempotencyPrefix: "admin-signup-",
    // This function does NOT accept a client-supplied idempotencyKey.
    acceptsClientIdempotencyKey: false,
  },
  {
    name: "send-provider-welcome-email",
    path: "../send-provider-welcome-email/index.ts",
    schema: "WelcomeEmailRequestSchema",
    idempotencyPrefix: "welcome-",
    acceptsClientIdempotencyKey: true,
  },
  {
    name: "send-provider-welcome-offer-email",
    path: "../send-provider-welcome-offer-email/index.ts",
    schema: "WelcomeOfferRequestSchema",
    idempotencyPrefix: "welcome-offer-",
    acceptsClientIdempotencyKey: true,
  },
] as const;

async function loadSource(relative: string): Promise<string> {
  return await Deno.readTextFile(new URL(relative, import.meta.url));
}

// ---------------------------------------------------------------------------
// 1. Status-code contracts
// ---------------------------------------------------------------------------

for (const fn of FUNCTIONS) {
  Deno.test(`[${fn.name}] rejects non-POST with 405 + code:method_not_allowed`, async () => {
    const src = await loadSource(fn.path);

    // The guard must be present and use the canonical shape.
    assertStringIncludes(src, 'req.method !== "POST"');
    assertStringIncludes(src, "status: 405");
    assertStringIncludes(src, '"method_not_allowed"');
    assertStringIncludes(src, 'allowed: ["POST"]');
    assertStringIncludes(src, 'Allow: "POST, OPTIONS"');

    // The 405 response must come BEFORE any try/catch — otherwise an
    // exception thrown earlier would mask the method check.
    const guardIdx = src.indexOf('req.method !== "POST"');
    const tryIdx = src.indexOf("try {");
    assert(
      guardIdx > 0 && guardIdx < tryIdx,
      `405 guard must precede try {} in ${fn.name}`,
    );
  });

  Deno.test(`[${fn.name}] returns 400 + code:invalid_json on malformed body`, async () => {
    const src = await loadSource(fn.path);

    // The catch block around req.json() must respond with `code:"invalid_json"`
    // AND `status: 400` (in either textual order).
    const reA = /req\.json\(\)[\s\S]{0,600}?invalid_json[\s\S]{0,300}?status:\s*400/;
    const reB = /req\.json\(\)[\s\S]{0,600}?status:\s*400[\s\S]{0,300}?invalid_json/;
    assert(
      reA.test(src) || reB.test(src),
      `${fn.name} must catch JSON parse failures and return 400 with code:"invalid_json"`,
    );
  });

  Deno.test(`[${fn.name}] returns 400 + code:validation_error on schema failure`, async () => {
    const src = await loadSource(fn.path);

    assertStringIncludes(src, `${fn.schema}.safeParse`);
    // The validation failure response must be 400 (NOT 500) and tagged
    // with `code:"validation_error"`. Allow either textual order.
    const reA = /safeParse[\s\S]{0,800}?validation_error[\s\S]{0,400}?status:\s*400/;
    const reB = /safeParse[\s\S]{0,800}?status:\s*400[\s\S]{0,400}?validation_error/;
    assert(
      reA.test(src) || reB.test(src),
      `${fn.name} must respond 400 with code:"validation_error" on schema failure`,
    );
    assertStringIncludes(src, "fieldErrors");
  });

  Deno.test(`[${fn.name}] catch-all returns 500 + code:internal_error`, async () => {
    const src = await loadSource(fn.path);

    // The trailing catch block must:
    //   - return status 500
    //   - tag the response with code:"internal_error"
    //   - log via the structured logger (unhandled_exception)
    const tail = src.slice(src.lastIndexOf("} catch"));
    assertStringIncludes(tail, "status: 500");
    assertStringIncludes(tail, "internal_error");
    assertStringIncludes(tail, "unhandled_exception");
  });
}

// ---------------------------------------------------------------------------
// 2. CORS contract — every response path must include corsHeaders
// ---------------------------------------------------------------------------

for (const fn of FUNCTIONS) {
  Deno.test(`[${fn.name}] every Response includes corsHeaders`, async () => {
    const src = await loadSource(fn.path);

    // Find every `new Response(` occurrence and confirm `corsHeaders`
    // appears within the next ~400 chars (i.e. in the same Response init).
    const responses = [...src.matchAll(/new Response\(/g)];
    assert(
      responses.length >= 5,
      `${fn.name} should have >= 5 Response sites (sanity), got ${responses.length}`,
    );

    for (const m of responses) {
      const start = m.index ?? 0;
      const window = src.slice(start, start + 500);
      assert(
        window.includes("corsHeaders"),
        `Response at offset ${start} in ${fn.name} is missing corsHeaders:\n${window.slice(0, 200)}…`,
      );
    }
  });

  Deno.test(`[${fn.name}] OPTIONS preflight returns corsHeaders`, async () => {
    const src = await loadSource(fn.path);
    const re = /req\.method === "OPTIONS"\s*\)\s*\{\s*return new Response\([^)]*\{\s*headers: corsHeaders\s*\}\s*\)/;
    assert(re.test(src), `${fn.name} must short-circuit OPTIONS with corsHeaders`);
  });

  Deno.test(`[${fn.name}] Access-Control-Allow-Headers covers Supabase client headers`, async () => {
    const src = await loadSource(fn.path);
    // Must accept the headers Supabase JS clients send.
    assertStringIncludes(src, "authorization");
    assertStringIncludes(src, "x-client-info");
    assertStringIncludes(src, "apikey");
    assertStringIncludes(src, "content-type");
  });
}

// ---------------------------------------------------------------------------
// 3. Idempotency contract
// ---------------------------------------------------------------------------

for (const fn of FUNCTIONS) {
  Deno.test(`[${fn.name}] sendEmailWithRetry receives a stable idempotencyKey`, async () => {
    const src = await loadSource(fn.path);

    // sendEmailWithRetry is the chokepoint that dedupes by idempotencyKey.
    assertStringIncludes(src, "sendEmailWithRetry");

    // The key must be derived from facilityId so a duplicate POST for the
    // same facility collapses to one send.
    if (fn.acceptsClientIdempotencyKey) {
      // Pattern: idempotencyKey || `<prefix>${facilityId}`
      const re = new RegExp(
        `idempotencyKey:\\s*idempotencyKey\\s*\\|\\|\\s*\`${fn.idempotencyPrefix}\\$\\{facilityId\\}\``,
      );
      assert(
        re.test(src),
        `${fn.name} must build idempotencyKey as idempotencyKey || \`${fn.idempotencyPrefix}\${facilityId}\``,
      );
    } else {
      // Fixed-shape key, no client override.
      const re = new RegExp(
        `idempotencyKey:\\s*\`${fn.idempotencyPrefix}\\$\\{facilityId\\}\``,
      );
      assert(
        re.test(src),
        `${fn.name} must build idempotencyKey as \`${fn.idempotencyPrefix}\${facilityId}\``,
      );
    }
  });

  Deno.test(`[${fn.name}] facilityId is required (UUID) so the idempotency key is well-formed`, async () => {
    const src = await loadSource(fn.path);
    // The Zod schema must enforce facilityId as a UUID — otherwise the
    // idempotency key would silently collapse different facilities.
    // The schema may live inline in the function source, or be imported
    // from the shared contracts module.
    if (src.includes("_shared/contracts/welcome-email-contracts.ts")) {
      const sharedSrc = await Deno.readTextFile(
        new URL("../_shared/contracts/welcome-email-contracts.ts", import.meta.url),
      );
      assertStringIncludes(sharedSrc, "facilityId: z.string().uuid(");
    } else {
      assertStringIncludes(src, "facilityId: z.string().uuid(");
    }
  });

  Deno.test(`[${fn.name}] returns deduplicated flag when send is suppressed`, async () => {
    const src = await loadSource(fn.path);
    // The success response must surface idempotency state so callers
    // (and tests) can prove duplicate sends are coalesced. We require:
    //   - the legacy `email_deduplicated` code (back-compat), and
    //   - either an explicit `status: "deduplicated"` field or the
    //     `deduplicated` boolean on `result`.
    assertStringIncludes(src, "email_deduplicated");
    assert(
      src.includes("result.deduplicated") || src.includes('status === "deduplicated"'),
      `${fn.name} must branch on result.deduplicated`,
    );
    // The notify-admin function returns the legacy envelope; only the
    // welcome-email functions are required to surface the richer
    // idempotency contract (status / idempotencyKey / firstSentAt).
    if (fn.name !== "notify-admin-provider-signup") {
      assertStringIncludes(src, 'const status = result.deduplicated ? "deduplicated" : "sent"');
      assertStringIncludes(src, "idempotencyKey: effectiveIdempotencyKey");
      assertStringIncludes(src, "firstSentAt: result.firstSentAt");
    }
  });
}

// ---------------------------------------------------------------------------
// 4. Cross-cutting: structured logger + shortId echoed on errors
// ---------------------------------------------------------------------------

for (const fn of FUNCTIONS) {
  Deno.test(`[${fn.name}] uses structured logger and echoes shortId in error responses`, async () => {
    const src = await loadSource(fn.path);

    // Logger may be created with an optional inbound x-request-id second arg.
    const loggerRe = new RegExp(
      `createLogger\\("${fn.name.replace(/[-\/]/g, "\\$&")}"(?:\\s*,\\s*[^)]+)?\\)`,
    );
    assert(
      loggerRe.test(src),
      `${fn.name} must call createLogger("${fn.name}"[, reqId])`,
    );
    assertStringIncludes(src, "const { shortId } = log;");

    // Every 4xx/5xx body issued AFTER the logger is created should include
    // shortId. The 405 method-not-allowed response is emitted before the
    // logger exists (by design — guard runs first), so we exclude it.
    const errorBodies = [...src.matchAll(/JSON\.stringify\(\{\s*error:[\s\S]{0,400}?\}\)/g)]
      .filter((m) => !m[0].includes("method_not_allowed"));

    assert(
      errorBodies.length >= 3,
      `${fn.name} expected several post-logger error bodies, got ${errorBodies.length}`,
    );
    for (const m of errorBodies) {
      assert(
        m[0].includes("shortId"),
        `Error body in ${fn.name} missing shortId:\n${m[0].slice(0, 200)}…`,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// 5. Summary smoke — each function's Deno.serve handler is reachable
// ---------------------------------------------------------------------------

Deno.test("all three onboarding functions register a Deno.serve handler", async () => {
  for (const fn of FUNCTIONS) {
    const src = await loadSource(fn.path);
    assertEquals(
      (src.match(/Deno\.serve\(/g) ?? []).length,
      1,
      `${fn.name} should register exactly one Deno.serve handler`,
    );
  }
});
