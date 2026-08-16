/**
 * Single source of truth for top-line stats shown on marketing surfaces
 * (About, homepage hero, SEO landings, etc.).
 *
 * Why this exists: the same numbers were drifting across pages —
 * said "1,000+ partner facilities" while About already said "3,800+ verified
 * facilities", and another card claimed a "4.9 client rating" with no
 * AggregateRating schema or review corpus to back it. Centralizing here
 * forces every page to share the same approved copy and makes future
 * updates a one-file change.
 *
 * Anything in this object is content we can substantiate. Do NOT add
 * inflated traffic / placement / rating claims unless they're independently
 * verifiable and (for ratings) carry matching AggregateRating schema.
 */
export const STATS = {
  /** Verified facility count. Source: facilities table (approved + slug not null). */
  facilities: "3,800+",
  /** Coverage area shown alongside facilities count. */
  states: "50 states + Washington, D.C.",
  /** Seeker-side cost. Always free for seekers under the EKRA flat-fee model. */
  freeForSeekers: "100%",
  /** Time from intake submission to first coordinator response. */
  firstResponse: "< 1 hour",
} as const;
