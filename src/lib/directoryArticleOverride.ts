/**
 * Directory-cutover compatibility layer for legacy RehabLookup Platform News
 * articles.
 *
 * Why this exists
 * ───────────────
 * Stage 1 of the directory cutover retired the seeker-facing Concierge /
 * placement product from the public site. Two RehabLookup-OWNED "Platform
 * News" articles still describe that retired product in the PRESENT TENSE in
 * `public.blog_articles`, including a live CTA to `/concierge/intake`.
 *
 * Those rows are read at build time by `scripts/generate-resources-html.mjs`
 * (static crawler mirrors) and at runtime by `src/pages/ArticleDetail.tsx`
 * (the hydrated React page). The stage-1 hotfix hand-sanitized the committed
 * `public/resources/*.html` mirrors, but the Vercel build regenerates them
 * from live Supabase — so the retired copy came straight back and
 * `check:directory-public-shell` (correctly) failed the deploy.
 *
 * This module is the single source of truth that both renderers apply, so the
 * static mirror and the hydrated SPA can never disagree. The database rows are
 * deliberately NOT mutated in stage 1: the public site must be correct without
 * requiring a production data write, and DB normalization is scheduled for the
 * later backend/data cleanup stage. When those rows are rewritten upstream,
 * this module can be deleted.
 *
 * Scope — deliberately an exact-slug allowlist
 * ────────────────────────────────────────────
 * This is NOT a keyword sanitizer. The words "placement", "advisor" and
 * "concierge" are legitimate in editorial content: interventionists arrange
 * placement, states run placement programs, EAPs assign advisors, and luxury
 * facilities advertise their own concierge amenities. A generic
 * find-and-replace would corrupt all of that. Only these two
 * RehabLookup-authored articles — which describe RehabLookup's OWN retired
 * service — are rewritten. Every other slug passes through untouched.
 *
 * Historical honesty
 * ──────────────────
 * The rewrite does not claim the retired product never existed; it removes
 * PRESENT-TENSE claims that RehabLookup still operates a placement/advisor
 * service, and removes CTAs to retired routes. Verifiable historical facts
 * (April 2026 analytics, growth numbers, the mission, the engineering work)
 * are preserved as written.
 */

/** A content block as stored in `blog_articles.content` (JSONB array). */
export interface DirectoryArticleBlock {
  type?: string;
  content?: string;
  level?: number;
  items?: string[];
  style?: string;
}

/**
 * Legacy rows also store plain Markdown-ish strings in the same array, so a
 * block is either a string or a structured block.
 */
export type DirectoryArticleContent = string | DirectoryArticleBlock;

/**
 * The subset of an article row this layer may replace. Anything not listed
 * here (author, dates, images, keywords…) always passes through from the
 * database unchanged. `title` is overridden only where the stored headline
 * itself states something untrue.
 */
export interface DirectoryArticleOverride {
  title?: string;
  meta_title?: string;
  meta_description?: string;
  excerpt?: string;
  content?: DirectoryArticleContent[];
}

/**
 * Shape both renderers agree on. Intentionally loose — the static generator
 * passes a raw REST row and React passes a typed `DBArticle`; both carry a
 * `slug` and the overridable fields.
 */
export interface DirectoryArticleLike {
  slug?: string | null;
  [key: string]: unknown;
}

/**
 * Exact-slug overrides. Content is replaced WHOLESALE rather than patched:
 * a targeted find-and-replace would silently stop covering the article the
 * moment someone edits the row in the CMS, whereas a full replacement pins
 * the published copy to something known-good until the DB is normalized.
 */
export const DIRECTORY_ARTICLE_OVERRIDES: Record<string, DirectoryArticleOverride> = {
  // ── Platform News: April 2026 analytics milestone ────────────────────────
  //
  // SEO recovery correction (2026-11-23). The original post presented the
  // April 2026 Google Analytics totals (65,000 users, 279,000 events,
  // "1,000+ concurrent users") as families using RehabLookup. In April the GA
  // tag was also installed on ~45,000 prerendered pages served only to
  // search-engine crawlers, while Google Search Console recorded roughly 600
  // impressions and about one click a day — so the totals included automated
  // traffic and cannot stand as a count of people. The article is kept (its
  // URL has been public since May 2026) and rewritten as a correction; the
  // stored headline is overridden because it states the figure as fact.
  "rehablookup-april-2026-analytics-milestone": {
    title: "A Correction to Our April 2026 Traffic Figures",
    meta_title: "A Correction to Our April 2026 Traffic Figures | RehabLookup",
    meta_description:
      "Our April 2026 post reported 65,000 users. Analytics also counted search-engine crawlers, so that figure overstated real visitors. Here is what changed.",
    excerpt:
      "Our April 2026 analytics also counted automated crawler traffic, so the user totals we published overstated real visitors. Here is what we found and what we changed.",
    content: [
      "In May 2026 we published a post reporting that RehabLookup had 65,000 users and more than 1,000 concurrent users in April 2026, based on our Google Analytics dashboard. Those figures should not have been presented as families using the site, and this post replaces it.",
      "## What we found",
      "In April our analytics tag was installed not only on the pages people visit but also on tens of thousands of pages that are served only to search-engine crawlers. Analytics therefore recorded automated visits alongside real ones, and the April totals — users, events, and the concurrent-user figure — include that automated traffic. Google Search Console, which counts only real searches on Google, recorded far fewer visits from search in the same period.",
      "## What we changed",
      {
        type: "list",
        items: [
          "Analytics has been removed from every page that is served only to crawlers",
          "Visitor analytics now runs only on the pages people actually load",
          "We will publish traffic figures only from reports that exclude automated traffic",
        ],
      },
      "## What RehabLookup is",
      "RehabLookup is a free directory of addiction treatment centers. Most listings come from SAMHSA's FindTreatment.gov directory, and each profile says where its information came from and when it may need confirming with the facility. Featured listings are paid placements and are labelled as such.",
      "If you or a loved one needs help finding treatment, [search treatment centers](/search-results) by state, level of care, or insurance — searching and comparing listings on RehabLookup is free.",
    ],
  },

  // ── Platform News: CEO note on scaling RehabLookup ───────────────────────
  //
  // Preserved: the article's actual subject — scaling RehabLookup, verified
  // provider onboarding, directory/data infrastructure, transparency, the
  // content/SEO engine, engineering reliability, and the "discovery is broken"
  // thesis.
  //
  // Rewritten: "our 24/7 placement advisors", "human advisors when you need
  // them", "The Concierge Placement Network — a free domestic, refundable
  // international placement service", "24/7 advisor coverage", "real
  // advisors", "Deepening the placement network", and the thanks addressed to
  // RehabLookup advisors. The pull quote's "We are not building a directory."
  // — flatly contradictory now — becomes the directory-first framing. The
  // closing CTA to "reach out to our advisors" becomes a directory CTA, and
  // the stale meta_description no longer advertises a placement network or an
  // advisor team.
  "ceo-chiedu-kabakwu-scaling-rehablookup": {
    meta_description:
      "How RehabLookup CEO Chiedu Kabakwu is scaling the platform — clearly sourced listings, transparent facility data, and a directory built for families.",
    content: [
      "Behind RehabLookup is a small team — and a CEO — working to make it a trustworthy place to start the search for addiction treatment. Founder & CEO **Chiedu Kabakwu** has been working to scale every part of the platform: from provider onboarding to the search, comparison, and facility-profile tools families use every day.",
      "## The Mission Has Not Changed",
      "From day one, Chiedu has been clear: families deserve the same transparency choosing a rehab that they get choosing a doctor or a hospital. Paid placements clearly labelled. No misleading affiliate sites. No anonymous lead farms. Just clearly sourced listings, honest information, and a direct line to the treatment centers themselves.",
      {
        type: "quote",
        content:
          "We are building the directory families wish existed when they were searching at 2 a.m. for help — transparent about its sources, and accountable to patients rather than advertisers. That is the only standard that matters.",
      },
      "## What He Has Been Scaling",
      {
        type: "list",
        items: [
          "**Transparent sourcing** — most listings come from SAMHSA's FindTreatment.gov directory, and each profile says where its information came from",
          "**Open directory access** — search, filter, and compare every listed facility for free, with no account required and no gatekeeping",
          "**Always-on availability** — so a family searching at 3 a.m. can compare programs and reach a treatment center on their own terms",
          "**SEO and content infrastructure** — state directories, treatment guides, and insurance resources built to be discoverable and genuinely useful",
          "**Engineering reliability** — fast, secure pages that work on any device",
        ],
      },
      "## The Hardest Problem in Healthcare Discovery",
      "Addiction treatment discovery has been broken for decades. Most 'rehab directories' are lead-generation funnels. Most reviews are gamed. Most rankings are paid. Chiedu's thesis is that the only way to fix it is to rebuild the trust layer from scratch — clearly sourced data, disclosed paid placements, independent listings, and a relentless commitment to patient outcomes over provider economics.",
      "## What Comes Next",
      "Over the coming months, the team is focused on three things:",
      {
        type: "list",
        items: [
          "Expanding coverage to every U.S. state and major international destination",
          "Deepening facility data with measurable quality signals — accreditation, licensing, levels of care, and aftercare support",
          "Launching new tools that help families compare programs, costs, and clinical fit with confidence",
        ],
      },
      {
        type: "callout",
        content:
          "If you are a treatment provider committed to transparency, or a clinician who wants to help families find the right fit, we want to hear from you.",
      },
      "## Thank You",
      "To every family who trusted us, every provider who claimed and updated their listing, and every clinician and contributor who helped build the directory — thank you. The work is far from done.",
      "Learn more about our team and mission on our [About page](/about), or [search treatment centers](/search-results) to start comparing programs.",
    ],
  },
};

/** Slugs this layer rewrites. Exported so tests and docs can enumerate them. */
export const DIRECTORY_OVERRIDE_SLUGS: string[] = Object.keys(
  DIRECTORY_ARTICLE_OVERRIDES,
);

/** True when `slug` is one of the legacy Platform News articles. */
export function hasDirectoryArticleOverride(slug?: string | null): boolean {
  if (!slug) return false;
  return Object.prototype.hasOwnProperty.call(
    DIRECTORY_ARTICLE_OVERRIDES,
    slug.toLowerCase(),
  );
}

/**
 * Return a directory-compatible version of `article`.
 *
 * Pure and total: any slug without an override — i.e. every normal editorial
 * article — is returned byte-identical (same object reference), so this is
 * safe to call unconditionally on every row in both render paths.
 *
 * MUST be applied immediately after the row is retrieved from Supabase and
 * BEFORE meta/JSON-LD/word-count/link-extraction/body rendering, so every
 * downstream consumer sees the same directory-safe copy.
 */
export function applyDirectoryArticleOverride<T extends DirectoryArticleLike>(
  article: T | null | undefined,
): T | null | undefined {
  if (!article) return article;
  const slug = typeof article.slug === "string" ? article.slug.toLowerCase() : "";
  const override = slug ? DIRECTORY_ARTICLE_OVERRIDES[slug] : undefined;
  if (!override) return article;
  return { ...article, ...override };
}
