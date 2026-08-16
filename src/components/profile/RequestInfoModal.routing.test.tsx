/**
 * Directory cutover stage 2 — facility-contact UI contract.
 *
 * Proves that the selected-facility contact surface is split cleanly in two:
 *
 *   ACTIVE PRO  → the on-platform Request Info form is mounted for that one
 *                 facility, exactly as before.
 *   EVERYTHING  → a direct-contact panel built only from the facility's own
 *   ELSE          published details. No seeker PII intake, no email
 *                 verification, no edge-function call, no coordinator /
 *                 advisor / matching promise.
 *
 * `LeadIntakeForm` is stubbed here so these tests assert *whether* the PII
 * form is mounted (and with which facility) without re-walking its multi-step
 * flow — that flow keeps its own end-to-end coverage in
 * src/components/lead-intake/RequestInfoForm.test.tsx.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockState = {
  invokeMock: vi.fn(),
  facilityRow: null as Record<string, unknown> | null,
  facilityError: null as unknown,
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockState.invokeMock(...args),
    },
    from: () => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({
        data: mockState.facilityRow,
        error: mockState.facilityError,
      });
      chain.single = async () => ({
        data: mockState.facilityRow,
        error: mockState.facilityError,
      });
      return chain;
    },
  },
}));

/** Records how (and whether) the PII form was mounted. */
const leadFormProps = { current: null as Record<string, unknown> | null };

vi.mock("@/components/lead-intake", () => ({
  LeadIntakeForm: (props: Record<string, unknown>) => {
    leadFormProps.current = props;
    return (
      <div data-testid="lead-intake-form">
        <label htmlFor="stub-email">Email Address</label>
        <input id="stub-email" name="email" />
        <button
          type="button"
          onClick={() => (props.onDirectContactRequired as (() => void) | undefined)?.()}
        >
          simulate DIRECT_CONTACT_REQUIRED
        </button>
      </div>
    );
  },
}));

import { RequestInfoModal } from "./RequestInfoModal";

const FACILITY_ID = "5e41c64a-9708-4ca1-b5cd-feb35c96ab50";

function proRow(overrides: Record<string, unknown> = {}) {
  return {
    id: FACILITY_ID,
    name: "Cascadia Recovery Center",
    phone: "5035550142",
    website: "https://cascadia.example",
    address: "120 River Rd",
    city: "Portland",
    state: "OR",
    zip_code: "97201",
    slug: "cascadia-recovery-center",
    status: "approved",
    is_pro: true,
    ...overrides,
  };
}

function renderModal(facilityOverrides: Record<string, unknown> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RequestInfoModal
          open
          onOpenChange={() => {}}
          facility={{
            id: FACILITY_ID,
            name: "Cascadia Recovery Center",
            city: "Portland",
            state: "OR",
            slug: "cascadia-recovery-center",
            logo_url: null,
            phone: "5035550142",
            verified: true,
            ...facilityOverrides,
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Copy that would imply RehabLookup handles the inquiry itself. */
const PLACEMENT_PROMISE_PATTERNS = [
  /care coordinator/i,
  /coordinator will/i,
  /\badvisor\b/i,
  /we'll match you/i,
  /matched (facilit|option|program)/i,
  /placement (support|specialist|assistance)/i,
  /our team will (follow up|match)/i,
  /we'll find/i,
  /introduce you/i,
];

function expectNoPlacementPromises() {
  const text = document.body.textContent ?? "";
  for (const pattern of PLACEMENT_PROMISE_PATTERNS) {
    expect(text).not.toMatch(pattern);
  }
}

beforeEach(() => {
  mockState.invokeMock = vi.fn().mockResolvedValue({ data: {}, error: null });
  mockState.facilityRow = null;
  mockState.facilityError = null;
  leadFormProps.current = null;
});

describe("RequestInfoModal — FREE / non-Pro facility", () => {
  it("renders no lead-intake form and no seeker PII fields", async () => {
    mockState.facilityRow = proRow({ is_pro: false });
    renderModal();

    await screen.findByTestId("direct-contact-call");

    expect(screen.queryByTestId("lead-intake-form")).toBeNull();
    expect(leadFormProps.current).toBeNull();
    expect(document.querySelector('input[name="email"]')).toBeNull();
    expect(document.querySelector('input[type="tel"]')).toBeNull();
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByText(/verification code/i)).toBeNull();
  });

  it("never calls submit-qualified-lead or submit-marketing-lead", async () => {
    mockState.facilityRow = proRow({ is_pro: false });
    renderModal();

    await screen.findByTestId("direct-contact-call");

    const invoked = mockState.invokeMock.mock.calls.map((c) => c[0]);
    expect(invoked).not.toContain("submit-qualified-lead");
    expect(invoked).not.toContain("submit-marketing-lead");
    expect(invoked).not.toContain("submit-concierge-intake");
    expect(invoked).not.toContain("send-verification-code");
    expect(invoked).not.toContain("verify-code");
    expect(invoked).not.toContain("check-email-verified");
  });

  it("makes no coordinator, advisor, or matching promise", async () => {
    mockState.facilityRow = proRow({ is_pro: false });
    renderModal();
    await screen.findByTestId("direct-contact-call");
    expectNoPlacementPromises();
  });

  it("renders the facility's own phone action when a phone exists", async () => {
    mockState.facilityRow = proRow({ is_pro: false });
    renderModal();

    const call = await screen.findByTestId("direct-contact-call");
    expect(call.getAttribute("href")).toBe("tel:+15035550142");
  });

  it("renders the facility website action when a website exists", async () => {
    mockState.facilityRow = proRow({ is_pro: false });
    renderModal();

    const website = await screen.findByTestId("direct-contact-website");
    expect(website.getAttribute("href")).toBe("https://cascadia.example/");
    expect(website.getAttribute("rel")).toContain("noopener");
  });

  it("hides the website action when the facility has no website", async () => {
    mockState.facilityRow = proRow({ is_pro: false, website: null });
    renderModal();

    await screen.findByTestId("direct-contact-call");
    expect(screen.queryByTestId("direct-contact-website")).toBeNull();
  });

  it("renders directions when there is real location data", async () => {
    mockState.facilityRow = proRow({ is_pro: false });
    renderModal();

    const directions = await screen.findByTestId("direct-contact-directions");
    expect(directions.getAttribute("href")).toContain(
      encodeURIComponent("120 River Rd, Portland, OR, 97201"),
    );
  });

  it("hides directions when location data is too thin to point a map at", async () => {
    // A bare state would send the seeker to a region centroid — worse than
    // showing nothing. We never manufacture an address.
    mockState.facilityRow = proRow({
      is_pro: false,
      address: null,
      city: null,
      zip_code: null,
      state: "OR",
    });
    renderModal({ city: null });

    await screen.findByTestId("direct-contact-call");
    expect(screen.queryByTestId("direct-contact-directions")).toBeNull();
  });

  it("falls back to a safe keep-searching state when no contact method exists", async () => {
    mockState.facilityRow = proRow({
      is_pro: false,
      phone: null,
      website: null,
      address: null,
      city: null,
      zip_code: null,
      state: null,
    });
    renderModal({ phone: null, city: null, state: null });

    await screen.findByTestId("direct-contact-continue-search");

    expect(
      screen.getByText(/direct contact information is not available/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("direct-contact-compare")).toBeInTheDocument();
    expect(screen.queryByTestId("direct-contact-call")).toBeNull();
    expect(screen.queryByTestId("lead-intake-form")).toBeNull();
    expectNoPlacementPromises();
  });

  it("treats a Featured-but-not-Pro listing exactly like any other non-Pro listing", async () => {
    mockState.facilityRow = proRow({ is_pro: false });
    renderModal({ featured: true });

    await screen.findByTestId("direct-contact-call");
    expect(screen.queryByTestId("lead-intake-form")).toBeNull();
  });

  it("fails safe to direct contact when the facility lookup errors", async () => {
    mockState.facilityRow = null;
    mockState.facilityError = { message: "network down" };
    renderModal();

    await screen.findByTestId("direct-contact-continue-search");
    expect(screen.queryByTestId("lead-intake-form")).toBeNull();
    expectNoPlacementPromises();
  });

  it("shows a safe failure state (never a generic PII form) when the facility record is missing", async () => {
    renderModal({ id: null });

    await screen.findByTestId("direct-contact-continue-search");
    expect(screen.getByText(/couldn't load this facility's details/i)).toBeInTheDocument();
    expect(screen.queryByTestId("lead-intake-form")).toBeNull();
    expect(mockState.invokeMock).not.toHaveBeenCalled();
    expectNoPlacementPromises();
  });
});

describe("RequestInfoModal — ACTIVE PRO facility", () => {
  it("mounts the Request Info form bound to the one selected facility", async () => {
    mockState.facilityRow = proRow();
    renderModal();

    await screen.findByTestId("lead-intake-form");

    expect(leadFormProps.current?.facilityId).toBe(FACILITY_ID);
    expect(leadFormProps.current?.facilityName).toBe("Cascadia Recovery Center");
    expect(screen.queryByTestId("direct-contact-call")).toBeNull();
  });

  it("keeps the facility identity and a direct call CTA visible", async () => {
    mockState.facilityRow = proRow();
    renderModal();

    await screen.findByTestId("lead-intake-form");

    expect(screen.getByText("Cascadia Recovery Center")).toBeInTheDocument();
    expect(screen.getByText("Portland, OR")).toBeInTheDocument();
    expect(screen.getByText("Pro Provider")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/call cascadia recovery center at/i),
    ).toHaveAttribute("href", "tel:+15035550142");
  });
});

describe("RequestInfoModal — server-authoritative downgrade", () => {
  it("switches to direct contact instead of claiming the facility received the inquiry", async () => {
    // The client believed this facility was Pro, but `submit-qualified-lead`
    // re-resolved has_active_pro() and answered DIRECT_CONTACT_REQUIRED.
    mockState.facilityRow = proRow();
    renderModal();

    await screen.findByTestId("lead-intake-form");

    await userEvent.click(
      screen.getByRole("button", { name: /simulate DIRECT_CONTACT_REQUIRED/i }),
    );

    await waitFor(() => {
      expect(screen.queryByTestId("lead-intake-form")).toBeNull();
    });

    expect(screen.getByTestId("direct-contact-call")).toBeInTheDocument();
    expect(screen.queryByText(/request sent/i)).toBeNull();
    expect(screen.queryByText(/has been delivered to/i)).toBeNull();
    expectNoPlacementPromises();
  });
});
