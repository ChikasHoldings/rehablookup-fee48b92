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
  Twitter,
  Facebook,
  Linkedin,
  Copy,
  Check,
} from "lucide-react";
import { ReactNode, useState, useMemo } from "react";
import { MidArticleCTA } from "@/components/articles/MidArticleCTA";

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
  content: string[];
  status: string;
  featured: boolean;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
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
const extractLinkedArticleIds = (content: string[]): string[] => {
  const linkPattern = /\[\[([^\]|]+)\|[^\]]+\]\]/g;
  const ids = new Set<string>();
  
  content.forEach((paragraph) => {
    let match;
    while ((match = linkPattern.exec(paragraph)) !== null) {
      ids.add(match[1]);
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
  const [copied, setCopied] = useState(false);

  // Fetch article from database
  const { data: article, isLoading, error } = useQuery({
    queryKey: ["article", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("slug", id)
        .eq("status", "published")
        .single();
      
      if (error) throw error;
      return data as DBArticle;
    },
    enabled: !!id,
  });

  // Fetch related articles (same category, excluding current)
  const { data: relatedArticles } = useQuery({
    queryKey: ["related-articles", article?.category, article?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_articles")
        .select("slug, title, excerpt, category_label, read_time, image_url")
        .eq("status", "published")
        .eq("category", article!.category)
        .neq("id", article!.id)
        .limit(3);
      return data || [];
    },
    enabled: !!article,
  });

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({ title: "Link copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

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

  // Render content paragraphs with markdown-like headers
  const renderContent = () => {
    return article.content.map((paragraph, index) => {
      // Check if it's a heading
      if (paragraph.startsWith("## ")) {
        return (
          <h2 key={index} className="font-display text-xl font-bold text-foreground mt-8 mb-4 scroll-mt-20">
            {paragraph.replace("## ", "")}
          </h2>
        );
      }

      // Regular paragraph with internal link parsing
      const isAfterMidpoint = index === Math.floor(article.content.length / 2);
      
      return (
        <div key={index}>
          {isAfterMidpoint && <MidArticleCTA />}
          <p className="text-muted-foreground leading-relaxed">
            {parseContentWithLinks(paragraph)}
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
        })}
      />

      {/* Hero */}
      <div className="bg-gradient-to-b from-muted/60 via-muted/30 to-background py-12 md:py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Link
              to="/resources"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Resources
            </Link>

            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                <BookOpen className="h-3.5 w-3.5" />
                {article.category_label}
              </span>
            </div>

            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl mb-6 leading-tight">
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
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>

              {/* Article Content */}
              <div className="prose prose-lg max-w-none space-y-6">
                {renderContent()}
              </div>

              {/* Share Section */}
              <div className="mt-12 pt-8 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p className="text-sm font-medium text-foreground">Share this article:</p>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Twitter className="h-4 w-4" />
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Facebook className="h-4 w-4" />
                    </a>
                    <a
                      href={`https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareTitle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                    <button
                      onClick={handleCopyLink}
                      className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Related Articles */}
              {relatedArticles && relatedArticles.length > 0 && (
                <div className="mt-12">
                  <h3 className="font-display text-xl font-bold text-foreground mb-6">Related Articles</h3>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {relatedArticles.map((related) => (
                      <Link
                        key={related.slug}
                        to={`/resources/${related.slug}`}
                        className="group rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30"
                      >
                        {related.image_url && (
                          <div className="relative rounded-lg overflow-hidden mb-3 aspect-[16/10]">
                            <img
                              src={related.image_url}
                              alt={related.title}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          </div>
                        )}
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary mb-2">
                          {related.category_label}
                        </span>
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {related.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">{related.read_time}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* Sidebar */}
            <aside className="lg:w-80 flex-shrink-0 space-y-6">
              {/* Further Reading */}
              {linkedArticles && linkedArticles.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
                  <h3 className="font-display text-base font-semibold text-foreground mb-4">
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

              {/* Quick Links */}
              <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
                <h3 className="font-display text-base font-semibold text-foreground mb-4">
                  Popular Articles
                </h3>
                <div className="space-y-2">
                  {allArticles?.slice(0, 5).map((a) => (
                    <Link
                      key={a.slug}
                      to={`/resources/${a.slug}`}
                      className="block py-2 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors line-clamp-2"
                    >
                      {a.title}
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

              {/* Browse More */}
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
            </aside>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-muted/50">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-8 md:p-12 text-center text-white shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            
            <div className="relative">
              <div className="mb-4 mx-auto h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center">
                <Heart className="h-7 w-7" />
              </div>
              <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">
                Ready to Start Your Recovery Journey?
              </h2>
              <p className="mb-8 text-white/80 max-w-xl mx-auto">
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
                    Find Treatment
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
