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
  DollarSign,
  Settings,
  Globe,
  Star,
  Shield,
  Clock,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const growthGuides = [
  { href: "/provider-guides/get-more-rehab-patients", label: "Get More Patients", desc: "Fill beds with proven strategies", icon: Users },
  { href: "/provider-guides/rehab-admissions-growth", label: "Grow Admissions", desc: "Build a sustainable pipeline", icon: TrendingUp },
  { href: "/provider-guides/increase-rehab-admissions", label: "Increase Admissions", desc: "Data-driven census growth", icon: BarChart3 },
  { href: "/provider-guides/treatment-center-patient-acquisition", label: "Patient Acquisition", desc: "Channels that compound", icon: Zap },
];

const marketingGuides = [
  { href: "/provider-guides/rehab-marketing-strategies", label: "Marketing Strategies", desc: "What works in 2026", icon: Megaphone },
  { href: "/provider-guides/rehab-center-marketing-ideas", label: "Marketing Ideas", desc: "15 actionable tactics", icon: Lightbulb },
  { href: "/provider-guides/addiction-treatment-lead-generation", label: "Lead Generation", desc: "Quality leads that convert", icon: Target },
  { href: "/provider-guides/behavioral-health-lead-generation", label: "Behavioral Health", desc: "Ethical lead gen for BH", icon: Heart },
];

const resourceCategories = [
  { href: "/providers/resources", label: "Resource Hub", desc: "Guides, playbooks & insights", icon: BookOpen },
  { href: "/for-providers", label: "Why RehabLookup", desc: "Platform overview & benefits", icon: Building2 },
  { href: "/how-it-works", label: "How It Works", desc: "From listing to admission", icon: Settings },
  { href: "/concierge", label: "Concierge Placement", desc: "Premium placement service", icon: Star },
];

const supportLinks = [
  { href: "/provider-faq", label: "Provider FAQ", icon: HelpCircle },
  { href: "/provider-support", label: "Get Support", icon: Headphones },
];

const trustStats = [
  { icon: Users, value: "50,000+", label: "Monthly Seekers" },
  { icon: Shield, value: "Free", label: "Basic Listing" },
  { icon: Clock, value: "< 24hr", label: "Lead Delivery" },
];

export function ProviderMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[820px] max-w-[92vw]">
      {/* Main content grid */}
      <div className="grid grid-cols-[1fr_1fr_220px] gap-0">
        {/* Column 1: Growth & Admissions */}
        <div className="p-5 pr-4">
          <h3 className="text-[11px] font-semibold text-primary uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" />
            Growth & Admissions
          </h3>
          <div className="space-y-0.5">
            {growthGuides.map((page) => (
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
                  <p className="text-sm font-medium text-foreground leading-tight group-hover:text-primary transition-colors">{page.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{page.desc}</p>
                </div>
              </PrefetchLink>
            ))}
          </div>
        </div>

        {/* Column 2: Marketing & Lead Gen */}
        <div className="p-5 px-4 border-l border-border/50">
          <h3 className="text-[11px] font-semibold text-primary uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Megaphone className="h-3 w-3" />
            Marketing & Lead Gen
          </h3>
          <div className="space-y-0.5">
            {marketingGuides.map((page) => (
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
                  <p className="text-sm font-medium text-foreground leading-tight group-hover:text-primary transition-colors">{page.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{page.desc}</p>
                </div>
              </PrefetchLink>
            ))}
          </div>
        </div>

        {/* Column 3: Resources + CTA */}
        <div className="p-5 pl-4 border-l border-border/50 bg-muted/20">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Resources
          </h3>
          <div className="space-y-0.5 mb-4">
            {resourceCategories.map((link) => (
              <PrefetchLink
                key={link.href}
                to={link.href}
                onClick={onNavigate}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-background transition-colors"
              >
                <link.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-foreground/80 group-hover:text-foreground text-[13px] font-medium transition-colors">{link.label}</span>
              </PrefetchLink>
            ))}
          </div>

          <div className="border-t border-border/50 pt-3 mb-4">
            <div className="space-y-0.5">
              {supportLinks.map((link) => (
                <PrefetchLink
                  key={link.href}
                  to={link.href}
                  onClick={onNavigate}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-background transition-colors"
                >
                  <link.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-foreground/80 group-hover:text-foreground text-[13px] font-medium transition-colors">{link.label}</span>
                </PrefetchLink>
              ))}
            </div>
          </div>

          {/* CTA Card */}
          <div className="rounded-xl bg-primary text-primary-foreground p-3.5">
            <p className="text-sm font-bold mb-0.5">List Your Facility</p>
            <p className="text-xs text-primary-foreground/70 leading-snug mb-3">
              Free listing. Verified leads. Start in 5 minutes.
            </p>
            <Link to="/provider-signup" onClick={onNavigate}>
              <button className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary-foreground text-primary text-sm font-semibold py-2 hover:bg-primary-foreground/90 transition-colors">
                Get Started Free
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Trust bar at bottom */}
      <div className="border-t border-border/50 bg-muted/10 px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {trustStats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-1.5">
              <stat.icon className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
        <PrefetchLink
          to="/provider-signup"
          onClick={onNavigate}
          className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
        >
          Join now
          <ChevronRight className="h-3 w-3" />
        </PrefetchLink>
      </div>
    </div>
  );
}

/** Mobile version - vertical accordion-style for mobile menu */
export function ProviderMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-4 px-1">
      {/* Resources */}
      <div>
        {resourceCategories.map((link) => (
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
        <p className="text-xs font-semibold text-primary uppercase tracking-wider px-3 mb-2">
          Growth Guides
        </p>
        {[...growthGuides, ...marketingGuides].slice(0, 5).map((page) => (
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
          to="/providers/resources"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 text-sm text-primary font-medium"
        >
          View All Resources
          <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>

      {/* Support */}
      <div>
        {supportLinks.map((link) => (
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
    </div>
  );
}

/** Export lists for use in navigation data */
export const providerSEOPages = [...growthGuides, ...marketingGuides];
export const providerQuickLinks = [...resourceCategories, ...supportLinks];
