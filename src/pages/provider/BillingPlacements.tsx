import { Navigate } from "react-router-dom";

/**
 * /provider/billing/placements (legacy) → /provider/marketing/featured
 *
 * Featured placement management was consolidated into the Marketing
 * Hub. This module exists only as a permanent redirect so any cached
 * bookmarks, deep-links from past emails, or external references keep
 * working.
 */
export default function BillingPlacementsRedirect() {
  return <Navigate to="/provider/marketing/featured" replace />;
}
