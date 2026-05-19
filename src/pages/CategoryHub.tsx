import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Clock, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { supabase } from "@/integrations/supabase/client";
import {
import { NotFoundInPlace } from "@/components/seo/NotFoundInPlace";
  ALL_BLOG_CATEGORIES,
  getCategoryBySlug,
  type BlogCategory,
} from "@/data/blogCategories";

const SITE_URL = "https://rehablookup.com";

interface DBArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  category_label: string | null;
  read_time: string | null;
  image_url: string | null;
  featured: boolean;
  published_at: string | null;
}

function buildCategorySchema(category: BlogCategory, articles: DBArticle[]) {
  const url = `${SITE_URL}/resources/category/${category.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.label,
    headline: category.label,
    description: category.metaDescription,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: "RehabLookup",
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      name: `${category.label} articles`,
      numberOfItems: articles.length,
      itemListElement: articles.slice(0, 20).map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/resources/${a.slug}`,
        name: a.title,
      })),
    },
  };
}

function ArticleCard({ article, color }: { article: DBArticle; color: string }) {
  const fallback = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=400&fit=crop";
  return (
    <Link
      to={`/resources/${article.slug}`}
      className="group flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20"
    >
      <div className="aspect-[16/9] overflow-hidden bg-muted">
        <img
          src={article.image_url || fallback}
          alt={article.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        {article.category_label && (
          <span className={`inline-block w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white ${color} mb-3`}>
            {article.category_label}
          </span>
        )}
        <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{article.excerpt}</p>
        )}
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          {article.read_time && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.read_time}
            </span>
          )}
          {article.featured && (
            <Badge variant="outline" className="border-amber-300 text-amber-700 text-[10px] py-0">
              Featured
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}

function ArticleCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden">
      <Skeleton className="aspect-[16/9] w-full" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export default function CategoryHub() {
  const { slug } = useParams<{ slug: string }>();
  const category = getCategoryBySlug(slug);

  // Unknown category → redirect to the resources hub. Avoids serving a thin
  // 404 for a URL we never want indexed.
  if (!category) {
    return (
      <NotFoundInPlace
        title="Topic hub not found"
        message="We don't have a topic hub for that category yet. Browse all guides in our resources hub."
        backTo="/resources"
        backLabel="Browse all resources"
      />
    );
  }

  const Icon = category.icon;

  const { data: articles, isLoading } = useQuery({
    queryKey: ["category-hub-articles", category.slug],
    queryFn: async (): Promise<DBArticle[]> => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, slug, title, excerpt, category, category_label, read_time, image_url, featured, published_at")
        .eq("status", "published")
        .in("category", category.acceptsLegacyCategories)
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DBArticle[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const allArticles = articles ?? [];

  // Pillar = explicitly-curated slugs (preserve order), filtered to those that
  // are actually in the result set. The rest of the list is "everything else."
  const pillarArticles = useMemo<DBArticle[]>(() => {
    if (allArticles.length === 0 || category.pillarSlugs.length === 0) return [];
    const bySlug = new Map(allArticles.map((a) => [a.slug, a] as const));
    return category.pillarSlugs
      .map((s) => bySlug.get(s))
      .filter((a): a is DBArticle => a !== undefined);
  }, [allArticles, category.pillarSlugs]);

  const pillarSlugSet = useMemo(
    () => new Set(pillarArticles.map((a) => a.slug)),
    [pillarArticles]
  );

  const otherArticles = useMemo(
    () => allArticles.filter((a) => !pillarSlugSet.has(a.slug)),
    [allArticles, pillarSlugSet]
  );

  const relatedHubs = useMemo(
    () =>
      category.relatedCategories
        .map((s) => ALL_BLOG_CATEGORIES.find((c) => c.slug === s))
        .filter((c): c is BlogCategory => c !== undefined),
    [category.relatedCategories]
  );

  const schema = useMemo(
    () => buildCategorySchema(category, allArticles),
    [category, allArticles]
  );

  return (
    <Layout>
      <SEO
        title={category.metaTitle}
        description={category.metaDescription}
        canonical={`/resources/category/${category.slug}`}
        structuredData={schema}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Resources", url: "/resources" },
          { name: category.label, url: `/resources/category/${category.slug}` },
        ]}
      />

      {/* Hero */}
      <section className="bg-muted/30 border-b border-border">
        <div className="container py-10">
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Resources", href: "/resources" },
              { label: category.label },
            ]}
          />
          <div className="flex items-start gap-5 max-w-3xl">
            <div className={`hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${category.color}`}>
              <Icon className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                {category.label}
              </h1>
              <p className="mt-2 text-base text-muted-foreground">{category.tagline}</p>
            </div>
          </div>
          <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-foreground/85">
            {category.intro}
          </p>
        </div>
      </section>

      {/* Pillar articles */}
      {pillarArticles.length > 0 && (
        <section className="container py-10">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="font-display text-xl font-bold text-foreground">Start with these</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <ArticleCardSkeleton key={i} />)
              : pillarArticles.map((a) => (
                  <ArticleCard key={a.id} article={a} color={category.color} />
                ))}
          </div>
        </section>
      )}

      {/* All articles in this hub */}
      <section className="container py-10 border-t border-border">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5">
          <h2 className="font-display text-xl font-bold text-foreground">
            {pillarArticles.length > 0 ? "More in this hub" : "All articles"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${allArticles.length} article${allArticles.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : otherArticles.length === 0 && pillarArticles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              We're still publishing in this hub. In the meantime, browse{" "}
              <Link to="/resources" className="text-primary hover:underline">
                all guides
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {otherArticles.map((a) => (
              <ArticleCard key={a.id} article={a} color={category.color} />
            ))}
          </div>
        )}
      </section>

      {/* Related hubs */}
      {relatedHubs.length > 0 && (
        <section className="bg-muted/30 border-t border-border">
          <div className="container py-10">
            <h2 className="font-display text-xl font-bold text-foreground mb-5">
              Related hubs
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {relatedHubs.map((rh) => {
                const RhIcon = rh.icon;
                return (
                  <Link
                    key={rh.slug}
                    to={`/resources/category/${rh.slug}`}
                    className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-lg text-white ${rh.color}`}>
                      <RhIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {rh.label}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{rh.tagline}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 self-center group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                );
              })}
            </div>

            <div className="mt-6">
              <Button asChild variant="outline" size="sm">
                <Link to="/resources" className="gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Browse all guides
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
