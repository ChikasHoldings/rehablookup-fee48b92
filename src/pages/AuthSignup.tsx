/**
 * AuthSignup — legacy redirect to the unified wizard.
 *
 * Round-30 merge: /auth/signup is no longer a standalone form. Provider
 * signup happens inside the unified wizard at /provider/onboarding,
 * which has its own AccountStep using the same register-provider-account
 * edge function. This component just redirects, preserving any
 * `?returnTo=` and `?intent=`/`?facility_id=` query params so deep links
 * (e.g. claim CTAs on facility pages) still arrive at the right step.
 */

import { Navigate, useSearchParams } from "react-router-dom";

function safeReturnTo(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.startsWith("/\\")) return null;
  return raw;
}

export default function AuthSignup() {
  const [searchParams] = useSearchParams();
  // Preserve every query param so callers like
  //   /auth/signup?returnTo=/provider/claim/foo
  //   /auth/signup?intent=claim&facility_id=<id>
  // still land in the right onboarding-state seed.
  const params = new URLSearchParams(searchParams);
  // Force returnTo through the safe-path filter so a crafted ?returnTo=
  // can't be smuggled through this redirect.
  const rt = safeReturnTo(params.get("returnTo"));
  if (rt) params.set("returnTo", rt); else params.delete("returnTo");
  const qs = params.toString();
  const target = `/provider/onboarding${qs ? `?${qs}` : ""}`;
  return <Navigate to={target} replace />;
}
