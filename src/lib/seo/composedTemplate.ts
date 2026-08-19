/**
 * Adapter between the `.mjs` content composers and SEOLandingTemplate.
 *
 * WHY THIS MATTERS BEYOND PLUMBING
 *
 * The prerendered HTML under public/ and the React route are two
 * renderings of the same URL. A crawler gets the first; a visitor who
 * arrives by client-side navigation gets the second. When Phase 3
 * enriched the static pages and left the templates alone, those two
 * renderings started saying different things about the same place — and
 * the version Google indexed was not the version a user saw. Wiring the
 * same composer into both is what makes them one page again.
 *
 * The composers return `{intro, sections: [{heading, body}], faqs}`;
 * SEOLandingTemplate takes `{introContent, sections: [{heading,
 * content}], faqs}`. That is the whole mismatch, plus a merge that keeps
 * a page's hand-written sections rather than replacing them.
 */

export interface ComposedContent {
  metaDescription: string;
  intro: string;
  sections: { heading: string; body: string }[];
  faqs: { question: string; answer: string }[];
}

export interface TemplateSection {
  heading: string;
  content: string;
}

export interface TemplateFaq {
  question: string;
  answer: string;
}

/** `{heading, body}` → `{heading, content}`. */
export function composedSections(content: ComposedContent | null | undefined): TemplateSection[] {
  return (content?.sections ?? []).map((s) => ({ heading: s.heading, content: s.body }));
}

/**
 * Append composed sections to a page's own, dropping any whose heading
 * the page already covers. A composer and a hand-written template can
 * both decide the page needs a "Levels of care" block, and running both
 * reads as padding — which is the thing this whole phase exists to
 * remove.
 */
export function mergeSections(
  own: TemplateSection[],
  content: ComposedContent | null | undefined,
): TemplateSection[] {
  const seen = new Set(own.map((s) => normalizeHeading(s.heading)));
  return [...own, ...composedSections(content).filter((s) => !seen.has(normalizeHeading(s.heading)))];
}

/**
 * Same for FAQs, matched on the question. The page's own answer wins:
 * it is usually the one carrying the page's real facility count, and a
 * duplicated question in FAQPage structured data is a markup error as
 * well as a reading annoyance.
 */
export function mergeFaqs(own: TemplateFaq[], content: ComposedContent | null | undefined): TemplateFaq[] {
  const seen = new Set(own.map((f) => normalizeHeading(f.question)));
  return [...own, ...(content?.faqs ?? []).filter((f) => !seen.has(normalizeHeading(f.question)))];
}

function normalizeHeading(text: string) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
