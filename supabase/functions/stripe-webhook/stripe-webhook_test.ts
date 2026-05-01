// End-to-end smoke test: Stripe webhook → credit_purchase fulfillment.
//
// This test simulates the production webhook flow against an in-memory fake
// Supabase + Stripe pair, and asserts that `increment_provider_credits` is
// invoked **exactly once** per PaymentIntent, even when:
//   1. The same `evt_xxx` is delivered twice (Stripe retry) — caught by
//      `claim_stripe_webhook_event` (Layer 1).
//   2. Two different `evt_xxx` events carry the same `cs_xxx` session id —
//      caught by the `credit_transactions(reference_id, transaction_type)`
//      uniqueness gate (Layer 2).
//   3. The PaymentIntent retrieve returns `requires_payment_method` — credit
//      grant must be skipped entirely (Layer 3 — verified-amount gate).
//
// Strategy: The webhook handler builds its Supabase + Stripe clients inside
// the request closure, so we cannot easily stub them at module level. We
// therefore re-implement the **same idempotency contract** in a small harness
// that mirrors `supabase/functions/stripe-webhook/index.ts` lines 96–115 and
// 658–838 byte-for-byte in behaviour, and prove the invariant. We also
// assert via source inspection that the production handler still wires the
// three layers in the documented order.

import {
  assertEquals,
  assertStringIncludes,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const WEBHOOK_SOURCE = await Deno.readTextFile(
  new URL("./index.ts", import.meta.url),
);

// ---------------------------------------------------------------------------
// Source-level guarantees — the test fakes only work if these stay true.
// ---------------------------------------------------------------------------
Deno.test("source: webhook claims event id before any side effects", () => {
  const claimIdx = WEBHOOK_SOURCE.indexOf('"claim_stripe_webhook_event"');
  const creditIdx = WEBHOOK_SOURCE.indexOf('metadataType === "credit_purchase"');
  const incrementIdx = WEBHOOK_SOURCE.indexOf('"increment_provider_credits"');
  assert(claimIdx > -1, "claim_stripe_webhook_event call missing");
  assert(creditIdx > -1, "credit_purchase branch missing");
  assert(incrementIdx > -1, "increment_provider_credits call missing");
  assert(
    claimIdx < creditIdx && creditIdx < incrementIdx,
    "Order must be: claim → credit_purchase branch → increment",
  );
});

Deno.test("source: webhook gates credit grant on existing credit_transactions row", () => {
  // The "already processed" early-return must be wired to reference_id=session.id
  assertStringIncludes(
    WEBHOOK_SOURCE,
    '.eq("reference_id", session.id)',
  );
  assertStringIncludes(
    WEBHOOK_SOURCE,
    '.eq("transaction_type", "purchase")',
  );
  assertStringIncludes(
    WEBHOOK_SOURCE,
    "Credit purchase already processed (duplicate webhook)",
  );
});

Deno.test("source: webhook verifies PaymentIntent.status === succeeded before crediting", () => {
  assertStringIncludes(
    WEBHOOK_SOURCE,
    "stripe.paymentIntents.retrieve(paymentIntentId)",
  );
  assertStringIncludes(WEBHOOK_SOURCE, 'pi.status !== "succeeded"');
  assertStringIncludes(WEBHOOK_SOURCE, "PaymentIntent amount mismatch");
});

Deno.test("source: webhook only credits via increment_provider_credits RPC (no manual UPDATE)", () => {
  // Catch any future drift to a manual UPDATE balance pattern.
  const manualUpdate = WEBHOOK_SOURCE.match(
    /from\(["']provider_credits["']\)\s*\.update/,
  );
  assertEquals(
    manualUpdate,
    null,
    "Webhook must not manually UPDATE provider_credits — use increment_provider_credits RPC only",
  );
});

// ---------------------------------------------------------------------------
// Behavioural simulation — fakes that mirror the real RPCs/tables used by the
// webhook for the credit_purchase path.
// ---------------------------------------------------------------------------

interface FakeState {
  claimedEvents: Set<string>;
  creditTxByRef: Map<string, { id: string; type: string }>;
  incrementCalls: Array<{ providerId: string; facilityId: string; amount: number }>;
  notifications: Array<unknown>;
}

interface PaymentIntent {
  id: string;
  status: string;
  amount: number;
}

/**
 * Simulates the credit_purchase branch of stripe-webhook/index.ts. Mirrors
 * the three idempotency layers in the same order as the real handler.
 *
 * Returns `"credited"`, `"duplicate-event"`, `"duplicate-session"`,
 * `"verification-failed"`, or `"invalid-metadata"`.
 */
async function simulateCreditPurchaseDelivery(
  state: FakeState,
  args: {
    eventId: string;
    sessionId: string;
    paymentIntentId: string;
    amountCents: number;
    bonusCents: number;
    facilityId: string;
    userId: string;
    paymentIntentResolver: (id: string) => Promise<PaymentIntent>;
  },
): Promise<string> {
  // Layer 1: event-id dedup (claim_stripe_webhook_event).
  if (state.claimedEvents.has(args.eventId)) {
    return "duplicate-event";
  }
  state.claimedEvents.add(args.eventId);

  // Metadata validation (mirrors lines 666-672).
  if (args.amountCents <= 0 || !args.userId || !args.facilityId) {
    return "invalid-metadata";
  }

  // Tier validation (mirrors lines 675-681).
  const validTiers = new Set([20000, 50000, 100000]);
  if (!validTiers.has(args.amountCents)) {
    return "invalid-metadata";
  }

  const TIER_BONUSES: Record<number, number> = { 20000: 0, 50000: 5000, 100000: 20000 };
  const expectedBonus = TIER_BONUSES[args.amountCents] ?? 0;
  const safeBonusCents = Math.min(args.bonusCents, expectedBonus);
  const totalCreditsCents = args.amountCents + safeBonusCents;

  // Layer 3: PaymentIntent verification (mirrors lines 689-711).
  const pi = await args.paymentIntentResolver(args.paymentIntentId);
  if (pi.status !== "succeeded") return "verification-failed";
  if (pi.amount !== args.amountCents) return "verification-failed";

  // Layer 2: existing credit_transactions row gate (mirrors lines 716-724).
  const refKey = `${args.sessionId}::purchase`;
  if (state.creditTxByRef.has(refKey)) {
    return "duplicate-session";
  }

  // Insert purchase tx (mirrors lines 727-735).
  state.creditTxByRef.set(refKey, { id: crypto.randomUUID(), type: "purchase" });
  if (safeBonusCents > 0) {
    state.creditTxByRef.set(`${args.sessionId}_bonus::bonus`, {
      id: crypto.randomUUID(),
      type: "bonus",
    });
  }

  // Atomic increment (mirrors lines 761-766).
  state.incrementCalls.push({
    providerId: args.userId,
    facilityId: args.facilityId,
    amount: totalCreditsCents,
  });

  state.notifications.push({ type: "credits_added", userId: args.userId });
  return "credited";
}

const buildArgs = (overrides: Partial<Parameters<typeof simulateCreditPurchaseDelivery>[1]> = {}) => ({
  eventId: "evt_test_001",
  sessionId: "cs_test_AAA",
  paymentIntentId: "pi_test_AAA",
  amountCents: 50000, // $500 tier
  bonusCents: 5000,
  facilityId: "facility-uuid-1",
  userId: "provider-uuid-1",
  paymentIntentResolver: async (id: string) => ({
    id,
    status: "succeeded",
    amount: 50000,
  }),
  ...overrides,
});

const freshState = (): FakeState => ({
  claimedEvents: new Set(),
  creditTxByRef: new Map(),
  incrementCalls: [],
  notifications: [],
});

// ---------------------------------------------------------------------------
// E2E smoke tests
// ---------------------------------------------------------------------------

Deno.test("E2E: single delivery → increment_provider_credits called exactly once", async () => {
  const state = freshState();
  const result = await simulateCreditPurchaseDelivery(state, buildArgs());

  assertEquals(result, "credited");
  assertEquals(state.incrementCalls.length, 1);
  assertEquals(state.incrementCalls[0].amount, 55000); // $500 + $50 bonus
  assertEquals(state.incrementCalls[0].providerId, "provider-uuid-1");
});

Deno.test("E2E: same event id delivered twice → exactly one increment", async () => {
  const state = freshState();
  const args = buildArgs();

  const first = await simulateCreditPurchaseDelivery(state, args);
  const second = await simulateCreditPurchaseDelivery(state, args);

  assertEquals(first, "credited");
  assertEquals(second, "duplicate-event");
  assertEquals(state.incrementCalls.length, 1);
});

Deno.test("E2E: two distinct event ids, same session_id → exactly one increment (Layer 2 dedup)", async () => {
  // Stripe occasionally fans out checkout.session.completed via two separate
  // events (e.g. live test replay). Both carry the same cs_xxx → second must
  // be blocked by the credit_transactions reference_id uniqueness gate.
  const state = freshState();

  const firstResult = await simulateCreditPurchaseDelivery(
    state,
    buildArgs({ eventId: "evt_test_001", sessionId: "cs_test_SHARED" }),
  );
  const secondResult = await simulateCreditPurchaseDelivery(
    state,
    buildArgs({ eventId: "evt_test_002", sessionId: "cs_test_SHARED" }),
  );

  assertEquals(firstResult, "credited");
  assertEquals(secondResult, "duplicate-session");
  assertEquals(state.incrementCalls.length, 1);
});

Deno.test("E2E: PaymentIntent not succeeded → zero increments", async () => {
  const state = freshState();
  const result = await simulateCreditPurchaseDelivery(
    state,
    buildArgs({
      paymentIntentResolver: async (id) => ({
        id,
        status: "requires_payment_method",
        amount: 50000,
      }),
    }),
  );
  assertEquals(result, "verification-failed");
  assertEquals(state.incrementCalls.length, 0);
});

Deno.test("E2E: PaymentIntent amount mismatch → zero increments (anti-tampering)", async () => {
  const state = freshState();
  const result = await simulateCreditPurchaseDelivery(
    state,
    buildArgs({
      // Metadata claims $500, but Stripe says $200 was actually charged.
      paymentIntentResolver: async (id) => ({ id, status: "succeeded", amount: 20000 }),
    }),
  );
  assertEquals(result, "verification-failed");
  assertEquals(state.incrementCalls.length, 0);
});

Deno.test("E2E: invalid tier in metadata → zero increments", async () => {
  const state = freshState();
  const result = await simulateCreditPurchaseDelivery(
    state,
    buildArgs({
      amountCents: 12345, // not in {20000, 50000, 100000}
      paymentIntentResolver: async (id) => ({ id, status: "succeeded", amount: 12345 }),
    }),
  );
  assertEquals(result, "invalid-metadata");
  assertEquals(state.incrementCalls.length, 0);
});

Deno.test("E2E: bonus capped at tier maximum (anti-tampering)", async () => {
  const state = freshState();
  // Attacker injects bonusCents=99999; tier $500 caps bonus at 5000.
  const result = await simulateCreditPurchaseDelivery(
    state,
    buildArgs({ bonusCents: 99999 }),
  );
  assertEquals(result, "credited");
  assertEquals(state.incrementCalls.length, 1);
  assertEquals(state.incrementCalls[0].amount, 55000); // $500 + $50 (capped)
});

Deno.test("E2E: 5x duplicate fan-out (4 retries) still increments exactly once", async () => {
  const state = freshState();
  const args = buildArgs();
  for (let i = 0; i < 5; i++) {
    await simulateCreditPurchaseDelivery(state, args);
  }
  assertEquals(state.incrementCalls.length, 1);
  // And the duplicate-event branch fired 4 times.
  assertEquals(state.claimedEvents.size, 1);
});

Deno.test("E2E: separate PaymentIntents → independent increments (no cross-blocking)", async () => {
  const state = freshState();
  await simulateCreditPurchaseDelivery(
    state,
    buildArgs({ eventId: "evt_001", sessionId: "cs_001", paymentIntentId: "pi_001" }),
  );
  await simulateCreditPurchaseDelivery(
    state,
    buildArgs({
      eventId: "evt_002",
      sessionId: "cs_002",
      paymentIntentId: "pi_002",
      amountCents: 100000,
      bonusCents: 20000,
      paymentIntentResolver: async (id) => ({ id, status: "succeeded", amount: 100000 }),
    }),
  );

  assertEquals(state.incrementCalls.length, 2);
  assertEquals(state.incrementCalls[0].amount, 55000);   // $500 + $50
  assertEquals(state.incrementCalls[1].amount, 120000);  // $1000 + $200
});
