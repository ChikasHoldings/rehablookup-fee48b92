import { PrefetchLink } from "@/components/PrefetchLink";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Star, Shield, MapPin, Plane, ChevronRight, Globe,
  Building2, Heart, Sparkles,
} from "lucide-react";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const countryPages = [
  { href: "/international", label: "International Placement", flag: "🌐" },
  { href: "/us-rehab/uk-patients", label: "United Kingdom & Ireland", flag: "🇬🇧" },
  { href: "/us-rehab/canadian-patients", label: "Canada", flag: "🇨🇦" },
  { href: "/us-rehab/european-patients", label: "Europe", flag: "🇪🇺" },
  { href: "/us-rehab/uae-middle-east", label: "UAE & Middle East", flag: "🇦🇪" },
  { href: "/us-rehab/australian-patients", label: "Australia & New Zealand", flag: "🇦🇺" },
];

const usDestinations = [
  { href: "/rehab-centers/california", label: "California", desc: "Malibu, LA & San Diego" },
  { href: "/rehab-centers/florida", label: "Florida", desc: "Palm Beach & Miami" },
  { href: "/rehab-centers/arizona", label: "Arizona", desc: "Scottsdale & Sedona" },
  { href: "/rehab-centers/colorado", label: "Colorado", desc: "Mountain retreats" },
];

const programTypes = [
  { href: "/us-rehab/luxury-rehab-america", label: "Luxury Rehab", icon: Star },
  { href: "/us-rehab/executive-rehab", label: "Executive Rehab", icon: Shield },
  { href: "/us-rehab/private-rehab-america", label: "Private Programs", icon: Building2 },
  { href: "/us-rehab/best-rehab-usa", label: "Best in USA", icon: Sparkles },
  { href: "/fast-admission-rehab-usa", label: "Fast Admission", icon: Heart },
  { href: "/affordable-rehab-in-usa", label: "Affordable Rehab", icon: Globe },
];

export function InternationalMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[min(700px,calc(100vw-2rem))]">
      <div className="flex">
        {/* Left: Country pages */}
        <div className="flex-1 px-5 py-4 border-r border-border/30">
          <p className="text-xs font-bold text-accent uppercase tracking-[0.15em] px-1 mb-2.5 flex items-center gap-1.5">
            <Globe className="h-3 w-3" />
            International Patients
          </p>
          <div className="space-y-0">
            {countryPages.map((page) => (
              <PrefetchLink
                key={page.href}
                to={page.href}
                onClick={onNavigate}
                className="group flex items-center gap-3 rounded-lg px-2 py-[7px] hover:bg-accent/[0.06] transition-colors"
              >
                <span className="text-lg leading-none w-6 text-center">{page.flag}</span>
                <p className="text-sm font-semibold text-foreground group-hover:text-foreground leading-tight">{page.label}</p>
                <ChevronRight className="h-3 w-3 text-border group-hover:text-accent transition-colors shrink-0 ml-auto" />
              </PrefetchLink>
            ))}
          </div>

          {/* Programs as pills */}
          <div className="mt-3 pt-3 border-t border-border/30">
            <p className="text-xs font-bold text-foreground/70 uppercase tracking-[0.15em] px-1 mb-2">
              Popular Programs
            </p>
            <div className="flex flex-wrap gap-1.5 px-1">
              {programTypes.map((prog) => (
                <PrefetchLink
                  key={prog.href}
                  to={prog.href}
                  onClick={onNavigate}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground hover:border-accent/40 hover:bg-accent/[0.04] transition-all"
                >
                  <prog.icon className="h-3 w-3 text-accent" />
                  {prog.label}
                </PrefetchLink>
              ))}
            </div>
          </div>
        </div>

        {/* Right: US Destinations + CTA */}
        <div className="w-[240px] px-4 py-4">
          <p className="text-xs font-bold text-foreground/70 uppercase tracking-[0.15em] px-1 mb-2.5 flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-accent" />
            Top US Destinations
          </p>
          <div className="space-y-0">
            {usDestinations.map((dest) => (
              <PrefetchLink
                key={dest.href}
                to={dest.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-[7px] hover:bg-accent/[0.06] transition-colors"
              >
                <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
                  <MapPin className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{dest.label}</p>
                  <p className="text-xs text-muted-foreground/90 leading-tight">{dest.desc}</p>
                </div>
              </PrefetchLink>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-3 pt-3 border-t border-border/30">
            <Link to="/international/apply" onClick={onNavigate} className="group block">
              <div className="rounded-lg bg-gradient-to-br from-primary/[0.06] to-accent/[0.06] border border-primary/10 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Plane className="h-4 w-4 text-accent" />
                  <p className="text-sm font-bold text-foreground">Start Your Journey</p>
                </div>
                <p className="text-xs text-muted-foreground leading-snug mb-2.5">
                  We coordinate travel, visas & admissions for international patients.
                </p>
                <Button size="sm" className="w-full h-8 bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold gap-1.5">
                  Apply Now <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InternationalMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-1">
      {/* Countries */}
      <div>
        <p className="text-xs font-bold text-accent uppercase tracking-[0.15em] px-3 mb-1.5 flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" />
          International Patients
        </p>
        {countryPages.map((page) => (
          <PrefetchLink key={page.href} to={page.href} onClick={onNavigate}
            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/[0.06] active:bg-accent/[0.1] transition-colors">
            <span className="text-lg leading-none w-7 text-center">{page.flag}</span>
            <p className="text-[15px] font-medium text-foreground leading-tight">{page.label}</p>
            <ChevronRight className="h-3.5 w-3.5 text-border group-hover:text-accent shrink-0 ml-auto" />
          </PrefetchLink>
        ))}
      </div>

      {/* Popular Programs */}
      <div className="border-t border-border/30 pt-2 mx-2">
        <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-[0.15em] px-1 mb-2">
          Popular Programs
        </p>
        <div className="flex flex-wrap gap-2 px-1">
          {programTypes.map((prog) => (
            <PrefetchLink
              key={prog.href}
              to={prog.href}
              onClick={onNavigate}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border/50 px-3.5 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:border-accent/30 hover:bg-accent/[0.04] active:bg-accent/[0.08] transition-all"
            >
              <prog.icon className="h-3.5 w-3.5 text-accent" />
              {prog.label}
            </PrefetchLink>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-border/30 pt-2 mx-2">
        <PrefetchLink to="/international/apply" onClick={onNavigate}
          className="flex items-center gap-2 px-1 py-2 text-sm text-accent font-semibold">
          <Plane className="h-4 w-4" />
          Apply for Treatment <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
    </div>
  );
}
