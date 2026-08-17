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
  // Monetization surfaces. These are where a false promise is most expensive:
  // they are what a provider reads immediately before paying.
  "src/pages/provider/Billing.tsx",
  "src/pages/provider/MarketingHub.tsx",
  "src/pages/provider/MarketingFeatured.tsx",
  "src/pages/provider/EnhancedProfile.tsx",
  "src/pages/provider/Help.tsx",
  "src/components/provider/subscription/ProUpgradeChoices.tsx",
  "src/components/provider/ProBenefitsWidget.tsx",
  "src/components/provider/FreeTierValueTeaser.tsx",
  "src/components/provider/DashboardPerformanceCard.tsx",
  "src/components/provider/DashboardListingHealthCard.tsx",
  "src/components/provider/LockedFeaturePreview.tsx",
  "src/components/provider/onboarding/UpgradeDialog.tsx",
  "src/components/provider/onboarding/PlanStep.tsx",
  "src/lib/planConstants.ts",
  "src/lib/proDirectoryBenefits.ts",
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
 * Words that hold a claim harmless. Truthful contract copy STATES the thing it
 * is denying — "Pro does not include a verified badge", "never reassigned",
 * "Featured is separate from Pro" — so a guard that matched the bare phrase
 * would reject exactly the wording this contract wants and push authors toward
 * vaguer copy.
 */
const NEGATOR =
  /\b(?:not|never|no|isn't|aren't|doesn't|does\s+not|don't|cannot|can't|without|unaffected|independent(?:ly)?|earned|separate(?:ly)?|excluded|neither|nor|unchanged|retired|legacy)\b/i;

/**
 * Split copy into clause-sized units. Negation is scoped to the CLAUSE it
 * governs, not the whole string: a disclaimer in one sentence must not excuse a
 * false claim in the next one.
 */
function clauseUnits(text) {
  return text
    .split(/(?<=[.!?])\s+|[;•·|]|\s+—\s+|,\s+(?=(?:and|but|or)\b)/)
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * A PREDICATE negation that immediately follows its subject. Truthful contract
 * copy names the thing before holding it harmless — "Concierge Partner is
 * retired", "Featured is separate from Pro", "the verified badge is unaffected" —
 * so a negator that appears just after the match still disclaims it.
 *
 * Deliberately narrow (anchored to the start of the trailing window, and a
 * smaller word set than NEGATOR) so it cannot excuse a live claim that merely
 * happens to have a "not" later in the sentence.
 */
const TRAILING_NEGATION =
  /^\s*(?:\w+\s+){0,2}?(?:is|are|was|were|remains?|stays?)\s+(?:not|never|no\s|retired|legacy|separate|independent|unaffected|unchanged|excluded)/i;

/**
 * True when `re` matches at least one clause in which the concept is being
 * ASSERTED rather than disclaimed — i.e. no negator precedes the match and no
 * predicate negation immediately follows it.
 */
function isLiveClaim(text, re) {
  for (const clause of clauseUnits(text)) {
    const m = clause.match(re);
    if (!m) continue;
    if (NEGATOR.test(clause.slice(0, m.index))) continue;
    if (TRAILING_NEGATION.test(clause.slice(m.index + m[0].length))) continue;
    return true;
  }
  return false;
}

/**
 * The contract module DEFINES the prohibited concepts (it exports the matcher
 * and the human-readable concept labels), so its own text necessarily contains
 * every banned phrase. Scanning it would be circular. Its correctness is
 * asserted instead by checkContractCentralization() plus the runtime suite in
 * src/__tests__/provider-pro-directory-model.test.ts.
 */
const CONTRACT_DEFINITION_FILES = new Set(["src/lib/proDirectoryBenefits.ts"]);

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

// ───────────────────────────────────────────────────────────────────────────
// 1b. PRO CONTRACT — Pro may not claim what RehabLookup does not sell
// ───────────────────────────────────────────────────────────────────────────

/**
 * Concepts that must never be presented as Pro entitlements on a provider
 * surface. Mirrors PRO_PROHIBITED_CLAIM_PATTERNS in
 * src/lib/proDirectoryBenefits.ts (the runtime contract) — this is the
 * build-time half, so a surface that stops importing the shared contract and
 * hardcodes its own list is still caught.
 *
 * MECHANISM-SHAPED, NOT WORD-BANNED. "verified", "Featured" and "ranking" are
 * all legitimate on these surfaces: the Featured hub sells Featured, the
 * verification card explains verification, and the listing-health card REPORTS
 * a directory position. What is banned is the specific expression that turns
 * one of those into something Pro buys.
 *
 * Each rule also carries `unless` — wordings that legitimately contain the
 * phrase because they NEGATE it. "Pro does not include a verified badge" and
 * "Can I purchase the verified badge? No." are exactly the copy this contract
 * wants; a guard that rejected them would push authors toward vaguer wording.
 */
const PRO_CLAIM_RULES = [
  {
    re: /verified\s+badge/i,
    why: "the Verified badge is earned through review, never sold with Pro",
    unless: [
      /\b(?:not|never|isn't|is not|no)\b[^.]{0,60}verified\s+badge/i,
      /verified\s+badge[^.]{0,80}\b(?:not|never|independent|earned|unaffected|hidden|paused|paused while|requires? (?:current )?verification)\b/i,
      /(?:can i|do i)[^.?]{0,40}verified\s+badge/i,
      /verification\s*\/\s*verified\s+badge/i,
    ],
  },
  {
    re: /\bpaid\s+verification\b/i,
    why: "verification is not a purchasable product",
    unless: [],
  },
  {
    re: /priority\s+(?:search\s+)?(?:ranking|rank|placement|position|listing|visibility)/i,
    why: "Pro does not buy organic position",
    unless: [/\b(?:not|never|no)\b[^.]{0,50}priority/i],
  },
  {
    re: /rank(?:ing)?\s+boost|boosts?\s+(?:your\s+)?rank/i,
    why: "there is no ranking boost",
    unless: [/\b(?:not|never|no)\b[^.]{0,50}(?:rank|boost)/i],
  },
  {
    re: /\+\s*50\b/,
    why: "the +50 ranking boost was retired",
    unless: [],
  },
  {
    re: /rank\s+higher|higher\s+in\s+search/i,
    why: "a listing does not rank higher because of a purchase",
    unless: [/\b(?:not|never|no|doesn't|does not)\b[^.]{0,50}rank/i],
  },
  {
    re: /qualified\s+leads?|guaranteed\s+(?:inquir|lead|admission)/i,
    why: "inquiries are never sold or guaranteed",
    unless: [/\b(?:not|never|no)\b[^.]{0,50}(?:qualified|guaranteed)/i],
  },
  {
    re: /(?:upgrade|subscribe)[^.]{0,30}\bto\s+(?:receive|get)\s+inquir/i,
    why: "every eligible facility receives inquiries on any tier",
    unless: [],
  },
  {
    re: /inquir\w*\s+(?:require|need)s?\s+(?:an?\s+)?pro/i,
    why: "inquiry eligibility is not a Pro entitlement",
    unless: [],
  },
  {
    re: /\bPro\s+required\b/i,
    why: "Featured is independent paid advertising, not a Pro entitlement",
    unless: [],
  },
];

/**
 * Featured must never be sold as included with Pro, and Pro must never list
 * Featured as one of its benefits.
 */
const FEATURED_BUNDLING_RULES = [
  {
    // Featured is never bundled into ANY plan — the retired copy bundled it into
    // Pro on the hub and into the Concierge plan on the Featured detail page.
    re: /Featured\s+is\s+included\s+(?:in|with)\b/i,
    why: "Featured is never included with a plan",
  },
  {
    re: /Pro[^.]{0,40}\bincludes?\b[^.]{0,40}Featured\s+(?:placement|rotation|advertising)/i,
    why: "Pro includes no Featured placement",
  },
  {
    re: /Marketing\s+Hub\s+\(Featured/i,
    why: "the retired Marketing Hub bundled Featured into Pro",
  },
];

function checkProContract(files) {
  for (const rel of files) {
    if (CONTRACT_DEFINITION_FILES.has(rel)) continue;
    const src = read(rel);
    for (const chunk of userFacingText(src)) {
      const text = chunk.trim();
      if (!text) continue;
      if (isColumnList(text)) continue;
      for (const rule of PRO_CLAIM_RULES) {
        if (rule.unless.some((ok) => ok.test(text))) continue;
        if (!isLiveClaim(text, rule.re)) continue;
        fail(
          rel,
          `Pro claims what it does not sell (${rule.why}): ${JSON.stringify(text.slice(0, 110))}`,
        );
      }
      for (const rule of FEATURED_BUNDLING_RULES) {
        if (isLiveClaim(text, rule.re)) {
          fail(rel, `Featured is bundled into Pro (${rule.why}): ${JSON.stringify(text.slice(0, 110))}`);
        }
      }
    }
  }
}

/**
 * Self-test. Every rule family above must still catch the copy that actually
 * shipped, and must still ACCEPT the truthful negated wording. Without this, a
 * regex edit that silently stops matching would turn the whole guard green.
 */
const MATCHER_FIXTURES = {
  mustFail: [
    ["RehabLookup Verified badge", PRO_CLAIM_RULES],
    ["Priority placement on city / state pages", PRO_CLAIM_RULES],
    ["Priority search ranking", PRO_CLAIM_RULES],
    ["Pro includes a +50 ranking boost", PRO_CLAIM_RULES],
    ["Complete profiles rank higher", PRO_CLAIM_RULES],
    ["Qualified leads delivered to your inbox", PRO_CLAIM_RULES],
    ["Upgrade to Pro to receive inquiries", PRO_CLAIM_RULES],
    ["Featured Placements — Pro required", PRO_CLAIM_RULES],
    ["Featured is included in your Concierge Partner plan", FEATURED_BUNDLING_RULES],
    ["Marketing Hub (Featured + Concierge add-ons)", FEATURED_BUNDLING_RULES],
  ],
  mustPass: [
    ["Pro does not include a verified badge.", PRO_CLAIM_RULES],
    ["Verification is never sold or bundled with Pro.", PRO_CLAIM_RULES],
    ["Featured does not change organic directory position.", PRO_CLAIM_RULES],
    ["Pro is not priority placement and never boosts your rank.", PRO_CLAIM_RULES],
    ["No. Featured is a separate product and Pro includes no Featured placement.", FEATURED_BUNDLING_RULES],
    ["An inquiry is never reassigned or resold.", TERM_RULES],
    ["Concierge Partner is retired and is not offered.", TERM_RULES],
  ],
};

function checkMatcherSelfTest() {
  for (const [copy, rules] of MATCHER_FIXTURES.mustFail) {
    const caught = rules.some((rule) => isLiveClaim(copy, rule.re));
    if (!caught) {
      fail(
        "scripts/check-provider-admin-directory-model.mjs",
        `the matcher no longer catches its own regression case: ${JSON.stringify(copy)}`,
      );
    }
  }
  for (const [copy, rules] of MATCHER_FIXTURES.mustPass) {
    const rejected = rules.find((rule) => isLiveClaim(copy, rule.re));
    if (rejected) {
      fail(
        "scripts/check-provider-admin-directory-model.mjs",
        `the matcher rejects truthful negated copy (${rejected.why}): ${JSON.stringify(copy)}`,
      );
    }
  }
}

/**
 * The contract must stay CENTRALIZED. A surface that stops importing
 * src/lib/proDirectoryBenefits.ts and hardcodes its own benefit array is how
 * the three contradicting lists appeared in the first place — so require the
 * import on the surfaces that sell Pro.
 */
const CONTRACT_CONSUMERS = [
  "src/pages/provider/Dashboard.tsx",
  "src/pages/provider/Billing.tsx",
  "src/components/provider/subscription/ProUpgradeChoices.tsx",
  "src/components/provider/ProBenefitsWidget.tsx",
  "src/lib/planConstants.ts",
];

function checkContractCentralization() {
  const contract = "src/lib/proDirectoryBenefits.ts";
  if (!existsSync(join(ROOT, contract))) {
    fail(contract, "the shared Pro benefit contract is missing");
    return;
  }
  const src = read(contract);
  for (const required of [
    "PRO_DIRECTORY_BENEFITS",
    "PRO_DIRECTORY_TRUST_NOTE",
    "FEATURED_DIRECTORY_NOTE",
    "FREE_DIRECTORY_BENEFITS",
  ]) {
    if (!src.includes(`export const ${required}`)) {
      fail(contract, `the shared contract no longer exports ${required}`);
    }
  }
  // The approved trust statement must be present verbatim.
  if (
    !src.includes(
      "Verification and organic directory position are determined independently and are never purchased with Pro.",
    )
  ) {
    fail(contract, "the approved Pro trust statement is missing or reworded");
  }

  for (const rel of CONTRACT_CONSUMERS) {
    if (!existsSync(join(ROOT, rel))) {
      fail(rel, "expected Pro contract consumer is missing — update this guard's scope");
      continue;
    }
    if (!read(rel).includes("@/lib/proDirectoryBenefits")) {
      fail(
        rel,
        "sells Pro without importing the shared contract — a local benefit array is " +
          "how the panel grew three contradicting Pro promises",
      );
    }
  }
}

function checkTerms(files) {
  for (const rel of files) {
    if (CONTRACT_DEFINITION_FILES.has(rel)) continue;
    const src = read(rel);
    for (const chunk of userFacingText(src)) {
      const text = chunk.trim();
      if (!text) continue;
      if (STRING_ALLOWLIST.some((re) => re.test(text))) continue;
      if (isColumnList(text)) continue;
      for (const rule of TERM_RULES) {
        if (isLiveClaim(text, rule.re)) {
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

  // The current navigation vocabulary. Renaming a destination back to a legacy
  // product name reintroduces the mental model the cutover removed.
  const sidebar = stripComments(read("src/components/provider/ProviderSidebar.tsx"));
  for (const [label, why] of [
    ["Performance", 'the analytics destination must read "Performance"'],
    ["Featured", 'the advertising hub must read "Featured"'],
    ["Plan & Billing", 'the billing destination must read "Plan & Billing"'],
    ["Enhanced Profile", "Enhanced Profile must be a first-class destination"],
  ]) {
    if (!sidebar.includes(`label: "${label}"`)) {
      fail("src/components/provider/ProviderSidebar.tsx", why);
    }
  }
  for (const legacy of ["Analytics", "Marketing", "Subscription", "My Listing"]) {
    if (new RegExp(`label:\\s*"${legacy}"`).test(sidebar)) {
      fail(
        "src/components/provider/ProviderSidebar.tsx",
        `navigation reverted to the legacy label "${legacy}"`,
      );
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
checkProContract(files);
checkContractCentralization();
checkMatcherSelfTest();
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
