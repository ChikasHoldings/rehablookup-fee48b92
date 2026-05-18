// Provider listing wizard smoke-test suite.
//
// Covers the two edge functions that power the provider listing wizard
// flows (planning, and requesting facility info):
//   - get-facility-plan               (read-only plan resolver: pro | free)
//   - request-facility-from-marketing (marketing-lead -> real lead bridge)
//
// (purchase-listing-slot was retired with the pay-per-extra-slot model — Pro
// now includes unlimited facilities. Its smoke tests were removed alongside
// the deprecation stub.)
//
// Each function has its own contract, so assertions are per-function rather
// than shared across a uniform table:
//
//   get-facility-plan
//     - OPTIONS preflight short-circuits with corsHeaders
//     - missing facilityId -> safe default { plan: "free" } (200, never 4xx)
//     - missing Stripe key -> safe default { plan: "free" }
//     - DB-side pro_subscriptions hit -> { plan: "pro" }
//     - unhandled errors are swallowed to { plan: "free" } 200 (never 500)
//       (this is the documented fail-open behavior; the wizard must keep
//        rendering even if billing infra is degraded)
//     - PRO_PRODUCT_IDS includes legacy product IDs to avoid plan flapping
//
//   request-facility-from-marketing
//     - OPTIONS preflight short-circuits with corsHeaders
//     - missing marketingLeadId/facilityId -> 400
//     - unknown marketingLeadId -> 404
//     - unknown facilityId       -> 404
//     - already-requested guard -> 400 (idempotency surface)
//     - facilities_requested array is appended atomically (not overwritten)
//     - facility-side email failure does NOT fail the request (best-effort)
//     - lead row is inserted with source: "marketing_landing" + status: "new"
//
// Source-contract assertions (à la provider-onboarding-smoke_test.ts) — no
// live HTTP, no Stripe, no Resend, no DB writes.

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

async function loadSource(relative: string): Promise<string> {
  return await Deno.readTextFile(new URL(relative, import.meta.url));
}

// ---------------------------------------------------------------------------
// purchase-listing-slot (RETIRED — tests removed alongside the deprecation
// stub). The pay-per-extra-slot purchase flow no longer exists; Pro now
// grants unlimited facilities directly.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// get-facility-plan
// ---------------------------------------------------------------------------

const PLAN_PATH = "../get-facility-plan/index.ts";

Deno.test("[get-facility-plan] OPTIONS preflight returns corsHeaders", async () => {
  const src = await loadSource(PLAN_PATH);
  const re = /req\.method === "OPTIONS"[\s\S]{0,200}?new Response\(\s*null\s*,\s*\{\s*headers:\s*corsHeaders\s*\}\s*\)/;
  assert(re.test(src), "OPTIONS must short-circuit with corsHeaders");
});

Deno.test("[get-facility-plan] missing facilityId -> safe default { plan: \"free\" }", async () => {
  const src = await loadSource(PLAN_PATH);
  // Critical: this endpoint MUST fail open. The wizard reads the plan to
  // decide whether to render Pro features; throwing here would brick the UI.
  const re = /if\s*\(!facilityId\)[\s\S]{0,400}?plan:\s*"free"[\s\S]{0,200}?status:\s*200/;
  assert(re.test(src), "missing facilityId must return { plan: 'free' } 200");
});

Deno.test("[get-facility-plan] missing Stripe key -> safe default { plan: \"free\" }", async () => {
  const src = await loadSource(PLAN_PATH);
  const re = /STRIPE_SECRET_KEY[\s\S]{0,300}?if\s*\(!stripeKey\)[\s\S]{0,400}?plan:\s*"free"/;
  assert(re.test(src), "missing Stripe key must fail open to free");
});

Deno.test("[get-facility-plan] active pro_subscriptions row -> { plan: \"pro\" }", async () => {
  const src = await loadSource(PLAN_PATH);
  // DB lookup is the fast path (avoids a Stripe round-trip).
  assertStringIncludes(src, 'from("facility_subscriptions")');
  assertStringIncludes(src, '.eq("facility_id", facilityId)');
  assertStringIncludes(src, '.eq("status", "active")');
  // Must enforce that the period hasn't expired.
  assertStringIncludes(src, '.gt("current_period_end"');
  const re = /if\s*\(proSub\)[\s\S]{0,300}?plan:\s*"pro"/;
  assert(re.test(src), "active proSub must short-circuit to plan: 'pro'");
});

Deno.test("[get-facility-plan] catch-all fails open to { plan: \"free\" } with status 200", async () => {
  const src = await loadSource(PLAN_PATH);
  // The wizard relies on this contract — even a Stripe outage must NOT
  // produce a 5xx that would break listing rendering.
  const tail = src.slice(src.lastIndexOf("} catch"));
  assertStringIncludes(tail, 'plan: "free"');
  assertStringIncludes(tail, "status: 200");
  // 5xx must NOT appear in the catch-all.
  assert(!/status:\s*5\d\d/.test(tail), "catch-all must never return 5xx");
});

Deno.test("[get-facility-plan] PRO_PRODUCT_IDS retains legacy product mappings", async () => {
  const src = await loadSource(PLAN_PATH);
  // Removing legacy IDs would silently downgrade existing Pro customers
  // back to free until they re-checkout. Guard against accidental cleanup.
  assertStringIncludes(src, "prod_pro_monthly");
  assertStringIncludes(src, "prod_TbalLOPujTIoUe");
  assertStringIncludes(src, "prod_Tbyz1bf6iYyzYd");
});

Deno.test("[get-facility-plan] every Response includes corsHeaders", async () => {
  const src = await loadSource(PLAN_PATH);
  const responses = [...src.matchAll(/new Response\(/g)];
  assert(responses.length >= 5, `expected >= 5 Response sites, got ${responses.length}`);
  for (const m of responses) {
    const start = m.index ?? 0;
    const window = src.slice(start, start + 500);
    assert(
      window.includes("corsHeaders"),
      `Response at offset ${start} missing corsHeaders`,
    );
  }
});

// ---------------------------------------------------------------------------
// request-facility-from-marketing
// ---------------------------------------------------------------------------

const REQUEST_PATH = "../request-facility-from-marketing/index.ts";

Deno.test("[request-facility-from-marketing] OPTIONS preflight returns corsHeaders", async () => {
  const src = await loadSource(REQUEST_PATH);
  const re = /req\.method === "OPTIONS"[\s\S]{0,200}?headers:\s*corsHeaders/;
  assert(re.test(src), "OPTIONS must short-circuit with corsHeaders");
});

Deno.test("[request-facility-from-marketing] missing required fields -> 400", async () => {
  const src = await loadSource(REQUEST_PATH);
  assertStringIncludes(src, "body.marketingLeadId");
  assertStringIncludes(src, "body.facilityId");
  const re = /!body\.marketingLeadId\s*\|\|\s*!body\.facilityId[\s\S]{0,400}?status:\s*400/;
  assert(re.test(src), "missing fields must return 400 (not 500)");
});

Deno.test("[request-facility-from-marketing] unknown marketingLeadId -> 404", async () => {
  const src = await loadSource(REQUEST_PATH);
  const re = /Marketing lead not found[\s\S]{0,400}?status:\s*404/;
  assert(re.test(src), "unknown lead must return 404");
});

Deno.test("[request-facility-from-marketing] unknown facilityId -> 404", async () => {
  const src = await loadSource(REQUEST_PATH);
  const re = /Facility not found[\s\S]{0,400}?status:\s*404/;
  assert(re.test(src), "unknown facility must return 404");
});

Deno.test("[request-facility-from-marketing] already-requested facility -> 400 idempotency guard", async () => {
  const src = await loadSource(REQUEST_PATH);
  // The dedupe key is the facilities_requested array on the marketing lead.
  // Without this, the wizard's "Request more info" button would create
  // duplicate leads on every click.
  assertStringIncludes(src, "facilities_requested");
  const re = /alreadyRequested[\s\S]{0,400}?status:\s*400/;
  assert(re.test(src), "already-requested must return 400");
  assertStringIncludes(src, "already requested info");
});

Deno.test("[request-facility-from-marketing] facilities_requested is appended, not overwritten", async () => {
  const src = await loadSource(REQUEST_PATH);
  // Overwriting would lose history of prior requests, defeating the guard.
  const re = /facilities_requested:\s*updatedRequested/;
  assert(re.test(src), "must persist updated array");
  // updatedRequested is built by spreading the existing array first.
  assertStringIncludes(src, "...(marketingLead.facilities_requested || []), body.facilityId");
});

Deno.test("[request-facility-from-marketing] inserts a real lead with source=marketing_landing", async () => {
  const src = await loadSource(REQUEST_PATH);
  // The wizard's contract is: a marketing lead becomes a real lead row.
  // Source/status must match the values the rest of the lead pipeline keys on.
  assertStringIncludes(src, 'from("leads")');
  assertStringIncludes(src, 'source: "marketing_landing"');
  assertStringIncludes(src, 'status: "new"');
  // facility_id wiring: the lead must point at the requested facility, NOT
  // at the marketing lead's id.
  assertStringIncludes(src, "facility_id: body.facilityId");
});

Deno.test("[request-facility-from-marketing] facility email send failure is best-effort (does not fail request)", async () => {
  const src = await loadSource(REQUEST_PATH);
  // Email failure must NOT throw — the lead has already been written and
  // the user-facing success contract is "we recorded your request". The
  // sendEmailWithRetry call must therefore be wrapped in try/catch and the
  // catch must log at WARN (not rethrow).
  assertStringIncludes(src, "sendEmailWithRetry");
  const re = /try\s*\{[\s\S]{0,400}?sendEmailWithRetry\([\s\S]{0,600}?\}\s*catch\s*\(emailError\)\s*\{[\s\S]{0,300}?WARN[\s\S]{0,200}?\}/;
  assert(
    re.test(src),
    "sendEmailWithRetry must be wrapped in try/catch with a WARN-level swallowing handler",
  );
});

Deno.test("[request-facility-from-marketing] reply_email is preferred over email for facility notifications", async () => {
  const src = await loadSource(REQUEST_PATH);
  // Providers configure reply_email separately from their account email.
  // Sending to the wrong address breaks the wizard -> provider handoff.
  assertStringIncludes(src, "facility.reply_email || facility.email");
});

Deno.test("[request-facility-from-marketing] every Response includes corsHeaders", async () => {
  const src = await loadSource(REQUEST_PATH);
  const responses = [...src.matchAll(/new Response\(/g)];
  assert(responses.length >= 5, `expected >= 5 Response sites, got ${responses.length}`);
  for (const m of responses) {
    const start = m.index ?? 0;
    const window = src.slice(start, start + 500);
    assert(
      window.includes("corsHeaders"),
      `Response at offset ${start} missing corsHeaders`,
    );
  }
});

// ---------------------------------------------------------------------------
// Cross-cutting: each function registers exactly one Deno.serve handler
// ---------------------------------------------------------------------------

Deno.test("each listing-wizard function registers a single Deno.serve handler", async () => {
  for (const path of [PLAN_PATH, REQUEST_PATH]) {
    const src = await loadSource(path);
    assertEquals(
      (src.match(/Deno\.serve\(/g) ?? []).length,
      1,
      `${path} should register exactly one Deno.serve handler`,
    );
  }
});
