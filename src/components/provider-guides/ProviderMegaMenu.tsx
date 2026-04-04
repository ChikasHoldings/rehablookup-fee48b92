import { Link } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Button } from "@/components/ui/button";
import {
  Building2, TrendingUp, Users, BookOpen, HelpCircle, Headphones,
  ArrowRight, Megaphone, Target, BarChart3, Lightbulb, Heart, Zap, Sparkles,
} from "lucide-react";
import megaMenuImg from "@/assets/mega-menu-providers.jpg";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const seoPages = [
  { href: "/provider-guides/get-more-rehab-patients", label: "Get More Patients", desc: "Proven strategies to fill beds faster", icon: Users },
  { href: "/provider-guides/rehab-admissions-growth", label: "Grow Admissions", desc: "Build a sustainable pipeline", icon: TrendingUp },
  { href: "/provider-guides/rehab-marketing-strategies", label: "Marketing Strategies", desc: "What actually works in 2026", icon: Megaphone },
  { href: "/provider-guides/addiction-treatment-lead-generation", label: "Lead Generation", desc: "Quality leads that convert", icon: Target },
  { href: "/provider-guides/increase-rehab-admissions", label: "Increase Admissions", desc: "Data-driven census growth", icon: BarChart3 },
  { href: "/provider-guides/rehab-center-marketing-ideas", label: "Marketing Ideas", desc: "15 actionable ideas", icon: Lightbulb },
  { href: "/provider-guides/treatment-center-patient-acquisition", label: "Patient Acquisition", desc: "Channels that compound", icon: Zap },
  { href: "/provider-guides/behavioral-health-lead-generation", label: "Behavioral Health Leads", desc: "Ethical lead gen for BH", icon: Heart },
];

const quickLinks = [
  { href: "/for-providers", label: "Why List With Us", icon: Building2 },
  { href: "/providers/resources", label: "Resource Hub", icon: BookOpen },
  { href: "/provider-faq", label: "FAQ", icon: HelpCircle },
  { href: "/provider-support", label: "Support", icon: Headphones },
];

export function ProviderMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[780px] max-w-[90vw]">
      <div className="grid grid-cols-[1fr_220px]">
        {/* Left: Growth Guides + Quick Links */}
        <div className="p-5">
          <h3 className="text-[10px] font-bold text-accent uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Growth Guides
          </h3>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mb-4">
            {seoPages.map((page) => (
              <PrefetchLink
                key={page.href}
                to={page.href}
                onClick={onNavigate}
                className="group flex items-start gap-2.5 rounded-lg px-2.5 py-2.5 hover:bg-accent/[0.06] transition-all duration-200"
              >
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-accent/20 group-hover:shadow-sm transition-all duration-200">
                  <page.icon className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">{page.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-1">{page.desc}</p>
                </div>
              </PrefetchLink>
            ))}
          </div>

          <div className="border-t border-border/40 pt-3">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Quick Links</h3>
            <div className="grid grid-cols-4 gap-1">
              {quickLinks.map((link) => (
                <PrefetchLink
                  key={link.href}
                  to={link.href}
                  onClick={onNavigate}
                  className="group flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                >
                  <link.icon className="h-3.5 w-3.5 text-accent/70 group-hover:text-accent transition-colors" />
                  {link.label}
                </PrefetchLink>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="border-l border-border/50 p-4 flex flex-col bg-muted/20 rounded-r-xl">
          <div className="rounded-xl overflow-hidden mb-4 shadow-sm">
            <img
              src={megaMenuImg}
              alt="Provider facility"
              className="w-full h-28 object-cover"
              loading="lazy"
              width={220}
              height={112}
            />
          </div>

          <div className="rounded-xl bg-gradient-to-br from-primary/[0.08] to-accent/[0.08] border border-primary/10 p-4 flex-1 flex flex-col">
            <p className="text-sm font-bold text-foreground mb-1">List Your Facility</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3 flex-1">
              Free listing. Verified leads. Start receiving inquiries in minutes.
            </p>
            <Link to="/provider-signup" onClick={onNavigate}>
              <Button size="sm" className="w-full gap-1.5 h-9 bg-accent text-accent-foreground hover:bg-accent/90 text-[13px] font-semibold shadow-sm">
                Get Started
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <PrefetchLink
            to="/providers/resources"
            onClick={onNavigate}
            className="flex items-center gap-1.5 mt-3 text-[12px] font-medium text-primary hover:underline justify-center"
          >
            View All Resources
          </PrefetchLink>
        </div>
      </div>
    </div>
  );
}

export function ProviderMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-4 px-1">
      <div>
        {quickLinks.map((link) => (
          <PrefetchLink key={link.href} to={link.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <link.icon className="h-4 w-4 text-accent" />
            {link.label}
          </PrefetchLink>
        ))}
      </div>
      <div>
        <p className="text-[11px] font-bold text-accent uppercase tracking-[0.15em] px-3 mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Growth Guides
        </p>
        {seoPages.slice(0, 4).map((page) => (
          <PrefetchLink key={page.href} to={page.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/[0.06] transition-colors">
            <page.icon className="h-4 w-4 text-accent" />
            {page.label}
          </PrefetchLink>
        ))}
        <PrefetchLink to="/providers/resources" onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 text-sm text-accent font-semibold">
          View All Resources <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
    </div>
  );
}

export const providerSEOPages = seoPages;
export const providerQuickLinks = quickLinks;
