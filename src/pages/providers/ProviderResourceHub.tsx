import { useState } from "react";
import { Link } from "react-router-dom";
import { TestimonialsSection } from "@/components/testimonials/TestimonialsSection";
import { providerTestimonials } from "@/data/testimonials";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Clock,
  Search,
  Star,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  resourceCategories,
  getFeaturedArticles,
  type ResourceArticle,
  type ResourceCategory,
} from "@/data/providerResourcesData";

function ArticleCard({ article, category }: { article: ResourceArticle; category: ResourceCategory }) {
  return (
    <Link
      to={`/providers/resources/${article.slug}`}
      className="group block rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border", category.color)}>
          <category.icon className="h-3 w-3" />
          {category.label}
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock className="h-3 w-3" />
          {article.readTime}
        </span>
      </div>
      <h3 className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug mb-2">
        {article.title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
        {article.description}
      </p>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-3 group-hover:gap-2 transition-all">
        Read guide <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

export default function ProviderResourceHub() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const featured = getFeaturedArticles();

  const filteredCategories = activeCategory === "all"
    ? resourceCategories
    : resourceCategories.filter((c) => c.id === activeCategory);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SEO
        title="Provider Resource Hub — Guides for Treatment Center Growth | RehabLookup"
        description="Actionable guides for treatment center owners and admissions directors. Growth strategies, marketing, revenue optimization, and industry insights."
        canonical="/providers/resources"
        keywords={[
          "treatment center resources",
          "rehab business guides",
          "admissions growth strategies",
          "behavioral health marketing",
          "treatment center operations",
        ]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Provider Resource Hub",
          description: "Comprehensive guides for treatment center growth and operations",
          publisher: {
            "@type": "Organization",
            name: "RehabLookup",
          },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "For Providers", url: "/for-providers" },
          { name: "Resource Hub", url: "/providers/resources" },
        ]}
      />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative bg-primary py-14 md:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-foreground/5 via-transparent to-transparent" />
          <div className="container relative z-10 max-w-5xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 border border-primary-foreground/20 rounded-full px-4 py-1.5 mb-5">
              <BookOpen className="h-4 w-4 text-primary-foreground/80" />
              <span className="text-sm font-medium text-primary-foreground/90">Provider Resource Hub</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground leading-tight mb-4">
              Actionable Guides for Treatment Center Growth
            </h1>
            <p className="text-lg text-primary-foreground/75 max-w-2xl mx-auto mb-8">
              Deep, no-fluff resources written for facility owners and admissions directors. Everything you need to fill beds, reduce costs, and grow sustainably.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/provider-signup">
                <Button size="lg" variant="secondary" className="gap-2 text-base font-semibold px-8 h-12 shadow-lg">
                  List Your Facility Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <a href="#categories">
                <Button size="lg" variant="outline" className="gap-2 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 h-12">
                  Browse All Guides
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Featured Articles */}
        <section className="py-10 border-b border-border bg-muted/30">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="flex items-center gap-2 mb-6">
              <Star className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Featured Guides</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.slice(0, 3).map((article) => {
                const cat = resourceCategories.find((c) => c.id === article.category)!;
                return <ArticleCard key={article.slug} article={article} category={cat} />;
              })}
            </div>
          </div>
        </section>

        {/* Category Filter + Articles */}
        <section id="categories" className="py-12 md:py-16 scroll-mt-20">
          <div className="container max-w-5xl mx-auto px-4">
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-10">
              <button
                onClick={() => setActiveCategory("all")}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                )}
              >
                All Categories
              </button>
              {resourceCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                  )}
                >
                  <cat.icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Category Sections */}
            <div className="space-y-14">
              {filteredCategories.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", cat.color)}>
                      <cat.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold text-foreground">{cat.label}</h2>
                      <p className="text-sm text-muted-foreground">{cat.description}</p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                    {cat.articles.map((article) => (
                      <ArticleCard key={article.slug} article={article} category={cat} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* Cross-link to SEO Guides */}
        <section className="py-10 border-t border-border bg-muted/20">
          <div className="container max-w-5xl mx-auto px-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">
              Popular Provider Guides
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { href: "/provider-guides/get-more-rehab-patients", label: "Get More Patients" },
                { href: "/provider-guides/rehab-admissions-growth", label: "Grow Admissions" },
                { href: "/provider-guides/rehab-marketing-strategies", label: "Marketing Strategies" },
                { href: "/provider-guides/addiction-treatment-lead-generation", label: "Lead Generation" },
                { href: "/provider-guides/increase-rehab-admissions", label: "Increase Admissions" },
                { href: "/provider-guides/rehab-center-marketing-ideas", label: "Marketing Ideas" },
                { href: "/provider-guides/treatment-center-patient-acquisition", label: "Patient Acquisition" },
                { href: "/provider-guides/behavioral-health-lead-generation", label: "Behavioral Health Leads" },
              ].map((guide) => (
                <Link
                  key={guide.href}
                  to={guide.href}
                  className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{guide.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Provider Testimonials */}
        <TestimonialsSection
          testimonials={providerTestimonials.slice(0, 3)}
          title="What Treatment Centers Say"
          subtitle="Hear from providers who grew their census with RehabLookup"
          
        />

        <section className="py-16">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="relative rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 p-10 md:p-14 text-center overflow-hidden">
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-accent/5 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-5">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Put Knowledge Into Action</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Ready to Grow Your Treatment Center?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                  List your facility on RehabLookup and start receiving verified patient inquiries. Free to get started.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
                  <Link to="/provider-signup">
                    <Button size="lg" className="gap-2 text-base font-semibold px-10 h-14 shadow-lg hover:shadow-xl transition-all">
                      List Your Facility Free
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/for-providers">
                    <Button size="lg" variant="outline" className="gap-2 text-base h-14">
                      See How It Works
                    </Button>
                  </Link>
                </div>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> No credit card</span>
                  <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> 5-minute setup</span>
                  <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Cancel anytime</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
