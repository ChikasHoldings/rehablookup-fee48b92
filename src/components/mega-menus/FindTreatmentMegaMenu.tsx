import { useState } from "react";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MapPin, Search, ArrowRight, Pill, Wine, Brain, Building2, Heart,
  Sparkles, Shield, Activity, Users, ChevronRight,
} from "lucide-react";
import megaMenuImg from "@/assets/mega-menu-treatment.jpg";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const categories = [
  { id: "types", label: "Treatment Types", icon: Shield },
  { id: "locations", label: "By Location", icon: MapPin },
  { id: "near-me", label: "Near Me", icon: Search },
];

const treatmentTypes = [
  { href: "/treatment-types/drug-addiction-treatment", label: "Drug Addiction Treatment", icon: Pill, desc: "Evidence-based programs for substance use disorders" },
  { href: "/treatment-types/alcohol-rehabilitation", label: "Alcohol Rehabilitation", icon: Wine, desc: "Specialized alcohol recovery programs" },
  { href: "/treatment-types/dual-diagnosis-treatment", label: "Dual Diagnosis", icon: Brain, desc: "Co-occurring mental health & addiction care" },
  { href: "/treatment-types/detox-programs", label: "Detox Programs", icon: Activity, desc: "Medically supervised detoxification" },
  { href: "/treatment-types/residential-inpatient", label: "Inpatient Rehab", icon: Building2, desc: "24/7 residential treatment programs" },
  { href: "/treatment-types/outpatient-programs", label: "Outpatient Programs", icon: Users, desc: "Flexible treatment while living at home" },
  { href: "/treatment-types/holistic-treatment", label: "Holistic Therapy", icon: Heart, desc: "Mind-body-spirit healing approaches" },
  { href: "/treatment-types/luxury-rehab", label: "Luxury Rehab", icon: Sparkles, desc: "Premium amenities & private treatment" },
];

const popularLocations = [
  { href: "/rehab-centers/california", label: "California", count: "200+" },
  { href: "/rehab-centers/florida", label: "Florida", count: "180+" },
  { href: "/rehab-centers/texas", label: "Texas", count: "120+" },
  { href: "/rehab-centers/new-york", label: "New York", count: "95+" },
  { href: "/rehab-centers/arizona", label: "Arizona", count: "85+" },
  { href: "/rehab-centers/colorado", label: "Colorado", count: "70+" },
];

const nearMePages = [
  { href: "/drug-rehab-near-me", label: "Drug Rehab Near Me", icon: Pill },
  { href: "/alcohol-rehab-near-me", label: "Alcohol Rehab Near Me", icon: Wine },
  { href: "/detox-near-me", label: "Detox Near Me", icon: Activity },
  { href: "/luxury-rehab-near-me", label: "Luxury Rehab Near Me", icon: Sparkles },
];

function SidebarContent({ activeCategory, onNavigate }: { activeCategory: string; onNavigate?: () => void }) {
  if (activeCategory === "types") {
    return (
      <div className="space-y-0.5">
        {treatmentTypes.map((item) => (
          <PrefetchLink
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className="group flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/[0.08] transition-all duration-200"
          >
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-accent/20 group-hover:shadow-sm transition-all">
              <item.icon className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{item.label}</p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{item.desc}</p>
            </div>
          </PrefetchLink>
        ))}
        <PrefetchLink
          to="/treatment-types"
          onClick={onNavigate}
          className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-primary hover:underline mt-1"
        >
          View All Treatment Types <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
    );
  }

  if (activeCategory === "locations") {
    return (
      <div>
        <div className="grid grid-cols-2 gap-1">
          {popularLocations.map((loc) => (
            <PrefetchLink
              key={loc.href}
              to={loc.href}
              onClick={onNavigate}
              className="group flex items-center justify-between rounded-lg px-3 py-3 hover:bg-accent/[0.08] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-accent" />
                <span className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">{loc.label}</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium bg-muted/60 px-2 py-0.5 rounded-full">{loc.count}</span>
            </PrefetchLink>
          ))}
        </div>
        <PrefetchLink
          to="/locations"
          onClick={onNavigate}
          className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-primary hover:underline mt-2"
        >
          Browse All States <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
    );
  }

  if (activeCategory === "near-me") {
    return (
      <div className="space-y-1">
        {nearMePages.map((page) => (
          <PrefetchLink
            key={page.href}
            to={page.href}
            onClick={onNavigate}
            className="group flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-accent/[0.08] transition-all"
          >
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-all">
              <page.icon className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">{page.label}</p>
              <p className="text-[11px] text-muted-foreground">Find verified facilities in your area</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 ml-auto group-hover:text-primary transition-colors" />
          </PrefetchLink>
        ))}
        <PrefetchLink
          to="/rehab-centers"
          onClick={onNavigate}
          className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-primary hover:underline mt-2"
        >
          Search All Facilities <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
    );
  }

  return null;
}

export function FindTreatmentMegaMenu({ onNavigate }: MegaMenuProps) {
  const [activeCategory, setActiveCategory] = useState("types");

  return (
    <div className="w-[860px] max-w-[90vw]">
      <div className="grid grid-cols-[180px_1fr_220px]">
        {/* Sidebar */}
        <div className="bg-muted/40 border-r border-border/50 p-3 rounded-l-xl">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-3 mb-2">Browse</p>
          <div className="space-y-0.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onMouseEnter={() => setActiveCategory(cat.id)}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 text-left ${
                  activeCategory === cat.id
                    ? "bg-background text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                <cat.icon className={`h-4 w-4 shrink-0 ${activeCategory === cat.id ? "text-accent" : "text-muted-foreground"}`} />
                <span>{cat.label}</span>
                <ChevronRight className={`h-3.5 w-3.5 ml-auto shrink-0 ${activeCategory === cat.id ? "text-accent" : "text-muted-foreground/40"}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="p-5 min-h-[360px]">
          <SidebarContent activeCategory={activeCategory} onNavigate={onNavigate} />
        </div>

        {/* Right panel with image + CTA */}
        <div className="border-l border-border/50 p-4 flex flex-col bg-muted/20 rounded-r-xl">
          <div className="rounded-xl overflow-hidden mb-4 shadow-sm">
            <img
              src={megaMenuImg}
              alt="Treatment facility"
              className="w-full h-28 object-cover"
              loading="lazy"
              width={220}
              height={112}
            />
          </div>

          <div className="rounded-xl bg-gradient-to-br from-primary/[0.08] to-accent/[0.08] border border-primary/10 p-4 flex-1 flex flex-col">
            <p className="text-sm font-bold text-foreground mb-1">Free Treatment Matching</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3 flex-1">
              Let our concierge team find the right facility for your needs — free and confidential.
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
            className="flex items-center gap-1.5 mt-3 text-[12px] font-medium text-primary hover:underline justify-center"
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
      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-3 mb-2">Near Me</p>
        {nearMePages.map((page) => (
          <PrefetchLink key={page.href} to={page.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <page.icon className="h-4 w-4 text-accent" />
            {page.label}
          </PrefetchLink>
        ))}
      </div>
    </div>
  );
}
