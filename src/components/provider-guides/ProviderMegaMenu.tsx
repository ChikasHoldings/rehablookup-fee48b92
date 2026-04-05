import { Link } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Button } from "@/components/ui/button";
import {
  Building2, TrendingUp, Users, BookOpen, HelpCircle, Headphones,
  ArrowRight, Megaphone, Target, BarChart3, Lightbulb, Heart, Zap, Sparkles,
  CheckCircle,
} from "lucide-react";
import megaMenuImg from "@/assets/mega-menu-providers.jpg";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const seoPages = [
  { href: "/provider-guides/get-more-rehab-patients", label: "Get More Patients", desc: "Fill beds faster", icon: Users },
  { href: "/provider-guides/rehab-admissions-growth", label: "Grow Admissions", desc: "Sustainable pipeline", icon: TrendingUp },
  { href: "/provider-guides/rehab-marketing-strategies", label: "Marketing Strategies", desc: "What works in 2026", icon: Megaphone },
  { href: "/provider-guides/addiction-treatment-lead-generation", label: "Lead Generation", desc: "Quality leads", icon: Target },
  { href: "/provider-guides/increase-rehab-admissions", label: "Increase Admissions", desc: "Data-driven growth", icon: BarChart3 },
  { href: "/provider-guides/rehab-center-marketing-ideas", label: "Marketing Ideas", desc: "15 actionable ideas", icon: Lightbulb },
  { href: "/provider-guides/treatment-center-patient-acquisition", label: "Patient Acquisition", desc: "Compounding channels", icon: Zap },
  { href: "/provider-guides/behavioral-health-lead-generation", label: "Behavioral Health Leads", desc: "Ethical lead gen", icon: Heart },
];

const quickLinks = [
  { href: "/for-providers", label: "Why List With Us", icon: Building2 },
  { href: "/providers/resources", label: "Resource Hub", icon: BookOpen },
  { href: "/provider-faq", label: "FAQ", icon: HelpCircle },
  { href: "/provider-support", label: "Support", icon: Headphones },
];

const benefits = [
  "Free listing",
  "Verified patient leads",
  "Concierge placement",
  "Analytics dashboard",
];

export function ProviderMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[min(720px,calc(100vw-2rem))]">
      <div className="flex">
        {/* Left: Guides */}
        <div className="flex-1 p-5">
          <p className="text-xs font-bold text-accent uppercase tracking-[0.15em] px-1 mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Growth Guides
          </p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {seoPages.map((page) => (
              <PrefetchLink
                key={page.href}
                to={page.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-[7px] hover:bg-accent/[0.06] transition-colors"
              >
                <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
                  <page.icon className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-foreground leading-tight">{page.label}</p>
                  <p className="text-xs text-muted-foreground/90 leading-tight">{page.desc}</p>
                </div>
              </PrefetchLink>
            ))}
          </div>

          <div className="flex items-center gap-3 border-t border-border/30 mt-3 pt-3 px-1">
            {quickLinks.map((link) => (
              <PrefetchLink
                key={link.href}
                to={link.href}
                onClick={onNavigate}
                className="group inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <link.icon className="h-3 w-3 text-accent/50 group-hover:text-accent" />
                {link.label}
              </PrefetchLink>
            ))}
          </div>
        </div>

        {/* Right: CTA card with image */}
        <div className="w-[230px] border-l border-border/30 bg-gradient-to-b from-primary/[0.04] to-transparent">
          <div className="relative h-[100px] overflow-hidden">
            <img
              src={megaMenuImg}
              alt="Provider dashboard"
              className="w-full h-full object-cover"
              loading="lazy"
              width={230}
              height={100}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>

          <div className="px-4 pb-4 -mt-4 relative">
            <p className="text-[14px] font-bold text-foreground mb-2">Grow Your Census</p>
            <div className="space-y-1.5 mb-3">
              {benefits.map((b) => (
                <div key={b} className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-accent shrink-0" />
                  <span className="text-xs text-muted-foreground">{b}</span>
                </div>
              ))}
            </div>
            <Link to="/provider-signup" onClick={onNavigate}>
              <Button size="sm" className="w-full gap-1.5 h-9 bg-accent text-accent-foreground hover:bg-accent/90 text-[12px] font-semibold shadow-sm">
                List Your Facility <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProviderMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-1">
      {/* Quick Links */}
      <div>
        <p className="text-xs font-bold text-accent uppercase tracking-[0.15em] px-3 mb-1.5 flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          For Providers
        </p>
        {quickLinks.map((link) => (
          <PrefetchLink key={link.href} to={link.href} onClick={onNavigate}
            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/[0.06] active:bg-accent/[0.1] transition-colors">
            <div className="h-9 w-9 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
              <link.icon className="h-4 w-4 text-accent" />
            </div>
            <p className="text-[15px] font-medium text-foreground leading-tight">{link.label}</p>
          </PrefetchLink>
        ))}
      </div>

      {/* Growth Guides */}
      <div className="border-t border-border/30 pt-2 mx-2">
        <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-[0.15em] px-1 mb-1.5 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Growth Guides
        </p>
        {seoPages.slice(0, 4).map((page) => (
          <PrefetchLink key={page.href} to={page.href} onClick={onNavigate}
            className="group flex items-center gap-3 rounded-lg px-2.5 py-2.5 hover:bg-accent/[0.06] active:bg-accent/[0.1] transition-colors">
            <div className="h-8 w-8 rounded bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
              <page.icon className="h-3.5 w-3.5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-foreground/80 leading-tight">{page.label}</p>
              <p className="text-xs text-muted-foreground/70 leading-tight mt-0.5">{page.desc}</p>
            </div>
          </PrefetchLink>
        ))}
        <PrefetchLink to="/providers/resources" onClick={onNavigate}
          className="flex items-center gap-1.5 px-2.5 py-2 text-sm text-accent font-semibold">
          All resources <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>

      {/* CTA */}
      <div className="mx-2 mt-1">
        <Link to="/provider-signup" onClick={onNavigate} className="block">
          <div className="rounded-lg bg-gradient-to-r from-accent/[0.08] to-primary/[0.06] border border-accent/15 p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">List Your Facility</p>
              <p className="text-xs text-muted-foreground leading-tight">Free listing • Verified leads</p>
            </div>
            <ArrowRight className="h-4 w-4 text-accent shrink-0" />
          </div>
        </Link>
      </div>
    </div>
  );
}

export const providerSEOPages = seoPages;
export const providerQuickLinks = quickLinks;
