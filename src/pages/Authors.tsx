import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  BookOpen,
  Pen,
  Users,
  User as UserIcon,
  ArrowRight,
  FileCheck,
  MessageSquare,
  Stethoscope,
  Heart,
  Search,
  Scale,
  AlertCircle,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { TOPIC_HERO_IMAGES } from "@/data/locationImages";
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
        <img
          src={TOPIC_HERO_IMAGES.editorial}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-slate-950/55" />
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
        <div className="mb-8 max-w-3xl">
          <h2 className="font-display text-xl md:text-2xl font-bold text-foreground tracking-tight">
            Who writes our content
          </h2>
          <p className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed">
            RehabLookup is staffed by three editorial teams. The split keeps
            clinical content under clinical authorship, lived-experience content
            in the voice of people who have actually been through it, and
            evergreen directory guides under the editors who maintain them.
          </p>
        </div>
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

      {/* How we work — explains the editorial process step-by-step so
          the page isn't just a cards grid. Substance over filler: each
          step is something a reader can verify by reading a published
          article. */}
      <section className="border-y border-border bg-muted/30">
        <div className="container py-12 md:py-14">
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-3">
              <FileCheck className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Editorial Process
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              How an article reaches the page
            </h2>
            <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
              Every guide on RehabLookup moves through the same five steps before
              it publishes. We do this because addiction-treatment content is
              high-stakes — getting the clinical thresholds, the legal
              protections, or the cost math wrong can keep someone from
              treatment, or push them toward the wrong kind.
            </p>
          </div>

          <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 max-w-6xl mx-auto">
            {[
              {
                step: "1",
                icon: Search,
                title: "Research",
                body: "Primary sources only — SAMHSA, NIDA, HHS, ACOG, state behavioral-health authorities, federal statutes. No secondary aggregators.",
              },
              {
                step: "2",
                icon: Pen,
                title: "Draft",
                body: "Written in plain English by the team that owns the topic. Clinical claims are tagged for medical review.",
              },
              {
                step: "3",
                icon: Stethoscope,
                title: "Medical review",
                body: "Any clinical content — detox, MAT, withdrawal, dual-diagnosis — is reviewed by a licensed clinician before publication.",
              },
              {
                step: "4",
                icon: FileCheck,
                title: "Fact-check + edit",
                body: "Editor verifies every number, claim, statute citation, and link against the source. Plain-English pass.",
              },
              {
                step: "5",
                icon: BookOpen,
                title: "Publish + maintain",
                body: "Article goes live with the reviewer's name and date stamped. Updated when laws or clinical standards change.",
              },
            ].map((s) => (
              <li
                key={s.step}
                className="relative rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="absolute -top-3 left-5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {s.step}
                </div>
                <s.icon className="h-5 w-5 text-primary mb-3" />
                <h3 className="font-display text-base font-bold text-foreground mb-1.5">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What we stand for / what we don't do — directly addresses the
          two things readers want to know about a directory in this
          space: do you take money to rank facilities? do your articles
          push people toward in-house referrals? */}
      <section className="container py-12 md:py-14">
        <div className="grid gap-6 md:gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-6 md:p-7">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  What we stand for
                </h3>
              </div>
              <ul className="space-y-2.5 text-sm leading-relaxed text-foreground/85">
                <li className="flex gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span>Editorial content is independent from advertising. Featured Placements are visibly labeled as Featured.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span>Clinical content is reviewed by a licensed clinician before it publishes. Reviewer name + date appear on the article.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span>Recommendations cite SAMHSA, NIDA, ASAM, and ACOG — not in-house opinion dressed up as evidence.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span>Lived-experience pieces disclose the writer's relationship to the topic so readers can weigh the perspective.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span>Articles are updated when laws, parity rules, or clinical guidelines change — not left to rot.</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-rose-200 bg-rose-50/50">
            <CardContent className="p-6 md:p-7">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  What we don't do
                </h3>
              </div>
              <ul className="space-y-2.5 text-sm leading-relaxed text-foreground/85">
                <li className="flex gap-2">
                  <span className="text-rose-600 mt-0.5">•</span>
                  <span>We don't take placement fees to rank facilities higher in organic search results.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-rose-600 mt-0.5">•</span>
                  <span>We don't publish stock-portrait testimonials with marketing-voice recovery quotes — FTC + 42 CFR Part 2 risk.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-rose-600 mt-0.5">•</span>
                  <span>Articles do not constitute personal medical advice. They are educational and don't establish a clinician-patient relationship.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-rose-600 mt-0.5">•</span>
                  <span>We don't generate articles from AI without human research, editing, and clinical review. Bylines belong to real editors.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-rose-600 mt-0.5">•</span>
                  <span>We don't recommend a specific facility as "the best" — the right choice depends on diagnosis, insurance, location, and family situation.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50/60 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Heart className="h-4 w-4" />
            </div>
            <div className="text-sm leading-relaxed text-foreground/85">
              <p className="font-semibold text-foreground mb-1">If you or someone you love is in crisis</p>
              <p>
                Call <strong>911</strong> for a medical emergency. For mental-health or suicide crisis,
                call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline). For substance-use help
                24/7, call the SAMHSA national helpline at <strong>1-800-662-4357</strong> — free,
                confidential, and treatment-referral focused.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Get in touch / suggest a correction — the editorial team's
          public-facing surface for content corrections and topic
          requests. Builds credibility ("you can find us, we listen")
          and routes pull-requests through a single inbox. */}
      <section className="border-y border-border bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container py-12 md:py-14">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center max-w-5xl mx-auto">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-3">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Get in touch
                </span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-3">
                Spotted something we got wrong?
              </h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                We update articles when readers, clinicians, or treatment-center
                staff flag inaccuracies — laws change, clinical guidance
                evolves, and even careful sourcing can miss a state-specific
                edge case. If something looks off, tell us. Corrections go to
                the editor of record and are turned around within a few
                business days.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                to="/contact"
                className="group flex flex-col gap-1.5 rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <Scale className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Submit a correction</h3>
                <p className="text-xs text-muted-foreground">
                  Article fact, statute citation, or clinical-guideline reference that looks wrong.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all mt-1">
                  Contact form
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
              <Link
                to="/editorial-policy"
                className="group flex flex-col gap-1.5 rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Read our editorial policy</h3>
                <p className="text-xs text-muted-foreground">
                  How sourcing, review, conflict-of-interest, and updates are handled in detail.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all mt-1">
                  Full policy
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
              <Link
                to="/medical-disclaimer"
                className="group flex flex-col gap-1.5 rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all sm:col-span-2"
              >
                <Stethoscope className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Medical disclaimer</h3>
                <p className="text-xs text-muted-foreground">
                  What our medically-reviewed content is — and is not — meant to do.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all mt-1">
                  Read disclaimer
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
