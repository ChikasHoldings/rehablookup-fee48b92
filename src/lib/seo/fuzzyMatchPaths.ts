/**
 * Fuzzy-match helper for the 404 page's "did you mean?" suggestions.
 *
 * Why hand-rolled instead of fuse.js
 * ──────────────────────────────────
 * fuse.js is ~30 kB minified. The 404 page is a rare destination, and we
 * already lazy-fetch the 2 MB prerender manifest. Adding another runtime
 * dependency for this one feature would be wasted weight.
 *
 * Algorithm
 * ─────────
 * Token-based similarity tuned for URL paths:
 *   1. Tokenize both the query and each candidate by splitting on slashes
 *      and hyphens, lowercased.
 *   2. Score = (overlap tokens) / (max of token-set sizes)  — i.e. Jaccard
 *      with a max-cardinality denominator so short paths don't dominate.
 *   3. Bonus for matching the first path segment (handles legit typos in
 *      a known section like /rehab-cnetres/california).
 *   4. Bonus for substring match of any non-trivial query token inside the
 *      candidate's full path (catches /city-foo when the user typed /foo).
 *
 * Returns the top-N candidates sorted by score, ties broken by candidate
 * length (shorter wins). Filters out candidates with score < 0.15 so we
 * don't show garbage suggestions when the user's path has nothing in
 * common with the manifest.
 */

const STOP_SEGMENTS = new Set(["", "the", "of", "and", "in", "for", "a", "an", "to"]);

function tokenize(path: string): string[] {
  return path
    .toLowerCase()
    .split(/[/\-_]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOP_SEGMENTS.has(t));
}

function score(queryTokens: string[], candidatePath: string): number {
  const candTokens = tokenize(candidatePath);
  if (queryTokens.length === 0 || candTokens.length === 0) return 0;
  const querySet = new Set(queryTokens);
  const candSet = new Set(candTokens);
  let overlap = 0;
  for (const t of querySet) if (candSet.has(t)) overlap += 1;
  const jaccardish = overlap / Math.max(querySet.size, candSet.size);

  // First-segment bonus: if both have the same first non-empty segment.
  const queryFirst = queryTokens[0];
  const candFirst = candTokens[0];
  const firstSegmentBonus = queryFirst === candFirst ? 0.15 : 0;

  // Substring bonus: any query token (>=4 chars) appears verbatim somewhere
  // in the candidate path.
  const lowerCandidate = candidatePath.toLowerCase();
  let substringBonus = 0;
  for (const t of queryTokens) {
    if (t.length >= 4 && lowerCandidate.includes(t)) {
      substringBonus = 0.1;
      break;
    }
  }

  return Math.min(1, jaccardish + firstSegmentBonus + substringBonus);
}

export interface PathSuggestion {
  path: string;
  score: number;
}

const MIN_SCORE = 0.15;

export function fuzzyMatchPaths(
  query: string,
  candidates: readonly string[],
  topN: number = 3,
): PathSuggestion[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];
  const scored: PathSuggestion[] = [];
  for (const p of candidates) {
    const s = score(queryTokens, p);
    if (s >= MIN_SCORE) scored.push({ path: p, score: s });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.path.length - b.path.length;
  });
  return scored.slice(0, topN);
}
