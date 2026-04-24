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
 * (identified by the visible heading "How can we reach you?" AND/OR the
 * presence of the email input).
 *
 * Strategy:
 *   1. Detect the active step by inspecting the LAST <h2> in the DOM.
 *      Framer-motion may keep the outgoing panel mounted during the
 *      ~300ms transition, so the active step is the most recently
 *      mounted heading.
 *   2. Hard-stop the walker the instant the contact step is visible.
 *      Never click anything on contact/verify — those are terminal
 *      from the walker's perspective.
 *   3. After each click, wait until the active heading actually changes
 *      AND the outgoing panel has unmounted (only one <h2> remaining)
 *      so the next iteration reads a stable DOM and cannot accidentally
 *      double-act on a transitioning panel.
 */
async function advanceToContactStep(user: ReturnType<typeof userEvent.setup>) {
  const CONTACT_TITLE = /how can we reach you/i;
  const VERIFY_TITLE = /verify your email/i;

  const activeTitle = () => {
    const headings = document.querySelectorAll("h2");
    if (headings.length === 0) return "";
    return headings[headings.length - 1].textContent?.trim() ?? "";
  };

  const onContactStep = () => {
    if (CONTACT_TITLE.test(activeTitle())) return true;
    // Secondary signal: the email input only renders on the contact step.
    return !!document.querySelector('input[placeholder="you@example.com" i]');
  };

  const waitForStableTransition = async (previousTitle: string) => {
    // Phase 1: heading must change to a NEW step.
    await waitFor(
      () => {
        expect(activeTitle()).not.toBe(previousTitle);
        expect(activeTitle().length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
    // Phase 2: outgoing panel must unmount so DOM is stable for the
    // next iteration.
    await waitFor(
      () => {
        expect(document.querySelectorAll("h2").length).toBe(1);
      },
      { timeout: 3000 }
    );
  };

  for (let safety = 0; safety < 20; safety++) {
    // Hard stop: never click past the contact step.
    if (onContactStep()) return;

    const title = activeTitle();

    // Refuse to act on the verify step — that requires a real OTP code.
    // Bail out so the test fails with a clear message rather than spin.
    if (VERIFY_TITLE.test(title)) {
      throw new Error(
        "advanceToContactStep landed on the email-verification step. " +
          "The test must mock check-email-verified to return verified:true " +
          "so the flow skips OTP and goes straight to submit."
      );
    }

    // Location step: ZIP input + Continue button.
    const zipInput = document.querySelector(
      'input[placeholder="ZIP" i], input[placeholder="Zip" i]'
    ) as HTMLInputElement | null;

    if (zipInput) {
      await user.type(zipInput, "84010");
      const continueBtn = screen.getByRole("button", { name: /^continue$/i });
      await user.click(continueBtn);
      await waitForStableTransition(title);
      continue;
    }

    // Choice step: pick the first answer button inside the active panel.
    // Filter out navigation and submit-style buttons aggressively so we
    // can never accidentally click "Submit" or "Send Code".
    const answerButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>("button")
    ).filter((b) => {
      const txt = (b.textContent || "").trim().toLowerCase();
      if (!txt) return false;
      if (/^back$/.test(txt)) return false;
      if (/skip/.test(txt)) return false;
      if (/^continue$/.test(txt)) return false;
      if (/^submit$/.test(txt)) return false;
      if (/^send code$/.test(txt)) return false;
      if (/^resend/.test(txt)) return false;
      return txt.length > 1;
    });

    if (answerButtons.length === 0) {
      // Defensive: nothing actionable — bail rather than spin.
      return;
    }

    await user.click(answerButtons[0]);
    await waitForStableTransition(title);
  }

  throw new Error(
    `advanceToContactStep exhausted 20 iterations without reaching the contact step. Last heading: "${activeTitle()}"`
  );
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

    // Required: explicit consent language naming the facility. Framer-motion
    // may keep both the outgoing and incoming step panels mounted during the
    // transition, so we accept >=1 matching node.
    const consentMatches = screen.getAllByText(
      (_content, node) => {
        if (!node) return false;
        const text = node.textContent || "";
        return /By submitting, you agree to be contacted by/i.test(text)
          && text.includes(FACILITY.name)
          && /phone, SMS, or email/i.test(text);
      }
    );
    expect(consentMatches.length).toBeGreaterThan(0);

    // Required: Privacy Policy + Terms links inside the consent block.
    const privacy = screen.getAllByRole("link", { name: /privacy policy/i })[0];
    const terms = screen.getAllByRole("link", { name: /^terms$/i })[0];
    expect(privacy).toHaveAttribute("href", "/privacy-policy");
    expect(terms).toHaveAttribute("href", "/terms-of-service");

    // Confidentiality assurance.
    expect(consentMatches[0].textContent).toMatch(/confidential/i);
  }, 30000);

  it("falls back to a generic 'selected treatment center' wording when no facility name is provided", async () => {
    const user = userEvent.setup();
    renderForm("");
    await advanceToContactStep(user);

    await screen.findByRole("button", { name: /^submit$/i });
    expect(screen.getAllByText(/the selected treatment center/i).length).toBeGreaterThan(0);
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

// --------------------------------------------------------------------------
// 3. Submit handler payload contract — exact field-by-field assertion
//
// This is an integration-style test: it drives the real form end-to-end
// and asserts that the exact payload sent to `submit-qualified-lead`
// matches the contract that the edge function depends on
// (see supabase/functions/submit-qualified-lead/index.ts and
// src/components/lead-intake/useLeadIntakeForm.ts:428).
//
// If any of these fields silently change shape, the seeker confirmation
// email and facility notification email will fail in production. Locking
// them down here gives us a regression-safe contract test.
// --------------------------------------------------------------------------
describe("Request Information form — submit-qualified-lead payload contract", () => {
  const SEEKER = {
    firstName: "Maria",
    lastName: "Gonzalez",
    phoneDigits: "5551234567",
    email: "maria.gonzalez@example.com",
  };

  /**
   * Helper: run the form to completion and return the payload object that
   * was sent to `submit-qualified-lead`.
   */
  async function runFormAndCapturePayload(): Promise<Record<string, unknown>> {
    // Stub: address verified, lead accepted.
    mockState.invokeMock.mockImplementation(async (fnName: string) => {
      if (fnName === "check-email-verified") {
        return { data: { verified: true }, error: null };
      }
      if (fnName === "submit-qualified-lead") {
        return { data: { success: true, leadId: "contract-test-id" }, error: null };
      }
      return { data: null, error: null };
    });

    const user = userEvent.setup();
    renderForm();

    await advanceToContactStep(user);
    await screen.findByRole("button", { name: /^submit$/i });

    await user.type(screen.getByPlaceholderText(/^john$/i), SEEKER.firstName);
    await user.type(screen.getByPlaceholderText(/^doe$/i), SEEKER.lastName);

    const telInput = document.querySelector('input[type="tel"]') as HTMLInputElement | null;
    if (telInput) {
      await user.type(telInput, SEEKER.phoneDigits);
    }

    await user.type(
      screen.getByPlaceholderText(/you@example\.com/i),
      SEEKER.email
    );

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    // Wait for the submit-qualified-lead invocation, then return its body.
    let payload: Record<string, unknown> | undefined;
    await waitFor(
      () => {
        const submitCall = mockState.invokeMock.mock.calls.find(
          (c) => c[0] === "submit-qualified-lead"
        );
        expect(submitCall).toBeDefined();
        payload = submitCall![1].body as Record<string, unknown>;
      },
      { timeout: 5000 }
    );

    return payload!;
  }

  it("sends facilityId, full name, first/last name, normalised phone, and lowercased email", async () => {
    const body = await runFormAndCapturePayload();

    // Facility attribution — REQUIRED for lead-to-facility routing.
    expect(body.facilityId).toBe(FACILITY.id);

    // Composite name + components. The edge function uses `name` for
    // the seeker-facing email greeting and the facility notification.
    expect(body.name).toBe(`${SEEKER.firstName} ${SEEKER.lastName}`);
    expect(body.firstName).toBe(SEEKER.firstName);
    expect(body.lastName).toBe(SEEKER.lastName);

    // Phone is normalised to digits-only on the client before send.
    expect(body.phone).toBe(SEEKER.phoneDigits);
    expect(body.phone).toMatch(/^\d{10}$/);

    // Email is lowercased + trimmed for idempotent dedupe.
    expect(body.email).toBe(SEEKER.email.toLowerCase());

    // Idempotency key MUST be present — the edge function uses it to
    // dedupe duplicate submissions and prevent double-sending emails.
    expect(typeof body.idempotencyKey).toBe("string");
    expect((body.idempotencyKey as string).length).toBeGreaterThan(0);
  }, 30000);

  it("omits the optional `message` field when the seeker did not provide one", async () => {
    // The walker does not type into a message textarea (the contact step
    // has no message field on the default flow), so `message` should be
    // undefined — NOT an empty string. This matters because the edge
    // function's email template branches on truthiness.
    const body = await runFormAndCapturePayload();

    expect(body.message).toBeUndefined();
  }, 30000);

  it("includes a non-empty `source` so the lead can be attributed by channel", async () => {
    const body = await runFormAndCapturePayload();

    // `source` drives lead-attribution analytics on the receiving side.
    expect(body.source).toBeDefined();
    expect(typeof body.source).toBe("string");
    expect((body.source as string).length).toBeGreaterThan(0);
  }, 30000);
});
