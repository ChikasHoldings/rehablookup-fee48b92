import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Clock,
  ArrowRight,
  Search,
  Filter,
  Heart,
  Users,
  Brain,
  Stethoscope,
  Shield,
  Phone,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const categories = [
  { id: "all", label: "All Articles", icon: BookOpen },
  { id: "getting-started", label: "Getting Started", icon: Phone },
  { id: "recovery", label: "Recovery", icon: Heart },
  { id: "family", label: "Family Support", icon: Users },
  { id: "treatment", label: "Treatment Options", icon: Stethoscope },
  { id: "mental-health", label: "Mental Health", icon: Brain },
  { id: "prevention", label: "Prevention", icon: Shield },
];

const articles = [
  {
    id: "types-of-addiction-treatment",
    title: "Understanding the Different Types of Addiction Treatment",
    excerpt: "From detox to outpatient care, learn about the various addiction treatment options available and how to determine which approach might be right for you.",
    category: "getting-started",
    categoryLabel: "Getting Started",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop",
    featured: true,
  },
  {
    id: "choosing-rehab-center",
    title: "How to Choose the Right Rehab Center for Your Needs",
    excerpt: "With thousands of treatment facilities available, finding the right one can feel overwhelming. This guide walks you through the key factors to consider.",
    category: "getting-started",
    categoryLabel: "Getting Started",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop",
    featured: true,
  },
  {
    id: "first-week-treatment",
    title: "What to Expect During Your First Week of Treatment",
    excerpt: "Starting addiction treatment can feel intimidating. Learn what typically happens during the first week so you can feel more prepared and confident.",
    category: "getting-started",
    categoryLabel: "Getting Started",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&h=400&fit=crop",
    featured: true,
  },
  {
    id: "insurance-coverage-guide",
    title: "Insurance Coverage for Addiction Treatment Explained",
    excerpt: "Understanding how insurance covers addiction treatment can be confusing. This guide explains your coverage options, rights, and how to maximize benefits.",
    category: "getting-started",
    categoryLabel: "Getting Started",
    readTime: "9 min read",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "stages-of-recovery",
    title: "Understanding the Stages of Addiction Recovery",
    excerpt: "Recovery is a journey with distinct stages. Learn what to expect and how to navigate each phase successfully from pre-contemplation to maintenance.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "support-loved-one",
    title: "How to Support a Loved One in Treatment",
    excerpt: "Family support is crucial for recovery. Discover effective ways to be there for someone during their treatment journey without enabling.",
    category: "family",
    categoryLabel: "Family Support",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "inpatient-vs-outpatient",
    title: "Choosing Between Inpatient and Outpatient Care",
    excerpt: "Not sure which treatment option is right? We break down the key differences to help you make an informed decision for your situation.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "dual-diagnosis",
    title: "What is Dual Diagnosis Treatment?",
    excerpt: "Many people struggling with addiction also have co-occurring mental health conditions. Learn how dual diagnosis treatment addresses both issues together.",
    category: "mental-health",
    categoryLabel: "Mental Health",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "signs-of-addiction",
    title: "Recognizing the Early Signs of Addiction",
    excerpt: "Early intervention can make a significant difference. Learn to identify the warning signs of substance abuse before it becomes a crisis.",
    category: "prevention",
    categoryLabel: "Prevention",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "aftercare-planning",
    title: "The Importance of Aftercare Planning",
    excerpt: "Treatment doesn't end at discharge. Discover why aftercare planning is essential for long-term recovery success and how to build a solid plan.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "family-therapy",
    title: "How Family Therapy Helps the Recovery Process",
    excerpt: "Addiction affects the whole family. Learn how family therapy sessions can heal relationships and create a stronger support system.",
    category: "family",
    categoryLabel: "Family Support",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "medication-assisted-treatment",
    title: "Understanding Medication-Assisted Treatment (MAT)",
    excerpt: "MAT combines medications with counseling and behavioral therapies. Learn how this evidence-based approach can support recovery.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "anxiety-and-addiction",
    title: "The Connection Between Anxiety and Addiction",
    excerpt: "Anxiety and substance abuse often go hand in hand. Understand the relationship between these conditions and how to treat them together.",
    category: "mental-health",
    categoryLabel: "Mental Health",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1474418397713-7ede21d49118?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "talking-to-teens",
    title: "Talking to Teens About Substance Abuse",
    excerpt: "Open communication is key to prevention. Get practical tips for having honest, effective conversations with adolescents about drugs and alcohol.",
    category: "prevention",
    categoryLabel: "Prevention",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1516534775068-ba3e7458af70?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "holistic-therapies",
    title: "Holistic Therapies in Addiction Treatment",
    excerpt: "From yoga to art therapy, holistic approaches complement traditional treatment. Explore the benefits of mind-body healing practices.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "relapse-prevention",
    title: "Building a Relapse Prevention Plan",
    excerpt: "Relapse is not failure—it's part of many recovery journeys. Learn how to create a strong prevention plan and what to do if relapse occurs.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "opioid-addiction-treatment",
    title: "Opioid Addiction: Treatment Options and Recovery",
    excerpt: "Understanding opioid addiction and the evidence-based treatments available, including medication-assisted treatment and behavioral therapies.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "alcohol-detox-what-to-expect",
    title: "Alcohol Detox: What to Expect and How to Prepare",
    excerpt: "Alcohol withdrawal can be dangerous without proper medical supervision. Learn what happens during detox and why professional help is essential.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "depression-and-substance-abuse",
    title: "The Link Between Depression and Substance Abuse",
    excerpt: "Depression and addiction frequently co-occur. Explore how these conditions interact and why integrated treatment produces the best outcomes.",
    category: "mental-health",
    categoryLabel: "Mental Health",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "sober-living-homes",
    title: "Sober Living Homes: Bridging Treatment and Independence",
    excerpt: "Sober living provides structured support after treatment. Learn how these transitional homes help maintain recovery while rebuilding life skills.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "intervention-guide",
    title: "How to Plan an Intervention for a Loved One",
    excerpt: "A well-planned intervention can be the catalyst for change. Learn the steps to organize an effective, compassionate intervention.",
    category: "family",
    categoryLabel: "Family Support",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "ptsd-and-addiction",
    title: "PTSD and Addiction: Understanding Trauma-Informed Care",
    excerpt: "Trauma and addiction are deeply connected. Discover how trauma-informed treatment approaches address both conditions for lasting recovery.",
    category: "mental-health",
    categoryLabel: "Mental Health",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "workplace-substance-abuse",
    title: "Addressing Substance Abuse in the Workplace",
    excerpt: "Employers and employees alike need to understand workplace substance abuse policies, EAPs, and how to seek help while protecting your career.",
    category: "prevention",
    categoryLabel: "Prevention",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=600&h=400&fit=crop",
    featured: false,
  },
  {
    id: "long-term-recovery-success",
    title: "Keys to Long-Term Recovery Success",
    excerpt: "What separates those who maintain sobriety from those who struggle? Learn the habits, mindsets, and support systems that support lasting recovery.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop",
    featured: false,
  },
];

const Resources = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = useMemo(() => {
    let results = [...articles];

    // Filter by category
    if (activeCategory !== "all") {
      results = results.filter((a) => a.category === activeCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.excerpt.toLowerCase().includes(query) ||
          a.categoryLabel.toLowerCase().includes(query)
      );
    }

    return results;
  }, [activeCategory, searchQuery]);

  const featuredArticles = articles.filter((a) => a.featured);

  return (
    <Layout>
      <SEO
        title="Addiction Recovery Resources & Guides"
        description="Expert articles and guides on addiction recovery, treatment options, family support, mental health, and relapse prevention. Free educational resources for your recovery journey."
        canonical="/resources"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Resources", url: "/resources" },
        ]}
      />
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container text-center px-5 md:px-6">
          <div className="mb-4 md:mb-4 inline-flex items-center gap-2.5 md:gap-2 rounded-full bg-white/10 px-5 md:px-4 py-2.5 md:py-1.5">
            <BookOpen className="h-5 w-5 md:h-4 md:w-4 text-accent" />
            <span className="text-base md:text-sm font-medium text-primary-foreground">Resources & Guides</span>
          </div>
          <h1 className="mb-4 md:mb-3 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground">
            Recovery Resources
          </h1>
          <p className="text-lg md:text-base text-primary-foreground/80 max-w-2xl mx-auto">
            Expert articles, guides, and insights to support you and your loved ones on the journey to recovery.
          </p>
        </div>
      </section>

      {/* Featured Articles */}
      <section className="py-12 md:py-16 border-b border-border">
        <div className="container px-5 md:px-6">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-display text-2xl md:text-xl lg:text-2xl font-bold text-foreground">
              Featured Articles
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {featuredArticles.map((article, index) => (
              <Link
                key={article.id}
                to={`/resources/${article.id}`}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-full rounded-2xl md:rounded-xl border border-border bg-card shadow-card overflow-hidden transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 hover:border-accent/30">
                  <div className="relative h-52 md:h-48 overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <span className="absolute bottom-4 md:bottom-3 left-4 md:left-3 inline-flex items-center gap-2 md:gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-4 md:px-3 py-2 md:py-1 text-sm md:text-xs font-medium text-foreground shadow-sm">
                      <BookOpen className="h-4 w-4 md:h-3 md:w-3 text-accent" />
                      {article.categoryLabel}
                    </span>
                  </div>
                  <div className="p-6 md:p-5">
                    <div className="mb-3 flex items-center gap-2 md:gap-1 text-sm md:text-xs text-muted-foreground">
                      <Clock className="h-4 w-4 md:h-3 md:w-3" />
                      {article.readTime}
                    </div>
                    <h3 className="mb-3 md:mb-2 font-display text-xl md:text-lg font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    <p className="mb-5 md:mb-4 text-base md:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center gap-2 md:gap-1.5 text-base md:text-sm font-medium text-primary">
                      Read article
                      <ArrowRight className="h-5 w-5 md:h-4 md:w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* All Articles with Filters */}
      <section className="py-12 md:py-16">
        <div className="container px-5 md:px-6">
          {/* Search and Filters */}
          <div className="mb-10 space-y-6">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 md:left-3 top-1/2 h-5 w-5 md:h-4 md:w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 md:pl-10 h-14 md:h-10 text-lg md:text-base rounded-2xl md:rounded-lg"
              />
            </div>

            {/* Category Filters - Horizontally scrollable on mobile */}
            <div className="overflow-x-auto -mx-5 md:mx-0 px-5 md:px-0 pb-2 md:pb-0 scrollbar-hide">
              <div className="flex gap-3 md:flex-wrap md:gap-2 min-w-max md:min-w-0">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`inline-flex items-center gap-2.5 md:gap-2 rounded-full px-5 md:px-4 py-3 md:py-2 text-base md:text-sm font-medium transition-all whitespace-nowrap min-h-[48px] md:min-h-0 ${
                      activeCategory === category.id
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <category.icon className="h-5 w-5 md:h-4 md:w-4" />
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          {filteredArticles.length > 0 ? (
            <>
              <p className="mb-6 text-base md:text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredArticles.length}</span> articles found
              </p>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredArticles.map((article, index) => (
                  <Link
                    key={article.id}
                    to={`/resources/${article.id}`}
                    className="group animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="h-full rounded-2xl md:rounded-xl border border-border bg-card shadow-card overflow-hidden transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 hover:border-accent/30">
                      <div className="relative h-48 md:h-40 overflow-hidden">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      </div>
                      <div className="p-6 md:p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="inline-flex items-center gap-2 md:gap-1.5 rounded-full bg-accent/10 px-4 md:px-2.5 py-1.5 md:py-0.5 text-sm md:text-xs font-medium text-accent">
                            {article.categoryLabel}
                          </span>
                          <span className="flex items-center gap-1.5 md:gap-1 text-sm md:text-xs text-muted-foreground">
                            <Clock className="h-4 w-4 md:h-3 md:w-3" />
                            {article.readTime}
                          </span>
                        </div>
                        <h3 className="mb-3 md:mb-2 font-display text-lg md:text-base font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="mb-5 md:mb-4 text-base md:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {article.excerpt}
                        </p>
                        <div className="flex items-center gap-2 md:gap-1.5 text-base md:text-sm font-medium text-primary">
                          Read more
                          <ArrowRight className="h-4 w-4 md:h-3.5 md:w-3.5 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 md:h-16 md:w-16 items-center justify-center rounded-full bg-muted">
                <Search className="h-10 w-10 md:h-8 md:w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-3 md:mb-2 font-display text-2xl md:text-xl font-semibold text-foreground">
                No articles found
              </h3>
              <p className="mb-6 text-lg md:text-base text-muted-foreground">
                Try adjusting your search or filter to find what you're looking for.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveCategory("all");
                  setSearchQuery("");
                }}
                className="h-14 md:h-10 px-8 md:px-4 text-lg md:text-base rounded-2xl md:rounded-lg"
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20">
        <div className="container px-5 md:px-6">
          <div className="mx-auto max-w-3xl rounded-2xl md:rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-8 lg:p-12 text-center">
            <h2 className="mb-4 md:mb-3 font-display text-2xl md:text-2xl lg:text-3xl font-bold text-foreground">
              Need Personalized Guidance?
            </h2>
            <p className="mb-8 md:mb-6 text-lg md:text-base text-muted-foreground max-w-xl mx-auto">
              Our specialists are available 24/7 to answer your questions and help you find the right treatment.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 md:gap-3 sm:flex-row">
              <Link to="/request-help?source=resources_cta" className="w-full sm:w-auto">
                <Button size="lg" className="gap-2 w-full sm:w-auto h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                  <Heart className="h-5 w-5 md:h-4 md:w-4" />
                  Request Help
                </Button>
              </Link>
              <Link to="/contact" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                  Request a Callback
                  <ArrowRight className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Resources;