/**
 * Claim email-domain verification — client/server parity.
 *
 * ClaimWizard's MethodPicker auto-routes the provider to the single "best"
 * verification method and states outright that their signed-in address
 * "already lives on this facility's domain". If that recommendation is looser
 * than what initiate-claim-email-verification accepts, the provider is walked
 * into a DOMAIN_MISMATCH rejection on the step the wizard told them was the
 * fast path.
 *
 * The client previously compared APEX domains (last two labels) while the edge
 * function compares the full host (exact or subdomain). These cases pin the
 * rules to the server's, especially the asymmetry that caused the drift.
 */
import { describe, it, expect } from "vitest";
import {
  emailHost,
  emailMatchesFacilityWebsite,
  facilityHostFromWebsite,
} from "../claimVerification";

describe("facilityHostFromWebsite", () => {
  it("normalizes full URLs, bare hosts, and strips www", () => {
    expect(facilityHostFromWebsite("https://www.Example.org/admissions")).toBe("example.org");
    expect(facilityHostFromWebsite("example.org")).toBe("example.org");
    expect(facilityHostFromWebsite("  https://EXAMPLE.org  ")).toBe("example.org");
    expect(facilityHostFromWebsite("http://admissions.example.org")).toBe("admissions.example.org");
  });

  it("returns null for empty or unparseable input", () => {
    for (const v of [null, undefined, "", "   ", "http://"]) {
      expect(facilityHostFromWebsite(v)).toBeNull();
    }
  });
});

describe("emailHost", () => {
  it("extracts and lowercases the domain part", () => {
    expect(emailHost("John@Example.ORG")).toBe("example.org");
  });

  it("returns null when there is no usable domain", () => {
    for (const v of [null, undefined, "", "nodomain", "trailing@"]) {
      expect(emailHost(v)).toBeNull();
    }
  });
});

describe("emailMatchesFacilityWebsite", () => {
  it("accepts an exact host match", () => {
    expect(emailMatchesFacilityWebsite("john@example.org", "https://www.example.org")).toBe(true);
  });

  it("accepts an email on a subdomain of the facility host", () => {
    expect(emailMatchesFacilityWebsite("john@mail.example.org", "https://example.org")).toBe(true);
  });

  it("rejects an email on the PARENT of a subdomain facility host", () => {
    // The regression case. Apex comparison called this a match, so the picker
    // recommended email verification and the server then refused it.
    expect(
      emailMatchesFacilityWebsite("john@example.org", "https://admissions.example.org"),
    ).toBe(false);
  });

  it("rejects a lookalike domain that merely ends with the same letters", () => {
    // endsWith without the dot separator would wrongly accept notexample.org.
    expect(emailMatchesFacilityWebsite("john@notexample.org", "https://example.org")).toBe(false);
  });

  it("rejects an unrelated domain", () => {
    expect(emailMatchesFacilityWebsite("john@gmail.com", "https://example.org")).toBe(false);
  });

  it("is case-insensitive on both sides", () => {
    expect(emailMatchesFacilityWebsite("John@EXAMPLE.org", "HTTPS://WWW.Example.ORG")).toBe(true);
  });

  it("returns false when either side is missing", () => {
    expect(emailMatchesFacilityWebsite("john@example.org", null)).toBe(false);
    expect(emailMatchesFacilityWebsite(null, "https://example.org")).toBe(false);
    expect(emailMatchesFacilityWebsite("not-an-email", "https://example.org")).toBe(false);
  });
});
