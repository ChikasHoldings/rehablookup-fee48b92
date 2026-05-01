/**
 * Builds a /concierge URL with optional prefill query params consumed by
 * ConciergeIntake.tsx (Phase 3 prefill). Centralized so every CTA on the
 * marketing surface (homepage, featured cards, empty states, SEO pages) can
 * pass intent forward without duplicating param-formatting logic.
 *
 * Schema accepted by the intake page:
 *   ?location=<city,state | zip | "city, state zip">
 *   ?treatment=<keyword>   (matched loosely → levelOfCare)
 *   ?insurance=<carrier>
 *   ?from=<source>         (attribution only — emitted in GA4 + Pixel)
 *
 * All inputs are trimmed; empty values are dropped so the resulting URL stays
 * clean for SEO/canonicalization.
 */
export interface ConciergeHrefOptions {
  /** Free-form location: "Boise, ID", "California", "83702", etc. */
  location?: string | null;
  /** Treatment keyword: "detox", "inpatient", "outpatient", etc. */
  treatment?: string | null;
  /** Insurance carrier name. */
  insurance?: string | null;
  /** Attribution source (e.g. "homepage_hero", "featured_card"). */
  source?: string | null;
  /** Base path; defaults to `/concierge`. */
  base?: string;
}

export function buildConciergeHref(opts: ConciergeHrefOptions = {}): string {
  const base = opts.base || "/concierge";
  const params = new URLSearchParams();

  const add = (key: string, value: string | null | undefined) => {
    if (!value) return;
    const trimmed = String(value).trim();
    if (trimmed) params.set(key, trimmed);
  };

  add("location", opts.location);
  add("treatment", opts.treatment);
  add("insurance", opts.insurance);
  add("from", opts.source);

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
