import { useState, useMemo, useEffect } from "react";
import { PageFAQ } from "@/components/seo/PageFAQ";
import { resourcesFaqs } from "@/data/pageFaqs";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Clock,
  ArrowRight,
  Search,
  Heart,
  Users,
  Brain,
  Stethoscope,
  Shield,
  Phone,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  InternalLinkingSection, 
  treatmentTypeLinks, 
  nearMeLinks, 
  insuranceLinks 
} from "@/components/seo/InternalLinkingSection";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

// Generate ItemList schema for article listing pages
function generateArticleListSchema(articles: DBArticle[]) {
  const SITE_URL = "https://rehablookup.com";
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Recovery Resources & Guides",
    description: "Expert guides on addiction treatment, recovery support, and mental health resources.",
    numberOfItems: articles.length,
    itemListElement: articles.slice(0, 10).map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Article",
        "@id": `${SITE_URL}/resources/${article.slug}`,
        name: article.title,
        headline: article.title,
        description: article.excerpt,
        url: `${SITE_URL}/resources/${article.slug}`,
        image: article.image_url || `${SITE_URL}/og-image.jpg`,
        datePublished: new Date().toISOString(),
        author: {
          "@type": "Organization",
          name: "RehabLookup",
        },
      },
    })),
  };
}

interface DBArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  category_label: string;
  read_time: string;
  image_url: string | null;
  featured: boolean;
}

const categories = [
  { id: "all", label: "All Articles", icon: BookOpen, color: "bg-primary" },
  { id: "getting-started", label: "Getting Started", icon: Phone, color: "bg-blue-500" },
  { id: "recovery", label: "Recovery", icon: Heart, color: "bg-rose-500" },
  { id: "family", label: "Family Support", icon: Users, color: "bg-amber-500" },
  { id: "treatment", label: "Treatment Options", icon: Stethoscope, color: "bg-emerald-500" },
  { id: "mental-health", label: "Mental Health", icon: Brain, color: "bg-purple-500" },
  { id: "prevention", label: "Prevention", icon: Shield, color: "bg-cyan-500" },
];

// Article Card Component
function ArticleCard({ article }: { article: DBArticle }) {
  const defaultImage = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=400&fit=crop";
  const categoryColor = categories.find(c => c.id === article.category)?.color || "bg-primary";

  return (
    <Link
      to={`/resources/${article.slug}`}
      className="group flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={article.image_url || defaultImage}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white ${categoryColor}`}>
            {article.category_label}
          </span>
        </div>
        {article.featured && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500 text-white">
              <Sparkles className="h-3 w-3" />
              Featured
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col flex-grow p-5">
        <h3 className="font-display text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">
          {article.excerpt}
        </p>
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {article.read_time}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Read more
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// Loading skeleton
function ArticlesSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex justify-between pt-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Topic Link Card for internal linking
function TopicLinkCard({ 
  title, 
  links 
}: { 
  title: string; 
  links: { title: string; href: string }[];
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <h3 className="font-semibold text-foreground text-sm mb-3">{title}</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              to={link.href}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
            >
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="line-clamp-1">{link.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Resources() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const queryClient = useQueryClient();

  // Invalidate cache on mount to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["published-articles"] });
  }, [queryClient]);

  // Fetch all published articles
  const { data: articles, isLoading } = useQuery({
    queryKey: ["published-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, slug, title, excerpt, category, category_label, read_time, image_url, featured")
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false });
      
      if (error) throw error;
      return data as DBArticle[];
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  // Filter articles based on search and category
  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    
    return articles.filter((article) => {
      const matchesSearch = 
        searchQuery === "" ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        selectedCategory === "all" || 
        article.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchQuery, selectedCategory]);

  // Get featured articles for hero
  const featuredArticles = useMemo(() => {
    return articles?.filter(a => a.featured).slice(0, 3) || [];
  }, [articles]);

  // Generate structured data for article list
  const articleListSchema = useMemo(() => {
    if (!articles || articles.length === 0) return null;
    return generateArticleListSchema(articles);
  }, [articles]);

  return (
    <Layout>
      <SEO
        title="Recovery Resources & Guides | RehabLookup"
        description="Expert guides on addiction treatment, recovery support, and mental health. Find comprehensive resources to help you or your loved one on the path to recovery."
        canonical="/resources"
        structuredData={articleListSchema || undefined}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Resources", url: "/resources" },
        ]}
      />

      {/* Visual Breadcrumb Navigation */}
      <div className="bg-muted/30 border-b">
        <div className="container py-3">
          <BreadcrumbNav items={[{ label: "Resources" }]} />
        </div>
      </div>

      {/* Hero Section - Compact navy style matching platform pages */}
      <section className="bg-primary py-10 px-4 md:py-12 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-2xl -translate-y-1/2" />
        </div>
        
        <div className="container relative">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/10">
              <BookOpen className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Recovery Resources</span>
            </div>
            <h1 className="speakable-headline mb-2 font-display text-xl font-bold text-primary-foreground md:text-2xl lg:text-3xl">
              Expert Guides for Recovery
            </h1>
            <p className="speakable-summary text-base text-primary-foreground/80 leading-relaxed max-w-xl mx-auto">
              Comprehensive articles on addiction treatment, family support, and mental health.
            </p>
          </div>
        </div>
      </section>

      {/* Search & Filters Section */}
      <section className="py-6 md:py-8 border-b bg-muted/30">
        <div className="container">
          {/* Search Bar */}
          <div className="max-w-xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base rounded-xl border-border/50 bg-background"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      {featuredArticles.length > 0 && selectedCategory === "all" && searchQuery === "" && (
        <section className="py-12 bg-muted/30">
          <div className="container">
            <div className="flex items-center gap-2 mb-8">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="font-display text-2xl font-bold text-foreground">Featured Guides</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Articles */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground">
              {selectedCategory === "all" ? "All Articles" : categories.find(c => c.id === selectedCategory)?.label}
            </h2>
            {articles && (
              <span className="text-sm text-muted-foreground">
                {filteredArticles.length} article{filteredArticles.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {isLoading ? (
            <ArticlesSkeleton />
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No articles found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : "No articles in this category yet"}
              </p>
              <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Internal Linking for SEO */}
      <InternalLinkingSection
        title="Find More Resources"
        groups={[
          { title: "Treatment Types", links: treatmentTypeLinks },
          { title: "Treatment Near You", links: nearMeLinks },
          { title: "Insurance Coverage", links: insuranceLinks },
        ]}
        variant="grid"
      />

      {/* Popular Topics Grid for SEO Internal Linking */}
      <section className="py-12 bg-muted/20 border-t border-border">
        <div className="container">
          <h2 className="font-display text-xl font-bold text-foreground mb-6">
            Browse by Topic
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TopicLinkCard
              title="Detox & Withdrawal"
              links={[
                { title: "Detox Timeline Guide", href: "/resources/detox-timeline" },
                { title: "Alcohol Withdrawal Guide", href: "/resources/alcohol-withdrawal-guide" },
                { title: "What to Expect in Detox", href: "/resources/what-to-expect-in-detox" },
              ]}
            />
            <TopicLinkCard
              title="Treatment Types"
              links={[
                { title: "Inpatient vs Outpatient", href: "/resources/inpatient-vs-outpatient" },
                { title: "PHP vs IOP Programs", href: "/resources/php-vs-iop" },
                { title: "MAT Treatment Guide", href: "/resources/medication-assisted-treatment-guide" },
              ]}
            />
            <TopicLinkCard
              title="Getting Help"
              links={[
                { title: "How to Help a Loved One", href: "/resources/how-to-help-loved-one" },
                { title: "Intervention Guide", href: "/resources/intervention-guide" },
                { title: "Questions to Ask Rehab", href: "/resources/questions-to-ask-rehab" },
              ]}
            />
            <TopicLinkCard
              title="Paying for Treatment"
              links={[
                { title: "Insurance Coverage Guide", href: "/resources/insurance-coverage-guide" },
                { title: "Paying for Rehab", href: "/resources/paying-for-rehab" },
                { title: "Free Rehab Options", href: "/resources/free-rehab-options" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-8 md:p-12 text-center text-white shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
            
            <div className="relative">
              <div className="mb-4 mx-auto h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center">
                <Heart className="h-7 w-7" />
              </div>
              <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">
                Ready to Take the Next Step?
              </h2>
              <p className="mb-8 text-white/80 max-w-xl mx-auto">
                Our free concierge service can help you find the right treatment center for your unique situation.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/rehab-centers">
                  <Button size="lg" variant="secondary" className="gap-2 bg-white text-primary hover:bg-white/90 shadow-lg">
                    Browse Treatment Centers
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/concierge">
                  <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10">
                    Get Free Help
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PageFAQ faqs={resourcesFaqs} className="border-t border-border bg-muted/30" />
    </Layout>
  );
}
