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
  { href: "/provider-guides/get-more-rehab-patients", label: "Get More Patients", icon: Users },
  { href: "/provider-guides/rehab-admissions-growth", label: "Grow Admissions", icon: TrendingUp },
  { href: "/provider-guides/rehab-marketing-strategies", label: "Marketing Strategies", icon: Megaphone },
  { href: "/provider-guides/addiction-treatment-lead-generation", label: "Lead Generation", icon: Target },
  { href: "/provider-guides/increase-rehab-admissions", label: "Increase Admissions", icon: BarChart3 },
  { href: "/provider-guides/rehab-center-marketing-ideas", label: "Marketing Ideas", icon: Lightbulb },
  { href: "/provider-guides/treatment-center-patient-acquisition", label: "Patient Acquisition", icon: Zap },
  { href: "/provider-guides/behavioral-health-lead-generation", label: "Behavioral Health Leads", icon: Heart },
];

const quickLinks = [
  { href: "/for-providers", label: "Why List With Us", icon: Building2 },
  { href: "/providers/resources", label: "Resource Hub", icon: BookOpen },
  { href: "/provider-faq", label: "FAQ", icon: HelpCircle },
  { href: "/provider-support", label: "Support", icon: Headphones },
];

export function ProviderMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[680px] max-w-[92vw]">
      <div className="flex">
        {/* Left */}
        <div className="flex-1 p-4">
          <p className="text-[10px] font-bold text-accent uppercase tracking-[0.15em] px-2 mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-accent" />
            Growth Guides
          </p>
          <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
            {seoPages.map((page) => (
              <PrefetchLink
                key={page.href}
                to={page.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-primary/[0.04] transition-colors"
              >
                <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
                  <page.icon className="h-3.5 w-3.5 text-accent" />
                </div>
                <span className="text-[13px] font-medium text-foreground/90 group-hover:text-foreground">{page.label}</span>
              </PrefetchLink>
            ))}
          </div>

          <div className="border-t border-border/40 mt-3 pt-3">
            <div className="flex items-center gap-4">
              {quickLinks.map((link) => (
                <PrefetchLink
                  key={link.href}
                  to={link.href}
                  onClick={onNavigate}
                  className="group flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <link.icon className="h-3.5 w-3.5 text-accent/60 group-hover:text-accent" />
                  {link.label}
                </PrefetchLink>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-[190px] border-l border-border/40 p-4 flex flex-col gap-3 bg-muted/30">
          <img
            src={megaMenuImg}
            alt="Provider facility"
            className="w-full h-24 object-cover rounded-lg"
            loading="lazy"
            width={190}
            height={96}
          />
          <div>
            <p className="text-[13px] font-bold text-foreground leading-tight">List Your Facility</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              Free listing. Verified leads.
            </p>
          </div>
          <Link to="/provider-signup" onClick={onNavigate}>
            <Button size="sm" className="w-full gap-1 h-8 bg-accent text-accent-foreground hover:bg-accent/90 text-[12px] font-semibold">
              Get Started <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ProviderMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-3 px-1">
      <div>
        {quickLinks.map((link) => (
          <PrefetchLink key={link.href} to={link.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <link.icon className="h-4 w-4 text-accent" />
            {link.label}
          </PrefetchLink>
        ))}
      </div>
      <div>
        <p className="text-[10px] font-bold text-accent uppercase tracking-[0.15em] px-3 mb-1.5 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          Growth Guides
        </p>
        {seoPages.slice(0, 4).map((page) => (
          <PrefetchLink key={page.href} to={page.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/[0.06] transition-colors">
            <page.icon className="h-4 w-4 text-accent" />
            {page.label}
          </PrefetchLink>
        ))}
        <PrefetchLink to="/providers/resources" onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-accent font-semibold">
          View All Resources <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
    </div>
  );
}

export const providerSEOPages = seoPages;
export const providerQuickLinks = quickLinks;
