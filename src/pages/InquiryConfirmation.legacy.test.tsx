/**
 * Directory cutover stage 2 — legacy confirmation-route compatibility.
 *
 * /inquiry/confirmation/:inquiryId is retained ONLY so that links already
 * sent to seekers before the cutover keep resolving. It must:
 *
 *   • still render truthful status for a genuine historical
 *     routing_mode='free_tier_redirect' record that is still being serviced;
 *   • redirect to the directory for a malformed id, a missing row, or a row
 *     with any other routing mode — rather than showing a coordinator or
 *     matching promise the platform no longer makes;
 *   • never become an intake funnel.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const mockState = {
  row: null as Record<string, unknown> | null,
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = () => ({
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: mockState.row, error: null }).then(resolve),
      });
      return chain;
    },
  },
}));

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import InquiryConfirmation from "./InquiryConfirmation";

const LEGACY_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

function renderAt(id: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/inquiry/confirmation/${id}`]}>
        <Routes>
          <Route path="/inquiry/confirmation/:inquiryId" element={<InquiryConfirmation />} />
          <Route path="/search-results" element={<div data-testid="directory">Directory</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  mockState.row = null;
});

describe("InquiryConfirmation — legacy compatibility", () => {
  it("renders legacy status for a genuine historical free_tier_redirect record", async () => {
    mockState.row = {
      id: LEGACY_ID,
      routing_mode: "free_tier_redirect",
      intake_data: { originating_facility_name: "Riverbend Wellness" },
    };

    renderAt(LEGACY_ID);

    await screen.findByText(/we received your inquiry/i);
    expect(screen.getByText("Riverbend Wellness")).toBeInTheDocument();
    // The historical case is still serviced, so the coordinator reference is
    // truthful here — but it is scoped to this existing request.
    expect(screen.getByText(/following up on this earlier/i)).toBeInTheDocument();
    expect(
      screen.getByText(/not a treatment\s+placement or referral helpline/i),
    ).toBeInTheDocument();
  });

  it("makes no forward-looking matching promise", async () => {
    mockState.row = {
      id: LEGACY_ID,
      routing_mode: "free_tier_redirect",
      intake_data: {},
    };

    renderAt(LEGACY_ID);
    await screen.findByText(/we received your inquiry/i);

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/1-2 additional matched facilities/i);
    expect(text).not.toMatch(/3 facilities matching/i);
    expect(text).not.toMatch(/within 1 business hour/i);
    // And it is not an intake funnel.
    expect(document.querySelector("input")).toBeNull();
    expect(document.querySelector("form")).toBeNull();
  });

  it("redirects a malformed id to the directory", async () => {
    renderAt("not-a-uuid");
    await waitFor(() => expect(screen.getByTestId("directory")).toBeInTheDocument());
  });

  it("redirects to the directory when no historical record exists", async () => {
    mockState.row = null;
    renderAt(LEGACY_ID);
    await waitFor(() => expect(screen.getByTestId("directory")).toBeInTheDocument());
  });

  it("redirects when the record is not a free_tier_redirect case", async () => {
    mockState.row = {
      id: LEGACY_ID,
      routing_mode: "standard_concierge",
      intake_data: { originating_facility_name: "Riverbend Wellness" },
    };

    renderAt(LEGACY_ID);
    await waitFor(() => expect(screen.getByTestId("directory")).toBeInTheDocument());
    expect(screen.queryByText(/coordinator/i)).toBeNull();
  });
});
