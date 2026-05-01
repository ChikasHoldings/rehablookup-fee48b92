#!/usr/bin/env node
/**
 * 404 Hunter — finds every internal URL we ship that won't resolve.
 *
 * Sources scanned:
 *   1. All <loc> entries in public/sitemap*.xml
 *   2. All internal <a href="/..."> links inside every prerendered public/**\/*.html
 *
 * Each path is validated against the same rules as
 * validate-prerendered-routes.mjs:
 *   - Literal <Route path="..."> in src/App.tsx
 *   - SmartCatchAll dynamic prefixes
 *   - Near-me top-level slugs
 *   - vercel.json redirects/rewrites
 *   - Existing prerendered file in public/
 *
 * Reports the top offending paths grouped by source so they can be fixed in
 * batch. Exits non-zero if any unresolved internal URL is found.
 *
 * Usage: node scripts/find-404-sources.mjs
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const PUBLIC_DIR = join(ROOT, 'public');

// ───────────────────────── 1. Route patterns ─────────────────────────────────
const appTsx = readFileSync(join(SRC, 'App.tsx'), 'utf8');
const routePatterns = [...appTsx.matchAll(/<Route\s+[^>]*path=(?:"|')([^"']+)(?:"|')/g)]
  .map((m) => m[1])
  .filter((p) => p !== '*');

function patternToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, '[^/]+')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}
const routeRegexes = routePatterns.map(patternToRegex);

// ───────────────────────── 2. SmartCatchAll prefixes ─────────────────────────
const smartCatchAll = readFileSync(join(SRC, 'components/SmartCatchAll.tsx'), 'utf8');
const extractPrefixList = (varName) => {
  const block = smartCatchAll.match(
    new RegExp(`const ${varName}[^=]*=\\s*\\[([\\s\\S]*?)\\];`),
  );
  return block ? [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
};
const ALL_DYNAMIC_PREFIXES = [
  ...extractPrefixList('CITY_TREATMENT_PREFIXES'),
  ...extractPrefixList('CITY_TREATMENT_PROVIDER_PREFIXES'),
  ...extractPrefixList('CITY_INSURANCE_PROVIDER_PREFIXES'),
  '/alcohol-rehabilitation-',
  '/inpatient-rehabilitation-',
  '/outpatient-rehabilitation-',
  '/drug-rehabilitation-',
  '/detox-programs-',
  '/dual-diagnosis-treatment-',
  '/best-rehab-centers-in-',
  '/list-your-facility-in-',
  '/for-providers-in-',
  '/get-more-patients-in-',
  '/get-more-',
];

// ───────────────────────── 3. Near-me slugs ──────────────────────────────────
const nearMeData = existsSync(join(SRC, 'data/nearMeTypes.ts'))
  ? readFileSync(join(SRC, 'data/nearMeTypes.ts'), 'utf8')
  : '';
const nearMeSlugs = [...nearMeData.matchAll(/slug:\s*["']([a-z0-9-]+)["']/g)].map(
  (m) => `/${m[1]}`,
);

// ───────────────────────── 4. Vercel redirects/rewrites ──────────────────────
let vercelSources = [];
const vercelJsonPath = join(ROOT, 'vercel.json');
if (existsSync(vercelJsonPath)) {
  try {
    const cfg = JSON.parse(readFileSync(vercelJsonPath, 'utf8'));
    for (const r of [...(cfg.redirects || []), ...(cfg.rewrites || [])]) {
      if (r.source) vercelSources.push(r.source);
    }
  } catch {}
}
const vercelRegexes = vercelSources
  .map((src) => {
    try {
      const escaped = src
        .replace(/[.+^${}|[\]\\]/g, '\\$&')
        .replace(/:[A-Za-z_][A-Za-z0-9_]*\*/g, '.*')
        .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, '[^/]+')
        .replace(/\(\.\*\)/g, '.*');
      return new RegExp(`^${escaped}$`);
    } catch {
      return null;
    }
  })
  .filter(Boolean);

// ───────────────────────── 5. Index of prerendered files ─────────────────────
const prerenderedSet = new Set();
function indexPublic(dir, base = '') {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    const st = statSync(full);
    if (st.isDirectory()) indexPublic(full, rel);
    else if (entry === 'index.html') {
      let p = '/' + base;
      if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
      prerenderedSet.add(p || '/');
    } else if (entry.endsWith('.html')) {
      const stem = entry.slice(0, -'.html'.length);
      prerenderedSet.add('/' + (base ? `${base}/${stem}` : stem));
    }
  }
}
indexPublic(PUBLIC_DIR);

// ───────────────────────── Validator ─────────────────────────────────────────
function isValidPath(path) {
  if (!path || path === '/') return true;
  if (prerenderedSet.has(path)) return true;
  if (routeRegexes.some((re) => re.test(path))) return true;
  for (const prefix of ALL_DYNAMIC_PREFIXES) {
    if (path.startsWith(prefix) && path.length > prefix.length) return true;
  }
  if (nearMeSlugs.includes(path)) return true;
  for (const nm of nearMeSlugs) {
    if (path.startsWith(nm + '/')) return true;
  }
  if (vercelRegexes.some((re) => re.test(path))) return true;
  return false;
}

// ───────────────────────── Source A: sitemap <loc> ───────────────────────────
const sitemapFiles = readdirSync(PUBLIC_DIR)
  .filter((f) => /^sitemap.*\.xml$/.test(f))
  .map((f) => join(PUBLIC_DIR, f));

const sitemapBad = []; // {url, sitemap}
const SITE_HOST_RE = /^https?:\/\/(?:www\.)?rehablookup\.(?:com|lovable\.app)/i;

for (const sm of sitemapFiles) {
  const xml = readFileSync(sm, 'utf8');
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    let url = m[1].trim();
    // Skip nested sitemap references (sitemap-index.xml lists *.xml).
    if (url.endsWith('.xml')) continue;
    let path;
    try {
      const u = new URL(url);
      // Only validate URLs that point at our own site.
      if (!SITE_HOST_RE.test(`${u.protocol}//${u.host}`)) continue;
      path = u.pathname;
    } catch {
      continue;
    }
    // Normalize trailing slash.
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    if (!isValidPath(path)) {
      sitemapBad.push({ path, url, sitemap: relative(ROOT, sm) });
    }
  }
}

// ───────────────────────── Source B: <a href> in HTML ────────────────────────
const linkBad = new Map(); // path → Set<sourceFile>
let totalHtmlScanned = 0;
let totalLinksScanned = 0;

function scanHtmlLinks(dir, base = '') {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    const st = statSync(full);
    if (st.isDirectory()) {
      scanHtmlLinks(full, rel);
    } else if (entry.endsWith('.html')) {
      totalHtmlScanned++;
      const html = readFileSync(full, 'utf8');
      // Match href="/..." excluding protocol-relative // and external http(s).
      for (const m of html.matchAll(/href=(?:"|')(\/[^"'\s>?#]*)/g)) {
        const raw = m[1];
        totalLinksScanned++;
        if (
          raw.startsWith('//') ||
          raw.startsWith('/api/') ||
          raw.startsWith('/assets/') ||
          raw.startsWith('/functions/') ||
          raw.startsWith('/_vercel/') ||
          raw.startsWith('/images/') ||
          raw.startsWith('/static/') ||
          raw.startsWith('/fonts/') ||
          raw === '/' ||
          /\.(png|jpe?g|webp|svg|ico|css|js|xml|txt|pdf|woff2?|ttf|map|json)$/i.test(raw)
        ) {
          continue;
        }
        let path = raw.split(/[?#]/)[0];
        if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
        if (!isValidPath(path)) {
          if (!linkBad.has(path)) linkBad.set(path, new Set());
          linkBad.get(path).add(rel);
        }
      }
    }
  }
}
scanHtmlLinks(PUBLIC_DIR);

// ───────────────────────── Report ────────────────────────────────────────────
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

console.log('\n' + bold('══════ 404 Hunter — Internal URL Audit ══════'));
console.log(` Prerendered HTML pages   : ${prerenderedSet.size}`);
console.log(` Sitemap files scanned    : ${sitemapFiles.length}`);
console.log(` HTML files scanned       : ${totalHtmlScanned}`);
console.log(` Internal <a href> seen   : ${totalLinksScanned}`);
console.log(` Sitemap URLs that 404    : ${sitemapBad.length === 0 ? green(0) : red(sitemapBad.length)}`);
console.log(` Unique broken hrefs      : ${linkBad.size === 0 ? green(0) : red(linkBad.size)}`);
console.log('──────────────────────────────────────────────');

// — Sitemap report
if (sitemapBad.length) {
  console.log('\n' + red(bold('❌ Sitemap URLs with no matching route:')));
  const bySm = new Map();
  for (const b of sitemapBad) {
    if (!bySm.has(b.sitemap)) bySm.set(b.sitemap, []);
    bySm.get(b.sitemap).push(b);
  }
  for (const [sm, list] of bySm) {
    console.log(`\n  ${bold(sm)} ${dim(`(${list.length})`)}`);
    for (const { path } of list.slice(0, 12)) console.log(`    ${red(path)}`);
    if (list.length > 12) console.log(dim(`    … and ${list.length - 12} more`));
  }
}

// — Broken <a href> report, grouped by top segment to spot patterns
if (linkBad.size) {
  console.log('\n' + red(bold('❌ Broken internal <a href> in prerendered HTML:')));
  const byTop = new Map();
  for (const [path, srcs] of linkBad) {
    const top = path.split('/')[1] || '(root)';
    if (!byTop.has(top)) byTop.set(top, []);
    byTop.get(top).push({ path, srcs });
  }
  const sorted = [...byTop.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [top, list] of sorted) {
    console.log(`\n  ${bold('/' + top)} ${dim(`(${list.length} unique)`)}`);
    list.sort((a, b) => b.srcs.size - a.srcs.size);
    for (const { path, srcs } of list.slice(0, 10)) {
      console.log(`    ${red(path)}  ${dim(`(seen on ${srcs.size} page${srcs.size === 1 ? '' : 's'})`)}`);
      const first = [...srcs].slice(0, 2);
      for (const s of first) console.log(dim(`      ↳ ${s}`));
    }
    if (list.length > 10) console.log(dim(`    … and ${list.length - 10} more`));
  }
}

if (!sitemapBad.length && !linkBad.size) {
  console.log('\n' + green(bold('✅ No 404-bound internal URLs detected.')));
  process.exit(0);
}

console.log('');
process.exit(1);
