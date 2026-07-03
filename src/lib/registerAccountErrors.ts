/**
 * Maps register-provider-account structured error codes to friendly,
 * user-safe messages for the provider onboarding AccountStep.
 *
 * The edge function returns { error, code } with a 409/400 status. Because
 * supabase.functions.invoke surfaces non-2xx responses as a FunctionsHttpError
 * whose `.message` is the generic "Edge Function returned a non-2xx status
 * code", the caller must parse error.context.json() to recover the `code` and
 * route it through here. Unknown / 5xx codes deliberately fall back to a
 * generic line so no internal error detail (SERVER_MISCONFIGURED, UNHANDLED,
 * raw exception text, etc.) is ever shown to the user.
 */
export function friendlyRegisterError(code: string | undefined): string {
  switch (code) {
    case "USER_EXISTS":
    case "EMAIL_IS_PROVIDER":
      return "An account with this email already exists. Use the sign-in page instead.";
    case "EMAIL_IS_SEEKER":
      return "This email is registered as a personal (seeker) account. Please use a different email for your provider account.";
    case "EMAIL_IS_ADMIN":
      return "This email is associated with an administrative account. Please use a different email.";
    case "INVALID_EMAIL":
      return "Please enter a valid email address.";
    case "WEAK_PASSWORD":
      return "Please choose a stronger password — at least 8 characters with a letter and a number.";
    case "RATE_LIMITED":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return "We couldn't create your account. Please try again in a moment.";
  }
}
