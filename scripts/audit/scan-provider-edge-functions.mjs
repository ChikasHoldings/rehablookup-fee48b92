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

const findings = [];

for (const fn of PROVIDER_FNS) {
  const file = path.join(ROOT, fn, "index.ts");
  if (!fs.existsSync(file)) {
    findings.push({ fn, severity: "info", issue: "function dir missing" });
    continue;
  }
  const src = fs.readFileSync(file, "utf8");

  // Heuristic checks
  const hasGetUser = /auth\.getUser\(/.test(src);
  const hasMethodCheck = /req\.method\s*!==\s*['"]POST['"]/.test(src) || /method !== ['"]POST['"]/.test(src);
  const hasCors = /Access-Control-Allow-Origin/.test(src) || /corsHeaders/.test(src);
  const hasSelectStar = /\.select\(\s*['"]\*['"]\s*\)/.test(src);
  const hasIdempotency = /idempotency|claim_stripe_webhook_event|mark_stripe_webhook_event_processed/.test(src);
  const isStripe = /Stripe\(/.test(src);
  const isWebhook = fn === "stripe-webhook";

  if (fn !== "stripe-webhook" && !hasGetUser) {
    findings.push({ fn, severity: "high", issue: "no auth.getUser(token) — JWT not validated in code" });
  }
  if (!hasCors) findings.push({ fn, severity: "medium", issue: "no CORS headers detected" });
  if (!hasMethodCheck && fn !== "stripe-webhook") {
    findings.push({ fn, severity: "low", issue: "no explicit POST method enforcement" });
  }
  if (hasSelectStar) {
    findings.push({ fn, severity: "high", issue: "uses select('*') — violates explicit-columns rule" });
  }
  if (isStripe && !hasIdempotency && (fn === "stripe-webhook" || fn === "purchase-credits" || fn === "auto-reload-credits" || fn === "subscribe-pro")) {
    findings.push({ fn, severity: "high", issue: "Stripe handler with no idempotency markers found" });
  }
}

// Output
console.log(`Scanned ${PROVIDER_FNS.length} edge functions.`);
const bySev = findings.reduce((a, f) => ((a[f.severity] = (a[f.severity]||0)+1), a), {});
console.log("By severity:", JSON.stringify(bySev));
console.log("");
for (const f of findings) console.log(`[${f.severity.toUpperCase()}] ${f.fn}: ${f.issue}`);
