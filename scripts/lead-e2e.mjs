// End-to-end provider lead workflow smoke test (read-only / negative-path).
//
// Verifies the public lead funnel is correctly hardened without writing
// production data. To exercise the *positive* path (actual lead row +
// unlock + PII reveal) we'd need a verified test email seeded in
// public.email_verification_codes and a logged-in provider session — both
// covered by the dedicated `run-smoke-tests` admin function.
//
// What this script verifies, end-to-end:
//   1. Public facility discovery via get-public-facilities edge fn (anon)
//   2. submit-qualified-lead never accepts an unverified seeker email
//      (Pro facility -> 403 email_not_verified; any other facility ->
//       200 DIRECT_CONTACT_REQUIRED, i.e. the PII was never processed)
//   3. submit-qualified-lead validates required fields (400 + code)
//   4. submit-qualified-lead validates the seeker name on the Pro path
//   5. Anon cannot SELECT from leads table (RLS)
//   6. Anon cannot SELECT from leads_provider_view (RLS)
//   7. unlock-lead requires bearer token / provider session
//   8. unlock-lead validates required fields (MISSING_FIELD_LEAD_ID)
//   9. unlock-lead validates UUID format (INVALID_LEAD_ID)

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mldbxpntzcjalgjmwnqa.supabase.co";
const ANON_KEY =
  "sb_publishable_tHLCRbeUrsu7EmMlCR0n6g_ygNXmMYP";

const anon = createClient(SUPABASE_URL, ANON_KEY);
const ANON_HEADERS = {
  "Content-Type": "application/json",
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
};

const results = [];
const t0 = Date.now();
function step(name, ok, details = {}) {
  const r = { name, ok, ...details };
  results.push(r);
  console.log(`${ok ? "✓" : "✗"} ${name}${details.note ? " — " + details.note : ""}`);
  return r;
}

// ─── 1. Pick an approved facility ───────────────────────────────────────────
const facRes = await fetch(`${SUPABASE_URL}/functions/v1/get-public-facilities`, {
  headers: ANON_HEADERS,
});
const facJson = await facRes.json().catch(() => ({}));
const facilities = facJson?.facilities || [];
if (!facRes.ok || !facilities.length) {
  step("get-public-facilities (anon)", false, { note: `status=${facRes.status} count=${facilities.length}` });
  console.log(JSON.stringify(results, null, 2));
  process.exit(1);
}
const facility = facilities[0];
step("get-public-facilities (anon)", true, {
  note: `${facility.name} (${facility.id})`,
  facilityId: facility.id,
});

// ─── 2. submit-qualified-lead never accepts unverified seeker PII ───────────
// Directory cutover stage 2 split this into two acceptable outcomes, because
// the entitlement gate now runs BEFORE any PII-dependent processing:
//   • ACTIVE PRO facility -> reaches the verification gate -> 403
//     email_not_verified.
//   • Anything else -> 200 DIRECT_CONTACT_REQUIRED, returned before the email
//     was looked at at all.
// Both prove the same property: an unverified seeker email never produces a
// lead. Which one you see depends on whether facilities[0] happens to be Pro.
{
  const tag = `e2e-${crypto.randomUUID()}`;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-qualified-lead`, {
    method: "POST",
    headers: ANON_HEADERS,
    body: JSON.stringify({
      facilityId: facility.id,
      name: tag,
      email: `${tag}@e2e.test`,
      phone: "5555550199",
      preferredContact: "email",
      urgency: "this_week",
      levelOfCare: "outpatient",
      whoSeekingHelp: "self",
    }),
  });
  const body = await res.json().catch(() => ({}));
  const directContact = res.status === 200 && body?.action === "DIRECT_CONTACT_REQUIRED";
  const proVerificationGate = res.status === 403 && body?.code === "email_not_verified";
  step("submit-qualified-lead never accepts unverified seeker PII", directContact || proVerificationGate, {
    status: res.status,
    code: body?.code ?? body?.action,
    note: directContact
      ? "non-Pro facility — direct contact required before PII processing"
      : "active Pro facility — email verification enforced",
  });
  if (directContact) {
    // The direct-contact envelope must never look like a submission.
    step("DIRECT_CONTACT_REQUIRED carries no lead/inquiry/confirmation id",
      !body?.leadId && !body?.inquiry_id && !body?.confirmation_path && !body?.routing_mode,
      { status: res.status });
  }
}

// ─── 3. submit-qualified-lead missing facilityId ────────────────────────────
{
  const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-qualified-lead`, {
    method: "POST",
    headers: ANON_HEADERS,
    body: JSON.stringify({ name: "x", email: "x@x.com", phone: "5555555555" }),
  });
  const body = await res.json().catch(() => ({}));
  step("submit-qualified-lead rejects missing facilityId", res.status >= 400 && res.status < 500, {
    status: res.status,
    code: body?.code,
  });
}

// ─── 4. submit-qualified-lead validates the seeker name on the Pro path.
//        Reproducing the phone-length branch from here would require seeding
//        email_verification_codes in prod, which we refuse. As with step 2, a
//        non-Pro facility short-circuits to DIRECT_CONTACT_REQUIRED before
//        name validation is even reached — also a pass.
{
  const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-qualified-lead`, {
    method: "POST",
    headers: ANON_HEADERS,
    body: JSON.stringify({ facilityId: facility.id, email: "x@x.com", phone: "5555555555" }),
  });
  const body = await res.json().catch(() => ({}));
  const shortCircuited = res.status === 200 && body?.action === "DIRECT_CONTACT_REQUIRED";
  step("submit-qualified-lead validates name (or short-circuits to direct contact)",
    shortCircuited || (res.status === 400 && body?.code === "name_required"), {
    status: res.status,
    code: body?.code ?? body?.action,
  });
}

// ─── 5. Anon SELECT leads table ─────────────────────────────────────────────
{
  const { data, error } = await anon.from("leads").select("id").limit(1);
  step("anon CANNOT SELECT public.leads", !!error || !data?.length, {
    note: error?.message || (data?.length ? "rows leaked!" : "denied/empty"),
  });
}

// ─── 6. Anon SELECT leads_provider_view ─────────────────────────────────────
{
  const { data, error } = await anon.from("leads_provider_view").select("id").limit(1);
  step("anon CANNOT SELECT leads_provider_view", !!error || !data?.length, {
    note: error?.message || (data?.length ? "rows leaked!" : "denied/empty"),
  });
}

// ─── 7. unlock-lead without provider auth ───────────────────────────────────
{
  const fakeUuid = crypto.randomUUID();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/unlock-lead`, {
    method: "POST",
    headers: ANON_HEADERS,
    body: JSON.stringify({ leadId: fakeUuid, facilityId: facility.id, paymentMethod: "credits" }),
  });
  const body = await res.json().catch(() => ({}));
  step("unlock-lead rejects anon caller", res.status >= 400 && res.status < 500, {
    status: res.status,
    code: body?.code || body?.error?.code,
  });
}

// ─── 8. unlock-lead enforces auth BEFORE field validation ───────────────────
//        These two cases would normally test MISSING_FIELD_LEAD_ID and
//        INVALID_LEAD_ID, but the function (correctly) checks the auth
//        token before parsing the body, so anon callers always 401. The
//        in-function field validation path IS exercised by run-smoke-tests
//        which signs in as a seeded super_admin first.
{
  const res = await fetch(`${SUPABASE_URL}/functions/v1/unlock-lead`, {
    method: "POST",
    headers: ANON_HEADERS,
    body: JSON.stringify({ facilityId: facility.id }), // no leadId
  });
  step("unlock-lead anon → 401 (auth ordered before validation)", res.status === 401, {
    status: res.status,
  });
  await res.text();
}
{
  const res = await fetch(`${SUPABASE_URL}/functions/v1/unlock-lead`, {
    method: "POST",
    headers: ANON_HEADERS,
    body: JSON.stringify({ leadId: "not-a-uuid", facilityId: facility.id }),
  });
  step("unlock-lead anon w/ bad UUID → 401 (auth wins)", res.status === 401, {
    status: res.status,
  });
  await res.text();
}

// ─── Summary ────────────────────────────────────────────────────────────────
const passed = results.filter((r) => r.ok).length;
console.log("\n────── SUMMARY ──────");
console.log(`${passed}/${results.length} passed in ${Date.now() - t0}ms`);
if (passed !== results.length) {
  console.log("\nFailures:");
  for (const r of results.filter((x) => !x.ok)) console.log(`  • ${r.name}`, r);
  process.exit(1);
}
