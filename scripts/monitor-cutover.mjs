#!/usr/bin/env node
/**
 * Live post-cutover monitor.
 *
 * Crawls a fixed set of high-value URLs against the production apex and
 * fails if any return non-200 (excluding documented 301s) or if pre-rendered
 * pages return the SPA shell instead of the per-page HTML.
 *
 * Run at: T+0, T+15min, T+1h, T+6h, T+24h, T+7d after DNS cutover.
 *
 * Usage:
 *   node scripts/monitor-cutover.mjs --host https://rehablookup.com
 *
 * Exit code 0 = all green, 1 = at least one regression.
 */

const argv = process.argv.slice(2);
const get = (k, d) => { const i = argv.indexOf(`--${k}`); return i === -1 ? d : argv[i + 1]; };
const HOST = (get("host", "https://rehablookup.com") || "").replace(/\/$/, "");
const UA = "Mozilla/5.0 (compatible; RehabLookupCutoverMonitor/1.0)";
const BOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

// (path, expectedStatus, mustContain[])
const CHECKS = [
  ["/", 200, ["RehabLookup", "</html>"]],
  ["/rehab-centers", 200, ["rehab-centers"]],
  ["/rehab-centers/california", 200, ["California"]],
  ["/treatment-types", 200, ["treatment-types"]],
  ["/treatment-types/detox-programs", 200, ["detox"]],
  ["/insurance", 200, ["insurance"]],
  ["/insurance/aetna-rehab", 200, ["Aetna"]],
  ["/concierge", 200, ["concierge"]],
  ["/about", 200, ["About"]],
  ["/sitemap-index.xml", 200, ["<sitemapindex"]],
  ["/sitemap.xml", 200, ["<urlset"]],
  ["/sitemap-facilities.xml", 200, ["<urlset"]],
  ["/robots.txt", 200, ["Sitemap:"]],
  // 301 redirects from vercel.json — verify they fire server-side
  ["/blog", 301, []],
  ["/centers", 301, []],
  ["/privacy", 301, []],
];

const WWW_REDIRECT = ["https://www.rehablookup.com/", 301];

let failures = 0;

async function check(path, expectedStatus, mustContain, ua = UA) {
  const url = path.startsWith("http") ? path : `${HOST}${path}`;
  try {
    const r = await fetch(url, { headers: { "user-agent": ua }, redirect: "manual" });
    const status = r.status;
    let body = "";
    if (status >= 200 && status < 300 && expectedStatus < 300) body = await r.text();

    const statusOk = status === expectedStatus;
    const containsOk = mustContain.every((s) => body.includes(s));

    const ok = statusOk && containsOk;
    const tag = ok ? "✅" : "❌";
    const detail = !statusOk ? `expected ${expectedStatus} got ${status}` : (!containsOk ? `body missing required substring` : "");
    console.log(`${tag} ${ua === BOT_UA ? "[bot]" : "     "} ${path.padEnd(45)} ${status}${detail ? "  " + detail : ""}`);
    if (!ok) failures++;
  } catch (e) {
    console.log(`❌ ${path.padEnd(45)} ERROR ${e.message}`);
    failures++;
  }
}

console.log(`\n🔎 Cutover monitor — ${HOST}  ${new Date().toISOString()}\n`);

for (const [p, st, mc] of CHECKS) await check(p, st, mc);

// Sanity: bot UA on pre-rendered pages must see same content as browser UA
console.log(`\n  Bot-UA sanity (Googlebot)`);
for (const [p, st, mc] of [["/", 200, ["RehabLookup"]], ["/rehab-centers/california", 200, ["California"]]]) {
  await check(p, st, mc, BOT_UA);
}

// www → apex
await check(WWW_REDIRECT[0], WWW_REDIRECT[1], []);

console.log(`\n${failures === 0 ? "✅" : "❌"} ${failures} failure(s)\n`);
process.exit(failures === 0 ? 0 : 1);
