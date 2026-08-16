/**
 * Verbatim snapshots of the two legacy RehabLookup "Platform News" rows as
 * they exist in production `public.blog_articles` at the time of the stage-1
 * directory cutover.
 *
 * These are the exact rows `scripts/generate-resources-html.mjs` fetches
 * during `build:vercel`. Captured with a READ-ONLY production query — the DB
 * itself was not modified.
 *
 * Why they are committed
 * ──────────────────────
 * The stage-1 hotfix passed every local check and still failed the real
 * Vercel build. The local sandbox cannot reach production Supabase, so
 * `generate:resources-html` silently skipped and the committed (hand-cleaned)
 * mirrors were never overwritten. Vercel CAN reach Supabase, regenerated both
 * pages from these rows, and reintroduced `href="/concierge/intake"` — which
 * `check:directory-public-shell` then correctly blocked.
 *
 * Committing the rows makes that failure mode reproducible with NO network
 * access: the tests feed these fixtures through the same render path Vercel
 * uses and assert the output is directory-safe.
 *
 * KEEP THESE RAW. They intentionally still contain the retired
 * Concierge/placement copy — that is the input the override must neutralize.
 * They are fixtures only and are never rendered to a public artifact.
 */

import type { DirectoryArticleContent } from "../directoryArticleOverride";

export interface LegacyArticleFixture {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  meta_title: string;
  meta_description: string;
  category: string;
  category_label: string;
  author: string;
  author_date: string;
  published_at: string;
  updated_at: string;
  image_url: string | null;
  read_time: string;
  featured: boolean;
  status: string;
  content: DirectoryArticleContent[];
}

export const LIVE_APRIL_ANALYTICS_ARTICLE: LegacyArticleFixture = {
  id: "df1cb689-3926-4888-a77a-f35513661d69",
  slug: "rehablookup-april-2026-analytics-milestone",
  title: "RehabLookup Hits 65,000 Monthly Users in April 2026",
  excerpt:
    "Our April 2026 analytics show explosive growth — 65K total users, 279K events, and an average of 1,000+ concurrent users on the platform at any given moment.",
  meta_title: "RehabLookup April 2026: 65K Monthly Users Milestone",
  meta_description:
    "RehabLookup reached 65,000 monthly users and 1,000+ concurrent users in April 2026 — a 1,520% growth signal that families trust transparent rehab discovery.",
  category: "news",
  category_label: "Platform News",
  author: "RehabLookup Team",
  author_date: "2026-05-01",
  published_at: "2026-05-01 10:00:00+00",
  updated_at: "2026-05-23 20:55:16.178138+00",
  image_url: "/news/rehablookup-april-2026-analytics.png",
  read_time: "4 min read",
  featured: true,
  status: "published",
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
        "**279,000 events tracked** — searches, profile views, and connections",
        "**65,000 sessions** across the month",
        "**1,002 active users in the last 30 minutes** observed during peak hours",
        "Traffic primarily from the United States, with international interest from France, Spain, and the Netherlands",
      ],
    },
    "## Why This Matters",
    "Behind every number is a person — a parent, a sibling, a friend, or someone fighting their own battle — searching for help. A 1,000-user concurrency baseline means at any given second of the day, a thousand families are using RehabLookup to compare verified treatment centers, read transparent profiles, and connect with advisors.",
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
        "**The Concierge Placement Network** — free domestic placement support for clients",
        "**SEO-first content engine** — state, city, treatment, and insurance directories built for discovery",
      ],
    },
    "## Looking Ahead",
    "May and June will focus on deepening provider quality, expanding our international placement network, and shipping a faster, more personalized search experience. Thank you to every family, advisor, and treatment partner who trusted us in April. We are just getting started.",
    "If you or a loved one needs help finding treatment, our advisors are available 24/7 — **call (800) 935-1310** or [start a free placement request](/concierge/intake).",
  ],
};

export const LIVE_CEO_SCALING_ARTICLE: LegacyArticleFixture = {
  id: "ab2cb34a-2e7b-4178-809e-e781cb9b50db",
  slug: "ceo-chiedu-kabakwu-scaling-rehablookup",
  title: "A Note from Our CEO: Scaling RehabLookup for Every Family",
  excerpt:
    "Founder & CEO Chiedu Kabakwu shares the work behind the curtain — building the team, infrastructure, and partnerships needed to scale RehabLookup into the most trusted rehab discovery platform in America.",
  meta_title: "CEO Chiedu Kabakwu on Scaling RehabLookup",
  meta_description:
    "A behind-the-scenes look at how RehabLookup CEO Chiedu Kabakwu is scaling the platform — verified providers, the placement network, and a 24/7 advisor team.",
  category: "news",
  category_label: "Platform News",
  author: "RehabLookup Team",
  author_date: "2026-05-02",
  published_at: "2026-05-02 09:00:00+00",
  updated_at: "2026-05-23 20:55:16.178138+00",
  image_url: "/news/ceo-chiedu-kabakwu.webp",
  read_time: "5 min read",
  featured: true,
  status: "published",
  content: [
    "Behind the 65,000 users we served in April is a team — and a CEO — pushing relentlessly to make RehabLookup the most trusted name in rehab discovery. Founder & CEO **Chiedu Kabakwu** has been working around the clock to scale every part of the platform: from verified provider onboarding to our 24/7 placement advisors.",
    "## The Mission Has Not Changed",
    "From day one, Chiedu has been clear: families deserve the same transparency choosing a rehab that they get choosing a doctor or a hospital. No pay-to-play rankings. No misleading affiliate sites. No anonymous lead farms. Just verified providers, honest information, and human advisors when you need them.",
    {
      type: "quote",
      content:
        "We are not building a directory. We are building the infrastructure families wish existed when they were searching at 2 a.m. for help. That is the only standard that matters.",
    },
    "## What He Has Been Scaling",
    {
      type: "list",
      items: [
        "**Verified provider network** — every facility on RehabLookup goes through a documented verification process before it can be listed",
        "**The Concierge Placement Network** — a free domestic, refundable international placement service for clients, coordinated by trained advisors",
        "**24/7 advisor coverage** — so a family in crisis at 3 a.m. is met by a human, not a chatbot",
        "**SEO and content infrastructure** — state directories, treatment guides, and insurance resources built to be discoverable and genuinely useful",
        "**Engineering reliability** — handling 1,000+ concurrent users with the same speed and security as the largest healthcare platforms",
      ],
    },
    "## The Hardest Problem in Healthcare Discovery",
    "Addiction treatment discovery has been broken for decades. Most 'rehab directories' are lead-generation funnels. Most reviews are gamed. Most rankings are paid. Chiedu's thesis is that the only way to fix it is to rebuild the trust layer from scratch — verified data, transparent fees, real advisors, and a relentless commitment to patient outcomes over provider economics.",
    "## What Comes Next",
    "Over the coming months, the team is focused on three things:",
    {
      type: "list",
      items: [
        "Expanding verified coverage to every U.S. state and major international destination",
        "Deepening the placement network with measurable outcomes — admissions, completions, and aftercare follow-through",
        "Launching new tools that help families compare programs, costs, and clinical fit with confidence",
      ],
    },
    {
      type: "callout",
      content:
        "If you are a treatment provider committed to transparency, or a clinician who wants to help families find the right fit, we want to hear from you.",
    },
    "## Thank You",
    "To every family who trusted us, every provider who chose to be verified, and every advisor on our team — thank you. The work is far from done, but April 2026 proved the model. Now we scale.",
    "Learn more about our team and mission on our [About page](/about), or [reach out to our advisors](/contact) anytime.",
  ],
};

/**
 * A normal editorial article that MUST pass through the override untouched.
 *
 * Deliberately seeded with the exact vocabulary a naive keyword sanitizer
 * would destroy: an interventionist arranging placement, a state placement
 * program, an EAP advisor, and a facility's own concierge amenity. None of
 * these describe a RehabLookup service, so none may be rewritten.
 */
export const CONTROL_EDITORIAL_ARTICLE: LegacyArticleFixture = {
  id: "fixture-control",
  slug: "how-interventions-work",
  title: "How Family Interventions Work",
  excerpt:
    "What a professional intervention involves, who is in the room, and what happens after someone agrees to treatment.",
  meta_title: "How Family Interventions Work | RehabLookup",
  meta_description:
    "A practical guide to professional interventions — who runs them, what they cost, and how treatment placement is arranged afterward.",
  category: "family-support",
  category_label: "Family Support",
  author: "RehabLookup Editorial Team",
  author_date: "2026-03-11",
  published_at: "2026-03-11T00:00:00.000Z",
  updated_at: "2026-03-11T00:00:00.000Z",
  image_url: null,
  read_time: "7",
  featured: false,
  status: "published",
  content: [
    "A certified interventionist typically handles treatment placement once the family reaches agreement, and will often travel with the person to the facility.",
    "## Paying for an Intervention",
    {
      type: "list",
      items: [
        "Many state placement programs cover detox for uninsured residents",
        "Your employer's EAP advisor can often authorize assessment and referral at no cost",
        "Some luxury facilities advertise 24/7 concierge services as part of the amenity package",
      ],
    },
    "Ask the interventionist directly how placement decisions are made and whether they accept referral fees from any facility.",
  ],
};
