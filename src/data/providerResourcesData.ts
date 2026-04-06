import {
  TrendingUp,
  Megaphone,
  DollarSign,
  Settings,
  Globe,
  type LucideIcon,
} from "lucide-react";

export interface ResourceArticle {
  slug: string;
  title: string;
  description: string;
  readTime: string;
  category: string;
  featured?: boolean;
}

export interface ResourceCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  color: string;
  articles: ResourceArticle[];
}

export const resourceCategories: ResourceCategory[] = [
  {
    id: "growth",
    label: "Growth & Admissions",
    icon: TrendingUp,
    description: "Strategies to fill beds and build a sustainable admissions pipeline",
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    articles: [
      {
        slug: "how-to-increase-treatment-center-admissions",
        title: "How to Increase Treatment Center Admissions: The Definitive Playbook",
        description: "A step-by-step framework used by facilities running at 90%+ census. Covers the full funnel from visibility to conversion.",
        readTime: "12 min",
        category: "growth",
        featured: true,
      },
      {
        slug: "lead-generation-strategies-rehab-centers",
        title: "Lead Generation Strategies That Actually Work for Rehab Centers",
        description: "Why most lead gen fails in behavioral health and the 6 channels that consistently deliver qualified admissions.",
        readTime: "10 min",
        category: "growth",
      },
      {
        slug: "conversion-optimization-admissions-team",
        title: "Conversion Optimization: Turning Inquiries Into Admissions",
        description: "Your admissions team is your highest-leverage revenue operation. Here's how to optimize every step of the intake process.",
        readTime: "9 min",
        category: "growth",
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    description: "SEO, paid ads, and digital strategies for treatment centers",
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    articles: [
      {
        slug: "seo-for-rehab-centers",
        title: "SEO for Rehab Centers: How to Rank Where Families Search",
        description: "The complete guide to organic search visibility for treatment facilities. Local SEO, content strategy, and technical fundamentals.",
        readTime: "14 min",
        category: "marketing",
        featured: true,
      },
      {
        slug: "paid-advertising-strategy-treatment-centers",
        title: "Paid Advertising Strategy for Treatment Centers in 2026",
        description: "Google Ads restrictions, rising CPCs, and what's actually worth spending on. A realistic look at paid acquisition.",
        readTime: "11 min",
        category: "marketing",
      },
      {
        slug: "social-media-strategy-treatment-facilities",
        title: "Social Media Strategy for Treatment Facilities",
        description: "How to build trust and community on social platforms without violating patient privacy or platform policies.",
        readTime: "8 min",
        category: "marketing",
      },
      {
        slug: "email-marketing-treatment-centers",
        title: "Email Marketing for Treatment Centers: Nurture Leads to Admissions",
        description: "Build HIPAA-compliant email sequences that convert cold inquiries into warm admissions over a 14-day nurture cycle.",
        readTime: "10 min",
        category: "marketing",
      },
      {
        slug: "google-business-profile-rehab-optimization",
        title: "Google Business Profile for Rehab Centers: Complete Optimization Guide",
        description: "Your GBP is more valuable than your website for local search. Here's how to optimize every field for maximum visibility.",
        readTime: "9 min",
        category: "marketing",
      },
    ],
  },
  {
    id: "revenue",
    label: "Revenue Optimization",
    icon: DollarSign,
    description: "Maximize revenue, reduce costs, and improve financial performance",
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    articles: [
      {
        slug: "monetize-empty-beds-treatment-center",
        title: "How to Monetize Empty Beds at Your Treatment Center",
        description: "Every unfilled bed is lost revenue. Here are 7 strategies to maximize occupancy without compromising clinical quality.",
        readTime: "10 min",
        category: "revenue",
        featured: true,
      },
      {
        slug: "lead-roi-strategies-behavioral-health",
        title: "Lead ROI Strategies for Behavioral Health Organizations",
        description: "How to measure, track, and improve the return on every dollar spent acquiring patients. Includes benchmarks by channel.",
        readTime: "9 min",
        category: "revenue",
      },
      {
        slug: "cost-per-admission-breakdown",
        title: "Cost Per Admission Breakdown: What You Should Actually Be Paying",
        description: "Industry benchmarks for cost-per-admission by channel, market, and facility type. Know if you're overpaying.",
        readTime: "8 min",
        category: "revenue",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: Settings,
    description: "Optimize intake processes, workflows, and team performance",
    color: "text-violet-600 bg-violet-500/10 border-violet-500/20",
    articles: [
      {
        slug: "intake-process-optimization",
        title: "Intake Process Optimization: The 5-Minute Response Framework",
        description: "The facility that responds first wins 78% of the time. Build an intake system that converts at scale.",
        readTime: "11 min",
        category: "operations",
        featured: true,
      },
      {
        slug: "admissions-workflow-best-practices",
        title: "Admissions Workflow Best Practices for Treatment Centers",
        description: "From first contact to bed assignment: a documented workflow that eliminates dropped leads and miscommunication.",
        readTime: "9 min",
        category: "operations",
      },
      {
        slug: "response-time-impact-on-admissions",
        title: "Response Time Impact on Admissions: The Data You Need to See",
        description: "Original research on how response time correlates with conversion rates across 200+ treatment facilities.",
        readTime: "7 min",
        category: "operations",
      },
      {
        slug: "patient-retention-reduce-ama-rates",
        title: "Patient Retention: How to Reduce AMA Discharge Rates by 50%",
        description: "Every AMA discharge costs $15K-$50K in lost revenue. Evidence-based strategies to keep patients engaged through completion.",
        readTime: "11 min",
        category: "operations",
      },
      {
        slug: "admissions-team-training-convert-calls",
        title: "Admissions Team Training: Convert More Calls Into Admissions",
        description: "Your admissions team converts only 15-20% of calls. Top facilities hit 35-45%. Here's the training framework.",
        readTime: "10 min",
        category: "operations",
      },
    ],
  },
  {
    id: "industry",
    label: "Industry Insights",
    icon: Globe,
    description: "Trends, market analysis, and demand patterns in addiction treatment",
    color: "text-rose-600 bg-rose-500/10 border-rose-500/20",
    articles: [
      {
        slug: "addiction-treatment-industry-trends-2026",
        title: "Addiction Treatment Industry Trends: What's Changing in 2026",
        description: "Regulatory shifts, market consolidation, telehealth expansion, and what they mean for independent treatment centers.",
        readTime: "13 min",
        category: "industry",
        featured: true,
      },
      {
        slug: "treatment-demand-patterns-by-region",
        title: "Treatment Demand Patterns by Region: Where the Growth Is",
        description: "Data-driven analysis of treatment demand across US regions. Identify underserved markets and growth opportunities.",
        readTime: "10 min",
        category: "industry",
      },
      {
        slug: "behavioral-health-market-analysis",
        title: "Behavioral Health Market Analysis: Competitive Landscape 2026",
        description: "Market size, growth projections, and competitive dynamics. Essential reading for facility owners making strategic decisions.",
        readTime: "12 min",
        category: "industry",
      },
    ],
  },
];

export const allArticles = resourceCategories.flatMap((cat) => cat.articles);

export function getCategoryByArticleSlug(slug: string): ResourceCategory | undefined {
  return resourceCategories.find((cat) => cat.articles.some((a) => a.slug === slug));
}

export function getArticleBySlug(slug: string): ResourceArticle | undefined {
  return allArticles.find((a) => a.slug === slug);
}

export function getFeaturedArticles(): ResourceArticle[] {
  return allArticles.filter((a) => a.featured);
}
