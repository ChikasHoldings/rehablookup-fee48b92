/**
 * Shared lead-valuation constants.
 *
 * Used by dashboard widgets that surface "potential revenue" / "missed
 * opportunity" calculations. Treatment-center admissions span a wide
 * range ($2,000–$10,000+ depending on level of care, insurance, and
 * length-of-stay); $5,000 is a conservative midpoint for the dashboard
 * messaging. Keep this single source of truth so the KPI strip's
 * "missed leads = $X" banner stays in sync with DashboardMissedLeads.
 */

/** Average revenue per admission, in cents ($5,000). */
export const AVG_REVENUE_PER_LEAD_CENTS = 500_000;

/** Same value in dollars, for direct multiplication when working in $. */
export const AVG_REVENUE_PER_LEAD_DOLLARS = AVG_REVENUE_PER_LEAD_CENTS / 100;
