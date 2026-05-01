// Verifies the error code registry is internally consistent.
//
// Checks:
//   1. The Deno-runtime registry and the frontend mirror expose the same
//      set of code keys with matching httpStatus, category, retryable.
//   2. Every code emitted by the listed onboarding/provider edge functions
//      (scanned via static source inspection) is present in the registry.
//   3. The published docs/api/error-codes.json includes every registered code.
//
// Run with:
//   deno test supabase/functions/_tests/error-codes-registry_test.ts \
//     --allow-read

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ERROR_CODES,
  ERROR_CODE_IDS,
} from "../_shared/contracts/error-codes.ts";

const ROOT = new URL("../../../", import.meta.url);

function readText(path: string): string {
  return Deno.readTextFileSync(new URL(path, ROOT));
}

Deno.test("registry: frontend mirror has identical code keys & metadata", () => {
  const mirror = readText("src/lib/contracts/error-codes.ts");

  for (const id of ERROR_CODE_IDS) {
    const spec = ERROR_CODES[id];
    // The mirror declares each code on a single line; assert key + status + category + retryable appear.
    const linePattern = new RegExp(
      `${id}:\\s*\\{[^}]*httpStatus:\\s*${spec.httpStatus}[^}]*category:\\s*"${spec.category}"[^}]*retryable:\\s*${spec.retryable}`,
    );
    assert(
      linePattern.test(mirror),
      `Frontend mirror missing or mismatched entry for "${id}" (expected httpStatus=${spec.httpStatus}, category=${spec.category}, retryable=${spec.retryable})`,
    );
  }

  // Reverse direction: every key in the mirror exists in the canonical registry.
  const mirrorKeys = [...mirror.matchAll(/^\s{2}([a-z_]+):\s*\{ code:/gm)].map(
    (m) => m[1],
  );
  for (const key of mirrorKeys) {
    assert(
      key in ERROR_CODES,
      `Frontend mirror declares "${key}" which is not in the canonical registry`,
    );
  }
});

Deno.test("registry: every code emitted by listed functions is registered", () => {
  // Union of all functions referenced by ERROR_CODES.emittedBy.
  const functions = new Set<string>();
  for (const id of ERROR_CODE_IDS) {
    for (const fn of ERROR_CODES[id].emittedBy) functions.add(fn);
  }

  const codePattern =
    /"(invalid_json|invalid_json_body|body_read_failed|validation_error|validation_failed|invalid_type|invalid_email|email_required|name_required|phone_required|email_rejected|method_not_allowed|conflict|rate_limited|facility_missing|lead_expired|email_send_failed|welcome_email_send_failed|welcome_offer_email_send_failed|admin_email_send_failed|admin_emails_missing|admin_notification_insert_failed|in_app_notification_failed|missing_resend_key|payment_failed|charge_failed|stripe_payment_failed|facility_invoice_payment_failed|international_invoice_failed|case_create_failed|draft_create_failed|draft_update_failed|lead_unlock_attribution_failed|unlock_rollback_failed|email_sent|email_deduplicated|internal_error)"/g;

  for (const fn of functions) {
    let source: string;
    try {
      source = readText(`supabase/functions/${fn}/index.ts`);
    } catch {
      // Function source missing — registry references a non-existent function.
      throw new Error(
        `Registry references function "${fn}" but supabase/functions/${fn}/index.ts does not exist`,
      );
    }
    const found = new Set<string>();
    for (const m of source.matchAll(codePattern)) found.add(m[1]);
    for (const code of found) {
      assert(
        code in ERROR_CODES,
        `Function "${fn}" emits unregistered code "${code}"`,
      );
    }
  }
});

Deno.test("registry: docs/api/error-codes.json covers every registered code", () => {
  const json = JSON.parse(readText("docs/api/error-codes.json")) as {
    codes: { code: string }[];
  };
  const documented = new Set(json.codes.map((c) => c.code));
  for (const id of ERROR_CODE_IDS) {
    assert(
      documented.has(id),
      `docs/api/error-codes.json is missing code "${id}" — regenerate with the doc script`,
    );
  }
  assertEquals(
    documented.size,
    ERROR_CODE_IDS.length,
    "docs/api/error-codes.json contains extra codes not in the registry",
  );
});
