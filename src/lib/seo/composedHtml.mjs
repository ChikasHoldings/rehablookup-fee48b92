/**
 * Renders a composed content object to the HTML body the static
 * generators emit.
 *
 * Both content composers — `insuranceContent.mjs` (seeker-facing) and
 * `providerMarketContent.mjs` (operator-facing) — return the same shape:
 * `{ intro, sections: [{heading, body}], faqs: [{question, answer}] }`.
 * The renderer lives here so neither has to import the other, and so a
 * third composer can reuse it without picking a parent.
 */

/** @param {{intro?: string, sections?: {heading:string, body:string}[],
 *           faqs?: {question:string, answer:string}[]}} content */
export function renderComposedHtml(content) {
  const parts = [];
  if (content?.intro) parts.push(`<p>${content.intro}</p>`);
  for (const s of content?.sections ?? []) {
    parts.push(`<h2>${s.heading}</h2>`, `<p>${s.body}</p>`);
  }
  if (content?.faqs?.length) {
    parts.push("<h2>Frequently asked questions</h2>");
    for (const f of content.faqs) {
      parts.push(`<h3>${f.question}</h3>`, `<p>${f.answer}</p>`);
    }
  }
  return parts.join("\n      ");
}
