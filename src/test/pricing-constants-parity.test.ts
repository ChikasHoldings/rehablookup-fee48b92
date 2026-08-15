/**
 * R7 — Pro and Featured pricing must survive the removal of the `concierge`
 * entry from the shared pricing maps.
 *
 * Stage 1 audit, Finding: two pricing tables mirror each other by hand —
 *   • `supabase/functions/_shared/subscription-math.ts` → TIER_PRICING (server;
 *     drives checkout and refund math)
 *   • `src/lib/billingPricing.ts`                       → TIER_PRICING (client;
 *     drives everything the provider is shown)
 * Both carry a `concierge` key that Stage 5 deletes. The regression risks are
 * (a) the edit changes a Pro/Featured number by accident, and (b) the two maps
 * drift apart so the UI quotes a different price than Stripe charges.
 *
 * SCOPE NOTE — refund and proration arithmetic is ALREADY covered in depth by
 * `src/test/subscription-math.test.ts` (worked examples for Pro, Featured and
 * Concierge, monthly and annual). This file deliberately does not duplicate
 * that; it pins the CONSTANTS those calculations consume, plus the
 * server↔client parity that no existing test asserts.
 */
import { describe, it, expect } from "vitest";
import { TIER_PRICING as SERVER_PRICING } from "../../supabase/functions/_shared/subscription-math";
import {
  TIER_PRICING as CLIENT_PRICING,
  BUNDLE_MONTHLY_CENTS,
  BUNDLE_ANNUAL_CENTS,
  tierComboLabel,
  fmtMoneyWhole,
} from "@/lib/billingPricing";

describe("R7 — Pro pricing is exactly $99/month", () => {
  it("server-side Pro monthly rate is 9900 cents", () => {
    expect(SERVER_PRICING.pro.fullMonthlyRateCents).toBe(9900);
  });

  it("client-side Pro monthly rate is 9900 cents", () => {
    expect(CLIENT_PRICING.pro.monthlyCents).toBe(9900);
  });

  it("renders as $99 in provider-facing copy", () => {
    expect(fmtMoneyWhole(CLIENT_PRICING.pro.monthlyCents)).toBe("$99");
  });

  it("Pro annual pricing is unchanged (sticker $1,188 → discounted $1,009.80)", () => {
    expect(SERVER_PRICING.pro.fullAnnualCents).toBe(118800);
    expect(SERVER_PRICING.pro.discountedAnnualCents).toBe(100980);
    expect(CLIENT_PRICING.pro.fullAnnualCents).toBe(118800);
    expect(CLIENT_PRICING.pro.annualCents).toBe(100980);
  });
});

describe("R7 — Featured pricing is unchanged", () => {
  it("server-side Featured monthly rate is 59900 cents", () => {
    expect(SERVER_PRICING.featured.fullMonthlyRateCents).toBe(59900);
  });

  it("client-side Featured monthly rate is 59900 cents", () => {
    expect(CLIENT_PRICING.featured.monthlyCents).toBe(59900);
  });

  it("Featured annual keeps the spec-canonical $6,108.60 (not the naive 610980)", () => {
    // The $1.20 delta from pure arithmetic is a deliberate spec rounding that
    // Stripe bills; the refund formula depends on matching it exactly.
    expect(SERVER_PRICING.featured.discountedAnnualCents).toBe(610860);
    expect(CLIENT_PRICING.featured.annualCents).toBe(610860);
    expect(SERVER_PRICING.featured.fullAnnualCents).toBe(718800);
    expect(CLIENT_PRICING.featured.fullAnnualCents).toBe(718800);
  });
});

describe("R7 — server and client pricing maps agree for the retained tiers", () => {
  it.each(["pro", "featured"] as const)(
    "%s: monthly, annual and full-annual match across both maps",
    (tier) => {
      expect(CLIENT_PRICING[tier].monthlyCents).toBe(SERVER_PRICING[tier].fullMonthlyRateCents);
      expect(CLIENT_PRICING[tier].annualCents).toBe(SERVER_PRICING[tier].discountedAnnualCents);
      expect(CLIENT_PRICING[tier].fullAnnualCents).toBe(SERVER_PRICING[tier].fullAnnualCents);
    },
  );

  it.each(["pro", "featured"] as const)(
    "%s: the displayed monthly-equivalent of annual is annual / 12",
    (tier) => {
      expect(CLIENT_PRICING[tier].monthlyEquivOfAnnualCents).toBe(
        Math.round(CLIENT_PRICING[tier].annualCents / 12),
      );
    },
  );
});

describe("R7 — tier labelling keeps working for the retained tiers", () => {
  it("labels a Pro-only subscription", () => {
    expect(
      tierComboLabel({ tier: "pro", has_featured: false, has_concierge_partner: false }),
    ).toBe("Pro");
  });

  it("labels a Pro + Featured subscription", () => {
    expect(
      tierComboLabel({ tier: "pro", has_featured: true, has_concierge_partner: false }),
    ).toBe("Pro + Featured");
  });

  it("labels a non-Pro subscription as Free", () => {
    expect(
      tierComboLabel({ tier: null, has_featured: false, has_concierge_partner: false }),
    ).toBe("Free");
  });
});

/**
 * TEMPORARY CHARACTERIZATION — update when Stage 5 removes the concierge key.
 *
 * These two constants are currently DEFINED as Pro + Concierge. Deleting the
 * concierge tier without recomputing them would leave the provider UI quoting
 * a "top spend" figure for a product that no longer exists. Failing here is
 * the reminder to recompute (the retained maximum becomes Pro + Featured).
 */
describe("R7 [characterization] — bundle totals are currently Pro + Concierge", () => {
  it("BUNDLE_MONTHLY_CENTS is Pro + Concierge, not Pro + Featured", () => {
    expect(BUNDLE_MONTHLY_CENTS).toBe(
      CLIENT_PRICING.pro.monthlyCents + CLIENT_PRICING.concierge.monthlyCents,
    );
    // Recompute target for Stage 5:
    expect(CLIENT_PRICING.pro.monthlyCents + CLIENT_PRICING.featured.monthlyCents).toBe(69800);
  });

  it("BUNDLE_ANNUAL_CENTS is Pro + Concierge", () => {
    expect(BUNDLE_ANNUAL_CENTS).toBe(
      CLIENT_PRICING.pro.annualCents + CLIENT_PRICING.concierge.annualCents,
    );
  });
});
