#!/usr/bin/env node
/**
 * check-provider-admin-directory-model.mjs
 *
 * Stage-3 build-time guard: the AUTHENTICATED provider and admin surfaces must
 * present the directory product, not the retired placement / Concierge /
 * advisor / lead-marketplace one.
 *
 * RehabLookup is a trusted data and discovery layer for addiction treatment.
 * It is not a placement service, an advisor service, a concierge service, or a
 * lead marketplace. Providers pay for visibility and features ($0 listing,
 * $99/mo Pro, Featured add-on) — never for trust, and never for patient leads.
 * Every inquiry stays pinned to the one facility the seeker selected.
 *
 * This guard exists because that contract is easy to regress by accident: a
 * reinstated nav entry, a copied dashboard card, or a "helpful" reassign button
 * quietly turns the directory back into a broker.
 *
 * ── Scope: deliberately narrow ────────────────────────────────────────────
 * Only ACTIVE authenticated frontend surfaces are scanned — route definitions,
 * shells, primary navigation, dashboards, and the inquiry workflow. This is NOT
 * a repo-wide ban on words.
 *
 * Explicitly OUT of scope (and intentionally allowed to keep these terms):
 *   • supabase/** — migrations, edge functions, database identifiers
 *   • the unmounted legacy workspace under components/admin/concierge/**
 *   • the read-only historical archive page, which must be able to name what
 *     it is an archive OF
 *   • public/educational articles and provider marketing guides
 *   • code comments explaining what was retired, and Stage-4 debt notes
 *
 * ── What it checks ────────────────────────────────────────────────────────
 *   1. TERMS  — no retired-workflow concept appears in user-facing copy on an
 *               active surface (comments and identifiers are stripped first,
 *               so only real strings and JSX text are considered).
 *   2. LABELS — the current selected-facility inquiry workflow is presented as
 *               "Inquiries", never "Leads", in primary navigation.
 *   3. ROUTES — every active provider/admin nav destination resolves to a real
 *               mounted route, is not itself a compatibility redirect, and is
 *               not a retired workflow.
 *   4. IMPORTS — no router or prefetch map pulls a retired page component back
 *               into the active bundle graph.
 *
 * Usage
 *   node scripts/check-provider-admin-directory-model.mjs
 *
 * Exit codes
 *   0  the authenticated provider/admin surfaces match the directory model
 *   1  at least one active regression was found
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

const failures = [];
const fail = (file, message) => failures.push({ file, message });

// ───────────────────────────────────────────────────────────────────────────
// Surfaces in scope
// ───────────────────────────────────────────────────────────────────────────

/** Individual files that ARE the active authenticated product surface. */
const ACTIVE_FILES = [
  "src/components/provider/ProviderShell.tsx",
  "src/components/provider/ProviderSidebar.tsx",
  "src/components/provider/MobileBottomNav.tsx",
  "src/components/provider/ProviderSearchCommand.tsx",
  "src/hooks/useProviderSearch.ts",
  "src/pages/provider/Dashboard.tsx",
  "src/pages/provider/Inquiries.tsx",
  // Mounted directly by ProviderShell — part of the authenticated chrome a
  // provider sees on every page, so they are active product surface even
  // though they are not "navigation".
  "src/components/provider/DunningBanner.tsx",
  "src/components/provider/promo/ConversionPromoPopup.tsx",
  "src/components/provider/WelcomeModal.tsx",
  "src/components/admin/AdminShell.tsx",
  "src/components/admin/AdminHeader.tsx",
  "src/components/admin/adminNavConfig.ts",
  "src/pages/admin/AdminDashboard.tsx",
  "src/pages/admin/AdminLeads.tsx",
];

/** Directories whose every file is an active authenticated surface. */
const ACTIVE_DIRS = [
  "src/components/admin/dashboard",
  "src/components/admin/inquiries",
  "src/components/provider/inquiries",
];

/**
 * Files inside an ACTIVE_DIR that are exempt. The historical archive and the
 * unmounted legacy workspace must be able to name the workflow they preserve.
 */
const EXEMPT = new Set([
  // Unmounted legacy components are Stage-4 deletions, not active UX.
  // (none currently live under an ACTIVE_DIR — listed for future use)
]);

function collectFiles() {
  const out = [];
  for (const rel of ACTIVE_FILES) {
    if (!existsSync(join(ROOT, rel))) {
      fail(rel, "expected active surface is missing — update this guard's scope");
      continue;
    }
    out.push(rel);
  }
  for (const dir of ACTIVE_DIRS) {
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) {
      fail(dir, "expected active surface directory is missing — update this guard's scope");
      continue;
    }
    for (const entry of readdirSync(abs)) {
      const full = join(abs, entry);
      if (statSync(full).isDirectory()) continue;
      if (!/\.(tsx?|ts)$/.test(entry)) continue;
      if (/\.test\.tsx?$/.test(entry)) continue;
      const rel = relative(ROOT, full).split("\\").join("/");
      if (EXEMPT.has(rel)) continue;
      out.push(rel);
    }
  }
  return [...new Set(out)];
}

// ───────────────────────────────────────────────────────────────────────────
// 1. TERMS — retired concepts must not appear in user-facing copy
// ───────────────────────────────────────────────────────────────────────────

/**
 * Comments are stripped before scanning so a note explaining WHY something was
 * retired never trips the guard. Naive but sufficient for this codebase: no
 * scanned file contains "//" or "/*" inside a string literal.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1 ");
}

/**
 * Extract only what a human can read: quoted string literals and JSX text
 * nodes. Identifiers (usePendingConciergeCount), table names, and variables
 * are therefore out of reach of the term rules — as required.
 */
function userFacingText(src) {
  const stripped = stripComments(src);
  const chunks = [];
  for (const m of stripped.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) chunks.push(m[1]);
  for (const m of stripped.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) chunks.push(m[1]);
  // JSX text between tags, e.g. `>Manage Concierge<`
  for (const m of stripped.matchAll(/>([^<>{}]{2,})</g)) chunks.push(m[1]);
  return chunks;
}

/**
 * Strings that legitimately contain a scanned word. These are live products,
 * canonical routes, or database identifiers — not retired workflows.
 */
const STRING_ALLOWLIST = [
  /^\/provider\/marketing\/featured$/,
  // `target_product` enum value from the promotions table; the popup suppresses
  // this case rather than advertising it.
  /^concierge$/,
  /^\/admin\/subscriptions\?tab=featured$/,
  /^featured_placements$/,
  /^facility_subscriptions$/,
  /^has_featured$/,
  /^marketing-hub-featured-count$/,
];

/**
 * A PostgREST select list is a database identifier, not copy. These strings are
 * long comma-separated runs of snake_case column names — `redistribution_status`
 * legitimately appears in one because the column still exists (Stage-4 debt).
 * Requiring 3+ comma-separated snake_case tokens and no spaces inside tokens
 * keeps this from swallowing real prose.
 */
function isColumnList(text) {
  const parts = text.split(",").map((t) => t.trim());
  if (parts.length < 3) return false;
  return parts.every((t) => /^[a-z_][a-z0-9_]*$/.test(t));
}

/**
 * Retired-workflow concepts. Each rule is a concept, not a bare word — the
 * live product genuinely says "Featured Placements" and "priority placement",
 * so banning "placement" outright would be wrong.
 */
const TERM_RULES = [
  { re: /\bconcierge\b/i, why: "Concierge is a retired product" },
  { re: /placement\s+(pipeline|fee|revenue|case|center|network|advisor|status)/i, why: "placement workflow is retired" },
  { re: /\b(active\s+placements|total\s+placed|placed\s+this\s+month|placement\s+rate)\b/i, why: "placement outcome metrics are retired" },
  { re: /\b(placement|case)\s+advisor\b/i, why: "advisor workflow is retired" },
  { re: /\badvisor\s+(inbox|assignment|workload|earnings|case)/i, why: "advisor workflow is retired" },
  { re: /\bassign(ed)?\s+(an?\s+)?advisor\b/i, why: "advisor assignment is retired" },
  { re: /\b(send|sent)\s+introductions?\b/i, why: "introductions are a retired placement step" },
  { re: /\bintroductions?\s+(sent|batch|tab)\b/i, why: "introductions are a retired placement step" },
  { re: /\b(tour|move[-\s]in)\s+(coordination|scheduling|status)\b/i, why: "tours/move-ins are a retired placement step" },
  { re: /\badmission\s+coordination\b/i, why: "RehabLookup does not coordinate admissions" },
  { re: /\b(buy|purchase|unlock)\s+(this\s+|a\s+)?leads?\b/i, why: "leads are never sold" },
  { re: /\blead\s+(marketplace|credits?|packages?|bidding|resale|sale)\b/i, why: "leads are never sold" },
  { re: /\bcredit\s+balance\b/i, why: "lead credits are retired" },
  { re: /\b(reassign|redistribut)/i, why: "an inquiry is pinned to the facility the seeker selected" },
  { re: /\bmatch(ed)?\s+(candidates?|patients?|facilities)\b/i, why: "inquiries are never matched" },
  { re: /\b(qualified|verified|purchased|unlocked|exclusive|patient)\s+leads?\b/i, why: "inquiries must not be sold or over-claimed" },
];

function checkTerms(files) {
  for (const rel of files) {
    const src = read(rel);
    for (const chunk of userFacingText(src)) {
      const text = chunk.trim();
      if (!text) continue;
      if (STRING_ALLOWLIST.some((re) => re.test(text))) continue;
      if (isColumnList(text)) continue;
      for (const rule of TERM_RULES) {
        if (rule.re.test(text)) {
          fail(rel, `retired concept in user-facing copy (${rule.why}): ${JSON.stringify(text.slice(0, 90))}`);
        }
      }
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// 2. LABELS — the current inquiry workflow is "Inquiries", never "Leads"
// ───────────────────────────────────────────────────────────────────────────

function checkNavLabels() {
  const surfaces = [
    ["src/components/provider/ProviderSidebar.tsx", /label:\s*"([^"]+)"/g],
    ["src/components/provider/MobileBottomNav.tsx", /label:\s*"([^"]+)"/g],
    ["src/components/admin/adminNavConfig.ts", /label:\s*"([^"]+)"/g],
  ];
  for (const [rel, re] of surfaces) {
    const src = stripComments(read(rel));
    for (const m of src.matchAll(re)) {
      const label = m[1];
      if (/^leads?$/i.test(label) || /\blead\b/i.test(label)) {
        fail(rel, `primary nav label ${JSON.stringify(label)} presents the current inquiry workflow as "Leads" — it must read "Inquiries"`);
      }
    }
  }

  // The inquiry destination must actually be present in provider navigation:
  // removing the entry would "pass" a ban-list, so assert the positive.
  for (const rel of [
    "src/components/provider/ProviderSidebar.tsx",
    "src/components/provider/MobileBottomNav.tsx",
  ]) {
    const src = read(rel);
    if (!src.includes('"/provider/inquiries"')) {
      fail(rel, "provider primary navigation must link to /provider/inquiries");
    }
    if (!/label:\s*"Inquiries"/.test(stripComments(src))) {
      fail(rel, 'provider primary navigation must label the inquiry workflow "Inquiries"');
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// 3. ROUTES — nav destinations resolve to real, canonical, non-retired routes
// ───────────────────────────────────────────────────────────────────────────

/**
 * Parse the authenticated route blocks out of App.tsx. Returns a map of
 * absolute path → { redirect: boolean }.
 */
function parseAuthRoutes() {
  const app = read("src/App.tsx");
  const routes = new Map();

  for (const [prefix, marker] of [
    ["/provider", '<Route path="/provider" element={<ProviderShell />}>'],
    ["/admin", '<Route path="/admin" element={<AdminShell />}>'],
  ]) {
    const start = app.indexOf(marker);
    if (start === -1) {
      fail("src/App.tsx", `could not locate the ${prefix} shell route block — update this guard`);
      continue;
    }
    // The block ends at the first "</Route>" after the marker.
    const end = app.indexOf("</Route>", start);
    const block = app.slice(start, end === -1 ? undefined : end);

    routes.set(prefix, { redirect: false });
    for (const m of block.matchAll(/<Route\s+path="([^"]+)"\s+element=\{(<Navigate)?/g)) {
      const sub = m[1];
      if (sub === "/provider" || sub === "/admin") continue;
      routes.set(`${prefix}/${sub}`, { redirect: Boolean(m[2]) });
    }
  }

  // Top-level authenticated routes declared outside the shells.
  for (const m of read("src/App.tsx").matchAll(/<Route\s+path="(\/(?:provider|admin)\/[^"]+)"\s+element=\{(<Navigate)?/g)) {
    if (!routes.has(m[1])) routes.set(m[1], { redirect: Boolean(m[2]) });
  }

  return routes;
}

/**
 * Destinations a retired workflow used to own. None may appear in active
 * navigation — that is what would make the workflow live again.
 */
const NAV_FORBIDDEN = [
  /^\/provider\/marketing\/concierge$/,
  /^\/provider\/billing\/(concierge|placements)$/,
  /^\/provider\/placements?$/,
  /^\/provider\/placement-network$/,
  /^\/provider\/credits$/,
  /^\/admin\/concierge/,
  /^\/admin\/inbox$/,
  /^\/admin\/provider-directory$/,
  /^\/admin\/international/,
  /^\/admin\/placement-revenue$/,
];

/**
 * Redirect targets that would keep a retired WORKFLOW reachable. This is a
 * strict subset of NAV_FORBIDDEN: /admin/concierge is deliberately absent
 * because it now serves the READ-ONLY historical archive, which is exactly
 * where a stale placement bookmark should land. A redirect into a route that
 * still runs the retired workflow is what this catches.
 */
const REDIRECT_FORBIDDEN = [
  /^\/provider\/marketing\/concierge$/,
  /^\/provider\/billing\/(concierge|placements)$/,
  /^\/provider\/credits$/,
  /^\/admin\/inbox$/,
  /^\/admin\/provider-directory$/,
  /^\/admin\/international/,
  /^\/admin\/placement-revenue$/,
];

function navDestinations() {
  const out = [];
  const grab = (rel, re, group = 1) => {
    const src = stripComments(read(rel));
    for (const m of src.matchAll(re)) out.push([rel, m[group]]);
  };
  grab("src/components/provider/ProviderSidebar.tsx", /href:\s*"(\/provider\/[^"]+)"/g);
  grab("src/components/provider/MobileBottomNav.tsx", /href:\s*"(\/provider\/[^"]+)"/g);
  grab("src/components/admin/adminNavConfig.ts", /to:\s*"(\/admin[^"]*)"/g);
  return out;
}

function checkRoutes() {
  const routes = parseAuthRoutes();
  for (const [rel, dest] of navDestinations()) {
    if (NAV_FORBIDDEN.some((re) => re.test(dest))) {
      fail(rel, `navigation points at retired workflow ${dest}`);
      continue;
    }
    const entry = routes.get(dest);
    if (!entry) {
      fail(rel, `navigation destination ${dest} does not resolve to a mounted route (dead link)`);
      continue;
    }
    if (entry.redirect) {
      fail(rel, `navigation destination ${dest} is a compatibility redirect, not a canonical page`);
    }
  }

  // No redirect may point at another redirect or at a retired workflow.
  const app = read("src/App.tsx");
  for (const m of app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<Navigate\s+to="([^"]+)"/g)) {
    const [, from, to] = m;
    if (!/^\/(provider|admin)/.test(to)) continue;
    if (REDIRECT_FORBIDDEN.some((re) => re.test(to))) {
      fail("src/App.tsx", `redirect ${from} → ${to} lands on a retired workflow`);
    }
    const target = routes.get(to.split("?")[0]);
    if (target?.redirect) {
      fail("src/App.tsx", `redirect ${from} → ${to} lands on another redirect (redirect chain)`);
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// 4. IMPORTS — no active module may pull a retired page back into the graph
// ───────────────────────────────────────────────────────────────────────────

/**
 * The retired placement/Concierge workspace still exists on disk for Stage-4
 * deletion. It must stay UNMOUNTED and UNREFERENCED: a route, a prefetch map,
 * or an eager panel preload that imports it puts the retired workflow back into
 * the active bundle graph even when no nav links to it.
 */
const RETIRED_PAGE_IMPORTS = [
  // Exact component names — AdminConciergeHistorical must NOT match.
  "pages/admin/AdminConcierge",
  "pages/admin/AdminConciergeAuditReview",
  "pages/admin/AdminConciergeMetrics",
  "pages/admin/AdvisorInbox",
  "pages/admin/AdvisorProviderDirectory",
  "pages/provider/MarketingConcierge",
  "pages/provider/BillingConcierge",
  "pages/provider/BillingPlacements",
];

/** Modules that decide what the app mounts or preloads. */
const MOUNT_SURFACES = [
  "src/App.tsx",
  "src/lib/routePrefetch.ts",
  "src/lib/adminPrefetch.ts",
  "src/components/PrefetchLink.tsx",
];

function checkRetiredImports() {
  for (const rel of MOUNT_SURFACES) {
    if (!existsSync(join(ROOT, rel))) {
      fail(rel, "expected mount surface is missing — update this guard's scope");
      continue;
    }
    const src = stripComments(read(rel));
    for (const m of src.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) {
      const spec = m[1];
      for (const retired of RETIRED_PAGE_IMPORTS) {
        // Endswith, so AdminConciergeHistorical does not match AdminConcierge.
        if (spec.endsWith(retired)) {
          fail(rel, `imports retired page ${spec} — it must stay unmounted until Stage 4 deletes it`);
        }
      }
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────

const files = collectFiles();
checkTerms(files);
checkNavLabels();
checkRoutes();
checkRetiredImports();

if (failures.length > 0) {
  console.error("\n✖ Provider/admin directory-model guard failed\n");
  const byFile = new Map();
  for (const f of failures) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f.message);
  }
  for (const [file, messages] of byFile) {
    console.error(`  ${file}`);
    for (const m of messages) console.error(`    → ${m}`);
    console.error("");
  }
  console.error(
    `${failures.length} problem(s). RehabLookup is a directory: no placement, no\n` +
      "advisor, no concierge, no lead marketplace in the authenticated product.\n" +
      "Backend artifacts, migrations, unmounted legacy components, and comments\n" +
      "explaining retired concepts are out of scope for this guard.\n",
  );
  process.exit(1);
}

console.log(`✓ provider/admin directory-model guard passed (${files.length} active surfaces scanned)`);
