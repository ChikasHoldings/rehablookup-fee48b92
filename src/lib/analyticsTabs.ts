// Pure helpers for the provider Analytics tab routing (no React imports) so the
// deep-link → tab resolution is unit-testable. Used by Analytics.tsx.

export const ANALYTICS_TAB_KEYS = [
  "overview",
  "engagement",
  "leads",
  "performance",
  "market",
  "roi",
  "subscription",
] as const;

export type AnalyticsTabKey = (typeof ANALYTICS_TAB_KEYS)[number];

/**
 * Resolves the initial Analytics tab from a `?tab=` query param. Returns the
 * requested tab when it's a known key, else falls back to "overview". This is
 * what makes cross-feature deep links (e.g. the dashboard's "View detailed
 * analytics" → /provider/analytics?tab=subscription) land on the right tab.
 */
export function resolveInitialAnalyticsTab(param: string | null | undefined): AnalyticsTabKey {
  return ANALYTICS_TAB_KEYS.includes(param as AnalyticsTabKey)
    ? (param as AnalyticsTabKey)
    : "overview";
}
