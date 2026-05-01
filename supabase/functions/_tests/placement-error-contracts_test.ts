// Placement edge-function error contract tests.
//
// Locks in the exact status code + machine-readable error code for the
// most common client-error paths in the placement pipeline. Without these,
// regressions tend to silently flip 4xx -> 5xx (because the affected paths
// used to throw and fall through to the catch-all 500), which then breaks
// frontend UX (toast says "Something went wrong" instead of "Email is
// required") and pollutes alerting dashboards.
//
// Source-contract assertions only — no live HTTP, no Stripe, no DB.
//
// Covered:
//
//   submit-placement-case
//     - missing seekerEmail -> 400 + code:"email_required"
//     - invalid seekerEmail -> 400 + code:"invalid_email"
//     - both branches set field:"seekerEmail" so the frontend can target the input
//     - sanitizeEmail call is wrapped in try/catch so it never reaches
//       the catch-all 500
//
//   charge-placement-fee
//     - missing Authorization header -> 401 + code:"MISSING_AUTH_HEADER"
//     - the 401 path runs BEFORE the call to anonClient.auth.getUser /
//       service-role comparison (i.e. we don't leak a 500 by trying to
//       call .replace() on undefined)
//     - the legacy `throw new Error("No authorization header")` is gone

import {
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

async function loadSource(relative: string): Promise<string> {
  return await Deno.readTextFile(new URL(relative, import.meta.url));
}

// ---------------------------------------------------------------------------
// submit-placement-case
// ---------------------------------------------------------------------------

const SUBMIT_PATH = "../submit-placement-case/index.ts";

Deno.test("[submit-placement-case] missing seekerEmail -> 400 + code:'email_required'", async () => {
  const src = await loadSource(SUBMIT_PATH);

  // sanitizeEmail throws "Email is required" when input is missing/non-string.
  // The caller must translate that into a 400 with the stable code, NOT let
  // it bubble to the catch-all 500.
  assertStringIncludes(src, '"Email is required"');
  assertStringIncludes(src, '"email_required"');

  // The translation must live alongside sanitizeEmail and produce a 400.
  const re = /sanitizeEmail\(body\.seekerEmail\)[\s\S]{0,800}?email_required[\s\S]{0,400}?status:\s*400/;
  assert(
    re.test(src),
    "missing email must return 400 with code:'email_required'",
  );
});

Deno.test("[submit-placement-case] invalid seekerEmail -> 400 + code:'invalid_email'", async () => {
  const src = await loadSource(SUBMIT_PATH);

  assertStringIncludes(src, '"Invalid email format"');
  assertStringIncludes(src, '"invalid_email"');

  // The fallback branch (anything that's NOT "Email is required") must map
  // to invalid_email, also at status 400.
  const re = /code\s*=\s*message === "Email is required"\s*\?\s*"email_required"\s*:\s*"invalid_email"/;
  assert(
    re.test(src),
    "invalid email must map to code:'invalid_email' (fallback of the email_required check)",
  );
});

Deno.test("[submit-placement-case] email-validation 400 response targets field:'seekerEmail'", async () => {
  const src = await loadSource(SUBMIT_PATH);
  // The frontend uses `field` to mark the failing input. Without this, the
  // toast can't highlight which field is wrong.
  const re = /email_required[\s\S]{0,400}?field:\s*"seekerEmail"|field:\s*"seekerEmail"[\s\S]{0,400}?email_required/;
  assert(re.test(src), "400 email response must include field:'seekerEmail'");
});

Deno.test("[submit-placement-case] sanitizeEmail is wrapped in try/catch (cannot reach catch-all 500)", async () => {
  const src = await loadSource(SUBMIT_PATH);
  // Without a local try/catch, sanitizeEmail's throw would fall through to
  // the outer 500 handler.
  const re = /try\s*\{\s*seekerEmail\s*=\s*sanitizeEmail\(body\.seekerEmail\)[\s\S]{0,200}?\}\s*catch\s*\(emailErr\)/;
  assert(
    re.test(src),
    "sanitizeEmail call must be wrapped in a local try/catch",
  );
});

// ---------------------------------------------------------------------------
// charge-placement-fee
// ---------------------------------------------------------------------------

const CHARGE_PATH = "../charge-placement-fee/index.ts";

Deno.test("[charge-placement-fee] missing Authorization header -> 401 + code:'MISSING_AUTH_HEADER'", async () => {
  const src = await loadSource(CHARGE_PATH);

  // Stable code must be present.
  assertStringIncludes(src, '"MISSING_AUTH_HEADER"');

  // The guard reads Authorization and, on miss, returns 401 (not 500, not 400).
  const re = /req\.headers\.get\("Authorization"\)[\s\S]{0,600}?MISSING_AUTH_HEADER[\s\S]{0,400}?status:\s*401/;
  assert(
    re.test(src),
    "missing Authorization must return 401 with code:'MISSING_AUTH_HEADER'",
  );
});

Deno.test("[charge-placement-fee] 401 guard runs before token usage (no NPE 500)", async () => {
  const src = await loadSource(CHARGE_PATH);

  // The early-return for missing auth must precede authHeader.replace(...)
  // and any auth.getUser call — otherwise we'd crash on undefined.
  const guardIdx = src.indexOf("MISSING_AUTH_HEADER");
  const replaceIdx = src.indexOf('authHeader.replace("Bearer "');
  const getUserIdx = src.indexOf("auth.getUser(token)");

  assert(guardIdx > 0, "MISSING_AUTH_HEADER guard must exist");
  assert(replaceIdx > 0, "authHeader.replace must still be present in the auth flow");
  assert(
    guardIdx < replaceIdx,
    "401 guard must precede authHeader.replace(...) so we never call .replace on undefined",
  );
  if (getUserIdx > 0) {
    assert(
      guardIdx < getUserIdx,
      "401 guard must precede anonClient.auth.getUser(token)",
    );
  }
});

Deno.test("[charge-placement-fee] legacy 'throw new Error(\"No authorization header\")' is removed", async () => {
  const src = await loadSource(CHARGE_PATH);
  // The old throw fell through to the catch-all and was returned as 500
  // with a free-form message. Guard against re-introduction.
  assert(
    !src.includes('throw new Error("No authorization header")'),
    "legacy throw on missing auth must not return — it produced a 500",
  );
});

Deno.test("[charge-placement-fee] 401 response includes corsHeaders and JSON content-type", async () => {
  const src = await loadSource(CHARGE_PATH);
  // Same shape as the rest of the function's responses so the frontend can
  // parse it uniformly.
  const guardIdx = src.indexOf("MISSING_AUTH_HEADER");
  const window = src.slice(guardIdx, guardIdx + 600);
  assertStringIncludes(window, "corsHeaders");
  assertStringIncludes(window, '"Content-Type": "application/json"');
  assertStringIncludes(window, "status: 401");
});
