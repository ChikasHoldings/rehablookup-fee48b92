import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

// Topic-based article linking matrix for SEO crawlability
// Maps keywords/topics to related article slugs
export const topicArticleMatrix: Record<string, string[]> = {
  // Substance-specific topics
  "alcohol": [
    "signs-of-alcohol-addiction",
    "alcohol-detox-timeline",
    "alcohol-withdrawal-guide",
    "alcohol-rehab-what-to-expect",
    "alcohol-addiction-and-liver-health",
  ],
  "opioid": [
    "opioid-epidemic-facts",
    "fentanyl-crisis-guide",
    "medication-assisted-treatment-guide",
    "naloxone-saves-lives",
    "prescription-opioid-addiction",
  ],
  "fentanyl": [
    "fentanyl-crisis-guide",
    "fentanyl-addiction-treatment",
    "opioid-epidemic-facts",
    "medication-assisted-treatment-guide",
  ],
  "heroin": [
    "heroin-addiction-treatment",
    "opioid-epidemic-facts",
    "medication-assisted-treatment-guide",
    "fentanyl-crisis-guide",
  ],
  "cocaine": [
    "cocaine-addiction-treatment",
    "stimulant-addiction-recovery",
    "cocaine-detox-process",
  ],
  "meth": [
    "meth-addiction-treatment",
    "stimulant-addiction-recovery",
    "crystal-meth-recovery",
  ],
  "prescription": [
    "prescription-drug-addiction",
    "prescription-opioid-addiction",
    "benzo-addiction-treatment",
    "adderall-addiction-treatment",
  ],
  
  // Treatment type topics
  "detox": [
    "detox-timeline",
    "what-to-expect-in-detox",
    "medical-detox-benefits",
    "alcohol-detox-timeline",
    "opioid-detox-timeline",
  ],
  "inpatient": [
    "inpatient-vs-outpatient",
    "what-to-expect-in-rehab",
    "residential-treatment-guide",
    "choosing-right-program",
    "30-vs-90-day-rehab",
  ],
  "outpatient": [
    "inpatient-vs-outpatient",
    "php-vs-iop",
    "outpatient-treatment-guide",
    "iop-program-guide",
    "php-program-guide",
  ],
  "mat": [
    "medication-assisted-treatment-guide",
    "suboxone-treatment-guide",
    "methadone-maintenance",
    "vivitrol-shot-guide",
    "naltrexone-treatment",
  ],
  "dual-diagnosis": [
    "dual-diagnosis-explained",
    "anxiety-and-addiction",
    "depression-and-addiction",
    "ptsd-and-substance-abuse",
    "mental-health-addiction-connection",
  ],
  
  // Process topics
  "choosing": [
    "choosing-right-program",
    "questions-to-ask-rehab",
    "what-to-look-for-in-rehab",
    "accreditation-matters",
    "best-states-for-rehab",
  ],
  "insurance": [
    "insurance-coverage-guide",
    "verifying-insurance-benefits",
    "insurance-appeal-rehab-denial",
    "paying-for-rehab",
    "medicaid-coverage-rehab",
  ],
  "cost": [
    "paying-for-rehab",
    "insurance-coverage-guide",
    "free-rehab-options",
    "scholarship-programs-rehab",
    "state-funded-treatment",
  ],
  "family": [
    "how-to-help-loved-one",
    "family-support-guide",
    "intervention-guide",
    "supporting-recovery",
    "enabling-vs-helping",
  ],
  "aftercare": [
    "aftercare-planning",
    "sober-living-guide",
    "relapse-prevention",
    "building-support-network",
    "life-after-rehab",
  ],
  "relapse": [
    "relapse-prevention",
    "relapse-warning-signs",
    "what-to-do-after-relapse",
    "building-support-network",
    "triggers-and-cravings",
  ],
  
  // Demographics
  "veterans": [
    "veterans-addiction-resources",
    "va-addiction-treatment",
    "ptsd-and-substance-abuse",
    "military-rehab-programs",
  ],
  "teens": [
    "teen-adolescent-drug-rehab",
    "youth-addiction-warning-signs",
    "talking-to-teens-about-drugs",
    "teen-intervention-guide",
  ],
  "women": [
    "womens-rehab-programs",
    "pregnancy-and-addiction",
    "trauma-informed-care",
    "gender-specific-treatment",
  ],
  "lgbtq": [
    "lgbtq-addiction-treatment",
    "lgbtq-affirming-rehab",
    "trauma-informed-care",
    "inclusive-recovery-spaces",
  ],
  "first-responder": [
    "first-responder-addiction-treatment",
    "ptsd-and-substance-abuse",
    "confidential-treatment-programs",
    "peer-support-programs",
  ],
  "healthcare": [
    "healthcare-worker-addiction-treatment",
    "php-programs-professionals",
    "confidential-treatment-programs",
    "professional-licensing-and-rehab",
  ],
};

// Category to related categories mapping
export const categoryRelationships: Record<string, string[]> = {
  "treatment": ["recovery", "getting-started", "insurance-and-payment"],
  "recovery": ["treatment", "aftercare", "family-support"],
  "getting-started": ["treatment", "insurance-and-payment", "family-support"],
  "insurance-and-payment": ["getting-started", "financial", "treatment"],
  "family-support": ["getting-started", "recovery", "for-families"],
  "location-guides": ["treatment", "getting-started", "state-guides", "city-guides"],
  "state-guides": ["location-guides", "city-guides", "treatment"],
  "city-guides": ["location-guides", "state-guides", "treatment"],
  "mental-health": ["treatment", "dual-diagnosis", "recovery"],
  "dual-diagnosis": ["mental-health", "treatment", "recovery"],
  "education": ["getting-started", "treatment", "recovery"],
  "aftercare": ["recovery", "treatment", "family-support"],
  "financial": ["insurance-and-payment", "getting-started"],
};

// Featured article pillars that should be linked frequently
export const pillarArticles = [
  { slug: "types-of-addiction-treatment", title: "Types of Addiction Treatment", topic: "treatment" },
  { slug: "choosing-right-program", title: "How to Choose the Right Rehab", topic: "choosing" },
  { slug: "insurance-coverage-guide", title: "Insurance Coverage Guide", topic: "insurance" },
  { slug: "what-to-expect-in-rehab", title: "What to Expect in Rehab", topic: "inpatient" },
  { slug: "medication-assisted-treatment-guide", title: "MAT Treatment Guide", topic: "mat" },
  { slug: "dual-diagnosis-explained", title: "Dual Diagnosis Explained", topic: "dual-diagnosis" },
  { slug: "relapse-prevention", title: "Relapse Prevention Guide", topic: "relapse" },
  { slug: "how-to-help-loved-one", title: "Helping a Loved One", topic: "family" },
  { slug: "detox-timeline", title: "Detox Timeline Guide", topic: "detox" },
  { slug: "paying-for-rehab", title: "Paying for Rehab", topic: "cost" },
];

interface ArticleInterlinksProps {
  currentSlug: string;
  currentCategory: string;
  keywords?: string[];
  variant?: "inline" | "sidebar" | "footer";
  maxLinks?: number;
  className?: string;
}

// Find related articles based on keywords and topics
export function getRelatedArticleSlugs(
  currentSlug: string,
  keywords: string[] = [],
  maxResults: number = 8
): string[] {
  const relatedSlugs = new Set<string>();
  
  // Find articles from keyword topics
  keywords.forEach(keyword => {
    const normalizedKeyword = keyword.toLowerCase();
    
    // Check each topic for matches
    Object.entries(topicArticleMatrix).forEach(([topic, articles]) => {
      if (normalizedKeyword.includes(topic) || topic.includes(normalizedKeyword)) {
        articles.forEach(slug => {
          if (slug !== currentSlug) {
            relatedSlugs.add(slug);
          }
        });
      }
    });
  });
  
  // Add pillar articles if we don't have enough
  if (relatedSlugs.size < maxResults) {
    pillarArticles.forEach(pillar => {
      if (pillar.slug !== currentSlug && relatedSlugs.size < maxResults) {
        relatedSlugs.add(pillar.slug);
      }
    });
  }
  
  return Array.from(relatedSlugs).slice(0, maxResults);
}

// Inline contextual links for within article content
export function InlineArticleLinks({
  articles,
  variant = "chips",
  className,
}: {
  articles: { slug: string; title: string }[];
  variant?: "chips" | "list";
  className?: string;
}) {
  if (articles.length === 0) return null;
  
  if (variant === "list") {
    return (
      <div className={cn("my-6 rounded-lg border border-primary/20 bg-primary/5 p-4", className)}>
        <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Related Reading
        </p>
        <ul className="space-y-1">
          {articles.map((article) => (
            <li key={article.slug}>
              <Link
                to={`/resources/${article.slug}`}
                className="text-sm text-primary hover:underline flex items-center gap-1 group"
              >
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                {article.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  
  return (
    <div className={cn("my-6 flex flex-wrap gap-2", className)}>
      {articles.map((article) => (
        <Link
          key={article.slug}
          to={`/resources/${article.slug}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
        >
          <BookOpen className="h-3 w-3" />
          {article.title}
        </Link>
      ))}
    </div>
  );
}

// Topic hub section for article pages
export function TopicHubLinks({
  topic,
  currentSlug,
  className,
}: {
  topic: string;
  currentSlug: string;
  className?: string;
}) {
  const relatedSlugs = topicArticleMatrix[topic.toLowerCase()] || [];
  const filteredSlugs = relatedSlugs.filter(slug => slug !== currentSlug).slice(0, 5);
  
  if (filteredSlugs.length === 0) return null;
  
  return (
    <div className={cn("rounded-xl border border-border/50 bg-card p-5", className)}>
      <h3 className="text-sm font-semibold text-foreground mb-3 capitalize">
        More on {topic.replace("-", " ")}
      </h3>
      <div className="space-y-2">
        {filteredSlugs.map((slug) => (
          <Link
            key={slug}
            to={`/resources/${slug}`}
            className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
          >
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="line-clamp-1">{formatSlugToTitle(slug)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Format slug to readable title
function formatSlugToTitle(slug: string): string {
  return slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Pillar content links for SEO authority
export function PillarContentLinks({
  currentSlug,
  className,
}: {
  currentSlug: string;
  className?: string;
}) {
  const filteredPillars = pillarArticles.filter(p => p.slug !== currentSlug).slice(0, 6);
  
  return (
    <div className={cn("border-t border-border pt-8 mt-8", className)}>
      <h3 className="text-sm font-semibold text-foreground mb-1">Essential Guides</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Comprehensive resources to support your recovery journey.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {filteredPillars.map((pillar) => (
          <Link
            key={pillar.slug}
            to={`/resources/${pillar.slug}`}
            className="flex items-center gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/30 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors group"
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="line-clamp-1">{pillar.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Cross-category links for broader crawlability
export function CrossCategoryLinks({
  currentCategory,
  className,
}: {
  currentCategory: string;
  className?: string;
}) {
  const relatedCategories = categoryRelationships[currentCategory] || ["treatment", "recovery", "getting-started"];
  
  const categoryDisplayNames: Record<string, string> = {
    "treatment": "Treatment Options",
    "recovery": "Recovery Resources",
    "getting-started": "Getting Started",
    "insurance-and-payment": "Insurance & Costs",
    "family-support": "Family Support",
    "location-guides": "Location Guides",
    "state-guides": "State Guides",
    "city-guides": "City Guides",
    "mental-health": "Mental Health",
    "dual-diagnosis": "Dual Diagnosis",
    "education": "Education",
    "aftercare": "Aftercare",
    "financial": "Financial Resources",
    "for-families": "For Families",
  };
  
  return (
    <div className={cn("flex flex-wrap gap-2 mt-4", className)}>
      <span className="text-xs text-muted-foreground">Explore more:</span>
      {relatedCategories.slice(0, 4).map((cat) => (
        <Link
          key={cat}
          to={`/resources?category=${cat}`}
          className="text-xs text-primary hover:underline"
        >
          {categoryDisplayNames[cat] || cat}
        </Link>
      ))}
    </div>
  );
}
