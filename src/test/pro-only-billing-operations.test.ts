/**
 * Pro-only billing operations must REQUIRE Pro, not infer it.
 *
 * WHAT CHANGED AND WHY
 * ────────────────────
 * Before 20260902000000 every facility_subscriptions row was a Pro row — the
 * tier column was `CHECK (tier = 'pro')`. Two billing endpoints were written
 * against that assumption and read no tier at all:
 *
 *   switch-to-annual        selected …, billing_period, status
 *   set-renewal-switch-flag selected provider_id, billing_period
 *
 * Now a row can be a Featured-only row (tier='free', stripe_subscription_id
 * NULL), so "a row exists" no longer means "Pro exists". Each endpoint did
 * still refuse such a row, but only by accident:
 *
 *   • switch-to-annual fell through to its `missing_stripe_link` check, which
 *     fires only because a Featured-only row happens to have a NULL Pro
 *     subscription id.
 *   • set-renewal-switch-flag fell through to its `not_annual` check, which
 *     fires only because the Featured insert omits billing_period and so
 *     inherits the column DEFAULT 'monthly'. A Featured ANNUAL purchase that
 *     recorded billing_period='annual' on that row would have passed every
 *     guard and written Pro renewal state onto a facility with no Pro.
 *
 * Both now state the requirement. These are source contracts because the
 * endpoints are Deno Edge functions; the assertions target the guard, its
 * ordering, and the fact that tier is actually selected — a guard on a column
 * the query never fetched would read `undefined !== "pro"` and refuse
 * everything.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const ENDPOINTS = [
  {
    label: "switch-to-annual",
    file: "supabase/functions/switch-to-annual/index.ts",
    /** The accidental refusal this endpoint used to rely on. */
    accidentalGuard: /missing_stripe_link/,
  },
  {
    label: "set-renewal-switch-flag",
    file: "supabase/functions/set-renewal-switch-flag/index.ts",
    accidentalGuard: /not_annual/,
  },
];

describe("Pro-only billing operations require tier='pro' explicitly", () => {
  for (const ep of ENDPOINTS) {
    describe(ep.label, () => {
      const src = stripComments(read(ep.file));

      it("selects tier from facility_subscriptions", () => {
        // A guard on a column that was never selected is worse than no guard:
        // it would reject every caller, Pro included.
        const select = src.match(
          /from\(["']facility_subscriptions["']\)[\s\S]{0,200}?\.select\(\s*["']([^"']+)["']/,
        );
        expect(select, "no facility_subscriptions select found").toBeTruthy();
        expect(select![1].split(",").map((c) => c.trim())).toContain("tier");
      });

      it("refuses a non-Pro row with an intentional not_pro_subscription outcome", () => {
        expect(src).toMatch(/sub\.tier\s*!==\s*["']pro["']/);
        expect(src).toMatch(/not_pro_subscription/);
      });

      it("does not infer Pro from a nullable Stripe id, status or row existence", () => {
        // The tier check must not be written as a disjunction that a NULL
        // column could satisfy on its own.
        const guard = src.match(/if\s*\(\s*sub\.tier\s*!==\s*["']pro["'][^)]*\)/);
        expect(guard, "tier guard not found").toBeTruthy();
        expect(guard![0]).not.toMatch(/\|\||\?\?/);
      });

      it("checks tier BEFORE the check that used to refuse by accident", () => {
        const tierAt = src.search(/sub\.tier\s*!==\s*["']pro["']/);
        const accidentalAt = src.search(ep.accidentalGuard);
        expect(tierAt).toBeGreaterThan(-1);
        expect(accidentalAt).toBeGreaterThan(-1);
        // Ordering is the point: a Featured-only row must be told it is not a
        // Pro subscription, not handed an unrelated billing error.
        expect(tierAt).toBeLessThan(accidentalAt);
      });

      it("still checks ownership before saying anything about the subscription", () => {
        const ownerAt = src.search(/provider_id\s*!==\s*user\.id/);
        const tierAt = src.search(/sub\.tier\s*!==\s*["']pro["']/);
        expect(ownerAt).toBeGreaterThan(-1);
        expect(ownerAt).toBeLessThan(tierAt);
      });
    });
  }

  it("the Featured-only row these guards must reject is the one Featured activation creates", () => {
    // Ties the guards to the actual writer: tier 'free' + no Pro Stripe id.
    const featured = stripComments(read("supabase/functions/_shared/featured-addon.ts"));
    const insert = featured.match(/\.insert\(\{[\s\S]*?\}\)/);
    expect(insert, "featured activation insert not found").toBeTruthy();
    expect(insert![0]).toMatch(/tier:\s*["']free["']/);
    expect(insert![0]).toMatch(/stripe_subscription_id:\s*null/);
  });
});
