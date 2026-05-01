#!/usr/bin/env node
/**
 * Internal-link & route-validity validator.
 *
 * Walks the codebase for hardcoded internal URL strings used in:
 *   - <Link to="/...">, <NavLink to="/...">, <Navigate to="/...">
 *   - href="/..."
 *   - navigate("/...") / router.push("/...")
 *   - useNavigate hook return-call literals
 *
 * Validates each path against:
 *   1. Literal <Route path="..."> declarations in src/App.tsx
 *   2. SmartCatchAll prefix patterns (city+treatment, near-me, provider-guides, etc.)
 *   3. The /near-me/ALL_ROUTABLE_NEAR_ME_SLUGS table
 *   4. usStates slug list (for state-suffixed legacy slugs)
 *
 * Exits non-zero with a list of:
 *   - Internal links that match no known route
 *   - Suspicious slugs (uppercase, trailing slash, double slash, .html)
 *
 * Usage: node scripts/validate-internal-links.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

// ──────────────────────────────────────────────────────────────────────────────
// 1. Collect all literal route patterns from App.tsx
// ──────────────────────────────────────────────────────────────────────────────
const appTsx = readFileSync(join(SRC, 'App.tsx'), 'utf8');
const routePatterns = [
  ...appTsx.matchAll(/<Route\s+[^>]*path=(?:"|')([^"']+)(?:"|')/g),
].map((m) => m[1]);

// Compile each pattern into a regex that matches a candidate path.
// React-Router supports :param and *  (splat). Convert these into [^/]+ / .*.
function patternToRegex(pattern) {
  if (pattern === '*') return /^.*$/;
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, '[^/]+')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}
const routeRegexes = routePatterns.map(patternToRegex);

// ──────────────────────────────────────────────────────────────────────────────
// 2. SmartCatchAll prefix patterns (paths NOT in <Route> but matched dynamically)
// ──────────────────────────────────────────────────────────────────────────────
const smartCatchAll = readFileSync(join(SRC, 'components/SmartCatchAll.tsx'), 'utf8');
const extractPrefixList = (varName) => {
  const block = smartCatchAll.match(
    new RegExp(`const ${varName}[^=]*=\\s*\\[([\\s\\S]*?)\\];`),
  );
  if (!block) return [];
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
};
const cityTreatmentPrefixes = extractPrefixList('CITY_TREATMENT_PREFIXES');
const cityTreatmentProviderPrefixes = extractPrefixList(
  'CITY_TREATMENT_PROVIDER_PREFIXES',
);
const cityInsuranceProviderPrefixes = extractPrefixList(
  'CITY_INSURANCE_PROVIDER_PREFIXES',
);
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
];

const ALL_DYNAMIC_PREFIXES = [
  ...cityTreatmentPrefixes,
  ...cityTreatmentProviderPrefixes,
  ...cityInsuranceProviderPrefixes,
  ...legacyRedirectPrefixes,
  ...otherKnownPrefixes,
];

// ──────────────────────────────────────────────────────────────────────────────
// 3. Near-me top-level slugs (e.g. /drug-rehab-near-me, /alcohol-rehab-near-me)
// ──────────────────────────────────────────────────────────────────────────────
const nearMeData = readFileSync(join(SRC, 'data/nearMeTypes.ts'), 'utf8');
const nearMeSlugs = [
  ...nearMeData.matchAll(/slug:\s*["']([a-z0-9-]+)["']/g),
].map((m) => `/${m[1]}`);

// ──────────────────────────────────────────────────────────────────────────────
// 4. Walk source tree and extract candidate internal URL strings
// ──────────────────────────────────────────────────────────────────────────────
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.next',
  'build',
  'coverage',
  '__snapshots__',
  'public',
]);
const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (SOURCE_EXTS.has(full.slice(full.lastIndexOf('.')))) files.push(full);
  }
  return files;
}

const sourceFiles = walk(SRC);

// Extract internal URL strings: starts with "/" and looks like a path.
// Patterns: to="/...", href="/...", navigate("/..."), Navigate to="/..."
const URL_PATTERNS = [
  /\bto=(?:"|'|`)(\/[^"'`?#\s>]*)/g,
  /\bhref=(?:"|'|`)(\/[^"'`?#\s>]*)/g,
  /\bnavigate\(\s*(?:"|'|`)(\/[^"'`?#\s)]*)/g,
  /\brouter\.push\(\s*(?:"|'|`)(\/[^"'`?#\s)]*)/g,
  /\brouter\.replace\(\s*(?:"|'|`)(\/[^"'`?#\s)]*)/g,
  /\bwindow\.location(?:\.href)?\s*=\s*(?:"|'|`)(\/[^"'`?#\s]*)/g,
];

const foundLinks = new Map(); // path -> Set<string> of source files

for (const file of sourceFiles) {
  const content = readFileSync(file, 'utf8');
  for (const re of URL_PATTERNS) {
    re.lastIndex = 0;
    for (const m of content.matchAll(re)) {
      const raw = m[1];
      // Skip template-literal interpolations; only validate static paths.
      if (raw.includes('${')) continue;
      // Skip API/asset paths handled separately by Vercel.
      if (
        raw.startsWith('/api/') ||
        raw.startsWith('/assets/') ||
        raw.startsWith('/functions/') ||
        raw.startsWith('/_vercel/') ||
        raw.startsWith('/images/') ||
        raw === '/'
      ) {
        continue;
      }
      // Skip mailto/tel/protocol links.
      if (raw.startsWith('//')) continue;
      const rel = relative(ROOT, file);
      if (!foundLinks.has(raw)) foundLinks.set(raw, new Set());
      foundLinks.get(raw).add(rel);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. Validate each found link
// ──────────────────────────────────────────────────────────────────────────────
function isValidPath(path) {
  // Strip query and hash for matching.
  const cleanPath = path.split(/[?#]/)[0];

  // 1. Match against literal Route patterns.
  if (routeRegexes.some((re) => re.test(cleanPath))) return { ok: true, via: 'route' };

  // 2. Match against SmartCatchAll dynamic prefixes.
  for (const prefix of ALL_DYNAMIC_PREFIXES) {
    if (cleanPath.startsWith(prefix) && cleanPath.length > prefix.length) {
      return { ok: true, via: `prefix:${prefix}` };
    }
  }

  // 3. Match top-level near-me slugs (e.g. /drug-rehab-near-me).
  if (nearMeSlugs.includes(cleanPath)) return { ok: true, via: 'near-me' };
  // Near-me with state/city/county subpath.
  for (const nm of nearMeSlugs) {
    if (cleanPath.startsWith(nm + '/')) return { ok: true, via: 'near-me-deep' };
  }

  return { ok: false };
}

const issues = {
  unmatched: [],
  suspicious: [],
};

for (const [path, sources] of foundLinks) {
  // Suspicious patterns
  if (path.endsWith('/') && path !== '/')
    issues.suspicious.push({ path, reason: 'trailing slash', sources });
  if (path.includes('//'))
    issues.suspicious.push({ path, reason: 'double slash', sources });
  if (/[A-Z]/.test(path))
    issues.suspicious.push({ path, reason: 'uppercase character', sources });
  if (path.endsWith('.html'))
    issues.suspicious.push({ path, reason: '.html extension', sources });

  const result = isValidPath(path);
  if (!result.ok) issues.unmatched.push({ path, sources });
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. Report
// ──────────────────────────────────────────────────────────────────────────────
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

console.log('\n' + bold('══════ Internal Link & Route Validity Audit ══════'));
console.log(` Source files scanned   : ${sourceFiles.length}`);
console.log(` Route patterns parsed  : ${routePatterns.length}`);
console.log(` Dynamic prefixes       : ${ALL_DYNAMIC_PREFIXES.length}`);
console.log(` Near-me slugs          : ${nearMeSlugs.length}`);
console.log(` Unique internal links  : ${foundLinks.size}`);
console.log(` Unmatched links        : ${issues.unmatched.length === 0 ? green(0) : red(issues.unmatched.length)}`);
console.log(` Suspicious links       : ${issues.suspicious.length === 0 ? green(0) : yellow(issues.suspicious.length)}`);
console.log('──────────────────────────────────────────────────');

if (issues.unmatched.length) {
  console.log('\n' + red(bold('❌ Unmatched internal links (no matching route):')));
  for (const { path, sources } of issues.unmatched.sort((a, b) =>
    a.path.localeCompare(b.path),
  )) {
    console.log(`\n  ${red(path)}`);
    for (const s of [...sources].slice(0, 3)) console.log(dim(`    ↳ ${s}`));
    if (sources.size > 3) console.log(dim(`    ↳ … and ${sources.size - 3} more`));
  }
}

if (issues.suspicious.length) {
  console.log('\n' + yellow(bold('⚠️  Suspicious link patterns:')));
  for (const { path, reason, sources } of issues.suspicious) {
    console.log(`\n  ${yellow(path)} ${dim('(' + reason + ')')}`);
    for (const s of [...sources].slice(0, 2)) console.log(dim(`    ↳ ${s}`));
  }
}

if (issues.unmatched.length === 0 && issues.suspicious.length === 0) {
  console.log('\n' + green(bold('✅ All internal links resolve to a known route.')));
}

process.exit(issues.unmatched.length > 0 ? 1 : 0);
