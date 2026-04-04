import { useState, useCallback } from "react";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MapPin, Search, ArrowRight, Pill, Wine, Brain, Building2, Heart,
  Sparkles, Activity, Users, Shield, ChevronRight,
} from "lucide-react";
import conciergeImg from "@/assets/images/concierge-matching.jpg";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const treatmentTypes = [
  { href: "/treatment-types/drug-addiction-treatment", label: "Drug Addiction", desc: "Evidence-based recovery", icon: Pill },
  { href: "/treatment-types/alcohol-rehabilitation", label: "Alcohol Rehab", desc: "Specialized programs", icon: Wine },
  { href: "/treatment-types/dual-diagnosis-treatment", label: "Dual Diagnosis", desc: "Co-occurring disorders", icon: Brain },
  { href: "/treatment-types/detox-programs", label: "Detox Programs", desc: "Medical detoxification", icon: Activity },
  { href: "/treatment-types/residential-inpatient", label: "Inpatient Rehab", desc: "24/7 residential care", icon: Building2 },
  { href: "/treatment-types/outpatient-programs", label: "Outpatient", desc: "Flexible scheduling", icon: Users },
  { href: "/treatment-types/holistic-treatment", label: "Holistic Therapy", desc: "Mind-body healing", icon: Heart },
  { href: "/treatment-types/luxury-rehab", label: "Luxury Rehab", desc: "Premium facilities", icon: Sparkles },
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
    <div className="w-[740px] max-w-[92vw]">
      {/* Premium search bar */}
      <div className="px-5 pt-4 pb-3">
        <form onSubmit={handleSearch} className="relative group/search">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-accent/15 flex items-center justify-center">
            <Search className="h-4 w-4 text-accent" />
          </div>
          <input
            type="text"
            placeholder="Search by city, state, or treatment type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-14 pr-28 rounded-xl border-2 border-accent/30 bg-accent/[0.04] text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 focus:bg-background transition-all shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-5 rounded-lg bg-accent text-accent-foreground text-[12px] font-semibold hover:bg-accent/90 transition-colors shadow-sm"
          >
            Search
          </button>
        </form>
      </div>

      <div className="flex">
        {/* Left: Treatment Types — 2-col with icon + desc */}
        <div className="flex-1 px-5 pb-4 pt-1 border-r border-border/30">
          <p className="text-[10px] font-bold text-accent uppercase tracking-[0.15em] px-1 mb-2 flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            Treatment Types
          </p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {treatmentTypes.map((item) => (
              <PrefetchLink
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-[7px] hover:bg-accent/[0.06] transition-colors"
              >
                <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
                  <item.icon className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground group-hover:text-foreground leading-tight">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground/90 leading-tight">{item.desc}</p>
                </div>
              </PrefetchLink>
            ))}
          </div>
          <PrefetchLink to="/treatment-types" onClick={onNavigate}
            className="inline-flex items-center gap-1 px-2 pt-2 text-[11px] font-semibold text-primary hover:text-primary/80">
            All treatment types <ArrowRight className="h-3 w-3" />
          </PrefetchLink>

          {/* Concierge CTA with Image */}
          <Link to="/concierge" onClick={onNavigate} className="group block mt-2.5">
            <div className="relative rounded-xl overflow-hidden h-[120px]">
              <img src={conciergeImg} alt="Free treatment matching" className="absolute inset-0 w-full h-full object-cover object-top" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/65 to-foreground/20" />
              <div className="relative h-full flex items-center justify-between px-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    <p className="text-[13px] font-bold text-white leading-tight">Free Concierge Matching</p>
                  </div>
                  <p className="text-[11px] text-white/75 leading-snug max-w-[260px]">Our specialists will match you with the right treatment center within 24 hours — completely free.</p>
                </div>
                <div className="h-8 px-4 rounded-lg bg-accent text-accent-foreground text-[11px] font-semibold flex items-center gap-1.5 shrink-0 group-hover:bg-accent/90 transition-colors shadow-md">
                  Get Matched <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Right: Locations + Near Me */}
        <div className="w-[235px] px-4 pb-4 pt-1">
          <p className="text-[11px] font-bold text-foreground/70 uppercase tracking-[0.15em] px-1 mb-2 flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-accent" />
            Popular Locations
          </p>
          <div className="grid grid-cols-2 gap-0">
            {popularLocations.map((loc) => (
              <PrefetchLink
                key={loc.href}
                to={loc.href}
                onClick={onNavigate}
                className="group flex items-center gap-1.5 rounded-md px-2 py-[6px] text-[13px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <ChevronRight className="h-3 w-3 text-border group-hover:text-accent transition-colors shrink-0" />
                {loc.label}
              </PrefetchLink>
            ))}
          </div>
          <PrefetchLink to="/locations" onClick={onNavigate}
            className="inline-flex items-center gap-1 px-2 pt-1.5 text-[11px] font-semibold text-primary hover:text-primary/80">
            All states <ArrowRight className="h-3 w-3" />
          </PrefetchLink>

          <div className="border-t border-border/30 pt-2.5 mt-2">
            <p className="text-[11px] font-bold text-foreground/70 uppercase tracking-[0.15em] px-1 mb-1.5">
              Near Me
            </p>
            {nearMePages.map((page) => (
              <PrefetchLink
                key={page.href}
                to={page.href}
                onClick={onNavigate}
                className="group flex items-center gap-1.5 rounded-md px-2 py-[5px] text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <Search className="h-3 w-3 text-accent/50 group-hover:text-accent shrink-0" />
                {page.label}
              </PrefetchLink>
            ))}
          </div>
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
