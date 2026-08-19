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

/** English ordinal: 1 → "1st", 22 → "22nd". Lives here because three
 *  call sites need it and the third one open-coded "${n}th", which is
 *  wrong for every number ending 1, 2 or 3. */
export function ordinal(n) {
  if (!Number.isFinite(n)) return "";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** "a" or "an" for a following word. Sound decides it, not spelling,
 *  and for acronyms sound depends on whether the thing is read
 *  letter-by-letter or as a word — "an IOP" (eye-oh-pee) but "a MAT
 *  clinic" (mat). No rule derives that, so the acronyms this site
 *  actually publishes are listed, and anything unlisted falls back to
 *  "a", which is the safer wrong answer. */
const ACRONYM_ARTICLE = {
  IOP: "an",
  PHP: "a",
  MAT: "a",
  PPO: "a",
  HMO: "an",
  EPO: "an",
  OTP: "an",
  OCD: "an",
  ADHD: "an",
  PTSD: "a",
  BPD: "a",
  LGBTQ: "an",
  EMDR: "an",
  ASAM: "an",
  CARF: "a",
  SUD: "a",
  MOUD: "a",
};

/** Words whose spelling and sound disagree the other way. */
const CONSONANT_SOUND_WORD = /^(u[nrst]i|use|user|eu|one-)/i;

export function indefiniteArticle(word) {
  const first = String(word ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first) return "a";
  if (first.length > 1 && first === first.toUpperCase() && /[A-Z]/.test(first)) {
    return ACRONYM_ARTICLE[first] ?? "a";
  }
  if (CONSONANT_SOUND_WORD.test(first)) return "a";
  return /^[aeiou]/i.test(first) ? "an" : "a";
}

/** Render a county name with the right suffix, or none.
 *
 *  countySeoData carries names in three shapes — "Jefferson",
 *  "St. Louis County" (suffix already there) and "St. Louis City" (an
 *  independent city that is a county equivalent). Blindly appending
 *  " County" shipped "St. Louis City County". Louisiana's parishes and
 *  Alaska's boroughs and census areas are the same problem. */
export function countyLabel(name) {
  const base = String(name ?? "").trim().replace(/\s+County$/i, "");
  if (!base) return "";
  if (/\b(City|Parish|Borough|Census Area|Municipality)$/i.test(base)) return base;
  return `${base} County`;
}
