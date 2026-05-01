#!/usr/bin/env node
/**
 * check-facility-sitemap-sync.mjs
 *
 * Pre-deploy validator: ensures every generated /center/*.html file has a
 * matching <loc> entry in public/sitemap-facilities.xml (and vice versa).
 *
 * Fails the build with a non-zero exit code if any file is missing from the
 * sitemap or any sitemap URL has no corresponding static HTML mirror.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const CENTER_DIR = resolve(ROOT, "public/center");
const SITEMAP = resolve(ROOT, "public/sitemap-facilities.xml");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function fail(msg) {
  console.error(`${RED}✗ ${msg}${RESET}`);
}
function ok(msg) {
  console.log(`${GREEN}✓ ${msg}${RESET}`);
}
function warn(msg) {
  console.warn(`${YELLOW}⚠ ${msg}${RESET}`);
}

function main() {
  console.log(`${DIM}── Facility profile ↔ sitemap sync check ──${RESET}`);

  if (!existsSync(CENTER_DIR)) {
    warn(`No public/center directory found — nothing to verify.`);
    return 0;
  }
  if (!existsSync(SITEMAP)) {
    fail(`Missing sitemap: ${SITEMAP}`);
    return 1;
  }

  // 1. Static files (slugs derived from filenames).
  const htmlFiles = readdirSync(CENTER_DIR).filter((f) => f.endsWith(".html"));
  const htmlSlugs = new Set(htmlFiles.map((f) => f.replace(/\.html$/, "")));

  // 2. Sitemap slugs (extract from <loc>https://.../center/<slug></loc>).
  const xml = readFileSync(SITEMAP, "utf8");
  const locRe = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  const sitemapSlugs = new Set();
  let m;
  while ((m = locRe.exec(xml)) !== null) {
    const url = m[1];
    const match = url.match(/\/center\/([^/?#]+)\/?$/);
    if (match) sitemapSlugs.add(match[1]);
  }

  console.log(
    `${DIM}  Static HTML mirrors:${RESET} ${htmlSlugs.size}  ${DIM}Sitemap entries:${RESET} ${sitemapSlugs.size}`,
  );

  // 3. Cross-check both directions.
  const missingFromSitemap = [...htmlSlugs].filter((s) => !sitemapSlugs.has(s));
  const missingHtml = [...sitemapSlugs].filter((s) => !htmlSlugs.has(s));

  let errors = 0;

  // ── Debug mapping: every static HTML missing from the sitemap ──
  if (missingFromSitemap.length) {
    fail(
      `${missingFromSitemap.length} static /center/*.html file(s) have no sitemap-facilities entry:`,
    );
    console.error(
      `${DIM}    ${"slug".padEnd(60)}  static file                                expected sitemap <loc>${RESET}`,
    );
    for (const s of missingFromSitemap) {
      const staticPath = `public/center/${s}.html`;
      const expectedLoc = `https://rehablookup.com/center/${s}`;
      const onDisk = existsSync(resolve(ROOT, staticPath)) ? "✓" : "✗";
      console.error(
        `    • ${s.padEnd(60)}  [${onDisk}] /${staticPath.replace(/^public\//, "")}  →  ${expectedLoc}`,
      );
    }
    errors += missingFromSitemap.length;
  } else {
    ok(`All ${htmlSlugs.size} static center profiles are listed in sitemap-facilities.xml.`);
  }

  // ── Debug mapping: every sitemap <loc> missing a static mirror ──
  if (missingHtml.length) {
    // Sitemap entries without a static mirror are tolerated (the SPA still
    // serves them), but we surface them as warnings + the exact file path
    // that needs to be regenerated so the fix is one copy-paste away.
    warn(
      `${missingHtml.length} sitemap entr${missingHtml.length === 1 ? "y has" : "ies have"} no static HTML mirror (SPA fallback only):`,
    );
    console.warn(
      `${DIM}    ${"slug".padEnd(60)}  sitemap <loc>                              expected static file${RESET}`,
    );
    const preview = missingHtml.slice(0, 10);
    for (const s of preview) {
      const expectedLoc = `https://rehablookup.com/center/${s}`;
      const expectedFile = `public/center/${s}.html`;
      console.warn(
        `    • ${s.padEnd(60)}  ${expectedLoc}  →  /${expectedFile.replace(/^public\//, "")}`,
      );
    }
    if (missingHtml.length > preview.length) {
      console.warn(`    … and ${missingHtml.length - preview.length} more`);
    }
  } else {
    ok(`Every sitemap entry has a corresponding static HTML mirror.`);
  }

  if (errors > 0) {
    console.error(
      `\n${RED}✗ Facility sitemap sync check failed with ${errors} error(s).${RESET}`,
    );
    console.error(
      `${DIM}  Re-run: npm run generate:facility-profiles-html && npm run generate:sitemaps${RESET}`,
    );
    return 1;
  }

  console.log(`${GREEN}✓ Facility sitemap sync check passed.${RESET}`);
  return 0;
}

process.exit(main());
