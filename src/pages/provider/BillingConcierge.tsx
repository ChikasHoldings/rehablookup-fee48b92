import { Navigate } from "react-router-dom";

/**
 * /provider/billing/concierge (legacy) → /provider/marketing/concierge
 *
 * Concierge Partner management was consolidated into the Marketing
 * Hub. This module exists only as a permanent redirect so any cached
 * bookmarks, deep-links from past emails, or external references keep
 * working.
 */
export default function BillingConciergeRedirect() {
  return <Navigate to="/provider/marketing/concierge" replace />;
}
