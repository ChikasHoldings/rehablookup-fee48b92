import { PrefetchLink } from "@/components/PrefetchLink";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Star, Shield, MapPin, Plane, ChevronRight,
} from "lucide-react";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const countryPages = [
  { href: "/us-rehab/uk-patients", label: "United Kingdom & Ireland", flag: "🇬🇧" },
  { href: "/us-rehab/canadian-patients", label: "Canada", flag: "🇨🇦" },
  { href: "/us-rehab/european-patients", label: "Europe", flag: "🇪🇺" },
  { href: "/us-rehab/uae-middle-east", label: "UAE & Middle East", flag: "🇦🇪" },
  { href: "/us-rehab/australian-patients", label: "Australia & NZ", flag: "🇦🇺" },
];

const programTypes = [
  { href: "/us-rehab/luxury-rehab-america", label: "Luxury Rehab", icon: Star },
  { href: "/us-rehab/executive-rehab", label: "Executive Rehab", icon: Shield },
  { href: "/us-rehab/private-rehab-america", label: "Private Programs", icon: MapPin },
  { href: "/us-rehab/best-rehab-usa", label: "Best in USA", icon: Star },
];

export function InternationalMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[480px] max-w-[92vw] p-3.5">
      {/* Countries — horizontal-ish */}
      <div className="flex gap-4">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-accent uppercase tracking-[0.12em] px-1 mb-1.5">By Region</p>
          <div className="space-y-0">
            {countryPages.map((page) => (
              <PrefetchLink
                key={page.href}
                to={page.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-md px-2 py-[6px] hover:bg-primary/[0.04] transition-colors"
              >
                <span className="text-base leading-none w-5 text-center">{page.flag}</span>
                <span className="text-[12px] font-medium text-foreground/90 group-hover:text-primary transition-colors flex-1">{page.label}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-accent transition-colors" />
              </PrefetchLink>
            ))}
          </div>
        </div>

        {/* Programs + CTA */}
        <div className="w-[180px] border-l border-border/30 pl-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-1.5">Programs</p>
          <div className="space-y-0 mb-3">
            {programTypes.map((prog) => (
              <PrefetchLink
                key={prog.href}
                to={prog.href}
                onClick={onNavigate}
                className="group flex items-center gap-1.5 rounded-md px-1.5 py-[5px] text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent/[0.04] transition-colors"
              >
                <prog.icon className="h-3 w-3 text-accent/60 group-hover:text-accent" />
                {prog.label}
              </PrefetchLink>
            ))}
          </div>
          <Link to="/international/apply" onClick={onNavigate}>
            <Button size="sm" className="w-full gap-1 h-7 bg-accent text-accent-foreground hover:bg-accent/90 text-[11px] font-semibold shadow-sm">
              <Plane className="h-3 w-3" />
              Apply Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function InternationalMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-3 px-1">
      <div>
        <p className="text-[10px] font-bold text-accent uppercase tracking-[0.15em] px-3 mb-1.5">By Country</p>
        {countryPages.map((page) => (
          <PrefetchLink key={page.href} to={page.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <span>{page.flag}</span>
            {page.label}
          </PrefetchLink>
        ))}
        <PrefetchLink to="/international/apply" onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary font-medium">
          Apply for Treatment <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
    </div>
  );
}
