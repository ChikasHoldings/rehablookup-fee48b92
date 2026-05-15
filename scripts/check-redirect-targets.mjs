#!/usr/bin/env node
/**
 * Build-time validator for vercel.json redirect destinations.
 *
 * The pre-migration repo had a bug where several redirects pointed at
 * destinations that didn't actually exist as routes or prerendered files
 * (the audit flagged it as SEV-2 — users following an old link would
 * 301 → 404). This script runs in `validate:blocking` to fail the build
 * before such regressions ship.
 *
 * What it checks
 *   For every redirect entry in `vercel.json` and `public/vercel.json`,
 *   the destination must resolve to ONE of:
 *     1. A literal `<Route path="...">` registered in src/App.tsx, OR
 *     2. A dynamic `<Route>` whose pattern matches (`/foo/:state` etc.), OR
 *     3. An existing static file in public/ (.html or directory/index.html), OR
 *     4. Another redirect's source (chained redirect — warn but don't fail), OR
 *     5. An absolute external URL (skipped — out of scope).
 *
 * What it ignores
 *   - Destinations containing redirect-source placeholders like `:path*`
 *     or `:slug` (those are template parameters, not literal paths).
 *   - The catch-all SPA fallback rewrite (`/(.*)` → `/index.html`).
 *
 * Exit codes
 *   0 — all destinations resolve
 *   1 — at least one dead destination (build fails)
 */

import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

// ───────────────────────────────────────────────────────────────────────────
// Step 1: collect literal + dynamic routes from App.tsx
// ───────────────────────────────────────────────────────────────────────────
async function collectRoutes() {
  const appTsx = await readFile(path.join(repoRoot, "src/App.tsx"), "utf8");
  const literals = new Set();
  const patterns = []; // { re: RegExp, src: string }

  // Match `<Route path="..." element={...}/>` — also catches `<Route path="..." />` for Navigate.
  const re = /<Route\s+[^>]*?path=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(appTsx)) !== null) {
    const p = m[1];
    if (p.includes("*")) {
      // Catch-all (e.g., "*" for NotFound). Skip — they swallow everything.
      continue;
    }
    if (p.includes(":")) {
      // Dynamic — convert `/rehab-centers/:state/:city` to a regex that
      // accepts any single non-slash segment for each `:param`.
      const rePart = p.replace(/:[A-Za-z][A-Za-z0-9_]*/g, "[^/]+");
      patterns.push({ re: new RegExp("^" + rePart + "$"), src: p });
    } else {
      literals.add(p);
    }
  }

  return { literals, patterns };
}

// ───────────────────────────────────────────────────────────────────────────
// Step 2: collect redirects + redirect sources from both vercel.json files
// ───────────────────────────────────────────────────────────────────────────
async function readRedirects(file) {
  try {
    const raw = await readFile(file, "utf8");
    const json = JSON.parse(raw);
    return json.redirects ?? [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function publicFileExists(urlPath) {
  // Vercel's cleanUrls strips the .html extension, so the file backing
  // `/foo` is normally `public/foo.html` or `public/foo/index.html`. But
  // some destinations point at non-HTML assets like `/sitemap.xml` or
  // `/og-image.jpg` — those are served from public/ at their full path.
  const trimmed = urlPath.replace(/^\//, "").replace(/\/$/, "");
  if (!trimmed) return true; // root → index.html exists

  // Path with an explicit extension (.xml, .jpg, .png, .pdf, etc.) — check
  // exact match against public/. Catches /sitemap.xml, /og-image.jpg, etc.
  if (/\.[a-z0-9]{2,5}$/i.test(trimmed)) {
    return await fileExists(path.join(repoRoot, "public", trimmed));
  }

  // Extensionless path — try the cleanUrls variants.
  return (
    (await fileExists(path.join(repoRoot, "public", `${trimmed}.html`))) ||
    (await fileExists(path.join(repoRoot, "public", trimmed, "index.html")))
  );
}

function stripQueryAndHash(s) {
  return s.split("#")[0].split("?")[0];
}

function isExternal(dest) {
  return /^https?:\/\//i.test(dest);
}

function containsParam(dest) {
  // e.g. `:path*`, `:slug`. Source-side params should never appear in a
  // literal destination check.
  return /:[A-Za-z][A-Za-z0-9_]*/.test(dest);
}

function matchesPattern(dest, patterns) {
  return patterns.some((p) => p.re.test(dest));
}

// ───────────────────────────────────────────────────────────────────────────
// Step 3: validate
// ───────────────────────────────────────────────────────────────────────────
async function main() {
  const { literals, patterns } = await collectRoutes();

  const rootRedirects = await readRedirects(path.join(repoRoot, "vercel.json"));
  const pubRedirects = await readRedirects(path.join(repoRoot, "public/vercel.json"));
  const all = [
    ...rootRedirects.map((r) => ({ ...r, _file: "vercel.json" })),
    ...pubRedirects.map((r) => ({ ...r, _file: "public/vercel.json" })),
  ];

  const sources = new Set(all.map((r) => r.source));

  const dead = [];
  const chained = [];
  let okCount = 0;
  let externalCount = 0;
  let parameterizedCount = 0;

  for (const r of all) {
    const dest = stripQueryAndHash(r.destination);

    if (isExternal(dest)) {
      externalCount++;
      continue;
    }
    if (containsParam(dest)) {
      // e.g. `/foo/:path*` — destination is parameterized, can't validate
      // statically without knowing all possible inputs. Skip.
      parameterizedCount++;
      continue;
    }

    // Direct hit against an App.tsx literal route?
    if (literals.has(dest)) {
      okCount++;
      continue;
    }
    // Dynamic route pattern match?
    if (matchesPattern(dest, patterns)) {
      okCount++;
      continue;
    }
    // Prerendered static file?
    if (await publicFileExists(dest)) {
      okCount++;
      continue;
    }
    // Another redirect's source? (chained — works at runtime but adds latency)
    if (sources.has(dest)) {
      chained.push({ ...r, dest });
      continue;
    }

    dead.push({ ...r, dest });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Report
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`[check-redirect-targets] checked ${all.length} redirects`);
  console.log(`  ✓ resolved:       ${okCount}`);
  console.log(`  ↗ external:       ${externalCount}`);
  console.log(`  ⚠ parameterized:  ${parameterizedCount} (skipped — template patterns)`);
  console.log(`  ↻ chained:        ${chained.length}`);
  console.log(`  ✗ dead:           ${dead.length}`);

  if (chained.length > 0) {
    console.log("\n  Chained redirects (work but add hop latency):");
    for (const r of chained) {
      console.log(`    ${r._file}  ${r.source}  →  ${r.dest}`);
    }
  }

  if (dead.length > 0) {
    console.log("\n  DEAD destinations (no matching route OR prerendered file):");
    for (const r of dead) {
      console.log(`    ${r._file}  ${r.source}  →  ${r.dest}`);
    }
    console.log("\n  Fix: either add a matching <Route> in src/App.tsx, generate");
    console.log("  the prerendered HTML in public/, or remove the redirect.");
    process.exit(1);
  }

  console.log("\n  ✓ All redirect destinations resolve.\n");
}

main().catch((err) => {
  console.error("[check-redirect-targets] FATAL:", err.message);
  process.exit(1);
});
