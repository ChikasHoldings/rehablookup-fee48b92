import { useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
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

const articleTypeIcons: Record<string, typeof BookOpen> = {
  "how-to-find": Building2,
  "cost-of-rehab": DollarSign,
  "best-cities": MapPin,
};

const stateHeroImages: Record<string, string> = {
  alabama: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1200&q=80",
  alaska: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&q=80",
  arizona: "https://images.unsplash.com/photo-1558645836-e44122a743ee?w=1200&q=80",
  arkansas: "https://images.unsplash.com/photo-1605548109944-9040d0972bf5?w=1200&q=80",
  california: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=1200&q=80",
  colorado: "https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=1200&q=80",
  connecticut: "https://images.unsplash.com/photo-1630395822595-1f98e0108615?w=1200&q=80",
  delaware: "https://images.unsplash.com/photo-1606298246186-4fdb58d1d9a0?w=1200&q=80",
  florida: "https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=1200&q=80",
  georgia: "https://images.unsplash.com/photo-1575917649370-83b1e1f0c3d3?w=1200&q=80",
  hawaii: "https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=1200&q=80",
  idaho: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1200&q=80",
  illinois: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80",
  indiana: "https://images.unsplash.com/photo-1569982175971-d92b01cf8694?w=1200&q=80",
  iowa: "https://images.unsplash.com/photo-1625244724120-1fd1d34d00f6?w=1200&q=80",
  kansas: "https://images.unsplash.com/photo-1528164344705-47542687000d?w=1200&q=80",
  kentucky: "https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=1200&q=80",
  louisiana: "https://images.unsplash.com/photo-1568402102990-bc541580b59f?w=1200&q=80",
  maine: "https://images.unsplash.com/photo-1494548162494-384bba4ab999?w=1200&q=80",
  maryland: "https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=1200&q=80",
  massachusetts: "https://images.unsplash.com/photo-1501979376754-1d7e3cc43e53?w=1200&q=80",
  michigan: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200&q=80",
  minnesota: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=1200&q=80",
  mississippi: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=1200&q=80",
  missouri: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&q=80",
  montana: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
  nebraska: "https://images.unsplash.com/photo-1494548162494-384bba4ab999?w=1200&q=80",
  nevada: "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=1200&q=80",
  "new-hampshire": "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=1200&q=80",
  "new-jersey": "https://images.unsplash.com/photo-1577584965694-1a9c7da09b40?w=1200&q=80",
  "new-mexico": "https://images.unsplash.com/photo-1518548305643-3e999e6c3c25?w=1200&q=80",
  "new-york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=80",
  "north-carolina": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80",
  "north-dakota": "https://images.unsplash.com/photo-1528164344705-47542687000d?w=1200&q=80",
  ohio: "https://images.unsplash.com/photo-1575517111478-7f6afd0973db?w=1200&q=80",
  oklahoma: "https://images.unsplash.com/photo-1528164344705-47542687000d?w=1200&q=80",
  oregon: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80",
  pennsylvania: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&q=80",
  "rhode-island": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
  "south-carolina": "https://images.unsplash.com/photo-1577584965694-1a9c7da09b40?w=1200&q=80",
  "south-dakota": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
  tennessee: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80",
  texas: "https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=1200&q=80",
  utah: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80",
  vermont: "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=1200&q=80",
  virginia: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80",
  washington: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80",
  "west-virginia": "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=1200&q=80",
  wisconsin: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200&q=80",
  wyoming: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
};

export default function StateArticlePage() {
  const { stateSlug, articleSlug } = useParams<{ stateSlug: string; articleSlug: string }>();

  const result = useMemo(() => {
    if (!stateSlug || !articleSlug) return null;
    return getStateArticle(stateSlug, articleSlug);
  }, [stateSlug, articleSlug]);

  const relatedArticles = useMemo(() => {
    if (!stateSlug || !articleSlug) return [];
    return getStateArticles(stateSlug).filter(a => a.slug !== articleSlug);
  }, [stateSlug, articleSlug]);

  if (!result) return <Navigate to="/rehab-centers" replace />;

  const { article, stateName, stateAbbr } = result;
  const Icon = articleTypeIcons[article.type] || BookOpen;
  const heroImage = stateHeroImages[stateSlug!] || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80";

  const breadcrumbs = [
    { label: "Rehab Centers", href: "/rehab-centers" },
    { label: stateName, href: `/rehab-centers/${stateSlug}` },
    { label: "Articles", href: `/rehab-centers/${stateSlug}` },
    { label: article.title },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    image: heroImage,
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

      {/* Hero */}
      <section className="relative min-h-[380px] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt={article.imageAlt} className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20" />
        </div>
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 pb-10 pt-32">
          <BreadcrumbNav items={breadcrumbs} variant="light" />
          <div className="mt-4 flex items-center gap-2 text-primary/80">
            <Icon className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              {article.type === "how-to-find" ? "Treatment Guide" : article.type === "cost-of-rehab" ? "Financial Guide" : "City Guide"}
            </span>
          </div>
          <h1 className="mt-2 text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
            {article.title}
          </h1>
          <p className="mt-3 text-lg text-white/80 max-w-2xl">{article.heroSubtitle}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/60">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Updated {article.updatedDate}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {article.readTime}</span>
          </div>
        </div>
      </section>

      {/* Article Body */}
      <section className="bg-background py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 flex flex-col lg:flex-row gap-10">
          {/* Main Content */}
          <article className="flex-1 min-w-0 prose prose-lg max-w-none dark:prose-invert">
            {article.sections.map((section, idx) => (
              <div key={idx} className="mb-10">
                <h2 className="text-2xl font-bold text-foreground mb-4">{section.heading}</h2>
                <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                {section.listItems && (
                  <ul className="mt-4 space-y-2">
                    {section.listItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <CheckCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </article>

          {/* Sidebar */}
          <aside className="lg:w-80 shrink-0 space-y-6">
            {/* CTA Card */}
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 sticky top-24">
              <Phone className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-lg font-bold text-foreground">Need Help Finding Treatment?</h3>
              <p className="text-sm text-muted-foreground mt-2">Our concierge team matches you with the right program in {stateName} — free and confidential.</p>
              <Link to="/concierge">
                <Button className="w-full mt-4" size="lg">
                  Get Matched Free <ArrowRight className="w-4 h-4 ml-1" />
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
              <div className="rounded-2xl border border-border/60 p-6">
                <h3 className="text-base font-bold text-foreground mb-4">More About {stateName}</h3>
                <div className="space-y-3">
                  {relatedArticles.map(ra => {
                    const RAIcon = articleTypeIcons[ra.type] || BookOpen;
                    return (
                      <Link
                        key={ra.slug}
                        to={`/rehab-centers/${stateSlug}/articles/${ra.slug}`}
                        className="group flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <RAIcon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
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

            {/* Cities & Counties */}
            {(() => {
              const stateData = getStateBySlug(stateSlug!);
              const counties = getCountiesForState(stateSlug!);
              return (
                <>
                  {stateData && stateData.cities.length > 0 && (
                    <div className="rounded-2xl border border-border/60 p-6">
                      <h3 className="text-base font-bold text-foreground mb-3">Cities in {stateName}</h3>
                      <div className="space-y-1.5 text-sm">
                        {stateData.cities.slice(0, 8).map(city => (
                          <Link key={city.slug} to={`/rehab-centers/${stateSlug}/${city.slug}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <ChevronRight className="w-3.5 h-3.5" /> {city.name}
                          </Link>
                        ))}
                        {stateData.cities.length > 8 && (
                          <Link to={`/rehab-centers/${stateSlug}`} className="flex items-center gap-2 text-primary font-medium">
                            <ChevronRight className="w-3.5 h-3.5" /> View all {stateData.cities.length} cities
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                  {counties.length > 0 && (
                    <div className="rounded-2xl border border-border/60 p-6">
                      <h3 className="text-base font-bold text-foreground mb-3">Counties in {stateName}</h3>
                      <div className="space-y-1.5 text-sm">
                        {counties.slice(0, 6).map(county => (
                          <Link key={county.slug} to={`/rehab-centers/${stateSlug}/county/${county.slug}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <ChevronRight className="w-3.5 h-3.5" /> {county.name} County
                          </Link>
                        ))}
                        {counties.length > 6 && (
                          <Link to={`/rehab-centers/${stateSlug}`} className="flex items-center gap-2 text-primary font-medium">
                            <ChevronRight className="w-3.5 h-3.5" /> View all {counties.length} counties
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Quick Links */}
            <div className="rounded-2xl border border-border/60 p-6">
              <h3 className="text-base font-bold text-foreground mb-4">Quick Links</h3>
              <div className="space-y-2 text-sm">
                <Link to={`/rehab-centers/${stateSlug}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <ChevronRight className="w-4 h-4" /> {stateName} Rehab Centers
                </Link>
                <Link to="/search-results" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <ChevronRight className="w-4 h-4" /> Search All Facilities
                </Link>
                <Link to="/treatment-types" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <ChevronRight className="w-4 h-4" /> Treatment Types
                </Link>
                <Link to="/insurance" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <ChevronRight className="w-4 h-4" /> Insurance Coverage
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Internal Links Footer */}
      <section className="bg-muted/30 border-t border-border/40 py-12">
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
