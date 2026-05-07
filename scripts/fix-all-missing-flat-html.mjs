/**
 * fix-all-missing-flat-html.mjs
 * 
 * Fixes all GSC issues by ensuring every sitemap URL has a flat .html file
 * that the Vercel middleware can serve via prerenderRewrite(path + ".html").
 * 
 * Two strategies:
 * 1. If nested index.html exists: copy it to flat .html
 * 2. If no HTML exists at all: generate a minimal pre-rendered HTML shell
 *    with the correct self-referencing canonical tag
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { parseStringPromise } from "xml2js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "../public");
const BASE_URL = "https://rehablookup.com";

// Read the SPA shell template to use as base for generated pages
// The SPA shell is at the project root (index.html), not in public/
const spaShell = readFileSync(join(__dirname, "../index.html"), "utf8");

// Build a minimal pre-rendered HTML from the SPA shell with correct canonical
function buildPrerenderedHtml(path) {
  const url = BASE_URL + path;
  
  // Derive a human-readable title from the path
  const slug = path.replace(/^\//, "").replace(/-/g, " ").replace(/\//g, " - ");
  const title = slug.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " | RehabLookup";
  
  // Replace the canonical in the SPA shell with the correct one
  let html = spaShell;
  
  // Replace existing canonical
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${url}" />`
  );
  
  // Replace title
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${title}</title>`
  );
  
  // Replace og:url
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${url}" />`
  );
  
  return html;
}

// Load all sitemap URLs
async function loadSitemapUrls() {
  const urls = new Set();
  
  for (const sitemapFile of ["sitemap.xml", "sitemap-extras.xml"]) {
    const filePath = join(PUBLIC, sitemapFile);
    if (!existsSync(filePath)) continue;
    
    const xml = readFileSync(filePath, "utf8");
    const parsed = await parseStringPromise(xml);
    
    const urlset = parsed.urlset?.url || [];
    for (const entry of urlset) {
      const loc = entry.loc?.[0];
      if (loc) {
        const path = loc.replace(BASE_URL, "");
        if (path && path !== "/") {
          urls.add(path);
        }
      }
    }
  }
  
  return urls;
}

async function main() {
  console.log("Loading sitemap URLs...");
  const sitemapUrls = await loadSitemapUrls();
  console.log(`Total sitemap URLs: ${sitemapUrls.size}`);
  
  let copied = 0;
  let generated = 0;
  let alreadyExists = 0;
  const problems = [];
  
  for (const path of sitemapUrls) {
    const slug = path.replace(/^\//, "");
    const flatPath = join(PUBLIC, slug + ".html");
    const nestedPath = join(PUBLIC, slug, "index.html");
    
    // Already has flat .html - skip
    if (existsSync(flatPath)) {
      alreadyExists++;
      continue;
    }
    
    // Ensure parent directory exists
    const parentDir = dirname(flatPath);
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }
    
    if (existsSync(nestedPath)) {
      // Copy nested index.html to flat .html
      copyFileSync(nestedPath, flatPath);
      copied++;
      if (copied <= 5) {
        console.log(`  COPIED: ${path}`);
      }
    } else {
      // Generate minimal pre-rendered HTML with correct canonical
      const html = buildPrerenderedHtml(path);
      writeFileSync(flatPath, html, "utf8");
      generated++;
      if (generated <= 10) {
        console.log(`  GENERATED: ${path}`);
      }
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Already had flat .html: ${alreadyExists}`);
  console.log(`Copied from nested index.html: ${copied}`);
  console.log(`Generated new flat .html: ${generated}`);
  console.log(`Total processed: ${alreadyExists + copied + generated}`);
  
  if (problems.length > 0) {
    console.log(`\nProblems (${problems.length}):`);
    problems.forEach(p => console.log(`  ${p}`));
  }
}

main().catch(console.error);
