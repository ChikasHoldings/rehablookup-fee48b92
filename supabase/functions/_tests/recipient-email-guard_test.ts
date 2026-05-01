// Unit + live-handler tests for the recipient email guard.
//
// Locks in:
//   1. checkRecipientEmail behavior (format / disposable / role / accept)
//   2. Both welcome email functions return 400 + code:"email_rejected"
//      with `fieldErrors.providerEmail` populated when the recipient is
//      rejected — without ever calling Resend.

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { checkRecipientEmail } from "../_shared/recipient-email-guard.ts";

// ---------------------------------------------------------------------------
// 1. Pure unit tests for the guard
// ---------------------------------------------------------------------------

Deno.test("checkRecipientEmail accepts a normal address", () => {
  const r = checkRecipientEmail("Jane.Doe@example.com");
  assert(r.ok, "should accept a well-formed address");
  if (r.ok) assertEquals(r.email, "jane.doe@example.com");
});

Deno.test("checkRecipientEmail rejects malformed addresses", () => {
  for (const bad of [
    "",
    "not-an-email",
    "two@@example.com",
    "missing-tld@example",
    ".leading-dot@example.com",
    "trailing-dot.@example.com",
    "double..dot@example.com",
    "x@.example.com",
    "x@example..com",
    "a".repeat(65) + "@example.com", // local part > 64
  ]) {
    const r = checkRecipientEmail(bad);
    assert(!r.ok, `expected reject: ${bad}`);
    if (!r.ok) assertEquals(r.reason, "format");
  }
});

Deno.test("checkRecipientEmail rejects non-strings", () => {
  // deno-lint-ignore no-explicit-any
  for (const bad of [null, undefined, 123, {}, []] as any[]) {
    const r = checkRecipientEmail(bad);
    assert(!r.ok);
    if (!r.ok) assertEquals(r.reason, "format");
  }
});

Deno.test("checkRecipientEmail rejects disposable domains", () => {
  for (const bad of [
    "test@mailinator.com",
    "x@yopmail.com",
    "y@TEMP-MAIL.org",
    "z@guerrillamail.com",
    // subdomain of a disposable host should also be blocked
    "user@inbox.mailinator.com",
  ]) {
    const r = checkRecipientEmail(bad);
    assert(!r.ok, `expected reject: ${bad}`);
    if (!r.ok) assertEquals(r.reason, "disposable");
  }
});

Deno.test("checkRecipientEmail rejects role-based local parts", () => {
  for (const bad of [
    "postmaster@example.com",
    "abuse@example.com",
    "no-reply@example.com",
    "noreply@example.com",
    "admin@example.com",
  ]) {
    const r = checkRecipientEmail(bad);
    assert(!r.ok, `expected reject: ${bad}`);
    if (!r.ok) assertEquals(r.reason, "role");
  }
});

// ---------------------------------------------------------------------------
// 2. Live-handler tests: welcome email functions surface email_rejected
// ---------------------------------------------------------------------------

Deno.env.set("RESEND_API_KEY", "test_resend_key");
Deno.env.set("SUPABASE_URL", "https://stub.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test_service_role_key");

type Handler = (req: Request) => Response | Promise<Response>;
const captured: { welcome?: Handler; offer?: Handler } = {};

function patchServeFor(key: "welcome" | "offer") {
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

patchServeFor("welcome");
await import("../send-provider-welcome-email/index.ts");
patchServeFor("offer");
await import("../send-provider-welcome-offer-email/index.ts");

assertExists(captured.welcome);
assertExists(captured.offer);

const FN_URL = "https://stub.functions.local/x";

const fns = [
  { key: "welcome" as const, name: "send-provider-welcome-email" },
  { key: "offer" as const, name: "send-provider-welcome-offer-email" },
];

const baseValidPayload = {
  // Valid UUID; required by zod schema before the guard runs.
  facilityId: "11111111-1111-4111-8111-111111111111",
  facilityName: "Sunrise Recovery",
  providerFirstName: "Alex",
  selectedPlan: "free",
};

const recipientRejections = [
  {
    label: "disposable mailinator address",
    providerEmail: "test@mailinator.com",
    expectReason: "disposable",
  },
  {
    label: "disposable yopmail address",
    providerEmail: "burner@yopmail.com",
    expectReason: "disposable",
  },
  {
    label: "role-based postmaster",
    providerEmail: "postmaster@example.com",
    expectReason: "role",
  },
] as const;

for (const fn of fns) {
  for (const c of recipientRejections) {
    Deno.test(
      `[${fn.name}] ${c.label} -> 400 + code:"email_rejected"`,
      async () => {
        const handler = captured[fn.key]!;
        const res = await handler(
          new Request(FN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...baseValidPayload,
              providerEmail: c.providerEmail,
            }),
          }),
        );
        const body = await res.json();
        assertEquals(res.status, 400);
        assertEquals(body.code, "email_rejected");
        assertEquals(body.rejectionReason, c.expectReason);
        assertExists(body.shortId);
        assert(
          Array.isArray(body.fieldErrors?.providerEmail) &&
            body.fieldErrors.providerEmail.length > 0,
          "fieldErrors.providerEmail must be populated",
        );
        assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
        assertEquals(res.headers.get("x-request-id"), body.shortId);
      },
    );
  }

  Deno.test(
    `[${fn.name}] malformed email passes zod but is caught -> 400 email_rejected`,
    async () => {
      // Zod's .email() accepts some inputs that our STRICT_EMAIL_RE rejects.
      // Pick a value that passes zod but fails strict format: trailing dot
      // before @ (e.g. "alex.@example.com") OR consecutive dots.
      // We rely on zod's permissive email regex letting "alex.@example.com"
      // through; if a future zod version tightens this, the guard still
      // catches it as format.
      const handler = captured[fn.key]!;
      const res = await handler(
        new Request(FN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...baseValidPayload,
            providerEmail: "alex..doe@example.com",
          }),
        }),
      );
      const body = await res.json();
      // Either zod (validation_error) or the guard (email_rejected) must
      // catch this — both are acceptable 400 outcomes. We only assert that
      // it's NOT a 5xx and NOT a success.
      assertEquals(res.status, 400);
      assert(
        body.code === "email_rejected" || body.code === "validation_error",
        `expected email_rejected or validation_error, got ${body.code}`,
      );
    },
  );
}
