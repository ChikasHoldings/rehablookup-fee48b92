import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { getStateArticle, getStateArticles } from "@/data/stateArticlesData";
import { getStateBySlug } from "@/data/locationSeoData";
import { getCountiesForState } from "@/data/countySeoData";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  ArrowRight,
  BookOpen,
  MapPin,
  DollarSign,
  Building2,
  ChevronRight,
  Phone,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotFoundInPlace } from "@/components/seo/NotFoundInPlace";

const articleTypeIcons: Record<string, typeof BookOpen> = {
  "how-to-find": Building2,
  "cost-of-rehab": DollarSign,
  "best-cities": MapPin,
};

const articleTypeLabels: Record<string, string> = {
  "how-to-find": "Treatment Guide",
  "cost-of-rehab": "Financial Guide",
  "best-cities": "City Guide",
};

export default function StateArticlePage() {
  const { stateSlug, articleSlug } = useParams<{ stateSlug: string; articleSlug: string }>();
  const [heroImgError, setHeroImgError] = useState(false);

  const result = useMemo(() => {
    if (!stateSlug || !articleSlug) return null;
    return getStateArticle(stateSlug, articleSlug);
  }, [stateSlug, articleSlug]);

  const relatedArticles = useMemo(() => {
    if (!stateSlug || !articleSlug) return [];
    return getStateArticles(stateSlug).filter(a => a.slug !== articleSlug);
  }, [stateSlug, articleSlug]);

  if (!result) {
    return (
      <NotFoundInPlace
        title="State article not found"
        message="We don't have that state article available. Browse rehab centers by state instead."
        backTo="/rehab-centers"
        backLabel="Browse by state"
      />
    );
  }

  const { article, stateName, stateAbbr } = result;
  const Icon = articleTypeIcons[article.type] || BookOpen;

  const breadcrumbs = [
    { label: "Rehab Centers", href: "/rehab-centers" },
    { label: stateName, href: `/rehab-centers/${stateSlug}` },
    { label: article.title },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    datePublished: article.publishedDate,
    dateModified: article.updatedDate,
    author: { "@type": "Organization", name: "RehabLookup", url: "https://rehablookup.com" },
    publisher: { "@type": "Organization", name: "RehabLookup", url: "https://rehablookup.com" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://rehablookup.com/rehab-centers/${stateSlug}/articles/${article.slug}` },
  };

  return (
    <Layout>
      <SEO
        title={article.metaTitle}
        description={article.metaDescription}
        canonical={`/rehab-centers/${stateSlug}/articles/${article.slug}`}
        structuredData={structuredData}
      />

      {/* Hero — STATE ARTICLE. Editorial library palette (slate→amber)
          matches Resources / ArticleDetail / Authors. Smaller than
          State per the brief. */}
      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/55">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.10),_transparent_55%)]" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 md:py-8">
          <BreadcrumbNav items={breadcrumbs} className="mb-3 [&_*]:!text-white/70 [&_a:hover]:!text-white" />
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-100 ring-1 ring-amber-400/25">
            <Icon className="w-3 h-3" />
            {articleTypeLabels[article.type] || "Guide"}
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight max-w-3xl font-display">
            {article.title}
          </h1>
          <p className="mt-2 text-sm md:text-base text-white/80 max-w-2xl">{article.heroSubtitle}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/70">
            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Updated {article.updatedDate}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {article.readTime}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {stateName}</span>
          </div>
        </div>
      </section>

      {/* Article Body + Sidebar */}
      <section className="bg-background py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 flex flex-col lg:flex-row gap-10">
          {/* Main Content */}
          <article className="flex-1 min-w-0">
            {article.sections.map((section, idx) => (
              <div key={idx} className="mb-10 last:mb-0">
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">{section.heading}</h2>
                <p className="text-muted-foreground leading-relaxed text-[15px]">{section.content}</p>
                {section.listItems && (
                  <ul className="mt-4 space-y-2.5">
                    {section.listItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-muted-foreground text-[15px]">
                        <CheckCircle className="w-4.5 h-4.5 text-primary mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {/* Bottom CTA - mobile */}
            <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 lg:hidden">
              <h3 className="text-lg font-bold text-foreground">Need Help Finding Treatment in {stateName}?</h3>
              <p className="text-sm text-muted-foreground mt-2">Compare programs side by side, then contact them directly — free, no account required.</p>
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Link to="/search-results" className="flex-1">
                  <Button className="w-full" size="lg">Browse Treatment Centers <ArrowRight className="w-4 h-4 ml-1" /></Button>
                </Link>
                <Link to="/rehab-centers" className="flex-1">
                  <Button variant="outline" className="w-full" size="lg">Browse Facilities</Button>
                </Link>
              </div>
            </div>
          </article>

          {/* Sidebar — sticky */}
          <aside className="hidden lg:block lg:w-80 shrink-0">
            <div className="sticky top-24 space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto pb-4">
              {/* CTA Card */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
                <Phone className="w-8 h-8 text-primary mb-3" />
                <h3 className="text-lg font-bold text-foreground">Need Help Finding Treatment?</h3>
                <p className="text-sm text-muted-foreground mt-2">Compare {stateName} programs side by side, then contact them directly — free, no account required.</p>
                <Link to="/search-results">
                  <Button className="w-full mt-4" size="lg">
                    Browse Treatment Centers <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link to="/rehab-centers" className="block mt-3">
                  <Button variant="outline" className="w-full" size="sm">
                    Browse All Facilities
                  </Button>
                </Link>
              </div>

              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div className="rounded-2xl border border-border/60 p-5">
                  <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">More About {stateName}</h3>
                  <div className="space-y-2">
                    {relatedArticles.map(ra => {
                      const RAIcon = articleTypeIcons[ra.type] || BookOpen;
                      return (
                        <Link
                          key={ra.slug}
                          to={`/rehab-centers/${stateSlug}/articles/${ra.slug}`}
                          className="group flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <RAIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">{ra.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{ra.readTime}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </aside>
        </div>
      </section>

      {/* Cities, Counties & Quick Links Section */}
      {(() => {
        const stateData = getStateBySlug(stateSlug!);
        const counties = getCountiesForState(stateSlug!);
        const hasCities = stateData && stateData.cities.length > 0;
        const hasCounties = counties.length > 0;
        if (!hasCities && !hasCounties) return null;
        return (
          <section className="bg-muted/20 border-t border-border/40 py-10 md:py-14">
            <div className="max-w-5xl mx-auto px-4">
              <h2 className="text-xl font-bold text-foreground mb-8">Explore {stateName} Locations</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {hasCities && (
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" /> Cities
                    </h3>
                    <div className="space-y-1.5 text-sm">
                      {stateData.cities.slice(0, 10).map(city => (
                        <Link key={city.slug} to={`/rehab-centers/${stateSlug}/${city.slug}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors py-0.5">
                          <ChevronRight className="w-3 h-3" /> {city.name}
                        </Link>
                      ))}
                      {stateData.cities.length > 10 && (
                        <Link to={`/rehab-centers/${stateSlug}`} className="flex items-center gap-2 text-primary font-medium py-0.5">
                          <ChevronRight className="w-3 h-3" /> View all {stateData.cities.length} cities
                        </Link>
                      )}
                    </div>
                  </div>
                )}
                {hasCounties && (
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" /> Counties
                    </h3>
                    <div className="space-y-1.5 text-sm">
                      {counties.slice(0, 10).map(county => (
                        <Link key={county.slug} to={`/rehab-centers/${stateSlug}/county/${county.slug}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors py-0.5">
                          <ChevronRight className="w-3 h-3" /> {county.name} County
                        </Link>
                      ))}
                      {counties.length > 10 && (
                        <Link to={`/rehab-centers/${stateSlug}`} className="flex items-center gap-2 text-primary font-medium py-0.5">
                          <ChevronRight className="w-3 h-3" /> View all {counties.length} counties
                        </Link>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" /> Quick Links
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    <Link to={`/rehab-centers/${stateSlug}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors py-0.5">
                      <ChevronRight className="w-3 h-3" /> {stateName} Rehab Centers
                    </Link>
                    <Link to="/search-results" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors py-0.5">
                      <ChevronRight className="w-3 h-3" /> Search All Facilities
                    </Link>
                    <Link to="/treatment-types" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors py-0.5">
                      <ChevronRight className="w-3 h-3" /> Treatment Types
                    </Link>
                    <Link to="/insurance" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors py-0.5">
                      <ChevronRight className="w-3 h-3" /> Insurance Coverage
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Internal Links Footer */}
      <section className="bg-muted/30 border-t border-border/40 py-10 md:py-12">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-xl font-bold text-foreground mb-6">Explore More {stateName} Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {getStateArticles(stateSlug!).map(a => {
              const AIcon = articleTypeIcons[a.type] || BookOpen;
              return (
                <Link
                  key={a.slug}
                  to={`/rehab-centers/${stateSlug}/articles/${a.slug}`}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-border/60 bg-background p-4 hover:border-primary/40 hover:shadow-md transition-all",
                    a.slug === articleSlug && "border-primary/40 bg-primary/5"
                  )}
                >
                  <AIcon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-snug">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{a.readTime}</p>
                  </div>
                </Link>
              );
            })}
            <Link
              to={`/rehab-centers/${stateSlug}`}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-4 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm font-semibold text-foreground">View All {stateName} Rehab Centers</p>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
