// @vitest-environment node
//
// Runs in the node environment (not the suite-wide jsdom default): the module
// under test is a build script that reads `process.argv` and Node URL helpers.
/**
 * Generated facility profile — INQUIRY ROUTING + PHONE VISIBILITY contract.
 *
 * These tests import the REAL generator and render REAL HTML from fixture
 * rows. They touch no network and no Supabase project: the generator's
 * `main()` is guarded behind an invoked-directly check precisely so this
 * import is inert. Each rendered page is then fed through the REAL build
 * guard (`scripts/check-inquiry-routing-prerender.mjs`), so the fixtures prove
 * the generator and the guard agree rather than drifting apart.
 *
 * THE POINT OF THESE FIXTURES
 * ───────────────────────────
 * A test that feeds in `phone: null` and finds no phone in the output proves
 * nothing — it tests the fixture, not the masking. So the Free and
 * Featured-only fixtures below carry a POPULATED phone column, exactly as a
 * real SAMHSA-imported listing does, and assert the digits never reach the
 * HTML. That is the difference between "we didn't have a number" and "we had
 * one and withheld it".
 *
 * Production had no active Pro facility subscription at verification time and
 * none was fabricated, so the Pro half of the contract is covered here
 * deterministically instead.
 */
import { describe, it, expect } from "vitest";
// @ts-expect-error — plain .mjs build script, intentionally untyped
import {
  renderFacilityHtml,
  isActivePro,
  inquiryRoutingMode,
  phoneVisibilityMode,
} from "../../scripts/generate-facility-profiles-html.mjs";
// @ts-expect-error — plain .mjs build script, intentionally untyped
import { scanCenterPage } from "../../scripts/check-inquiry-routing-prerender.mjs";

/** Empty child-table buckets — most assertions don't depend on them. */
function emptyKids() {
  return {
    services: new Map(),
    insurance: new Map(),
    ageGroups: new Map(),
    accreditations: new Map(),
    programs: new Map(),
    amenities: new Map(),
    staff: new Map(),
    highlightedAccreds: new Map(),
  };
}

/** Insurance rows make the insurance FAQ render, which is where the
 *  "benefits verification through the profile" regression lived. */
function kidsWithInsurance(facilityId: string) {
  const kids = emptyKids();
  kids.insurance.set(facilityId, ["Aetna", "Blue Cross Blue Shield"]);
  return kids;
}

/**
 * The digits every non-Pro fixture must NOT leak. Mirrors the real production
 * row that exposed the bug (Tony Rice Center, INC — approved, unclaimed,
 * is_pro=false, and a populated phone column).
 */
const SOURCE_PHONE = "(931) 685-0957";
const SOURCE_PHONE_DIGITS = "9316850957";

/** 1. Free CLAIMED facility that HAS a phone in its source data. */
const FREE_CLAIMED_WITH_PHONE = {
  id: "free-claimed",
  slug: "tony-rice-center-inc-shelbyville-tn-cfa6cfec",
  name: "Tony Rice Center, INC",
  city: "Shelbyville",
  state: "TN",
  zip_code: "37160",
  address: "1234 Recovery Way",
  phone: SOURCE_PHONE,
  website: "https://tonyricecenter.example.org",
  facility_type: "Outpatient Program",
  is_claimed: true,
  is_pro: false,
};

/** 2. Free facility with website + address (no phone at all). */
const FREE_WEB_AND_ADDRESS = {
  id: "free-web",
  slug: "harbor-point-recovery-shelbyville-tn",
  name: "Harbor Point Recovery",
  city: "Shelbyville",
  state: "TN",
  address: "88 Harbor Point Road",
  phone: null,
  website: "https://harborpoint.example.org",
  is_pro: false,
};

/** 3. FEATURED-ONLY, non-Pro, WITH a phone in source data.
 *     Featured is paid visibility and must not unlock the number. */
const FEATURED_ONLY_WITH_PHONE = {
  id: "featured-only",
  slug: "beacon-ridge-treatment-nashville-tn",
  name: "Beacon Ridge Treatment",
  city: "Nashville",
  state: "TN",
  address: "500 Beacon Ridge Drive",
  phone: SOURCE_PHONE,
  website: "https://beaconridge.example.org",
  featured: true,
  featured_pinned: true,
  verified: true,
  is_pro: false,
};

/** 4. ACTIVE PRO with a phone. */
const PRO_WITH_PHONE = {
  id: "pro-1",
  slug: "cascadia-recovery-center-portland-or",
  name: "Cascadia Recovery Center",
  city: "Portland",
  state: "OR",
  zip_code: "97209",
  address: "77 Cascadia Avenue",
  phone: SOURCE_PHONE,
  website: "https://cascadia.example.org",
  facility_type: "Residential Program",
  is_pro: true,
};

/** 5. Facility with no phone on either tier. */
const PRO_NO_PHONE = {
  ...PRO_WITH_PHONE,
  id: "pro-nophone",
  slug: "still-water-recovery-bend-or",
  name: "Still Water Recovery",
  phone: null,
};

const render = (f: Record<string, unknown>, kids = emptyKids()) =>
  renderFacilityHtml(f, kids) as string;

/** Run the shipped build guard over a rendered page. */
const guard = (html: string, slug: string) => scanCenterPage(html, slug);

/** Digits present anywhere in the document, ignoring formatting. */
function containsPhoneDigits(html: string, digits: string): boolean {
  // Strip everything but digits from the whole page, then look for the run.
  // This catches "(931) 685-0957", "931-685-0957", "931.685.0957" and
  // "tel:+19316850957" alike.
  return html.replace(/\D/g, "").includes(digits);
}

describe("facility prerender — entitlement resolution", () => {
  it("treats only is_pro === true as Pro, failing safe on every other shape", () => {
    expect(isActivePro({ is_pro: true })).toBe(true);
    for (const value of [false, null, undefined, "true", 1, {}]) {
      expect(isActivePro({ is_pro: value })).toBe(false);
      expect(phoneVisibilityMode({ is_pro: value })).toBe("hidden");
    }
    expect(phoneVisibilityMode({ is_pro: true })).toBe("pro");
  });

  it("never derives Pro from Featured", () => {
    expect(isActivePro(FEATURED_ONLY_WITH_PHONE)).toBe(false);
    expect(phoneVisibilityMode(FEATURED_ONLY_WITH_PHONE)).toBe("hidden");
  });

  it("routes every inquiry to the selected facility and nowhere else", () => {
    expect(inquiryRoutingMode()).toBe("facility");
  });
});

describe.each([
  ["Free claimed facility with a phone in source data", FREE_CLAIMED_WITH_PHONE, true],
  ["Free facility with website + address, no phone", FREE_WEB_AND_ADDRESS, false],
  ["Featured-only non-Pro with a phone in source data", FEATURED_ONLY_WITH_PHONE, true],
])("phone-hidden page — %s", (_label, fixture, sourceHasPhone) => {
  const html = render(fixture, kidsWithInsurance(fixture.id));

  it('is marked data-phone-visibility="hidden"', () => {
    expect(html).toContain('data-phone-visibility="hidden"');
    expect(html).not.toContain('data-phone-visibility="pro"');
  });

  it('is marked data-inquiry-routing="facility"', () => {
    expect(html).toContain('data-inquiry-routing="facility"');
  });

  it("still offers an inquiry CTA for its own facility", () => {
    expect(html).toContain(`/center/${fixture.slug}?action=request-info`);
    expect(html).toMatch(/Send Inquiry/);
  });

  if (sourceHasPhone) {
    // THE LOAD-BEARING ASSERTION. The source row HAS a phone; the artifact
    // must not.
    it("does not leak the phone number that exists in its source data", () => {
      expect(fixture.phone).toBeTruthy();
      expect(containsPhoneDigits(html, SOURCE_PHONE_DIGITS)).toBe(false);
      expect(html).not.toContain(SOURCE_PHONE);
    });
  }

  it("emits no facility tel: link", () => {
    const telTargets = [...html.matchAll(/href="tel:([^"]*)"/g)].map((m) =>
      m[1].replace(/\D/g, ""),
    );
    expect(telTargets).not.toContain(SOURCE_PHONE_DIGITS);
  });

  it("emits no JSON-LD telephone property", () => {
    expect(html).not.toMatch(/"telephone"\s*:/);
  });

  it("renders no visible Phone: line and no Call CTA", () => {
    expect(html).not.toMatch(/<strong>Phone:<\/strong>/i);
    expect(html).not.toMatch(/<a[^>]*class="btn[^"]*"[^>]*href="tel:/i);
  });

  it("does not tell the reader to call in the FAQ", () => {
    // The contact FAQ must not route a seeker to a number we withhold.
    expect(html).not.toMatch(/You can call [^<]*at \(?931/i);
  });

  it("keeps website and directions when the data is real", () => {
    if (fixture.website) {
      expect(html).toContain(fixture.website);
    }
    if (fixture.address) {
      expect(html).toMatch(/Get Directions/);
    }
  });

  it("passes the shipped build guard", () => {
    const result = guard(html, fixture.slug);
    expect(result.isFacilityPage).toBe(true);
    expect(result.phoneMode).toBe("hidden");
    expect(result.inquiryMode).toBe("facility");
    expect(result.violations).toEqual([]);
  });
});

describe("phone-pro page — active Pro facility with a phone", () => {
  const html = render(PRO_WITH_PHONE, kidsWithInsurance(PRO_WITH_PHONE.id));

  it('is marked data-phone-visibility="pro" and data-inquiry-routing="facility"', () => {
    expect(html).toContain('data-phone-visibility="pro"');
    expect(html).toContain('data-inquiry-routing="facility"');
  });

  it("offers the inquiry CTA for its own facility", () => {
    expect(html).toContain(`/center/${PRO_WITH_PHONE.slug}?action=request-info`);
  });

  it("publishes the facility phone, a tel: link and JSON-LD telephone", () => {
    expect(containsPhoneDigits(html, SOURCE_PHONE_DIGITS)).toBe(true);
    expect(html).toMatch(/href="tel:/);
    expect(html).toMatch(/"telephone"\s*:/);
    expect(html).toMatch(/<strong>Phone:<\/strong>/i);
  });

  it("may reference calling in the contact FAQ", () => {
    expect(html).toMatch(/You can call /i);
  });

  it("passes the shipped build guard", () => {
    const result = guard(html, PRO_WITH_PHONE.slug);
    expect(result.phoneMode).toBe("pro");
    expect(result.inquiryMode).toBe("facility");
    expect(result.violations).toEqual([]);
  });
});

describe("facility with no phone at all", () => {
  const html = render(PRO_NO_PHONE, emptyKids());

  it("still offers the inquiry CTA and passes the guard", () => {
    expect(html).toContain(`/center/${PRO_NO_PHONE.slug}?action=request-info`);
    expect(guard(html, PRO_NO_PHONE.slug).violations).toEqual([]);
  });

  it("emits no telephone anywhere and no Call CTA", () => {
    expect(html).not.toMatch(/"telephone"\s*:/);
    expect(html).not.toMatch(/<a[^>]*class="btn[^"]*"[^>]*href="tel:/i);
  });
});

describe("no generated facility page promises coordination or a response time", () => {
  it.each([
    ["free-claimed", FREE_CLAIMED_WITH_PHONE],
    ["featured-only", FEATURED_ONLY_WITH_PHONE],
    ["pro", PRO_WITH_PHONE],
  ])("%s", (_label, fixture) => {
    const html = render(fixture, kidsWithInsurance(fixture.id));
    expect(html).not.toMatch(/care coordinator|our advisors?|treatment specialist matches/i);
    expect(html).not.toMatch(/within (?:an? )?(?:hour|business day)/i);
    expect(html).not.toMatch(/we'?ll (?:find|match) (?:you )?(?:a|another)/i);
    // The inquiry is never described as going anywhere but this facility.
    expect(html).not.toMatch(/sent to (?:multiple|several|other) (?:facilities|centers)/i);
  });
});
