#!/usr/bin/env node
/**
 * Catch JSX components used but never imported / declared.
 *
 * Why: TypeScript is configured with `strict: false` + `noImplicitAny: false`
 * in this project, and Vite's build doesn't type-check the bundle. The
 * `InsuranceCarrierHero` bug (commit 9c13f8bf9) shipped to production
 * undetected for that reason — 9 insurance-carrier React components used
 * `<InsuranceCarrierHero />` without importing it, threw ReferenceError at
 * runtime, and the SEORouteBoundary rendered its "temporarily unavailable"
 * fallback on every Insurance Coverage footer link.
 *
 * This script reads every `.tsx` file under src/, parses imports + local
 * declarations + destructured/parameter symbols, then verifies every JSX
 * element name resolves to a known symbol. Exit 1 on any unresolved.
 *
 * False-positive guard:
 *   - JSX element names in `//` line comments and `/* ... *\/` block
 *     comments are stripped before matching.
 *   - JSX inside backtick template strings (docstring examples) is stripped.
 *   - TS DOM types (HTMLDivElement, etc.) and TS generic type args in
 *     positions like `useState<X>()` are excluded by requiring the `<` to
 *     follow whitespace, `(`, `{`, `,`, `>`, or start-of-line — never
 *     directly after a letter (which would indicate a generic).
 *   - Destructured-rename JSX (`statusIcon: StatusIcon` in props) is
 *     captured as a local symbol.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");

// React + common globals that don't need explicit import in .tsx with new jsx-runtime.
const ALWAYS_KNOWN = new Set([
  "React", "JSX", "Component", "Fragment", "ErrorBoundary", "Children",
  "StrictMode", "Suspense",
  // TS / DOM built-ins that frequently appear in generic positions.
  "Date", "File", "Map", "Set", "Array", "Promise", "Error", "Number",
  "String", "Boolean", "Object", "Symbol", "RegExp", "Math", "JSON", "Image",
  "FormData", "Blob", "Event",
]);

// DOM type names that always appear in TS generic positions — never JSX.
const DOM_TYPE_RE = /^(HTML|SVG|XML|Element|Event|Node|Mouse|Keyboard|Touch|Pointer|Focus|Input|Form|Change|Drag|Wheel|Animation|Transition|Clipboard|UI|Composition|Custom|Page|Popstate|Storage|Hash|Beforeunload|Message|Progress|Submit)/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".git") continue;
      walk(full, out);
    } else if (full.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

/** Strip block comments, line comments, and backtick template strings. */
function stripNoise(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, "");
  out = out.replace(/^[ \t]*\/\/.*$/gm, "");
  // Replace template-string contents with same-length space so column refs survive.
  out = out.replace(/`[\s\S]*?`/g, (m) => m.replace(/./g, " "));
  return out;
}

function collectImports(src) {
  const names = new Set();
  for (const m of src.matchAll(/^[ \t]*import\s+(?:type\s+)?([A-Z][A-Za-z0-9_]*)\s+from/gm)) {
    names.add(m[1]);
  }
  for (const m of src.matchAll(/^[ \t]*import\s*(?:type\s+)?\{([^}]+)\}\s*from/gm)) {
    for (let piece of m[1].split(",")) {
      piece = piece.trim();
      if (!piece) continue;
      if (piece.startsWith("type ")) piece = piece.slice(5).trim();
      const aliased = piece.split(/\s+as\s+/);
      const sym = aliased[aliased.length - 1].trim();
      if (/^[A-Z]/.test(sym)) names.add(sym);
    }
  }
  for (const m of src.matchAll(/^[ \t]*import\s+\*\s+as\s+([A-Z][A-Za-z0-9_]*)\s+from/gm)) {
    names.add(m[1]);
  }
  return names;
}

function collectLocalDeclarations(src) {
  const names = new Set();
  // function / class / const / let / var top-level names
  for (const m of src.matchAll(/(?:function|class|const|let|var)\s+([A-Z][A-Za-z0-9_]*)/g)) {
    names.add(m[1]);
  }
  // Destructured renames in object patterns like `{ statusIcon: StatusIcon }`
  for (const m of src.matchAll(/[:,]\s*([A-Z][A-Za-z0-9_]*)\s*[,}=)]/g)) {
    names.add(m[1]);
  }
  // Bare destructured names: `const { Icon } = tile`, `({ Icon }) =>`,
  // `{ Icon, Other } = ...`. Capitalized identifier as a key (no value)
  // inside braces.
  for (const m of src.matchAll(/[{,]\s*([A-Z][A-Za-z0-9_]*)\s*[,}=]/g)) {
    names.add(m[1]);
  }
  // TS generic parameter declarations: `<T extends ...>`, `<T,>`, `<T = U>`
  for (const m of src.matchAll(/<\s*([A-Z][A-Za-z0-9_]*)\s*(?:extends\s|=|,|>)/g)) {
    names.add(m[1]);
  }
  // Inline lazy(): `const Foo = lazy(...)` — already covered.
  // `forwardRef<T, P>(...)` — capitalized type args; skip via DOM_TYPE_RE.
  return names;
}

function collectJsxUses(src) {
  const used = new Set();
  // `<X` where preceding char is whitespace, `(`, `{`, `,`, `>`, `=`, or start-of-line.
  // We exclude `<X` directly after a letter/digit (TS generic position).
  for (const m of src.matchAll(/(?:^|[\s({,>=])<([A-Z][A-Za-z0-9_]*)(?=[\s/>.])/g)) {
    used.add(m[1]);
  }
  return used;
}

const files = walk(SRC);
const failures = [];

for (const file of files) {
  // Skip test files
  if (file.includes("/__tests__/") || file.endsWith(".test.tsx") || file.endsWith(".spec.tsx")) continue;
  // Skip the SmartCatchAll bridge which references dynamically-discovered components
  if (file.endsWith("SmartCatchAll.tsx")) continue;

  const raw = readFileSync(file, "utf8");
  const stripped = stripNoise(raw);
  const imports = collectImports(stripped);
  const locals = collectLocalDeclarations(stripped);
  const used = collectJsxUses(stripped);

  const known = new Set([...imports, ...locals, ...ALWAYS_KNOWN]);
  const missing = [];
  for (const name of used) {
    if (known.has(name)) continue;
    if (DOM_TYPE_RE.test(name)) continue;
    if (name.endsWith("Props") || name.endsWith("Type") || name.endsWith("Schema")) continue;
    missing.push(name);
  }

  if (missing.length > 0) {
    failures.push({ file: relative(ROOT, file), missing });
  }
}

console.log("\n🔍 JSX undefined-component audit");
console.log(`  Scanned: ${files.length} .tsx files\n`);

if (failures.length === 0) {
  console.log("\x1b[32m\x1b[1m✅ Every JSX component used resolves to an import, local declaration, or destructured binding.\x1b[0m");
  process.exit(0);
}

console.log(`\x1b[31m\x1b[1m❌ ${failures.length} file(s) reference JSX components that aren't imported or declared:\x1b[0m\n`);
for (const { file, missing } of failures) {
  console.log(`  ${file}`);
  console.log(`    missing: ${missing.join(", ")}`);
}
console.log("\n  Each one will throw `ReferenceError: <name> is not defined` at render time");
console.log("  and trigger the SEORouteBoundary 'temporarily unavailable' fallback.");
process.exit(1);
