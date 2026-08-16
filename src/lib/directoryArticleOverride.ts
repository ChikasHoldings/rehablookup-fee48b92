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
 * here (title, author, dates, images, keywords…) always passes through from
 * the database unchanged.
 */
export interface DirectoryArticleOverride {
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
  // Preserved: title, the April 2026 analytics, all usage metrics, the growth
  // narrative, the SEO/content infrastructure pillar, transparent-discovery
  // framing. `meta_description` and `excerpt` were already directory-safe and
  // are therefore not overridden.
  //
  // Rewritten: "connect with advisors" → compare/review/save/contact;
  // "The Concierge Placement Network — free domestic placement support" →
  // structured directory discovery; "expanding our international placement
  // network" → international directory coverage; advisor thanks → users,
  // providers, clinicians, contributors. The closing CTA dropped the 24/7
  // advisor claim and the `/concierge/intake` link for a `/search-results`
  // directory CTA.
  "rehablookup-april-2026-analytics-milestone": {
    content: [
      "April 2026 marked a defining month for RehabLookup. According to our Google Analytics dashboard, the platform served **65,000 total users** with **279,000 tracked events** — and consistently held an average of **1,000+ concurrent active users** throughout the month.",
      "## A Defining Moment for Transparent Rehab Discovery",
      "When we launched RehabLookup, our mission was simple: bring transparency, dignity, and clarity to one of the hardest decisions a family ever has to make — choosing the right addiction treatment provider. The April 2026 numbers tell us that mission is resonating.",
      "## What the Numbers Show",
      {
        type: "list",
        items: [
          "**65,000 total users** in a single month — up 1,520% over the prior period",
          "**65,000 new users** discovering RehabLookup for the first time",
          "**279,000 events tracked** — searches, facility profile views, and comparisons",
          "**65,000 sessions** across the month",
          "**1,002 active users in the last 30 minutes** observed during peak hours",
          "Traffic primarily from the United States, with international interest from France, Spain, and the Netherlands",
        ],
      },
      "## Why This Matters",
      "Behind every number is a person — a parent, a sibling, a friend, or someone fighting their own battle — searching for help. A 1,000-user concurrency baseline means at any given second of the day, a thousand families are using RehabLookup to compare verified treatment centers, review transparent facility profiles, save the options that fit, and contact treatment centers directly.",
      {
        type: "callout",
        content:
          "Every minute on RehabLookup is a minute someone is one step closer to recovery. We do not take that responsibility lightly.",
      },
      "## What Powers the Growth",
      "Three pillars are driving this momentum:",
      {
        type: "list",
        items: [
          "**Verified, transparent listings** — no pay-to-play rankings",
          "**Structured discovery** — directory search, side-by-side comparison, and detailed facility profiles, free to use",
          "**SEO-first content engine** — state, city, treatment, and insurance directories built for discovery",
        ],
      },
      "## Looking Ahead",
      "May and June will focus on deepening provider quality, improving international treatment discovery and directory coverage, and shipping a faster, more personalized search experience. Thank you to every family, treatment provider, clinician, and content contributor who trusted us in April. We are just getting started.",
      "If you or a loved one needs help finding treatment, [search treatment centers](/search-results) by state, level of care, or insurance — comparing verified facilities on RehabLookup is always free.",
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
      "How RehabLookup CEO Chiedu Kabakwu is scaling the platform — verified providers, transparent facility data, and a directory built for families.",
    content: [
      "Behind the 65,000 users we served in April is a team — and a CEO — pushing relentlessly to make RehabLookup the most trusted name in rehab discovery. Founder & CEO **Chiedu Kabakwu** has been working around the clock to scale every part of the platform: from verified provider onboarding to the search, comparison, and facility-profile tools families use every day.",
      "## The Mission Has Not Changed",
      "From day one, Chiedu has been clear: families deserve the same transparency choosing a rehab that they get choosing a doctor or a hospital. No pay-to-play rankings. No misleading affiliate sites. No anonymous lead farms. Just verified providers, honest information, and a direct line to the treatment centers themselves.",
      {
        type: "quote",
        content:
          "We are building the directory families wish existed when they were searching at 2 a.m. for help — verified, transparent, and accountable to patients rather than advertisers. That is the only standard that matters.",
      },
      "## What He Has Been Scaling",
      {
        type: "list",
        items: [
          "**Verified provider network** — every facility on RehabLookup goes through a documented verification process before it can be listed",
          "**Open directory access** — search, filter, and compare every verified facility for free, with no account required and no gatekeeping",
          "**Always-on availability** — so a family searching at 3 a.m. can compare programs and reach a treatment center on their own terms",
          "**SEO and content infrastructure** — state directories, treatment guides, and insurance resources built to be discoverable and genuinely useful",
          "**Engineering reliability** — handling 1,000+ concurrent users with the same speed and security as the largest healthcare platforms",
        ],
      },
      "## The Hardest Problem in Healthcare Discovery",
      "Addiction treatment discovery has been broken for decades. Most 'rehab directories' are lead-generation funnels. Most reviews are gamed. Most rankings are paid. Chiedu's thesis is that the only way to fix it is to rebuild the trust layer from scratch — verified data, transparent fees, independent listings, and a relentless commitment to patient outcomes over provider economics.",
      "## What Comes Next",
      "Over the coming months, the team is focused on three things:",
      {
        type: "list",
        items: [
          "Expanding verified coverage to every U.S. state and major international destination",
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
      "To every family who trusted us, every provider who chose to be verified, and every clinician and contributor who helped build the directory — thank you. The work is far from done, but April 2026 proved the model. Now we scale.",
      "Learn more about our team and mission on our [About page](/about), or [search treatment centers](/search-results) to start comparing verified programs.",
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
