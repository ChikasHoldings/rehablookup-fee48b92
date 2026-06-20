import { describe, it, expect, beforeEach, vi } from "vitest";

// Table-aware mock holder the hoisted vi.mock factory reads from. Each test
// sets what `profiles` and `provider_onboarding_state` return.
const mockState: {
  profile: { data: unknown; error: unknown };
  state: { data: unknown; error: unknown };
} = {
  profile: { data: null, error: null },
  state: { data: null, error: null },
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () =>
        table === "profiles" ? mockState.profile : mockState.state;
      return chain;
    },
  },
}));

import { resolveProviderPostLoginPath } from "@/lib/providerLanding";

describe("resolveProviderPostLoginPath — returnTo handling", () => {
  beforeEach(() => {
    mockState.profile = { data: null, error: null };
    mockState.state = { data: null, error: null };
  });

  it("honors an onboarding-scoped returnTo while onboarding is incomplete (claim deep-link survives the sign-in round-trip)", async () => {
    mockState.profile = { data: { onboarding_completed_at: null }, error: null };
    mockState.state = { data: { current_step: "find_or_list" }, error: null };
    const returnTo = "/provider/onboarding?intent=claim&facility_slug=sunrise-detox";

    const res = await resolveProviderPostLoginPath("user-1", returnTo);

    expect(res.reason).toBe("onboarding_incomplete");
    // Regression: previously returned bare "/provider/onboarding", dropping
    // the claim intent + target facility.
    expect(res.path).toBe(returnTo);
  });

  it("ignores a non-onboarding returnTo while onboarding is incomplete (cannot skip the wizard)", async () => {
    mockState.profile = { data: { onboarding_completed_at: null }, error: null };
    mockState.state = { data: { current_step: "find_or_list" }, error: null };

    const res = await resolveProviderPostLoginPath("user-1", "/provider/dashboard");

    expect(res.reason).toBe("onboarding_incomplete");
    expect(res.path).toBe("/provider/onboarding");
  });

  it("falls back to the bare wizard path when onboarding is incomplete and no returnTo is supplied", async () => {
    mockState.profile = { data: { onboarding_completed_at: null }, error: null };

    const res = await resolveProviderPostLoginPath("user-1");

    expect(res.reason).toBe("onboarding_incomplete");
    expect(res.path).toBe("/provider/onboarding");
  });

  it("honors any returnTo once onboarding is complete", async () => {
    mockState.profile = {
      data: { onboarding_completed_at: "2026-06-01T00:00:00Z" },
      error: null,
    };

    const res = await resolveProviderPostLoginPath("user-1", "/provider/dashboard?tab=leads");

    expect(res.reason).toBe("onboarding_complete");
    expect(res.path).toBe("/provider/dashboard?tab=leads");
  });
});
