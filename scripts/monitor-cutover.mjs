#!/usr/bin/env node
/**
 * Cutover monitor (pre- or post-DNS-switch).
 *
 * Crawls a fixed set of high-value URLs and asserts status + body content.
 * Phase-aware:
 *   --phase=pre   → asserts the *current* (Lovable) hosting baseline:
 *                   redirects that are configured in vercel.json but not yet
 *                   live still return 200 (SPA fallback) and www→apex returns
 *                   the current 302. Used for T-7d rehearsal.
 *   --phase=post  → asserts the *target* (Vercel) state: every documented
 *                   redirect must be a server-side 301 and www→apex 301.
 *                   Used at T+0, T+15m, T+1h, T+6h, T+24h, T+7d.
 *
 * Usage:
 *   node scripts/monitor-cutover.mjs --host https://rehablookup.com --phase pre
 *   node scripts/monitor-cutover.mjs --host https://rehablookup.com --phase post
 *
 * Exit code 0 = all green for the requested phase, 1 = at least one regression.
 */

const argv = process.argv.slice(2);
const get = (k, d) => { const i = argv.indexOf(`--${k}`); return i === -1 ? d : argv[i + 1]; };
const HOST = (get("host", "https://rehablookup.com") || "").replace(/\/$/, "");
const PHASE = (get("phase", "post") || "post").toLowerCase();
if (!["pre", "post"].includes(PHASE)) {
  console.error(`Invalid --phase=${PHASE}. Use 'pre' or 'post'.`);
  process.exit(2);
}
const UA = "Mozilla/5.0 (compatible; RehabLookupCutoverMonitor/1.0)";
const BOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

// Always-true checks (must pass in both pre and post phases)
const ALWAYS = [
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
];

// Redirects configured in vercel.json. In pre-phase these still resolve via
// SPA on Lovable (200); in post-phase they must be server 301s.
const REDIRECTS = [
  ["/blog", 301],
  ["/centers", 301],
  ["/privacy", 301],
];

// www → apex: Lovable currently returns 302, Vercel returns 301.
const WWW = "https://www.rehablookup.com/";

let failures = 0;

async function check(path, expectedStatus, mustContain, ua = UA, label = "") {
  const url = path.startsWith("http") ? path : `${HOST}${path}`;
  try {
    const r = await fetch(url, { headers: { "user-agent": ua }, redirect: "manual" });
    const status = r.status;
    let body = "";
    if (status >= 200 && status < 300 && expectedStatus < 300) body = await r.text();

    const statusOk = Array.isArray(expectedStatus)
      ? expectedStatus.includes(status)
      : status === expectedStatus;
    const containsOk = mustContain.every((s) => body.includes(s));

    const ok = statusOk && containsOk;
    const tag = ok ? "✅" : "❌";
    const detail = !statusOk
      ? `expected ${Array.isArray(expectedStatus) ? expectedStatus.join("|") : expectedStatus} got ${status}`
      : (!containsOk ? `body missing required substring` : "");
    const lead = ua === BOT_UA ? "[bot]" : "     ";
    console.log(`${tag} ${lead} ${(label || path).padEnd(45)} ${status}${detail ? "  " + detail : ""}`);
    if (!ok) failures++;
  } catch (e) {
    console.log(`❌ ${(label || path).padEnd(45)} ERROR ${e.message}`);
    failures++;
  }
}

console.log(`\n🔎 Cutover monitor [${PHASE}] — ${HOST}  ${new Date().toISOString()}\n`);

for (const [p, st, mc] of ALWAYS) await check(p, st, mc);

console.log(`\n  Redirects (phase=${PHASE})`);
for (const [p, postStatus] of REDIRECTS) {
  // pre-phase: Lovable serves SPA fallback (200) — redirect not yet live.
  // post-phase: Vercel must serve a server-side 301.
  const expected = PHASE === "pre" ? 200 : postStatus;
  await check(p, expected, []);
}

console.log(`\n  Bot-UA sanity (Googlebot)`);
for (const [p, st, mc] of [["/", 200, ["RehabLookup"]], ["/rehab-centers/california", 200, ["California"]]]) {
  await check(p, st, mc, BOT_UA);
}

// www → apex: only meaningful when testing the apex host itself. The host
// rule matches `www.rehablookup.com`; when --host points at a *.vercel.app
// preview the rule can never match, so skip rather than emit a false negative.
const isPreviewHost = /\.vercel\.app$/i.test(new URL(HOST).hostname);
if (isPreviewHost) {
  console.log(`\n  www → apex                                    SKIP  (preview host — rule only fires on apex DNS)`);
} else {
  const wwwExpected = PHASE === "pre" ? [301, 302] : 301;
  await check(WWW, wwwExpected, [], UA, "www → apex");
}

console.log(`\n${failures === 0 ? "✅" : "❌"} ${failures} failure(s) [phase=${PHASE}]\n`);
if (failures === 0 && PHASE === "pre") {
  console.log(`  ℹ️  Pre-cutover baseline clean. After DNS flip, re-run with --phase=post.`);
}
process.exit(failures === 0 ? 0 : 1);
