/**
 * PUBLIC FREE-TEXT SEARCH (`?q=`) — one pure, framework-independent matcher.
 *
 * What this replaces
 * ──────────────────
 * `/search-results` used to build ONE concatenated haystack per facility
 *
 *   `${name} ${description} ${city} ${state} ${treatments} ${insurance} ${zip} ${type}`
 *
 * and then run three increasingly loose substring tests over it, the last of
 * which was `word.includes(token)` — arbitrary mid-word matching. That made
 * the search claim matches it could not justify:
 *
 *   q=mat   → matched "trau(mat)ic", "for(mat)", "auto(mat)ic"
 *   q=iop   → matched "b(iop)sy"
 *   q=na    → matched almost every narrative paragraph in the catalogue
 *   q=x     → matched thousands of facilities under the heading
 *             `Results for "x"`
 *
 * and the single haystack let a token match across a FIELD BOUNDARY (the last
 * word of the description running into the first word of the city), so a
 * "match" could correspond to no field at all.
 *
 * The contract implemented here
 * ─────────────────────────────
 * 1. Membership only. This decides IF a facility is in the result set; it
 *    never scores, ranks or reorders. Result ordering is owned by the
 *    comparator in SearchResults and is untouched.
 * 2. Fields stay separate. Every field is tokenised into WORDS in its own
 *    right; nothing is concatenated, so no match can straddle two fields.
 * 3. Structured fields are high confidence: name, city, state, ZIP, facility
 *    type, treatment/service labels, payment/insurance labels. A token matches
 *    a structured field when it equals a word or is a WORD PREFIX of one.
 * 4. Description is a conservative narrative fallback: word prefixes only, and
 *    only for tokens of >= 4 characters, so the 2-3 character clinical
 *    acronyms (MAT, CBT, DBT, IOP, PHP, AA, NA) can match the structured
 *    service label "Medication-Assisted Treatment (MAT)" but can never match
 *    a coincidental run of letters inside a sentence.
 * 5. Multi-token queries are AND across the union of allowed fields:
 *    "detox chicago" may satisfy `detox` from the service list and `chicago`
 *    from the city. Each token must land somewhere; they need not land in the
 *    same field.
 * 6. A query with no usable token (e.g. "x", "!", "  ") is NOT a filter that
 *    matches everything. `isMeaningfulQuery` reports false and the caller
 *    renders a "type at least 2 characters" state instead of presenting the
 *    whole catalogue as matching.
 *
 * Deliberately NOT here: no fuzzy/Levenshtein distance, no stemming, no
 * synonym expansion, no relevance score, no search vendor. Every one of those
 * would let the page claim a match a user cannot verify by reading the card.
 */

/** Below this length a token cannot carry a search on its own. */
export const MIN_TOKEN_LENGTH = 2;

/**
 * Narrative text needs a longer token before a prefix match means anything.
 * At 3 characters "mat" prefix-matches "material", "maternity", "matter" —
 * none of which is Medication-Assisted Treatment.
 */
export const MIN_DESCRIPTION_TOKEN_LENGTH = 4;

/** Fields the public free-text search is allowed to read. */
export interface FreeTextSearchableFacility {
  name?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  facilityType?: string | null;
  treatmentTypes?: readonly string[] | null;
  insuranceAccepted?: readonly string[] | null;
  /** Narrative copy. Lower-confidence fallback only — see the rules above. */
  description?: string | null;
}

/**
 * Folds the cosmetic variants that would otherwise split one word into two
 * different tokens: smart quotes, the four dash characters a CMS paste can
 * produce, and case. Nothing here collapses one word into a DIFFERENT word.
 */
function normalizeText(value: string): string {
  return value
    .toLowerCase()
    // Unicode apostrophes → ASCII so "st. mary's" and "st. mary’s" tokenise
    // identically.
    .replace(/[\u2018\u2019\u02bc\u2032]/g, "'")
    // en/em/figure/non-breaking hyphens + minus sign → ASCII hyphen.
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .normalize("NFKD")
    // Strip combining marks so "Peña" and "Pena" tokenise the same.
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Splits on every non-alphanumeric boundary. `"Medication-Assisted Treatment
 * (MAT)"` → `["medication", "assisted", "treatment", "mat"]`, so the acronym
 * is a first-class token rather than something only a substring test could
 * find. `"21215-1234"` → `["21215", "1234"]`, which keeps a ZIP+4 findable by
 * its 5-digit base.
 */
export function tokenize(value: string | null | undefined): string[] {
  if (!value) return [];
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * The tokens of a user query that are long enough to constrain a search.
 * Tokens shorter than `MIN_TOKEN_LENGTH` are dropped rather than being
 * allowed to match everything: the trailing "s" of "mary's" must not turn
 * into a filter.
 */
export function queryTokens(raw: string | null | undefined): string[] {
  return tokenize(raw).filter((t) => t.length >= MIN_TOKEN_LENGTH);
}

/**
 * Whether a query can be honoured at all. `false` for empty input and for
 * input whose every token is a single character — the caller must then say so
 * rather than rendering the unfiltered catalogue under a "results for …"
 * heading.
 */
export function isMeaningfulQuery(raw: string | null | undefined): boolean {
  return queryTokens(raw).length > 0;
}

/** Word set for the structured (high-confidence) fields. */
function structuredWords(facility: FreeTextSearchableFacility): Set<string> {
  const words = new Set<string>();
  const push = (value: string | null | undefined) => {
    for (const token of tokenize(value)) words.add(token);
  };

  push(facility.name);
  push(facility.city);
  push(facility.state);
  push(facility.zipCode);
  push(facility.facilityType);
  for (const t of facility.treatmentTypes ?? []) push(t);
  for (const i of facility.insuranceAccepted ?? []) push(i);

  return words;
}

/** Whole-word equality, or a word prefix. Never a mid-word substring. */
function matchesWordSet(words: Set<string>, token: string): boolean {
  if (words.has(token)) return true;
  for (const word of words) {
    if (word.startsWith(token)) return true;
  }
  return false;
}

/**
 * Does this facility satisfy the free-text query?
 *
 * Every meaningful token must match at least one allowed field. A token that
 * matches nothing anywhere fails the facility — this is AND across tokens,
 * OR across fields.
 *
 * Returns `false` (not `true`) for a query with no usable token: an unusable
 * query is a search we cannot answer, not a search that matches everyone.
 */
export function matchesFreeTextQuery(
  facility: FreeTextSearchableFacility,
  rawQuery: string | null | undefined,
): boolean {
  const tokens = queryTokens(rawQuery);
  if (tokens.length === 0) return false;

  const structured = structuredWords(facility);
  // Built lazily — most queries resolve against structured fields and never
  // need to tokenise the narrative paragraph.
  let description: Set<string> | null = null;

  for (const token of tokens) {
    if (matchesWordSet(structured, token)) continue;

    if (token.length >= MIN_DESCRIPTION_TOKEN_LENGTH && facility.description) {
      if (description === null) description = new Set(tokenize(facility.description));
      if (matchesWordSet(description, token)) continue;
    }

    return false;
  }

  return true;
}
