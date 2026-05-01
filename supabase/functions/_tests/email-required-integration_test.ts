// Integration tests: missing / whitespace-only / non-string seekerEmail (and
// equivalent intakeData.email) inputs MUST be rejected with 400 + code:"email_required"
// across all placement and contact-related edge functions.
//
// Why this exists:
// The shared `sanitizeEmail(...)` helper in supabase/functions/_shared/validation.ts
// throws "Invalid email format" for whitespace-only inputs because it trims first
// and then runs `isValidEmail` (which requires length >= 5). If a function relies
// on that thrown exception for the missing-email branch, whitespace-only inputs
// flip from `email_required` to `invalid_email` (or worse, fall through to a 5xx).
//
// These tests lock in the contract:
//   1. missing field            -> 400 + code:"email_required"
//   2. whitespace-only string   -> 400 + code:"email_required"  (NOT invalid_email)
//   3. non-string (number/null/object/boolean) -> 400 + code:"email_required"
//
// Strategy (mirrors recipient-email-guard_test.ts):
//   - Patch `Deno.serve` to capture the handler instead of starting a server.
//   - Import the function module so the handler registers itself.
//   - Dispatch synthetic Requests directly to the captured handler.
//
// We never reach DB / network because validation runs before any external call.

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// --------------------------------------------------------------------------
// Bootstrapping: stub env + capture handlers
// --------------------------------------------------------------------------

// All placement/contact handlers expect these to exist. Values are synthetic —
// the email validation we are testing runs before any network call.
Deno.env.set("SUPABASE_URL", "https://stub.supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test_service_role_key");
Deno.env.set("SUPABASE_ANON_KEY", "test_anon_key");
Deno.env.set("RESEND_API_KEY", "test_resend_key");

type Handler = (req: Request) => Response | Promise<Response>;

const captured: Record<string, Handler> = {};

function patchServeFor(key: string) {
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = (handler: Handler) => {
    captured[key] = handler;
    return {
      finished: Promise.resolve(),
      shutdown: () => Promise.resolve(),
      ref: () => {},
      unref: () => {},
    };
  };
}

patchServeFor("submit-placement-case");
await import("../submit-placement-case/index.ts");

patchServeFor("save-international-placement-draft");
await import("../save-international-placement-draft/index.ts");

patchServeFor("save-placement-draft");
await import("../save-placement-draft/index.ts");

patchServeFor("submit-marketing-lead");
await import("../submit-marketing-lead/index.ts");

patchServeFor("submit-concierge-intake");
await import("../submit-concierge-intake/index.ts");

assertExists(captured["submit-placement-case"]);
assertExists(captured["save-international-placement-draft"]);
assertExists(captured["save-placement-draft"]);
assertExists(captured["submit-marketing-lead"]);
assertExists(captured["submit-concierge-intake"]);

const FN_URL = "https://stub.functions.local/x";

// --------------------------------------------------------------------------
// Per-function test matrix
// --------------------------------------------------------------------------
//
// Each function exposes the seeker email at a slightly different path on the
// request body. The matrix below describes:
//   - which captured handler to call
//   - how to build a body with a given email value (or omit the field)
//
// We deliberately only assert on the email_required outcome — other field
// requirements (name, phone, etc.) may also be missing, but the email check
// must run FIRST and short-circuit before any DB call.

interface FunctionSpec {
  name: string;
  /** Build a request body where the email field is either set to `value` or
   *  entirely omitted when `omit` is true. */
  buildBody: (opts: { value?: unknown; omit?: boolean }) => Record<string, unknown>;
}

const SPECS: FunctionSpec[] = [
  {
    name: "submit-placement-case",
    buildBody: ({ value, omit }) => {
      const base: Record<string, unknown> = {
        seekerName: "Test Seeker",
        seekerPhone: "+15555550100",
        whoSeekingHelp: "self",
        primaryIssues: ["alcohol"],
        levelOfCare: "residential",
        paymentType: "self_pay",
        preferredStates: ["CA"],
        urgency: "within_week",
        ageRange: "26-35",
        specialConsiderations: [],
        preferredContactMethod: "any",
      };
      if (!omit) base.seekerEmail = value;
      return base;
    },
  },
  {
    name: "save-international-placement-draft",
    buildBody: ({ value, omit }) => {
      const intakeData: Record<string, unknown> = {
        first_name: "Test",
        last_name: "User",
        phone: "+15555550100",
        country: "USA",
      };
      if (!omit) intakeData.email = value;
      return { intakeData };
    },
  },
  {
    name: "save-placement-draft",
    buildBody: ({ value, omit }) => {
      const intakeData: Record<string, unknown> = {
        firstName: "Test",
        lastName: "User",
        phone: "+15555550100",
      };
      if (!omit) intakeData.email = value;
      return { intakeData };
    },
  },
  {
    name: "submit-marketing-lead",
    buildBody: ({ value, omit }) => {
      const base: Record<string, unknown> = {
        firstName: "Test",
        lastName: "User",
        phone: "5555550100",
      };
      if (!omit) base.email = value;
      return base;
    },
  },
  {
    name: "submit-concierge-intake",
    buildBody: ({ value, omit }) => {
      const intakeData: Record<string, unknown> = {
        firstName: "Test",
        lastName: "User",
        phone: "+15555550100",
        hipaaConsent: true,
      };
      if (!omit) intakeData.email = value;
      return {
        sessionId: "00000000-0000-4000-8000-000000000000",
        intakeData,
      };
    },
  },
];

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

async function callFn(name: string, body: unknown): Promise<{ status: number; payload: Record<string, unknown> }> {
  const handler = captured[name];
  const res = await handler(
    new Request(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  // Some handlers return text on edge paths — be defensive.
  const raw = await res.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { _raw: raw };
  }
  return { status: res.status, payload };
}

function assertEmailRequired(
  name: string,
  scenario: string,
  status: number,
  payload: Record<string, unknown>,
) {
  assertEquals(
    status,
    400,
    `[${name}] ${scenario}: expected 400, got ${status} — payload: ${JSON.stringify(payload)}`,
  );
  assertEquals(
    payload.code,
    "email_required",
    `[${name}] ${scenario}: expected code:"email_required", got ${JSON.stringify(payload.code)} — full payload: ${JSON.stringify(payload)}`,
  );
  // The contract is that whitespace/missing/non-string MUST NOT be reported as
  // invalid_email. That code is reserved for syntactically-malformed addresses.
  assert(
    payload.code !== "invalid_email",
    `[${name}] ${scenario}: must not surface as invalid_email (sanitizeEmail throw must not drive control flow)`,
  );
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

for (const spec of SPECS) {
  Deno.test(`[${spec.name}] missing email field -> 400 + code:"email_required"`, async () => {
    const body = spec.buildBody({ omit: true });
    const { status, payload } = await callFn(spec.name, body);
    assertEmailRequired(spec.name, "missing field", status, payload);
  });

  // Whitespace variants — each MUST collapse to email_required, not invalid_email,
  // even though sanitizeEmail would throw "Invalid email format" after trimming.
  for (const ws of ["   ", "\t", "\n", "  \t\n  "]) {
    Deno.test(
      `[${spec.name}] whitespace-only email (${JSON.stringify(ws)}) -> 400 + code:"email_required"`,
      async () => {
        const body = spec.buildBody({ value: ws });
        const { status, payload } = await callFn(spec.name, body);
        assertEmailRequired(spec.name, `whitespace ${JSON.stringify(ws)}`, status, payload);
      },
    );
  }

  // Non-string variants — none of these can be safely .trim()'d, so the handler
  // must reject them with email_required before reaching sanitizeEmail.
  const nonStringValues: { label: string; value: unknown }[] = [
    { label: "null", value: null },
    { label: "number", value: 12345 },
    { label: "boolean", value: true },
    { label: "object", value: { a: 1 } },
    { label: "array", value: ["a@b.com"] },
  ];
  for (const { label, value } of nonStringValues) {
    Deno.test(
      `[${spec.name}] non-string email (${label}) -> 400 + code:"email_required"`,
      async () => {
        const body = spec.buildBody({ value });
        const { status, payload } = await callFn(spec.name, body);
        assertEmailRequired(spec.name, `non-string ${label}`, status, payload);
      },
    );
  }

  // Empty-string explicit (degenerate of whitespace-only).
  Deno.test(`[${spec.name}] empty-string email -> 400 + code:"email_required"`, async () => {
    const body = spec.buildBody({ value: "" });
    const { status, payload } = await callFn(spec.name, body);
    assertEmailRequired(spec.name, "empty string", status, payload);
  });
}
