import { PrefetchLink } from "@/components/PrefetchLink";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Globe, ArrowRight, MapPin, Star, Shield, Plane, ChevronRight,
} from "lucide-react";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const countryPages = [
  { href: "/us-rehab/uk-patients", label: "From UK & Ireland", flag: "🇬🇧" },
  { href: "/us-rehab/canadian-patients", label: "From Canada", flag: "🇨🇦" },
  { href: "/us-rehab/european-patients", label: "From Europe", flag: "🇪🇺" },
  { href: "/us-rehab/uae-middle-east", label: "From UAE & Middle East", flag: "🇦🇪" },
  { href: "/us-rehab/australian-patients", label: "From Australia", flag: "🇦🇺" },
];

const programTypes = [
  { href: "/us-rehab/luxury-rehab-america", label: "Luxury Rehab", icon: Star },
  { href: "/us-rehab/executive-rehab", label: "Executive Rehab", icon: Shield },
  { href: "/us-rehab/private-rehab-america", label: "Private Programs", icon: MapPin },
  { href: "/us-rehab/best-rehab-usa", label: "Best Rehab in USA", icon: Star },
];

export function InternationalMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[580px] max-w-[90vw] p-6">
      <div className="grid grid-cols-[1fr_200px] gap-6">
        {/* Left */}
        <div>
          <h3 className="text-[11px] font-bold text-accent uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-accent" />
            By Country / Region
          </h3>
          <div className="space-y-0.5 mb-5">
            {countryPages.map((page) => (
              <PrefetchLink
                key={page.href}
                to={page.href}
                onClick={onNavigate}
                className="group flex items-center gap-3 rounded-lg px-2.5 py-2.5 hover:bg-accent/[0.06] transition-all duration-200"
              >
                <span className="text-lg">{page.flag}</span>
                <span className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">{page.label}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary ml-auto transition-colors" />
              </PrefetchLink>
            ))}
          </div>

          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Popular Programs
          </h3>
          <div className="grid grid-cols-2 gap-0.5">
            {programTypes.map((prog) => (
              <PrefetchLink
                key={prog.href}
                to={prog.href}
                onClick={onNavigate}
                className="group flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                <prog.icon className="h-3.5 w-3.5 text-accent/70 group-hover:text-accent transition-colors" />
                {prog.label}
              </PrefetchLink>
            ))}
          </div>
        </div>

        {/* Right CTA */}
        <div className="border-l border-border/60 pl-5 flex flex-col">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Get Started
          </h3>

          <div className="rounded-xl bg-gradient-to-br from-primary/[0.07] to-accent/[0.07] border border-primary/10 p-4 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <Plane className="h-4 w-4 text-accent" />
              <p className="text-sm font-bold text-foreground">Apply for Treatment</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Visa guidance, travel coordination, and matched facilities.
            </p>
            <Link to="/international/apply" onClick={onNavigate}>
              <Button size="sm" className="w-full gap-1.5 h-9 bg-accent text-accent-foreground hover:bg-accent/90 text-[13px] font-semibold shadow-sm">
                Start Application
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <PrefetchLink
            to="/us-rehab"
            onClick={onNavigate}
            className="flex items-center gap-1.5 mt-4 text-[13px] font-medium text-primary hover:underline justify-center"
          >
            Browse All Programs
          </PrefetchLink>
        </div>
      </div>
    </div>
  );
}

export function InternationalMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-4 px-1">
      <div>
        <p className="text-[11px] font-bold text-accent uppercase tracking-[0.15em] px-3 mb-2">By Country</p>
        {countryPages.map((page) => (
          <PrefetchLink key={page.href} to={page.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <span>{page.flag}</span>
            {page.label}
          </PrefetchLink>
        ))}
        <PrefetchLink to="/international/apply" onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 text-sm text-primary font-medium">
          Apply for Treatment <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
    </div>
  );
}
