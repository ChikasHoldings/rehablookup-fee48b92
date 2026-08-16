/**
 * SEO/meta description for /search-results.
 *
 * TRUST CONTRACT (Stage-3 entitlement amendment, B1 verification hotfix)
 * ─────────────────────────────────────────────────────────────────────
 * The description states a COUNT of the current result set. A count may only
 * carry an adjective that the result set itself enforces.
 *
 * The retired string was:
 *
 *   `Browse ${filteredCenters.length} verified addiction treatment centers…`
 *
 * `filteredCenters` is the entire current result set. It is narrowed to
 * `center.verified === true` only when the visitor has enabled the Verified
 * Only quick filter. Unfiltered — which is every indexable variant, and so
 * every variant a crawler is invited to index — it is dominated by unclaimed
 * SAMHSA-sourced listings that are explicitly NOT verified: the importer
 * writes `verified: false`, and the DB gate rejects `verified = true` on an
 * unclaimed `samhsa_import` row. Production holds 5 verified facilities
 * against ~3.8k public listings.
 *
 * So the page was publishing a trust claim over thousands of listings that do
 * not hold it. That is the exact failure class the amendment exists to close:
 * verification is a listing-level status a facility either has or has not, and
 * it must never be asserted in aggregate for presentation reasons.
 *
 * The wording here is unconditionally neutral. A `verifiedOnly` branch would
 * be defensible — the filter really does enforce the predicate — but it buys
 * nothing: filtered variants are noindexed, so no crawler-visible string
 * depends on it, while a conditional trust claim leaves a live code path for a
 * later refactor to reattach to the wrong count. Describing listings as
 * listings is accurate in every branch and needs no invariant to stay true.
 *
 * `scripts/check-directory-trust-ranking.mjs` enforces that this stays the
 * single place the description is built, and that it does not reintroduce an
 * aggregate trust adjective.
 */

export interface SearchResultsDescriptionInput {
  /** Size of the current result set. Carries no verification semantics. */
  count: number;
  /** Location term the visitor searched, if any. */
  location?: string | null;
  /** Free-text query the visitor searched, if any. */
  query?: string | null;
  /** 1-based page number of the current paginated variant. */
  currentPage: number;
  /** Total number of pages for the current result set. */
  totalPages: number;
}

export const buildSearchResultsDescription = ({
  count,
  location,
  query,
  currentPage,
  totalPages,
}: SearchResultsDescriptionInput): string => {
  const scope = location
    ? ` near ${location}`
    : query
      ? ` matching "${query}"`
      : "";
  const page = currentPage > 1 ? ` (page ${currentPage} of ${totalPages})` : "";

  // "listings" — a factual description of what the directory publishes. No
  // verified / vetted / approved / trusted adjective is applied to `count`.
  return (
    `Browse ${count} addiction treatment center listings${scope}${page}. ` +
    `Compare rehab programs, check insurance, and start recovery.`
  );
};
