/**
 * R3 — Claiming a facility must stay $0, forever.
 *
 * Stage 1 audit, Finding 3: nothing in the suite asserted that the claim
 * workflow is free. The product contract is absolute — no card, no Stripe
 * checkout, no payment gate, no subscription gate, no Pro requirement, no
 * Featured requirement — so it deserves an executable guard rather than trust.
 *
 * Three layers, none of which are "the page says Free":
 *
 *   A. BEHAVIOURAL (edge function). The real `submit-facility-claim` handler
 *      runs against a database with NO subscription rows, NO Stripe customer
 *      and NO Stripe environment variables at all. It must still succeed. The
 *      Stripe test double is left unregistered, so any attempt to construct a
 *      Stripe client throws and fails the test.
 *
 *   B. BEHAVIOURAL (UI). The onboarding plan picker's Free path is clicked for
 *      real; it must complete onboarding without invoking any checkout
 *      function.
 *
 *   C. STRUCTURAL. The claim edge functions must not import or reference
 *      Stripe/billing at all — an architectural invariant that a behavioural
 *      test cannot express, checked over the real module sources.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEdgeFunction, setEdgeEnv, edgeRequest } from "./edge/loadEdgeFunction";
import { createFakeSupabase, type FakeSupabase } from "./edge/fakeSupabase";
import { __setCreateClient } from "./edge/stubs/supabase-js";
import { __setStripe, __getStripeConstructorArgs } from "./edge/stubs/stripe";

const FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const CLAIMANT_ID = "99999999-9999-4999-8999-999999999999";
const CLAIMANT_EMAIL = "director@cedar.example";

// ───────────────────────────── Layer A ─────────────────────────────

function makeClaimDb(): FakeSupabase {
  return createFakeSupabase({
    tables: {
      facilities: [
        {
          id: FACILITY_ID,
          name: "Cedar Ridge Recovery",
          user_id: null,
          claimed_at: null,
          status: "approved",
        },
      ],
      facility_claim_requests: [],
      admin_notifications: [],
      // Deliberately EMPTY: the claimant has no subscription, no Pro, no
      // Featured, and no Stripe customer. Claiming must not care.
      facility_subscriptions: [],
      provider_payment_methods: [],
    },
    authUser: { id: CLAIMANT_ID, email: CLAIMANT_EMAIL },
  });
}

async function submitClaim(db: FakeSupabase, body: Record<string, unknown> = {}) {
  __setCreateClient(() => db);
  const handler = await loadEdgeFunction("submit-facility-claim");
  const res = await handler(
    edgeRequest(
      {
        facilityId: FACILITY_ID,
        claimantName: "Dana Cole",
        claimantEmail: CLAIMANT_EMAIL,
        claimantRole: "Executive Director",
        claimantPhone: "5125550123",
        verificationMethod: "email_domain",
        ...body,
      },
      { headers: { Authorization: "Bearer test-token" } },
    ),
  );
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  return { status: res.status, json };
}

describe("R3a — submit-facility-claim succeeds with zero billing state", () => {
  beforeEach(() => {
    // NOTE: no STRIPE_SECRET_KEY, no STRIPE_PRICE_* — if the claim path needed
    // Stripe at all, it would fail here.
    setEdgeEnv({
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "srk",
    });
    // Unregistered on purpose: constructing Stripe now throws.
    __setStripe(null);
  });

  afterEach(() => {
    __setCreateClient(null);
  });

  it("accepts a claim from a user with no subscription and no payment method", async () => {
    const db = makeClaimDb();
    const { status } = await submitClaim(db);

    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(300);
    expect(db.tables.facility_claim_requests).toHaveLength(1);
  });

  it("persists the claim with the claimant's identity and a non-paid status", async () => {
    const db = makeClaimDb();
    await submitClaim(db);

    const claim = db.tables.facility_claim_requests[0];
    expect(claim.facility_id).toBe(FACILITY_ID);
    expect(claim.claimant_user_id).toBe(CLAIMANT_ID);
    // No payment/entitlement columns are involved in creating a claim.
    expect(claim).not.toHaveProperty("stripe_customer_id");
    expect(claim).not.toHaveProperty("payment_status");
    expect(claim).not.toHaveProperty("checkout_session_id");
  });

  it("never constructs a Stripe client during a claim", async () => {
    const db = makeClaimDb();
    await submitClaim(db);
    // The stub records every construction attempt; there must be none.
    expect(__getStripeConstructorArgs()).toBeNull();
  });

  it("requires no Stripe environment variables", async () => {
    // Same as above but asserted from the environment side: the handler read
    // only Supabase config. If a payment gate were added it would need a key,
    // and the missing-env guard would return SERVER_MISCONFIGURED.
    const db = makeClaimDb();
    const { status, json } = await submitClaim(db);
    expect(json.code).not.toBe("SERVER_MISCONFIGURED");
    expect(status).not.toBe(500);
  });

  it("does not read the facility's subscription/entitlement state", async () => {
    const db = makeClaimDb();
    await submitClaim(db);

    // If a Pro/Featured gate were introduced it would have to query one of
    // these. None may be touched by the claim path.
    const billingTablesTouched = db.mutations.filter((m) =>
      ["facility_subscriptions", "provider_payment_methods", "subscription_events"].includes(
        m.table,
      ),
    );
    expect(billingTablesTouched).toHaveLength(0);
  });

  it("rejects a claim for reasons of eligibility only — never payment", async () => {
    // An already-owned facility is refused with an ownership code, proving the
    // refusal taxonomy has no payment dimension.
    const db = makeClaimDb();
    db.tables.facilities[0].user_id = "another-provider";
    const { status, json } = await submitClaim(db);

    expect(status).toBe(409);
    expect(json.code).toBe("FACILITY_ALREADY_CLAIMED");
    expect(String(json.code)).not.toMatch(/PAY|PRICE|SUBSCRIP|PRO_REQUIRED|CARD/i);
  });
});

// ───────────────────────────── Layer B ─────────────────────────────

const rpcMock = vi.fn();
const invokeMock = vi.fn();
const advanceMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
    auth: { getSession: async () => ({ data: { session: null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    }),
  },
}));

vi.mock("@/hooks/useProviderOnboardingState", () => ({
  useProviderOnboardingState: () => ({
    advance: advanceMock,
    data: { mode: "claim" },
  }),
}));

describe("R3b — the onboarding Free plan path takes no payment", () => {
  beforeEach(() => {
    rpcMock.mockReset().mockResolvedValue({ error: null });
    invokeMock.mockReset().mockResolvedValue({ data: null, error: null });
    advanceMock.mockReset();
  });

  it("completes onboarding on Free without invoking any checkout function", async () => {
    const { PlanStep } = await import("@/components/provider/onboarding/PlanStep");
    render(
      <MemoryRouter>
        <PlanStep onAdvance={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>,
    );

    const freeButton = await screen.findByRole("button", { name: /Continue with Free/i });
    await userEvent.click(freeButton);

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith("complete_provider_onboarding_with_plan", {
        p_plan: "free",
      });
    });

    // The critical assertion: no Stripe Checkout was started on the Free path.
    const checkoutCalls = invokeMock.mock.calls.filter(([fn]) =>
      String(fn).includes("checkout"),
    );
    expect(checkoutCalls).toHaveLength(0);
  });

  it("offers the Free option at all (a $0 path must remain reachable)", async () => {
    const { PlanStep } = await import("@/components/provider/onboarding/PlanStep");
    render(
      <MemoryRouter>
        <PlanStep onAdvance={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("button", { name: /Continue with Free/i }),
    ).toBeEnabled();
  });
});

// ───────────────────────────── Layer C ─────────────────────────────

/**
 * Architectural invariant: no module in the claim pipeline may depend on
 * Stripe or on subscription entitlement. Expressed structurally because a
 * behavioural test cannot prove the ABSENCE of a dependency across a pipeline.
 */
const CLAIM_EDGE_FUNCTIONS = [
  "submit-facility-claim",
  "initiate-claim-email-verification",
  "initiate-claim-sms-verification",
  "initiate-claim-voice-otp",
  "confirm-claim-verification-code",
  "verify-claim-voice-otp",
  "send-claim-approval-email",
  "send-claim-rejection-email",
];

const BILLING_TOKENS = [
  "esm.sh/stripe",
  "STRIPE_SECRET_KEY",
  "checkout.sessions",
  "create-checkout",
  "has_active_pro",
  "has_featured",
  "facility_subscriptions",
  "paymentIntent",
  "PaymentIntent",
];

describe("R3c — the claim pipeline has no billing dependency", () => {
  it.each(CLAIM_EDGE_FUNCTIONS)(
    "%s imports and references nothing billing-related",
    (slug) => {
      const path = resolve(__dirname, "../../supabase/functions", slug, "index.ts");
      if (!existsSync(path)) {
        throw new Error(
          `[test] claim edge function "${slug}" is missing. If it was intentionally ` +
            `renamed or removed, update this regression list deliberately.`,
        );
      }
      const src = readFileSync(path, "utf8");
      const hits = BILLING_TOKENS.filter((token) => src.includes(token));
      expect(hits, `${slug} must not depend on billing, found: ${hits.join(", ")}`).toEqual([]);
    },
  );

  it("the /provider/claims route guard applies no plan or payment gate", async () => {
    // Complements src/lib/__tests__/claimsRouteGuard.test.ts, which already
    // locks "auth + role, but NO plan gate". Here we assert the decision for a
    // provider carrying no subscription at all is plain access.
    const { resolveClaimsGuard } = await import("@/lib/claimsRouteGuard");
    // A provider with NO subscription of any kind still renders the page.
    expect(resolveClaimsGuard("provider", true, false)).toEqual({ kind: "render" });
  });
});
