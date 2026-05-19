import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, BookOpen, Pen, Users, User as UserIcon, ArrowRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://rehablookup.com";

type AuthorRole = "writer" | "medical_reviewer" | "editor" | "contributor";

interface AuthorRow {
  id: string;
  slug: string;
  name: string;
  credentials: string | null;
  role: AuthorRole;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  specialties: string[];
  display_order: number;
}

const ROLE_LABEL: Record<AuthorRole, string> = {
  writer: "Writer",
  medical_reviewer: "Medical Reviewer",
  editor: "Editor",
  contributor: "Contributor",
};

const ROLE_ICON: Record<AuthorRole, typeof UserIcon> = {
  writer: Pen,
  medical_reviewer: ShieldCheck,
  editor: BookOpen,
  contributor: Users,
};

function buildAuthorsItemListSchema(authors: AuthorRow[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "RehabLookup Editorial Team",
    description: "Writers, editors, and medical reviewers behind RehabLookup's guides on addiction treatment, recovery, and mental health.",
    numberOfItems: authors.length,
    itemListElement: authors.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Person",
        name: a.name,
        url: `${SITE_URL}/authors/${a.slug}`,
        jobTitle: a.title || ROLE_LABEL[a.role],
        image: a.photo_url || undefined,
      },
    })),
  };
}

function AuthorCard({ author }: { author: AuthorRow }) {
  const RoleIcon = ROLE_ICON[author.role];
  return (
    <Link
      to={`/authors/${author.slug}`}
      className="group flex flex-col rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-4">
        {author.photo_url ? (
          <img
            src={author.photo_url}
            alt={`${author.name} headshot`}
            className="h-14 w-14 rounded-full object-cover border border-border shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <RoleIcon className="h-6 w-6 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <Badge variant="outline" className="gap-1 border-primary/30 text-primary mb-1.5">
            <RoleIcon className="h-3 w-3" />
            {ROLE_LABEL[author.role]}
          </Badge>
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
            {author.name}
            {author.credentials && (
              <span className="text-muted-foreground font-medium"> , {author.credentials}</span>
            )}
          </h3>
          {author.title && (
            <p className="text-xs text-muted-foreground mt-0.5">{author.title}</p>
          )}
        </div>
      </div>
      {author.bio && (
        <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{author.bio}</p>
      )}
      {author.specialties.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {author.specialties.slice(0, 3).map((s) => (
            <span key={s} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {s}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default function Authors() {
  const { data: authors = [], isLoading } = useQuery({
    queryKey: ["authors-index"],
    queryFn: async (): Promise<AuthorRow[]> => {
      const { data, error } = await supabase
        .from("blog_authors")
        .select("id, slug, name, credentials, role, title, bio, photo_url, specialties, display_order")
        .eq("active", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AuthorRow[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const schema = authors.length > 0 ? buildAuthorsItemListSchema(authors) : null;

  return (
    <Layout>
      <SEO
        title="Editorial Team & Medical Reviewers | RehabLookup"
        description="Meet the writers, editors, and clinical reviewers behind RehabLookup's addiction-treatment guides. Every article is reviewed for clinical accuracy and adherence to current SAMHSA, NIDA, and ASAM guidance."
        canonical="/authors"
        structuredData={schema || undefined}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Authors", url: "/authors" },
        ]}
      />

      {/* Hero — AUTHORS index. Editorial library palette (matches
          Resources + CategoryHub). */}
      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/55">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.10),_transparent_55%)]" />
        <div className="container relative z-10 py-6 md:py-8">
          <BreadcrumbNav className="mb-3 [&_*]:!text-white/70 [&_a:hover]:!text-white" items={[{ label: "Authors" }]} />
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-100 backdrop-blur-sm ring-1 ring-amber-400/25">
              <ShieldCheck className="h-3 w-3" />
              Editorial Standards
            </div>
            <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              Our editorial team
            </h1>
            <p className="mt-2 text-sm md:text-base text-white/80 max-w-2xl leading-relaxed">
              Guides written and reviewed by editors with backgrounds in behavioral-health publishing, clinical care, and long-term recovery — checked against SAMHSA, NIDA, and ASAM criteria.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link to="/editorial-policy" className="gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Editorial policy
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-white/25 bg-white/5 text-white hover:bg-white/15 backdrop-blur-sm">
                <Link to="/medical-disclaimer" className="gap-1.5">
                  Medical disclaimer
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-10">
        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : authors.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              We're still building out the contributor list. Check back soon.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {authors.map((a) => (
              <AuthorCard key={a.id} author={a} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
