#!/usr/bin/env node
/**
 * render-crawler-snapshots — give crawlers the same page visitors see.
 *
 * Why
 * ---
 * middleware.ts serves crawlers prerendered HTML and serves humans the React
 * SPA. The prerendered HTML came from Node generators that never run the React
 * app, so for most templates Google indexed a thinner, different page (ADR-001:
 * crawler 171–437 words vs visitor 1,400–4,700 on hubs, states, cities, guides).
 *
 * What this does
 * --------------
 * After `vite build`, it serves dist/ locally, opens each selected route in a
 * headless browser exactly as a visitor would (same SPA shell, same live data
 * from Supabase), waits for the page to finish rendering, and writes that
 * document over dist/<path>.html — the file middleware.ts hands to crawlers.
 * The homepage, which middleware serves as the bare SPA shell, is written to
 * dist/_crawler-home.html and served to crawlers from there.
 *
 * The snapshot keeps the app's own scripts, so a crawler that runs JavaScript
 * ends up with the same React page; one that doesn't still gets the full
 * content. Analytics tags are removed (crawler-only HTML carries no analytics).
 *
 * Safety
 * ------
 * A snapshot is written only when it passes every check below; otherwise the
 * generator HTML stays in place and the reason is reported:
 *   - the page did not client-redirect elsewhere,
 *   - it has a real <title> and an <h1>, and no error/"not found" state,
 *   - its canonical is the route's own URL,
 *   - it is not noindex where the generator page was indexable,
 *   - it is not thinner than the generator page it replaces.
 *
 * Usage
 *   node scripts/render-crawler-snapshots.mjs [--paths /a,/b] [--families x,y]
 *        [--facilities] [--limit N] [--concurrency N] [--dry-run]
 * Env
 *   SNAPSHOT_REQUIRED=1   fail (exit 1) if no browser can start or fewer than
 *                         SNAPSHOT_MIN_SUCCESS (default 0.8) of routes pass
 *   SNAPSHOT_SKIP=1       do nothing (emergency switch)
 *   CHROMIUM_PATH         explicit browser binary (else Playwright's own, see
 *                         scripts/prepare-snapshot-browser.sh)
 */
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { selectSnapshotRoutes, sitemapPaths } from "./_crawler-snapshot-routes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const SITE = "https://rehablookup.com";
export const HOME_SNAPSHOT_FILE = "_crawler-home.html";
const SHELL_TITLE = "Find Trusted Addiction Treatment Centers | RehabLookup";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};

const DRY_RUN_EARLY = flag("dry-run");
if (!existsSync(path.join(DIST, "index.html"))) {
  console.error("[crawler-snapshots] dist/index.html missing — run vite build first.");
  process.exit(1);
}

// middleware.ts rewrites crawler requests for "/" to this file, so it must
// exist even when rendering is skipped or fails: start from the SPA shell
// (minus analytics), and replace it below if the homepage renders.
{
  const homeFile = path.join(DIST, HOME_SNAPSHOT_FILE);
  const shell = readFileSync(path.join(DIST, "index.html"), "utf8")
    .replace(/[ \t]*<script[^>]*googletagmanager\.com\/gtag\/js[^>]*><\/script>\s*/gi, "")
    .replace(/[ \t]*<script>(?:(?!<\/script>)[\s\S])*?\bgtag\((?:(?!<\/script>)[\s\S])*?<\/script>\s*/gi, "");
  if (!DRY_RUN_EARLY) writeFileSync(homeFile, shell);
}

if (process.env.SNAPSHOT_SKIP === "1") {
  console.log("[crawler-snapshots] SNAPSHOT_SKIP=1 — generator HTML left in place (homepage: SPA shell).");
  process.exit(0);
}

const REQUIRED = process.env.SNAPSHOT_REQUIRED === "1";
const MIN_SUCCESS = Number(process.env.SNAPSHOT_MIN_SUCCESS || 0.8);
const CONCURRENCY = Number(opt("concurrency", Math.min(8, os.cpus().length * 2)));
const LIMIT = Number(opt("limit", 0));
const DRY = flag("dry-run");

// ── Route selection ──────────────────────────────────────────────────────────
function selectRoutes() {
  const explicit = opt("paths", "");
  if (explicit) return explicit.split(",").filter(Boolean).map((p) => ({ path: p, family: "explicit" }));
  const advertised = [];
  for (const f of ["sitemap.xml", "sitemap-extras.xml", "sitemap-facilities.xml"]) {
    const file = path.join(DIST, f);
    if (existsSync(file)) advertised.push(...sitemapPaths(readFileSync(file, "utf8")));
  }
  // City hubs with listings are crawlable and linked from state pages, but
  // the sitemap generator advertises only a few dozen of them. Include every
  // city hub whose crawler page already lists facilities.
  const stateDirs = path.join(DIST, "rehab-centers");
  if (existsSync(stateDirs)) {
    for (const state of readdirSync(stateDirs, { withFileTypes: true })) {
      if (!state.isDirectory()) continue;
      for (const f of readdirSync(path.join(stateDirs, state.name))) {
        if (!f.endsWith(".html")) continue;
        const html = readFileSync(path.join(stateDirs, state.name, f), "utf8");
        if (html.includes('href="/center/')) advertised.push(`/rehab-centers/${state.name}/${f.slice(0, -5)}`);
      }
    }
  }
  const families = opt("families", "");
  let routes = selectSnapshotRoutes(advertised, {
    facilities: flag("facilities"),
    families: families ? families.split(",") : undefined,
  });
  if (LIMIT > 0) routes = routes.slice(0, LIMIT);
  return routes;
}

// ── Local server: dist assets + the SPA shell for every route ────────────────
const TYPES = {
  ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff",
  ".txt": "text/plain", ".xml": "application/xml",
};
const SHELL = readFileSync(path.join(DIST, "index.html"));
function serve(req, res) {
  const u = new URL(req.url, "http://localhost");
  const ext = path.extname(u.pathname);
  const file = path.join(DIST, decodeURIComponent(u.pathname));
  if (ext && ext !== ".html" && file.startsWith(DIST) && existsSync(file)) {
    res.writeHead(200, { "content-type": TYPES[ext] ?? "application/octet-stream" });
    return res.end(readFileSync(file));
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(SHELL);
}

// ── Browser launch (local Playwright browser, else a bundled Chromium) ──────
async function launchBrowser() {
  const { chromium } = await import("@playwright/test");
  const attempts = [];
  if (process.env.CHROMIUM_PATH) attempts.push(["CHROMIUM_PATH", { executablePath: process.env.CHROMIUM_PATH }]);
  // Playwright's own browser (provisioned on Vercel by prepare-snapshot-browser.sh).
  attempts.push(["playwright", {}]);
  const errors = [];
  for (const [via, options] of attempts) {
    try {
      const browser = await chromium.launch({ headless: true, ...options });
      return { browser, via };
    } catch (e) {
      errors.push(`${via}: ${String(e?.message ?? e).split("\n")[0].slice(0, 200)}`);
    }
  }
  return { browser: null, errors };
}

// ── Page checks ──────────────────────────────────────────────────────────────
function textWords(html) {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  return body
    .replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}
const isNoindex = (html) =>
  /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
const ERROR_STATE = /(Content Temporarily Unavailable|Something went wrong|Page Not Found|This page could not be found|Failed to load)/i;

function targetFiles(route) {
  if (route === "/") return [path.join(DIST, HOME_SNAPSHOT_FILE)];
  const files = [path.join(DIST, `${route}.html`)];
  const dirIndex = path.join(DIST, route, "index.html");
  if (existsSync(dirIndex)) files.push(dirIndex);
  return files;
}

/** Resolve once no request has been in flight for `quietMs` (or on timeout). */
function trackNetwork(page) {
  let inflight = 0;
  let lastChange = Date.now();
  const bump = (d) => () => {
    inflight = Math.max(0, inflight + d);
    lastChange = Date.now();
  };
  page.on("request", bump(1));
  page.on("requestfinished", bump(-1));
  page.on("requestfailed", bump(-1));
  return async (quietMs = 400, timeout = 20000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (inflight === 0 && Date.now() - lastChange >= quietMs) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  };
}

/**
 * Render `route` in `page` and return the cleaned, validated document.
 * mode "load": a fresh page load, as a visitor's first request.
 * mode "nav":  an in-app navigation from the already-loaded app (React Router
 *              popstate) — same components and data, without re-parsing the
 *              bundle; any snapshot that does not validate is redone with "load".
 */
async function capture(page, quiet, port, route, mode) {
  const expected = route === "/" ? `${SITE}/` : `${SITE}${route}`;
  try {
    if (mode === "load") {
      const resp = await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      if (!resp || resp.status() >= 400) return { ok: false, reason: `http ${resp?.status()}` };
      await page.waitForSelector("h1", { timeout: 20000 }).catch(() => {});
    } else {
      await page.evaluate((r) => {
        window.scrollTo(0, 0);
        window.history.pushState({}, "", r);
        window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
      }, route);
      const arrived = await page
        .waitForFunction(
          (exp) => {
            const c = document.querySelector("link[rel='canonical']");
            return !!(c && c.href.replace(/\/$/, "") === exp.replace(/\/$/, "") && document.querySelector("h1"));
          },
          expected,
          { timeout: 15000 },
        )
        .then(() => true)
        .catch(() => false);
      if (!arrived) return { ok: false, reason: "nav: page did not settle" };
    }
    await quiet();
    // Sections below the fold load when scrolled into view (IntersectionObserver),
    // as they do for a visitor who reads the page: scroll through it once.
    await page.evaluate(async () => {
      const step = Math.max(600, Math.floor(window.innerHeight * 0.9));
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await quiet();
    await page
      .waitForFunction(() => !document.querySelector("main .animate-pulse, [aria-busy='true']"), null, { timeout: 4000 })
      .catch(() => {});

    const finalPath = new URL(page.url()).pathname.replace(/\/+$/, "") || "/";
    if (finalPath !== route) return { ok: false, reason: `client redirect → ${finalPath}` };

    // Clean the document in place: analytics out; Helmet's per-page tags win
    // over the SPA shell's static defaults (no duplicate description/robots/og).
    await page.evaluate(() => {
      for (const s of document.querySelectorAll("script")) {
        const src = s.getAttribute("src") || "";
        if (/googletagmanager\.com|google-analytics\.com|connect\.facebook\.net/.test(src)) s.remove();
        else if (!src && /\bgtag\(|dataLayer|fbq\(/.test(s.textContent || "")) s.remove();
      }
      const keyOf = (el) => {
        if (el.tagName === "LINK") return el.getAttribute("rel") === "canonical" ? "link:canonical" : null;
        if (el.getAttribute("name")) return `name:${el.getAttribute("name").toLowerCase()}`;
        if (el.getAttribute("property")) return `prop:${el.getAttribute("property").toLowerCase()}`;
        return null;
      };
      const managed = new Set([...document.head.querySelectorAll("[data-rh]")].map(keyOf).filter(Boolean));
      for (const el of document.head.querySelectorAll("meta, link[rel='canonical']")) {
        if (!el.hasAttribute("data-rh") && managed.has(keyOf(el))) el.remove();
      }
    });

    let html = await page.content();
    const title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").trim();
    const canonical = /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.exec(html)?.[1]
      ?? /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i.exec(html)?.[1];
    const h1 = /<h1[\s>]/i.test(html);
    const words = textWords(html);

    if (!title || (route !== "/" && title === SHELL_TITLE)) return { ok: false, reason: "no page title" };
    if (!h1) return { ok: false, reason: "no h1" };
    const bodyText = /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ?? "";
    const errorHit = ERROR_STATE.exec(title) ?? ERROR_STATE.exec(bodyText.replace(/<[^>]+>/g, " ").slice(0, 6000));
    if (errorHit) return { ok: false, reason: `error state: ${errorHit[0]}` };
    if (!canonical || canonical.replace(/\/$/, "") !== expected.replace(/\/$/, "")) {
      return { ok: false, reason: `canonical ${canonical ?? "missing"}` };
    }

    const [primary] = targetFiles(route);
    const generator = existsSync(primary) ? readFileSync(primary, "utf8") : null;
    if (isNoindex(html) && generator && !isNoindex(generator)) return { ok: false, reason: "SPA noindex vs indexable generator page" };
    const generatorWords = generator ? textWords(generator) : 0;
    if (words < 150 || words < generatorWords * 0.8) return { ok: false, reason: `thin (${words} vs generator ${generatorWords})` };

    html = html.replace(
      /<head([^>]*)>/i,
      `<head$1>\n<!-- Crawler snapshot of the live page (scripts/render-crawler-snapshots.mjs) -->`,
    );
    return { ok: true, html, words, generatorWords };
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e).split("\n")[0].slice(0, 160) };
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
const routes = selectRoutes();
const started = Date.now();
console.log(`[crawler-snapshots] ${routes.length} routes selected (concurrency ${CONCURRENCY}${DRY ? ", dry run" : ""})`);

const { browser, via, errors } = await launchBrowser();
if (!browser) {
  console.warn(`[crawler-snapshots] ⚠ no browser could start — generator HTML left in place.\n  ${errors.join("\n  ")}`);
  process.exit(REQUIRED ? 1 : 0);
}
console.log(`[crawler-snapshots] browser via ${via}`);

const server = http.createServer(serve).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const port = server.address().port;

const BLOCK_TYPES = new Set(["image", "media", "font"]);
const BLOCK_HOSTS = /googletagmanager|google-analytics|doubleclick|facebook|sentry|stripe|hotjar|clarity/;
const contexts = await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0 Safari/537.36 RehabLookupSnapshot",
    });
    await ctx.route("**/*", (r) => {
      const req = r.request();
      if (BLOCK_TYPES.has(req.resourceType()) || BLOCK_HOSTS.test(new URL(req.url()).hostname)) return r.abort();
      return r.continue();
    });
    return ctx;
  }),
);

const results = [];
let next = 0;
let viaNav = 0;
await Promise.all(
  contexts.map(async (ctx) => {
    let page = await ctx.newPage();
    let quiet = trackNetwork(page);
    let warm = false;
    while (next < routes.length) {
      const route = routes[next++];
      const t0 = Date.now();
      let r = warm ? await capture(page, quiet, port, route.path, "nav") : null;
      if (r?.ok) viaNav++;
      if (!r?.ok) {
        // Fresh page for a full load so no state carries over from the last route.
        await page.close().catch(() => {});
        page = await ctx.newPage();
        quiet = trackNetwork(page);
        r = await capture(page, quiet, port, route.path, "load");
      }
      warm = r.ok;
      results.push({ ...route, ok: r.ok, reason: r.reason, words: r.words, generatorWords: r.generatorWords, ms: Date.now() - t0 });
      if (r.ok && !DRY) {
        for (const file of targetFiles(route.path)) {
          mkdirSync(path.dirname(file), { recursive: true });
          writeFileSync(file, r.html);
        }
      }
      if (results.length % 250 === 0) console.log(`[crawler-snapshots] ${results.length}/${routes.length}…`);
    }
    await page.close().catch(() => {});
  }),
);
await browser.close();
server.close();

// ── Report ───────────────────────────────────────────────────────────────────
const byFamily = {};
for (const r of results) {
  const f = (byFamily[r.family] ??= { ok: 0, kept: 0 });
  r.ok ? f.ok++ : f.kept++;
}
const ok = results.filter((r) => r.ok).length;
const reasons = {};
for (const r of results) if (!r.ok) reasons[r.reason.replace(/\d+/g, "N")] = (reasons[r.reason.replace(/\d+/g, "N")] ?? 0) + 1;
console.log(`[crawler-snapshots] ${ok}/${results.length} snapshots written in ${Math.round((Date.now() - started) / 1000)}s (${viaNav} via in-app navigation)`);
for (const [f, c] of Object.entries(byFamily)) console.log(`  ${f.padEnd(20)} snapshot ${c.ok}  kept generator ${c.kept}`);
for (const [reason, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  kept (${n}): ${reason}`);
const reportDir = path.join(ROOT, "node_modules", ".cache", "crawler-snapshots");
mkdirSync(reportDir, { recursive: true });
writeFileSync(path.join(reportDir, "report.json"), JSON.stringify({ via, results }, null, 1));

const ratio = results.length ? ok / results.length : 1;
if (REQUIRED && ratio < MIN_SUCCESS) {
  console.error(`[crawler-snapshots] ✗ only ${(ratio * 100).toFixed(1)}% of routes passed (minimum ${MIN_SUCCESS * 100}%).`);
  process.exit(1);
}
