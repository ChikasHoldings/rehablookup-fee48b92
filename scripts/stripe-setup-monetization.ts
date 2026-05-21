#!/usr/bin/env -S node --experimental-strip-types
/**
 * stripe-setup-monetization
 * ─────────────────────────
 * Idempotent creation of the SIX Stripe products + prices that back
 * the flat-fee monetization model. Three SKUs (Pro / Featured /
 * Concierge) × two billing intervals (monthly / annual) = six prices.
 *
 *   Pro Monthly             — $99/mo         (rl_pro_monthly_v1)
 *   Pro Annual              — $1,009.80/yr   (rl_pro_annual_v1)         = $99 × 12 × 0.85
 *   Featured Monthly        — $599/mo        (rl_featured_monthly_v1)
 *   Featured Annual         — $6,108.60/yr   (rl_featured_annual_v1)    = $599 × 12 × 0.85
 *   Concierge Monthly       — $1,000/mo      (rl_concierge_monthly_v1)
 *   Concierge Annual        — $10,200/yr     (rl_concierge_annual_v1)   = $1,000 × 12 × 0.85
 *
 * The script looks each price up by `lookup_key` first; only creates
 * if missing. Safe to re-run any number of times. After running in
 * test mode, paste the printed price IDs into the PR description; the
 * user updates production env vars when ready to launch.
 *
 * Usage
 *   STRIPE_SECRET_KEY=sk_test_… npx tsx scripts/stripe-setup-monetization.ts
 *   STRIPE_SECRET_KEY=sk_live_… npx tsx scripts/stripe-setup-monetization.ts   # live mode (manual)
 *
 * Required env: STRIPE_SECRET_KEY (test or live).
 */

import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error("[stripe-setup] STRIPE_SECRET_KEY is required.");
  process.exit(1);
}

const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" });

const isLive = stripeKey.startsWith("sk_live_");
const mode = isLive ? "LIVE" : "TEST";

interface ProductSpec {
  lookupKey: string;
  name: string;
  description: string;
  unitAmountCents: number;
  interval: "month" | "year";
  envVarName: string;
}

const PRODUCTS: ProductSpec[] = [
  // ── Pro ────────────────────────────────────────────────────────────
  {
    lookupKey: "rl_pro_monthly_v1",
    name: "RehabLookup Pro — Monthly",
    description:
      "Verified listing, direct contact display, leads inbox, review responses. Billed monthly.",
    unitAmountCents: 9900, // $99
    interval: "month",
    envVarName: "STRIPE_PRICE_PRO_MONTHLY",
  },
  {
    lookupKey: "rl_pro_annual_v1",
    name: "RehabLookup Pro — Annual",
    description:
      "Verified listing, direct contact display, leads inbox, review responses. Billed annually — 15% off the monthly rate.",
    unitAmountCents: 100980, // $1,009.80 = $99 × 12 × 0.85
    interval: "year",
    envVarName: "STRIPE_PRICE_PRO_ANNUAL",
  },

  // ── Featured ───────────────────────────────────────────────────────
  {
    lookupKey: "rl_featured_monthly_v1",
    name: "RehabLookup Featured Add-on — Monthly",
    description:
      "Phone-rotation placements on state, city, search, treatment, insurance, and article pages. Requires Pro. Billed monthly.",
    unitAmountCents: 59900, // $599
    interval: "month",
    envVarName: "STRIPE_PRICE_FEATURED_MONTHLY",
  },
  {
    lookupKey: "rl_featured_annual_v1",
    name: "RehabLookup Featured Add-on — Annual",
    description:
      "Phone-rotation placements on state, city, search, treatment, insurance, and article pages. Requires Pro. Billed annually — 15% off the monthly rate.",
    unitAmountCents: 610860, // $6,108.60 = $599 × 12 × 0.85
    interval: "year",
    envVarName: "STRIPE_PRICE_FEATURED_ANNUAL",
  },

  // ── Concierge Partner ──────────────────────────────────────────────
  {
    lookupKey: "rl_concierge_monthly_v1",
    name: "RehabLookup Concierge Partner — Monthly",
    description:
      "Prominent surfacing in concierge-presented matches. Capped 3-5 per major city. Requires Pro. Billed monthly.",
    unitAmountCents: 100000, // $1,000
    interval: "month",
    envVarName: "STRIPE_PRICE_CONCIERGE_MONTHLY",
  },
  {
    lookupKey: "rl_concierge_annual_v1",
    name: "RehabLookup Concierge Partner — Annual",
    description:
      "Prominent surfacing in concierge-presented matches. Capped 3-5 per major city. Requires Pro. Billed annually — 15% off the monthly rate.",
    unitAmountCents: 1020000, // $10,200 = $1,000 × 12 × 0.85
    interval: "year",
    envVarName: "STRIPE_PRICE_CONCIERGE_ANNUAL",
  },
];

async function ensureProductAndPrice(spec: ProductSpec): Promise<{
  productId: string;
  priceId: string;
  created: boolean;
}> {
  // 1) Look up the price by lookup_key. If found, the product is whatever
  //    that price is attached to. Idempotent.
  const existing = await stripe.prices.list({
    lookup_keys: [spec.lookupKey],
    limit: 1,
    active: true,
    expand: ["data.product"],
  });

  if (existing.data.length > 0) {
    const price = existing.data[0];
    const productId =
      typeof price.product === "string" ? price.product : price.product.id;
    return { productId, priceId: price.id, created: false };
  }

  // 2) Create product. Try to find an existing one by name first to avoid
  //    duplicates if a previous run created the product but the price
  //    creation failed.
  const productSearch = await stripe.products.list({ limit: 100, active: true });
  const existingProduct = productSearch.data.find((p) => p.name === spec.name);
  const product =
    existingProduct ??
    (await stripe.products.create({
      name: spec.name,
      description: spec.description,
    }));

  // 3) Create price with lookup_key.
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: spec.unitAmountCents,
    currency: "usd",
    recurring: { interval: spec.interval },
    lookup_key: spec.lookupKey,
    nickname: spec.name + " v1",
  });

  return { productId: product.id, priceId: price.id, created: true };
}

async function main() {
  console.log(`[stripe-setup] mode = ${mode}`);
  if (isLive) {
    console.log(
      "[stripe-setup] WARNING: live mode. Re-run with STRIPE_SECRET_KEY=sk_test_… to dry-run.",
    );
  }
  console.log(`[stripe-setup] ensuring ${PRODUCTS.length} products + prices…\n`);

  const envLines: string[] = [];

  for (const spec of PRODUCTS) {
    try {
      const { productId, priceId, created } = await ensureProductAndPrice(spec);
      console.log(
        `${created ? "[CREATED]" : "[FOUND]  "} ${spec.lookupKey}`,
      );
      console.log(`           product: ${productId}`);
      console.log(`           price:   ${priceId}`);
      const intervalSuffix = spec.interval === "month" ? "/mo" : "/yr";
      console.log(
        `           amount:  $${(spec.unitAmountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}${intervalSuffix}\n`,
      );
      envLines.push(`${spec.envVarName}=${priceId}`);
    } catch (err) {
      console.error(`[FAIL] ${spec.lookupKey}: ${(err as Error).message}`);
      process.exit(1);
    }
  }

  console.log("\n[stripe-setup] Done. Env vars to record (paste into Vercel + Supabase):\n");
  console.log(envLines.join("\n"));
}

main().catch((err) => {
  console.error("[stripe-setup] fatal:", err);
  process.exit(1);
});
