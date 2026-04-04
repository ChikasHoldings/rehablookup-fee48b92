import { useState } from "react";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MapPin, Search, ArrowRight, Pill, Wine, Brain, Building2, Heart,
  Sparkles, Activity, Users, ChevronRight,
} from "lucide-react";
import megaMenuImg from "@/assets/mega-menu-treatment.jpg";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const categories = [
  { id: "types", label: "Treatment Types" },
  { id: "locations", label: "By Location" },
  { id: "near-me", label: "Near Me" },
] as const;

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
  const [activeTab, setActiveTab] = useState<string>("types");

  return (
    <div className="w-[680px] max-w-[92vw]">
      {/* Top tab bar */}
      <div className="flex items-center border-b border-border/60 px-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onMouseEnter={() => setActiveTab(cat.id)}
            onClick={() => setActiveTab(cat.id)}
            className={`relative px-4 py-3 text-[13px] font-semibold transition-colors ${
              activeTab === cat.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.label}
            {activeTab === cat.id && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="flex">
        {/* Main content */}
        <div className="flex-1 p-4">
          {activeTab === "types" && (
            <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
              {treatmentTypes.map((item) => (
                <PrefetchLink
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-primary/[0.04] transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
                    <item.icon className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-[13px] font-medium text-foreground/90 group-hover:text-foreground transition-colors">{item.label}</span>
                </PrefetchLink>
              ))}
              <div className="col-span-2 pt-1">
                <PrefetchLink to="/treatment-types" onClick={onNavigate}
                  className="inline-flex items-center gap-1 px-3 text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors">
                  View all treatment types <ArrowRight className="h-3 w-3" />
                </PrefetchLink>
              </div>
            </div>
          )}

          {activeTab === "locations" && (
            <div>
              <div className="grid grid-cols-3 gap-1">
                {popularLocations.map((loc) => (
                  <PrefetchLink
                    key={loc.href}
                    to={loc.href}
                    onClick={onNavigate}
                    className="group flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-primary/[0.04] transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-accent" />
                    <span className="text-[13px] font-medium text-foreground/90 group-hover:text-foreground">{loc.label}</span>
                  </PrefetchLink>
                ))}
              </div>
              <div className="pt-2">
                <PrefetchLink to="/locations" onClick={onNavigate}
                  className="inline-flex items-center gap-1 px-3 text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors">
                  Browse all states <ArrowRight className="h-3 w-3" />
                </PrefetchLink>
              </div>
            </div>
          )}

          {activeTab === "near-me" && (
            <div className="space-y-0.5">
              {nearMePages.map((page) => (
                <PrefetchLink
                  key={page.href}
                  to={page.href}
                  onClick={onNavigate}
                  className="group flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-primary/[0.04] transition-colors"
                >
                  <Search className="h-4 w-4 text-accent" />
                  <div>
                    <span className="text-[13px] font-medium text-foreground/90 group-hover:text-foreground">{page.label}</span>
                    <p className="text-[11px] text-muted-foreground">Find verified centers near you</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 ml-auto group-hover:text-accent transition-colors" />
                </PrefetchLink>
              ))}
              <div className="pt-2">
                <PrefetchLink to="/rehab-centers" onClick={onNavigate}
                  className="inline-flex items-center gap-1 px-3 text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors">
                  Search all facilities <ArrowRight className="h-3 w-3" />
                </PrefetchLink>
              </div>
            </div>
          )}
        </div>

        {/* Right CTA panel */}
        <div className="w-[200px] border-l border-border/40 p-4 flex flex-col gap-3 bg-muted/30">
          <img
            src={megaMenuImg}
            alt="Treatment center"
            className="w-full h-24 object-cover rounded-lg"
            loading="lazy"
            width={200}
            height={96}
          />
          <div>
            <p className="text-[13px] font-bold text-foreground leading-tight">Free Treatment Matching</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              Let our team find the right facility for you.
            </p>
          </div>
          <Link to="/concierge" onClick={onNavigate}>
            <Button size="sm" className="w-full gap-1.5 h-8 bg-accent text-accent-foreground hover:bg-accent/90 text-[12px] font-semibold">
              Get Matched <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function FindTreatmentMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-3 px-1">
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
