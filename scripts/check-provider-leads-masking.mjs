#!/usr/bin/env node
/**
 * Provider Panel — Lead Masking Static Audit
 * ------------------------------------------------------------
 * Enforces the PII-until-unlock contract for the provider panel by
 * scanning every file under provider-scoped directories and blocking:
 *
 *   1. Reads from the unmasked base table:
 *        supabase.from("leads").select(...)
 *      Provider code MUST read leads exclusively through the masked
 *      view `leads_provider_view`. Updates (.update / .upsert / .delete)
 *      against `leads` are allowed for status/snooze fields and are
 *      gated by RLS.
 *
 *   2. `select("*")` on any leads source — explicit columns only
 *      (per project core rule "No select(*)"). This prevents accidental
 *      future PII exposure when the base schema gains new columns.
 *
 * Exits 1 on violations so it can run in CI / build pipelines.
 *
 * Provider scope:
 *   - src/pages/provider/**
 *   - src/components/provider/**
 *   - src/hooks/useProvider*.ts
 *   - src/hooks/useLead*.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

const SCAN_ROOTS = [
  "src/pages/provider",
  "src/components/provider",
];

// Hooks that are part of the provider data layer
const HOOK_FILE_PATTERNS = [
  /^src\/hooks\/useProvider.*\.ts$/,
  /^src\/hooks\/useLead.*\.ts$/,
  /^src\/hooks\/usePendingInquiries.*\.ts$/,
];

/** Regex catalogue */
// .from("leads")  followed (within the same chained call, possibly across
// whitespace/newlines) by .select(...). We allow .update/.upsert/.delete.
const LEADS_BASE_SELECT = /\.from\(\s*["']leads["']\s*\)[\s\S]{0,200}?\.select\(/;

// .select("*") on any leads source (base table OR masked view)
const SELECT_STAR_ON_LEADS =
  /\.from\(\s*["'](?:leads|leads_provider_view)["']\s*\)[\s\S]{0,200}?\.select\(\s*["']\*["']/;

// Generic .select("*") flag (warn-only — many false positives elsewhere,
// but inside the provider scope we treat it as a hard error).
const ANY_SELECT_STAR = /\.select\(\s*["']\*["']\s*\)/;

const files = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)) {
      files.push(full);
    }
  }
}

for (const root of SCAN_ROOTS) walk(join(ROOT, root));

// Add matching hook files
const hooksDir = join(ROOT, "src/hooks");
try {
  for (const name of readdirSync(hooksDir)) {
    const rel = `src/hooks/${name}`;
    if (HOOK_FILE_PATTERNS.some((re) => re.test(rel)) && /\.ts$/.test(name)) {
      files.push(join(hooksDir, name));
    }
  }
} catch {
  // ignore
}

const violations = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);

  if (LEADS_BASE_SELECT.test(src)) {
    violations.push({
      file: rel,
      rule: "no-base-leads-select",
      message:
        'Provider code must not SELECT from base table `leads`. Use `leads_provider_view` (masks PII until unlocked).',
    });
  }

  if (SELECT_STAR_ON_LEADS.test(src) || ANY_SELECT_STAR.test(src)) {
    violations.push({
      file: rel,
      rule: "no-select-star",
      message:
        'Provider code must list explicit columns — `select("*")` is forbidden in provider scope.',
    });
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;

export function runProviderLeadsMaskingAudit() {
  return { files, violations };
}

if (isMain) {
  console.log(
    `🔍 [provider-leads-masking] Scanned ${files.length} provider-scoped files…`,
  );
  if (violations.length === 0) {
    console.log(
      "✅ [provider-leads-masking] All provider routes read leads through `leads_provider_view` with explicit columns.",
    );
    process.exit(0);
  }

  console.error(
    `\n❌ [provider-leads-masking] Found ${violations.length} violation(s):\n`,
  );
  for (const v of violations) {
    console.error(`  • [${v.rule}] ${v.file}`);
    console.error(`      ${v.message}`);
  }
  console.error(
    "\nFix: replace `.from(\"leads\").select(...)` with `.from(\"leads_provider_view\").select(\"id, …explicit columns\")`.",
  );
  process.exit(1);
}
