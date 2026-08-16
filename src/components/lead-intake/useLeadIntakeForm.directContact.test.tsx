/**
 * Directory cutover stage 2 — client handling of the server's authoritative
 * DIRECT_CONTACT_REQUIRED answer.
 *
 * The client's view of a facility's plan can be stale: a subscription can
 * lapse between the moment the form rendered and the moment it was
 * submitted. `submit-qualified-lead` re-resolves `has_active_pro()` on every
 * submission and is the authority. When it answers
 * DIRECT_CONTACT_REQUIRED nothing was persisted and nothing was sent, so the
 * form must NOT enter its submitted state — otherwise the seeker is told a
 * facility received an inquiry it never got.
 *
 * This also locks the removal of the retired `routing_mode ===
 * "free_tier_redirect"` branch, which used to navigate the seeker to the
 * concierge confirmation page.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

const mockState = {
  invokeMock: vi.fn(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockState.invokeMock(...args) },
    from: () => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({ data: null, error: null });
      return chain;
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

vi.mock("@/hooks/useAuthReady", () => ({
  useAuthReady: () => ({ user: null, isAuthenticated: false, isReady: true }),
}));

import { useLeadIntakeForm } from "./useLeadIntakeForm";

const FACILITY_ID = "5e41c64a-9708-4ca1-b5cd-feb35c96ab50";

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

async function submitWith(response: Record<string, unknown>, onDirectContactRequired?: () => void) {
  mockState.invokeMock = vi.fn().mockResolvedValue({ data: response, error: null });

  const { result } = renderHook(
    () =>
      useLeadIntakeForm({
        facilityIdOverride: FACILITY_ID,
        facilityNameOverride: "Cascadia Recovery Center",
        onDirectContactRequired,
      }),
    { wrapper },
  );

  act(() => {
    result.current.updateFormData({
      firstName: "Jordan",
      lastName: "Rivera",
      email: "jordan.rivera@example.com",
      phone: "5035550142",
    });
  });

  await act(async () => {
    await result.current.handleSubmit({ skipVerificationCheck: true });
  });

  return result;
}

beforeEach(() => {
  localStorage.clear();
  mockState.invokeMock = vi.fn();
});

describe("useLeadIntakeForm — DIRECT_CONTACT_REQUIRED", () => {
  it("does not enter the submitted state when the server requires direct contact", async () => {
    const onDirectContactRequired = vi.fn();
    const result = await submitWith(
      {
        ok: true,
        action: "DIRECT_CONTACT_REQUIRED",
        direct_contact_required: true,
        facility_id: FACILITY_ID,
        facility_name: "Cascadia Recovery Center",
        reason: "facility_not_pro",
      },
      onDirectContactRequired,
    );

    await waitFor(() => expect(onDirectContactRequired).toHaveBeenCalledTimes(1));
    expect(result.current.isSubmitted).toBe(false);
    expect(onDirectContactRequired).toHaveBeenCalledWith({
      facilityId: FACILITY_ID,
      facilityName: "Cascadia Recovery Center",
    });
  });

  it("also honours the response when only direct_contact_required is set", async () => {
    const onDirectContactRequired = vi.fn();
    const result = await submitWith(
      { ok: true, direct_contact_required: true, facility_id: FACILITY_ID },
      onDirectContactRequired,
    );

    await waitFor(() => expect(onDirectContactRequired).toHaveBeenCalledTimes(1));
    expect(result.current.isSubmitted).toBe(false);
  });

  it("still enters the submitted state for a normal Pro success response", async () => {
    const onDirectContactRequired = vi.fn();
    const result = await submitWith(
      { success: true, leadId: "lead-123", message: "Your inquiry has been sent successfully!" },
      onDirectContactRequired,
    );

    await waitFor(() => expect(result.current.isSubmitted).toBe(true));
    expect(onDirectContactRequired).not.toHaveBeenCalled();
  });

  it("never navigates to the retired concierge confirmation page", async () => {
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, assign },
    });

    try {
      // The shape the OLD server returned for a Free-tier facility. Even if a
      // stale deployment replayed it, the client must not follow it.
      await submitWith({
        ok: true,
        routing_mode: "free_tier_redirect",
        inquiry_id: "abc",
        confirmation_path: "/inquiry/confirmation/abc",
      });
      expect(assign).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
  });
});
