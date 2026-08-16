/**
 * Contact Facility modal — INQUIRY + PHONE-VISIBILITY contract.
 *
 * The previous version of this suite asserted the OLD split: Pro got the
 * inquiry form, everyone else got a direct-contact panel with the facility's
 * phone number on it. Both halves are now wrong, so the suite was rewritten
 * rather than patched.
 *
 * WHAT IS ASSERTED NOW
 *   • Free, Featured-only and Pro all mount the SAME inquiry form, bound to
 *     the one selected facility.
 *   • The facility's PHONE appears only for canonical active Pro — never for
 *     Free, never for Featured-only, and never reconstructed from a stale
 *     payload the parent surface happened to be holding.
 *   • Preferred-contact options follow the SEEKER's phone, not the facility's
 *     tier.
 *   • A transitional DIRECT_CONTACT_REQUIRED from an older backend is treated
 *     as a failure, not a success, and still reveals no phone.
 *
 * `FacilityInquiryForm` is stubbed so these tests assert *whether* the form is
 * mounted and with which facility, without re-walking its field-level flow —
 * that has its own coverage in FacilityInquiryForm.test.tsx.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockState = {
  facilityRow: null as Record<string, unknown> | null,
  facilityError: null as unknown,
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    from: () => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({
        data: mockState.facilityRow,
        error: mockState.facilityError,
      });
      return chain;
    },
  },
}));

/** Records how (and whether) the inquiry form was mounted. */
const formProps = { current: null as Record<string, unknown> | null };

vi.mock("@/components/profile/FacilityInquiryForm", async () => {
  const { useState } = await import("react");
  return {
    // Mirrors the real component's contract: once submitted it RETURNS the
    // caller's renderSuccess output in place of the form, rather than merely
    // invoking it.
    FacilityInquiryForm: (props: Record<string, unknown>) => {
      formProps.current = props;
      const [submitted, setSubmitted] = useState(false);

      if (submitted) {
        return (
          <>
            {(props.renderSuccess as (a: Record<string, unknown>) => React.ReactNode)({
              firstName: "Jordan",
              email: "jordan@example.com",
              deliveryState: "delivered_to_provider",
            })}
          </>
        );
      }

      return (
        <div data-testid="facility-inquiry-form">
          <span data-testid="bound-facility-id">{String(props.facilityId)}</span>
          <button
            type="button"
            onClick={() => (props.onDirectContactRequired as (() => void) | undefined)?.()}
          >
            simulate DIRECT_CONTACT_REQUIRED
          </button>
          <button type="button" onClick={() => setSubmitted(true)}>
            simulate success
          </button>
        </div>
      );
    },
  };
});

import { RequestInfoModal } from "./RequestInfoModal";

const FACILITY_ID = "5e41c64a-9708-4ca1-b5cd-feb35c96ab50";
const FACILITY_PHONE = "(931) 685-0957";
const FACILITY_PHONE_DIGITS = "9316850957";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: FACILITY_ID,
    name: "Cascadia Recovery Center",
    phone: FACILITY_PHONE,
    website: "https://cascadia.example.org",
    address: "77 Cascadia Avenue",
    city: "Portland",
    state: "OR",
    zip_code: "97209",
    slug: "cascadia-recovery-center-portland-or",
    status: "approved",
    is_pro: false,
    ...overrides,
  };
}

function renderModal(parentFacility: Record<string, unknown> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RequestInfoModal
          open
          onOpenChange={() => {}}
          facility={{
            id: FACILITY_ID,
            name: "Cascadia Recovery Center",
            city: "Portland",
            state: "OR",
            ...parentFacility,
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Everything the user could possibly read, including hidden/SR-only nodes. */
const documentText = () => document.body.textContent ?? "";
const documentHtml = () => document.body.innerHTML;

beforeEach(() => {
  mockState.facilityRow = null;
  mockState.facilityError = null;
  formProps.current = null;
  vi.clearAllMocks();
});

describe.each([
  ["Free / non-Pro", { is_pro: false }],
  ["Featured-only, non-Pro", { is_pro: false, featured: true, verified: true }],
])("phone-hidden tier — %s", (_label, flags) => {
  beforeEach(() => {
    mockState.facilityRow = row(flags);
  });

  it("mounts the inquiry form bound to the selected facility", async () => {
    renderModal();
    expect(await screen.findByTestId("facility-inquiry-form")).toBeInTheDocument();
    expect(screen.getByTestId("bound-facility-id")).toHaveTextContent(FACILITY_ID);
    expect(formProps.current?.facilityId).toBe(FACILITY_ID);
  });

  it("renders the facility name and a directory-safe framing", async () => {
    renderModal();
    await screen.findByTestId("facility-inquiry-form");
    expect(documentText()).toMatch(/Cascadia Recovery Center/);
    expect(documentText()).toMatch(/Send an inquiry directly to this treatment center/i);
  });

  it("does NOT render the facility phone number anywhere", async () => {
    renderModal();
    await screen.findByTestId("facility-inquiry-form");

    expect(documentText()).not.toContain(FACILITY_PHONE);
    // Digits in any formatting, anywhere in the DOM including sr-only nodes.
    expect(documentHtml().replace(/\D/g, "")).not.toContain(FACILITY_PHONE_DIGITS);
  });

  it("renders no Call action and no facility tel: link", async () => {
    renderModal();
    await screen.findByTestId("facility-inquiry-form");

    expect(screen.queryByTestId("pro-call-facility")).not.toBeInTheDocument();
    const telHrefs = Array.from(document.querySelectorAll('a[href^="tel:"]')).map((a) =>
      (a.getAttribute("href") ?? "").replace(/\D/g, ""),
    );
    // 988 / 911 crisis lines are allowed; the facility number is not.
    expect(telHrefs).not.toContain(FACILITY_PHONE_DIGITS);
    for (const h of telHrefs) expect(["988", "911"]).toContain(h);
  });

  it("shows no upgrade-to-Pro upsell to the seeker", async () => {
    renderModal();
    await screen.findByTestId("facility-inquiry-form");
    expect(documentText()).not.toMatch(/upgrade to pro/i);
    expect(documentText()).not.toMatch(/pro (?:provider|plan) to (?:see|view|unlock)/i);
  });

  it("still offers website and directions when the data is real", async () => {
    renderModal();
    await screen.findByTestId("facility-inquiry-form");
    expect(screen.getByTestId("facility-website")).toBeInTheDocument();
    expect(screen.getByTestId("facility-directions")).toBeInTheDocument();
  });

  it("ignores a phone the parent surface tries to pass in", async () => {
    // The prop type no longer accepts `phone`, but a stale JS caller could
    // still spread one in. It must not reach the DOM.
    renderModal({ phone: FACILITY_PHONE } as Record<string, unknown>);
    await screen.findByTestId("facility-inquiry-form");
    expect(documentHtml().replace(/\D/g, "")).not.toContain(FACILITY_PHONE_DIGITS);
  });
});

describe("phone-visible tier — active Pro", () => {
  beforeEach(() => {
    mockState.facilityRow = row({ is_pro: true });
  });

  it("mounts the same inquiry form, bound to the same facility", async () => {
    renderModal();
    expect(await screen.findByTestId("facility-inquiry-form")).toBeInTheDocument();
    expect(formProps.current?.facilityId).toBe(FACILITY_ID);
  });

  it("shows the facility phone and a Call action", async () => {
    renderModal();
    await screen.findByTestId("facility-inquiry-form");

    const call = screen.getByTestId("pro-call-facility");
    expect(call).toBeInTheDocument();
    expect(call.getAttribute("href")?.replace(/\D/g, "")).toContain(FACILITY_PHONE_DIGITS);
    expect(documentText()).toMatch(/Call facility/i);
  });

  it("does not imply payment means quality or recommendation", async () => {
    renderModal();
    await screen.findByTestId("facility-inquiry-form");
    expect(documentText()).not.toMatch(/recommended|preferred provider|best facility|trusted because/i);
  });
});

describe("phone visibility is driven ONLY by canonical is_pro", () => {
  it.each([
    ["false", false],
    ["null", null],
    ["undefined", undefined],
    ["the string 'true'", "true"],
    ["1", 1],
  ])("hides the phone when is_pro is %s", async (_label, value) => {
    mockState.facilityRow = row({ is_pro: value });
    renderModal();
    await screen.findByTestId("facility-inquiry-form");
    expect(screen.queryByTestId("pro-call-facility")).not.toBeInTheDocument();
    expect(documentHtml().replace(/\D/g, "")).not.toContain(FACILITY_PHONE_DIGITS);
  });

  it("does not unlock the phone from featured or verified", async () => {
    mockState.facilityRow = row({ is_pro: false, featured: true, verified: true });
    renderModal();
    await screen.findByTestId("facility-inquiry-form");
    expect(screen.queryByTestId("pro-call-facility")).not.toBeInTheDocument();
  });
});

describe("success state", () => {
  beforeEach(() => {
    mockState.facilityRow = row({ is_pro: false });
  });

  it("renders a clean confirmation naming the selected facility", async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByTestId("facility-inquiry-form");
    await user.click(screen.getByRole("button", { name: /simulate success/i }));

    const success = await screen.findByTestId("inquiry-success");
    expect(success).toHaveTextContent("Cascadia Recovery Center");
    expect(success).toHaveTextContent(/Inquiry sent/i);
  });

  it("makes no matching, Concierge, or response-time promise", async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByTestId("facility-inquiry-form");
    await user.click(screen.getByRole("button", { name: /simulate success/i }));
    await screen.findByTestId("inquiry-success");

    const text = documentText();
    expect(text).not.toMatch(/concierge|care coordinator|advisor|we'?ll match|matched/i);
    expect(text).not.toMatch(/within (?:an? )?(?:hour|24|business day)/i);
    expect(text).not.toMatch(/admissions specialist will reach out/i);
  });
});

describe("transitional DIRECT_CONTACT_REQUIRED defence", () => {
  beforeEach(() => {
    mockState.facilityRow = row({ is_pro: false });
  });

  it("does not render a success state when an older backend rejects the inquiry", async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByTestId("facility-inquiry-form");
    await user.click(screen.getByRole("button", { name: /simulate DIRECT_CONTACT_REQUIRED/i }));

    await waitFor(() => {
      expect(screen.getByTestId("facility-unavailable")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("inquiry-success")).not.toBeInTheDocument();
    expect(documentText()).toMatch(/Nothing was sent and nothing was saved/i);
  });

  it("still reveals no facility phone in the fallback state", async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByTestId("facility-inquiry-form");
    await user.click(screen.getByRole("button", { name: /simulate DIRECT_CONTACT_REQUIRED/i }));
    await screen.findByTestId("facility-unavailable");

    expect(documentHtml().replace(/\D/g, "")).not.toContain(FACILITY_PHONE_DIGITS);
  });

  it("offers self-service alternatives instead of navigating into Concierge", async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByTestId("facility-inquiry-form");
    await user.click(screen.getByRole("button", { name: /simulate DIRECT_CONTACT_REQUIRED/i }));
    await screen.findByTestId("facility-unavailable");

    expect(screen.getByTestId("inquiry-continue-search")).toBeInTheDocument();
    expect(screen.getByTestId("inquiry-compare")).toBeInTheDocument();
    expect(documentText()).not.toMatch(/concierge/i);
  });
});

describe("unresolvable facility", () => {
  it("collects nothing when the facility record cannot be loaded", async () => {
    mockState.facilityRow = null;
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("facility-unavailable")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("facility-inquiry-form")).not.toBeInTheDocument();
  });
});
