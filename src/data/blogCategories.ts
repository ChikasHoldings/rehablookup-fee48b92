import {
  BookOpen,
  Heart,
  Users,
  Brain,
  Stethoscope,
  Shield,
  Phone,
  CreditCard,
  MapPin,
  type LucideIcon,
} from "lucide-react";

/**
 * Canonical blog category taxonomy for /resources hub pages.
 *
 * Why this exists: the live `blog_articles.category` column is a freeform
 * string and historically grew to ~13 distinct values with semantic overlap
 * (e.g. "family" / "family-support" / "for-families"). Rather than mutate
 * 198+ live article rows, we collapse to 8 canonical categories at the
 * presentation layer via `acceptsLegacyCategories` — each hub renders the
 * union of its legacy category aliases.
 *
 * Adding new categories: keep slugs short, add to ALL_BLOG_CATEGORIES, and
 * update the sitemap (public/sitemap-extras.xml) so Google can discover
 * the new hub URL.
 */
export interface BlogCategory {
  /** URL slug under /resources/category/<slug> — never change once shipped */
  slug: string;
  /** Display label */
  label: string;
  /** SEO meta title (full <title> tag value) */
  metaTitle: string;
  /** SEO meta description */
  metaDescription: string;
  /** One-line UI tagline (cards, mega-menu) */
  tagline: string;
  /** Long-form intro for the hub page (~120-180 words). Plain text. */
  intro: string;
  /** Lucide icon */
  icon: LucideIcon;
  /** Tailwind color class for icon backgrounds (e.g. "bg-emerald-500") */
  color: string;
  /** Slugs of canonical pillar articles to surface at the top */
  pillarSlugs: string[];
  /** Related category slugs to surface in a "Related hubs" rail */
  relatedCategories: string[];
  /**
   * Legacy `blog_articles.category` values that this hub aggregates.
   * Used to render the article list on the hub page without mutating the
   * source data.
   */
  acceptsLegacyCategories: string[];
}

export const ALL_BLOG_CATEGORIES: BlogCategory[] = [
  {
    slug: "getting-started",
    label: "Getting Started",
    metaTitle: "Getting Started With Recovery — RehabLookup Guides",
    metaDescription: "Where to begin if you or a loved one needs help. First-step guides on recognizing addiction, choosing a level of care, and what happens in the first week of treatment.",
    tagline: "First steps when you (or a loved one) needs help.",
    intro:
      "Knowing you need help is one thing — knowing where to start is another. The guides in this hub walk you through the very first decisions: recognizing the signs of a substance-use disorder, deciding whether detox or outpatient is the right starting point, what to bring on day one, and how to talk to a partner, parent, or employer about taking time for treatment. Use these articles as a roadmap for the first 7–14 days, then move on to our Treatment Options or Recovery hubs as you go deeper.",
    icon: Phone,
    color: "bg-blue-500",
    pillarSlugs: [
      "signs-of-addiction",
      "what-to-expect-in-rehab",
      "choosing-right-program",
    ],
    relatedCategories: ["treatment", "family-support", "insurance-and-payment"],
    acceptsLegacyCategories: ["getting-started"],
  },
  {
    slug: "treatment",
    label: "Treatment Options",
    metaTitle: "Addiction Treatment Options & Levels of Care | RehabLookup",
    metaDescription: "Compare detox, inpatient rehab, partial hospitalization, intensive outpatient, MAT, and dual-diagnosis programs. Plain-English guides on what each level of care covers.",
    tagline: "Detox, inpatient, outpatient, MAT — what each really involves.",
    intro:
      "Addiction treatment isn't one program — it's a continuum: medical detox, residential inpatient, partial hospitalization, intensive outpatient, sober-living, and medication-assisted treatment, layered over individual and group therapy. The right starting level depends on substances of use, medical risk, work and family obligations, and insurance coverage. The articles in this hub explain how each level of care works, who it fits, what it costs, and how to step down (or up) as you progress. Pair these guides with our Insurance & Cost hub when you're ready to verify your benefits.",
    icon: Stethoscope,
    color: "bg-emerald-500",
    pillarSlugs: [
      "what-to-expect-in-rehab",
      "detox-timeline",
      "choosing-right-program",
    ],
    relatedCategories: ["mental-health", "insurance-and-payment", "recovery"],
    acceptsLegacyCategories: ["treatment", "treatment-options"],
  },
  {
    slug: "recovery",
    label: "Recovery & Aftercare",
    metaTitle: "Recovery & Aftercare Guides | RehabLookup",
    metaDescription: "Long-term recovery guides on relapse prevention, sober living, 12-step and non-12-step pathways, and aftercare planning. Built for the months and years after rehab.",
    tagline: "Life after rehab — relapse prevention, sober living, aftercare.",
    intro:
      "Treatment is the start, not the finish. Most people in recovery describe the first 6–12 months after rehab as the hardest — when daily structure thins out, old triggers reappear, and the work of building a sober life kicks in. This hub covers what the recovery research actually shows: how aftercare and step-down care lower relapse risk, what sober-living looks like, how to choose between 12-step and non-12-step pathways, and how to handle the inevitable setbacks. Read alongside our Mental Health hub if co-occurring depression or anxiety is part of your story.",
    icon: Heart,
    color: "bg-rose-500",
    pillarSlugs: [],
    relatedCategories: ["mental-health", "treatment", "family-support"],
    acceptsLegacyCategories: ["recovery", "aftercare"],
  },
  {
    slug: "mental-health",
    label: "Mental Health & Co-occurring",
    metaTitle: "Mental Health & Co-occurring Disorders | RehabLookup",
    metaDescription: "Dual-diagnosis treatment, depression and anxiety in recovery, trauma-informed care, and how mental-health symptoms shape addiction treatment decisions.",
    tagline: "Co-occurring conditions, dual diagnosis, mental-health basics.",
    intro:
      "Roughly half of people with a substance-use disorder also live with a co-occurring mental-health condition — most commonly depression, anxiety, PTSD, ADHD, or bipolar disorder. Treating one without the other rarely works long term. This hub explains what integrated, dual-diagnosis treatment actually looks like, why trauma-informed approaches matter, how medications interact across the two diagnoses, and what to ask a program before admitting. Articles here are written for both individuals and family members trying to understand a loved one's care plan.",
    icon: Brain,
    color: "bg-purple-500",
    pillarSlugs: [],
    relatedCategories: ["treatment", "recovery", "family-support"],
    acceptsLegacyCategories: ["mental-health", "dual-diagnosis"],
  },
  {
    slug: "family-support",
    label: "Family Support",
    metaTitle: "Family Support for Addiction Recovery | RehabLookup",
    metaDescription: "Guides for parents, partners, and adult children of someone struggling with addiction — how to talk about treatment, set boundaries, and stay supportive without enabling.",
    tagline: "How to support a loved one without losing yourself.",
    intro:
      "If you're the one researching rehab on someone else's behalf, you carry a different load: how to start the conversation, when to step in, when to step back, and how to look after your own mental health while doing it. This hub gathers practical guides for parents of teens and young adults, spouses and partners, and adult children of parents in active addiction — including how interventions actually work, how to set boundaries that hold, and what to expect during a loved one's first 30 days of treatment.",
    icon: Users,
    color: "bg-amber-500",
    pillarSlugs: [],
    relatedCategories: ["getting-started", "recovery", "mental-health"],
    acceptsLegacyCategories: ["family", "family-support", "for-families"],
  },
  {
    slug: "insurance-and-payment",
    label: "Insurance & Cost",
    metaTitle: "Rehab Insurance, Costs & Payment Options | RehabLookup",
    metaDescription: "What rehab actually costs, how insurance covers detox and inpatient, what to do without coverage, and how to verify your benefits in plain English.",
    tagline: "Verify coverage, estimate costs, find help when you can't pay.",
    intro:
      "The cost question stops more people from starting treatment than the program decision itself. The reality: federal parity laws require most plans to cover medically necessary addiction treatment, but coverage details — deductibles, in-network rules, prior authorization, length-of-stay limits — vary widely. This hub covers how to read your benefits, how to verify coverage with a single phone call, what to do when a claim is denied, and what self-pay, scholarship, and state-funded options look like if you're uninsured.",
    icon: CreditCard,
    color: "bg-indigo-500",
    pillarSlugs: [
      "insurance-coverage-guide",
      "paying-for-rehab",
    ],
    relatedCategories: ["getting-started", "treatment"],
    acceptsLegacyCategories: ["insurance-and-payment", "financial", "insurance"],
  },
  {
    slug: "prevention",
    label: "Prevention & Education",
    metaTitle: "Addiction Prevention & Education Guides | RehabLookup",
    metaDescription: "Evidence-based prevention guides, substance education, and harm-reduction resources for parents, schools, and people who use drugs.",
    tagline: "Education and harm-reduction — for parents, students, and communities.",
    intro:
      "Prevention isn't just abstinence messaging — it's giving people accurate information about substances, how dependence develops, what warning signs to watch for, and what harm-reduction options exist. The articles here are written for parents talking to teens, college students making informed choices, and community members supporting friends. We cover the major substances, the science of how addiction develops in the brain, and what works (and what doesn't) when it comes to early intervention.",
    icon: Shield,
    color: "bg-cyan-500",
    pillarSlugs: [],
    relatedCategories: ["family-support", "mental-health"],
    acceptsLegacyCategories: ["prevention", "education"],
  },
  {
    slug: "location-guides",
    label: "Location Guides",
    metaTitle: "Rehab Location Guides — Find Treatment by State & City | RehabLookup",
    metaDescription: "State and city guides covering local treatment options, Medicaid expansion, regional cost differences, and what to know about rehab in your area.",
    tagline: "Local context — state and city-level treatment guides.",
    intro:
      "Treatment availability, insurance acceptance, and cost vary dramatically by region. A 30-day inpatient program in Manhattan may cost three times what the same program costs in rural Tennessee, and Medicaid expansion (or the lack of it) changes what's accessible to a low-income patient overnight. This hub gathers our state and city guides — ranking criteria, common levels of care, what local Medicaid covers, and where to look first if you're searching close to home.",
    icon: MapPin,
    color: "bg-slate-500",
    pillarSlugs: [],
    relatedCategories: ["treatment", "insurance-and-payment"],
    acceptsLegacyCategories: ["location-guides", "state-guides", "city-guides"],
  },
];

/** "All articles" sentinel used by the Resources hub UI (not a category hub). */
export const ALL_ARTICLES_PSEUDO_CATEGORY = {
  id: "all" as const,
  label: "All Articles",
  icon: BookOpen,
  color: "bg-primary",
};

const BY_SLUG: Map<string, BlogCategory> = new Map(
  ALL_BLOG_CATEGORIES.map((c) => [c.slug, c])
);

const LEGACY_TO_CANONICAL: Map<string, BlogCategory> = (() => {
  const m = new Map<string, BlogCategory>();
  for (const cat of ALL_BLOG_CATEGORIES) {
    for (const legacy of cat.acceptsLegacyCategories) {
      m.set(legacy, cat);
    }
  }
  return m;
})();

/** Look up a canonical category by its public slug. */
export function getCategoryBySlug(slug: string | undefined | null): BlogCategory | undefined {
  if (!slug) return undefined;
  return BY_SLUG.get(slug);
}

/**
 * Map a raw `blog_articles.category` value to its canonical hub.
 * Returns undefined if the legacy category isn't mapped — caller should fall
 * back to the /resources hub.
 */
export function getCanonicalCategoryFor(legacyCategory: string | undefined | null): BlogCategory | undefined {
  if (!legacyCategory) return undefined;
  return LEGACY_TO_CANONICAL.get(legacyCategory);
}
