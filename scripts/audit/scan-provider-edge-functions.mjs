import fs from "node:fs";
import path from "node:path";

const ROOT = "supabase/functions";
const PROVIDER_FNS = [
  "unlock-lead", "purchase-credits", "auto-reload-credits", "subscribe-pro",
  "get-payment-method", "save-provider-payment-method", "setup-provider-payment-method",
  "customer-portal", "get-billing-history", "get-provider-subscription",
  "manage-subscription", "check-subscription", "purchase-listing-slot",
  "validate-promo-code", "stripe-webhook", "track-provider-event",
  "send-provider-support", "delete-provider-account", "notify-payment-failed",
  "retry-failed-payments",
];

// Functions that intentionally do not require an end-user JWT.
// Each entry MUST justify why and reference the auth mechanism in code.
const AUTH_ALLOWLIST = {
  "stripe-webhook": "Verified via stripe-signature + constructEvent.",
  "auto-reload-credits": "Cron-only; HMAC of (providerId|ts) with SUPABASE_SERVICE_ROLE_KEY.",
  "retry-failed-payments": "Internal cron job; uses SUPABASE_SERVICE_ROLE_KEY only.",
  "notify-payment-failed": "Invoked from stripe-webhook server-to-server with service role.",
  "track-provider-event": "Public anonymous event tracking (engagement metrics) by design.",
  "validate-promo-code": "Public lookup of promo codes prior to checkout; no PII returned.",
  "send-provider-support": "Public support form; sanitised input, body size limit, optional userId.",
};

// Functions where Stripe idempotency is not required because they only create
// Checkout Sessions (redirect URLs) — the actual charge happens on Stripe-hosted
// pages with their own retry semantics.
const STRIPE_IDEMPOTENCY_NOT_REQUIRED = new Set([
  "subscribe-pro",        // checkout.sessions.create only
  "purchase-listing-slot",// checkout.sessions.create only
  "validate-promo-code",  // read-only stripe.promotionCodes.list
  "customer-portal",      // billingPortal.sessions.create
  "setup-provider-payment-method", // setupIntents.create – idempotent server-side
  "save-provider-payment-method",  // attach payment method – tagged elsewhere
  "manage-subscription",  // subscription state changes; checked separately
  "retry-failed-payments",// has its own retry counter on placement_invoices
  "notify-payment-failed",// no Stripe writes
  "check-subscription",   // read-only
  "get-payment-method",   // read-only
  "get-billing-history",  // read-only
  "get-provider-subscription", // read-only
  "delete-provider-account",   // cancels subscription, idempotent at Stripe
]);

const findings = [];

for (const fn of PROVIDER_FNS) {
  const file = path.join(ROOT, fn, "index.ts");
  if (!fs.existsSync(file)) {
    findings.push({ fn, severity: "info", issue: "function dir missing" });
    continue;
  }
  const src = fs.readFileSync(file, "utf8");

  // Recognise both `auth.getUser(token)` and the newer `auth.getClaims(token)`.
  const hasAuth = /auth\.(getUser|getClaims)\(/.test(src);
  const hasMethodCheck = /req\.method\s*!==\s*['"]POST['"]/.test(src);
  const hasCors = /Access-Control-Allow-Origin/.test(src) || /corsHeaders/.test(src);
  const hasSelectStar = /\.select\(\s*['"]\*['"]\s*\)/.test(src);
  const hasIdempotency =
    /idempotencyKey|claim_stripe_webhook_event|mark_stripe_webhook_event_processed|advisory_xact_lock|advisory_lock|try_acquire_[a-z_]*_lock|Idempotency layer/i.test(
      src,
    );
  const isStripe = /Stripe\(/.test(src);

  if (!hasAuth && !AUTH_ALLOWLIST[fn]) {
    findings.push({ fn, severity: "high", issue: "no auth.getUser/getClaims — JWT not validated in code" });
  }
  if (!hasCors) findings.push({ fn, severity: "medium", issue: "no CORS headers detected" });
  if (!hasMethodCheck && fn !== "stripe-webhook") {
    findings.push({ fn, severity: "low", issue: "no explicit POST method enforcement" });
  }
  if (hasSelectStar) {
    findings.push({ fn, severity: "high", issue: "uses select('*') — violates explicit-columns rule" });
  }
  if (
    isStripe &&
    !hasIdempotency &&
    !STRIPE_IDEMPOTENCY_NOT_REQUIRED.has(fn) &&
    fn !== "stripe-webhook"
  ) {
    findings.push({ fn, severity: "high", issue: "Stripe write handler with no idempotency markers found" });
  }
}

console.log(`Scanned ${PROVIDER_FNS.length} edge functions.`);
const bySev = findings.reduce((a, f) => ((a[f.severity] = (a[f.severity] || 0) + 1), a), {});
console.log("By severity:", JSON.stringify(bySev));
console.log("");
for (const f of findings) console.log(`[${f.severity.toUpperCase()}] ${f.fn}: ${f.issue}`);

const highCount = findings.filter((f) => f.severity === "high").length;
if (highCount > 0) {
  console.error(`\n❌ ${highCount} high-severity finding(s) — failing build.`);
  process.exit(1);
}
console.log("\n✅ No high-severity findings.");
