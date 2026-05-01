#!/usr/bin/env node
/**
 * Verify every static-source <Navigate> redirect in src/App.tsx has a
 * matching server-side 301 in vercel.json.
 *
 * Why: SPA-only Navigates fire AFTER the SPA shell hydrates, so search
 * engines and direct-link visitors get HTTP 200 + delayed JS bounce
 * instead of a proper 301. We mirror every static legacy → live mapping
 * in vercel.json so Vercel issues the canonical 301 at the edge.
 *
 * Scope: only matches Routes whose `path=` and `Navigate to=` are both
 * static string literals (no `:param`, no template literals, no `*`
 * wildcards — those have to stay in-app because Vercel pattern syntax
 * differs from React Router's).
 *
 * Wired into the SEO validators workflow so any new SPA redirect that
 * forgets its Vercel twin fails the PR.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

const tsx = readFileSync(resolve(ROOT, "src/App.tsx"), "utf8");
const vc = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf8"));

// Pull every static <Route path="..." element={<Navigate to="..." replace />} />
const NAV_RE =
  /<Route\s+path="(\/[^"]*?)"\s+element=\{<Navigate\s+to="(\/[^"]*?)"\s+replace\s*\/>\}\s*\/>/g;

const spaRedirects = [];
for (const m of tsx.matchAll(NAV_RE)) {
  const [, source, destination] = m;
  // Skip dynamic patterns (React Router :param syntax doesn't translate 1:1
  // to vercel rewrites) and any path containing `*` wildcards
  if (source.includes(":") || source.includes("*")) continue;
  if (destination.includes(":")) continue;
  spaRedirects.push({ source, destination });
}

const vercelSources = new Map();
for (const r of vc.redirects || []) {
  if (!r.source) continue;
  // Normalize trailing /:path* / wildcard suffixes for matching
  vercelSources.set(r.source.replace(/\/:path\*$/, ""), r);
}

const missing = [];
const mismatched = [];

for (const r of spaRedirects) {
  const hit = vercelSources.get(r.source);
  if (!hit) {
    missing.push(r);
    continue;
  }
  if (hit.destination !== r.destination) {
    mismatched.push({ ...r, vercelDestination: hit.destination });
  }
  if (hit.permanent !== true) {
    mismatched.push({ ...r, note: "vercel redirect is not permanent (must be 301)" });
  }
}

console.log(`\n🔎 SPA-redirect ↔ vercel.json parity check\n`);
console.log(`  Static <Navigate> redirects in App.tsx: ${spaRedirects.length}`);
console.log(`  Mirrored 301s in vercel.json:           ${spaRedirects.length - missing.length}`);
console.log(`  Missing 301s:                           ${missing.length}`);
console.log(`  Destination mismatches:                 ${mismatched.length}`);

if (missing.length) {
  console.error(`\n❌ Missing server-side 301s for these legacy paths:`);
  for (const m of missing) {
    console.error(`   • ${m.source.padEnd(50)} → ${m.destination}`);
  }
  console.error(`\n   Add each as a vercel.json redirect:`);
  console.error(JSON.stringify(missing.map((m) => ({ ...m, permanent: true })), null, 2));
}

if (mismatched.length) {
  console.error(`\n❌ Destination mismatch (App.tsx says one thing, vercel.json another):`);
  for (const m of mismatched) {
    console.error(
      `   • ${m.source}: SPA→${m.destination} | vercel→${m.vercelDestination || "(see note)"}` +
        (m.note ? ` (${m.note})` : ""),
    );
  }
}

if (missing.length || mismatched.length) {
  console.error(
    `\n   Server-side 301s are required so search engines and direct-link\n` +
      `   visitors get a real 301 (not a 200 + JS bounce).\n`,
  );
  process.exit(1);
}

console.log(`\n✅ Every static SPA redirect has a matching vercel.json 301.\n`);
