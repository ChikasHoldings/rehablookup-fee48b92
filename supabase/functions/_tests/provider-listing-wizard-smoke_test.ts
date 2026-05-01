// Provider listing wizard smoke-test suite.
//
// Covers the three edge functions that power the provider listing wizard
// flows (creating, planning, and requesting facility info):
//   - purchase-listing-slot           (Pro-gated Stripe checkout for an extra slot)
//   - get-facility-plan               (read-only plan resolver: pro | free)
//   - request-facility-from-marketing (marketing-lead -> real lead bridge)
//
// Each function has its own contract, so assertions are per-function rather
// than shared across a uniform table:
//
//   purchase-listing-slot
//     - 405 on non-POST with corsHeaders
//     - OPTIONS preflight short-circuits with corsHeaders
//     - rejects missing/invalid Authorization with 401 (NOT 500)
//     - requires an active Pro subscription -> 403 when missing
//     - dedupes recent pending checkouts by user_id within a 30-min window
//     - success returns Stripe `url` + `sessionId`
//     - catch-all is 500 and never leaks raw Stripe error fields
//     - every Response includes corsHeaders + Content-Type JSON
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
// purchase-listing-slot
// ---------------------------------------------------------------------------

const PURCHASE_PATH = "../purchase-listing-slot/index.ts";

Deno.test("[purchase-listing-slot] OPTIONS preflight returns corsHeaders", async () => {
  const src = await loadSource(PURCHASE_PATH);
  const re = /req\.method === "OPTIONS"[\s\S]{0,200}?new Response\(\s*null\s*,\s*\{\s*headers:\s*corsHeaders\s*\}\s*\)/;
  assert(re.test(src), "OPTIONS must short-circuit with corsHeaders");
});

Deno.test("[purchase-listing-slot] non-POST returns 405 with corsHeaders", async () => {
  const src = await loadSource(PURCHASE_PATH);
  assertStringIncludes(src, 'req.method !== "POST"');
  // 405 body must be JSON and include corsHeaders.
  const re = /req\.method !== "POST"[\s\S]{0,400}?status:\s*405/;
  assert(re.test(src), "non-POST must return 405");
  // The 405 branch must use corsHeaders (no leaks).
  const guardIdx = src.indexOf('req.method !== "POST"');
  const window = src.slice(guardIdx, guardIdx + 600);
  assertStringIncludes(window, "corsHeaders");
});

Deno.test("[purchase-listing-slot] missing/invalid bearer token returns 401 (not 500)", async () => {
  const src = await loadSource(PURCHASE_PATH);
  // Two distinct 401 sites: missing header AND failed claims validation.
  assertStringIncludes(src, 'authHeader?.startsWith("Bearer ")');
  const missing401 = /Missing authorization header[\s\S]{0,400}?status:\s*401/;
  const invalid401 = /JWT validation[\s\S]{0,400}?status:\s*401/;
  assert(missing401.test(src), "missing Authorization must -> 401");
  assert(invalid401.test(src), "invalid JWT must -> 401");
  // Auth must be enforced via getClaims (server-side verification), not by
  // trusting the JWT payload directly.
  assertStringIncludes(src, "supabaseClient.auth.getClaims(token)");
});

Deno.test("[purchase-listing-slot] requires active Pro subscription -> 403 when missing", async () => {
  const src = await loadSource(PURCHASE_PATH);
  // The Pro check queries pro_subscriptions with status=active.
  assertStringIncludes(src, 'from("pro_subscriptions")');
  assertStringIncludes(src, '.eq("status", "active")');
  // Missing Pro must respond 403 — NOT 401 (that's auth) and NOT 500.
  const re = /No active Pro subscription[\s\S]{0,400}?status:\s*403/;
  assert(re.test(src), "missing Pro subscription must return 403");
  assertStringIncludes(src, "Pro subscription required");
});

Deno.test("[purchase-listing-slot] dedupes recent pending checkouts within 30-min window", async () => {
  const src = await loadSource(PURCHASE_PATH);
  // The function checks for pending purchased_listing_slots in the last
  // 30 minutes — the soft-idempotency guard for double-clicks.
  assertStringIncludes(src, 'from("purchased_listing_slots")');
  assertStringIncludes(src, '.eq("status", "pending")');
  assertStringIncludes(src, "30 * 60 * 1000");
});

Deno.test("[purchase-listing-slot] inserts a pending slot row before returning checkout URL", async () => {
  const src = await loadSource(PURCHASE_PATH);
  // The pending row is what the Stripe webhook later flips to `paid`. Without
  // it, a successful payment cannot be reconciled.
  const insertIdx = src.indexOf('from("purchased_listing_slots").insert');
  const sessionIdx = src.indexOf("stripe.checkout.sessions.create");
  assert(insertIdx > 0, "must insert into purchased_listing_slots");
  assert(
    insertIdx > sessionIdx,
    "pending slot insert must happen AFTER Stripe session creation (so we have session.id)",
  );
  assertStringIncludes(src, 'status: "pending"');
  assertStringIncludes(src, "stripe_checkout_session_id: session.id");
});

Deno.test("[purchase-listing-slot] success response shape is { url, sessionId }", async () => {
  const src = await loadSource(PURCHASE_PATH);
  // The frontend redirects on data.url; sessionId is the reconciliation key.
  const re = /url:\s*session\.url[\s\S]{0,200}?sessionId:\s*session\.id/;
  assert(re.test(src), "success response must contain url + sessionId");
});

Deno.test("[purchase-listing-slot] checkout URLs target the provider listing page", async () => {
  const src = await loadSource(PURCHASE_PATH);
  // The frontend reads ?slot_purchased=true / ?slot_cancelled=true on the
  // provider listing page — these param names are part of the public contract.
  assertStringIncludes(src, "/provider/listing?slot_purchased=true");
  assertStringIncludes(src, "/provider/listing?slot_cancelled=true");
});

Deno.test("[purchase-listing-slot] catch-all is 500 and masks raw Stripe error details", async () => {
  const src = await loadSource(PURCHASE_PATH);
  const tail = src.slice(src.lastIndexOf("} catch"));
  assertStringIncludes(tail, "status: 500");
  // Stripe errors must be surfaced as a generic "Payment processing error",
  // not as raw Stripe internals.
  assertStringIncludes(tail, "Stripe.errors.StripeError");
  assertStringIncludes(tail, "Payment processing error");
});

Deno.test("[purchase-listing-slot] every Response includes corsHeaders", async () => {
  const src = await loadSource(PURCHASE_PATH);
  const responses = [...src.matchAll(/new Response\(/g)];
  assert(responses.length >= 6, `expected >= 6 Response sites, got ${responses.length}`);
  for (const m of responses) {
    const start = m.index ?? 0;
    const window = src.slice(start, start + 500);
    assert(
      window.includes("corsHeaders"),
      `Response at offset ${start} missing corsHeaders:\n${window.slice(0, 200)}…`,
    );
  }
});

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
  assertStringIncludes(src, 'from("pro_subscriptions")');
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
  // the user-facing success contract is "we recorded your request".
  const emailIdx = src.indexOf("sendEmailWithRetry");
  assert(emailIdx > 0, "must call sendEmailWithRetry");
  const window = src.slice(emailIdx - 200, emailIdx + 800);
  assertStringIncludes(window, "try {");
  assertStringIncludes(window, "} catch");
  // The catch logs WARN and continues — it must not rethrow.
  assert(
    /catch\s*\(emailError\)\s*\{[\s\S]{0,300}?WARN/.test(window),
    "email failure must be logged at WARN and swallowed",
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

Deno.test("all three listing-wizard functions register a single Deno.serve handler", async () => {
  for (const path of [PURCHASE_PATH, PLAN_PATH, REQUEST_PATH]) {
    const src = await loadSource(path);
    assertEquals(
      (src.match(/Deno\.serve\(/g) ?? []).length,
      1,
      `${path} should register exactly one Deno.serve handler`,
    );
  }
});
