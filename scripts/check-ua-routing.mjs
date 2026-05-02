#!/usr/bin/env node
/**
 * UA-aware routing smoke test.
 *
 * Asserts that the Vercel Edge Middleware (`middleware.ts`) is doing its job:
 *
 *   • Real browsers (UA = Mozilla/Chrome) get the React SPA shell — i.e.
 *     `<div id="root">` plus the GA4 `G-2VB6C1X2MQ` tag and Meta Pixel —
 *     so `gtag('event','page_view')` actually fires and Google Analytics
 *     traffic doesn't silently flatline.
 *
 *   • Crawlers (UA = Googlebot) get the prerendered SEO HTML — i.e. a
 *     descriptive <h1>, the canonical <link>, and JSON-LD — so SEO is
 *     preserved.
 *
 * If either contract regresses (e.g. middleware accidentally removed,
 * matcher misconfigured, GA snippet stripped from index.html), this script
 * exits non-zero so CI / pre-deploy gates catch it.
 *
 * Usage:
 *   HOST=https://rehablookup.com node scripts/check-ua-routing.mjs
 *   HOST=https://<preview>.vercel.app node scripts/check-ua-routing.mjs
 */

const HOST = (process.env.HOST || "https://rehablookup.com").replace(/\/$/, "");

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const CRAWLER_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

// Routes we expect to have BOTH a prerendered `*.html` (for crawlers) AND a
// SPA experience (for browsers). Pick a representative sample across the
// dynamic prefixes so a regression in one cluster shows up.
const ROUTES = [
  "/",
  "/rehab-centers/california",
  "/rehab-centers/california/los-angeles",
  "/treatment-types",
  "/treatment-types/detox-programs",
  "/insurance/aetna-rehab",
  "/concierge",
  "/for-providers",
  "/resources",
];

const failures = [];
const pass = [];

async function get(url, ua) {
  const r = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": ua, Accept: "text/html,*/*" },
  });
  const body = await r.text();
  return { status: r.status, body };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
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

console.log(`\nUA routing smoke — host: ${HOST}\n`);

for (const path of ROUTES) {
  const url = `${HOST}${path}`;

  // ---- Browser path: must serve the SPA + analytics ----
  await check(`browser ${path} → SPA shell with GA + Pixel`, async () => {
    const { status, body } = await get(url, BROWSER_UA);
    assert(status === 200, `status ${status}`);
    assert(/<div\s+id=["']root["']/i.test(body), 'missing <div id="root">');
    assert(body.includes("G-2VB6C1X2MQ"), "missing GA4 tag G-2VB6C1X2MQ");
    assert(/fbq\s*\(\s*['"]init['"]/.test(body), "missing Meta Pixel init");
    // The crawler stub has no <script type="module" src="/assets/...">.
    assert(/<script[^>]+src=["']\/assets\//i.test(body), "missing Vite bundle <script src>");
  });

  // ---- Crawler path: must serve SEO-friendly prerendered HTML ----
  // (skip apex — `/` serves the SPA shell to everyone, by design)
  if (path === "/") continue;

  await check(`crawler ${path} → prerendered SEO HTML`, async () => {
    const { status, body } = await get(url, CRAWLER_UA);
    assert(status === 200, `status ${status}`);
    // Must have a canonical pointing at rehablookup.com
    const canonical = body.match(
      /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i,
    );
    assert(canonical, "missing canonical link");
    assert(
      canonical[1].startsWith("https://rehablookup.com"),
      `canonical points to ${canonical[1]}`,
    );
    // Must have a real <h1> (SEO-relevant)
    assert(/<h1[^>]*>[^<]+<\/h1>/i.test(body), "missing or empty <h1>");
    // Must have JSON-LD structured data
    assert(
      /<script\s+type=["']application\/ld\+json["']/i.test(body),
      "missing JSON-LD",
    );
    // Crawlers must NOT receive the SPA bundle (otherwise we lose the
    // prerendered SEO benefit and middleware is misconfigured).
    assert(
      !/<script[^>]+src=["']\/assets\//i.test(body),
      "crawler received SPA bundle (middleware misrouted)",
    );
  });
}

console.log(`\n────────────────────────────────────────────────────────────`);
console.log(`Passed:   ${pass.length}`);
console.log(`Failed:   ${failures.length}`);
console.log(`────────────────────────────────────────────────────────────\n`);

if (failures.length) {
  console.log("Failures:");
  for (const f of failures) console.log(`  • ${f.name} — ${f.error}`);
  process.exit(1);
}
console.log("✅ UA routing smoke passed.\n");
