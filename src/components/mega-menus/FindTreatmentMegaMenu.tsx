import { useState, useCallback } from "react";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MapPin, Search, ArrowRight, Pill, Wine, Brain, Building2, Heart,
  Sparkles, Activity, Users, Shield,
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
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onNavigate?.();
    navigate(`/rehab-centers${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`);
  }, [searchQuery, navigate, onNavigate]);

  return (
    <div className="w-[700px] max-w-[92vw]">
      {/* Compact search */}
      <div className="px-4 pt-3.5 pb-2.5">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by city, state, or treatment type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-20 rounded-lg border border-border bg-muted/30 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
          />
          <button
            type="submit"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-3.5 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Horizontal layout — no CTA panel, just content */}
      <div className="flex border-t border-border/40">
        {/* Treatment Types — compact 2-col grid */}
        <div className="flex-1 p-3 border-r border-border/30">
          <p className="text-[10px] font-bold text-accent uppercase tracking-[0.12em] px-1.5 mb-1.5 flex items-center gap-1">
            <Shield className="h-2.5 w-2.5" /> Treatment Types
          </p>
          <div className="grid grid-cols-2 gap-x-1 gap-y-0">
            {treatmentTypes.map((item) => (
              <PrefetchLink
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className="group flex items-center gap-2 rounded-md px-1.5 py-[5px] hover:bg-accent/[0.05] transition-colors"
              >
                <item.icon className="h-3.5 w-3.5 text-accent/70 group-hover:text-accent shrink-0" />
                <span className="text-[12px] text-foreground/80 group-hover:text-foreground">{item.label}</span>
              </PrefetchLink>
            ))}
          </div>
          <PrefetchLink to="/treatment-types" onClick={onNavigate}
            className="inline-flex items-center gap-1 px-1.5 pt-1 text-[11px] font-semibold text-primary hover:text-primary/80">
            All types <ArrowRight className="h-2.5 w-2.5" />
          </PrefetchLink>
        </div>

        {/* Locations + Near Me — stacked */}
        <div className="w-[200px] p-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] px-1.5 mb-1.5 flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" /> Locations
          </p>
          <div className="grid grid-cols-2 gap-x-1 gap-y-0 mb-2">
            {popularLocations.map((loc) => (
              <PrefetchLink
                key={loc.href}
                to={loc.href}
                onClick={onNavigate}
                className="rounded-md px-1.5 py-[5px] text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                {loc.label}
              </PrefetchLink>
            ))}
          </div>

          <div className="border-t border-border/30 pt-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] px-1.5 mb-1">Near Me</p>
            {nearMePages.map((page) => (
              <PrefetchLink
                key={page.href}
                to={page.href}
                onClick={onNavigate}
                className="group flex items-center gap-1.5 rounded-md px-1.5 py-[4px] text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <Search className="h-2.5 w-2.5 text-accent/50 group-hover:text-accent" />
                {page.label}
              </PrefetchLink>
            ))}
          </div>
        </div>

        {/* Slim CTA strip */}
        <div className="w-[155px] border-l border-border/30 bg-gradient-to-b from-primary/[0.03] to-accent/[0.03] p-3 flex flex-col justify-center">
          <p className="text-[12px] font-bold text-foreground leading-tight">Free Concierge</p>
          <p className="text-[10px] text-muted-foreground leading-snug mt-0.5 mb-2">
            We match you with the right facility — free.
          </p>
          <Link to="/concierge" onClick={onNavigate}>
            <Button size="sm" className="w-full gap-1 h-7 bg-accent text-accent-foreground hover:bg-accent/90 text-[11px] font-semibold shadow-sm">
              Get Matched <ArrowRight className="h-2.5 w-2.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function FindTreatmentMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate?.();
    navigate(`/rehab-centers${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`);
  };

  return (
    <div className="space-y-3 px-1">
      <form onSubmit={handleSearch} className="px-2 pt-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search centers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-muted/40 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </form>
      <div>
        <p className="text-[10px] font-bold text-accent uppercase tracking-[0.15em] px-3 mb-1.5">Treatment Types</p>
        {treatmentTypes.slice(0, 5).map((item) => (
          <PrefetchLink key={item.href} to={item.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <item.icon className="h-4 w-4 text-accent" />
            {item.label}
          </PrefetchLink>
        ))}
        <PrefetchLink to="/treatment-types" onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary font-medium">
          All Types <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-3 mb-1.5">Popular States</p>
        {popularLocations.slice(0, 4).map((loc) => (
          <PrefetchLink key={loc.href} to={loc.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <MapPin className="h-4 w-4 text-accent" />
            {loc.label}
          </PrefetchLink>
        ))}
      </div>
    </div>
  );
}
