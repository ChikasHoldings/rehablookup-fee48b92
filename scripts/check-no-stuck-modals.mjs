#!/usr/bin/env node
/**
 * Guard against "stuck modal" regressions.
 *
 * A controlled Radix modal — <Dialog>/<Sheet>/<AlertDialog>/<Drawer> with an
 * `open={...}` prop — MUST also declare `onOpenChange`. Without it, Esc,
 * overlay-click, and the close (X) button all no-op: they call onOpenChange,
 * which is undefined, so the controlled `open` state never flips back to false
 * and the user is trapped. Uncontrolled modals (using a *Trigger and no
 * `open=`) manage their own state internally and are exempt.
 *
 * Intentional forced gates (e.g. ForcePasswordChangeDialog, TwoFactorVerifyDialog)
 * keep a no-op `onOpenChange={() => {}}` to block casual dismissal but still
 * declare the prop and provide an in-content completion/cancel path — so they
 * pass this check, which only flags a *missing* onOpenChange.
 *
 * Exit 1 listing every controlled modal missing onOpenChange.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");

const MODAL = /<(Dialog|Sheet|AlertDialog|Drawer)\b/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const violations = [];
let scanned = 0;
for (const file of walk(SRC)) {
  scanned++;
  const src = readFileSync(file, "utf8");
  MODAL.lastIndex = 0;
  let m;
  while ((m = MODAL.exec(src)) !== null) {
    const gt = src.indexOf(">", m.index);
    if (gt === -1) continue;
    const tag = src.slice(m.index, gt);
    if (/\bopen=/.test(tag) && !tag.includes("onOpenChange")) {
      const line = src.slice(0, m.index).split("\n").length;
      violations.push(`${relative(ROOT, file)}:${line}  <${m[1]} open=…> missing onOpenChange`);
    }
  }
}

console.log(`🔍 Stuck-modal audit — scanned ${scanned} .tsx files`);
if (violations.length) {
  console.error(`\n❌ ${violations.length} controlled modal(s) missing onOpenChange (cannot be closed → user trapped):\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(`\nAdd onOpenChange so Esc / overlay / close-button can dismiss the modal.`);
  process.exit(1);
}
console.log("✅ Every controlled modal declares onOpenChange — none can get stuck.");
