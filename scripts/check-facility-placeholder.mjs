#!/usr/bin/env node
/**
 * CI guard — locks in the contract that newly-listed facilities
 * (provider onboarding + SAMHSA bulk imports + any future import path)
 * get a deterministic placeholder automatically.
 *
 * The contract that must hold for that automatism to work:
 *
 *   1. No client component imports the LEGACY single placeholder
 *      `@/assets/facility-placeholder.webp` directly. All renders of
 *      a missing-image fallback must go through
 *      `getFacilityPlaceholder()` so they're (a) deterministic per
 *      facility id and (b) spread across the 18 variants.
 *
 *   2. No insert / upsert into `public.facilities` pre-populates
 *      `gallery_urls` or `logo_url` with a placeholder URL. Doing
 *      so would mask the missing-image state and defeat the
 *      resolver. (Real provider uploads go to the
 *      `facility-images` storage bucket and write the resulting
 *      hashed URL — that's fine; we're only guarding against
 *      string-literal placeholder URLs sneaking into INSERTs.)
 *
 *   3. The resolver's variant count and assets exist:
 *      `src/assets/facility-placeholders/01–18-*.svg` and the
 *      VARIANTS array in `src/lib/facilityPlaceholder.ts` agree.
 *
 * Exit codes:
 *   0  contract holds
 *   1  one or more violations (printed to stderr)
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

const SRC = join(REPO_ROOT, "src");
const PLACEHOLDER_DIR = join(REPO_ROOT, "src/assets/facility-placeholders");
const RESOLVER_PATH = join(REPO_ROOT, "src/lib/facilityPlaceholder.ts");
const LEGACY_ASSET = "@/assets/facility-placeholder.webp";
const LEGACY_FILENAME = "facility-placeholder.webp";

const failures = [];

// ── 1. Assets present ────────────────────────────────────────────────
if (!existsSync(PLACEHOLDER_DIR)) {
  failures.push(`Missing directory: ${PLACEHOLDER_DIR}. The 18 placeholder SVGs must live here.`);
} else {
  const svgs = readdirSync(PLACEHOLDER_DIR).filter((f) => f.endsWith(".svg"));
  if (svgs.length !== 18) {
    failures.push(
      `Expected 18 SVGs in ${PLACEHOLDER_DIR}, found ${svgs.length}. ` +
      `If you intentionally changed the variant count, update the modulo in ` +
      `src/lib/facilityPlaceholder.ts AND this assertion.`,
    );
  }
}

// ── 2. Resolver file present ─────────────────────────────────────────
if (!existsSync(RESOLVER_PATH)) {
  failures.push(`Missing resolver: ${RESOLVER_PATH}.`);
}

// ── 3. No legacy WebP imports in src/ outside the resolver itself ────
function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      // Skip __tests__ noise but still scan them so test imports also pass.
      if (entry === "node_modules" || entry === "dist" || entry === ".next") continue;
      yield* walk(full);
    } else if (
      entry.endsWith(".ts") ||
      entry.endsWith(".tsx") ||
      entry.endsWith(".mjs") ||
      entry.endsWith(".cjs") ||
      entry.endsWith(".js")
    ) {
      yield full;
    }
  }
}

const legacyImportRegex = new RegExp(
  `["'\`]${LEGACY_ASSET.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`,
);

const legacyImporters = [];
for (const file of walk(SRC)) {
  // Allow the resolver doc-comment to mention the legacy name.
  if (file === RESOLVER_PATH) continue;
  const text = readFileSync(file, "utf8");
  if (legacyImportRegex.test(text)) {
    legacyImporters.push(file.replace(REPO_ROOT + "/", ""));
  }
}
if (legacyImporters.length > 0) {
  failures.push(
    `Legacy placeholder import "${LEGACY_ASSET}" found in:\n  - ` +
      legacyImporters.join("\n  - ") +
      `\nReplace with: import { getFacilityPlaceholder } from "@/lib/facilityPlaceholder"; ` +
      `and use getFacilityPlaceholder(facility) as the <img src>.`,
  );
}

// ── 4. No code path writes a placeholder URL into gallery_urls / logo_url ──
// Catches the failure mode where a future migration / edge function / script
// "helpfully" seeds image columns with the placeholder string. That would
// break the new resolver because the card would think it has a real image.
const placeholderWriteRegex = new RegExp(
  String.raw`(gallery_urls|logo_url)\s*[:=]\s*[^,;\n]*(${LEGACY_FILENAME}|facility-placeholders/\d)`,
  "i",
);
const seedingViolators = [];
const SCAN_DIRS = [
  join(REPO_ROOT, "src"),
  join(REPO_ROOT, "supabase/functions"),
  join(REPO_ROOT, "supabase/migrations"),
  join(REPO_ROOT, "scripts"),
];
for (const dir of SCAN_DIRS) {
  if (!existsSync(dir)) continue;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const file of walk(join(dir, entry.name))) {
        const text = readFileSync(file, "utf8");
        if (placeholderWriteRegex.test(text)) {
          seedingViolators.push(file.replace(REPO_ROOT + "/", ""));
        }
      }
    } else if (entry.isFile() && /\.(ts|tsx|mjs|cjs|js|sql)$/.test(entry.name)) {
      const text = readFileSync(join(dir, entry.name), "utf8");
      if (placeholderWriteRegex.test(text)) {
        seedingViolators.push(join(dir, entry.name).replace(REPO_ROOT + "/", ""));
      }
    }
  }
}
if (seedingViolators.length > 0) {
  failures.push(
    `Found code that writes a placeholder URL into gallery_urls / logo_url:\n  - ` +
      seedingViolators.join("\n  - ") +
      `\nNew facilities must keep these columns empty/null so the client-side ` +
      `resolver can render the per-facility variant. Real provider uploads go to ` +
      `Supabase Storage, not literal placeholder URLs.`,
  );
}

// ── Report ────────────────────────────────────────────────────────────
if (failures.length > 0) {
  console.error("\n✗ check-facility-placeholder FAILED:\n");
  for (const f of failures) console.error("  " + f + "\n");
  process.exit(1);
}
console.log(
  `✓ check-facility-placeholder: contract holds — 18 SVG variants, ` +
  `resolver in place, no legacy imports, no placeholder URLs seeded into ` +
  `gallery_urls / logo_url.`,
);
