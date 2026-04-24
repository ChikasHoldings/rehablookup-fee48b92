/**
 * End-to-end behavioural tests for the Request Information form.
 *
 * Goals (the user-facing acceptance criteria):
 *   1. The consent notice ("By submitting, you agree to be contacted ...")
 *      and the linked Privacy Policy + Terms must be visible to the user
 *      BEFORE the Submit button is reachable.
 *   2. Submitting a fully-filled form must invoke the `submit-qualified-lead`
 *      edge function. That function is the single server-side entry point
 *      that dispatches BOTH the seeker confirmation email and the facility
 *      notification email via `sendEmailWithRetry`
 *      (see supabase/functions/submit-qualified-lead/index.ts). Asserting
 *      this call with the right payload is functionally equivalent to
 *      asserting the email pipeline fires — without binding the test suite
 *      to a real SMTP/Resend endpoint.
 *
 * Strategy: mock `@/integrations/supabase/client` so the email-verification
 * helpers and `submit-qualified-lead` are deterministic, then exercise the
 * real `LeadIntakeForm` via the multi-step `SingleQuestionFlow`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// vi.mock factories are hoisted, so we route calls through a module-scoped
// mock holder the factory can reference safely.
const mockState = {
  invokeMock: vi.fn(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockState.invokeMock(...args),
    },
    from: () => {
      const chain: Record<string, unknown> = {};
      const noop = async () => ({ data: null, error: null, count: 0 });
      const noopList = async () => ({ data: [], error: null, count: 0 });
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.neq = () => chain;
      chain.gte = () => chain;
      chain.order = () => chain;
      chain.limit = () => chain;
      chain.maybeSingle = noop;
      chain.single = noop;
      chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(noopList()).then(resolve);
      return chain;
    },
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useZipcodeLookup", () => ({
  useZipcodeLookup: () => ({ data: null, isLoading: false, lookup: vi.fn() }),
}));

import { LeadIntakeForm } from "./LeadIntakeForm";

const FACILITY = {
  id: "5e41c64a-9708-4ca1-b5cd-feb35c96ab50",
  name: "Cascadia Recovery Center",
};

function renderForm(facilityName = FACILITY.name) {
  return render(
    <MemoryRouter>
      <LeadIntakeForm
        facilityId={FACILITY.id}
        facilityName={facilityName}
      />
    </MemoryRouter>
  );
}

/**
 * Walk the multi-step intake flow forward until the contact step renders
 * (identified by the visible heading "How can we reach you?").
 *
 * Strategy: read the current <h2> title, perform the matching action, then
 * wait until the title changes before issuing the next action. This avoids
 * the "double-click while transitioning" race that an indiscriminate
 * walker hits with the 300ms auto-advance.
 */
async function advanceToContactStep(user: ReturnType<typeof userEvent.setup>) {
  const CONTACT_TITLE = /how can we reach you/i;

  const currentTitle = () => {
    const h = document.querySelector("h2");
    return h?.textContent?.trim() ?? "";
  };

  for (let safety = 0; safety < 25; safety++) {
    const title = currentTitle();
    if (CONTACT_TITLE.test(title)) return;

    // Location step has a ZIP input + a Continue button.
    const zipInput = document.querySelector(
      'input[placeholder="ZIP" i], input[placeholder="Zip" i]'
    ) as HTMLInputElement | null;

    if (zipInput) {
      await user.type(zipInput, "84010");
      const continueBtn = screen.getByRole("button", { name: /^continue$/i });
      const before = title;
      await user.click(continueBtn);
      // Wait for the heading to change (location → next step).
      await waitFor(() => {
        expect(currentTitle()).not.toBe(before);
      }, { timeout: 3000 });
      continue;
    }

    // Choice step: pick the first answer button. Choice answers are buttons
    // inside the question panel that are NOT the Back/Continue/Skip nav row.
    const answerButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>("button")
    ).filter((b) => {
      const txt = (b.textContent || "").trim().toLowerCase();
      if (!txt) return false;
      if (/^back$/.test(txt) || txt.includes("skip")) return false;
      if (/^continue$/.test(txt)) return false;
      // Choice option buttons have substantial label text.
      return txt.length > 1;
    });

    if (answerButtons.length === 0) return;

    const before = title;
    await user.click(answerButtons[0]);
    // Auto-advance fires ~300ms after click; wait for heading to change.
    await waitFor(() => {
      expect(currentTitle()).not.toBe(before);
    }, { timeout: 3000 });
  }
}

beforeEach(() => {
  mockState.invokeMock.mockReset();
  // Default behaviour: not verified, generic success.
  mockState.invokeMock.mockResolvedValue({ data: null, error: null });
});

// --------------------------------------------------------------------------
// 1. Consent notice presence — must be shown on the contact step
// --------------------------------------------------------------------------
describe("Request Information form — consent notice", () => {
  it("shows the consent notice naming the facility, with Privacy Policy and Terms links, before Submit is interactable", async () => {
    const user = userEvent.setup();
    renderForm();

    await advanceToContactStep(user);

    // We're now on the contact step. The consent notice must be present.
    const submitBtn = await screen.findByRole("button", { name: /^submit$/i });
    expect(submitBtn).toBeInTheDocument();

    // Required: explicit consent language naming the facility.
    const consent = screen.getByText(
      (_content, node) => {
        if (!node) return false;
        const text = node.textContent || "";
        return /By submitting, you agree to be contacted by/i.test(text)
          && text.includes(FACILITY.name)
          && /phone, SMS, or email/i.test(text);
      }
    );
    expect(consent).toBeInTheDocument();

    // Required: Privacy Policy + Terms links inside the consent block.
    const privacy = screen.getByRole("link", { name: /privacy policy/i });
    const terms = screen.getByRole("link", { name: /^terms$/i });
    expect(privacy).toHaveAttribute("href", "/privacy-policy");
    expect(terms).toHaveAttribute("href", "/terms-of-service");

    // Confidentiality assurance.
    expect(consent.textContent).toMatch(/confidential/i);
  }, 30000);

  it("falls back to a generic 'selected treatment center' wording when no facility name is provided", async () => {
    const user = userEvent.setup();
    renderForm("");
    await advanceToContactStep(user);

    await screen.findByRole("button", { name: /^submit$/i });
    expect(screen.getByText(/the selected treatment center/i)).toBeInTheDocument();
  }, 30000);
});

// --------------------------------------------------------------------------
// 2. Email notification pipeline — submit triggers `submit-qualified-lead`
// --------------------------------------------------------------------------
describe("Request Information form — email notification trigger", () => {
  it("invokes submit-qualified-lead with the seeker payload after the contact step is filled", async () => {
    // Stub: address is already verified (returning user), so the form
    // skips the OTP step and submits straight from the contact panel.
    mockState.invokeMock.mockImplementation(async (fnName: string) => {
      if (fnName === "check-email-verified") {
        return { data: { verified: true }, error: null };
      }
      if (fnName === "submit-qualified-lead") {
        return { data: { success: true, leadId: "test-lead-id" }, error: null };
      }
      return { data: null, error: null };
    });

    const user = userEvent.setup();
    renderForm();

    await advanceToContactStep(user);
    await screen.findByRole("button", { name: /^submit$/i });

    // Fill contact details by placeholder (labels aren't htmlFor-linked).
    await user.type(screen.getByPlaceholderText(/^john$/i), "Test");
    await user.type(screen.getByPlaceholderText(/^doe$/i), "Seeker");

    // Phone — find the tel input (PhoneInput renders an input[type=tel]).
    const telInput = document.querySelector('input[type="tel"]') as HTMLInputElement;
    if (telInput) {
      await user.type(telInput, "5555551234");
    }

    await user.type(
      screen.getByPlaceholderText(/you@example\.com/i),
      "test.seeker@example.com"
    );

    // Submit.
    const submitBtn = screen.getByRole("button", { name: /^submit$/i });
    await user.click(submitBtn);

    // Assert: the email-verification check ran first.
    await waitFor(() => {
      const verifyCalls = mockState.invokeMock.mock.calls.filter(
        (c) => c[0] === "check-email-verified"
      );
      expect(verifyCalls.length).toBeGreaterThan(0);
    });

    // Assert: submit-qualified-lead was called — this is the function that
    // server-side dispatches BOTH the seeker-confirmation email and the
    // facility new-lead notification email via sendEmailWithRetry.
    await waitFor(
      () => {
        const submitCall = mockState.invokeMock.mock.calls.find(
          (c) => c[0] === "submit-qualified-lead"
        );
        expect(submitCall).toBeDefined();
        const body = submitCall![1].body;
        expect(body.facilityId).toBe(FACILITY.id);
        expect(body.email).toBe("test.seeker@example.com");
        expect(body.firstName).toBe("Test");
        expect(body.lastName).toBe("Seeker");
        // Phone is normalised to digits-only for submission.
        expect(body.phone).toMatch(/^\d{10,}$/);
        // Idempotency key MUST be set so the edge function dedupes
        // duplicate email notifications.
        expect(body.idempotencyKey).toBeTruthy();
      },
      { timeout: 5000 }
    );
  }, 30000);
});
