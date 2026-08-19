/**
 * Casing helpers shared by the composers and the static generators.
 *
 * Both problems here showed up in shipped pages: "Who pays for iop in
 * New Jersey" (a label lowercased for mid-sentence use, destroying the
 * acronym) and "Cost Of Rehab In Ohio" (a slug title-cased word by word,
 * capitalising the prepositions). They are the same class of bug and
 * they belong in one place.
 */

/** Lowercase a label for mid-sentence use WITHOUT destroying acronyms:
 *  "Inpatient Rehab" → "inpatient rehab", but "IOP" and "MAT Clinic"
 *  keep the capitals that make them readable. */
export function sentenceLabel(label) {
  return String(label ?? "")
    .split(" ")
    .map((w) => (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w) ? w : w.toLowerCase()))
    .join(" ");
}

/** Words that stay lowercase inside a title unless they lead it. */
const MINOR = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into",
  "nor", "of", "on", "onto", "or", "over", "per", "the", "to", "up", "via", "with",
]);

/** Title-case a slug the way a headline is actually written.
 *  "cost-of-rehab-in-ohio" → "Cost of Rehab in Ohio". */
export function titleCaseSlug(slug) {
  const words = String(slug ?? "").split(/[-_/]+/).filter(Boolean);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && i < words.length - 1 && MINOR.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
