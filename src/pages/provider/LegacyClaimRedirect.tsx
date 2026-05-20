import { Navigate, useParams } from "react-router-dom";

/**
 * 2026-05-20 unification: `/provider/claim/:slug` no longer hosts a
 * separate wizard. Every claim attempt now flows through
 * `/provider/onboarding` with the slug carried as a query param so the
 * unified wizard can pre-seed `provider_onboarding_state.mode='claim'`
 * + `selected_facility_id` once the user finishes Account + Verify.
 *
 * Anonymous visitors arriving from a facility-page "Claim listing"
 * button land here → bounce into the wizard. Signed-in users likewise:
 * the wizard's FindOrListStep does the slug → id lookup and resumes.
 */
export default function LegacyClaimRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const params = new URLSearchParams({ intent: "claim" });
  if (slug) params.set("facility_slug", slug);
  return <Navigate to={`/provider/onboarding?${params.toString()}`} replace />;
}
