/**
 * FacilityInquiryForm — field, validation and preferred-contact contract.
 *
 * The form replaced SingleQuestionFlow on the facility-contact surface: a
 * twenty-plus-screen placement intake (age range, gender, veteran status,
 * legal involvement, prior treatment, readiness level…) became a short form
 * asking only what the FACILITY needs in order to reply.
 *
 * The rules worth locking down:
 *   • First/last name and email are required; everything else is optional.
 *   • The SEEKER's phone is optional on every tier. The Pro restriction in
 *     this amendment concerns the FACILITY's published number and has nothing
 *     to do with whether a seeker may leave a callback number.
 *   • Phone/Text are only offered once a usable seeker number exists —
 *     otherwise "call me back" is a promise nobody can keep.
 *   • Server-side email verification is NOT relaxed to shorten the UI.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const hookState = {
  formData: {} as Record<string, unknown>,
  isEmailVerified: false,
  codeSent: false,
  handleSubmit: vi.fn(),
  verificationCode: "",
  sendVerificationCode: vi.fn(),
  verifyCode: vi.fn(),
  checkAndAutoVerifyEmail: vi.fn(),
};

function baseFormData() {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    preferredContact: "call",
    levelOfCare: "",
    insuranceType: "",
    urgency: "",
    message: "",
    website: "",
  };
}

/**
 * The real hook owns form state, so the stub must too. A stub that merely
 * mutates a plain object never re-renders, which would leave every controlled
 * input stuck at its initial value and make typing a no-op — the tests would
 * then "pass" against a form that was never actually filled in.
 */
vi.mock("@/components/lead-intake/useLeadIntakeForm", async () => {
  const { useState } = await import("react");
  return {
    useLeadIntakeForm: () => {
      const [formData, setFormData] = useState<Record<string, unknown>>(hookState.formData);
      return {
        formData,
        updateFormData: (u: Record<string, unknown>) => {
          setFormData((prev) => {
            const next = { ...prev, ...u };
            hookState.formData = next;
            return next;
          });
        },
        isSubmitting: false,
        isSubmitted: false,
        deliveryState: null,
        handleSubmit: hookState.handleSubmit,
        codeSent: hookState.codeSent,
        isSendingCode: false,
        verificationCode: hookState.verificationCode,
        setVerificationCode: vi.fn(),
        isVerifying: false,
        isEmailVerified: hookState.isEmailVerified,
        sendVerificationCode: hookState.sendVerificationCode,
        verifyCode: hookState.verifyCode,
        checkAndAutoVerifyEmail: hookState.checkAndAutoVerifyEmail,
      };
    },
  };
});

import { FacilityInquiryForm } from "./FacilityInquiryForm";

/**
 * The literal string "Email" appears twice by design: once as the email
 * field's label, once as a preferred-contact chip. Select the field by id so
 * the two never collide in a query.
 */
const emailInput = () => document.getElementById("inq-email") as HTMLInputElement;

function renderForm() {
  return render(
    <MemoryRouter>
      <FacilityInquiryForm
        facilityId="5e41c64a-9708-4ca1-b5cd-feb35c96ab50"
        facilityName="Cascadia Recovery Center"
        renderSuccess={() => <div data-testid="success" />}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  hookState.formData = baseFormData();
  hookState.isEmailVerified = false;
  hookState.codeSent = false;
  hookState.verificationCode = "";
  vi.clearAllMocks();
  hookState.checkAndAutoVerifyEmail.mockResolvedValue(false);
  hookState.sendVerificationCode.mockResolvedValue(true);
});

describe("fields", () => {
  it("asks only for what the facility needs to reply", () => {
    renderForm();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(emailInput()).toBeInTheDocument();
    expect(screen.getByLabelText(/your phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/what are you looking for/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/insurance or payment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/timeline/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it("does not ask the retired placement-intake questions", () => {
    renderForm();
    const text = document.body.textContent ?? "";
    for (const q of [
      /veteran status/i,
      /legal involvement/i,
      /readiness/i,
      /co-?occurring/i,
      /previous treatment/i,
      /employment status/i,
      /age range/i,
    ]) {
      expect(text).not.toMatch(q);
    }
  });

  it("marks the seeker's own phone optional", () => {
    renderForm();
    const label = screen.getByText(/your phone/i).closest("label");
    expect(label?.textContent).toMatch(/optional/i);
  });

  it("states that the inquiry goes to this facility only", () => {
    renderForm();
    expect(document.body.textContent).toMatch(
      /Your inquiry goes to Cascadia Recovery Center only/i,
    );
  });
});

describe("validation", () => {
  it("blocks submission and reports missing required fields", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByTestId("facility-inquiry-submit"));

    expect(await screen.findByText(/enter your first name/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your last name/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
    expect(hookState.sendVerificationCode).not.toHaveBeenCalled();
    expect(hookState.handleSubmit).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Rivera");
    await user.type(emailInput(), "not-an-email");
    await user.click(screen.getByTestId("facility-inquiry-submit"));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(hookState.sendVerificationCode).not.toHaveBeenCalled();
  });

  it("rejects a partial phone but accepts a blank one", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Rivera");
    await user.type(emailInput(), "jordan@example.com");
    await user.type(screen.getByLabelText(/your phone/i), "5035");
    await user.click(screen.getByTestId("facility-inquiry-submit"));

    expect(await screen.findByText(/10-digit phone number, or leave this blank/i)).toBeInTheDocument();
    expect(hookState.sendVerificationCode).not.toHaveBeenCalled();
  });

  it("associates each error with its field for assistive tech", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByTestId("facility-inquiry-submit"));
    await screen.findByText(/enter your first name/i);

    const first = screen.getByLabelText(/first name/i);
    expect(first).toHaveAttribute("aria-invalid", "true");
    expect(first).toHaveAttribute("aria-describedby", "firstName-error");
    expect(screen.getByText(/enter your first name/i)).toHaveAttribute("role", "alert");
  });
});

describe("preferred contact follows the SEEKER's phone, not the facility's tier", () => {
  it("offers Email only when no usable seeker phone is present", () => {
    renderForm();
    expect(screen.getByRole("radio", { name: "Email" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Phone call" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Text" })).not.toBeInTheDocument();
    expect(document.body.textContent).toMatch(/Add a phone number above/i);
  });

  it("offers Email / Phone call / Text once a 10-digit number is entered", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/your phone/i), "5035550142");

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Phone call" })).toBeInTheDocument();
    });
    expect(screen.getByRole("radio", { name: "Text" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Add a phone number above/i);
  });

  it("collapses a stale phone/text selection back to Email when the number is cleared", async () => {
    const user = userEvent.setup();
    hookState.formData.phone = "5035550142";
    hookState.formData.preferredContact = "phone";
    renderForm();

    await user.clear(screen.getByLabelText(/your phone/i));

    await waitFor(() => {
      expect(screen.queryByRole("radio", { name: "Phone call" })).not.toBeInTheDocument();
    });
    // Email is the only remaining option and is selected.
    expect(screen.getByRole("radio", { name: "Email" })).toBeChecked();
  });
});

describe("email verification is preserved, not skipped", () => {
  it("sends a verification code instead of submitting when the email is unverified", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/first name/i), "Jordan");
    await user.type(screen.getByLabelText(/last name/i), "Rivera");
    await user.type(emailInput(), "jordan@example.com");
    await user.click(screen.getByTestId("facility-inquiry-submit"));

    await waitFor(() => expect(hookState.sendVerificationCode).toHaveBeenCalled());
    expect(hookState.handleSubmit).not.toHaveBeenCalled();
  });

  it("submits directly when the email is already verified", async () => {
    // A verified email is locked (the input is disabled) so it cannot be
    // edited out from under the verification — seed it rather than typing.
    hookState.isEmailVerified = true;
    hookState.formData = {
      ...baseFormData(),
      firstName: "Jordan",
      lastName: "Rivera",
      email: "jordan@example.com",
    };
    const user = userEvent.setup();
    renderForm();
    expect(emailInput()).toBeDisabled();
    await user.click(screen.getByTestId("facility-inquiry-submit"));

    await waitFor(() => expect(hookState.handleSubmit).toHaveBeenCalled());
    expect(hookState.sendVerificationCode).not.toHaveBeenCalled();
  });

  it("verifies and sends in one step once the code is entered", async () => {
    hookState.codeSent = true;
    hookState.verificationCode = "123456";
    hookState.verifyCode.mockResolvedValue(true);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /verify & send inquiry/i }));

    await waitFor(() => expect(hookState.verifyCode).toHaveBeenCalledWith("123456"));
    await waitFor(() =>
      expect(hookState.handleSubmit).toHaveBeenCalledWith({ skipVerificationCheck: true }),
    );
  });

  it("does not submit when the code is rejected", async () => {
    hookState.codeSent = true;
    hookState.verificationCode = "000000";
    hookState.verifyCode.mockResolvedValue(false);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /verify & send inquiry/i }));

    await waitFor(() => expect(hookState.verifyCode).toHaveBeenCalled());
    expect(hookState.handleSubmit).not.toHaveBeenCalled();
  });
});

describe("anti-spam", () => {
  it("keeps the honeypot present, empty and hidden from users and AT", () => {
    const { container } = renderForm();
    const honeypot = container.querySelector('input[aria-hidden="true"]');
    expect(honeypot).toBeTruthy();
    expect(honeypot).toHaveValue("");
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot?.className).toMatch(/hidden/);
  });
});

describe("copy", () => {
  it("makes no response-time or quality promise", () => {
    renderForm();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/within (?:an? )?(?:hour|24|business day)/i);
    expect(text).not.toMatch(/typically responds|verified patient|best match|our specialists/i);
    expect(text).not.toMatch(/care coordinator|we'?ll connect you/i);
  });
});
