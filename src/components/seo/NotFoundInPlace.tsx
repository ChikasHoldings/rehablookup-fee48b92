import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

interface NotFoundInPlaceProps {
  /** Headline shown above the back CTA. */
  title?: string;
  /** Paragraph body explaining what wasn't found. */
  message?: string;
  /** Primary "go back to a known page" link. */
  backTo: string;
  /** Label for the primary back link. */
  backLabel?: string;
  /** Optional second CTA — defaults to home. */
  secondaryTo?: string;
  secondaryLabel?: string;
  /** Document title for the 404 page (also used as SEO title). */
  seoTitle?: string;
}

/**
 * In-place 404 page used when a route's data lookup misses
 * (unknown category, bad state slug, deleted article, etc.).
 *
 * Replaces the previous pattern of silently <Navigate />-ing to a
 * parent section page, which manifested to users as "every link
 * falls back to /resources" (or /treatment-types, /locations, etc.).
 * Phase AA introduced the in-place 404 for ArticleDetail; phase AB
 * generalizes the pattern across the 18 SEO landing pages that had
 * the same silent-fallback handler.
 *
 * SEO: always noindex. We never want fuzzed / typo / deleted URLs
 * to be indexed as duplicate content of the parent section page.
 */
export function NotFoundInPlace({
  title = "We couldn't find that page",
  message = "The page you were looking for isn't available right now — it may have been moved or doesn't exist yet.",
  backTo,
  backLabel = "Go back",
  secondaryTo = "/",
  secondaryLabel = "Back to home",
  seoTitle = "Page not found — RehabLookup",
}: NotFoundInPlaceProps) {
  return (
    <Layout>
      <SEO
        title={seoTitle}
        description="The page you were looking for couldn't be found."
        noindex
      />
      <main className="container mx-auto px-4 py-16 md:py-24 max-w-2xl text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-6">
          <span className="text-2xl font-bold text-muted-foreground" aria-hidden>?</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          {title}
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to={backTo}>{backLabel}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={secondaryTo}>{secondaryLabel}</Link>
          </Button>
        </div>
      </main>
    </Layout>
  );
}
