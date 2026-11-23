#!/usr/bin/env node
/**
 * Remove Google Analytics from crawler-only prerendered HTML.
 *
 * middleware.ts serves the prerendered public/ (dist/) HTML to crawlers only;
 * every visitor gets the SPA shell (index.html), which carries the GA4 tag and
 * the RouteChangeTracker. Analytics in crawler-only pages measures bots, not
 * people (GA4 discards known bots anyway), adds a third-party request to every
 * crawl, and was being re-injected on every build by the former
 * backfill-ga-snippet step. It has no effect on crawlability either way; this
 * keeps the crawler documents lean and the analytics data human-only.
 *
 * Kept: public/embed/** (the provider-site widget is a human-facing page).
 *
 * Usage
 *   node scripts/strip-crawler-analytics.mjs            # strip public/ (and dist/ if present)
 *   node scripts/strip-crawler-analytics.mjs --check    # exit 1 if any remain
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const DIRS = ["public", "dist"].map((d) => join(ROOT, d)).filter(existsSync);
const CHECK = process.argv.includes("--check");
const KEEP = [/^(public|dist)\/embed\//];

// The loader tag, any GA comment right before it, and the inline gtag()
// config script right after it (all variants found in the corpus).
const GA_BLOCK =
  /(?:[ \t]*<!--[^>]*?(?:Google Analytics|GA4|gtag)[^>]*?-->\s*)?[ \t]*<script[^>]*\bsrc=["']https:\/\/www\.googletagmanager\.com\/gtag\/js[^"']*["'][^>]*>\s*<\/script>\s*(?:<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?\bgtag\((?:(?!<\/script>)[\s\S])*?<\/script>[ \t]*\n?)?/gi;
// A stray inline config block without the loader (defensive).
const GA_INLINE = /[ \t]*<script\b[^>]*>\s*window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];(?:(?!<\/script>)[\s\S])*?<\/script>[ \t]*\n?/gi;

export function stripAnalytics(html) {
  return html.replace(GA_BLOCK, "").replace(GA_INLINE, "");
}

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let scanned = 0;
  let changed = 0;
  const remaining = [];
  for (const dir of DIRS) {
    for (const file of walk(dir)) {
      const rel = relative(ROOT, file);
      if (KEEP.some((re) => re.test(rel))) continue;
      // dist/index.html is the SPA shell humans load: its GA tag stays.
      if (rel === "dist/index.html") continue;
      scanned++;
      const html = readFileSync(file, "utf8");
      if (!html.includes("googletagmanager.com/gtag") && !html.includes("window.dataLayer")) continue;
      if (CHECK) {
        remaining.push(rel);
        continue;
      }
      const out = stripAnalytics(html);
      if (out !== html) {
        writeFileSync(file, out);
        changed++;
      }
      if (out.includes("googletagmanager.com/gtag")) remaining.push(rel);
    }
  }
  if (CHECK) {
    if (remaining.length) {
      console.error(`✗ check-crawler-analytics: ${remaining.length} crawler-only HTML file(s) still load Google Analytics, e.g.\n  ${remaining.slice(0, 10).join("\n  ")}`);
      process.exit(1);
    }
    console.log(`✓ check-crawler-analytics: ${scanned} crawler-only HTML files carry no analytics`);
  } else {
    console.log(`strip-crawler-analytics: ${changed} of ${scanned} files cleaned${remaining.length ? `; ${remaining.length} still contain a GA tag` : ""}`);
    if (remaining.length) {
      console.error(`  e.g. ${remaining.slice(0, 5).join(", ")}`);
      process.exit(1);
    }
  }
}
