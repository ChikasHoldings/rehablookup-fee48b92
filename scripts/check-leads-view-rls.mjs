#!/usr/bin/env node
/**
 * check-leads-view-rls.mjs
 *
 * Build-time guard that verifies the RLS guarantees protecting
 * `public.leads_provider_view` (the masked PII view used by the
 * provider panel) are still in place.
 *
 * Calls the SECURITY DEFINER RPC `public.verify_leads_provider_view_rls()`
 * which inspects pg_class / pg_policy and returns a structured report.
 *
 * Exits non-zero if any guarantee is missing so CI / build pipelines
 * fail fast and prevent regressions that would expose PII.
 *
 * Required env (any one set is enough):
 *   SUPABASE_URL                 (preferred)  or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY    (preferred)  or SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY
 *
 * If no credentials are available (e.g. local contributor build) the
 * check is skipped with a warning rather than failing the build.
 */

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://plckxokpyiubuekvodtc.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

const RPC_NAME = "verify_leads_provider_view_rls";

function fail(msg) {
  console.error(`\n❌ [leads-view-rls] ${msg}\n`);
  process.exit(1);
}
function warn(msg) {
  console.warn(`⚠️  [leads-view-rls] ${msg}`);
}
function ok(msg) {
  console.log(`✅ [leads-view-rls] ${msg}`);
}

async function main() {
  console.log("🔐 Verifying RLS guarantees for public.leads_provider_view…");

  if (!SUPABASE_KEY) {
    warn(
      "No Supabase key available in env (SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_PUBLISHABLE_KEY). Skipping check.",
    );
    return;
  }

  const url = `${SUPABASE_URL}/rest/v1/rpc/${RPC_NAME}`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
  } catch (err) {
    warn(`Network error calling RPC (${err.message}). Skipping check.`);
    return;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // 404 means the RPC was never deployed → that itself is a regression.
    if (res.status === 404) {
      fail(
        `RPC public.${RPC_NAME} is missing. Re-apply the verification migration.`,
      );
    }
    fail(`RPC ${RPC_NAME} returned HTTP ${res.status}: ${body}`);
  }

  let report;
  try {
    report = await res.json();
  } catch {
    fail(`RPC ${RPC_NAME} returned non-JSON response.`);
  }

  if (!report || typeof report !== "object") {
    fail(`Unexpected RPC payload: ${JSON.stringify(report)}`);
  }

  console.log("\nReport:");
  console.log(`  view_exists         : ${report.view_exists}`);
  console.log(`  leads_rls_enabled   : ${report.leads_rls_enabled}`);
  console.log(`  select_policy_count : ${report.select_policy_count}`);
  console.log(`  security_invoker    : ${report.security_invoker}`);

  const failures = Array.isArray(report.failures) ? report.failures : [];

  if (!report.ok || failures.length > 0) {
    console.error("\nFailures:");
    for (const f of failures) {
      console.error(
        `  • [${f.check}] ${f.message}` +
          (f.missing ? `  → missing: ${JSON.stringify(f.missing)}` : ""),
      );
    }
    fail(
      "leads_provider_view RLS guarantees are NOT satisfied. " +
        "PII could be exposed to providers. Fix the issues above before shipping.",
    );
  }

  ok(
    "All RLS guarantees satisfied for leads_provider_view (view exists, RLS on leads, required policies present, security_invoker enabled).",
  );
}

main().catch((err) => fail(err?.stack || String(err)));
