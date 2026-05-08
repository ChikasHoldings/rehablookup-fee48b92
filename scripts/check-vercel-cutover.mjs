#!/usr/bin/env node
/**
 * Vercel cutover smoke test.
 *
 * Run BEFORE switching DNS, against the Vercel deployment URL:
 *   HOST=https://rehablookup.vercel.app node scripts/check-vercel-cutover.mjs
 *
 * Run AFTER switching DNS, against the live custom domain:
 *   HOST=https://rehablookup.com node scripts/check-vercel-cutover.mjs
 *
 * Verifies the SEO-critical surface that DNS cutover must NOT regress:
 *   - Apex serves 200 with HTML
 *   - www → apex 301
 *   - Trailing-slash 301 to no-slash
 *   - sitemap-index.xml + robots.txt 200 with correct content-type
 *   - Sample of 301 redirects from vercel.json still fire
 *   - Sample SPA deep links return 200 (no 404)
 *   - HSTS + X-Frame-Options + X-Content-Type-Options headers present
 *   - Canonical link tag points to rehablookup.com on a sampled page
 *
 * Exits non-zero on any failure so it can gate a release.
 */

const HOST = (process.env.HOST || "https://rehablookup.com").replace(/\/$/, "");
const UA = "RehabLookupCutoverBot/1.0";

const failures = [];
const pass = [];

async function fetchHead(url, opts = {}) {
  const res = await fetch(url, {
    method: opts.method || "GET",
    redirect: "manual",
    headers: { "User-Agent": UA, ...(opts.headers || {}) },
  });
  return res;
}

async function check(name, fn) {
  try {
    await fn();
    pass.push(name);
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failures.push({ name, error: e.message });
    console.log(`  ❌ ${name} — ${e.message}`);
  }
}

console.log(`\nVercel cutover smoke — host: ${HOST}\n`);

// 1. Apex 200
await check("Apex / returns 200 HTML", async () => {
  const r = await fetchHead(`${HOST}/`);
  if (r.status !== 200) throw new Error(`status ${r.status}`);
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("text/html")) throw new Error(`content-type ${ct}`);
});

// 2. www → apex (only meaningful when HOST is the apex with DNS in place)
const apexHost = new URL(HOST).hostname;
if (apexHost === "rehablookup.com") {
  await check("www.rehablookup.com → rehablookup.com 301", async () => {
    const r = await fetchHead("https://www.rehablookup.com/", { method: "GET" });
    if (![301, 308].includes(r.status)) throw new Error(`status ${r.status}`);
    const loc = r.headers.get("location") || "";
    if (!loc.startsWith("https://rehablookup.com")) throw new Error(`location ${loc}`);
  });
}

// 3. Trailing-slash 301
await check("Trailing-slash /resources/ → /resources 301", async () => {
  const r = await fetchHead(`${HOST}/resources/`);
  if (![301, 308].includes(r.status)) throw new Error(`status ${r.status}`);
});

// 4. sitemap-index
await check("sitemap-index.xml 200 + xml content-type", async () => {
  const r = await fetchHead(`${HOST}/sitemap-index.xml`);
  if (r.status !== 200) throw new Error(`status ${r.status}`);
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("xml")) throw new Error(`content-type ${ct}`);
});

// 5. robots.txt
await check("robots.txt 200 + plain text", async () => {
  const r = await fetchHead(`${HOST}/robots.txt`);
  if (r.status !== 200) throw new Error(`status ${r.status}`);
  const body = await r.text();
  if (!body.includes("Sitemap: https://rehablookup.com/sitemap-index.xml")) {
    throw new Error("missing canonical sitemap directive");
  }
});

// 6. Redirect parity — sample of 301s defined in vercel.json
const REDIRECT_SAMPLES = [
  ["/treatment", "/treatment-types"],
  ["/blog", "/resources"],
  ["/find-rehab", "/rehab-centers"],
  ["/insurance/aetna", "/insurance/aetna-rehab"],
  ["/privacy", "/privacy-policy"],
  ["/seeker", "/account"],
  ["/sitemap", "/sitemap-index.xml"],
];
for (const [from, to] of REDIRECT_SAMPLES) {
  await check(`${from} → ${to} 301`, async () => {
    const r = await fetchHead(`${HOST}${from}`);
    if (![301, 308].includes(r.status)) throw new Error(`status ${r.status}`);
    const loc = (r.headers.get("location") || "").replace(/^https?:\/\/[^/]+/, "");
    if (loc !== to) throw new Error(`location ${loc} != ${to}`);
  });
}

// 7. SPA deep links
const DEEP_LINKS = [
  "/rehab-centers",
  "/rehab-centers/california",
  "/treatment-types",
  "/insurance/aetna-rehab",
  "/rehab-marketing/california",
  "/rehab-marketing/alabama/county/calhoun/dual-diagnosis",
  "/rehab-marketing/pennsylvania/county/york/insurance/cigna",
  "/concierge",
  "/for-providers",
  "/resources",
];
for (const path of DEEP_LINKS) {
  await check(`Deep link ${path} returns 200`, async () => {
    const r = await fetchHead(`${HOST}${path}`);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  });
}

// 8. Security headers on apex
await check("Security headers (HSTS, X-Frame-Options, nosniff)", async () => {
  const r = await fetchHead(`${HOST}/`);
  const missing = [];
  if (!r.headers.get("strict-transport-security")) missing.push("HSTS");
  if (!r.headers.get("x-frame-options")) missing.push("X-Frame-Options");
  if (!r.headers.get("x-content-type-options")) missing.push("X-Content-Type-Options");
  if (missing.length) throw new Error(`missing: ${missing.join(", ")}`);
});

// 9. Canonical points to rehablookup.com on a sampled page
await check("Canonical tag points to rehablookup.com", async () => {
  const r = await fetchHead(`${HOST}/rehab-centers/california`, {
    headers: { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
  });
  if (r.status !== 200) throw new Error(`status ${r.status}`);
  const html = await r.text();
  const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (!m) throw new Error("no canonical link tag");
  if (!m[1].startsWith("https://rehablookup.com")) {
    throw new Error(`canonical points to ${m[1]}`);
  }
});

console.log(`\n────────────────────────────────────────────────────────────`);
console.log(`Passed:   ${pass.length}`);
console.log(`Failed:   ${failures.length}`);
console.log(`────────────────────────────────────────────────────────────\n`);

if (failures.length) {
  console.log("Failures:");
  for (const f of failures) console.log(`  • ${f.name} — ${f.error}`);
  process.exit(1);
}
console.log("✅ Cutover smoke passed.\n");
