import { Link } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import {
  Building2,
  TrendingUp,
  Users,
  BookOpen,
  HelpCircle,
  Headphones,
  ArrowRight,
  Megaphone,
  Target,
  BarChart3,
  Lightbulb,
  Heart,
  Zap,
  Sparkles,
} from "lucide-react";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const seoPages = [
  {
    href: "/provider-guides/get-more-rehab-patients",
    label: "Get More Patients",
    desc: "Proven strategies to fill beds faster",
    icon: Users,
  },
  {
    href: "/provider-guides/rehab-admissions-growth",
    label: "Grow Admissions",
    desc: "Build a sustainable admissions pipeline",
    icon: TrendingUp,
  },
  {
    href: "/provider-guides/rehab-marketing-strategies",
    label: "Marketing Strategies",
    desc: "What actually works in 2026",
    icon: Megaphone,
  },
  {
    href: "/provider-guides/addiction-treatment-lead-generation",
    label: "Lead Generation",
    desc: "Quality leads that convert to admissions",
    icon: Target,
  },
  {
    href: "/provider-guides/increase-rehab-admissions",
    label: "Increase Admissions",
    desc: "Data-driven census growth guide",
    icon: BarChart3,
  },
  {
    href: "/provider-guides/rehab-center-marketing-ideas",
    label: "Marketing Ideas",
    desc: "15 actionable ideas for treatment centers",
    icon: Lightbulb,
  },
  {
    href: "/provider-guides/treatment-center-patient-acquisition",
    label: "Patient Acquisition",
    desc: "Build channels that compound",
    icon: Zap,
  },
  {
    href: "/provider-guides/behavioral-health-lead-generation",
    label: "Behavioral Health Leads",
    desc: "Ethical lead gen for BH providers",
    icon: Heart,
  },
];

const quickLinks = [
  { href: "/for-providers", label: "Why List With Us", icon: Building2 },
  { href: "/providers/resources", label: "Resource Hub", icon: BookOpen },
  { href: "/provider-faq", label: "FAQ", icon: HelpCircle },
  { href: "/provider-support", label: "Support", icon: Headphones },
];

export function ProviderMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[720px] max-w-[90vw] p-6">
      <div className="grid grid-cols-[1fr_210px] gap-8">
        {/* Left: Growth Guides */}
        <div>
          <h3 className="text-[11px] font-bold text-accent uppercase tracking-[0.15em] mb-4 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Growth Guides
          </h3>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {seoPages.map((page) => (
              <PrefetchLink
                key={page.href}
                to={page.href}
                onClick={onNavigate}
                className="group flex items-start gap-3 rounded-xl px-2.5 py-2.5 hover:bg-accent/[0.06] transition-all duration-200"
              >
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-accent/20 group-hover:shadow-sm transition-all duration-200">
                  <page.icon className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                    {page.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-1">
                    {page.desc}
                  </p>
                </div>
              </PrefetchLink>
            ))}
          </div>
        </div>

        {/* Right: Quick Links + CTA */}
        <div className="border-l border-border/60 pl-6 flex flex-col">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4">
            Quick Links
          </h3>
          <div className="space-y-0.5 mb-6">
            {quickLinks.map((link) => (
              <PrefetchLink
                key={link.href}
                to={link.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
              >
                <link.icon className="h-4 w-4 text-accent/70 group-hover:text-accent transition-colors" />
                {link.label}
              </PrefetchLink>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-auto rounded-xl bg-gradient-to-br from-primary/[0.07] to-accent/[0.07] border border-primary/10 p-4">
            <p className="text-sm font-bold text-foreground mb-1">
              List Your Facility
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Free listing. Verified leads. Start in 5 minutes.
            </p>
            <Link to="/provider-signup" onClick={onNavigate}>
              <button className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-accent text-accent-foreground text-[13px] font-semibold py-2 hover:bg-accent/90 shadow-sm hover:shadow-md transition-all duration-200">
                Get Started
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mobile version - vertical list for mobile menu */
export function ProviderMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-4 px-1">
      {/* Quick Links */}
      <div>
        {quickLinks.map((link) => (
          <PrefetchLink
            key={link.href}
            to={link.href}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <link.icon className="h-4 w-4 text-accent" />
            {link.label}
          </PrefetchLink>
        ))}
      </div>

      {/* Growth Guides */}
      <div>
        <p className="text-[11px] font-bold text-accent uppercase tracking-[0.15em] px-3 mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Growth Guides
        </p>
        {seoPages.slice(0, 4).map((page) => (
          <PrefetchLink
            key={page.href}
            to={page.href}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/[0.06] transition-colors"
          >
            <page.icon className="h-4 w-4 text-accent" />
            {page.label}
          </PrefetchLink>
        ))}
        <PrefetchLink
          to="/providers/resources"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 text-sm text-accent font-semibold"
        >
          View All Resources
          <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
    </div>
  );
}

/** Export the SEO pages list for use in navigation data */
export const providerSEOPages = seoPages;
export const providerQuickLinks = quickLinks;
