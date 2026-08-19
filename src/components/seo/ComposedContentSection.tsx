/**
 * Renders a composed content object inside a React SEO route.
 *
 * The prerendered HTML under public/ and the React route are two
 * renderings of one URL. The static generators pipe the composers
 * through `renderComposedHtml`; the routes that use SEOLandingTemplate
 * pipe them through its `sections` prop. The near-me routes use neither
 * — they are hand-laid-out pages — so they need this to show the same
 * content a crawler is given.
 *
 * FAQs are deliberately NOT rendered here. Those routes already have a
 * TreatmentFAQSection that emits FAQPage structured data, and a second
 * FAQ block on one page would duplicate both the questions and the
 * markup. Merge composed FAQs into that component's list instead.
 */

interface ComposedContent {
  intro?: string;
  sections?: { heading: string; body: string }[];
}

interface Props {
  content: ComposedContent | null | undefined;
  /** Headings this page already covers, so the composed version of the
   *  same topic is skipped rather than printed twice. */
  skipHeadings?: string[];
  className?: string;
}

const normalize = (text: string) =>
  String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function ComposedContentSection({ content, skipHeadings = [], className }: Props) {
  const skip = new Set(skipHeadings.map(normalize));
  const sections = (content?.sections ?? []).filter((s) => s?.heading && s?.body && !skip.has(normalize(s.heading)));
  if (!content?.intro && sections.length === 0) return null;

  return (
    <section className={className ?? "py-12 bg-background border-t"}>
      <div className="container max-w-3xl">
        {content?.intro ? (
          <p className="text-base leading-relaxed text-muted-foreground">{content.intro}</p>
        ) : null}
        {sections.map((s) => (
          <div key={s.heading} className="mt-8">
            <h2 className="text-xl font-bold text-foreground">{s.heading}</h2>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
