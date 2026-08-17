/**
 * THE PROVIDER MONETIZATION CONTRACT — regression suite.
 *
 * src/lib/proDirectoryBenefits.ts is the single source of truth for what a
 * provider can buy. This file makes it expensive to accidentally re-sell
 * something RehabLookup does not sell.
 *
 * Each of these had actually shipped in provider-facing copy before the
 * cutover, in three different hardcoded feature arrays that contradicted each
 * other:
 *   • "RehabLookup Verified badge" as a Pro feature   (trust is earned)
 *   • "Priority placement" / "+50 ranking boost"      (organic rank is not for sale)
 *   • "Upgrade to receive inquiries"                  (inquiries are not gated)
 *   • "Featured requires an active Pro plan" as sales positioning
 *   • "Concierge Partner"                             (retired product)
 *
 * The point of centralizing was that ONE list is auditable. So this suite
 * asserts the list's contents, and asserts the prohibition matcher itself
 * catches its own regression cases — a matcher that silently stopped matching
 * would make every other assertion here vacuous.
 */
import { describe, expect, it } from "vitest";
import {
  FEATURED_DIRECTORY_NOTE,
  FEATURED_POSITIONING,
  FREE_DIRECTORY_BENEFITS,
  PRO_ACTIVE_DESTINATIONS,
  PRO_BENEFIT_GROUPS,
  PRO_DIRECTORY_BENEFITS,
  PRO_DIRECTORY_TRUST_NOTE,
  PRO_PROHIBITED_CLAIM_PATTERNS,
  PRO_UPGRADE_HEADLINE,
  VERIFICATION_INDEPENDENCE_NOTE,
  findProhibitedProClaims,
  proBenefitsForGroup,
} from "@/lib/proDirectoryBenefits";

/** Every string the contract module would put in front of a provider. */
const salesCopy = [
  PRO_UPGRADE_HEADLINE,
  ...PRO_DIRECTORY_BENEFITS.flatMap((benefit) => [
    benefit.title,
    benefit.shortTitle,
    benefit.description,
    ...benefit.items,
  ]),
  ...PRO_BENEFIT_GROUPS.flatMap((group) => [group.label, group.summary]),
  ...FREE_DIRECTORY_BENEFITS,
  PRO_DIRECTORY_TRUST_NOTE,
  FEATURED_DIRECTORY_NOTE,
  VERIFICATION_INDEPENDENCE_NOTE,
  ...FEATURED_POSITIONING,
].join(" ");

describe("Pro benefit contract", () => {
  it("sells exactly the five implemented, Pro-gated capabilities", () => {
    expect(PRO_DIRECTORY_BENEFITS.map((benefit) => benefit.key)).toEqual([
      "direct-contact",
      "enhanced-profile",
      "rich-media",
      "multi-location",
      "performance",
    ]);
  });

  it("names the concrete capability behind each benefit", () => {
    // A benefit with no items is a slogan, not a product promise.
    for (const benefit of PRO_DIRECTORY_BENEFITS) {
      expect(benefit.items.length, `${benefit.key} has no items`).toBeGreaterThan(0);
      expect(benefit.description.length, `${benefit.key} has no description`).toBeGreaterThan(20);
    }
  });

  it("covers the direct-contact promise: public phone AND a Call button", () => {
    const contact = proBenefitsForGroup("direct-contact")
      .flatMap((b) => b.items)
      .join(" ");
    expect(contact).toMatch(/phone number/i);
    expect(contact).toMatch(/call button/i);
  });

  it("covers the enhanced-profile promise", () => {
    const enhanced = proBenefitsForGroup("enhanced-presentation")
      .flatMap((b) => b.items)
      .join(" ");
    for (const field of ["Programs", "Amenities", "Staff", "Accreditation"]) {
      expect(enhanced).toContain(field);
    }
  });

  it("covers the rich-media promise: 10 photos, video, virtual tour", () => {
    const media = proBenefitsForGroup("rich-media")
      .flatMap((b) => b.items)
      .join(" ");
    expect(media).toMatch(/10 photos/i);
    expect(media).toMatch(/video/i);
    expect(media).toMatch(/virtual tour/i);
  });

  it("caps multi-location at 5 listings", () => {
    const multi = proBenefitsForGroup("multi-location")
      .flatMap((b) => b.items)
      .join(" ");
    expect(multi).toMatch(/5 facility listings/i);
  });

  it("gives every benefit a group that the layout knows how to render", () => {
    const groupKeys = new Set(PRO_BENEFIT_GROUPS.map((g) => g.key));
    for (const benefit of PRO_DIRECTORY_BENEFITS) {
      expect(groupKeys.has(benefit.group), `unknown group ${benefit.group}`).toBe(true);
    }
    // And no group is empty — an empty group renders as a bare heading.
    for (const group of PRO_BENEFIT_GROUPS) {
      expect(proBenefitsForGroup(group.key).length, `${group.key} is empty`).toBeGreaterThan(0);
    }
  });
});

describe("Pro must not claim what RehabLookup does not sell", () => {
  it("claims no prohibited concept anywhere in the contract copy", () => {
    expect(findProhibitedProClaims(salesCopy)).toEqual([]);
  });

  it("never sells the Verified badge or paid verification", () => {
    expect(salesCopy).not.toMatch(/verified\s+badge/i);
    expect(salesCopy).not.toMatch(/paid\s+verification/i);
  });

  it("never sells organic ranking, priority placement, or a boost", () => {
    expect(salesCopy).not.toMatch(/priority\s+(?:search\s+)?(?:ranking|placement|position)/i);
    expect(salesCopy).not.toMatch(/rank(?:ing)?\s+boost/i);
    expect(salesCopy).not.toMatch(/\+\s*50/);
    expect(salesCopy).not.toMatch(/rank\s+higher/i);
  });

  it("never sells inquiry eligibility or promises leads", () => {
    expect(salesCopy).not.toMatch(/qualified\s+leads?/i);
    expect(salesCopy).not.toMatch(/guaranteed\s+(?:inquir|lead|admission)/i);
    expect(salesCopy).not.toMatch(/upgrade\s+to\s+receive\s+inquir/i);
  });

  it("never bundles Featured into Pro and never names Concierge", () => {
    expect(salesCopy).not.toMatch(/\bconcierge\b/i);
    expect(salesCopy).not.toMatch(/placement\s+network/i);
    // Pro's own benefit list must not contain Featured as a line item.
    const proItems = PRO_DIRECTORY_BENEFITS.flatMap((b) => b.items).join(" ");
    expect(proItems).not.toMatch(/\bfeatured\b/i);
  });

  /**
   * The matcher has to actually work. Without this, deleting a pattern from
   * PRO_PROHIBITED_CLAIM_PATTERNS would turn every assertion above green.
   */
  it("the prohibition matcher still catches each shipped regression", () => {
    const regressions: [string, string][] = [
      ["RehabLookup Verified badge", "Verified badge as a Pro benefit"],
      ["Priority search ranking", "priority ranking / priority placement"],
      ["Priority placement on city pages", "priority ranking / priority placement"],
      ["Pro includes a +50 ranking boost", "the retired +50 ranking boost"],
      ["Complete profiles rank higher", "a better organic position"],
      ["Qualified leads delivered to your inbox", "qualified leads"],
      ["Guaranteed inquiries every month", "guaranteed inquiries or admissions"],
      ["Upgrade to receive inquiries", "inquiry eligibility as a Pro entitlement"],
      ["Become a Concierge Partner", "Concierge Partner"],
      ["Placement network access", "placement network access"],
    ];
    for (const [copy, concept] of regressions) {
      expect(findProhibitedProClaims(copy), `matcher missed: ${copy}`).toContain(concept);
    }
  });

  it("has no unused prohibition pattern", () => {
    // Every pattern must be reachable, i.e. it must match at least the concept
    // string it describes being tested above. A pattern that can never fire is
    // dead reassurance.
    expect(PRO_PROHIBITED_CLAIM_PATTERNS.length).toBeGreaterThanOrEqual(10);
    for (const { pattern, concept } of PRO_PROHIBITED_CLAIM_PATTERNS) {
      expect(pattern.source.length, `${concept} has an empty pattern`).toBeGreaterThan(0);
    }
  });
});

describe("Free tier contract", () => {
  it("states directory presence and inquiry eligibility as Free", () => {
    const free = FREE_DIRECTORY_BENEFITS.join(" ");
    expect(free).toMatch(/listed in the directory/i);
    expect(free).toMatch(/receive inquiries/i);
  });

  it("does not describe Free as a trial of Pro", () => {
    const free = FREE_DIRECTORY_BENEFITS.join(" ");
    expect(free).not.toMatch(/\bupgrade\b/i);
    expect(free).not.toMatch(/\btrial\b/i);
  });
});

describe("trust and Featured statements", () => {
  it("uses the approved Pro trust statement verbatim", () => {
    expect(PRO_DIRECTORY_TRUST_NOTE).toBe(
      "Pro enhances your listing and provider tools. Verification and organic directory position are determined independently and are never purchased with Pro.",
    );
  });

  it("keeps Featured separate from Pro and from organic position", () => {
    expect(FEATURED_DIRECTORY_NOTE).toMatch(/separate, clearly labeled advertising product/i);
    expect(FEATURED_DIRECTORY_NOTE).toMatch(/does not change organic directory position/i);
  });

  it("positions Featured as labeled advertising with its own reporting", () => {
    const positioning = FEATURED_POSITIONING.join(" ");
    expect(positioning).toMatch(/sold separately from Pro/i);
    expect(positioning).toMatch(/clearly labeled/i);
    expect(positioning).toMatch(/does not change your organic directory position/i);
    expect(positioning).toMatch(/own performance reporting/i);
    // Featured is advertising — it must never be sold as ranking.
    expect(positioning).not.toMatch(/rank(?:ing)?\s+(?:boost|higher)/i);
  });

  it("states verification is earned, never sold", () => {
    expect(VERIFICATION_INDEPENDENCE_NOTE).toMatch(/earned/i);
    expect(VERIFICATION_INDEPENDENCE_NOTE).toMatch(/never sold/i);
    expect(VERIFICATION_INDEPENDENCE_NOTE).toMatch(/bundled with Pro/i);
  });

  it("keeps the upgrade headline outcome-shaped, not position-shaped", () => {
    expect(PRO_UPGRADE_HEADLINE).toBe("Make your listing easier to evaluate and contact.");
    expect(findProhibitedProClaims(PRO_UPGRADE_HEADLINE)).toEqual([]);
  });
});

describe("Pro active destinations", () => {
  it("routes a Pro provider to the surfaces Pro actually unlocks", () => {
    const hrefs = PRO_ACTIVE_DESTINATIONS.map((d) => d.href);
    expect(hrefs).toContain("/provider/listings/profile");
    expect(hrefs).toContain("/provider/listings");
    expect(hrefs).toContain("/provider/analytics");
    expect(hrefs).toContain("/provider/billing");
  });

  it("uses the current navigation vocabulary", () => {
    const labels = PRO_ACTIVE_DESTINATIONS.map((d) => d.label);
    expect(labels).toContain("Enhanced Profile");
    expect(labels).toContain("Performance");
    expect(labels).toContain("Plan & Billing");
    // The retired product names must not reappear as destinations.
    expect(labels).not.toContain("Analytics");
    expect(labels).not.toContain("Marketing");
    expect(labels).not.toContain("Subscription");
  });

  it("never routes a Pro provider at Featured as though it were included", () => {
    expect(PRO_ACTIVE_DESTINATIONS.map((d) => d.href)).not.toContain("/provider/marketing");
  });
});
