#!/usr/bin/env node
/**
 * check-pro-phone-visibility.mjs
 *
 * Build-time guard for the PUBLIC FACILITY PHONE contract:
 *
 *   Publishing a facility's phone number is a paid feature of an ACTIVE PRO
 *   subscription. Free, Featured-only and lapsed listings expose none.
 *   Featured is paid VISIBILITY and never unlocks a contact channel.
 *
 * WHY A SEPARATE CHECK
 * ────────────────────
 * `check:inquiry-routing-prerender` proves the contract on GENERATED ARTIFACTS.
 * This one proves it in SOURCE, across the layers a generated page never sees:
 * the database migration, the public Edge responses, and the React surfaces.
 *
 * The failure this exists to prevent is specific and already happened once: a
 * comment in get-public-facilities asserted "the view masks phone for non-Pro"
 * while the view's Pro CASE had in fact been dropped, and the base table was
 * separately readable by anon anyway. Everything READ as if it were audited.
 * So this guard asserts mechanisms, not prose.
 *
 * WHAT IT IS NOT
 * ──────────────
 * It is deliberately NOT a repo-wide ban on the token `phone`. Providers,
 * admins, seekers' own callback numbers, crisis lines and RehabLookup's own
 * support number are all legitimate. The scan targets one specific shape: a
 * PUBLIC component turning a FACILITY's phone into visible digits or a tel:
 * link without going through the shared entitlement rule.
 *
 * Usage
 *   node scripts/check-pro-phone-visibility.mjs
 *
 * Exit codes
 *   0  contract intact
 *   1  at least one violation
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const exists = (rel) => existsSync(join(ROOT, rel));

const stripJs = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const stripSql = (sql) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");

const violations = [];
const fail = (layer, rule, detail = "") => violations.push({ layer, rule, detail });

// ── 1. DATABASE ─────────────────────────────────────────────────────────────
// The public projection must mask phone, AND the raw base-table path that
// makes view-level masking meaningless must be closed. Either alone is a leak.
function checkDatabase() {
  const dir = join(ROOT, "supabase", "migrations");
  if (!existsSync(dir)) return fail("database", "supabase/migrations not found");

  const migrations = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: stripSql(readFileSync(join(dir, name), "utf8")) }));

  const viewMig = [...migrations]
    .reverse()
    .find((m) => /CREATE OR REPLACE VIEW public\.public_facilities/i.test(m.sql));
  if (!viewMig) {
    fail("database", "no migration defines public.public_facilities");
  } else if (!/CASE\s+WHEN\s+has_active_pro\(id\)\s+THEN\s+phone\s+ELSE\s+NULL/i.test(viewMig.sql)) {
    fail(
      "database",
      "public_facilities.phone is not gated by has_active_pro(id)",
      `latest definition: ${viewMig.name}`,
    );
  }

  const bypassMig = [...migrations]
    .reverse()
    .find((m) => /DROP POLICY IF EXISTS "facilities_select_public"/.test(m.sql));
  if (!bypassMig) {
    fail(
      "database",
      "the TO public approved-row policy on facilities is still in place — " +
        "anon and any authenticated seeker can bypass the view with `select phone from facilities`",
    );
  } else {
    if (!/REVOKE SELECT ON public\.facilities FROM anon/i.test(bypassMig.sql)) {
      fail("database", "anon's table-level SELECT on facilities is not revoked", bypassMig.name);
    }
    if (!/column_name\s*<>\s*'phone'/i.test(bypassMig.sql)) {
      fail("database", "anon is not re-granted every column EXCEPT phone", bypassMig.name);
    }
    const replacement = bypassMig.sql.match(
      /CREATE POLICY "facilities_select_public_anon"[\s\S]*?;/,
    );
    if (replacement && /TO (public|authenticated)\b/.test(replacement[0])) {
      fail(
        "database",
        "the replacement facilities policy is not anon-scoped — the bypass was re-created",
        bypassMig.name,
      );
    }
    // The raw number must remain readable by its owner.
    if (/REVOKE[^;]*FROM authenticated/i.test(bypassMig.sql)) {
      fail(
        "database",
        "revoking from `authenticated` would break provider/admin raw phone access",
        bypassMig.name,
      );
    }
  }
}

// ── 2. PUBLIC EDGE FUNCTIONS ────────────────────────────────────────────────
// These read with the SERVICE ROLE, which bypasses RLS by design. The mask has
// to be explicit in the handler; the database cannot save them.
function checkEdge() {
  const FN_PUBLIC = "supabase/functions/get-public-facilities/index.ts";
  if (!exists(FN_PUBLIC)) return fail("edge", `${FN_PUBLIC} not found`);
  const pub = stripJs(read(FN_PUBLIC));
  if (!/phone:\s*isPro\s*\?\s*f\.phone\s*:\s*null/.test(pub)) {
    fail("edge", "get-public-facilities does not defensively mask phone on is_pro");
  }
  if (!/f\.is_pro === true/.test(pub)) {
    fail("edge", "get-public-facilities does not resolve is_pro with an exact === true test");
  }
  if (/website:\s*isPro\s*\?/.test(pub)) {
    fail("edge", "get-public-facilities Pro-gates website — only PHONE is monetized");
  }

  const FN_ROT = "supabase/functions/get-featured-rotation/index.ts";
  if (!exists(FN_ROT)) return fail("edge", `${FN_ROT} not found`);
  const rot = stripJs(read(FN_ROT));
  if (!/display_phone:/.test(rot)) return; // shape changed; nothing to gate
  const gate = rot.slice(rot.indexOf("display_phone:"), rot.indexOf("position_in_rail"));
  if (!/proFacilityIds\.has\(/.test(gate)) {
    fail(
      "edge",
      "get-featured-rotation publishes display_phone without a canonical Pro gate — " +
        "Featured and the unsubscribed fallback pool would leak a phone",
    );
  }
  if (/tier\s*===?\s*["']pro["']/.test(rot)) {
    fail("edge", "get-featured-rotation re-derives Pro locally instead of using has_active_pro()");
  }
}

// ── 3. FRONTEND ─────────────────────────────────────────────────────────────
const SHARED_RULE = "src/lib/facilityPhoneVisibility.ts";

/**
 * Public surfaces that render a FACILITY phone. Each must resolve it through
 * the shared rule (or, for CenterProfile, its explicit is_pro flag) rather
 * than reading `.phone` straight onto the page.
 */
const PUBLIC_PHONE_SURFACES = [
  "src/components/cards/SearchResultCard.tsx",
  "src/components/cards/TreatmentCenterCard.tsx",
  "src/pages/Comparison.tsx",
];

/** Directories whose phone rendering is internal and intentionally ungated. */
const INTERNAL_PREFIXES = [
  "src/components/admin/",
  "src/components/provider/",
  "src/pages/admin/",
  "src/pages/provider/",
];

function checkFrontend() {
  if (!exists(SHARED_RULE)) {
    return fail("frontend", `${SHARED_RULE} (the single phone rule) is missing`);
  }
  const rule = stripJs(read(SHARED_RULE));
  if (!/isPro !== true/.test(rule)) {
    fail("frontend", "the shared rule does not fail closed on `isPro !== true`");
  }
  if (/featured|verified/i.test(rule)) {
    fail("frontend", "the shared rule consults Featured/verified — neither unlocks a phone");
  }

  for (const rel of PUBLIC_PHONE_SURFACES) {
    if (!exists(rel)) {
      fail("frontend", `${rel} not found (public phone surface list is stale)`);
      continue;
    }
    if (!/resolvePublicFacilityPhone/.test(stripJs(read(rel)))) {
      fail("frontend", `${rel} does not resolve its phone through the shared rule`);
    }
  }

  const profile = "src/pages/CenterProfile.tsx";
  if (exists(profile)) {
    const code = stripJs(read(profile));
    // Must resolve through the shared rule, seeded from canonical is_pro.
    if (
      !/resolvePublicFacilityPhone\(\{[\s\S]{0,120}isPro:\s*facility\.is_pro/.test(code)
    ) {
      fail("frontend", "CenterProfile does not gate the facility phone on canonical is_pro");
    }
    if (!/phone:\s*showFacilityPhone \? facility\.phone : undefined/.test(code)) {
      fail("frontend", "CenterProfile structured data does not follow the on-page phone contract");
    }
  }

  // Repo-wide shape scan: a PUBLIC component building `tel:` directly from a
  // facility phone field. Internal provider/admin surfaces are exempt.
  for (const file of walk(join(ROOT, "src"))) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (!/\.tsx?$/.test(rel)) continue;
    if (rel.includes("__tests__") || rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
    if (INTERNAL_PREFIXES.some((p) => rel.startsWith(p))) continue;
    if (rel === SHARED_RULE) continue;

    const code = stripJs(readFileSync(file, "utf8"));
    // `tel:` built from something named *.phone / phoneOverride / display_phone.
    const re = /tel:\$\{[^}]*\b(?:facility|center|f|d\.facility)\.phone\b[^}]*\}/g;
    let m;
    while ((m = re.exec(code))) {
      fail(
        "frontend",
        `${rel} builds a facility tel: link directly from .phone — route it through resolvePublicFacilityPhone()`,
        m[0].slice(0, 80),
      );
    }
  }
}

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (entry === "node_modules") continue;
    const st = statSync(abs);
    if (st.isDirectory()) yield* walk(abs);
    else yield abs;
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function main() {
  checkDatabase();
  checkEdge();
  checkFrontend();

  console.log("[pro-phone-visibility] checked database, public edge functions, frontend surfaces");

  if (violations.length === 0) {
    console.log(
      "✓ the public facility phone is published only for canonical active Pro, " +
        "and the raw base-table bypass is closed",
    );
    process.exit(0);
  }

  console.error(`\n✗ ${violations.length} public-phone contract violation(s):\n`);
  for (const v of violations) {
    console.error(`  [${v.layer}] ${v.rule}`);
    if (v.detail) console.error(`      ${v.detail}`);
  }
  console.error(
    "\n  Phone visibility is a PAID feature of an active Pro subscription. It is derived\n" +
      "  from has_active_pro() (projected as public_facilities.is_pro) and from nothing\n" +
      "  else — not Featured, not verified, not claim state. Masking the view alone is\n" +
      "  insufficient while the raw facilities table is publicly selectable.\n",
  );
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) main();

export { checkDatabase, checkEdge, checkFrontend, violations };
