// Route-guard decision for the standalone /provider/claims page.
//
// This page is intentionally NOT mounted inside ProviderShell — the shell
// bounces providers with incomplete onboarding into the wizard, but the claims
// list must stay reachable mid-claim (a pending, still-unverified claim renders
// a "Resume" link back into onboarding). So the page enforces auth + role with
// the same useUserRole source of truth as the shell, WITHOUT the onboarding
// bounce. A brief null-role window (post-signup, before the profile trigger
// resolves) renders the list — RLS scopes rows to the caller, so it's safe.

export type ProviderRole = "provider" | "seeker" | "admin" | null;

export type ClaimsGuardDecision =
  | { kind: "wait" }
  | { kind: "redirect"; to: string }
  | { kind: "render" };

export function resolveClaimsGuard(
  role: ProviderRole,
  isAuthenticated: boolean,
  isRoleLoading: boolean,
): ClaimsGuardDecision {
  if (isRoleLoading) return { kind: "wait" };
  if (!isAuthenticated) {
    return { kind: "redirect", to: "/provider/onboarding?returnTo=/provider/claims" };
  }
  if (role === "admin") return { kind: "redirect", to: "/admin/claims" };
  if (role === "seeker") return { kind: "redirect", to: "/account" };
  return { kind: "render" }; // provider, or the brief null-role signup window
}
