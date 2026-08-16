import { PrefetchLink } from "@/components/PrefetchLink";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BookOpen, ArrowRight, Shield, DollarSign, HelpCircle, FileText,
  Sparkles, Calculator, Heart, ChevronRight, Layers,
} from "lucide-react";
import { ALL_BLOG_CATEGORIES } from "@/data/blogCategories";

interface MegaMenuProps {
  onNavigate?: () => void;
}

// Phase AA fix: every href below must resolve to a row in
// public.blog_articles with status='published'. The previous list
// hard-coded 6 slugs but only one (detox-timeline) actually had a
// matching article — the other 5 hit ArticleDetail's not-found
// branch and silently redirected to /resources, which is why every
// mega-menu item appeared to "fall back to the main page".
//
// If you add a new entry here:
//   1. Confirm the slug exists in blog_articles
//      (SELECT slug FROM blog_articles WHERE slug = ? AND status='published')
//   2. The smoke test below scans this file for /resources/<slug> hrefs
//      and asserts they all resolve.
const guides = [
  { href: "/resources/youth-addiction-warning-signs", label: "Signs of Addiction", desc: "Recognize warning signs early", icon: Heart },
  { href: "/resources/drug-withdrawal-symptoms-timeline", label: "Withdrawal Timeline", desc: "What to expect during detox", icon: FileText },
  { href: "/resources/insurance-appeal-rehab-denial", label: "Insurance Appeals", desc: "Fight a denied claim", icon: Shield },
  { href: "/resources/how-much-does-rehab-cost-per-day", label: "Paying for Rehab", desc: "Cost breakdown by program", icon: DollarSign },
  { href: "/resources/detox-timeline", label: "Detox Timeline", desc: "What happens during detox", icon: Sparkles },
  { href: "/resources/how-to-find-good-rehab", label: "Choosing a Program", desc: "15 questions to ask first", icon: BookOpen },
];

// Directory-model rules for this list:
//
//   • No RehabLookup-operated service offers. "Verify Insurance (Free) — Free
//     VOB by our care team" (/insurance-verification) was removed here: the
//     directory does not run benefits verification, facilities' admissions
//     teams do. The legacy page itself is untouched and still routed; it is
//     simply no longer marketed from global navigation.
//   • No matching/placement framing. "How It Works — Our matching process"
//     (/how-it-works) was removed for the same reason. That page still carries
//     specialist/24-7 operational copy of its own, so it is deliberately
//     unlinked from global nav until it gets a scoped content pass (tracked in
//     docs/directory-cutover-premerge-public-navigation.md).
//   • Insurance is now a top-level nav item; the hub stays here because the
//     carrier index is genuinely a resource, not a duplicate of the nav entry.
const tools = [
  { href: "/cost-estimator", label: "Cost Estimator", desc: "Get instant estimates", icon: Calculator },
  { href: "/insurance", label: "Insurance Hub", desc: "Coverage by carrier", icon: Shield },
  { href: "/faq", label: "FAQ", desc: "Common questions", icon: HelpCircle },
];

export function ResourcesMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[min(680px,calc(100vw-2rem))]">
      <div className="flex">
        {/* Left: Guides with icon badges */}
        <div className="flex-1 px-5 py-4 border-r border-border/30">
          <p className="text-[10px] font-bold text-accent uppercase tracking-[0.18em] px-1 mb-2.5 flex items-center gap-1.5">
            <BookOpen className="h-3 w-3" />
            Guides & Articles
            <span className="ml-auto text-[10px] font-semibold text-foreground/40">6 featured</span>
          </p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {guides.map((guide) => (
              <PrefetchLink
                key={guide.href}
                to={guide.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-[7px] hover:bg-accent/[0.06] transition-colors"
              >
                <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
                  <guide.icon className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-foreground leading-tight">{guide.label}</p>
                  <p className="text-xs text-muted-foreground/90 leading-tight">{guide.desc}</p>
                </div>
              </PrefetchLink>
            ))}
          </div>
          <PrefetchLink to="/resources" onClick={onNavigate}
            className="inline-flex items-center gap-1 px-2 pt-2 text-xs font-semibold text-accent hover:text-accent/80">
            All resources <ArrowRight className="h-3 w-3" />
          </PrefetchLink>

          {/* Topic hubs — canonical category landing pages */}
          <div className="mt-3 pt-3 border-t border-border/30">
            <p className="text-[10px] font-bold text-accent uppercase tracking-[0.18em] px-1 mb-2 flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-accent" />
              Topic hubs
            </p>
            <div className="flex flex-wrap gap-1.5 px-1">
              {ALL_BLOG_CATEGORIES.map((cat) => (
                <PrefetchLink
                  key={cat.slug}
                  to={`/resources/category/${cat.slug}`}
                  onClick={onNavigate}
                  className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {cat.label}
                </PrefetchLink>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Tools + CTA */}
        <div className="w-[220px] px-4 py-4">
          <p className="text-[10px] font-bold text-accent uppercase tracking-[0.18em] px-1 mb-2.5 flex items-center gap-1.5">
            <Calculator className="h-3 w-3 text-accent" />
            Tools & Answers
            <span className="ml-auto text-[10px] font-semibold text-foreground/40">{tools.length} tools</span>
          </p>
          <div className="space-y-0">
            {tools.map((tool) => (
              <PrefetchLink
                key={tool.href}
                to={tool.href}
                onClick={onNavigate}
                className="group flex items-center gap-2 rounded-md px-2 py-[7px] hover:bg-muted/40 transition-colors"
              >
                <ChevronRight className="h-3 w-3 text-border group-hover:text-accent transition-colors shrink-0" />
                <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground leading-tight">{tool.label}</p>
              </PrefetchLink>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="rounded-lg bg-gradient-to-br from-primary/[0.06] to-accent/[0.06] border border-primary/10 p-3">
              <p className="text-sm font-bold text-foreground mb-0.5">Looking for a center?</p>
              <p className="text-xs text-muted-foreground leading-snug mb-2.5">
                Search and compare licensed treatment providers.
              </p>
              <Link to="/search-results" onClick={onNavigate}>
                <Button size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold gap-1.5">
                  Search Centers <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResourcesMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-1">
      {/* Guides */}
      <div>
        <p className="text-[10px] font-bold text-accent uppercase tracking-[0.18em] px-3 mb-1.5 flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          Guides & Articles
        </p>
        {guides.slice(0, 5).map((guide) => (
          <PrefetchLink key={guide.href} to={guide.href} onClick={onNavigate}
            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/[0.06] active:bg-accent/[0.1] transition-colors">
            <div className="h-9 w-9 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
              <guide.icon className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-foreground leading-tight">{guide.label}</p>
              <p className="text-xs text-muted-foreground/80 leading-tight mt-0.5">{guide.desc}</p>
            </div>
          </PrefetchLink>
        ))}
        <PrefetchLink to="/resources" onClick={onNavigate}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-accent font-semibold">
          All resources <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>

        {/* Topic hubs — mobile */}
        <div className="border-t border-border/30 pt-2 mx-2 mt-1">
          <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-[0.15em] px-1 mb-1.5 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-accent" />
            Topic hubs
          </p>
          <div className="flex flex-wrap gap-1.5 px-1 pb-2">
            {ALL_BLOG_CATEGORIES.map((cat) => (
              <PrefetchLink
                key={cat.slug}
                to={`/resources/category/${cat.slug}`}
                onClick={onNavigate}
                className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground/80 hover:border-primary/40 active:bg-muted/40 transition-colors"
              >
                {cat.label}
              </PrefetchLink>
            ))}
          </div>
        </div>
      </div>

      {/* Tools & Answers */}
      <div className="border-t border-border/30 pt-2 mx-2">
        <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-[0.15em] px-1 mb-1.5 flex items-center gap-1.5">
          <Calculator className="h-3.5 w-3.5 text-accent" />
          Tools & Answers
        </p>
        {tools.map((tool) => (
          <PrefetchLink key={tool.href} to={tool.href} onClick={onNavigate}
            className="group flex items-center gap-2.5 rounded-md px-2.5 py-2.5 hover:bg-muted/40 active:bg-muted/60 transition-colors">
            <ChevronRight className="h-3.5 w-3.5 text-border group-hover:text-accent shrink-0" />
            <p className="text-[15px] font-medium text-foreground/80 group-hover:text-foreground leading-tight">{tool.label}</p>
          </PrefetchLink>
        ))}
      </div>
    </div>
  );
}
