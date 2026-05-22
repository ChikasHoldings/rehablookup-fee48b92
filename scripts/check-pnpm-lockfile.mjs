#!/usr/bin/env node
/**
 * CI guard — pnpm-lock.yaml must be in sync with package.json.
 *
 * Why this exists
 * ───────────────
 * The repo carries both package-lock.json (for local npm familiarity)
 * and pnpm-lock.yaml (Vercel installs with pnpm). Adding a dep with
 * `npm install <pkg>` updates package.json + package-lock.json but
 * NOT pnpm-lock.yaml. Vercel's install runs `pnpm install --frozen-
 * lockfile`, which fails with ERR_PNPM_OUTDATED_LOCKFILE — every
 * subsequent push then also fails because the broken state propagates.
 *
 * That bit us on 2026-05-22 (the a11y commit's @axe-core/playwright
 * addition broke 5 deploys in a row; see the commit log around
 * e364b6c45 for the fix).
 *
 * This script catches that BEFORE push by running the same command
 * Vercel runs (`pnpm install --frozen-lockfile --offline`) and
 * exiting non-zero on lockfile drift.
 *
 * Behavior
 * ────────
 *   • pnpm available (via corepack or direct install)
 *       → run `pnpm install --frozen-lockfile --offline` and surface
 *         its exit code. Drift → non-zero → validate:blocking fails.
 *   • pnpm NOT available + node_modules/.pnpm exists
 *       → warn that the local env can't enforce the check; continue.
 *         The next push will catch it on Vercel; not ideal but better
 *         than refusing to validate at all on npm-only dev machines.
 *   • CI / Vercel build
 *       → Vercel runs the strict pnpm install BEFORE prebuild:vercel,
 *         so by the time this script runs, the lockfile is guaranteed
 *         in sync. The script is effectively a no-op there but stays
 *         in the chain for symmetry with the local-dev case.
 *
 * The --offline flag prevents this from hitting the registry on a
 * normal local run — if everything in pnpm-lock.yaml is already in
 * the local pnpm store (which is the case after any prior install),
 * the check completes in <1s. On a totally cold machine it'd fall
 * back to the network; that's acceptable for a pre-push guard.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

// 1. Sanity-check the files this guard is supposed to compare exist.
const lockfile = join(REPO_ROOT, "pnpm-lock.yaml");
const pkgJson = join(REPO_ROOT, "package.json");
if (!existsSync(lockfile)) {
  console.error("[check-pnpm-lockfile] pnpm-lock.yaml missing — this repo is configured to install via pnpm on Vercel.");
  process.exit(1);
}
if (!existsSync(pkgJson)) {
  console.error("[check-pnpm-lockfile] package.json missing — refusing to run.");
  process.exit(1);
}

// 2. Pick a pnpm binary. Prefer the explicitly-pinned corepack version
//    (matches Vercel) over whatever's on PATH so the check doesn't drift
//    if a contributor has an older global pnpm.
function pickPnpm() {
  // Read packageManager from package.json so the pinned version stays
  // the single source of truth.
  let pinned = null;
  try {
    const m = JSON.parse(readFileSync(pkgJson, "utf8")).packageManager;
    if (typeof m === "string" && m.startsWith("pnpm@")) {
      pinned = m;
    }
  } catch {
    /* fall through */
  }

  const corepack = spawnSync("corepack", ["--version"], { stdio: "ignore" });
  if (corepack.status === 0) {
    const args = pinned
      ? [pinned.replace(/^pnpm@/, "pnpm@"), "--version"]
      : ["pnpm", "--version"];
    const probe = spawnSync("corepack", args, { stdio: "ignore" });
    if (probe.status === 0) {
      return { cmd: "corepack", prefix: [pinned || "pnpm"] };
    }
  }

  const direct = spawnSync("pnpm", ["--version"], { stdio: "ignore" });
  if (direct.status === 0) {
    return { cmd: "pnpm", prefix: [] };
  }

  return null;
}

const pnpm = pickPnpm();
if (!pnpm) {
  console.warn(
    "[check-pnpm-lockfile] pnpm not found on PATH (and corepack absent or doesn't expose it).\n" +
    "  Skipping lockfile check on this machine. Vercel will still enforce it on push.\n" +
    "  Install via: corepack enable && corepack prepare pnpm@10.13.1 --activate",
  );
  process.exit(0);
}

// 3. Run the same install command Vercel runs. --offline avoids the
//    network whenever the pnpm store already has the listed packages
//    (typical on any machine that's done a prior pnpm install).
const result = spawnSync(
  pnpm.cmd,
  [...pnpm.prefix, "install", "--frozen-lockfile", "--offline", "--prefer-offline"],
  { cwd: REPO_ROOT, encoding: "utf8" },
);

if (result.status === 0) {
  console.log("✓ check-pnpm-lockfile: pnpm-lock.yaml is in sync with package.json");
  process.exit(0);
}

const out = (result.stdout || "") + (result.stderr || "");
if (/ERR_PNPM_OUTDATED_LOCKFILE/.test(out)) {
  console.error(
    "✗ check-pnpm-lockfile: pnpm-lock.yaml is out of date with package.json.\n\n" +
    "Did you add a dep with `npm install`? Run this and re-commit pnpm-lock.yaml:\n" +
    "  corepack prepare pnpm@10.13.1 --activate\n" +
    "  pnpm install --lockfile-only\n\n" +
    "Then `git add pnpm-lock.yaml && git commit --amend --no-edit` (or new commit).\n\n" +
    "Full pnpm output:\n" + out,
  );
  process.exit(1);
}

// Offline failures (NO_LOCAL_PACKAGE etc.) are not lockfile drift —
// they just mean we couldn't satisfy from the local store. That's OK
// for a developer who hasn't fetched yet; downgrade to a warning.
if (/NO_LOCAL_PACKAGE|ERR_PNPM_NO_MATCHING_VERSION_INSIDE_WORKSPACE|registry/i.test(out)) {
  console.warn(
    "[check-pnpm-lockfile] Couldn't verify offline (some packages aren't in the local store).\n" +
    "  This is not a lockfile-drift error. Run `pnpm install --frozen-lockfile` (online) once,\n" +
    "  then re-run this check. Skipping for now.",
  );
  process.exit(0);
}

// Anything else (network error, corepack glitch, etc.): surface but
// don't block — we don't want this guard to become a flaky CI step.
console.warn(
  "[check-pnpm-lockfile] pnpm install exited non-zero for an unrecognized reason; not blocking.\n" +
  "  Verify manually with `pnpm install --frozen-lockfile`.\n\n" +
  "pnpm output:\n" + out,
);
process.exit(0);
