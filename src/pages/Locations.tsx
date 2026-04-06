import { useState, useMemo } from "react";
import { PageFAQ } from "@/components/seo/PageFAQ";
import { locationsFaqs } from "@/data/pageFaqs";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { statesData, getTopCities } from "@/data/locationSeoData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Search, 
  Building2, 
  ChevronRight, 
  ArrowRight,
  Map,
  Globe,
  Compass,
  Heart,
  X,
  TrendingUp,
  Shield,
  Star,
} from "lucide-react";
import { 
  InternalLinkingSection, 
  treatmentTypeLinks, 
  nearMeLinks, 
  insuranceLinks 
} from "@/components/seo/InternalLinkingSection";
import { FeaturedCentersSection } from "@/components/seo/FeaturedCentersSection";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

const regionData = [
  { 
    name: "Northeast", 
    icon: Compass, 
    color: "from-blue-500/10 to-blue-600/5 border-blue-500/20",
    iconColor: "text-blue-600 bg-blue-500/10",
    states: ["new-york", "massachusetts", "pennsylvania", "new-jersey", "connecticut", "maine", "new-hampshire", "vermont", "rhode-island"] 
  },
  { 
    name: "Southeast", 
    icon: Compass,
    color: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
    iconColor: "text-emerald-600 bg-emerald-500/10",
    states: ["florida", "georgia", "north-carolina", "south-carolina", "tennessee", "virginia", "alabama", "mississippi", "louisiana"] 
  },
  { 
    name: "West", 
    icon: Compass,
    color: "from-amber-500/10 to-amber-600/5 border-amber-500/20",
    iconColor: "text-amber-600 bg-amber-500/10",
    states: ["california", "arizona", "colorado", "washington", "oregon", "nevada", "utah", "hawaii", "alaska"] 
  },
  { 
    name: "Midwest", 
    icon: Compass,
    color: "from-violet-500/10 to-violet-600/5 border-violet-500/20",
    iconColor: "text-violet-600 bg-violet-500/10",
    states: ["illinois", "ohio", "michigan", "minnesota", "wisconsin", "indiana", "missouri", "iowa"] 
  },
  { 
    name: "Southwest", 
    icon: Compass,
    color: "from-rose-500/10 to-rose-600/5 border-rose-500/20",
    iconColor: "text-rose-600 bg-rose-500/10",
    states: ["texas", "new-mexico", "oklahoma", "arkansas"] 
  },
];

const Locations = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  const topCities = useMemo(() => getTopCities(20), []);

  const filteredStates = useMemo(() => {
    let states = statesData;
    
    if (activeRegion) {
      const region = regionData.find(r => r.name === activeRegion);
      if (region) {
        states = states.filter(s => region.states.includes(s.slug));
      }
    }

    if (!searchQuery.trim()) return states;
    
    const query = searchQuery.toLowerCase();
    return states.filter(state => 
      state.name.toLowerCase().includes(query) ||
      state.abbreviation.toLowerCase().includes(query) ||
      state.cities.some(city => city.name.toLowerCase().includes(query))
    );
  }, [searchQuery, activeRegion]);

  const toggleState = (stateSlug: string) => {
    setExpandedStates(prev => {
      const next = new Set(prev);
      if (next.has(stateSlug)) {
        next.delete(stateSlug);
      } else {
        next.add(stateSlug);
      }
      return next;
    });
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Drug & Alcohol Rehab Centers by Location",
    "description": "Browse addiction treatment centers across all 50 US states. Find rehab facilities in your city or state.",
    "url": "https://rehablookup.com/locations",
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": statesData.length,
      "itemListElement": statesData.map((state, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Place",
          "name": state.name,
          "url": `https://rehablookup.com/rehab-centers/${state.slug}`
        }
      }))
    }
  };

  return (
    <Layout>
      <SEO
        title="Find Rehab Centers by Location | All 50 States & Major Cities"
        description="Browse drug and alcohol treatment centers across all 50 US states and major cities. Find verified rehab facilities near you with our comprehensive location directory."
        canonical="/locations"
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Locations", url: "/locations" },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 py-14 md:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="container relative">
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Locations" },
            ]}
          />
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm border border-white/10">
              <Map className="h-4 w-4" />
              Nationwide Directory
            </div>
            
            <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">
              Find Rehab Centers by Location
            </h1>
            
            <p className="mx-auto mt-5 text-lg text-white/80 leading-relaxed max-w-2xl">
              Browse verified addiction treatment facilities across all 50 US states and major cities. 
              Find quality care close to home or explore destination treatment options.
            </p>

            {/* Search */}
            <div className="mx-auto mt-8 max-w-lg">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search states or cities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-14 w-full rounded-2xl border-0 bg-white pl-12 pr-12 text-base shadow-xl placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-white/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <Globe className="h-4 w-4" />
                </div>
                <span><strong className="text-white tabular-nums">50</strong> States Covered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <MapPin className="h-4 w-4" />
                </div>
                <span><strong className="text-white tabular-nums">1,000+</strong> Cities</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <Shield className="h-4 w-4" />
                </div>
                <span><strong className="text-white">Verified</strong> Facilities</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Cities Section */}
      <section className="border-b bg-card py-10 md:py-14">
        <div className="container">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
              <TrendingUp className="h-4.5 w-4.5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground md:text-2xl">Popular Treatment Cities</h2>
              <p className="text-sm text-muted-foreground">Top locations with the most comprehensive care options</p>
            </div>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {topCities.slice(0, 10).map((city, index) => (
              <Link
                key={`${city.state.slug}-${city.slug}`}
                to={`/rehab-centers/${city.state.slug}/${city.slug}`}
                className="group relative flex items-center gap-3 rounded-xl border bg-background p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5"
              >
                {index < 3 && (
                  <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground shadow-sm">
                    <Star className="h-3 w-3" />
                  </div>
                )}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {city.state.abbreviation}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {city.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{city.state.name}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Show remaining top cities as compact links */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-1">Also popular:</span>
            {topCities.slice(10, 20).map((city) => (
              <Link
                key={`${city.state.slug}-${city.slug}`}
                to={`/rehab-centers/${city.state.slug}/${city.slug}`}
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:bg-primary/5"
              >
                <MapPin className="h-2.5 w-2.5" />
                {city.name}, {city.state.abbreviation}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Region Filter + All States Directory */}
      <section className="bg-background py-10 md:py-16">
        <div className="container">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground md:text-2xl">Browse All States</h2>
              <p className="text-sm text-muted-foreground">
                {filteredStates.length === statesData.length 
                  ? "Explore treatment options in all 50 states"
                  : `${filteredStates.length} states ${activeRegion ? `in ${activeRegion}` : `matching "${searchQuery}"`}`
                }
              </p>
            </div>
          </div>

          {/* Region filter pills */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveRegion(null)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                !activeRegion 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              All States
            </button>
            {regionData.map((region) => (
              <button
                key={region.name}
                onClick={() => setActiveRegion(activeRegion === region.name ? null : region.name)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  activeRegion === region.name
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                <region.icon className="h-3.5 w-3.5" />
                {region.name}
              </button>
            ))}
          </div>

          {filteredStates.length === 0 ? (
            <div className="mx-auto max-w-md rounded-2xl border bg-card p-12 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">No Results Found</h3>
              <p className="mt-2 text-muted-foreground">
                Try searching for a different state or city name.
              </p>
              <Button 
                variant="outline" 
                size="lg"
                className="mt-6"
                onClick={() => { setSearchQuery(""); setActiveRegion(null); }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredStates.map((state, index) => {
                const isExpanded = expandedStates.has(state.slug);
                const displayCities = isExpanded ? state.cities : state.cities.slice(0, 4);
                const hasMoreCities = state.cities.length > 4;

                return (
                  <div
                    key={state.slug}
                    className="group relative rounded-xl border bg-card overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/40 animate-fade-in"
                    style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
                  >
                    {/* State Header */}
                    <Link
                      to={`/rehab-centers/${state.slug}`}
                      className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
                        {state.abbreviation}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {state.name}
                        </h3>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {state.cities.length} {state.cities.length === 1 ? "city" : "cities"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>

                    {/* Cities List */}
                    <div className="border-t px-4 py-3 bg-secondary/20">
                      <div className="flex flex-wrap gap-1.5">
                        {displayCities.map(city => (
                          <Link
                            key={city.slug}
                            to={`/rehab-centers/${state.slug}/${city.slug}`}
                            className="inline-flex items-center gap-1 rounded-md bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20"
                          >
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[90px]">{city.name}</span>
                          </Link>
                        ))}
                        {hasMoreCities && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              toggleState(state.slug);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/10"
                          >
                            {isExpanded ? "Show less" : `+${state.cities.length - 4} more`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Browse by Region - Visual Cards */}
      <section className="border-t bg-gradient-to-b from-muted/40 to-background py-10 md:py-14">
        <div className="container">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Compass className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground md:text-2xl">Browse by Region</h2>
              <p className="text-sm text-muted-foreground">Explore treatment options by geographic area</p>
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {regionData.map((region) => (
              <div key={region.name} className={`rounded-xl border bg-gradient-to-br ${region.color} p-5 transition-shadow hover:shadow-md`}>
                <div className="mb-4 flex items-center gap-2.5">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${region.iconColor}`}>
                    <region.icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="font-semibold text-foreground">{region.name}</h3>
                </div>
                <div className="space-y-1.5">
                  {region.states.map(slug => {
                    const state = statesData.find(s => s.slug === slug);
                    return state ? (
                      <Link
                        key={slug}
                        to={`/rehab-centers/${slug}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors py-0.5"
                      >
                        <ChevronRight className="h-3 w-3 shrink-0" />
                        <span className="truncate">{state.name}</span>
                      </Link>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Centers */}
      <FeaturedCentersSection 
        title="Featured Treatment Centers"
        description="Top-rated facilities across the country"
        limit={8}
        className="border-t border-border"
      />

      {/* SEO Internal Linking */}
      <InternalLinkingSection
        title="Explore More Resources"
        description="Treatment types, insurance coverage, and recovery guides"
        variant="grid"
        groups={[
          { title: "Treatment Programs", links: treatmentTypeLinks.slice(0, 5) },
          { title: "Find Treatment Near You", links: nearMeLinks.slice(0, 5) },
          { title: "Insurance Coverage", links: insuranceLinks.slice(0, 5) },
        ]}
      />

      {/* CTA Section */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-12 text-center">
            <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl">
              Need Help Finding the Right Treatment?
            </h2>
            <p className="mb-8 text-muted-foreground max-w-xl mx-auto">
              Our dedicated team can help you find the perfect treatment center based on your location, 
              insurance coverage, and specific recovery needs.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/concierge">
                <Button size="xl" className="gap-2.5 px-8 min-w-[200px]">
                  <Heart className="h-5 w-5" />
                  Find Treatment
                </Button>
              </Link>
              <Link to="/rehab-centers">
                <Button variant="outline" size="xl" className="gap-2.5 px-8 min-w-[200px]">
                  Browse All Centers
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PageFAQ faqs={locationsFaqs} className="border-t border-border bg-muted/30" />
    </Layout>
  );
};

export default Locations;
