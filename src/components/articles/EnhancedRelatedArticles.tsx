import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, ExternalLink, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Article {
  slug: string;
  title: string;
  excerpt?: string;
  category_label?: string;
  read_time?: string;
  image_url?: string | null;
}

interface EnhancedRelatedArticlesProps {
  articles: Article[];
  title?: string;
  description?: string;
  variant?: "grid" | "list" | "compact";
  showImages?: boolean;
  className?: string;
}

export function EnhancedRelatedArticles({
  articles,
  title = "Related Articles",
  description,
  variant = "grid",
  showImages = true,
  className,
}: EnhancedRelatedArticlesProps) {
  if (!articles || articles.length === 0) return null;

  if (variant === "compact") {
    return (
      <div className={cn("rounded-xl border border-border/50 bg-card p-5", className)}>
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          {title}
        </h3>
        <div className="space-y-2">
          {articles.slice(0, 5).map((article) => (
            <Link
              key={article.slug}
              to={`/resources/${article.slug}`}
              className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
            >
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              <span className="line-clamp-1">{article.title}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-4", className)}>
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="space-y-3">
          {articles.map((article) => (
            <Link
              key={article.slug}
              to={`/resources/${article.slug}`}
              className="flex items-start gap-4 p-3 rounded-lg border border-border/50 bg-card hover:shadow-md hover:border-primary/30 transition-all group"
            >
              {showImages && article.image_url && (
                <div className="w-20 h-14 rounded-md overflow-hidden shrink-0">
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {article.category_label && (
                  <span className="text-xs font-medium text-primary">
                    {article.category_label}
                  </span>
                )}
                <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 text-sm">
                  {article.title}
                </h4>
                {article.read_time && (
                  <span className="text-xs text-muted-foreground">{article.read_time}</span>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Grid variant (default)
  return (
    <div className={cn("", className)}>
      <div className="mb-6">
        <h3 className="font-display text-xl font-bold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <Link
            key={article.slug}
            to={`/resources/${article.slug}`}
            className="group rounded-xl border bg-card overflow-hidden transition-all hover:shadow-lg hover:border-primary/30"
          >
            {showImages && article.image_url && (
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={article.image_url}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <div className="p-4">
              {article.category_label && (
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary mb-2">
                  {article.category_label}
                </span>
              )}
              <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {article.title}
              </h4>
              {article.excerpt && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {article.excerpt}
                </p>
              )}
              {article.read_time && (
                <span className="text-xs text-muted-foreground mt-2 block">
                  {article.read_time}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// You May Also Like section with highlighted styling
export function YouMayAlsoLike({
  articles,
  className,
}: {
  articles: Article[];
  className?: string;
}) {
  if (!articles || articles.length === 0) return null;

  return (
    <div className={cn("bg-muted/30 rounded-2xl p-6 border border-border/50", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-bold text-foreground">
          You May Also Like
        </h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {articles.slice(0, 4).map((article) => (
          <Link
            key={article.slug}
            to={`/resources/${article.slug}`}
            className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            {article.image_url && (
              <div className="w-16 h-12 rounded-md overflow-hidden shrink-0">
                <img
                  src={article.image_url}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {article.title}
              </h4>
              {article.category_label && (
                <span className="text-xs text-muted-foreground">
                  {article.category_label}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Inline article suggestion for mid-content placement
export function InlineArticleSuggestion({
  article,
  context,
  className,
}: {
  article: Article;
  context?: string;
  className?: string;
}) {
  return (
    <div className={cn("my-8 rounded-xl border-l-4 border-primary bg-primary/5 p-4", className)}>
      <p className="text-xs font-medium text-primary/80 mb-1">
        {context || "📚 Continue reading:"}
      </p>
      <Link
        to={`/resources/${article.slug}`}
        className="group flex items-center gap-2"
      >
        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
          {article.title}
        </span>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </Link>
    </div>
  );
}

// Category navigation for article browsing
export function ArticleCategoryNav({
  categories,
  currentCategory,
  className,
}: {
  categories: { value: string; label: string; count: number }[];
  currentCategory?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Link
        to="/resources"
        className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
          !currentCategory
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        All
      </Link>
      {categories.slice(0, 8).map((cat) => (
        <Link
          key={cat.value}
          to={`/resources?category=${cat.value}`}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            currentCategory === cat.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {cat.label}
          <span className="ml-1 opacity-70">({cat.count})</span>
        </Link>
      ))}
    </div>
  );
}
