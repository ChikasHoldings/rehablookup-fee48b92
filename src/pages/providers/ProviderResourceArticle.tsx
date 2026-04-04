import { useParams, Link, Navigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Clock,
  BookOpen,
  Phone,
  Zap,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  resourceCategories,
  getArticleBySlug,
  getCategoryByArticleSlug,
  allArticles,
} from "@/data/providerResourcesData";
import { resourceArticleContent } from "@/data/providerResourceArticles";

export default function ProviderResourceArticle() {
  const { slug } = useParams<{ slug: string }>();

  const article = slug ? getArticleBySlug(slug) : undefined;
  const category = slug ? getCategoryByArticleSlug(slug) : undefined;
  const content = slug ? resourceArticleContent[slug] : undefined;

  if (!article || !category || !content) {
    return <Navigate to="/providers/resources" replace />;
  }

  // Get related articles (same category, excluding current)
  const relatedArticles = category.articles.filter((a) => a.slug !== slug);
  // Get cross-category articles
  const crossCategoryArticles = allArticles
    .filter((a) => a.category !== category.id && a.slug !== slug)
    .slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SEO
        title={`${article.title} | RehabLookup`}
        description={article.description}
        canonical={`/providers/resources/${slug}`}
        keywords={content.keywords}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.description,
          publisher: {
            "@type": "Organization",
            name: "RehabLookup",
            url: "https://rehablookup.com",
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `https://rehablookup.com/providers/resources/${slug}`,
          },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "For Providers", url: "/for-providers" },
          { name: "Resource Hub", url: "/providers/resources" },
          { name: article.title, url: `/providers/resources/${slug}` },
        ]}
      />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative bg-primary py-12 md:py-16 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-foreground/5 via-transparent to-transparent" />
          <div className="container relative z-10 max-w-3xl mx-auto px-4">
            <Link
              to="/providers/resources"
              className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/60 hover:text-primary-foreground/90 transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Resource Hub
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground/80")}>
                <category.icon className="h-3 w-3" />
                {category.label}
              </div>
              <span className="flex items-center gap-1 text-xs text-primary-foreground/50">
                <Clock className="h-3 w-3" />
                {article.readTime} read
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-display font-bold text-primary-foreground leading-tight">
              {article.title}
            </h1>
          </div>
        </section>

        {/* Content */}
        <section className="py-10 md:py-14">
          <div className="container max-w-3xl mx-auto px-4">
            <div className="space-y-10">
              {content.sections.map((section, idx) => (
                <div key={idx}>
                  <article className="prose prose-slate dark:prose-invert max-w-none">
                    <h2 className="text-xl md:text-2xl font-display font-bold text-foreground mb-3">
                      {section.heading}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed text-base md:text-lg mb-4">
                      {section.content}
                    </p>
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="space-y-2.5 mt-4">
                        {section.bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <span className="text-foreground/90 text-[15px]">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>

                  {/* Mid-article CTA after 2nd section */}
                  {idx === 1 && (
                    <div className="my-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                          <h3 className="text-base font-display font-bold text-foreground mb-1">
                            Put this into practice today
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            List your facility on RehabLookup for free and start implementing these strategies with real patient inquiries.
                          </p>
                        </div>
                        <Link to="/provider-signup" className="shrink-0">
                          <Button className="gap-2 h-10 px-5 font-semibold shadow-md whitespace-nowrap">
                            Get Listed Free
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Key Takeaways */}
              {content.keyTakeaways && (
                <div className="rounded-xl border border-border bg-muted/30 p-6">
                  <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Key Takeaways
                  </h3>
                  <ul className="space-y-2.5">
                    {content.keyTakeaways.map((takeaway, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground/90">{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-14 bg-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-primary-foreground/5 via-transparent to-transparent" />
          <div className="container relative z-10 max-w-3xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 border border-primary-foreground/20 rounded-full px-4 py-1.5 mb-5">
              <Zap className="h-4 w-4 text-primary-foreground/80" />
              <span className="text-sm font-medium text-primary-foreground/80">Take Action Now</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground mb-3">
              Ready to Grow Your Admissions?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
              Join 500+ treatment centers receiving verified patient inquiries through RehabLookup.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
              <Link to="/provider-signup">
                <Button size="lg" variant="secondary" className="gap-2 text-base font-semibold px-8 h-13 shadow-lg">
                  List Your Facility Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/provider-support">
                <Button size="lg" variant="outline" className="gap-2 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 h-13">
                  <Phone className="h-4 w-4" />
                  Talk to Our Team
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-primary-foreground/60">
              <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> 5-minute setup</span>
            </div>
          </div>
        </section>

        {/* Related Articles */}
        <section className="py-10 border-t border-border bg-muted/20">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-10">
              {/* Same Category */}
              {relatedArticles.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    More in {category.label}
                  </h3>
                  <div className="space-y-1.5">
                    {relatedArticles.map((a) => (
                      <Link
                        key={a.slug}
                        to={`/providers/resources/${a.slug}`}
                        className="group flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.readTime} read</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Cross-Category */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  You Might Also Like
                </h3>
                <div className="space-y-1.5">
                  {crossCategoryArticles.map((a) => {
                    const aCat = resourceCategories.find((c) => c.id === a.category)!;
                    return (
                      <Link
                        key={a.slug}
                        to={`/providers/resources/${a.slug}`}
                        className="group flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{a.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn("text-xs", aCat.color.split(" ")[0])}>{aCat.label}</span>
                            <span className="text-xs text-muted-foreground">• {a.readTime}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                      </Link>
                    );
                  })}
                </div>
                <Link
                  to="/providers/resources"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-4 px-3"
                >
                  View all guides <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
