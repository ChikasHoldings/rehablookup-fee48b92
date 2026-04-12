import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { SEO, generateArticleSchema } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  BookOpen,
  Clock,
  ArrowLeft,
  ArrowRight,
  Heart,
  Calendar,
  User,
  MapPin,
  Stethoscope,
  Shield,
  Sparkles,
} from "lucide-react";
import { ReactNode, useState, useMemo } from "react";
import { MidArticleCTA } from "@/components/articles/MidArticleCTA";
import { ArticleShareBar } from "@/components/articles/ArticleShareBar";
import { 
  InternalLinkingSection, 
  treatmentTypeLinks, 
  nearMeLinks, 
  insuranceLinks
} from "@/components/seo/InternalLinkingSection";
import { ArticleCategoryLinks } from "@/components/seo/ArticleCategoryLinks";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { 
  PillarContentLinks, 
  CrossCategoryLinks,
  TopicHubLinks,
  topicArticleMatrix,
} from "@/components/seo/ArticleInterlinks";
import { useRelatedArticles, useCrossCategoryArticles } from "@/hooks/useRelatedArticles";
import { EnhancedRelatedArticles, YouMayAlsoLike } from "@/components/articles/EnhancedRelatedArticles";

// Content block types from JSON structure
interface ContentBlock {
  type: "paragraph" | "heading" | "list" | "quote" | "callout";
  content?: string;
  level?: number;
  items?: string[];
  style?: string;
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
  author: string;
  author_date: string | null;
  content: ContentBlock[];
  status: string;
  featured: boolean;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  seo_keywords: string[] | null;
}

// Helper function to parse content with internal links
// Link format: [[article-id|link text]]
const parseContentWithLinks = (text: string): ReactNode => {
  const linkPattern = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    const [, articleId, linkText] = match;
    parts.push(
      <Link
        key={match.index}
        to={`/resources/${articleId}`}
        className="text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/30 hover:decoration-primary/60 transition-colors font-medium"
      >
        {linkText}
      </Link>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

// Helper function to extract linked article IDs from content
const extractLinkedArticleIds = (content: ContentBlock[]): string[] => {
  const linkPattern = /\[\[([^\]|]+)\|[^\]]+\]\]/g;
  const ids = new Set<string>();
  
  content.forEach((block) => {
    const text = block.content || "";
    let match;
    while ((match = linkPattern.exec(text)) !== null) {
      ids.add(match[1]);
    }
    // Also check list items
    if (block.items) {
      block.items.forEach((item) => {
        while ((match = linkPattern.exec(item)) !== null) {
          ids.add(match[1]);
        }
      });
    }
  });
  
  return Array.from(ids);
};

// Loading skeleton for article
function ArticleSkeleton() {
  return (
    <Layout>
      <SEO 
        title="Loading Article..."
        description="Loading article content"
        noindex={true}
      />
      <div className="bg-gradient-to-b from-muted/60 via-muted/30 to-background py-12 md:py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-12 w-3/4 mb-6" />
            <div className="flex gap-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        </div>
      </div>
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
          </div>
        </div>
      </section>
    </Layout>
  );
}

const ArticleDetail = () => {
  const { id } = useParams<{ id: string }>();
  

  // Normalize slug to lowercase for case-insensitive matching
  const normalizedSlug = id?.toLowerCase();
  const needsRedirect = !!(id && id !== normalizedSlug);

  // Fetch article from database
  const { data: article, isLoading, error } = useQuery({
    queryKey: ["article", normalizedSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, title, slug, excerpt, content, author, author_date, category, category_label, image_url, read_time, published_at, created_at, updated_at, meta_title, meta_description, seo_keywords, featured, status")
        .eq("slug", normalizedSlug)
        .eq("status", "published")
        .single();
      
      if (error) throw error;
      
      // Cast content from Json to ContentBlock[]
      return {
        ...data,
        content: data.content as unknown as ContentBlock[],
      } as DBArticle;
    },
    enabled: !!normalizedSlug && !needsRedirect,
  });

  // ENHANCED: Smart related articles using keyword/topic matching
  const { data: smartRelatedArticles } = useRelatedArticles(
    article?.slug || "",
    article?.category || "",
    article?.seo_keywords || [],
    6
  );

  // Cross-category articles for broader internal linking
  const { data: crossCategoryArticles } = useCrossCategoryArticles(
    article?.category || "",
    article?.slug || "",
    4
  );

  // Fetch all articles for sidebar navigation
  const { data: allArticles } = useQuery({
    queryKey: ["all-articles-sidebar"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_articles")
        .select("slug, title, category_label")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // Extract linked articles from content for "Further Reading"
  const linkedArticleIds = useMemo(() => {
    if (!article?.content) return [];
    return extractLinkedArticleIds(article.content);
  }, [article?.content]);

  // Calculate word count from content for schema (must be before early returns)
  const wordCount = useMemo(() => {
    if (!article?.content) return 0;
    let text = "";
    article.content.forEach((block) => {
      if (block.content) text += block.content + " ";
      if (block.items) text += block.items.join(" ") + " ";
    });
    return text.split(/\s+/).filter(Boolean).length;
  }, [article?.content]);

  // Detect primary topic from keywords for topic hub linking
  const primaryTopic = useMemo(() => {
    if (!article?.seo_keywords) return null;
    const keywords = article.seo_keywords.map(k => k.toLowerCase());
    for (const topic of Object.keys(topicArticleMatrix)) {
      if (keywords.some(k => k.includes(topic) || topic.includes(k))) {
        return topic;
      }
    }
    return null;
  }, [article?.seo_keywords]);

  const { data: linkedArticles } = useQuery({
    queryKey: ["linked-articles", linkedArticleIds],
    queryFn: async () => {
      if (linkedArticleIds.length === 0) return [];
      const { data } = await supabase
        .from("blog_articles")
        .select("slug, title, category_label")
        .eq("status", "published")
        .in("slug", linkedArticleIds)
        .limit(5);
      return data || [];
    },
    enabled: linkedArticleIds.length > 0,
  });


  // Redirect if slug has uppercase characters (SEO canonical fix)
  if (needsRedirect) {
    return <Navigate to={`/resources/${normalizedSlug}`} replace />;
  }

  if (isLoading) {
    return <ArticleSkeleton />;
  }

  if (error || !article) {
    return <Navigate to="/resources" replace />;
  }

  const shareUrl = encodeURIComponent(window.location.href);
  const shareTitle = encodeURIComponent(article.title);
  const defaultImage = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&h=600&fit=crop";
  const articleImage = article.image_url || defaultImage;

  // Breadcrumbs for SEO
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Resources", url: "/resources" },
    { name: article.category_label, url: `/resources?category=${article.category}` },
    { name: article.title, url: `/resources/${article.slug}` },
  ];

  // Render content blocks from JSON structure
  const renderContent = () => {
    return article.content.map((block: any, index: number) => {
      const isAfterMidpoint = index === Math.floor(article.content.length / 2);

      // Handle legacy string-based content format
      if (typeof block === "string") {
        const text = block.trim();
        if (!text) return null;

        // Markdown-style headings
        if (text.startsWith("### ")) {
          return (
            <h3 key={index} className="font-display text-lg font-semibold text-foreground mt-6 mb-3 scroll-mt-20">
              {text.slice(4)}
            </h3>
          );
        }
        if (text.startsWith("## ")) {
          return (
            <h2 key={index} className="font-display text-xl font-bold text-foreground mt-8 mb-4 scroll-mt-20">
              {text.slice(3)}
            </h2>
          );
        }

        // Bullet list lines (consecutive lines starting with "- ")
        if (text.startsWith("- ")) {
          const items = text.split("\n").filter((l: string) => l.trim().startsWith("- "));
          return (
            <ul key={index} className="list-disc pl-6 space-y-2 text-muted-foreground">
              {items.map((item: string, i: number) => (
                <li key={i} className="leading-relaxed">
                  {parseContentWithLinks(item.replace(/^-\s*/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        // Blockquote
        if (text.startsWith("> ")) {
          return (
            <blockquote key={index} className="border-l-4 border-primary/30 pl-4 py-2 my-6 italic text-muted-foreground bg-muted/30 rounded-r-lg">
              {parseContentWithLinks(text.slice(2))}
            </blockquote>
          );
        }

        // Regular paragraph
        return (
          <div key={index}>
            {isAfterMidpoint && <MidArticleCTA />}
            <p className="text-muted-foreground leading-relaxed">
              {parseContentWithLinks(text)}
            </p>
          </div>
        );
      }
      
      // Handle structured heading blocks
      if (block.type === "heading") {
        const HeadingTag = block.level === 3 ? "h3" : "h2";
        const headingClass = block.level === 3 
          ? "font-display text-lg font-semibold text-foreground mt-6 mb-3 scroll-mt-20"
          : "font-display text-xl font-bold text-foreground mt-8 mb-4 scroll-mt-20";
        return (
          <HeadingTag key={index} className={headingClass}>
            {block.content}
          </HeadingTag>
        );
      }

      // Handle list blocks
      if (block.type === "list" && block.items) {
        return (
          <div key={index}>
            {isAfterMidpoint && <MidArticleCTA />}
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              {block.items.map((item: string, i: number) => (
                <li key={i} className="leading-relaxed">
                  {parseContentWithLinks(item)}
                </li>
              ))}
            </ul>
          </div>
        );
      }

      // Handle quote/callout blocks
      if (block.type === "quote" || block.type === "callout") {
        return (
          <blockquote key={index} className="border-l-4 border-primary/30 pl-4 py-2 my-6 italic text-muted-foreground bg-muted/30 rounded-r-lg">
            {parseContentWithLinks(block.content || "")}
          </blockquote>
        );
      }

      // Default: paragraph blocks
      return (
        <div key={index}>
          {isAfterMidpoint && <MidArticleCTA />}
          <p className="text-muted-foreground leading-relaxed">
            {parseContentWithLinks(block.content || "")}
          </p>
        </div>
      );
    });
  };

  return (
    <Layout>
      <SEO
        title={article.meta_title || `${article.title} | RehabLookup`}
        description={article.meta_description || article.excerpt}
        canonical={`/resources/${article.slug}`}
        type="article"
        image={articleImage}
        structuredData={generateArticleSchema({
          title: article.title,
          description: article.excerpt,
          image: articleImage,
          datePublished: article.published_at || new Date().toISOString(),
          dateModified: article.published_at || new Date().toISOString(),
          author: article.author,
          url: `https://rehablookup.com/resources/${article.slug}`,
          keywords: article.seo_keywords || undefined,
          category: article.category_label,
          wordCount,
          readTime: article.read_time,
        })}
        breadcrumbs={breadcrumbs}
        keywords={article.seo_keywords || undefined}
        publishedTime={article.published_at || undefined}
      />

      {/* Hero */}
      <div className="bg-gradient-to-b from-muted/60 via-muted/30 to-background py-12 md:py-16">
        <div className="container">
          <BreadcrumbNav
            items={[
              { label: "Resources", href: "/resources" },
              { label: article.category_label, href: `/resources?category=${article.category}` },
              { label: article.title },
            ]}
            className="mb-4"
            variant="light"
          />
          <div className="max-w-4xl mx-auto">

            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                <BookOpen className="h-3.5 w-3.5" />
                {article.category_label}
              </span>
            </div>

            <h1 className="speakable-headline font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl mb-6 leading-tight">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {article.author}
              </span>
              {article.author_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {article.author_date}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {article.read_time}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10">
            {/* Main Content */}
            <article className="flex-1 min-w-0">
              {/* Featured Image */}
              <div className="relative rounded-2xl overflow-hidden mb-10 aspect-[16/9]">
                <img
                  src={articleImage}
                  alt={article.title}
                  className="w-full h-full object-cover"
                  width={1200}
                  height={675}
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>

              {/* Article Content */}
              <div className="prose prose-lg max-w-none space-y-6">
                {renderContent()}
              </div>

              {/* Share Section */}
              <div className="mt-12 pt-8 border-t">
                <ArticleShareBar
                  title={article.title}
                  description={article.excerpt}
                  url={`https://rehablookup.com/resources/${article.slug}`}
                />
              </div>

              {/* Enhanced Related Articles with Smart Linking */}
              {smartRelatedArticles && smartRelatedArticles.length > 0 && (
                <EnhancedRelatedArticles
                  articles={smartRelatedArticles}
                  title="Related Articles"
                  description="Continue exploring topics related to this guide."
                  variant="grid"
                  showImages={true}
                  className="mt-12"
                />
              )}

              {/* You May Also Like - Cross-category suggestions */}
              {crossCategoryArticles && crossCategoryArticles.length > 0 && (
                <YouMayAlsoLike
                  articles={crossCategoryArticles}
                  className="mt-10"
                />
              )}

              {/* Pillar Content Links for SEO Authority */}
              <PillarContentLinks currentSlug={article.slug} />

              {/* Cross-Category Navigation */}
              <CrossCategoryLinks currentCategory={article.category} className="mb-6" />

              {/* Category-based internal links for SEO */}
              <ArticleCategoryLinks category={article.category} variant="footer" />
            </article>

            {/* Sidebar */}
            <aside className="lg:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-24 space-y-6">
              {/* Topic Hub Links - Dynamic based on article topic */}
              {primaryTopic && (
                <TopicHubLinks
                  topic={primaryTopic}
                  currentSlug={article.slug}
                />
              )}

              {/* Further Reading */}
              {linkedArticles && linkedArticles.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
                  <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Further Reading
                  </h3>
                  <div className="space-y-3">
                    {linkedArticles.map((linked) => (
                      <Link
                        key={linked.slug}
                        to={`/resources/${linked.slug}`}
                        className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <span className="text-xs text-primary font-medium">{linked.category_label}</span>
                        <p className="text-sm font-medium text-foreground line-clamp-2 mt-1">
                          {linked.title}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Smart Related - Compact Sidebar Version */}
              {smartRelatedArticles && smartRelatedArticles.length > 0 && (
                <EnhancedRelatedArticles
                  articles={smartRelatedArticles.slice(0, 5)}
                  title="You Might Also Like"
                  variant="compact"
                />
              )}

              {/* Quick Links */}
              <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
                <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Popular Articles
                </h3>
                <div className="space-y-2">
                  {allArticles?.slice(0, 5).map((a) => (
                    <Link
                      key={a.slug}
                      to={`/resources/${a.slug}`}
                      className="flex items-center gap-2 py-2 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors group"
                    >
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      <span className="line-clamp-2">{a.title}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* CTA Card */}
              <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-6 text-white shadow-lg">
                <Heart className="h-8 w-8 mb-3 opacity-90" />
                <h3 className="font-display text-lg font-semibold mb-2">
                  Need Help Finding Treatment?
                </h3>
                <p className="text-sm text-white/80 mb-4">
                  Our free service connects you with verified rehab centers.
                </p>
                <Link to="/concierge">
                  <Button variant="secondary" size="sm" className="w-full bg-white text-primary hover:bg-white/90">
                    Get Free Help
                  </Button>
                </Link>
              </div>

              {/* Category-Aware Internal Linking for SEO */}
              <ArticleCategoryLinks category={article.category} />
              <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
                <h3 className="font-display text-base font-semibold text-foreground mb-2">
                  Explore More
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Discover our full library of recovery guides.
                </p>
                <Link to="/resources">
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    View All Articles
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Internal Linking Section for SEO */}
      <InternalLinkingSection
        title="Explore More Recovery Resources"
        description="Find comprehensive guides and treatment options to support your recovery journey."
        groups={[
          { title: "Treatment Types", links: treatmentTypeLinks },
          { title: "Find Treatment Near You", links: nearMeLinks.slice(0, 6) },
          { title: "Insurance Coverage", links: insuranceLinks },
        ]}
        variant="grid"
      />

      {/* CTA */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-8 md:p-10 text-center text-white shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            
            <div className="relative">
              <div className="mb-3 mx-auto h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center">
                <Heart className="h-6 w-6" />
              </div>
              <h2 className="mb-2 font-display text-xl font-bold md:text-2xl">
                Ready to Start Your Recovery?
              </h2>
              <p className="mb-6 text-sm text-white/80 max-w-md mx-auto">
                Find verified treatment centers near you and take the first step toward a healthier future.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/rehab-centers">
                  <Button size="lg" variant="secondary" className="gap-2 bg-white text-primary hover:bg-white/90 shadow-lg">
                    Find Treatment Centers
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
    </Layout>
  );
};

export default ArticleDetail;
