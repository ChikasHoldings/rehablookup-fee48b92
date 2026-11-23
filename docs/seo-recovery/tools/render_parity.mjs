#!/usr/bin/env node
/**
 * render_parity.mjs — compare what a crawler receives with what a visitor sees.
 *
 * Production routing (middleware.ts): a crawler user agent gets the prerendered
 * dist/<path>.html; every other client gets the SPA shell and React renders the
 * route. This harness reproduces both locally from a production build:
 *
 *   crawler view  = dist/<path>.html as served (static file, no JavaScript)
 *   visitor view  = dist/index.html for every route, rendered in Chromium
 *
 * and reports title / canonical / robots / H1 / word count / facility-link and
 * internal-link counts / JSON-LD types side by side.
 *
 * Limits (stated in the output): this is a local reproduction of the routing
 * rule, not a fetch of production, and it uses a browser user agent for the
 * visitor view. It is NOT proof of what verified Googlebot receives in
 * production — only GSC URL Inspection can show that.
 *
 * Usage: node render_parity.mjs <dist_dir> <out.json> <path> [<path> …]
 */
import http from "node:http";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const [dist, outFile, ...paths] = process.argv.slice(2);
const TYPES = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png",
  ".webp": "image/webp", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".json": "application/json", ".woff2": "font/woff2" };

function serveSpa(req, res) {
  const u = new URL(req.url, "http://x");
  const file = path.join(dist, decodeURIComponent(u.pathname));
  if (path.extname(u.pathname) && existsSync(file)) {
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    return res.end(readFileSync(file));
  }
  res.writeHead(200, { "content-type": "text/html" });
  res.end(readFileSync(path.join(dist, "index.html")));
}

function extract(html) {
  const pick = (re) => (re.exec(html)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  const text = body.replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  const ld = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const types = new Set();
  for (const block of ld) for (const t of block.matchAll(/"@type"\s*:\s*(\[[^\]]*\]|"[^"]+")/g)) types.add(t[1].replace(/[\[\]"\s]/g, ""));
  const hrefs = [...body.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
  return {
    title: pick(/<title[^>]*>([\s\S]*?)<\/title>/i),
    canonical: pick(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i),
    robots: pick(/<meta[^>]+name="robots"[^>]+content="([^"]+)"/i),
    h1: pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, "").trim(),
    words: text.split(/\s+/).filter(Boolean).length,
    facilityLinks: new Set(hrefs.filter((h) => h.startsWith("/center/"))).size,
    internalLinks: new Set(hrefs).size,
    jsonLdTypes: [...types].sort(),
  };
}

const server = http.createServer(serveSpa).listen(0);
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const results = [];
for (const p of paths) {
  const file = path.join(dist, p === "/" ? "index.html" : `${p}.html`);
  const crawler = existsSync(file) ? extract(readFileSync(file, "utf8")) : { missing: true };
  let visitor;
  try {
    await page.goto(`http://127.0.0.1:${port}${p}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);
    visitor = extract(await page.content());
    visitor.finalPath = new URL(page.url()).pathname;
  } catch (e) {
    visitor = { error: String(e).slice(0, 200) };
  }
  results.push({ path: p, crawler, visitor });
  console.log(`\n${p}`);
  for (const k of ["title", "canonical", "robots", "h1", "words", "facilityLinks", "internalLinks"]) {
    console.log(`  ${k.padEnd(14)} crawler: ${String(crawler[k] ?? (crawler.missing ? "(no prerendered file)" : "")).slice(0, 90)}`);
    console.log(`  ${"".padEnd(14)} visitor: ${String(visitor[k] ?? visitor.error ?? "").slice(0, 90)}`);
  }
  console.log(`  jsonLd         crawler: ${(crawler.jsonLdTypes ?? []).join(",")}\n                 visitor: ${(visitor.jsonLdTypes ?? []).join(",")}`);
  if (visitor.finalPath && visitor.finalPath !== p) console.log(`  visitor redirected → ${visitor.finalPath}`);
}
await browser.close();
server.close();
writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), note: "local reproduction of middleware routing; not a production fetch", results }, null, 1));
