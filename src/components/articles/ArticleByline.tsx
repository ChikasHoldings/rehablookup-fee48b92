import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Calendar, ShieldCheck, User as UserIcon, BookOpen } from "lucide-react";

export interface BylineAuthor {
  slug: string;
  name: string;
  credentials: string | null;
  title: string | null;
  photo_url: string | null;
}

interface ArticleBylineProps {
  author?: BylineAuthor | null;
  /** Fallback when no author row is linked yet (legacy articles use freeform text). */
  authorFallback?: string;
  reviewer?: BylineAuthor | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  lastMedicallyReviewedAt?: string | null;
  readTime?: string | null;
  variant?: "default" | "compact";
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return format(new Date(value), "MMM d, yyyy");
  } catch {
    return null;
  }
}

function AuthorChip({ author, label, icon: Icon }: { author: BylineAuthor; label: string; icon: typeof UserIcon }) {
  return (
    <Link
      to={`/authors/${author.slug}`}
      className="group inline-flex items-center gap-2 rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      aria-label={`${label}: ${author.name}`}
    >
      {author.photo_url ? (
        <img
          src={author.photo_url}
          alt=""
          className="h-5 w-5 rounded-full object-cover border border-border"
          loading="lazy"
        />
      ) : (
        <span className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
          <Icon className="h-3 w-3 text-primary" />
        </span>
      )}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
        {author.name}
      </span>
      {author.credentials && (
        <span className="text-muted-foreground/80">, {author.credentials}</span>
      )}
    </Link>
  );
}

/**
 * E-E-A-T byline block. Renders:
 *  - "Written by" link → author profile (or fallback text for legacy rows)
 *  - "Medically reviewed by" link → reviewer profile (only when reviewer is set)
 *  - Published / Last reviewed dates
 *  - Read time
 *
 * Variants:
 *  - "default" — full stack with chips, used at the top of article-detail
 *  - "compact" — single inline row, used in cards and search-result lists
 */
export function ArticleByline({
  author,
  authorFallback,
  reviewer,
  publishedAt,
  updatedAt,
  lastMedicallyReviewedAt,
  readTime,
  variant = "default",
}: ArticleBylineProps) {
  const publishedDate = formatDate(publishedAt);
  const updatedDate = formatDate(updatedAt);
  const reviewedDate = formatDate(lastMedicallyReviewedAt);

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        {author ? (
          <Link to={`/authors/${author.slug}`} className="hover:text-foreground transition-colors">
            By <span className="font-medium text-foreground">{author.name}</span>
            {author.credentials && <span className="text-muted-foreground">, {author.credentials}</span>}
          </Link>
        ) : authorFallback ? (
          <span>By <span className="font-medium text-foreground">{authorFallback}</span></span>
        ) : null}
        {publishedDate && (
          <>
            <span aria-hidden>·</span>
            <span>{publishedDate}</span>
          </>
        )}
        {readTime && (
          <>
            <span aria-hidden>·</span>
            <span>{readTime}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {author ? (
          <AuthorChip author={author} label="Written by" icon={UserIcon} />
        ) : authorFallback ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
              <UserIcon className="h-3 w-3 text-primary" />
            </span>
            <span>Written by</span>
            <span className="font-semibold text-foreground">{authorFallback}</span>
          </span>
        ) : null}

        {reviewer && (
          <AuthorChip author={reviewer} label="Medically reviewed by" icon={ShieldCheck} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {publishedDate && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Published {publishedDate}
          </span>
        )}
        {updatedDate && updatedDate !== publishedDate && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Updated {updatedDate}
          </span>
        )}
        {reviewedDate && (
          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Medically reviewed {reviewedDate}
          </span>
        )}
        {readTime && (
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            {readTime}
          </span>
        )}
      </div>
    </div>
  );
}
