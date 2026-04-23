#!/usr/bin/env node
/**
 * Build-time audit: ensures responsive layout guards stay in place across
 * key public pages and shells. Catches regressions like:
 *   - Removing `overflow-x-hidden` / `max-w-[100vw]` from Layout
 *   - Removing `min-w-0` from flex containers that hold dynamic text
 *   - Removing `truncate` / `break-words` from facility names, breadcrumbs
 *   - Removing `overflow-x-auto` wrappers around <table>
 *   - Adding fixed pixel widths >= 500px without a responsive override
 *   - Using grid-cols-N (N>=3) without smaller-screen tier (sm:/md:)
 *
 * Run via: node scripts/check-responsive-guards.mjs
 * Wired into `npm run build`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const errors = [];
const warnings = [];

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function fileExists(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

// ─── Rule 1: Layout shell global guards ──────────────────────────────────
function checkLayoutShell() {
  const file = path.join(SRC, "components/layout/Layout.tsx");
  if (!fileExists(file)) {
    errors.push(`[layout] Missing src/components/layout/Layout.tsx`);
    return;
  }
  const src = read(file);
  const required = [
    { token: "max-w-[100vw]", reason: "prevents horizontal overflow at root" },
    { token: "overflow-x-hidden", reason: "blocks rogue child overflow" },
    { token: "min-w-0", reason: "lets <main> shrink inside flex/grid" },
  ];
  for (const r of required) {
    if (!src.includes(r.token)) {
      errors.push(`[layout] Layout.tsx missing "${r.token}" — ${r.reason}`);
    }
  }
}

// ─── Rule 2: Global CSS safety net (index.css) ───────────────────────────
function checkGlobalCss() {
  const file = path.join(SRC, "index.css");
  if (!fileExists(file)) return;
  const src = read(file);
  const required = [
    { token: /overflow-x:\s*clip/i, label: "body { overflow-x: clip }" },
    { token: /max-width:\s*100%/i, label: "body { max-width: 100% }" },
    { token: /img,\s*video,\s*svg/i, label: "fluid media rule (img/video/svg max-width:100%)" },
  ];
  for (const r of required) {
    if (!r.token.test(src)) {
      errors.push(`[css] index.css missing global guard: ${r.label}`);
    }
  }
}

// ─── Rule 3: Provider/Admin shells use grid layout pattern ───────────────
function checkPanelShells() {
  const shells = [
    "components/provider/ProviderShell.tsx",
    "components/admin/AdminShell.tsx",
    "components/seeker/SeekerShell.tsx",
  ];
  for (const rel of shells) {
    const file = path.join(SRC, rel);
    if (!fileExists(file)) continue; // SeekerShell is optional
    const src = read(file);
    if (!src.includes("data-shell")) {
      warnings.push(`[shell] ${rel} missing data-shell attribute (used for layout containment)`);
    }
    if (!/min-h-0|min-w-0/.test(src)) {
      errors.push(`[shell] ${rel} missing min-h-0/min-w-0 — flex/grid children may overflow`);
    }
    if (!/overflow-y-auto|overflow-auto/.test(src)) {
      errors.push(`[shell] ${rel} missing scoped overflow scroll on <main>`);
    }
  }
}

// ─── Rule 4: Breadcrumbs handle long strings ─────────────────────────────
function checkBreadcrumbs() {
  const file = path.join(SRC, "components/seo/BreadcrumbNav.tsx");
  if (!fileExists(file)) return;
  const src = read(file);
  if (!/truncate|break-words|line-clamp/.test(src)) {
    errors.push(`[breadcrumb] BreadcrumbNav.tsx must clamp long labels (truncate / break-words / line-clamp)`);
  }
  if (!/overflow-x-auto|overflow-x-hidden|overflow-hidden/.test(src)) {
    errors.push(`[breadcrumb] BreadcrumbNav.tsx must wrap nav in horizontal-scroll or hidden overflow`);
  }
}

// ─── Rule 5: No fixed pixel widths >= 500px without override ─────────────
function checkFixedWidths() {
  const offenders = [];
  walk(SRC, (file) => {
    if (!/\.(tsx|jsx)$/.test(file)) return;
    const src = read(file);
    // match w-[NNNpx] or min-w-[NNNpx] where NNN >= 500
    const rx = /(?<!max-)(?:^|\s|"|')(min-)?w-\[(\d{3,})px\]/g;
    let m;
    while ((m = rx.exec(src))) {
      const px = Number(m[2]);
      if (px >= 500) {
        // Allow if same line / same file has a md:/lg:/xs: override or max-w
        const lineStart = src.lastIndexOf("\n", m.index) + 1;
        const lineEnd = src.indexOf("\n", m.index);
        const line = src.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
        if (
          /\b(?:max-w-|sm:w-|md:w-|lg:w-|xs:w-|sm:max-w-|md:max-w-|w-full|max-w-full|max-w-\[)/.test(line)
        ) continue;
        offenders.push(`${path.relative(ROOT, file)} → "${m[0].trim()}" without responsive override`);
      }
    }
  });
  for (const o of offenders) warnings.push(`[fixed-width] ${o}`);
}

// ─── Rule 6: Tables on key pages wrapped in overflow-x-auto ──────────────
function checkTableWrapping() {
  walk(path.join(SRC, "pages"), (file) => {
    if (!/\.(tsx|jsx)$/.test(file)) return;
    const src = read(file);
    if (!/<table[\s>]/.test(src)) return;
    // For each <table>, check the surrounding 200 chars contain overflow-x-auto/scroll
    const rx = /<table[\s>]/g;
    let m;
    while ((m = rx.exec(src))) {
      const window = src.slice(Math.max(0, m.index - 400), m.index);
      if (!/overflow-x-auto|overflow-x-scroll|overflow-auto/.test(window)) {
        warnings.push(`[table] ${path.relative(ROOT, file)} — <table> not inside overflow-x-auto wrapper`);
        break; // one per file is enough
      }
    }
  });
}

// ─── Rule 7: grid-cols-N (N>=3) without sm/md tier ───────────────────────
function checkGridTiers() {
  walk(SRC, (file) => {
    if (!/\.(tsx|jsx)$/.test(file)) return;
    const src = read(file);
    // Find naked grid-cols-3+ on the same className without sm:/md: prefix in same string
    const rx = /className\s*=\s*["'`]([^"'`]+)["'`]/g;
    let m;
    while ((m = rx.exec(src))) {
      const cls = m[1];
      const naked = /(?:^|\s)grid-cols-([3-9]|1[0-2])\b/.test(cls);
      const tiered = /(?:sm|md|lg|xl):grid-cols-/.test(cls);
      if (naked && !tiered) {
        // Allow grid-cols-3 with explicit "no responsive" comment marker
        if (/no-responsive/.test(cls)) continue;
        warnings.push(`[grid] ${path.relative(ROOT, file)} — grid-cols-N without sm:/md: tier: "${cls.slice(0, 80)}…"`);
        break;
      }
    }
  });
}

// ─── Rule 8: Sticky CTA bar / header use shrink-0 + truncate ─────────────
function checkStickyBars() {
  const files = [
    "components/seo/StickyConversionBar.tsx",
    "components/layout/Header.tsx",
  ];
  for (const rel of files) {
    const file = path.join(SRC, rel);
    if (!fileExists(file)) continue;
    const src = read(file);
    if (!/shrink-0|flex-shrink-0/.test(src)) {
      errors.push(`[sticky] ${rel} must use shrink-0 on icons to prevent squish at 320px`);
    }
  }
}

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build", ".git"].includes(entry.name)) continue;
      walk(full, cb);
    } else cb(full);
  }
}

// ─── Run all checks ──────────────────────────────────────────────────────
console.log("🔍 Checking responsive layout guards…\n");
checkLayoutShell();
checkGlobalCss();
checkPanelShells();
checkBreadcrumbs();
checkFixedWidths();
checkTableWrapping();
checkGridTiers();
checkStickyBars();

if (warnings.length) {
  console.log(`⚠️  ${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 30)) console.log(`   ${w}`);
  if (warnings.length > 30) console.log(`   …and ${warnings.length - 30} more`);
  console.log("");
}

if (errors.length) {
  console.error(`❌ ${errors.length} responsive guard violation(s):`);
  for (const e of errors) console.error(`   ${e}`);
  console.error("\nFix the violations above or update scripts/check-responsive-guards.mjs.\n");
  process.exit(1);
}

console.log(`✅ Responsive guards intact (${warnings.length} warnings)`);
