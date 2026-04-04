import { PrefetchLink } from "@/components/PrefetchLink";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MapPin, Search, ArrowRight, Pill, Wine, Brain, Building2, Heart,
  Sparkles, Shield, Activity, Users, ChevronRight,
} from "lucide-react";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const treatmentTypes = [
  { href: "/treatment-types/drug-addiction-treatment", label: "Drug Addiction", icon: Pill },
  { href: "/treatment-types/alcohol-rehabilitation", label: "Alcohol Rehab", icon: Wine },
  { href: "/treatment-types/dual-diagnosis-treatment", label: "Dual Diagnosis", icon: Brain },
  { href: "/treatment-types/detox-programs", label: "Detox Programs", icon: Activity },
  { href: "/treatment-types/residential-inpatient", label: "Inpatient Rehab", icon: Building2 },
  { href: "/treatment-types/outpatient-programs", label: "Outpatient", icon: Users },
  { href: "/treatment-types/holistic-treatment", label: "Holistic Therapy", icon: Heart },
  { href: "/treatment-types/luxury-rehab", label: "Luxury Rehab", icon: Sparkles },
];

const popularLocations = [
  { href: "/rehab-centers/california", label: "California" },
  { href: "/rehab-centers/florida", label: "Florida" },
  { href: "/rehab-centers/texas", label: "Texas" },
  { href: "/rehab-centers/new-york", label: "New York" },
  { href: "/rehab-centers/arizona", label: "Arizona" },
  { href: "/rehab-centers/colorado", label: "Colorado" },
];

const nearMePages = [
  { href: "/drug-rehab-near-me", label: "Drug Rehab Near Me" },
  { href: "/alcohol-rehab-near-me", label: "Alcohol Rehab Near Me" },
  { href: "/detox-near-me", label: "Detox Near Me" },
  { href: "/luxury-rehab-near-me", label: "Luxury Rehab Near Me" },
];

export function FindTreatmentMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[780px] max-w-[90vw] p-6">
      <div className="grid grid-cols-[1fr_1fr_200px] gap-6">
        {/* Treatment Types */}
        <div>
          <h3 className="text-[11px] font-bold text-accent uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-accent" />
            Treatment Types
          </h3>
          <div className="grid grid-cols-1 gap-0.5">
            {treatmentTypes.map((item) => (
              <PrefetchLink
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/[0.06] transition-all duration-200"
              >
                <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-all">
                  <item.icon className="h-3.5 w-3.5 text-accent" />
                </div>
                <span className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">{item.label}</span>
              </PrefetchLink>
            ))}
            <PrefetchLink
              to="/treatment-types"
              onClick={onNavigate}
              className="flex items-center gap-1.5 px-2.5 py-2 text-[13px] font-medium text-primary hover:underline mt-1"
            >
              All Treatment Types <ArrowRight className="h-3.5 w-3.5" />
            </PrefetchLink>
          </div>
        </div>

        {/* Locations + Near Me */}
        <div>
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Popular Locations
          </h3>
          <div className="grid grid-cols-2 gap-0.5 mb-5">
            {popularLocations.map((loc) => (
              <PrefetchLink
                key={loc.href}
                to={loc.href}
                onClick={onNavigate}
                className="group flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                <MapPin className="h-3.5 w-3.5 text-accent/70 group-hover:text-accent transition-colors" />
                {loc.label}
              </PrefetchLink>
            ))}
          </div>
          <PrefetchLink
            to="/locations"
            onClick={onNavigate}
            className="flex items-center gap-1.5 px-2.5 text-[13px] font-medium text-primary hover:underline mb-5"
          >
            All States <ArrowRight className="h-3.5 w-3.5" />
          </PrefetchLink>

          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Near Me
          </h3>
          <div className="space-y-0.5">
            {nearMePages.map((page) => (
              <PrefetchLink
                key={page.href}
                to={page.href}
                onClick={onNavigate}
                className="group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                <Search className="h-3.5 w-3.5 text-accent/70 group-hover:text-accent transition-colors" />
                {page.label}
              </PrefetchLink>
            ))}
          </div>
        </div>

        {/* CTA Panel */}
        <div className="border-l border-border/60 pl-5 flex flex-col">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Need Help?
          </h3>
          <div className="rounded-xl bg-gradient-to-br from-primary/[0.07] to-accent/[0.07] border border-primary/10 p-4 mt-auto">
            <p className="text-sm font-bold text-foreground mb-1">Free Treatment Matching</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Let our concierge team find the right facility for your needs.
            </p>
            <Link to="/concierge" onClick={onNavigate}>
              <Button size="sm" className="w-full gap-1.5 h-9 bg-accent text-accent-foreground hover:bg-accent/90 text-[13px] font-semibold shadow-sm">
                Get Matched Free
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <PrefetchLink
            to="/rehab-centers"
            onClick={onNavigate}
            className="flex items-center gap-1.5 mt-4 text-[13px] font-medium text-primary hover:underline justify-center"
          >
            <Search className="h-3.5 w-3.5" />
            Search All Facilities
          </PrefetchLink>
        </div>
      </div>
    </div>
  );
}

export function FindTreatmentMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-4 px-1">
      <div>
        <p className="text-[11px] font-bold text-accent uppercase tracking-[0.15em] px-3 mb-2">Treatment Types</p>
        {treatmentTypes.slice(0, 5).map((item) => (
          <PrefetchLink key={item.href} to={item.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <item.icon className="h-4 w-4 text-accent" />
            {item.label}
          </PrefetchLink>
        ))}
        <PrefetchLink to="/treatment-types" onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 text-sm text-primary font-medium">
          All Types <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-3 mb-2">Popular States</p>
        {popularLocations.slice(0, 4).map((loc) => (
          <PrefetchLink key={loc.href} to={loc.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <MapPin className="h-4 w-4 text-accent" />
            {loc.label}
          </PrefetchLink>
        ))}
        <PrefetchLink to="/locations" onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 text-sm text-primary font-medium">
          All Locations <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
    </div>
  );
}
