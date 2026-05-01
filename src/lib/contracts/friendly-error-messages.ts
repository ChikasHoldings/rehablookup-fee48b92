// User-facing messages for backend error codes returned by edge functions.
//
// Edge functions return a stable JSON envelope { success: false, code, message, ... }
// with a non-2xx HTTP status. The Supabase JS client surfaces non-2xx responses
// as a `FunctionsHttpError` whose body lives on `error.context` (a Response).
// Use `parseFunctionError` to extract the code, then `getFriendlyErrorMessage`
// to translate it into something we can show in a toast.

import { isErrorCode, type ErrorCode } from "./error-codes";

export interface FriendlyMessage {
  title: string;
  description: string;
}

const FRIENDLY_MESSAGES: Partial<Record<ErrorCode, FriendlyMessage>> = {
  email_rejected: {
    title: "Email address not accepted",
    description:
      "That email address can't be used here. Please use a personal or work address (not a disposable, role-based, or invalid mailbox).",
  },
  invalid_email: {
    title: "Invalid email address",
    description: "Please double-check the email address and try again.",
  },
  email_required: {
    title: "Email required",
    description: "Please enter an email address to continue.",
  },
  phone_rejected: {
    title: "Phone number not accepted",
    description: "Please enter a valid US phone number (e.g. +1 555 123 4567).",
  },
  phone_required: {
    title: "Phone number required",
    description: "Please enter a phone number to continue.",
  },
  rate_limited: {
    title: "Too many attempts",
    description: "Please wait a moment before trying again.",
  },
  validation_error: {
    title: "Please check your details",
    description: "Some fields look incorrect. Please review and try again.",
  },
  validation_failed: {
    title: "Please check your details",
    description: "Some fields look incorrect. Please review and try again.",
  },
  email_send_failed: {
    title: "Couldn't send email",
    description:
      "We had trouble sending that email. Please try again in a moment.",
  },
  welcome_email_send_failed: {
    title: "Couldn't send welcome email",
    description: "We'll retry shortly. You can keep using your account.",
  },
  welcome_offer_email_send_failed: {
    title: "Couldn't send welcome email",
    description: "We'll retry shortly. You can keep using your account.",
  },
};

const DEFAULT_MESSAGE: FriendlyMessage = {
  title: "Something went wrong",
  description: "Please try again. If the problem continues, contact support.",
};

export function getFriendlyErrorMessage(
  code: string | undefined | null,
): FriendlyMessage {
  if (code && isErrorCode(code) && FRIENDLY_MESSAGES[code]) {
    return FRIENDLY_MESSAGES[code]!;
  }
  return DEFAULT_MESSAGE;
}

/**
 * Best-effort extraction of the error code from a value returned by
 * `supabase.functions.invoke`. Handles three shapes:
 *   1. The `error` field returned alongside `data` (FunctionsHttpError) —
 *      the JSON envelope is on `error.context` (a Response).
 *   2. A thrown error from a try/catch.
 *   3. A non-2xx envelope returned as `data` (some functions resolve instead
 *      of rejecting).
 */
export async function parseFunctionError(
  errorOrData: unknown,
): Promise<{ code?: string; message?: string }> {
  if (!errorOrData || typeof errorOrData !== "object") return {};

  const obj = errorOrData as Record<string, unknown>;

  // Direct envelope shape (e.g. data returned with success:false).
  if (typeof obj.code === "string") {
    return {
      code: obj.code,
      message: typeof obj.message === "string" ? obj.message : undefined,
    };
  }

  // Supabase FunctionsHttpError exposes the original Response on `context`.
  const ctx = obj.context;
  if (ctx && typeof ctx === "object" && "json" in ctx) {
    try {
      const body = await (ctx as Response).clone().json();
      if (body && typeof body === "object" && typeof body.code === "string") {
        return {
          code: body.code,
          message:
            typeof body.message === "string" ? body.message : undefined,
        };
      }
    } catch {
      // body wasn't JSON — fall through
    }
  }

  return {};
}

/**
 * Convenience: parse a function error and return a friendly message in one step.
 */
export async function getFriendlyMessageForError(
  errorOrData: unknown,
): Promise<FriendlyMessage> {
  const { code } = await parseFunctionError(errorOrData);
  return getFriendlyErrorMessage(code);
}
