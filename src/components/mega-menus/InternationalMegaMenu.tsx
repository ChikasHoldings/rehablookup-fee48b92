import { PrefetchLink } from "@/components/PrefetchLink";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Globe, ArrowRight, Star, Shield, MapPin, Plane, ChevronRight,
} from "lucide-react";
import megaMenuImg from "@/assets/mega-menu-international.jpg";

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
  { href: "/us-rehab/best-rehab-usa", label: "Best in USA", icon: Star },
];

export function InternationalMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[580px] max-w-[92vw]">
      <div className="flex">
        {/* Left */}
        <div className="flex-1 p-4">
          <p className="text-[10px] font-bold text-accent uppercase tracking-[0.15em] px-2 mb-2 flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-accent" />
            By Country / Region
          </p>
          <div className="space-y-0.5 mb-4">
            {countryPages.map((page) => (
              <PrefetchLink
                key={page.href}
                to={page.href}
                onClick={onNavigate}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-primary/[0.04] transition-colors"
              >
                <span className="text-lg leading-none">{page.flag}</span>
                <span className="text-[13px] font-medium text-foreground/90 group-hover:text-foreground flex-1">{page.label}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-accent transition-colors" />
              </PrefetchLink>
            ))}
          </div>

          <div className="border-t border-border/40 pt-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-2 mb-2">Programs</p>
            <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
              {programTypes.map((prog) => (
                <PrefetchLink
                  key={prog.href}
                  to={prog.href}
                  onClick={onNavigate}
                  className="group flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <prog.icon className="h-3.5 w-3.5 text-accent/70 group-hover:text-accent" />
                  {prog.label}
                </PrefetchLink>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-[190px] border-l border-border/40 p-4 flex flex-col gap-3 bg-muted/30">
          <img
            src={megaMenuImg}
            alt="US destination"
            className="w-full h-24 object-cover rounded-lg"
            loading="lazy"
            width={190}
            height={96}
          />
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Plane className="h-3.5 w-3.5 text-accent" />
              <p className="text-[13px] font-bold text-foreground leading-tight">Apply Now</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Visa help & travel coordination included.
            </p>
          </div>
          <Link to="/international/apply" onClick={onNavigate}>
            <Button size="sm" className="w-full gap-1 h-8 bg-accent text-accent-foreground hover:bg-accent/90 text-[12px] font-semibold">
              Start Application <ArrowRight className="h-3 w-3" />
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
