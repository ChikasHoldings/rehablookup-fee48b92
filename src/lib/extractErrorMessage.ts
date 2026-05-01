/**
 * Extracts a human-readable error message from any of the response envelope
 * shapes used by our edge functions, so client toasts never render
 * `"[object Object]"`.
 *
 * Supported shapes (any combination):
 *   1. Legacy string envelope:    `{ success: false, error: "..." }`
 *   2. Structured envelope:       `{ error: { code, message }, code, reason, details: { field } }`
 *   3. FunctionsHttpError context: `{ message: "..." }` or a thrown Error
 *
 * Always returns a non-empty string. Pass an optional fallback to override
 * the generic "Something went wrong. Please try again." default.
 */
export function extractErrorMessage(
  source: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (!source) return fallback;

  // Native Error instance
  if (source instanceof Error) {
    return source.message || fallback;
  }

  if (typeof source === "string") {
    return source.trim() || fallback;
  }

  if (typeof source === "object") {
    const obj = source as Record<string, unknown>;

    // Shape 2: { error: { code, message } }
    const errField = obj.error;
    if (errField && typeof errField === "object") {
      const inner = errField as Record<string, unknown>;
      if (typeof inner.message === "string" && inner.message.trim()) {
        return inner.message;
      }
    }

    // Shape 1: { error: "string" }
    if (typeof errField === "string" && errField.trim()) {
      return errField;
    }

    // Top-level reason mirror (server-side stringly-typed copy)
    if (typeof obj.reason === "string" && obj.reason.trim()) {
      return obj.reason;
    }

    // Top-level message (FunctionsHttpError-style)
    if (typeof obj.message === "string" && obj.message.trim()) {
      return obj.message;
    }
  }

  return fallback;
}

/**
 * Pull the optional structured `code` (e.g. `"email_required"`) from the
 * same shapes. Returns `null` if absent. Useful for branching on error type
 * without parsing free-text messages.
 */
export function extractErrorCode(source: unknown): string | null {
  if (!source || typeof source !== "object") return null;
  const obj = source as Record<string, unknown>;

  if (typeof obj.code === "string" && obj.code) return obj.code;

  const errField = obj.error;
  if (errField && typeof errField === "object") {
    const inner = errField as Record<string, unknown>;
    if (typeof inner.code === "string" && inner.code) return inner.code;
  }
  return null;
}
