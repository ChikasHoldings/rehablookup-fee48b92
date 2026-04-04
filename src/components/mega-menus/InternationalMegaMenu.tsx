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
  { href: "/us-rehab/uk-patients", label: "United Kingdom & Ireland", flag: "🇬🇧", desc: "NHS referrals & travel support" },
  { href: "/us-rehab/canadian-patients", label: "Canada", flag: "🇨🇦", desc: "Cross-border treatment options" },
  { href: "/us-rehab/european-patients", label: "Europe", flag: "🇪🇺", desc: "ESTA guidance & coordination" },
  { href: "/us-rehab/uae-middle-east", label: "UAE & Middle East", flag: "🇦🇪", desc: "Culturally sensitive programs" },
  { href: "/us-rehab/australian-patients", label: "Australia & NZ", flag: "🇦🇺", desc: "Long-stay visa guidance" },
];

const programTypes = [
  { href: "/us-rehab/luxury-rehab-america", label: "Luxury Rehab", icon: Star },
  { href: "/us-rehab/executive-rehab", label: "Executive Rehab", icon: Shield },
  { href: "/us-rehab/private-rehab-america", label: "Private Programs", icon: MapPin },
  { href: "/us-rehab/best-rehab-usa", label: "Best in USA", icon: Star },
];

export function InternationalMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[620px] max-w-[92vw]">
      {/* Hero banner */}
      <div className="relative h-[90px] overflow-hidden rounded-t-xl">
        <img
          src={megaMenuImg}
          alt="US treatment destinations"
          className="w-full h-full object-cover"
          loading="lazy"
          width={620}
          height={90}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
        <div className="absolute inset-0 flex items-center px-6">
          <div>
            <p className="text-primary-foreground text-[15px] font-bold">World-Class Treatment in America</p>
            <p className="text-primary-foreground/80 text-[12px]">We help international patients access top US rehab facilities</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Country list */}
        <div className="grid grid-cols-1 gap-0.5 mb-4">
          {countryPages.map((page) => (
            <PrefetchLink
              key={page.href}
              to={page.href}
              onClick={onNavigate}
              className="group flex items-center gap-3.5 rounded-lg px-3 py-2.5 hover:bg-primary/[0.04] transition-colors"
            >
              <span className="text-xl leading-none w-7 text-center">{page.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">{page.label}</p>
                <p className="text-[11px] text-muted-foreground">{page.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent transition-colors shrink-0" />
            </PrefetchLink>
          ))}
        </div>

        {/* Bottom: Programs + CTA */}
        <div className="flex items-center gap-4 border-t border-border/40 pt-3">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-1.5 px-1">Popular Programs</p>
            <div className="flex flex-wrap gap-1.5">
              {programTypes.map((prog) => (
                <PrefetchLink
                  key={prog.href}
                  to={prog.href}
                  onClick={onNavigate}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-accent/[0.04] transition-all"
                >
                  <prog.icon className="h-3 w-3 text-accent/60 group-hover:text-accent" />
                  {prog.label}
                </PrefetchLink>
              ))}
            </div>
          </div>

          <Link to="/international/apply" onClick={onNavigate}>
            <Button size="sm" className="gap-1.5 h-9 bg-accent text-accent-foreground hover:bg-accent/90 text-[12px] font-semibold shadow-sm whitespace-nowrap px-5">
              <Plane className="h-3.5 w-3.5" />
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
