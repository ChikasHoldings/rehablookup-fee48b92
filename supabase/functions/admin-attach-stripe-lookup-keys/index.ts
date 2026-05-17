// admin-attach-stripe-lookup-keys
// ────────────────────────────────
// One-shot admin endpoint that walks the 6 prices backing the EKRA
// flat-fee monetization model and ensures each is attached to its
// canonical lookup_key:
//
//   rl_pro_monthly_v1       $99/mo     monthly
//   rl_pro_annual_v1        $1,009.80  annual  ($99 × 12 × 0.85)
//   rl_featured_monthly_v1  $599/mo    monthly
//   rl_featured_annual_v1   $6,108.60  annual  ($599 × 12 × 0.85)
//   rl_concierge_monthly_v1 $1,000/mo  monthly
//   rl_concierge_annual_v1  $10,200    annual  ($1,000 × 12 × 0.85)
//
// For each spec the function:
//   1. Looks up the price by lookup_key. If present, it's already
//      wired — no-op.
//   2. Otherwise lists active prices and finds one matching (currency,
//      unit_amount, recurring.interval). If found, attaches the
//      lookup_key via `prices.update({ lookup_key, transfer_lookup_key
//      : true })`. The transfer flag handles the rare case where
//      another price held the key.
//   3. If no matching price exists, creates a product + price with the
//      lookup_key baked in (mirrors scripts/stripe-setup-monetization).
//
// Auth: service-role JWT only (format-agnostic).
// Verify_jwt: true (admin invocation via supabase.functions.invoke
// with the service-role key OR through net.http_post with a
// service-role bearer).
//
// Returns: JSON report per spec listing the action taken.
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Spec {
  lookupKey: string;
  productName: string;
  productDescription: string;
  amountCents: number;
  interval: "month" | "year";
}

const SPECS: Spec[] = [
  {
    lookupKey: "rl_pro_monthly_v1",
    productName: "RehabLookup Pro — Monthly",
    productDescription:
      "Verified listing, lead analytics, priority placement, 10 photos + 1 video, Marketing Hub. Billed monthly.",
    amountCents: 9900,
    interval: "month",
  },
  {
    lookupKey: "rl_pro_annual_v1",
    productName: "RehabLookup Pro — Annual",
    productDescription:
      "Verified listing, lead analytics, priority placement, 10 photos + 1 video, Marketing Hub. Billed annually — 15% off the monthly rate.",
    amountCents: 100980,
    interval: "year",
  },
  {
    lookupKey: "rl_featured_monthly_v1",
    productName: "RehabLookup Featured Add-on — Monthly",
    productDescription:
      "Rotating placements on homepage + state + city pages. Requires Pro. Billed monthly.",
    amountCents: 59900,
    interval: "month",
  },
  {
    lookupKey: "rl_featured_annual_v1",
    productName: "RehabLookup Featured Add-on — Annual",
    productDescription:
      "Rotating placements on homepage + state + city pages. Requires Pro. Billed annually — 15% off the monthly rate.",
    amountCents: 610860,
    interval: "year",
  },
  {
    lookupKey: "rl_concierge_monthly_v1",
    productName: "RehabLookup Concierge Partner — Monthly",
    productDescription:
      "Verified-partner badge in advisor matching. EKRA-compliant (advisors present ≥2 non-partner alternatives). Requires Pro. Billed monthly.",
    amountCents: 100000,
    interval: "month",
  },
  {
    lookupKey: "rl_concierge_annual_v1",
    productName: "RehabLookup Concierge Partner — Annual",
    productDescription:
      "Verified-partner badge in advisor matching. EKRA-compliant (advisors present ≥2 non-partner alternatives). Requires Pro. Billed annually — 15% off the monthly rate.",
    amountCents: 1020000,
    interval: "year",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ---- Service-role gate (JWT role-claim, format-agnostic) ----
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  let role: string | null = null;
  try {
    const payload = token.split(".")[1];
    if (payload) {
      const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      role = decoded.role ?? null;
    }
  } catch {
    /* role stays null */
  }
  if (role !== "service_role") {
    return new Response(JSON.stringify({ error: "Forbidden", _version: VERSION }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  if (!STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not configured", _version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });

  const results: Array<{
    lookup_key: string;
    action: "already_attached" | "attached" | "created" | "failed";
    priceId?: string;
    productId?: string;
    error?: string;
  }> = [];

  // Cache active prices once — paged in case the account has many.
  let allActivePrices: Stripe.Price[] = [];
  try {
    for await (const price of stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] })) {
      allActivePrices.push(price);
      if (allActivePrices.length >= 500) break; // safety cap
    }
  } catch (e) {
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : String(e),
      stage: "list_prices",
      _version: VERSION,
    }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const spec of SPECS) {
    try {
      // (1) Already attached?
      const byKey = allActivePrices.find((p) => p.lookup_key === spec.lookupKey);
      if (byKey) {
        results.push({
          lookup_key: spec.lookupKey,
          action: "already_attached",
          priceId: byKey.id,
          productId: typeof byKey.product === "string" ? byKey.product : byKey.product?.id,
        });
        continue;
      }

      // (2) Match by amount + currency + interval.
      const candidate = allActivePrices.find(
        (p) =>
          p.unit_amount === spec.amountCents &&
          p.currency === "usd" &&
          p.recurring?.interval === spec.interval &&
          !p.lookup_key, // don't steal a lookup key from another spec
      );

      if (candidate) {
        const updated = await stripe.prices.update(candidate.id, {
          lookup_key: spec.lookupKey,
          transfer_lookup_key: true,
        });
        results.push({
          lookup_key: spec.lookupKey,
          action: "attached",
          priceId: updated.id,
          productId: typeof updated.product === "string" ? updated.product : updated.product?.id,
        });
        // Update local cache so we don't double-attach.
        candidate.lookup_key = spec.lookupKey;
        continue;
      }

      // (3) No matching price — create product + price from scratch.
      // Try to reuse an existing product with the same name first.
      const productsList = await stripe.products.list({ limit: 100, active: true });
      let product = productsList.data.find((p) => p.name === spec.productName);
      if (!product) {
        product = await stripe.products.create({
          name: spec.productName,
          description: spec.productDescription,
        });
      }
      const newPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: spec.amountCents,
        currency: "usd",
        recurring: { interval: spec.interval },
        lookup_key: spec.lookupKey,
        nickname: spec.productName + " v1",
      });
      results.push({
        lookup_key: spec.lookupKey,
        action: "created",
        priceId: newPrice.id,
        productId: product.id,
      });
    } catch (e) {
      results.push({
        lookup_key: spec.lookupKey,
        action: "failed",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return new Response(JSON.stringify({ results, _version: VERSION }, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
