/**
 * Shared prerender discovery used by every SEO validator + sitemap generator.
 *
 * A "prerendered route" is any route in the canonical site path namespace that
 * has at least one matching static HTML file in /public, in either of the
 * two supported layouts:
 *
 *   1. Flat:       public/<path>.html              → route /<path>
 *   2. Nested:     public/<path>/index.html        → route /<path>
 *
 * Both layouts are first-class on Vercel (filesystem handler tries each
 * before falling back to the SPA shell). Validators must accept either.
 *
 * Routes are normalized to lowercase, no trailing slash, no .html extension.
 * The two halves merge — a route is prerendered if EITHER file exists.
 */

import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SKIP_FILES = new Set(["index.html", "404.html", "200.html"]);
const SKIP_DIRS = new Set(["assets", "static", "lovable-uploads", "fonts", "images"]);

/**
 * Walk public/ and return a Map<route, { flatPath?: string, indexPath?: string }>.
 * - flatPath  → absolute path to public/<route>.html (when present)
 * - indexPath → absolute path to public/<route>/index.html (when present)
 *
 * The route key is always the canonical extensionless path with a leading slash
 * (e.g. "/rehab-centers/california"). Root index.html is intentionally excluded
 * because that's the SPA shell, not an SEO landing page.
 */
export function discoverPrerenderedRoutes(publicDir) {
  /** @type {Map<string, { flatPath?: string, indexPath?: string }>} */
  const routes = new Map();

  const upsert = (route, key, abs) => {
    const r = route.toLowerCase();
    const existing = routes.get(r) ?? {};
    existing[key] = abs;
    routes.set(r, existing);
  };

  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        // Nested layout: <route>/index.html
        const idx = join(abs, "index.html");
        if (existsSync(idx)) {
          const rel = relative(publicDir, abs).split(sep).join("/");
          upsert("/" + rel, "indexPath", idx);
        }
        walk(abs);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        if (SKIP_FILES.has(entry.name)) continue;
        // Flat layout: <route>.html (skip nested index.html — handled above)
        if (entry.name === "index.html") continue;
        const rel = relative(publicDir, abs).split(sep).join("/").replace(/\.html$/, "");
        upsert("/" + rel, "flatPath", abs);
      }
    }
  };

  walk(publicDir);
  return routes;
}

/**
 * Returns the set of canonical paths (with leading slash, lowercase, no .html)
 * that are prerendered in either layout.
 */
export function discoverPrerenderedPaths(publicDir) {
  return new Set(discoverPrerenderedRoutes(publicDir).keys());
}

/**
 * Returns an array of { route, file } where `file` is the BEST file to read
 * for a given route. Preference order: index.html (nested) > .html (flat).
 * This is what HTML-content validators (canonical, JSON-LD, FAQ) should use.
 */
export function discoverPrerenderedFiles(publicDir) {
  const routes = discoverPrerenderedRoutes(publicDir);
  const out = [];
  for (const [route, paths] of routes) {
    out.push({ route, file: paths.indexPath ?? paths.flatPath });
  }
  return out;
}

/**
 * Quick check used by sitemap generation: does this route have ANY prerender?
 */
export function isPrerendered(publicDir, route) {
  const r = route.toLowerCase().replace(/\/$/, "") || "/";
  const flat = join(publicDir, r.slice(1) + ".html");
  const nested = join(publicDir, r.slice(1), "index.html");
  return existsSync(flat) || existsSync(nested);
}

/**
 * Read the head of a prerendered file and extract canonical + robots meta.
 */
export function readPrerenderedHead(file) {
  const src = readFileSync(file, "utf8");
  const head = src.slice(0, 12000);
  const canonical = (head.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1] || null;
  const robots = (head.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i) || [])[1]?.toLowerCase() || null;
  const title = (head.match(/<title>\s*([^<]+?)\s*<\/title>/i) || [])[1] || null;
  return { canonical, robots, title };
}
