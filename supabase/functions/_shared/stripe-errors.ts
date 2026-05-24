/**
 * Stripe error → user-facing message classifier.
 *
 * Edge functions returning Stripe SDK errors verbatim surface technical
 * jargon ("Customer cus_xxx not found", "Invalid lookup_key") that the
 * provider UI cannot recover from. This helper maps the common error
 * shapes to:
 *   - a human-readable `message` we can show in a toast
 *   - a `code` the client can branch on to add a retry CTA / link
 *   - a `retryable` flag so the client knows whether to offer "Try again"
 *
 * Stripe's error objects expose `type` (the canonical kind, e.g.
 * `StripeRateLimitError`) and `code` (a finer-grained string like
 * `card_declined`). We branch on `type` first because it's stable across
 * SDK versions, and fall back to substring matching on the message for
 * non-SDK errors (our own `throw new Error(...)` paths).
 */

export interface ClassifiedStripeError {
  message: string;
  code: string;
  retryable: boolean;
  httpStatus: number;
}

interface StripeLikeError {
  type?: string;
  code?: string;
  message?: string;
  raw?: { message?: string };
}

function isStripeError(err: unknown): err is StripeLikeError {
  return typeof err === "object" && err !== null && "type" in err;
}

export function classifyStripeError(err: unknown): ClassifiedStripeError {
  const rawMessage = err instanceof Error
    ? err.message
    : isStripeError(err)
      ? (err.message ?? err.raw?.message ?? "Unknown Stripe error")
      : String(err);

  if (isStripeError(err)) {
    switch (err.type) {
      case "StripeRateLimitError":
        return {
          message: "Stripe is rate-limiting us right now. Wait a few seconds and try again.",
          code: "RATE_LIMITED",
          retryable: true,
          httpStatus: 429,
        };
      case "StripeConnectionError":
      case "StripeAPIError":
        return {
          message: "Couldn't reach Stripe. Check your connection and try again.",
          code: "STRIPE_UNREACHABLE",
          retryable: true,
          httpStatus: 503,
        };
      case "StripeAuthenticationError":
        return {
          message: "Stripe authentication failed. Please contact support — this is on our end.",
          code: "STRIPE_AUTH_FAILED",
          retryable: false,
          httpStatus: 500,
        };
      case "StripeCardError":
        // err.code is the granular reason: card_declined, expired_card, etc.
        return {
          message: rawMessage,
          code: `CARD_${(err.code ?? "DECLINED").toUpperCase()}`,
          retryable: false,
          httpStatus: 402,
        };
      case "StripeInvalidRequestError":
        // Often our own bug (bad price lookup_key, missing customer).
        return {
          message: "Something went wrong setting up your billing. Please refresh and try again, or contact support.",
          code: "STRIPE_INVALID_REQUEST",
          retryable: false,
          httpStatus: 400,
        };
      case "StripePermissionError":
        return {
          message: "We're missing a Stripe permission needed for this action. Please contact support.",
          code: "STRIPE_PERMISSION",
          retryable: false,
          httpStatus: 500,
        };
      case "StripeIdempotencyError":
        return {
          message: "Duplicate request detected — refresh the page and try once.",
          code: "STRIPE_IDEMPOTENCY",
          retryable: true,
          httpStatus: 409,
        };
    }
  }

  // Non-Stripe error fallbacks — match substrings on our own thrown
  // messages so the client can still branch / retry sensibly.
  const lower = rawMessage.toLowerCase();
  if (lower.includes("no stripe customer")) {
    return {
      message: "No billing record yet. Pick a Pro plan first.",
      code: "NO_CUSTOMER",
      retryable: false,
      httpStatus: 404,
    };
  }
  if (lower.includes("authentication error") || lower.includes("no authorization header")) {
    return {
      message: "Your session expired. Please sign in again.",
      code: "AUTH_EXPIRED",
      retryable: false,
      httpStatus: 401,
    };
  }
  if (lower.includes("stripe_secret_key")) {
    return {
      message: "Billing is not configured on the server. Please contact support.",
      code: "MISCONFIG",
      retryable: false,
      httpStatus: 500,
    };
  }

  return {
    message: "Something went wrong. Try again in a moment, and contact support if it persists.",
    code: "UNHANDLED_EXCEPTION",
    retryable: true,
    httpStatus: 500,
  };
}
