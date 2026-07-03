import { describe, it, expect } from "vitest";
import { friendlyRegisterError } from "@/lib/registerAccountErrors";

// Locks the provider-onboarding duplicate-email UX fix: AccountStep parses the
// register-provider-account 409/400 body's `code` and routes it here instead of
// showing the raw "Edge Function returned a non-2xx status code" message.

describe("friendlyRegisterError", () => {
  it("maps existing-account codes to a sign-in prompt", () => {
    for (const code of ["USER_EXISTS", "EMAIL_IS_PROVIDER"]) {
      expect(friendlyRegisterError(code)).toMatch(/already exists/i);
      expect(friendlyRegisterError(code)).toMatch(/sign-in/i);
    }
  });

  it("distinguishes a seeker-owned email", () => {
    expect(friendlyRegisterError("EMAIL_IS_SEEKER")).toMatch(/personal.*account/i);
  });

  it("distinguishes an admin-owned email", () => {
    expect(friendlyRegisterError("EMAIL_IS_ADMIN")).toMatch(/administrative account/i);
  });

  it("maps validation codes to actionable guidance", () => {
    expect(friendlyRegisterError("INVALID_EMAIL")).toMatch(/valid email/i);
    expect(friendlyRegisterError("WEAK_PASSWORD")).toMatch(/stronger password/i);
    expect(friendlyRegisterError("RATE_LIMITED")).toMatch(/too many attempts/i);
  });

  it("never leaks internal detail: unknown/5xx codes fall back to a generic line", () => {
    for (const code of ["SERVER_MISCONFIGURED", "CREATE_FAILED", "UNHANDLED", "SOMETHING_NEW", undefined]) {
      const msg = friendlyRegisterError(code);
      expect(msg).toBe("We couldn't create your account. Please try again in a moment.");
      // Must not echo the raw code or an internal token.
      expect(msg).not.toMatch(/misconfigured|unhandled|non-2xx|edge function/i);
    }
  });
});
