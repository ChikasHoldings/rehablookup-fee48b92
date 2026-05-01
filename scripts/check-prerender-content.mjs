#!/usr/bin/env node
/**
 * Pre-deploy validator: every sitemap URL must resolve to a page-specific
 * prerendered HTML file (NOT the SPA shell).
 *
 * Why: when a sitemap URL falls back to the SPA shell, Google sees the
 * homepage title/canonical/H1 for every "page" and either:
 *   - drops the URL as a duplicate of /, or
 *   - indexes it with the wrong title/description.
 * Either way crawl budget is wasted and rankings collapse.
 *
 * What this checks for every <loc> in public/sitemap*.xml:
 *   1. A prerendered file exists at BOTH supported layouts on disk:
 *        - public/<path>.html      (flat / clean URL on Vercel)
 *        - public/<path>/index.html (nested / trailing-slash variant)
 *      We only require ONE of the two, but track which is missing.
 *   2. The file is NOT the SPA shell. We detect leaks via:
 *        a) shell <title> verbatim ("Find Trusted Addiction Treatment …")
 *        b) shell H1 class .ns-h1 (only present in /index.html)
 *        c) absence of <link rel="canonical">
 *   3. The canonical href in the file matches the sitemap URL.
 *   4. Title is page-specific (not the shell title).
 *   5. There is at least one <h1>…</h1> with non-empty text.
 *
 * Layout-coverage check (clean URL + .html parity):
 *   Vercel routes /foo to public/foo.html OR public/foo/index.html. To make
 *   redirects, social shares, and trailing-slash variants all hit a page-
 *   specific HTML, we verify BOTH layouts exist for every sitemap URL.
 *   Missing-layout entries are reported as warnings (not failures) unless
 *   --strict-layouts is passed.
 *
 * Usage:
 *   node scripts/check-prerender-content.mjs                # warns on missing layouts
 *   node scripts/check-prerender-content.mjs --strict-layouts
 *   node scripts/check-prerender-content.mjs --json         # machine-readable summary
 *
 * Wire into package.json:
 *   "check:prerender-content": "node scripts/check-prerender-content.mjs"
 *   ...add to the build chain after generate:sitemaps + validate:sitemap-robots.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");
const CANONICAL_HOST = "https://rehablookup.com";

const STRICT_LAYOUTS = process.argv.includes("--strict-layouts");
const JSON_OUTPUT = process.argv.includes("--json");

// SPA shell signatures — any of these in a "prerendered" file means the file
// is actually the shell and Google will see the homepage instead of the page.
const SHELL_TITLE = "Find Trusted Addiction Treatment Centers | RehabLookup";
const SHELL_H1 = "Find Trusted Addiction Treatment Centers Near You";
const SHELL_H1_CLASS = "ns-h1"; // only present in the SPA shell skeleton

// --------------------------------------------------------------------------
// Sitemap URL collection
// --------------------------------------------------------------------------
function readSitemapUrls() {
  const urls = new Map(); // pathname → array of source sitemap files
  if (!existsSync(PUBLIC_DIR)) return urls;
  const sitemaps = readdirSync(PUBLIC_DIR).filter((f) =>
    /^sitemap.*\.xml$/i.test(f)
  );
  for (const f of sitemaps) {
    // Skip the index — it lists sitemaps, not page URLs.
    if (/sitemap-?index\.xml$/i.test(f)) continue;
    const xml = readFileSync(join(PUBLIC_DIR, f), "utf8");
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      let pathname;
      try {
        pathname = new URL(m[1]).pathname;
      } catch {
        continue;
      }
      // Normalize: lowercase, no trailing slash (except root).
      pathname = pathname.toLowerCase().replace(/\/+$/, "") || "/";
      const list = urls.get(pathname) ?? [];
      list.push(f);
      urls.set(pathname, list);
    }
  }
  return urls;
}

// --------------------------------------------------------------------------
// File resolution
// --------------------------------------------------------------------------
function resolveLayouts(pathname) {
  // Root maps to index.html (the SPA shell, intentionally — that IS the home).
  if (pathname === "/") {
    const root = join(PUBLIC_DIR, "index.html");
    return { flat: null, nested: existsSync(root) ? root : null };
  }
  const rel = pathname.replace(/^\//, "");
  const flat = join(PUBLIC_DIR, `${rel}.html`);
  const nested = join(PUBLIC_DIR, rel, "index.html");
  return {
    flat: existsSync(flat) ? flat : null,
    nested: existsSync(nested) ? nested : null,
  };
}

// --------------------------------------------------------------------------
// Per-file content validation
// --------------------------------------------------------------------------
function validateFile(file, expectedPathname) {
  const html = readFileSync(file, "utf8");
  const head = html.slice(0, 16000);

  // The homepage IS the SPA shell — its title/H1/canonical signatures match
  // by design. Skip shell-leak checks for "/" but still require the file
  // to exist and have a title + H1.
  const isHomepage = expectedPathname === "/";

  const titleMatch = head.match(/<title[^>]*>\s*([^<]+?)\s*<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  const canonicalMatch = head.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
  );
  const canonical = canonicalMatch ? canonicalMatch[1].trim() : null;

  // Find first H1 with non-empty text. Allow attributes on the tag.
  const h1Match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Text = h1Match
    ? h1Match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
    : null;
  const h1HasShellClass = h1Match
    ? new RegExp(`<h1\\b[^>]*class=["'][^"']*\\b${SHELL_H1_CLASS}\\b`, "i").test(
        h1Match[0]
      )
    : false;

  const errors = [];

  // 1) Shell-leak detection
  if (title && title === SHELL_TITLE) {
    errors.push("Title equals SPA shell title — page leaked the shell.");
  }
  if (h1Text && h1Text === SHELL_H1) {
    errors.push("H1 text equals SPA shell H1 — page leaked the shell.");
  }
  if (h1HasShellClass) {
    errors.push("H1 carries the shell-only `.ns-h1` class.");
  }

  // 2) Canonical present + matches expected URL
  if (!canonical) {
    errors.push("Missing <link rel=\"canonical\"> in <head>.");
  } else {
    let canonicalPath;
    try {
      canonicalPath = new URL(canonical).pathname.toLowerCase().replace(/\/+$/, "") || "/";
    } catch {
      errors.push(`Invalid canonical URL: ${canonical}`);
    }
    if (canonicalPath && canonicalPath !== expectedPathname) {
      errors.push(
        `Canonical points to "${canonicalPath}", expected "${expectedPathname}".`
      );
    }
  }

  // 3) Title sanity
  if (!title) {
    errors.push("Missing <title> tag.");
  }

  // 4) H1 sanity
  if (!h1Text) {
    errors.push("Missing or empty <h1> in body.");
  }

  return { errors, title, canonical, h1Text };
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------
function main() {
  const urls = readSitemapUrls();
  if (!urls.size) {
    console.error(
      "❌ No sitemap URLs found. Run `npm run generate:sitemaps` first."
    );
    process.exit(1);
  }

  const failures = []; // hard failures: shell leak, missing canonical, etc.
  const layoutWarnings = []; // missing one of two layouts (warn unless --strict-layouts)
  const layoutFailures = []; // BOTH layouts missing (always a hard failure)
  const ok = [];

  for (const [pathname, sources] of urls) {
    const { flat, nested } = resolveLayouts(pathname);

    // Both missing → URL is in the sitemap but no prerender exists at all.
    if (!flat && !nested) {
      layoutFailures.push({ pathname, sources });
      continue;
    }

    // Validate at least the file we have. Prefer nested (index.html) since
    // that is what GoogleBot sees on a trailing-slash hit; flat is what it
    // sees on a clean-URL hit. Validate BOTH if both exist so that a file
    // that drifted out of sync is caught.
    const filesToCheck = [flat, nested].filter(Boolean);
    let fileFailures = [];
    let firstSnapshot = null;
    for (const file of filesToCheck) {
      const result = validateFile(file, pathname);
      if (!firstSnapshot) firstSnapshot = result;
      if (result.errors.length) {
        fileFailures.push({ file, errors: result.errors });
      }
    }

    if (fileFailures.length) {
      failures.push({ pathname, sources, fileFailures });
      continue;
    }

    // Layout parity: missing one of two is a warning by default.
    if (!flat || !nested) {
      layoutWarnings.push({
        pathname,
        missing: !flat ? "flat (.html)" : "nested (/index.html)",
        sources,
      });
    }

    ok.push({ pathname, title: firstSnapshot?.title });
  }

  // --- Output ---
  if (JSON_OUTPUT) {
    console.log(
      JSON.stringify(
        {
          totalSitemapUrls: urls.size,
          ok: ok.length,
          shellLeakOrInvalid: failures.length,
          missingPrerender: layoutFailures.length,
          missingOneLayout: layoutWarnings.length,
          failures,
          layoutFailures,
          layoutWarnings,
        },
        null,
        2
      )
    );
    const hardFail =
      failures.length > 0 ||
      layoutFailures.length > 0 ||
      (STRICT_LAYOUTS && layoutWarnings.length > 0);
    process.exit(hardFail ? 1 : 0);
  }

  console.log("\n══════ Pre-render Content Validity ══════");
  console.log(`  Sitemap URLs scanned:        ${urls.size}`);
  console.log(`  ✅ Pass (page-specific):     ${ok.length}`);
  console.log(`  ❌ Shell leak / invalid:     ${failures.length}`);
  console.log(`  ❌ No prerender on disk:     ${layoutFailures.length}`);
  console.log(
    `  ⚠️  Single-layout (missing flat or nested): ${layoutWarnings.length}` +
      (STRICT_LAYOUTS ? "  [strict mode → counted as failure]" : "")
  );
  console.log("──────────────────────────────────────────");

  const printList = (label, items, lineFn, max = 25) => {
    if (!items.length) return;
    console.log(`\n${label} (showing ${Math.min(max, items.length)} of ${items.length}):`);
    for (const it of items.slice(0, max)) console.log("  " + lineFn(it));
    if (items.length > max) console.log(`  …and ${items.length - max} more`);
  };

  printList(
    "❌ Shell-leak / content failures",
    failures,
    (f) =>
      `${f.pathname}\n      ${f.fileFailures
        .map(
          (ff) =>
            `${ff.file.replace(PUBLIC_DIR + "/", "")} → ${ff.errors.join(" | ")}`
        )
        .join("\n      ")}`
  );

  printList(
    "❌ No prerendered HTML on disk for sitemap URL",
    layoutFailures,
    (lf) => `${lf.pathname}   (in ${lf.sources.join(", ")})`
  );

  printList(
    "⚠️  Sitemap URL has only one layout",
    layoutWarnings,
    (lw) => `${lw.pathname}   missing: ${lw.missing}`,
    15
  );

  const hardFail =
    failures.length > 0 ||
    layoutFailures.length > 0 ||
    (STRICT_LAYOUTS && layoutWarnings.length > 0);

  if (hardFail) {
    console.log(
      `\n❌ Pre-render content validation FAILED. ` +
        `Fix shell leaks / regenerate missing HTML (npm run generate:seo-html / generate:missing-html).`
    );
    process.exit(1);
  }
  console.log(
    `\n✅ All sitemap URLs serve page-specific HTML.` +
      (layoutWarnings.length
        ? ` (${layoutWarnings.length} URLs serve only one layout — pass --strict-layouts to enforce parity.)`
        : "")
  );
}

main();
