/**
 * THE PROVIDER MONETIZATION CONTRACT — single source of truth.
 *
 * RehabLookup is a directory. What a provider can buy, and what they can
 * never buy, is defined here once and consumed by every provider-facing
 * surface (dashboard, plan & billing, upgrade cards, sidebar, onboarding,
 * Featured hub, enhanced profile). Before this module each of those screens
 * carried its own hardcoded feature array, and they contradicted each other:
 * one promised a Verified badge, another a "+50 ranking boost", a third said
 * inquiries required Pro. All three were false.
 *
 *   Free      = be listed.
 *   Pro       = enhance and measure your listing.
 *   Featured  = buy clearly labeled additional exposure.
 *   Verified  = earn trust independently.
 *   Organic ranking = never for sale.
 *
 * Adding a Pro benefit means adding it HERE. `src/__tests__/
 * provider-pro-directory-model.test.ts` asserts the whole contract, and
 * `scripts/check-provider-admin-directory-model.mjs` asserts that the
 * provider surfaces don't grow a second, contradicting copy of it.
 */

/** A single sellable Pro capability, grouped by the outcome it produces. */
export interface ProDirectoryBenefit {
  key: string;
  /** Outcome group used to lay the upgrade page out. */
  group: ProBenefitGroupKey;
  /** Full sentence-case label. */
  title: string;
  /** Compact label for dense surfaces (sidebar, dashboard tiles). */
  shortTitle: string;
  description: string;
  /** Individual capabilities, for surfaces that itemize rather than summarize. */
  items: readonly string[];
}

export type ProBenefitGroupKey =
  | "direct-contact"
  | "enhanced-presentation"
  | "rich-media"
  | "multi-location"
  | "performance";

/**
 * The Pro benefit contract.
 *
 * Every entry is a capability that is ACTUALLY implemented and ACTUALLY
 * gated on `has_active_pro(facility_id)`:
 *   • direct contact  — public_facilities masks `phone` behind has_active_pro
 *   • enhanced profile — public_facility_programs / _amenities / _staff and
 *     the accreditation showcase row all filter on has_active_pro
 *   • rich media      — video_url / virtual_tour_url + the 10-photo gallery cap
 *   • multi-location  — the 5-listing facility limit
 *   • performance     — the Pro branch of the facility-analytics rollup
 *     (market position, traffic sources, per-source funnel)
 */
export const PRO_DIRECTORY_BENEFITS: readonly ProDirectoryBenefit[] = [
  {
    key: "direct-contact",
    group: "direct-contact",
    title: "Public phone + Call button",
    shortTitle: "Phone + Call button",
    description:
      "Publish your facility phone number and a direct Call button on your public listing, so families reach your admissions line without a middle step.",
    items: ["Public facility phone number", "Direct Call button on the public listing"],
  },
  {
    key: "enhanced-profile",
    group: "enhanced-presentation",
    title: "Enhanced facility profile",
    shortTitle: "Enhanced profile",
    description:
      "Publish the detail families actually compare on: programs, amenities, staff, and accreditation highlights.",
    items: [
      "Programs",
      "Amenities",
      "Staff",
      "Accreditation highlights",
      "Richer facility information",
    ],
  },
  {
    key: "rich-media",
    group: "rich-media",
    title: "Rich media",
    shortTitle: "Rich media",
    description:
      "Show the facility instead of describing it — up to 10 photos plus video and a virtual tour.",
    items: ["Up to 10 photos", "Facility video", "Virtual tour"],
  },
  {
    key: "multi-location",
    group: "multi-location",
    title: "Multi-location management",
    shortTitle: "Up to 5 locations",
    description:
      "Manage up to 5 facility listings from one provider account, each with its own profile and inquiries.",
    items: ["Up to 5 facility listings", "One account, per-facility profiles"],
  },
  {
    key: "performance",
    group: "performance",
    title: "Performance reporting",
    shortTitle: "Performance reporting",
    description:
      "See how your listing is performing: traffic sources, market position in your state, and the full engagement breakdown behind your headline numbers.",
    items: [
      "Traffic sources and referrers",
      "Market position in your state",
      "Full engagement + response reporting",
    ],
  },
] as const;

/** Outcome groups, in the order the upgrade page presents them. */
export const PRO_BENEFIT_GROUPS: readonly {
  key: ProBenefitGroupKey;
  label: string;
  summary: string;
}[] = [
  {
    key: "direct-contact",
    label: "Direct contact",
    summary: "Families call your admissions line straight from the listing.",
  },
  {
    key: "enhanced-presentation",
    label: "Enhanced presentation",
    summary: "Give families the detail they compare programs on.",
  },
  {
    key: "rich-media",
    label: "Rich media",
    summary: "Show the facility, not just a description of it.",
  },
  {
    key: "multi-location",
    label: "Multi-location",
    summary: "Run every listing you operate from one account.",
  },
  {
    key: "performance",
    label: "Performance",
    summary: "Measure what your listing is actually doing.",
  },
] as const;

export function proBenefitsForGroup(group: ProBenefitGroupKey): readonly ProDirectoryBenefit[] {
  return PRO_DIRECTORY_BENEFITS.filter((benefit) => benefit.group === group);
}

/**
 * What every FREE listing gets. Deliberately explicit: the panel used to
 * imply that inquiries, and even directory presence itself, were things you
 * upgraded into. They are not.
 */
export const FREE_DIRECTORY_BENEFITS: readonly string[] = [
  "Your facility listed in the directory",
  "Edit your listing — description, services, insurance, hours, logo",
  "Photos up to the Free gallery limit",
  "Reviews and provider tools available on Free",
  "Eligible facilities receive inquiries from their listing",
] as const;

/**
 * The headline for the Pro upgrade surface. Outcome-shaped, not a feature
 * checklist, and it promises presentation — never position.
 */
export const PRO_UPGRADE_HEADLINE = "Make your listing easier to evaluate and contact.";

/**
 * The trust statement. Reproduced verbatim wherever Pro is sold, so a
 * provider can never read a Pro payment as buying verification or position.
 */
export const PRO_DIRECTORY_TRUST_NOTE =
  "Pro enhances your listing and provider tools. Verification and organic directory position are determined independently and are never purchased with Pro.";

/** How Featured is positioned wherever it is mentioned next to Pro. */
export const FEATURED_DIRECTORY_NOTE =
  "Need additional exposure? Featured is a separate, clearly labeled advertising product and does not change organic directory position.";

/** What Featured is, stated the same way on every surface that sells it. */
export const FEATURED_POSITIONING: readonly string[] = [
  "Featured is advertising, sold separately from Pro and billed per location.",
  "Sponsored placements are clearly labeled wherever they appear.",
  "Featured does not change your organic directory position.",
  "Featured has its own performance reporting while it is active.",
] as const;

/** How verification is described anywhere it appears next to a paid product. */
export const VERIFICATION_INDEPENDENCE_NOTE =
  "Verification is earned through our review process. It is never sold, bundled with Pro, or affected by what you spend.";

/**
 * Concepts that must never be presented as Pro entitlements. Exported so the
 * regression tests and the build-time guard police one list rather than two
 * drifting ones. Each entry is a CONCEPT expressed as a pattern — bare words
 * like "featured" or "verified" are legitimate on their own surfaces.
 */
export const PRO_PROHIBITED_CLAIM_PATTERNS: readonly { pattern: RegExp; concept: string }[] = [
  { pattern: /verified\s+badge/i, concept: "Verified badge as a Pro benefit" },
  { pattern: /\bpaid\s+verification\b/i, concept: "paid verification" },
  {
    pattern: /priority\s+(?:search\s+)?(?:ranking|rank|placement|position|listing|visibility)/i,
    concept: "priority ranking / priority placement",
  },
  { pattern: /rank(?:ing)?\s+boost|boost(?:s|ed)?\s+(?:your\s+)?rank/i, concept: "a ranking boost" },
  { pattern: /\+\s*50\b/, concept: "the retired +50 ranking boost" },
  { pattern: /rank\s+higher|higher\s+in\s+search/i, concept: "a better organic position" },
  { pattern: /qualified\s+leads?/i, concept: "qualified leads" },
  { pattern: /guaranteed\s+(?:inquir|lead|admission)/i, concept: "guaranteed inquiries or admissions" },
  {
    pattern: /(?:upgrade|pro)\s+to\s+(?:receive|get)\s+inquir|inquir\w*\s+require\w*\s+pro/i,
    concept: "inquiry eligibility as a Pro entitlement",
  },
  { pattern: /\bconcierge\b/i, concept: "Concierge Partner" },
  { pattern: /placement\s+network/i, concept: "placement network access" },
] as const;

/**
 * Assert a block of Pro sales copy against the contract. Returns the concepts
 * it illegally claims (empty array = contract-safe). Used by the regression
 * tests; exported so any future surface can self-check in a unit test rather
 * than relying on a reviewer noticing.
 */
export function findProhibitedProClaims(copy: string): string[] {
  return PRO_PROHIBITED_CLAIM_PATTERNS.filter(({ pattern }) => pattern.test(copy)).map(
    ({ concept }) => concept,
  );
}

/** Where a Pro provider goes next, from any "your Pro is active" surface. */
export const PRO_ACTIVE_DESTINATIONS: readonly { label: string; href: string; description: string }[] = [
  {
    label: "Enhanced Profile",
    href: "/provider/listings/profile",
    description: "Programs, amenities, media, staff",
  },
  { label: "Listings", href: "/provider/listings", description: "Core listing details" },
  { label: "Performance", href: "/provider/analytics", description: "Views, calls, inquiries" },
  { label: "Plan & Billing", href: "/provider/billing", description: "Invoices and payment method" },
] as const;
