import { describe, it, expect } from "vitest";
import { resolveClaimsGuard } from "@/lib/claimsRouteGuard";

// Locks the /provider/claims panel-consistent guard: auth + role, but NO
// onboarding bounce (the page must stay reachable mid-claim).

describe("resolveClaimsGuard", () => {
  it("waits while the role hook is still resolving", () => {
    expect(resolveClaimsGuard(null, false, true)).toEqual({ kind: "wait" });
    expect(resolveClaimsGuard("provider", true, true)).toEqual({ kind: "wait" });
  });

  it("sends anonymous visitors to onboarding, preserving the claim returnTo", () => {
    const d = resolveClaimsGuard(null, false, false);
    expect(d).toEqual({ kind: "redirect", to: "/provider/onboarding?returnTo=/provider/claims" });
  });

  it("routes admins to the admin claim-review surface", () => {
    expect(resolveClaimsGuard("admin", true, false)).toEqual({ kind: "redirect", to: "/admin/claims" });
  });

  it("routes a legacy seeker session to the public directory (the seeker panel is retired)", () => {
    expect(resolveClaimsGuard("seeker", true, false)).toEqual({ kind: "redirect", to: "/search-results" });
  });

  it("renders the list for a provider", () => {
    expect(resolveClaimsGuard("provider", true, false)).toEqual({ kind: "render" });
  });

  it("renders during the brief null-role post-signup window (RLS-safe), no onboarding bounce", () => {
    // A just-signed-up claimant whose profile trigger hasn't resolved yet must
    // still see their claims — this is exactly why the page isn't under the
    // shell (which would bounce onboarding_incomplete providers to the wizard).
    expect(resolveClaimsGuard(null, true, false)).toEqual({ kind: "render" });
  });
});
