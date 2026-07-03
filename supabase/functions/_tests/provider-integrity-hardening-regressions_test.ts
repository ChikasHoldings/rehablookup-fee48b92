// Regression tests for the 2026-07-03 provider INTEGRITY hardening pass:
//   1. facilities privileged-column UPDATE gate (self-unsuspend / score forgery /
//      data_source tamper blocked for owners; admin/service still allowed)
//   2. get_public_facility_data masking-bypass RPC dropped + no runtime caller
//   3. claim approval advances facilities.claim_status='claimed' (+ backfill)
//   4. facility-staff-photos storage scoped to owner folder (RESTRICTIVE)
//   5. onboarding duplicate-email errors parsed from error.context (no raw
//      "non-2xx" leak) and mapped via friendlyRegisterError
//   6. ListingCard uses the shared getListingStatusMeta (no stale Draft collapse)
//
// Source-contract assertions (no live HTTP), style of
// provider-grace-and-claim-regressions_test.ts. Live DB behaviour is proven
// separately by rollback-safe SQL probes recorded in the pass report.

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}
function assertStringIncludes(actual: string, expected: string): void {
  if (!actual.includes(expected)) throw new Error(`Expected source to include: ${expected}`);
}

const REPO_ROOT = new URL("../../../", import.meta.url);
async function read(rel: string): Promise<string> {
  return await Deno.readTextFile(new URL(rel, REPO_ROOT));
}

// ─── 1. Privileged-column gate ───────────────────────────────────────────────

Deno.test("gate: trigger fires on the 5 guarded facilities columns", async () => {
  const sql = await read("supabase/migrations/20260829004400_facility_privileged_columns_gate.sql");
  assertStringIncludes(sql, "CREATE OR REPLACE FUNCTION public.enforce_facility_privileged_columns_gate()");
  // BEFORE INSERT OR UPDATE OF <exactly these columns>
  assert(
    /BEFORE INSERT OR UPDATE OF suspended, calculated_ranking_score,\s*listing_completeness_score, response_rate_score, data_source/.test(sql),
    "trigger must guard suspended + the 3 score columns + data_source",
  );
});

Deno.test("gate: only service/postgres/admin/no-JWT actors may change guarded columns", async () => {
  const sql = await read("supabase/migrations/20260829004400_facility_privileged_columns_gate.sql");
  assertStringIncludes(sql, "current_setting('role', true) = 'service_role'");
  assertStringIncludes(sql, "auth.role() = 'service_role'");
  assertStringIncludes(sql, "current_user IN ('postgres', 'supabase_admin', 'service_role')");
  assertStringIncludes(sql, "has_role((SELECT auth.uid()), 'admin'::app_role)");
  assertStringIncludes(sql, "RAISE EXCEPTION");
  // Regression: must NOT rely on current_user alone (always the DEFINER owner).
  assert(
    !/IF\s+current_user\s+IN\s*\([^)]*\)\s+THEN\s+RETURN NEW;\s*END IF;\s*RAISE/.test(sql),
    "actor test must combine role/JWT checks, not current_user alone",
  );
});

Deno.test("gate: suspended flips by a real admin actor are audit-logged", async () => {
  const sql = await read("supabase/migrations/20260829004400_facility_privileged_columns_gate.sql");
  assertStringIncludes(sql, "INSERT INTO public.admin_audit_log");
  assertStringIncludes(sql, "facility_suspended");
  assertStringIncludes(sql, "facility_unsuspended");
  // Only when there is an auth.uid() (admin_audit_log.admin_user_id is NOT NULL).
  assert(/IF v_actor IS NOT NULL THEN/.test(sql), "audit insert must be guarded on a non-null actor");
});

Deno.test("gate: execute is revoked from client roles", async () => {
  const sql = await read("supabase/migrations/20260829004400_facility_privileged_columns_gate.sql");
  assertStringIncludes(sql, "REVOKE EXECUTE ON FUNCTION public.enforce_facility_privileged_columns_gate() FROM PUBLIC, anon, authenticated");
});

// ─── 2. Dormant masking-bypass RPC dropped ───────────────────────────────────

Deno.test("rpc: get_public_facility_data is dropped", async () => {
  const sql = await read("supabase/migrations/20260829004500_neutralize_get_public_facility_data.sql");
  assertStringIncludes(sql, "DROP FUNCTION IF EXISTS public.get_public_facility_data(uuid)");
});

Deno.test("rpc: no runtime caller of get_public_facility_data remains", async () => {
  // Scan the two runtime trees. The generated types file is allowed to still
  // reference the name until regenerated; nothing should .rpc() it.
  for (const rel of ["src", "supabase/functions"]) {
    const dir = new URL(rel + "/", REPO_ROOT);
    for await (const hit of walk(dir)) {
      if (!/\.(ts|tsx)$/.test(hit) || hit.endsWith("types.ts")) continue;
      // Skip test files (this suite mentions the RPC name in assertions).
      if (/_tests\/|\.test\.|_test\.ts$/.test(hit)) continue;
      const body = await Deno.readTextFile(hit);
      assert(
        !body.includes('rpc("get_public_facility_data"') && !body.includes("rpc('get_public_facility_data'"),
        `no .rpc() call to get_public_facility_data (found in ${hit})`,
      );
    }
  }
});

async function* walk(dir: URL): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(dir)) {
    const child = new URL(entry.name + (entry.isDirectory ? "/" : ""), dir);
    if (entry.isDirectory) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      yield* walk(child);
    } else {
      yield child.pathname;
    }
  }
}

// ─── 3. claim_status advances on approval ────────────────────────────────────

Deno.test("claim: approval sets claim_status='claimed' alongside user_id", async () => {
  const sql = await read("supabase/migrations/20260829004600_advance_claim_status_on_approval.sql");
  // The ownership-transfer UPDATE must set claim_status='claimed'.
  assert(
    /UPDATE public\.facilities\s+SET user_id = NEW\.claimant_user_id,[\s\S]{0,200}claim_status = 'claimed'/.test(sql),
    "ownership-transfer UPDATE must advance claim_status to 'claimed'",
  );
  // user_id remains the true source of truth (still set).
  assertStringIncludes(sql, "user_id = NEW.claimant_user_id");
  // One-time backfill gated on claimed_at so self-listed rows are untouched.
  assert(
    /UPDATE public\.facilities\s+SET claim_status = 'claimed'\s+WHERE user_id IS NOT NULL\s+AND claimed_at IS NOT NULL/.test(sql),
    "backfill must be gated on claimed_at IS NOT NULL",
  );
});

Deno.test("claim: undelivered auto-approval email flags admins for manual send", async () => {
  const sql = await read("supabase/migrations/20260829004600_advance_claim_status_on_approval.sql");
  assertStringIncludes(sql, "claim_approval_email_undelivered");
  assertStringIncludes(sql, "needs_manual_email");
});

// ─── 4. staff-photos storage scoping ─────────────────────────────────────────

Deno.test("storage: facility-staff-photos scoped to owner folder via RESTRICTIVE policies", async () => {
  const sql = await read("supabase/migrations/20260829004700_scope_staff_photos_storage.sql");
  assertStringIncludes(sql, "AS RESTRICTIVE");
  assertStringIncludes(sql, "facility_staff_photos_scope_insert");
  assertStringIncludes(sql, "facility_staff_photos_scope_delete");
  // no-op for other buckets; owner-folder required for staff photos.
  assert(
    /bucket_id <> 'facility-staff-photos'\s*OR \(auth\.uid\(\)\)::text = \(storage\.foldername\(name\)\)\[1\]/.test(sql),
    "predicate must be a no-op for other buckets and owner-scoped for staff photos",
  );
});

// ─── 5. onboarding duplicate-email UX ────────────────────────────────────────

Deno.test("onboarding: AccountStep parses error.context and maps codes (no raw non-2xx leak)", async () => {
  const src = await read("src/components/provider/onboarding/AccountStep.tsx");
  assertStringIncludes(src, "friendlyRegisterError");
  assertStringIncludes(src, ".context");
  assertStringIncludes(src, "json");
  // Regression: the old code surfaced error.message directly on failure.
  assert(
    !/toast\.error\(error\.message/.test(src),
    "must not surface the raw FunctionsHttpError message (the generic non-2xx string)",
  );
  // Dead 'email_in_use' handling removed (register-provider-account never returns it).
  assert(!src.includes("email_in_use"), "dead email_in_use branch must be removed");
});

Deno.test("onboarding: friendlyRegisterError covers the register-provider-account codes", async () => {
  const src = await read("src/lib/registerAccountErrors.ts");
  for (const code of ["USER_EXISTS", "EMAIL_IS_PROVIDER", "EMAIL_IS_SEEKER", "EMAIL_IS_ADMIN", "INVALID_EMAIL", "WEAK_PASSWORD"]) {
    assertStringIncludes(src, code);
  }
});

// ─── 5b. leads grant-model reconciliation ────────────────────────────────────

Deno.test("leads: grant-model reconciliation documents RLS as the PII control", async () => {
  const sql = await read("supabase/migrations/20260829004800_leads_grant_model_reconciliation.sql");
  assertStringIncludes(sql, "COMMENT ON TABLE public.leads");
  assertStringIncludes(sql, "ROW-LEVEL SECURITY");
  // Must NOT re-issue a column REVOKE (would break the security_invoker view + admin reads).
  assert(!/REVOKE\s+SELECT/i.test(sql), "reconciliation must not re-REVOKE column SELECT");
});

// ─── 6. ListingCard uses the shared status helper ────────────────────────────

Deno.test("listing: ListingCard sources labels from getListingStatusMeta", async () => {
  const src = await read("src/components/provider/listing/ListingCard.tsx");
  assertStringIncludes(src, "getListingStatusMeta");
  // Regression: the stale inline switch collapsing rejected/needs_edits to Draft is gone.
  assert(!/case "pending":\s*return \{\s*label: "Under Review"/.test(src), "inline stale status switch removed");
});
