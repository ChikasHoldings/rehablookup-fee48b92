import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("RehabLookup seeker retirement contract", () => {
  it("keeps the active role model provider/admin only", () => {
    const source = read("src/hooks/useUserRole.ts");
    expect(source).toContain('export type UserRole = "admin" | "provider" | null');
    expect(source).not.toContain('from("seeker_profiles")');
    expect(source).not.toContain('role === "seeker"');
    expect(source).not.toContain('homeRoute: "/account"');
  });

  it("keeps the public login provider-only", () => {
    const source = read("src/pages/Login.tsx");
    expect(source).toContain("Provider sign in");
    expect(source).toContain('content="noindex, nofollow"');
    expect(source).not.toContain('from("seeker_profiles")');
    expect(source).not.toContain("Create a seeker account");
  });

  it("redirects retired consumer-account routes before rendering", () => {
    const source = read("middleware.ts");
    for (const retired of ["/account", "/seeker", "/my-account", "/signup", "/reset-password"]) {
      expect(source).toContain(retired);
    }
    expect(source).toContain("retiredSeekerRedirect");
    expect(source).toContain('status: 308');
    expect(source).toContain('"X-Robots-Tag": "noindex, follow"');
  });

  it("does not ask consumers to authenticate to save searches", () => {
    const source = read("src/components/search/SaveSearchButton.tsx");
    expect(source).toContain("return null");
    expect(source).not.toContain("signInWithPassword");
    expect(source).not.toContain("/signup");
  });
});

describe("RehabLookup public SEO truth contract", () => {
  it("does not hardcode retired lead-marketplace claims in shared provider layouts", () => {
    const conversion = read("src/components/provider-guides/ProviderConversionPage.tsx");
    const guides = read("src/components/provider-guides/ProviderSEOPageLayout.tsx");
    const combined = `${conversion}\n${guides}`;

    for (const retiredClaim of [
      "Pay-for-Performance",
      "Verified Quality Leads",
      "<24hr Lead Delivery",
      "High-Intent Patient Leads",
      "Get Matched",
      "Receive Leads",
    ]) {
      expect(combined).not.toContain(retiredClaim);
    }

    expect(conversion).toContain("noindexLegacyPromise");
    expect(guides).toContain("noindexLegacyClaim");
  });

  it("keeps the rewritten city provider templates directory-first", () => {
    const files = [
      "src/pages/provider-guides/CityProviderPage.tsx",
      "src/pages/provider-guides/CityTreatmentProviderPage.tsx",
      "src/pages/provider-guides/CityInsuranceProviderPage.tsx",
    ];
    const combined = files.map(read).join("\n");

    expect(combined).not.toContain("qualified leads");
    expect(combined).not.toContain("20-40% census improvements");
    expect(combined).not.toContain("connects you with high-intent patients");
    expect(combined).toContain("directory");
  });

  it("keeps the main US rehab hub informational rather than a placement service", () => {
    const hub = read("src/pages/us-rehab/USRehabHub.tsx");
    const hero = read("src/pages/us-rehab/components/InternationalHero.tsx");
    const countries = read("src/pages/us-rehab/components/CountriesServed.tsx");
    const combined = `${hub}\n${hero}\n${countries}`;

    expect(combined).not.toContain("1,000+ Vetted Facilities");
    expect(combined).not.toContain("2,500+ International Enquiries");
    expect(combined).not.toContain("24-Hour Response");
    expect(combined).not.toContain("we connect you with the perfect treatment facility");
    expect(combined).toContain("contact providers directly");
  });

  it("temporarily noindexes specialized legacy US-rehab subpages", () => {
    const source = read("middleware.ts");
    expect(source).toContain('pathname.startsWith("/us-rehab/")');
    expect(source).toContain('"X-Robots-Tag", "noindex, follow"');
  });
});
