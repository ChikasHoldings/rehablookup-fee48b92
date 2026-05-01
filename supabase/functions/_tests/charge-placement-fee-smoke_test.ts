// charge-placement-fee smoke test.
//
// Locks in the missing-Authorization-header contract:
//   - status 401
//   - stable error code "MISSING_AUTH_HEADER"
//   - corsHeaders + JSON content-type on the response
//   - the 401 guard runs BEFORE any token usage (no NPE 500)
//
// Source-contract assertion (à la provider-onboarding-smoke_test.ts) —
// no live HTTP, no Stripe, no DB. Running the live function would attempt
// real auth + Stripe charges.

import {
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SOURCE_PATH = "../charge-placement-fee/index.ts";

async function loadSource(): Promise<string> {
  return await Deno.readTextFile(new URL(SOURCE_PATH, import.meta.url));
}

Deno.test("[charge-placement-fee smoke] missing Authorization -> 401 + code:'MISSING_AUTH_HEADER'", async () => {
  const src = await loadSource();

  // Stable machine-readable code present.
  assertStringIncludes(src, '"MISSING_AUTH_HEADER"');

  // Authorization header is read, and on miss returns 401 with the stable code.
  const re =
    /req\.headers\.get\("Authorization"\)[\s\S]{0,800}?MISSING_AUTH_HEADER[\s\S]{0,400}?status:\s*401/;
  assert(
    re.test(src),
    "missing Authorization must return 401 with code:'MISSING_AUTH_HEADER'",
  );
});

Deno.test("[charge-placement-fee smoke] 401 response includes corsHeaders + JSON content-type", async () => {
  const src = await loadSource();
  const guardIdx = src.indexOf("MISSING_AUTH_HEADER");
  assert(guardIdx > 0, "MISSING_AUTH_HEADER guard must exist");
  const window = src.slice(guardIdx, guardIdx + 600);
  assertStringIncludes(window, "corsHeaders");
  assertStringIncludes(window, '"Content-Type": "application/json"');
  assertStringIncludes(window, "status: 401");
});

Deno.test("[charge-placement-fee smoke] 401 guard runs before token usage (no NPE 500)", async () => {
  const src = await loadSource();
  const guardIdx = src.indexOf("MISSING_AUTH_HEADER");
  const replaceIdx = src.indexOf('authHeader.replace("Bearer "');
  const getUserIdx = src.indexOf("auth.getUser(token)");

  assert(guardIdx > 0, "MISSING_AUTH_HEADER guard must exist");
  assert(
    replaceIdx > 0,
    "authHeader.replace must still be present in the auth flow",
  );
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

Deno.test("[charge-placement-fee smoke] legacy 'throw new Error(\"No authorization header\")' is removed", async () => {
  const src = await loadSource();
  // The legacy throw fell through to the catch-all and was returned as 500.
  assert(
    !src.includes('throw new Error("No authorization header")'),
    "legacy throw on missing auth must not return — it produced a 500",
  );
});
