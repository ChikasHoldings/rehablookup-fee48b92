import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  User as UserIcon,
  Linkedin,
  Mail,
  BookOpen,
  ArrowRight,
  Pen,
  Users,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://rehablookup.com";

interface AuthorRow {
  id: string;
  slug: string;
  name: string;
  credentials: string | null;
  role: "writer" | "medical_reviewer" | "editor" | "contributor";
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  email: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  specialties: string[];
}

interface AuthorArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category_label: string | null;
  image_url: string | null;
  read_time: string | null;
  published_at: string | null;
  role_on_article: "author" | "reviewer";
}

const ROLE_LABEL: Record<AuthorRow["role"], string> = {
  writer: "Writer",
  medical_reviewer: "Medical Reviewer",
  editor: "Editor",
  contributor: "Contributor",
};

const ROLE_ICON: Record<AuthorRow["role"], typeof UserIcon> = {
  writer: Pen,
  medical_reviewer: ShieldCheck,
  editor: BookOpen,
  contributor: Users,
};

function buildPersonSchema(author: AuthorRow) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    url: `${SITE_URL}/authors/${author.slug}`,
    image: author.photo_url || undefined,
    jobTitle: author.title || ROLE_LABEL[author.role],
    description: author.bio || undefined,
    sameAs: [
      author.linkedin_url || undefined,
      author.twitter_handle ? `https://twitter.com/${author.twitter_handle.replace(/^@/, "")}` : undefined,
    ].filter(Boolean) as string[],
    knowsAbout: author.specialties.length > 0 ? author.specialties : undefined,
    affiliation: {
      "@type": "Organization",
      name: "RehabLookup",
      url: SITE_URL,
    },
    worksFor: {
      "@type": "Organization",
      name: "RehabLookup",
      url: SITE_URL,
    },
  };
}

export default function AuthorProfile() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["author-profile", slug],
    enabled: !!slug,
    queryFn: async (): Promise<{ author: AuthorRow; articles: AuthorArticle[] } | null> => {
      if (!slug) return null;

      const { data: author, error } = await supabase
        .from("blog_authors")
        .select("id, slug, name, credentials, role, title, bio, photo_url, email, linkedin_url, twitter_handle, specialties")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      if (!author) return null;

      // Fetch articles where this person is either the writer or the
      // medical reviewer. We dedupe by article id in memory.
      const [byAuthor, byReviewer] = await Promise.all([
        supabase
          .from("blog_articles")
          .select("id, slug, title, excerpt, category_label, image_url, read_time, published_at")
          .eq("status", "published")
          .eq("author_id", author.id)
          .order("published_at", { ascending: false })
          .limit(50),
        supabase
          .from("blog_articles")
          .select("id, slug, title, excerpt, category_label, image_url, read_time, published_at")
          .eq("status", "published")
          .eq("medical_reviewer_id", author.id)
          .order("published_at", { ascending: false })
          .limit(50),
      ]);

      const seen = new Set<string>();
      const articles: AuthorArticle[] = [];
      for (const row of byAuthor.data ?? []) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        articles.push({ ...(row as Omit<AuthorArticle, "role_on_article">), role_on_article: "author" });
      }
      for (const row of byReviewer.data ?? []) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        articles.push({ ...(row as Omit<AuthorArticle, "role_on_article">), role_on_article: "reviewer" });
      }

      return { author: author as AuthorRow, articles };
    },
  });

  const author = data?.author;
  const articles = data?.articles ?? [];

  const personSchema = useMemo(() => (author ? buildPersonSchema(author) : null), [author]);

  if (isLoading) {
    return (
      <Layout>
        <section className="container py-10">
          <Skeleton className="h-6 w-40 mb-6" />
          <div className="flex items-start gap-5">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <section className="container py-10 text-center text-sm text-muted-foreground">
          We couldn't load this author profile. Please try again.
        </section>
      </Layout>
    );
  }

  if (!author) {
    return <Navigate to="/authors" replace />;
  }

  const RoleIcon = ROLE_ICON[author.role];

  return (
    <Layout>
      <SEO
        title={`${author.name}${author.credentials ? `, ${author.credentials}` : ""} | RehabLookup`}
        description={
          author.bio?.slice(0, 160) ||
          `${author.name} — ${ROLE_LABEL[author.role]} at RehabLookup. ${author.specialties.slice(0, 3).join(", ")}.`
        }
        canonical={`/authors/${author.slug}`}
        structuredData={personSchema || undefined}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Authors", url: "/authors" },
          { name: author.name, url: `/authors/${author.slug}` },
        ]}
      />

      {/* Hero */}
      <section className="border-b border-border bg-muted/30">
        <div className="container py-8 md:py-10">
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Authors", href: "/authors" },
              { label: author.name },
            ]}
          />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="shrink-0">
              {author.photo_url ? (
                <img
                  src={author.photo_url}
                  alt={`${author.name} headshot`}
                  className="h-24 w-24 rounded-full object-cover border-2 border-card shadow-sm"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-card shadow-sm">
                  <RoleIcon className="h-10 w-10 text-primary" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                  <RoleIcon className="h-3 w-3" />
                  {ROLE_LABEL[author.role]}
                </Badge>
                {author.specialties.slice(0, 3).map((s) => (
                  <Badge key={s} variant="secondary" className="text-[11px]">
                    {s}
                  </Badge>
                ))}
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {author.name}
                {author.credentials && (
                  <span className="ml-2 text-muted-foreground font-semibold text-xl">
                    , {author.credentials}
                  </span>
                )}
              </h1>
              {author.title && (
                <p className="mt-1 text-sm text-muted-foreground">{author.title}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {author.linkedin_url && (
                  <a
                    href={author.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </a>
                )}
                {author.email && (
                  <a
                    href={`mailto:${author.email}`}
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </a>
                )}
              </div>
            </div>
          </div>

          {author.bio && (
            <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-foreground/85">{author.bio}</p>
          )}
        </div>
      </section>

      {/* Articles */}
      <section className="container py-10">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5">
          <h2 className="font-display text-xl font-bold text-foreground">
            {author.role === "medical_reviewer" ? "Articles reviewed" : "Articles by this author"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {articles.length} article{articles.length === 1 ? "" : "s"}
          </p>
        </div>

        {articles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No published articles linked yet — check back soon.
              <div className="mt-4">
                <Button asChild variant="outline" size="sm">
                  <Link to="/resources" className="gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    Browse all guides
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <Link
                key={a.id}
                to={`/resources/${a.slug}`}
                className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="aspect-[16/9] bg-muted overflow-hidden">
                  <img
                    src={a.image_url || "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=400&fit=crop"}
                    alt={a.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex-1 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {a.role_on_article === "reviewer" && (
                      <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700 text-[10px] py-0">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        Reviewed
                      </Badge>
                    )}
                    {a.category_label && (
                      <span className="text-[11px] font-medium text-muted-foreground">{a.category_label}</span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {a.title}
                  </h3>
                  {a.excerpt && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{a.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
          <Link to="/authors" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            ← All authors
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link to="/editorial-policy" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Our editorial policy
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
