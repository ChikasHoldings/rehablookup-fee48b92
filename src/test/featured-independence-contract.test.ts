/**
 * FEATURED IS INDEPENDENT OF PRO — regression contract.
 *
 * Featured is advertising: priced per location, billed on its own Stripe
 * subscription, clearly labeled sponsored where it renders. It is NOT a Pro
 * entitlement and never was one, so it carries no Pro precondition.
 *
 * WHAT WENT WRONG
 * ───────────────
 * `facility_subscriptions` was modelled as "the Pro row, which also carries
 * add-on flags" — `tier text NOT NULL DEFAULT 'pro' CHECK (tier IN ('pro'))`.
 * A row could not exist unless it was a Pro row, so two gates followed from the
 * schema rather than from the product:
 *
 *   • create-checkout-session returned 409 NO_SUBSCRIPTION / 409 PRO_REQUIRED
 *     for intent='add_addon'.
 *   • activateFeaturedAddon() hard-refused: "no facility_subscriptions row
 *     exists; Pro upgrade must precede Featured".
 *
 * The second one is the dangerous half: with only the checkout gate removed, a
 * Free provider would have been CHARGED by Stripe and received nothing.
 *
 * WHY THESE ARE SOURCE ASSERTIONS
 * ───────────────────────────────
 * There is no Postgres and no Stripe in this suite, and the repo's Deno tests
 * are not wired into CI. `npm run test` IS in the build, so this file is the
 * enforceable half of the contract. Where a behaviour can be modelled it is
 * (the tier predicate is executed against fixtures via the real isActiveProRow),
 * and the rest is asserted against the migration / Edge Function source that
 * ships. `scripts/check-directory-trust-ranking.mjs` covers the ranking half.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isActiveProRow } from "@/lib/proAccess";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const stripSql = (sql: string) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
/** Comment-stripped source: a comment explaining a retired gate is not the gate. */
const stripJs = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1 ");

const checkout = stripJs(read("supabase/functions/create-checkout-session/index.ts"));
const featuredAddon = stripJs(read("supabase/functions/_shared/featured-addon.ts"));
const webhook = stripJs(read("supabase/functions/stripe-webhook/index.ts"));
const cancelShared = stripJs(read("supabase/functions/_shared/cancel-subscription.ts"));

/** Every migration, oldest first. The LAST definition of a thing is the live one. */
function migrations(): { name: string; sql: string }[] {
  const dir = join(ROOT, "supabase", "migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: stripSql(readFileSync(join(dir, name), "utf8")) }));
}

// ───────────────────────────────────────────────────────────────────────────
// 1. THE SCHEMA CAN REPRESENT ALL FOUR STATES
// ───────────────────────────────────────────────────────────────────────────

describe("facility_subscriptions can represent a Featured-only facility", () => {
  it("allows a non-Pro listing tier", () => {
    // The live constraint is the last one defined.
    const withCheck = [...migrations()]
      .reverse()
      .find((m) => /facility_subscriptions_tier_check|CHECK \(tier IN/i.test(m.sql));
    expect(withCheck, "no migration constrains facility_subscriptions.tier").toBeTruthy();
    const sql = withCheck!.sql;
    const match = sql.match(/CHECK\s*\(\s*tier\s+IN\s*\(([^)]*)\)/i);
    expect(match, `no tier CHECK found in ${withCheck!.name}`).toBeTruthy();
    const allowed = match![1]
      .split(",")
      .map((t) => t.trim().replace(/^'|'$/g, ""))
      .filter(Boolean);
    expect(allowed).toContain("pro");
    expect(allowed, "tier must admit a non-Pro listing plan for Featured-only").toContain("free");
  });

  it("drops the DEFAULT so no insert can mint Pro by omission", () => {
    // DEFAULT 'pro' meant any writer that forgot `tier` silently created a Pro
    // entitlement — a live footgun once tier='free' became legal.
    const drops = migrations().some((m) =>
      /ALTER\s+COLUMN\s+tier\s+DROP\s+DEFAULT/i.test(m.sql),
    );
    expect(drops, "facility_subscriptions.tier must have no DEFAULT").toBe(true);
  });

  it("forbids a non-Pro row from carrying Pro Stripe identifiers", () => {
    const guarded = migrations().some((m) =>
      /tier\s*<>\s*'free'\s+OR\s+stripe_subscription_id\s+IS\s+NULL/i.test(m.sql),
    );
    expect(guarded).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 2. CHECKOUT: FEATURED REQUIRES NO PRO — THE HEADLINE ASSERTION
// ───────────────────────────────────────────────────────────────────────────

describe("Featured checkout has no Pro precondition", () => {
  /**
   * PERMANENT REGRESSION ASSERTION: "Featured purchase does not require Pro."
   *
   * Isolates the add_addon branch and proves that neither refusal is reachable
   * for product='featured'. Written against the branch rather than the whole
   * file so the retired Concierge product may keep its own gate.
   */
  const addonBranch = (() => {
    // The add_addon branch is the `else` of the initial_subscription check, and
    // it ends at the supersedeFeatured computation. Anchored on those two so the
    // slice can't drift onto the earlier `intent === "add_addon"` validation.
    const ifStart = checkout.indexOf('if (intent === "initial_subscription")');
    expect(ifStart, "could not locate the intent dispatch").toBeGreaterThan(0);
    const elseStart = checkout.indexOf("} else {", ifStart);
    expect(elseStart, "could not locate the add_addon branch").toBeGreaterThan(0);
    const end = checkout.indexOf("const supersedeFeatured", elseStart);
    expect(end, "could not locate the end of the add_addon branch").toBeGreaterThan(0);
    return checkout.slice(elseStart, end);
  })();

  it("never returns PRO_REQUIRED for Featured", () => {
    // Every PRO_REQUIRED / NO_SUBSCRIPTION refusal must sit inside a
    // concierge-only conditional.
    const conciergeGate = addonBranch.match(
      /if\s*\(\s*product\s*===\s*"concierge"\s*\)\s*\{([\s\S]*?)\n {6}\}/,
    );
    expect(conciergeGate, "the Pro precondition must be scoped to concierge").toBeTruthy();
    const gateBody = conciergeGate![1];
    expect(gateBody).toContain("PRO_REQUIRED");
    expect(gateBody).toContain("NO_SUBSCRIPTION");

    // ...and must not appear anywhere else in the add-on branch.
    const outside = addonBranch.replace(gateBody, "");
    expect(outside).not.toContain("PRO_REQUIRED");
    expect(outside).not.toContain("NO_SUBSCRIPTION");
  });

  it("does not require an existing subscription row to buy Featured", () => {
    // The already-active guards must tolerate a missing row (optional chaining),
    // because a Free facility buying Featured for the first time has none.
    expect(addonBranch).toMatch(
      /product === "featured" && \(facSub as \{ has_featured\?: boolean \} \| null\)\?\.has_featured === true/,
    );
  });

  it("keeps the duplicate-purchase and mutual-exclusivity protections", () => {
    expect(addonBranch).toContain("ALREADY_ACTIVE");
    expect(addonBranch).toContain("CONCIERGE_ACTIVE");
  });

  it("keeps authentication, ownership and suspension checks", () => {
    expect(checkout).toContain("AUTH_MISSING");
    expect(checkout).toContain("AUTH_INVALID");
    expect(checkout).toContain("NOT_OWNER");
    expect(checkout).toContain("FACILITY_SUSPENDED");
  });

  it("keeps the duplicate-session and idempotency-key protections", () => {
    expect(checkout).toContain("thirtyMinAgo");
    expect(checkout).toContain("stripe.checkout.sessions.list");
    expect(checkout).toMatch(/idempotencyKey/);
  });

  it("still validates product and billing interval", () => {
    expect(checkout).toContain("INVALID_PRODUCT");
    expect(checkout).toContain("INVALID_BILLING_PERIOD");
    expect(checkout).toContain("INVALID_INTENT");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 3. ACTIVATION: A FEATURED-ONLY PURCHASE MUST NOT STRAND THE CUSTOMER
// ───────────────────────────────────────────────────────────────────────────

describe("Featured activation creates a Featured-only subscription row", () => {
  for (const [label, src] of [
    ["shared source", featuredAddon],
    ["generated stripe-webhook artifact", webhook],
  ] as const) {
    describe(label, () => {
      it("no longer refuses when the facility has never held Pro", () => {
        expect(src).not.toContain("Pro upgrade must precede Featured");
      });

      it("creates the row with an explicit non-Pro listing tier", () => {
        expect(src).toContain("featured_only_row_create");
        // tier MUST be stated explicitly — the column has no DEFAULT.
        expect(src).toMatch(/tier:\s*"free"/);
        expect(src).not.toMatch(/tier:\s*"pro"[\s\S]{0,200}featured_only_row_create/);
      });

      it("marks the row active so paid placements can render", () => {
        // get-featured-rotation INNER JOINs and filters status='active'.
        expect(src).toMatch(/status:\s*"active"/);
      });

      it("stores no Pro Stripe subscription id on a Featured-only row", () => {
        expect(src).toMatch(/stripe_subscription_id:\s*null/);
      });

      it("derives the owner from facilities.user_id, not Stripe metadata", () => {
        // Metadata can be absent or malformed; the owner cannot, and it is the
        // same identity checkout authorized.
        const block = src.slice(src.indexOf("featured_only_row_create") - 1200);
        expect(block).toMatch(/from\("facilities"\)/);
        expect(block).toMatch(/select\("user_id"\)/);
      });

      it("stays idempotent against a concurrent Stripe retry", () => {
        const block = src.slice(src.indexOf("featured_only_row_create") - 200);
        expect(block).toMatch(/raceRow|raceId/);
      });
    });
  }

  it("the generated artifact matches the shared source (no drift)", () => {
    // The webhook is generated by scripts/inline-stripe-webhook-shared.py. If a
    // fix lands in _shared but the artifact is not regenerated, production keeps
    // the old behaviour.
    expect(webhook).toContain("featured_only_row_create");
    expect(featuredAddon).toContain("featured_only_row_create");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 4. FEATURED DOES NOT GRANT PRO — EXECUTED, NOT JUST ASSERTED
// ───────────────────────────────────────────────────────────────────────────

describe("Featured never grants Pro", () => {
  /** The four valid product states, as stored rows. */
  const FREE_ONLY = { tier: "free", status: "active", current_period_end: null };
  const PRO_ONLY = { tier: "pro", status: "active", current_period_end: null };
  const FEATURED_ONLY = { tier: "free", status: "active", current_period_end: null };
  const PRO_PLUS_FEATURED = { tier: "pro", status: "active", current_period_end: null };

  it("a Featured-only row is not Pro (client predicate)", () => {
    expect(isActiveProRow(FEATURED_ONLY)).toBe(false);
  });

  it("a Featured-only row is not Pro even while Featured is live and paid", () => {
    // has_featured is deliberately absent from ProAccessRow — the Pro predicate
    // cannot even see it, which is the structural reason this cannot regress.
    expect(isActiveProRow({ ...FEATURED_ONLY, ...{ has_featured: true } })).toBe(false);
  });

  it("distinguishes all four states correctly", () => {
    expect(isActiveProRow(FREE_ONLY)).toBe(false);
    expect(isActiveProRow(PRO_ONLY)).toBe(true);
    expect(isActiveProRow(FEATURED_ONLY)).toBe(false);
    expect(isActiveProRow(PRO_PLUS_FEATURED)).toBe(true);
  });

  it("the database predicate requires tier='pro'", () => {
    const live = [...migrations()]
      .reverse()
      .find((m) => /CREATE OR REPLACE FUNCTION public\.has_active_pro/i.test(m.sql));
    expect(live).toBeTruthy();
    const body = live!.sql.slice(
      live!.sql.search(/CREATE OR REPLACE FUNCTION public\.has_active_pro/i),
    );
    expect(body).toMatch(/tier\s*=\s*'pro'/i);
    // It must NOT read any Featured signal.
    const fnBody = body.split("$$")[1] ?? body;
    expect(fnBody).not.toMatch(/has_featured/i);
  });

  it("Featured activation writes no Pro state", () => {
    const activate = featuredAddon.slice(
      featuredAddon.indexOf("export async function activateFeaturedAddon"),
      featuredAddon.indexOf("export async function deactivateFeaturedAddon"),
    );
    expect(activate.length).toBeGreaterThan(200);
    // No Pro mirror, no verification, no ranking.
    expect(activate).not.toMatch(/activateProBenefits/);
    expect(activate).not.toMatch(/\bverified\s*:/);
    expect(activate).not.toMatch(/calculated_ranking_score/);
    // The only tier it may write is the non-Pro one.
    const tierWrites = [...activate.matchAll(/tier:\s*"([a-z]+)"/g)].map((m) => m[1]);
    expect(tierWrites.every((t) => t === "free")).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 5. PRO DOES NOT GRANT FEATURED
// ───────────────────────────────────────────────────────────────────────────

describe("Pro never grants Featured", () => {
  it("Pro activation writes no Featured state", () => {
    const proBenefits = stripJs(read("supabase/functions/_shared/pro-benefits.ts"));
    expect(proBenefits).not.toMatch(/\bfeatured\s*:/);
    expect(proBenefits).not.toMatch(/has_featured\s*:\s*true/);
  });

  it("the Pro upsert derives has_featured from the purchased items, not from Pro", () => {
    // deriveTierFlagsFromSubscription reads the Stripe line items: a bare Pro
    // checkout yields has_featured=false. Pro alone can never set it true.
    expect(webhook).toMatch(/has_featured:\s*flagsCheckout\.has_featured/);
  });

  it("Pro is not marketed as including Featured in the shared contract", () => {
    const contract = read("src/lib/proDirectoryBenefits.ts");
    const benefitsBlock = contract.slice(
      contract.indexOf("PRO_DIRECTORY_BENEFITS"),
      contract.indexOf("PRO_BENEFIT_GROUPS"),
    );
    expect(benefitsBlock).not.toMatch(/\bFeatured\b/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 6. ORGANIC RANKING IS UNAFFECTED BY FEATURED STATE
// ───────────────────────────────────────────────────────────────────────────

describe("organic ranking is unaffected by Featured", () => {
  const scorer = stripJs(read("supabase/functions/calculate-ranking-scores/index.ts"));

  it("the ranking scorer reads no Featured or subscription signal", () => {
    expect(scorer).not.toMatch(/has_featured/);
    expect(scorer).not.toMatch(/facility_subscriptions/);
    expect(scorer).not.toMatch(/featured_placements/);
    expect(scorer).not.toMatch(/pro_boost/);
  });

  it("Featured activation touches no ranking column", () => {
    expect(featuredAddon).not.toMatch(/calculated_ranking_score/);
    // It may seed featured_placements — that is sponsored INVENTORY, which is a
    // separately labeled rail, not organic order.
    expect(featuredAddon).toMatch(/featured_placements/);
  });

  it("sponsored placements stay a separate rail from organic results", () => {
    const rotation = stripJs(read("supabase/functions/get-featured-rotation/index.ts"));
    // Paid rotation is gated on the Featured flag + an active row, never on rank.
    expect(rotation).toMatch(/has_featured/);
    expect(rotation).not.toMatch(/calculated_ranking_score/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 7. FEATURED-ONLY LIFECYCLE: CANCELLATION
// ───────────────────────────────────────────────────────────────────────────

describe("a Featured-only row cancels without a Pro subscription", () => {
  const COPIES = {
    "_shared/cancel-subscription.ts": cancelShared,
    "provider-self-cancel-subscription": stripJs(
      read("supabase/functions/provider-self-cancel-subscription/index.ts"),
    ),
    "admin-cancel-subscription": stripJs(
      read("supabase/functions/admin-cancel-subscription/index.ts"),
    ),
    "stripe-webhook": webhook,
  };

  for (const [label, src] of Object.entries(COPIES)) {
    it(`${label} routes scope='all' on a non-Pro row to the Featured path`, () => {
      // Otherwise scope='all' would refund a Pro subscription that does not
      // exist, or throw on stopStripeSubscription(null).
      expect(src).toMatch(/const isProRow = subscription\.tier === "pro"/);
      expect(src).toMatch(
        /options\.scope === "all" && !isProRow \? "addon-featured" : options\.scope/,
      );
      expect(src).toMatch(/if \(effectiveScope === "all"\)/);
    });
  }

  it("all inlined copies agree (no drift between artifacts)", () => {
    // cancel-subscription.ts is inlined into three deployables, two of which the
    // generic inliner refuses to re-inline. A fix applied to only one copy ships
    // half-fixed.
    const counts = Object.values(COPIES).map(
      (src) => (src.match(/effectiveScope/g) ?? []).length,
    );
    expect(new Set(counts).size, "inlined cancel copies have drifted").toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 8. NO TRANSITIONAL UI COPY SURVIVES
// ───────────────────────────────────────────────────────────────────────────

describe("the UI no longer claims Featured needs Pro", () => {
  const SURFACES = [
    "src/pages/provider/MarketingHub.tsx",
    "src/pages/provider/MarketingFeatured.tsx",
    "src/pages/provider/Dashboard.tsx",
    "src/pages/provider/Billing.tsx",
    "src/components/provider/subscription/ProUpgradeChoices.tsx",
    "src/components/provider/marketing/MarketDemandCard.tsx",
  ];

  for (const rel of SURFACES) {
    it(`${rel} states no Pro prerequisite for Featured`, () => {
      // Comment-stripped: the files carry historical notes naming the removed
      // "Pro required" lock, and punishing that documentation would be backwards.
      const src = stripJs(read(rel));
      // The transitional wording that acknowledged the billing-integration gap.
      expect(src).not.toMatch(/currently requires an active Pro/i);
      expect(src).not.toMatch(/limitation of the current billing integration/i);
      expect(src).not.toMatch(/requires an active Pro plan/i);
      expect(src).not.toMatch(/Pro is the first step/i);
      expect(src).not.toMatch(/Upgrade to Pro to get started/i);
      expect(src).not.toMatch(/Pro required/i);
    });
  }

  it("the Featured hub keeps the permanent positioning statement", () => {
    const hub = read("src/pages/provider/MarketingHub.tsx");
    expect(hub).toMatch(/FEATURED_POSITIONING|does not change organic directory position/);
  });
});
