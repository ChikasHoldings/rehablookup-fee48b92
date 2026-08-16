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

/** Every file on the ACTIVE new seeker facility-contact path. */
const ACTIVE_CONTACT_PATH = [
  "src/components/profile/RequestInfoModal.tsx",
  "src/components/profile/FacilityDirectContact.tsx",
  "src/hooks/useFacilityContactRouting.ts",
  "src/components/lead-intake/LeadIntakeForm.tsx",
  "src/components/lead-intake/useLeadIntakeForm.ts",
  "src/components/lead-intake/SingleQuestionFlow.tsx",
  "src/components/cards/SearchResultCard.tsx",
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

  it("resolves entitlement from the canonical is_pro projection, not facility_subscriptions", () => {
    const src = read("src/hooks/useFacilityContactRouting.ts");
    expect(src).toMatch(/public_facilities/);
    expect(src).toMatch(/is_pro/);
    expect(stripComments(src)).not.toMatch(/facility_subscriptions/);
  });
});

describe("stage 2 — submit-qualified-lead source contract", () => {
  const FN = "supabase/functions/submit-qualified-lead/index.ts";

  it("resolves entitlement before any PII-dependent processing", () => {
    // Scoped to the request handler body — the helper *definitions* above it
    // (checkForDuplicate, isBlocked, …) naturally appear earlier in the file
    // and say nothing about execution order.
    const full = read(FN);
    const handlerStart = full.indexOf("Deno.serve(async (req)");
    expect(handlerStart).toBeGreaterThan(-1);
    const handler = full.slice(handlerStart);

    const entitlement = handler.indexOf('supabase.rpc("has_active_pro"');
    expect(entitlement).toBeGreaterThan(-1);

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
      expect(idx, `${marker} must run after the entitlement gate`).toBeGreaterThan(entitlement);
    }

    // ...and the gate itself must sit after facility identity resolution, so
    // the direct-contact response can name the facility.
    const facilityLoad = handler.indexOf('from("facilities")');
    expect(facilityLoad).toBeGreaterThan(-1);
    expect(entitlement).toBeGreaterThan(facilityLoad);
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

  it("exposes a machine-readable direct-contact contract", () => {
    const src = read(FN);
    expect(src).toMatch(/DIRECT_CONTACT_REQUIRED/);
    expect(src).toMatch(/direct_contact_required/);
    expect(src).toMatch(/entitlement_unconfirmed/);
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

  it("does not add a database migration", () => {
    // Stage 2 requires no schema change. A migration added alongside these
    // changes would mean scope crept into Stage 4.
    const src = read("src/hooks/useFacilityContactRouting.ts");
    expect(src).not.toMatch(/drop\s+table/i);
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
