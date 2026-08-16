/**
 * Facility plan tier — an ENTITLEMENT label, not an ordering input.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * This module replaces `facilityPlanSort.ts`, which existed to rank organic
 * directory results by what the provider had paid. It exported:
 *
 *   getPlanRank()                    Featured → Pro → free-claimed → unclaimed
 *   getPlanPriority()                Pro/Featured → free
 *   sortByPlanHierarchy()            (unused)
 *   sortByPlanHierarchyWithSecondary (unused)
 *   getPlanLabel()                   (unused)
 *
 * `getPlanRank` was applied in SearchResults BEFORE the user's chosen sort for
 * every non-proximity option, so "Name A–Z" was not alphabetical — it was
 * paid-tier-first, then alphabetical within tier. `getPlanPriority` did the
 * same on the seeker home and seeker search surfaces.
 *
 * RehabLookup is a treatment directory. A provider may pay for Pro product
 * features and for clearly labeled Featured visibility. A provider may NOT pay
 * for organic position. So there is deliberately no ranking helper here and
 * this module exports no comparator at all — a plan tier is something a
 * facility HAS, never a reason to show it sooner.
 *
 * Paid visibility still exists, and it is honest about itself: it lives in the
 * separately labeled Featured rail (FeaturedRail / HomepageGeoFeaturedRail,
 * served by get-featured-rotation over featured_placements), never interleaved
 * into organic results.
 *
 * Note on claimed/unclaimed: the retired rank also placed claimed listings
 * above unclaimed ones. That is not reinstated. Ownership is not evidence of
 * directory quality, and the tier only existed as a rung on the paid ladder.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Plan tier as displayed on a facility. Legacy values ('featured',
 * 'professional') are retained because older cached payloads and a few card
 * props still carry them.
 */
export type PlanTier = 'pro' | 'free' | 'featured' | 'professional';
