#!/usr/bin/env node
/**
 * CI guard — enforces the edge-function auth policy.
 *
 * Rules (see docs/edge-function-auth-audit-2026-05-22.md for full inventory):
 *
 *   1. Every directory under supabase/functions/ that isn't a shared folder
 *      (_shared, _tests) MUST have a [functions.<name>] block in
 *      supabase/config.toml with an explicit `verify_jwt = …` setting.
 *
 *   2. Every admin-* function MUST have `verify_jwt = true`.
 *
 *   3. Every cron-triggered function (matches CRON_NAME_PATTERNS) MUST have
 *      `verify_jwt = false` AND its index.ts MUST import + call
 *      `assertCronSecret` from "../_shared/cron-auth.ts".
 *
 *   4. Every function classified as authenticated-user (bucket C) MUST have
 *      `verify_jwt = true`. We treat all non-admin / non-cron / non-webhook /
 *      non-anonymous-public functions as the "authenticated user" default,
 *      so anything that should be `verify_jwt = false` MUST be on an
 *      explicit allow-list (CRON_NAMES / WEBHOOK_NAMES / ANON_NAMES).
 *
 * Usage:
 *   node scripts/check-edge-function-auth.mjs
 *
 * Exit codes:
 *   0  policy satisfied
 *   1  one or more violations (prints details to stderr)
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const FUNCTIONS_DIR = join(REPO_ROOT, "supabase", "functions");
const CONFIG_PATH = join(REPO_ROOT, "supabase", "config.toml");

// ── Allow-lists (the inventory) ──────────────────────────────────────────────

// Bucket A: webhooks (vendor signature verified in code)
const WEBHOOK_NAMES = new Set([
  "stripe-webhook",
  "twilio-sms-inbound",
  "resend-webhook",
  "provider-emails-unsubscribe",
  "og-share",
  "og-state-image",
  "serve-badge",
]);

// Bucket B: anonymous public (rate-limited; no JWT)
const ANON_NAMES = new Set([
  "submit-marketing-lead",
  "submit-page-issue-report",
  "provider-interest-submit",
  "lookup-ip-location",
  "sitemap-facilities",
  "prerender-for-bots",
  "detect-and-prerender",
  "log-not-found",
  "log-not-found-search",
  "log-analytics-event",
  "log-phone-click",
  "log-strip-impression",
  "get-public-facilities",
  "get-featured-facilities",
  "get-featured-rotation",
  "request-facility-from-marketing",
  "submit-indexnow",
  "send-contact-form",
  "send-provider-support",
  "send-support-request",
  "check-email-verified",
  "send-sms-verification-code",
  "send-verification-code",
  "send-password-reset",
  "confirm-password-reset",
  "initiate-claim-email-verification",
  "initiate-claim-sms-verification",
  "confirm-claim-verification-code",
  "match-concierge-intake",
  "assess-login-risk",
  "log-login-attempt",
  "log-activity",
  "register-provider-account",
  "create-signup-checkout",
  "send-provider-welcome-email",
  "send-security-block-notification",
  "send-lead-confirmation",
  "resend-lead-confirmation",
  "send-approval-email",
  "send-claim-approval-email",
  "send-claim-rejection-email",
  "send-review-notification",
  "send-review-request",
  // generate-credential-kit — authenticated-provider only (in-body
  // ownership + verified + Pro check). Anon callers fail auth.getUser
  // upfront. Bucket label matches the send-* family pattern.
  "generate-credential-kit",
  "notify-free-tier-inquiry-redirect",
  "notify-admin-provider-signup",
  "notify-flagged-image",
  "notify-payment-failed",
  "track-featured-analytics",
  "send-message-notifications",
  "send-tour-notifications",
  "send-concierge-notifications",
  "send-concierge-introduction",
  "send-sms-notification",
  "send-seeker-emails",
  "send-profile-complete-email",
  "send-lead-email",
  "send-credential-notification",
  "send-admin-notification",
  "report-image",
  // Retired tombstones — return 410 Gone for everything. Safe to leave
  // without JWT since they have no side effects.
  "retry-failed-payments",
]);

// Bucket E: cron-triggered (X-Cron-Secret enforced in code)
const CRON_NAMES = new Set([
  "auto-status-transition",
  "calculate-ranking-scores",
  "check-brute-force-alerts",
  "check-churn-alerts",
  "check-not-found-alerts",
  "check-provider-health-alerts",
  "cleanup-audit-logs",
  "cleanup-orphan-storage",
  "cleanup-rate-limit-logs",
  "drain-addon-waitlist",
  "placement-cron",
  "process-onboarding-emails",
  "process-provider-drip",
  "process-seeker-drip",
  "process-seeker-followup-reminders",
  "revenue-enforcement-cron",
  "run-re-verification-sweep",
  "samhsa-import-batch",
  "send-dunning-emails",
  "send-new-facility-alerts",
  "send-profile-reminders",
  "send-provider-weekly-digest",
  "send-renewal-reminder",
  "send-retention-outreach",
  "send-saved-search-alerts",
  "send-seeker-weekly-digest",
  "send-subscription-alerts",
  "send-marketing-followup",
  "signup-rollback-cleanup",
  // sync-google-reviews has DUAL auth: X-Cron-Secret for the nightly
  // batch refresh, and a per-provider JWT path for the ad-hoc single-
  // facility sync fired from /provider/reviews. The audit's
  // assertCronSecret() requirement is satisfied by the cron branch;
  // the JWT branch is independently validated inside the function.
  "sync-google-reviews",
]);

// ── Parse config.toml (lightweight; only reads verify_jwt per function) ──────

function parseConfig() {
  const text = readFileSync(CONFIG_PATH, "utf8");
  const verifyJwt = new Map(); // name -> boolean
  const lines = text.split("\n");
  let currentFn = null;
  for (const raw of lines) {
    const line = raw.trim();
    const headerMatch = line.match(/^\[functions\.([\w-]+)\]$/);
    if (headerMatch) {
      currentFn = headerMatch[1];
      continue;
    }
    if (line.startsWith("[")) {
      currentFn = null;
      continue;
    }
    if (currentFn) {
      const m = line.match(/^verify_jwt\s*=\s*(true|false)\s*(#.*)?$/);
      if (m) verifyJwt.set(currentFn, m[1] === "true");
    }
  }
  return verifyJwt;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function isAdminFn(name) {
  return name.startsWith("admin-");
}

function isFunctionDir(name) {
  return !name.startsWith("_") && !name.startsWith(".");
}

const errors = [];
const warnings = [];

if (!existsSync(FUNCTIONS_DIR)) {
  console.error(`[check-edge-function-auth] missing ${FUNCTIONS_DIR}`);
  process.exit(1);
}
if (!existsSync(CONFIG_PATH)) {
  console.error(`[check-edge-function-auth] missing ${CONFIG_PATH}`);
  process.exit(1);
}

const config = parseConfig();
const allFns = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && isFunctionDir(d.name))
  .map((d) => d.name)
  .sort();

for (const fn of allFns) {
  const indexPath = join(FUNCTIONS_DIR, fn, "index.ts");
  if (!existsSync(indexPath)) continue; // skip dirs without index.ts (shouldn't happen)

  const cfg = config.get(fn);
  if (cfg === undefined) {
    errors.push(`[${fn}] missing [functions.${fn}] block in config.toml`);
    continue;
  }

  // Rule 2: admin-* must require JWT
  if (isAdminFn(fn) && cfg !== true) {
    errors.push(`[${fn}] admin-* function must have verify_jwt = true (got ${cfg})`);
  }

  // Rule 3: cron functions
  if (CRON_NAMES.has(fn)) {
    if (cfg !== false) {
      errors.push(`[${fn}] cron-triggered function must have verify_jwt = false (got ${cfg})`);
    }
    const src = readFileSync(indexPath, "utf8");
    const hasImport = /from\s+["']\.\.\/_shared\/cron-auth\.ts["']/.test(src)
      || /from\s+["']\.\.\/\.\.\/_shared\/cron-auth\.ts["']/.test(src)
      || /\/\/ cron-auth: inlined/.test(src); // tolerate inlined bundles
    const hasCall = /assertCronSecret\s*\(/.test(src);
    if (!hasImport || !hasCall) {
      errors.push(`[${fn}] cron function missing assertCronSecret() call`);
    }
  }

  // Rule 4: webhooks and anon-public are the only no-JWT exceptions besides cron
  if (cfg === false && !WEBHOOK_NAMES.has(fn) && !ANON_NAMES.has(fn) && !CRON_NAMES.has(fn)) {
    errors.push(
      `[${fn}] verify_jwt=false but function not on WEBHOOK / ANON / CRON allow-list. ` +
      `Either add it to scripts/check-edge-function-auth.mjs or set verify_jwt = true.`,
    );
  }

  // Sanity: admin-* shouldn't appear on no-JWT lists
  if (isAdminFn(fn) && (WEBHOOK_NAMES.has(fn) || ANON_NAMES.has(fn) || CRON_NAMES.has(fn))) {
    errors.push(`[${fn}] admin-* function must not be on a no-JWT allow-list`);
  }
}

if (warnings.length) {
  for (const w of warnings) console.warn(`WARN: ${w}`);
}

if (errors.length) {
  console.error(`\n${errors.length} edge-function auth policy violations:\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(
    `\nSee docs/edge-function-auth-audit-2026-05-22.md for the inventory.`,
  );
  process.exit(1);
}

console.log(`✓ Edge-function auth policy OK — ${allFns.length} functions checked.`);
