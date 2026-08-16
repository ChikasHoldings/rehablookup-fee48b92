// @vitest-environment node
//
// Runs in the node environment (not the suite-wide jsdom default): the module
// under test is a build script that reads `process.argv` and Node URL helpers.
/**
 * Directory cutover stage 2, verification hotfix #1 —
 * generated facility profile CONTACT-ROUTING contract.
 *
 * Stage 2 routed the React facility-contact path by entitlement, but the
 * crawler-facing static mirror produced by
 * `scripts/generate-facility-profiles-html.mjs` rendered its "Request
 * Information" CTA and its contact/insurance FAQ answers unconditionally.
 * A real Free facility's generated page therefore advertised an on-platform
 * inquiry form the server would refuse with DIRECT_CONTACT_REQUIRED.
 *
 * These tests import the REAL generator and render REAL HTML from fixture
 * rows. They touch no network and no Supabase project: the generator's
 * `main()` is guarded behind an invoked-directly check precisely so this
 * import is inert. Each rendered page is then fed through the REAL build
 * guard (`scripts/check-inquiry-routing-prerender.mjs`), so the fixtures
 * prove the generator and the guard agree.
 *
 * Fixtures deliberately include a Pro shape. Production had no active Pro
 * facility subscription at verification time, and none was fabricated — the
 * Pro contract is covered here deterministically instead.
 */
import { describe, it, expect } from "vitest";
// @ts-expect-error — plain .mjs build script, intentionally untyped
import { renderFacilityHtml, isActivePro, contactRoutingMode } from "../../scripts/generate-facility-profiles-html.mjs";
// @ts-expect-error — plain .mjs build script, intentionally untyped
import { scanCenterPage } from "../../scripts/check-inquiry-routing-prerender.mjs";

/** Empty child-table buckets — none of these assertions depend on them. */
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

const FREE_FULL = {
  id: "free-full",
  slug: "tony-rice-center-inc-shelbyville-tn-cfa6cfec",
  name: "Tony Rice Center, INC",
  city: "Shelbyville",
  state: "TN",
  zip_code: "37160",
  address: "1234 Recovery Way",
  phone: "(931) 555-0100",
  website: "https://tonyricecenter.example.org",
  facility_type: "Outpatient Program",
  is_pro: false,
};

const FREE_BARE = {
  id: "free-bare",
  slug: "bare-listing-shelbyville-tn",
  name: "Bare Listing Recovery",
  city: "Shelbyville",
  state: "TN",
  address: null,
  phone: null,
  website: null,
  is_pro: false,
};

const PRO = {
  ...FREE_FULL,
  id: "pro-1",
  slug: "cascadia-recovery-center-portland-or",
  name: "Cascadia Recovery Center",
  city: "Portland",
  state: "OR",
  is_pro: true,
};

const render = (f: Record<string, unknown>, kids = emptyKids()) =>
  renderFacilityHtml(f, kids) as string;

/** Run the shipped build guard over a rendered page. */
const guard = (html: string, slug: string) => scanCenterPage(html, slug);

describe("facility prerender — entitlement resolution", () => {
  it("treats only is_pro === true as Pro, failing safe on every other shape", () => {
    expect(isActivePro({ is_pro: true })).toBe(true);
    for (const value of [false, null, undefined, "true", 1, {}]) {
      expect(isActivePro({ is_pro: value }), `is_pro=${JSON.stringify(value)}`).toBe(false);
      expect(contactRoutingMode({ is_pro: value })).toBe("direct");
    }
    expect(isActivePro({})).toBe(false);
    expect(isActivePro(null)).toBe(false);
    expect(contactRoutingMode({ is_pro: true })).toBe("pro");
  });

  it("never derives Pro from Featured", () => {
    const html = render({ ...FREE_FULL, featured: true, verified: true });
    expect(html).toContain('data-contact-routing="direct"');
    expect(html).not.toContain('data-contact-routing="pro"');
  });
});

// ── FIXTURE 1 — Free / non-Pro with full contact data ─────────────────────
describe("FIXTURE 1 — Free facility with phone, website and address", () => {
  const html = render(FREE_FULL, kidsWithInsurance(FREE_FULL.id));

  it('carries exactly one marker, data-contact-routing="direct"', () => {
    const markers = html.match(/data-contact-routing="[a-z-]*"/g) ?? [];
    expect(markers).toEqual(['data-contact-routing="direct"']);
  });

  it("offers the facility's own call, website and directions actions", () => {
    expect(html).toContain(`href="tel:${FREE_FULL.phone}"`);
    expect(html).toContain(FREE_FULL.website);
    expect(html).toContain("Visit Facility Website");
    expect(html).toContain("Get Directions");
    expect(html).toContain("https://www.google.com/maps/search/");
  });

  it("keeps directory recovery paths available", () => {
    expect(html).toContain(`href="/center/${FREE_FULL.slug}"`);
    expect(html).toContain('href="/search-results"');
  });

  it("heads the CTA with direct facility contact, not Request Information", () => {
    expect(html).toContain(`<h2>Contact ${FREE_FULL.name} Directly</h2>`);
    expect(html).not.toContain(`<h2>Request Information from`);
  });

  it("contains no on-platform inquiry affordance", () => {
    expect(html).not.toContain("?action=request-info");
    expect(html).not.toMatch(/"Request Information" form/i);
    expect(html).not.toMatch(/send a confidential inquiry (?:through|via|on) (?:the|this)/i);
  });

  it("does not tell the seeker to request benefits verification through the profile", () => {
    expect(html).not.toMatch(/request a benefits verification through the profile/i);
    expect(html).not.toMatch(/\bwe (?:verify|confirm) your benefits\b/i);
  });

  it("points the insurance FAQ at the facility, in HTML and in JSON-LD alike", () => {
    const expected = "Contact the facility directly to confirm benefits and out-of-pocket costs.";
    // Visible FAQ section.
    expect(html).toContain(expected);
    // FAQPage JSON-LD built from the same items.
    const faqLd = extractFaqLd(html);
    const insurance = faqLd.find((q) => /accept insurance/i.test(q.name));
    expect(insurance, "insurance FAQ entry missing").toBeTruthy();
    expect(insurance!.acceptedAnswer.text).toContain(expected);
    expect(insurance!.acceptedAnswer.text).not.toMatch(/through the profile/i);
  });

  it("points the contact FAQ at the facility's real channels only", () => {
    const faqLd = extractFaqLd(html);
    const contact = faqLd.find((q) => /How do I contact/i.test(q.name));
    expect(contact, "contact FAQ entry missing").toBeTruthy();
    const answer = contact!.acceptedAnswer.text;
    expect(answer).toContain(FREE_FULL.phone);
    expect(answer).toContain(FREE_FULL.website);
    expect(answer).toMatch(/contact admissions directly/i);
    expect(answer).not.toMatch(/Request Information/i);
    // No unsupported per-facility response-time claim.
    expect(answer).not.toMatch(/same business day/i);
  });

  it("makes no unsupported response-time claim anywhere on the page", () => {
    expect(html).not.toMatch(/typically responds the same business day/i);
  });

  it("passes the shipped build guard", () => {
    const result = guard(html, FREE_FULL.slug);
    expect(result.isFacilityPage).toBe(true);
    expect(result.mode).toBe("direct");
    expect(result.violations).toEqual([]);
  });
});

// ── FIXTURE 1b — Free / non-Pro with NO published contact channel ─────────
describe("FIXTURE 1b — Free facility with no phone and no website", () => {
  const html = render(FREE_BARE);

  it('is still marked data-contact-routing="direct"', () => {
    const markers = html.match(/data-contact-routing="[a-z-]*"/g) ?? [];
    expect(markers).toEqual(['data-contact-routing="direct"']);
  });

  it("manufactures no contact action and never substitutes RehabLookup's number", () => {
    // Scoped to the CTA block: the shared site header/footer legitimately
    // carry RehabLookup's own support line and the SAMHSA/988 crisis numbers,
    // and this hotfix does not touch that chrome.
    const cta = extractCta(html);
    expect(cta).not.toContain('href="tel:');
    expect(cta).not.toContain("Visit Facility Website");
    // RehabLookup's own support number must not stand in for a missing one.
    expect(cta).not.toMatch(/\(?214\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    // The CTA says so plainly rather than implying channels exist "below".
    expect(cta).toMatch(/has not published a direct phone number or website/i);
  });

  it("still offers directions, which are grounded in the row's real city/state", () => {
    // A map link is a location affordance, not a way to reach admissions —
    // it is allowed here precisely because city + state are real columns.
    expect(extractCta(html)).toContain("https://www.google.com/maps/search/");
  });

  it("still offers safe profile/search recovery", () => {
    expect(html).toContain(`href="/center/${FREE_BARE.slug}"`);
    expect(html).toContain('href="/search-results"');
    expect(html).toContain("Search Other Treatment Centers");
  });

  it("says plainly that no direct channel was published", () => {
    expect(html).toMatch(/has not published a direct phone number or website/i);
  });

  it("offers no on-platform inquiry affordance and passes the build guard", () => {
    expect(html).not.toContain("?action=request-info");
    const result = guard(html, FREE_BARE.slug);
    expect(result.mode).toBe("direct");
    expect(result.violations).toEqual([]);
  });
});

// ── FIXTURE 2 — Active Pro ────────────────────────────────────────────────
describe("FIXTURE 2 — active Pro facility", () => {
  const html = render(PRO, kidsWithInsurance(PRO.id));

  it('carries exactly one marker, data-contact-routing="pro"', () => {
    const markers = html.match(/data-contact-routing="[a-z-]*"/g) ?? [];
    expect(markers).toEqual(['data-contact-routing="pro"']);
  });

  it("may offer Request Information, pinned to its own facility slug", () => {
    expect(html).toContain(`href="/center/${PRO.slug}?action=request-info"`);
    const links = html.match(/href="\/center\/[^"]*\?action=request-info"/g) ?? [];
    expect(links).toEqual([`href="/center/${PRO.slug}?action=request-info"`]);
  });

  it("keeps direct facility contact available alongside the inquiry CTA", () => {
    expect(html).toContain(`href="tel:${PRO.phone}"`);
    expect(html).toContain("Visit Facility Website");
    expect(html).toContain("Get Directions");
  });

  it("promises no matching, advisor, coordinator or multi-facility distribution", () => {
    expect(html).not.toMatch(/\bconnect you (?:with|to)\b[^.<]{0,40}\b(?:another|other|a different)\b/i);
    expect(html).not.toMatch(/\b(?:our|rehablookup'?s)\s+(?:advisors?|coordinators?|care team)\b/i);
    expect(html).not.toMatch(/\bwe(?:'ll| will)\s+(?:find|match)\b/i);
    expect(html).toMatch(/Your details go to this facility only/i);
  });

  it("lets the Pro FAQ reference the on-platform form without overpromising", () => {
    const faqLd = extractFaqLd(html);
    const contact = faqLd.find((q) => /How do I contact/i.test(q.name));
    expect(contact!.acceptedAnswer.text).toMatch(/"Request Information" form/);
    expect(contact!.acceptedAnswer.text).not.toMatch(/same business day/i);
    const insurance = faqLd.find((q) => /accept insurance/i.test(q.name));
    expect(insurance!.acceptedAnswer.text).not.toMatch(
      /request a benefits verification through the profile/i,
    );
  });

  it("passes the shipped build guard", () => {
    const result = guard(html, PRO.slug);
    expect(result.isFacilityPage).toBe(true);
    expect(result.mode).toBe("pro");
    expect(result.violations).toEqual([]);
  });
});

// ── The guard itself must actually fail on the regression it exists for ───
describe("check:inquiry-routing-prerender catches the stage-2 regression", () => {
  it("rejects a direct page carrying the pre-hotfix Request Information CTA", () => {
    const regressed = render(FREE_FULL, kidsWithInsurance(FREE_FULL.id)).replace(
      `<h2>Contact ${FREE_FULL.name} Directly</h2>`,
      `<h2>Request Information from ${FREE_FULL.name}</h2>\n<a href="/center/${FREE_FULL.slug}?action=request-info">Request Information</a>`,
    );
    const result = guard(regressed, FREE_FULL.slug);
    expect(result.mode).toBe("direct");
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.map((v: { rule: string }) => v.rule).join(" ")).toMatch(
      /inquiry flow/i,
    );
  });

  it("rejects a facility page with no contact-routing marker at all", () => {
    const stripped = render(FREE_FULL).replace(/ data-contact-routing="[a-z-]*"/g, "");
    const result = guard(stripped, FREE_FULL.slug);
    expect(result.isFacilityPage).toBe(true);
    expect(result.violations.map((v: { rule: string }) => v.rule).join(" ")).toMatch(
      /no data-contact-routing marker/i,
    );
  });
});

/** Isolate the contact CTA block from the surrounding shared page chrome. */
function extractCta(html: string): string {
  const start = html.indexOf('<div class="cta"');
  expect(start, "no CTA block in rendered page").toBeGreaterThan(-1);
  const end = html.indexOf('<section class="related"', start);
  return html.slice(start, end === -1 ? undefined : end);
}

/** Pull the FAQPage JSON-LD block out of a rendered page. */
function extractFaqLd(
  html: string,
): Array<{ name: string; acceptedAnswer: { text: string } }> {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const [, body] of blocks) {
    const parsed = JSON.parse(body.replace(/\\u003c/g, "<"));
    if (parsed["@type"] === "FAQPage") return parsed.mainEntity;
  }
  throw new Error("no FAQPage JSON-LD found in rendered page");
}
