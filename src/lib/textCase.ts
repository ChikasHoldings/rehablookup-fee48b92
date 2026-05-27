// Text-casing helpers for displaying user- and data-sourced strings in the
// correct case. Two flavours:
//   - capitalizeName: gentle — capitalizes the first letter of each word but
//     PRESERVES existing capitals, so "mcdonald" → "Mcdonald" yet a correctly
//     entered "McDonald"/"O'Brien" is left intact. Use for people / facility
//     names that a human typed.
//   - titleCase / slugToLabel: normalizing — lowercases then Title-Cases, with
//     small-word + acronym handling. Use for data-derived values that are
//     stored lowercase or as slugs (cities, states, treatment types, levels of
//     care, insurance names, "drug-rehab" → "Drug Rehab").

const SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of",
  "on", "or", "the", "to", "up", "via", "vs", "with",
]);

// Tokens that should render fully upper-cased.
const ACRONYMS = new Set([
  "usa", "us", "llc", "inc", "dba", "iop", "php", "mat", "va", "ptsd",
  "ocd", "adhd", "aa", "na", "ssri", "lgbtq", "dui", "dwi", "ekra", "hipaa",
  "ppo", "hmo", "epo", "pos",
]);

/**
 * Capitalize the first letter of each word while preserving any existing
 * capitalization. Safe for human-entered names — fixes all-lowercase input
 * ("john smith" → "John Smith") without mangling "McDonald" or "O'Brien".
 */
export function capitalizeName(input: string | null | undefined): string {
  if (!input) return "";
  return String(input)
    .trim()
    .replace(/(^|[\s'’.-])([a-z])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

/**
 * Normalize a free-text phrase to Title Case. Lowercases first, so it also
 * fixes ALL-CAPS input. Honors small words (mid-phrase) and known acronyms.
 * Use for cities / states / facility types / treatment labels.
 */
export function titleCase(input: string | null | undefined): string {
  if (!input) return "";
  const s = String(input).trim();
  if (!s) return "";
  const tokens = s.toLowerCase().split(/(\s+|-)/); // keep separators
  return tokens
    .map((tok, i) => {
      if (tok === "" || /^\s+$/.test(tok) || tok === "-") return tok;
      if (ACRONYMS.has(tok)) return tok.toUpperCase();
      // Small words stay lowercase unless they're the first token.
      if (i > 0 && SMALL_WORDS.has(tok)) return tok;
      return tok.charAt(0).toUpperCase() + tok.slice(1);
    })
    .join("");
}

/** Convert a slug ("dual-diagnosis", "drug_rehab") to a Title-Case label. */
export function slugToLabel(input: string | null | undefined): string {
  if (!input) return "";
  return titleCase(String(input).replace(/[-_]+/g, " "));
}
