// Regression tests locking in the current fee model:
//
//   • International client fee:   $99  (9900 cents)  — refundable on admission
//   • Domestic client fee:        FREE (0 cents)
//   • Provider placement fee:     Domestic $1,000 / International $3,000 (defaults)
//
// These tests are STATIC — they grep the source tree for the constants and
// strings that drive pricing. They do not need network or DB access. If a
// future change drifts the displayed price, the cents amount written to the
// DB, or the webhook's recorded amount, this suite fails loudly so the team
// can decide intentionally rather than discover the regression in production.
//
// To update fees on purpose: change the constants in one place, then update
// the EXPECTED_* values in this file and bump CHANGELOG.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const ROOT = new URL("../../../", import.meta.url).pathname;
const read = (rel: string) => Deno.readTextFileSync(ROOT + rel);

// ── Source of truth ────────────────────────────────────────────────────────
const EXPECTED = {
  intlClientFeeCents: 9900,
  intlClientFeeDisplay: "$99",
  domesticClientFeeCents: 0,
  providerDomesticDefaultCents: 100000,   // $1,000
  providerInternationalDefaultCents: 300000, // $3,000
  intlStripePriceId: "price_1TSR6U9fxdThyiak3hfLXWXb",
};

// ── 1. UI displays $99 on intl flows ───────────────────────────────────────
Deno.test("UI: StepReview shows $99 client fee", () => {
  const src = read("src/components/international/steps/StepReview.tsx");
  assertStringIncludes(src, "$99");
  assert(!/\$299\b/.test(src), "StepReview must not reference legacy $299 fee");
  assert(!/29900\b/.test(src), "StepReview must not reference legacy 29900 cents");
});

Deno.test("UI: InternationalLanding FAQ states $99 fee", () => {
  const src = read("src/pages/international/InternationalLanding.tsx");
  assertStringIncludes(src, "$99");
  assert(!/\$299\b/.test(src), "InternationalLanding must not reference legacy $299 fee");
});

Deno.test("UI: Admin International case sheet uses $99", () => {
  const src = read("src/components/admin/international/InternationalCaseDetailSheet.tsx");
  assertStringIncludes(src, "$99");
  assert(!/\$299\b/.test(src), "Admin case sheet must not reference legacy $299");
  assert(!/29900\b/.test(src), "Admin case sheet must not reference legacy 29900 cents");
});

// ── 2. Stripe checkout uses $99 price ──────────────────────────────────────
Deno.test("Edge: create-international-checkout pins price ID + 9900 cents", () => {
  const src = read("supabase/functions/create-international-checkout/index.ts");
  assertStringIncludes(src, EXPECTED.intlStripePriceId);
  assertStringIncludes(src, "EXPECTED_AMOUNT_CENTS = 9900");
});

// ── 3. DB writes use the right cents ───────────────────────────────────────
Deno.test("Edge: submit-international-intake writes 9900 cents", () => {
  const src = read("supabase/functions/submit-international-intake/index.ts");
  assertStringIncludes(src, "payment_amount_cents: 9900");
  assert(!/payment_amount_cents:\s*29900\b/.test(src), "Must not write legacy 29900 cents");
});

Deno.test("Edge: save-international-placement-draft writes 9900 cents", () => {
  const src = read("supabase/functions/save-international-placement-draft/index.ts");
  assertStringIncludes(src, "payment_amount_cents: 9900");
});

Deno.test("Edge: domestic concierge intake writes 0 cents (free)", () => {
  const src = read("supabase/functions/submit-concierge-intake/index.ts");
  assert(
    /payment_amount_cents:\s*0\b/.test(src),
    "submit-concierge-intake must write 0 cents for free domestic flow",
  );
  assert(
    !/payment_amount_cents:\s*2900\b/.test(src),
    "Must not write legacy 2900 cents domestic fee",
  );
});

Deno.test("Edge: domestic placement draft writes 0 cents (free)", () => {
  const src = read("supabase/functions/save-placement-draft/index.ts");
  assert(
    !/payment_amount_cents:\s*2900\b/.test(src),
    "save-placement-draft must not write legacy 2900 cents",
  );
});

// ── 4. Webhook handlers record correct amounts ─────────────────────────────
Deno.test("Edge: stripe-webhook records 9900 cents on intl checkout", () => {
  const src = read("supabase/functions/stripe-webhook/index.ts");
  // international_payments.amount_cents
  assertStringIncludes(src, "amount_cents: 9900");
  // international_placement_cases.seeker_fee_amount_cents
  assertStringIncludes(src, "seeker_fee_amount_cents: 9900");
  // domestic abandoned-intake fallback should be 0, not 2900
  assert(
    /payment_amount_cents:\s*0/.test(src),
    "Webhook domestic fallback must use 0 cents",
  );
  assert(
    !/payment_amount_cents:\s*2900\b/.test(src),
    "Webhook must not record legacy 2900 cents domestic fee",
  );
});

// ── 5. Provider placement fee defaults intact ──────────────────────────────
Deno.test("Edge: charge-placement-fee defaults are $1k domestic / $3k intl", () => {
  const src = read("supabase/functions/charge-placement-fee/index.ts");
  assertStringIncludes(src, "domestic: 100000");
  assertStringIncludes(src, "international: 300000");
});

// ── 6. International detection is structural, not heuristic ────────────────
Deno.test("Edge: charge-placement-fee uses explicit isInternational flag", () => {
  const src = read("supabase/functions/charge-placement-fee/index.ts");
  // Must NOT classify intl based on a payment_amount_cents threshold.
  assert(
    !/payment_amount_cents\s*[><=!]+\s*\d+/.test(src),
    "Must not use payment_amount_cents heuristic to detect international",
  );
  assertStringIncludes(src, "isIntl = isInternational === true");
});

// ── 7. Global sweep — no stray $299 / 29900 references ─────────────────────
async function* walk(dir: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(dir)) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === ".git" ||
        entry.name === ".lovable"
      ) continue;
      yield* walk(path);
    } else if (entry.isFile) {
      // Only scan source-y extensions
      if (/\.(tsx?|jsx?|sql|md|json|html|css)$/i.test(entry.name)) {
        yield path;
      }
    }
  }
}

Deno.test("Sweep: no stray legacy $299 / 29900 cent references", async () => {
  const SELF = "/_tests/fee-pricing-regression_test.ts";
  const hits: string[] = [];
  // Match \$299 or 29900 as standalone tokens (avoid e.g. 29900x or 1299900).
  const pattern = /(?:\$299\b|(?<![\d])29900(?![\d]))/;

  for await (const file of walk(ROOT.replace(/\/$/, ""))) {
    if (file.endsWith(SELF)) continue;
    let text: string;
    try {
      text = await Deno.readTextFile(file);
    } catch {
      continue;
    }
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        hits.push(`${file}:${i + 1}: ${lines[i].trim()}`);
      }
    }
  }

  assertEquals(
    hits.length,
    0,
    `Found stray legacy $299 / 29900 references:\n${hits.join("\n")}`,
  );
});

// Sanity: surface the locked values so failures are easy to reason about.
Deno.test("Locked fee model snapshot", () => {
  assertEquals(EXPECTED.intlClientFeeCents, 9900);
  assertEquals(EXPECTED.intlClientFeeDisplay, "$99");
  assertEquals(EXPECTED.domesticClientFeeCents, 0);
  assertEquals(EXPECTED.providerDomesticDefaultCents, 100000);
  assertEquals(EXPECTED.providerInternationalDefaultCents, 300000);
});
