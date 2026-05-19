import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, Clock, ChevronRight, Sparkles, Calendar } from "lucide-react";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category_label: string;
  read_time: string;
  image_url: string | null;
  featured: boolean;
  published_at: string | null;
  author: string;
}

const SITE_URL = "https://rehablookup.com";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function NewsCard({ article, featured = false }: { article: NewsArticle; featured?: boolean }) {
  const defaultImage =
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&h=600&fit=crop";

  return (
    <Link
      to={`/resources/${article.slug}`}
      className={`group flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 ${
        featured ? "md:flex-row" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden ${
          featured ? "h-56 md:h-auto md:w-1/2 md:min-h-[280px]" : "h-48"
        }`}
      >
        <img
          src={article.image_url || defaultImage}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          width={featured ? 800 : 600}
          height={featured ? 500 : 300}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white bg-primary">
            <Newspaper className="h-3 w-3" />
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
      <div className={`flex flex-col flex-grow p-5 ${featured ? "md:p-8 md:w-1/2" : ""}`}>
        <h3
          className={`font-display font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors ${
            featured ? "text-xl md:text-2xl" : "text-lg"
          }`}
        >
          {article.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-grow">
          {article.excerpt}
        </p>
        <div className="flex items-center justify-between pt-3 border-t border-border/50 gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {article.published_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(article.published_at)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {article.read_time}
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Read more
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function NewsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function News() {
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["news-articles"] });
  }, [queryClient]);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["news-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select(
          "id, slug, title, excerpt, category_label, read_time, image_url, featured, published_at, author"
        )
        .eq("status", "published")
        .eq("category", "news")
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data as NewsArticle[];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const featured = articles?.[0];
  const rest = articles?.slice(1) ?? [];

  const itemListSchema =
    articles && articles.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "RehabLookup News",
          description:
            "Platform news, milestones, and announcements from RehabLookup — including industry updates on addiction treatment.",
          numberOfItems: articles.length,
          itemListElement: articles.slice(0, 10).map((a, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "NewsArticle",
              "@id": `${SITE_URL}/news/${a.slug}`,
              name: a.title,
              headline: a.title,
              description: a.excerpt,
              url: `${SITE_URL}/news/${a.slug}`,
              image: a.image_url || `${SITE_URL}/og-image.jpg`,
              datePublished: a.published_at || undefined,
              author: { "@type": "Organization", name: "RehabLookup" },
            },
          })),
        }
      : undefined;

  return (
    <Layout>
      <SEO
        title="News & Announcements | RehabLookup"
        description="Platform updates, milestones, and industry news from RehabLookup — covering rehab discovery, addiction treatment, and behavioral health."
        canonical="/news"
        structuredData={itemListSchema}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "News", url: "/news" },
        ]}
      />

      {/* Hero — NEWS. Editorial library palette (matches Resources +
          CategoryHub + Authors). */}
      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/55">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.10),_transparent_55%)]" />
        <div className="container relative z-10 py-6 md:py-8">
          <BreadcrumbNav items={[{ label: "News" }]} className="mb-3 [&_*]:!text-white/70 [&_a:hover]:!text-white" />
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-100 backdrop-blur-sm ring-1 ring-amber-400/25">
              <Newspaper className="h-3 w-3" />
              Platform News
            </div>
            <h1 className="speakable-headline mb-2 font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white">
              News & Announcements
            </h1>
            <p className="speakable-summary text-sm md:text-base text-white/80 max-w-xl mx-auto">
              Milestones from RehabLookup and the world of addiction treatment.
            </p>
          </div>
        </div>
      </section>

      {/* Featured + Latest */}
      <section className="py-12 md:py-16">
        <div className="container">
          {isLoading ? (
            <NewsSkeleton />
          ) : !articles || articles.length === 0 ? (
            <div className="text-center py-16">
              <Newspaper className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-foreground mb-2">No news yet</h2>
              <p className="text-muted-foreground">
                Check back soon for platform updates and announcements.
              </p>
            </div>
          ) : (
            <>
              {featured && (
                <div className="mb-12">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <h2 className="font-display text-xl font-bold text-foreground">Latest</h2>
                  </div>
                  <NewsCard article={featured} featured />
                </div>
              )}

              {rest.length > 0 && (
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-6">
                    More Stories
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {rest.map((a) => (
                      <NewsCard key={a.id} article={a} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
