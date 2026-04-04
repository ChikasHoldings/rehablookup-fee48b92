import { Link } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import {
  Building2,
  TrendingUp,
  Users,
  FileText,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const seoPages = [
  {
    href: "/provider-seo/get-more-rehab-patients",
    label: "Get More Patients",
    desc: "Proven strategies to fill beds faster",
    icon: Users,
  },
  {
    href: "/provider-seo/rehab-admissions-growth",
    label: "Grow Admissions",
    desc: "Build a sustainable admissions pipeline",
    icon: TrendingUp,
  },
  {
    href: "/provider-seo/rehab-marketing-strategies",
    label: "Marketing Strategies",
    desc: "What actually works in 2026",
    icon: Megaphone,
  },
  {
    href: "/provider-seo/addiction-treatment-lead-generation",
    label: "Lead Generation",
    desc: "Quality leads that convert to admissions",
    icon: Target,
  },
  {
    href: "/provider-seo/increase-rehab-admissions",
    label: "Increase Admissions",
    desc: "Data-driven census growth guide",
    icon: BarChart3,
  },
  {
    href: "/provider-seo/rehab-center-marketing-ideas",
    label: "Marketing Ideas",
    desc: "15 actionable ideas for treatment centers",
    icon: Lightbulb,
  },
  {
    href: "/provider-seo/treatment-center-patient-acquisition",
    label: "Patient Acquisition",
    desc: "Build channels that compound",
    icon: Zap,
  },
  {
    href: "/provider-seo/behavioral-health-lead-generation",
    label: "Behavioral Health Leads",
    desc: "Ethical lead gen for BH providers",
    icon: Heart,
  },
];

const quickLinks = [
  { href: "/for-providers", label: "Why List With Us", icon: Building2 },
  { href: "/provider-resources", label: "Resource Hub", icon: BookOpen },
  { href: "/provider-faq", label: "FAQ", icon: HelpCircle },
  { href: "/provider-support", label: "Support", icon: Headphones },
];

export function ProviderMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[680px] max-w-[90vw] p-5">
      <div className="grid grid-cols-[1fr_200px] gap-6">
        {/* Left: SEO Articles Grid */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Growth Guides
          </h3>
          <div className="grid grid-cols-2 gap-1">
            {seoPages.map((page) => (
              <PrefetchLink
                key={page.href}
                to={page.href}
                onClick={onNavigate}
                className="group flex items-start gap-2.5 rounded-lg p-2 hover:bg-muted/60 transition-colors"
              >
                <div className="h-8 w-8 rounded-md bg-primary/8 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/15 transition-colors">
                  <page.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">{page.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-1">{page.desc}</p>
                </div>
              </PrefetchLink>
            ))}
          </div>
        </div>

        {/* Right: Quick Links + CTA */}
        <div className="border-l border-border pl-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quick Links
          </h3>
          <div className="space-y-1 mb-5">
            {quickLinks.map((link) => (
              <PrefetchLink
                key={link.href}
                to={link.href}
                onClick={onNavigate}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <link.icon className="h-3.5 w-3.5" />
                {link.label}
              </PrefetchLink>
            ))}
          </div>

          {/* CTA */}
          <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
            <p className="text-sm font-semibold text-foreground mb-1">List Your Facility</p>
            <p className="text-xs text-muted-foreground leading-snug mb-3">
              Free listing. Verified leads. Start in 5 minutes.
            </p>
            <Link to="/provider-signup" onClick={onNavigate}>
              <button className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2 hover:bg-primary/90 transition-colors">
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
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </PrefetchLink>
        ))}
      </div>

      {/* Growth Guides */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
          Growth Guides
        </p>
        {seoPages.slice(0, 4).map((page) => (
          <PrefetchLink
            key={page.href}
            to={page.href}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <page.icon className="h-4 w-4" />
            {page.label}
          </PrefetchLink>
        ))}
        <PrefetchLink
          to="/provider-resources"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 text-sm text-primary font-medium"
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
