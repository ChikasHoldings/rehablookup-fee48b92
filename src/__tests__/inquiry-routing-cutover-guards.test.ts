/**
 * Directory cutover stage 2 — routing-regression guard.
 *
 * Scope discipline matters here. Stage 2 retires the *seeker facility-contact*
 * path only; it deliberately leaves historical migrations, the admin/provider
 * concierge surfaces, the legacy confirmation page, docs, and the orphaned
 * edge functions awaiting Stage 4 completely untouched. A naive repo-wide
 * grep for "concierge" or "advisor" would therefore fail on code we are not
 * allowed to change yet.
 *
 * So this guard is scoped to the exact set of files that make up the ACTIVE
 * Stage-2 facility-contact path, and asserts that none of them reintroduce:
 *
 *   • routing_mode = 'free_tier_redirect'
 *   • concierge_inquiries / concierge_case_events creation
 *   • advisor lookup or assignment
 *   • notify-free-tier-inquiry-redirect invocation
 *   • a submit-marketing-lead fallback
 *   • navigation to /inquiry/confirmation/:id
 *
 * Read-only historical compatibility (the legacy confirmation page looking a
 * record UP by its historical routing mode) is explicitly still allowed and
 * is covered by InquiryConfirmation.legacy.test.tsx.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

/**
 * Every file on the ACTIVE seeker facility-contact path.
 *
 * FacilityDirectContact.tsx and useFacilityContactRouting.ts are deliberately
 * ABSENT: the inquiry-model amendment deleted them. The "direct contact
 * instead of a form" experience they implemented no longer exists, and the
 * `"pro" | "direct"` routing abstraction was replaced by a capability model
 * (useFacilityContactCapabilities). Dead components are not kept for history.
 */
const ACTIVE_CONTACT_PATH = [
  "src/components/profile/RequestInfoModal.tsx",
  "src/components/profile/FacilityInquiryForm.tsx",
  "src/hooks/useFacilityContactCapabilities.ts",
  "src/lib/facilityPhoneVisibility.ts",
  "src/components/lead-intake/useLeadIntakeForm.ts",
  "src/components/cards/SearchResultCard.tsx",
];

/** Files the amendment removed. Their return would be a regression. */
const RETIRED_FILES = [
  "src/components/profile/FacilityDirectContact.tsx",
  "src/hooks/useFacilityContactRouting.ts",
];

/**
 * Strips comments so an explanatory note about what was retired ("this used
 * to create a concierge_inquiries row") does not read as a reintroduction.
 * The guard is about executable code.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
}

describe("stage 2 — active facility-contact path", () => {
  it("every file on the active path exists", () => {
    for (const rel of ACTIVE_CONTACT_PATH) {
      expect(existsSync(resolve(root, rel)), `missing ${rel}`).toBe(true);
    }
  });

  it("does not reintroduce concierge routing, advisors, or the free-tier redirect", () => {
    const offenders: string[] = [];
    for (const rel of ACTIVE_CONTACT_PATH) {
      const code = stripComments(read(rel));
      const banned: Array<[string, RegExp]> = [
        ["free_tier_redirect", /free_tier_redirect/],
        ["concierge_inquiries", /concierge_inquiries/],
        ["concierge_case_events", /concierge_case_events/],
        ["advisor assignment", /assigned_advisor_id|admin_role["']?\s*[,:]\s*["']advisor/],
        ["notify-free-tier-inquiry-redirect", /notify-free-tier-inquiry-redirect/],
        ["submit-marketing-lead fallback", /submit-marketing-lead/],
        ["submit-concierge-intake", /submit-concierge-intake/],
        ["inquiry confirmation navigation", /\/inquiry\/confirmation/],
      ];
      for (const [label, pattern] of banned) {
        if (pattern.test(code)) offenders.push(`${rel}: ${label}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("RequestInfoModal has no marketing-lead fallback and no capacity gate", () => {
    const src = read("src/components/profile/RequestInfoModal.tsx");
    expect(src).not.toMatch(/handleConciergeFallbackSubmit/);
    expect(src).not.toMatch(/onCustomSubmit/);
    // The Free-only lead-capacity warning is meaningless once the form is
    // Pro-exclusive; it must not gate anything any more.
    expect(src).not.toMatch(/CapacityWarning/);
    expect(src).not.toMatch(/leadUsage/);
  });

  it("RequestInfoModal does not accept a client-supplied plan prop", () => {
    // Pro must be resolved from the canonical entitlement, never handed in
    // by a caller that may be stale or simply wrong.
    const src = read("src/components/profile/RequestInfoModal.tsx");
    expect(src).not.toMatch(/facilityPlan\?:/);
    for (const rel of ["src/pages/CenterProfile.tsx", "src/components/cards/SearchResultCard.tsx"]) {
      expect(stripComments(read(rel))).not.toMatch(/facilityPlan=\{/);
    }
  });

  it("the free-tier care-coordinator disclosure is gone", () => {
    expect(existsSync(resolve(root, "src/components/lead-intake/FreeTierRoutingDisclosure.tsx"))).toBe(false);
    // ...along with the non-canonical facility_subscriptions tier probe it used.
    expect(existsSync(resolve(root, "src/hooks/useFacilitySubscriptionTier.ts"))).toBe(false);
  });

  it("deletes the retired direct-contact path rather than keeping it dead", () => {
    for (const rel of RETIRED_FILES) {
      expect(existsSync(resolve(root, rel)), `${rel} should have been deleted`).toBe(false);
    }
  });

  it("resolves phone visibility from the canonical is_pro projection, not facility_subscriptions", () => {
    const src = read("src/hooks/useFacilityContactCapabilities.ts");
    expect(src).toMatch(/public_facilities/);
    expect(src).toMatch(/is_pro/);
    expect(stripComments(src)).not.toMatch(/facility_subscriptions/);
  });

  it("does NOT derive inquiry eligibility from entitlement", () => {
    // The whole amendment in one assertion: canSubmitInquiry must not be a
    // function of is_pro.
    const code = stripComments(read("src/hooks/useFacilityContactCapabilities.ts"));
    // Inspect the ASSIGNMENT lines only. The interface declaration lists
    // canSubmitInquiry and showPhone as sibling fields, which a loose
    // multi-line regex would happily (and wrongly) match.
    const assignments = code
      .split("\n")
      .filter((l) => /\bcanSubmitInquiry\s*:/.test(l) && !/boolean/.test(l));
    expect(assignments.length, "no canSubmitInquiry assignment found").toBeGreaterThan(0);
    // Legal values: `isApproved` (the live resolution) or a hard `false`
    // (the fail-closed UNAVAILABLE constant). Never an entitlement.
    for (const line of assignments) {
      expect(line).toMatch(/canSubmitInquiry:\s*(?:isApproved|false)\b/);
      expect(line).not.toMatch(/is_pro|isPro|showPhone|featured/);
    }
    expect(assignments.some((l) => /canSubmitInquiry:\s*isApproved/.test(l))).toBe(true);
  });

  it("gates phone on exact canonical Pro and never on Featured", () => {
    const code = stripComments(read("src/lib/facilityPhoneVisibility.ts"));
    expect(code).toMatch(/isPro !== true/);
    expect(code).not.toMatch(/featured/i);
  });
});

describe("stage 2 — submit-qualified-lead source contract", () => {
  const FN = "supabase/functions/submit-qualified-lead/index.ts";

  it("resolves the destination before any PII-dependent processing", () => {
    // Scoped to the request handler body — the helper *definitions* above it
    // (checkForDuplicate, isBlocked, …) naturally appear earlier in the file
    // and say nothing about execution order.
    //
    // The entitlement gate is gone in 3.1.0, but the ORDERING requirement it
    // used to satisfy survives: a request aimed at a missing, unapproved or
    // suspended facility must be rejected without RehabLookup touching seeker
    // PII. The barrier is now the facility resolution + eligibility check.
    const full = read(FN);
    const handlerStart = full.indexOf("Deno.serve(async (req)");
    expect(handlerStart).toBeGreaterThan(-1);
    const handler = full.slice(handlerStart);

    const facilityLoad = handler.indexOf('from("facilities")');
    expect(facilityLoad, "facility resolution not found in handler").toBeGreaterThan(-1);

    const eligibility = handler.indexOf('facility.status !== "approved"');
    expect(eligibility, "approved/suspended check not found").toBeGreaterThan(facilityLoad);

    // Nothing that reads, writes, or derives from seeker PII may run first.
    const mustFollow = [
      "sanitizeEmail(rawData.email",
      "await isBlocked(supabase",
      "await isEmailServerVerified(supabase",
      "await checkIdempotency(supabase",
      "await checkForDuplicate(supabase",
      'from("leads")',
    ];
    for (const marker of mustFollow) {
      const idx = handler.indexOf(marker);
      expect(idx, `marker not found in handler: ${marker}`).toBeGreaterThan(-1);
      expect(idx, `${marker} must run after the facility eligibility check`).toBeGreaterThan(
        eligibility,
      );
    }
  });

  it("does NOT gate inquiry eligibility on entitlement", () => {
    const full = read(FN);
    const handler = full.slice(full.indexOf("Deno.serve(async (req)"));
    const code = stripComments(handler);
    // No has_active_pro call, and therefore no way to refuse a Free facility.
    expect(code).not.toMatch(/rpc\(\s*["']has_active_pro["']/);
  });

  it("suppresses provider notification when there is no verified recipient", () => {
    // An unclaimed listing must never have seeker PII mailed to the
    // unverified facilities.email column.
    const code = stripComments(read(FN));
    expect(code).toMatch(/facilityIsClaimed/);
    expect(code).toMatch(/facilityIsClaimed\s*\?[\s\S]{0,200}reply_email_verified/);
  });

  it("writes no concierge, advisor, or free-tier notification side effects", () => {
    const code = stripComments(read(FN));
    expect(code).not.toMatch(/concierge_inquiries/);
    expect(code).not.toMatch(/concierge_case_events/);
    expect(code).not.toMatch(/admin_user_profiles/);
    expect(code).not.toMatch(/assigned_advisor_id/);
    expect(code).not.toMatch(/notify-free-tier-inquiry-redirect/);
    expect(code).not.toMatch(/free_tier_redirect/);
    expect(code).not.toMatch(/confirmation_path/);
    expect(code).not.toMatch(/getFreeTierSeekerConfirmationEmail/);
  });

  it("keeps the retired lead-redistribution invariant documented", () => {
    const src = read(FN);
    expect(src).toMatch(/no reassignment, no\s*\/\/\s*redistribution/);
    expect(stripComments(src)).not.toMatch(/lead_distributions/);
  });

  it("no longer emits DIRECT_CONTACT_REQUIRED under any condition", () => {
    // The envelope is retired server-side. Only the client keeps a defensive
    // handler, for the rollout window in which an older deployed copy of this
    // function may answer a newer client.
    const code = stripComments(read(FN));
    expect(code).not.toMatch(/DIRECT_CONTACT_REQUIRED/);
    expect(code).not.toMatch(/direct_contact_required/);
    expect(code).not.toMatch(/entitlement_unconfirmed/);
    expect(code).not.toMatch(/function directContactResponse/);
  });

  it("reports a truthful delivery state", () => {
    const code = stripComments(read(FN));
    expect(code).toMatch(/stored_pending_claim/);
    expect(code).toMatch(/delivered_to_provider/);
  });

  it("bumps the version past the retired 3.0.0 contract", () => {
    const src = read(FN);
    const m = src.match(/const VERSION = "([^"]+)"/);
    expect(m, "VERSION constant not found").toBeTruthy();
    expect(m![1]).not.toBe("3.0.0");
    expect(m![1]).toMatch(/^3\.[1-9]/);
  });
});

describe("stage 2 — deliberately deferred surfaces", () => {
  // These must still exist. Stage 2 is a routing cutover, not the backend
  // retirement stage; deleting them here would break historical admin data
  // and is explicitly Stage 4 scope.
  it("leaves the orphaned concierge/placement edge functions in place", () => {
    for (const fn of [
      "submit-concierge-intake",
      "match-concierge-intake",
      "notify-free-tier-inquiry-redirect",
      "placement-cron",
      "placement-monitor",
      "send-placement-review-requests",
      "send-concierge-notifications",
      "send-tour-notifications",
      "detect-and-prerender",
      "prerender-for-bots",
    ]) {
      expect(
        existsSync(resolve(root, `supabase/functions/${fn}/index.ts`)),
        `supabase/functions/${fn} must not be deleted in stage 2`,
      ).toBe(true);
    }
  });

  it("leaves the legacy confirmation route registered", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(/\/inquiry\/confirmation\/:inquiryId/);
    expect(existsSync(resolve(root, "src/pages/InquiryConfirmation.tsx"))).toBe(true);
  });

  it("ships the phone-gating migration as SOURCE that destroys no data", () => {
    // Unlike the original stage-2 cutover, this amendment DOES require a
    // schema change: the public phone boundary cannot be enforced in the
    // frontend. What it must not do is destroy anything — the raw phone stays
    // stored for provider/admin/internal use.
    const rel = "supabase/migrations/20260831000000_pro_gate_public_facility_phone.sql";
    expect(existsSync(resolve(root, rel)), `${rel} missing`).toBe(true);
    const sql = read(rel);
    expect(sql).not.toMatch(/drop\s+table/i);
    expect(sql).not.toMatch(/drop\s+column/i);
    expect(sql).not.toMatch(/update\s+public\.facilities\s+set\s+phone/i);
    expect(sql).not.toMatch(/delete\s+from/i);
    // The two things it MUST do.
    expect(sql).toMatch(/has_active_pro\(id\)\s+THEN\s+phone/i);
    expect(sql).toMatch(/DROP POLICY IF EXISTS "facilities_select_public"/);
  });

  it("prerender-for-bots and detect-and-prerender still have no app caller", () => {
    // Verified as part of the stage-2 orphan audit: Vercel crawler routing
    // uses static prerendered HTML plus the og-share fallback. If this ever
    // fails, a caller was reintroduced and the legacy /concierge fallback
    // content inside prerender-for-bots became reachable again.
    const middleware = read("middleware.ts");
    expect(middleware).not.toMatch(/prerender-for-bots/);
    expect(middleware).not.toMatch(/detect-and-prerender/);
  });
});
