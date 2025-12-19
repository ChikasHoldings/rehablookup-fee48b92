import { useState, useMemo } from "react";
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
  Phone,
  ArrowRight,
  Map,
  Globe,
  Compass
} from "lucide-react";

const Locations = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());

  // Get top 20 cities for featured section
  const topCities = useMemo(() => getTopCities(20), []);

  // Filter states based on search
  const filteredStates = useMemo(() => {
    if (!searchQuery.trim()) return statesData;
    
    const query = searchQuery.toLowerCase();
    return statesData.filter(state => 
      state.name.toLowerCase().includes(query) ||
      state.abbreviation.toLowerCase().includes(query) ||
      state.cities.some(city => city.name.toLowerCase().includes(query))
    );
  }, [searchQuery]);

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

  // Region data
  const regions = [
    { name: "Northeast", icon: Compass, states: ["new-york", "massachusetts", "pennsylvania", "new-jersey", "connecticut"] },
    { name: "Southeast", icon: Compass, states: ["florida", "georgia", "north-carolina", "south-carolina", "tennessee"] },
    { name: "West", icon: Compass, states: ["california", "arizona", "colorado", "washington", "oregon"] },
    { name: "Midwest", icon: Compass, states: ["illinois", "ohio", "michigan", "minnesota", "wisconsin"] },
  ];

  // Structured data for SEO
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
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="container relative">
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
                  className="h-14 w-full rounded-2xl border-0 bg-white pl-12 pr-4 text-base shadow-xl placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-white/50"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <Globe className="h-4 w-4" />
                </div>
                <span><strong className="text-white">50</strong> States Covered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <MapPin className="h-4 w-4" />
                </div>
                <span><strong className="text-white">150+</strong> Major Cities</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <Building2 className="h-4 w-4" />
                </div>
                <span><strong className="text-white">Verified</strong> Facilities</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Cities Section */}
      <section className="border-b bg-card py-12 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Featured Destinations</span>
            <h2 className="mt-2 text-2xl font-bold text-foreground">Popular Treatment Cities</h2>
            <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
              Top locations for addiction treatment with the most comprehensive care options
            </p>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {topCities.slice(0, 10).map((city, index) => (
              <Link
                key={`${city.state.slug}-${city.slug}`}
                to={`/rehab-centers/${city.state.slug}/${city.slug}`}
                className="group relative flex items-center gap-3 rounded-xl border bg-background p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5"
              >
                {index < 3 && (
                  <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground shadow-sm">
                    #{index + 1}
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
        </div>
      </section>

      {/* All States Directory */}
      <section className="bg-background py-12 md:py-16">
        <div className="container">
          <div className="mb-10 text-center">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Complete Directory</span>
            <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">Browse All States</h2>
            <p className="mt-2 text-muted-foreground">
              {filteredStates.length === statesData.length 
                ? "Explore treatment options in all 50 states"
                : `${filteredStates.length} states matching "${searchQuery}"`
              }
            </p>
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
                className="mt-6"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredStates.map(state => {
                const isExpanded = expandedStates.has(state.slug);
                const displayCities = isExpanded ? state.cities : state.cities.slice(0, 4);
                const hasMoreCities = state.cities.length > 4;

                return (
                  <div
                    key={state.slug}
                    className="group rounded-2xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/30"
                  >
                    {/* State Header */}
                    <Link
                      to={`/rehab-centers/${state.slug}`}
                      className="flex items-center justify-between border-b bg-gradient-to-r from-secondary/50 to-secondary/30 p-5 transition-colors hover:from-primary/10 hover:to-primary/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                          {state.abbreviation}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {state.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {state.cities.length} cities available
                          </p>
                        </div>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background shadow-sm transition-all group-hover:bg-primary group-hover:shadow-md">
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                      </div>
                    </Link>

                    {/* Cities List */}
                    <div className="p-5">
                      <div className="grid grid-cols-2 gap-2">
                        {displayCities.map(city => (
                          <Link
                            key={city.slug}
                            to={`/rehab-centers/${state.slug}/${city.slug}`}
                            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all hover:bg-primary/5 hover:translate-x-0.5"
                          >
                            <MapPin className="h-3.5 w-3.5 text-primary/60" />
                            <span className="text-foreground truncate hover:text-primary">{city.name}</span>
                          </Link>
                        ))}
                      </div>

                      {hasMoreCities && (
                        <button
                          onClick={() => toggleState(state.slug)}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-primary hover:bg-primary/5"
                        >
                          {isExpanded ? (
                            <>Show fewer cities</>
                          ) : (
                            <>
                              <span>+{state.cities.length - 4} more cities</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Quick Links by Region */}
      <section className="border-t bg-gradient-to-b from-secondary/50 to-secondary/20 py-12 md:py-14">
        <div className="container">
          <div className="mb-10 text-center">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Quick Access</span>
            <h2 className="mt-2 text-2xl font-bold text-foreground">Browse by Region</h2>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {regions.map((region) => (
              <div key={region.name} className="rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <region.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{region.name}</h3>
                </div>
                <div className="space-y-2">
                  {region.states.map(slug => {
                    const state = statesData.find(s => s.slug === slug);
                    return state ? (
                      <Link
                        key={slug}
                        to={`/rehab-centers/${slug}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ChevronRight className="h-3 w-3" />
                        {state.name}
                      </Link>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 py-14 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        
        <div className="container relative text-center">
          <div className="mx-auto max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm">
              <Phone className="h-4 w-4" />
              Free Consultation
            </div>
            
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Need Help Finding the Right Treatment?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80 leading-relaxed">
              Our dedicated team can help you find the perfect treatment center based on your location, 
              insurance coverage, and specific recovery needs.
            </p>
            
            <Link to="/request-help" className="mt-8 inline-block">
              <Button size="lg" variant="secondary" className="gap-2 h-12 px-8 text-base shadow-lg hover:shadow-xl transition-shadow">
                Get Personalized Recommendations
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Locations;
