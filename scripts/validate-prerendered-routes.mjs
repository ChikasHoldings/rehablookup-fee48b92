#!/usr/bin/env node
/**
 * Prerendered HTML ↔ Client Route validator.
 *
 * Walks public/** for every prerendered index.html (and *.html) and verifies
 * that the corresponding URL path resolves to a real client-side route — either:
 *   1. A literal <Route path="…"> in src/App.tsx (params expanded)
 *   2. A SmartCatchAll dynamic prefix (city+treatment, near-me, provider-guides…)
 *   3. A near-me top-level slug from src/data/nearMeTypes.ts
 *   4. A vercel.json redirect/rewrite source
 *
 * Any prerendered page that doesn't match means SPA navigation will land on
 * NotFound — exactly the bug we're hunting.
 *
 * Usage: node scripts/validate-prerendered-routes.mjs
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const PUBLIC_DIR = join(ROOT, 'public');

// ──────────────────────────────────────────────────────────────────────────────
// 1. Literal <Route path="..."> patterns from App.tsx
// ──────────────────────────────────────────────────────────────────────────────
const appTsx = readFileSync(join(SRC, 'App.tsx'), 'utf8');
const routePatterns = [
  ...appTsx.matchAll(/<Route\s+[^>]*path=(?:"|')([^"']+)(?:"|')/g),
].map((m) => m[1]);

function patternToRegex(pattern) {
  if (pattern === '*') return /^.*$/;
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, '[^/]+')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}
const routeRegexes = routePatterns
  .filter((p) => p !== '*') // exclude bare catch-all so we can detect NotFound fallbacks
  .map(patternToRegex);

// ──────────────────────────────────────────────────────────────────────────────
// 2. SmartCatchAll dynamic prefixes
// ──────────────────────────────────────────────────────────────────────────────
const smartCatchAllPath = join(SRC, 'components/SmartCatchAll.tsx');
const smartCatchAll = existsSync(smartCatchAllPath)
  ? readFileSync(smartCatchAllPath, 'utf8')
  : '';

const extractPrefixList = (varName) => {
  const block = smartCatchAll.match(
    new RegExp(`const ${varName}[^=]*=\\s*\\[([\\s\\S]*?)\\];`),
  );
  if (!block) return [];
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
};

const cityTreatmentPrefixes = extractPrefixList('CITY_TREATMENT_PREFIXES');
const cityTreatmentProviderPrefixes = extractPrefixList('CITY_TREATMENT_PROVIDER_PREFIXES');
const cityInsuranceProviderPrefixes = extractPrefixList('CITY_INSURANCE_PROVIDER_PREFIXES');

const legacyRedirectPrefixes = [
  '/alcohol-rehabilitation-',
  '/inpatient-rehabilitation-',
  '/outpatient-rehabilitation-',
  '/drug-rehabilitation-',
  '/detox-programs-',
  '/dual-diagnosis-treatment-',
];
const otherKnownPrefixes = [
  '/best-rehab-centers-in-',
  '/list-your-facility-in-',
  '/for-providers-in-',
  '/get-more-patients-in-',
  '/get-more-', // get-more-{insurance}-patients-in-{city}, etc.
];

const ALL_DYNAMIC_PREFIXES = [
  ...cityTreatmentPrefixes,
  ...cityTreatmentProviderPrefixes,
  ...cityInsuranceProviderPrefixes,
  ...legacyRedirectPrefixes,
  ...otherKnownPrefixes,
];

// ──────────────────────────────────────────────────────────────────────────────
// 3. Near-me slugs
// ──────────────────────────────────────────────────────────────────────────────
const nearMeDataPath = join(SRC, 'data/nearMeTypes.ts');
const nearMeData = existsSync(nearMeDataPath) ? readFileSync(nearMeDataPath, 'utf8') : '';
const nearMeSlugs = [
  ...nearMeData.matchAll(/slug:\s*["']([a-z0-9-]+)["']/g),
].map((m) => `/${m[1]}`);

// ──────────────────────────────────────────────────────────────────────────────
// 4. vercel.json redirects/rewrites
// ──────────────────────────────────────────────────────────────────────────────
const vercelJsonPath = join(ROOT, 'vercel.json');
let vercelSources = [];
if (existsSync(vercelJsonPath)) {
  try {
    const cfg = JSON.parse(readFileSync(vercelJsonPath, 'utf8'));
    for (const r of [...(cfg.redirects || []), ...(cfg.rewrites || [])]) {
      if (r.source) vercelSources.push(r.source);
    }
  } catch {}
}
const vercelRegexes = vercelSources.map((src) => {
  // Vercel uses :param and (.*); convert to regex.
  const escaped = src
    .replace(/[.+^${}|[\]\\]/g, '\\$&')
    .replace(/:[A-Za-z_][A-Za-z0-9_]*\*/g, '.*')
    .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, '[^/]+')
    .replace(/\(\.\*\)/g, '.*');
  try {
    return new RegExp(`^${escaped}$`);
  } catch {
    return null;
  }
}).filter(Boolean);

// ──────────────────────────────────────────────────────────────────────────────
// 5. Walk public/ for prerendered HTML files
// ──────────────────────────────────────────────────────────────────────────────
const SKIP_PUBLIC_FILES = new Set([
  'index.html', // SPA shell
  '404.html',
  '200.html',
  'offline.html',
]);
// Skip top-level public assets that aren't prerendered routes.
const SKIP_TOP_DIRS = new Set([
  'assets',
  'images',
  'static',
  'fonts',
  '_redirects',
]);

const prerenderedPaths = [];

function walkPublic(dir, base = '') {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!base && SKIP_TOP_DIRS.has(entry)) continue;
      walkPublic(full, rel);
    } else if (entry.endsWith('.html')) {
      if (!base && SKIP_PUBLIC_FILES.has(entry)) continue;
      // Convert public path → URL path
      let urlPath;
      if (entry === 'index.html') {
        urlPath = '/' + base;
      } else {
        const stem = entry.slice(0, -'.html'.length);
        urlPath = '/' + (base ? `${base}/${stem}` : stem);
      }
      // Normalize: no trailing slash except root
      if (urlPath.length > 1 && urlPath.endsWith('/')) urlPath = urlPath.slice(0, -1);
      prerenderedPaths.push({ urlPath, file: relative(ROOT, full) });
    }
  }
}
walkPublic(PUBLIC_DIR);

// ──────────────────────────────────────────────────────────────────────────────
// 6. Validate each prerendered path
// ──────────────────────────────────────────────────────────────────────────────
function isValidPath(path) {
  if (path === '/') return { ok: true, via: 'home' };

  // Literal route?
  if (routeRegexes.some((re) => re.test(path))) return { ok: true, via: 'route' };

  // Dynamic prefix?
  for (const prefix of ALL_DYNAMIC_PREFIXES) {
    if (path.startsWith(prefix) && path.length > prefix.length) {
      return { ok: true, via: `prefix:${prefix}` };
    }
  }

  // Near-me slug or deep path?
  if (nearMeSlugs.includes(path)) return { ok: true, via: 'near-me' };
  for (const nm of nearMeSlugs) {
    if (path.startsWith(nm + '/')) return { ok: true, via: 'near-me-deep' };
  }

  // Vercel redirect/rewrite?
  if (vercelRegexes.some((re) => re.test(path))) return { ok: true, via: 'vercel' };

  return { ok: false };
}

const unmatched = [];
for (const { urlPath, file } of prerenderedPaths) {
  const r = isValidPath(urlPath);
  if (!r.ok) unmatched.push({ urlPath, file });
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. Report
// ──────────────────────────────────────────────────────────────────────────────
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

console.log('\n' + bold('══════ Prerendered HTML ↔ Client Route Audit ══════'));
console.log(` Route patterns parsed   : ${routePatterns.length}`);
console.log(` Dynamic prefixes        : ${ALL_DYNAMIC_PREFIXES.length}`);
console.log(` Near-me slugs           : ${nearMeSlugs.length}`);
console.log(` Vercel sources          : ${vercelSources.length}`);
console.log(` Prerendered HTML pages  : ${prerenderedPaths.length}`);
console.log(` Unmatched (would 404)   : ${unmatched.length === 0 ? green(0) : red(unmatched.length)}`);
console.log('───────────────────────────────────────────────────');

if (unmatched.length) {
  console.log('\n' + red(bold('❌ Prerendered pages with no matching client route:')));
  // Group by top-level segment to make it actionable.
  const byTop = new Map();
  for (const u of unmatched) {
    const top = u.urlPath.split('/')[1] || '(root)';
    if (!byTop.has(top)) byTop.set(top, []);
    byTop.get(top).push(u);
  }
  const sorted = [...byTop.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [top, list] of sorted) {
    console.log(`\n  ${bold('/' + top)} ${dim(`(${list.length})`)}`);
    for (const { urlPath, file } of list.slice(0, 8)) {
      console.log(`    ${red(urlPath)} ${dim('← ' + file)}`);
    }
    if (list.length > 8) console.log(dim(`    … and ${list.length - 8} more`));
  }
  process.exit(1);
}

console.log('\n' + green(bold('✅ Every prerendered HTML page has a matching client route.')));
process.exit(0);
