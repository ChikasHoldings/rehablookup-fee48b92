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
  Star,
  ArrowRight,
  Map
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
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 py-12 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="container relative">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm">
              <Map className="h-4 w-4" />
              Location Directory
            </div>
            
            <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              Find Rehab Centers by Location
            </h1>
            
            <p className="mt-4 text-lg text-white/80 leading-relaxed max-w-2xl">
              Browse verified addiction treatment facilities across all 50 US states and major cities. 
              Find quality care close to home or explore destination treatment options.
            </p>

            {/* Search */}
            <div className="mt-8 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search states or cities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-14 w-full rounded-xl border-0 bg-white pl-12 pr-4 text-base shadow-lg placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-white/50"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-6 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span><strong className="text-white">50</strong> States</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span><strong className="text-white">150+</strong> Cities</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Cities Section */}
      <section className="border-b bg-card py-10">
        <div className="container">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Popular Cities</h2>
              <p className="text-sm text-muted-foreground">Top treatment destinations across the country</p>
            </div>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {topCities.slice(0, 10).map(city => (
              <Link
                key={`${city.state.slug}-${city.slug}`}
                to={`/rehab-centers/${city.state.slug}/${city.slug}`}
                className="group flex items-center gap-3 rounded-xl border bg-background p-4 transition-all hover:border-primary hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {city.state.abbreviation}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
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
      <section className="bg-background py-10 md:py-14">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Browse by State</h2>
            <p className="mt-1 text-muted-foreground">
              {filteredStates.length === statesData.length 
                ? "All 50 states with city-level directories"
                : `${filteredStates.length} states matching "${searchQuery}"`
              }
            </p>
          </div>

          {filteredStates.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center">
              <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Results Found</h3>
              <p className="mt-2 text-muted-foreground">
                Try searching for a different state or city name.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStates.map(state => {
                const isExpanded = expandedStates.has(state.slug);
                const displayCities = isExpanded ? state.cities : state.cities.slice(0, 3);
                const hasMoreCities = state.cities.length > 3;

                return (
                  <div
                    key={state.slug}
                    className="rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-md"
                  >
                    {/* State Header */}
                    <Link
                      to={`/rehab-centers/${state.slug}`}
                      className="group flex items-center justify-between border-b bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {state.abbreviation}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {state.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {state.cities.length} cities
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </Link>

                    {/* Cities List */}
                    <div className="p-4">
                      <div className="space-y-1">
                        {displayCities.map(city => (
                          <Link
                            key={city.slug}
                            to={`/rehab-centers/${state.slug}/${city.slug}`}
                            className="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary"
                          >
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                            <span className="text-foreground group-hover:text-primary">{city.name}</span>
                          </Link>
                        ))}
                      </div>

                      {hasMoreCities && (
                        <button
                          onClick={() => toggleState(state.slug)}
                          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          {isExpanded ? (
                            <>Show less</>
                          ) : (
                            <>+{state.cities.length - 3} more cities</>
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
      <section className="border-t bg-secondary/30 py-10">
        <div className="container">
          <h2 className="mb-6 text-xl font-bold text-foreground">Browse by Region</h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Northeast */}
            <div>
              <h3 className="mb-3 font-semibold text-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                Northeast
              </h3>
              <div className="space-y-1">
                {["new-york", "massachusetts", "pennsylvania", "new-jersey", "connecticut"].map(slug => {
                  const state = statesData.find(s => s.slug === slug);
                  return state ? (
                    <Link
                      key={slug}
                      to={`/rehab-centers/${slug}`}
                      className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {state.name}
                    </Link>
                  ) : null;
                })}
              </div>
            </div>

            {/* Southeast */}
            <div>
              <h3 className="mb-3 font-semibold text-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                Southeast
              </h3>
              <div className="space-y-1">
                {["florida", "georgia", "north-carolina", "south-carolina", "tennessee"].map(slug => {
                  const state = statesData.find(s => s.slug === slug);
                  return state ? (
                    <Link
                      key={slug}
                      to={`/rehab-centers/${slug}`}
                      className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {state.name}
                    </Link>
                  ) : null;
                })}
              </div>
            </div>

            {/* West */}
            <div>
              <h3 className="mb-3 font-semibold text-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                West
              </h3>
              <div className="space-y-1">
                {["california", "arizona", "colorado", "washington", "oregon"].map(slug => {
                  const state = statesData.find(s => s.slug === slug);
                  return state ? (
                    <Link
                      key={slug}
                      to={`/rehab-centers/${slug}`}
                      className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {state.name}
                    </Link>
                  ) : null;
                })}
              </div>
            </div>

            {/* Midwest */}
            <div>
              <h3 className="mb-3 font-semibold text-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                Midwest
              </h3>
              <div className="space-y-1">
                {["illinois", "ohio", "michigan", "minnesota", "wisconsin"].map(slug => {
                  const state = statesData.find(s => s.slug === slug);
                  return state ? (
                    <Link
                      key={slug}
                      to={`/rehab-centers/${slug}`}
                      className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {state.name}
                    </Link>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-12">
        <div className="container text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Need Help Finding Treatment?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Our team can help you find the right treatment center based on your location, 
            insurance, and specific needs.
          </p>
          <Link to="/request-help" className="mt-6 inline-block">
            <Button size="lg" variant="secondary" className="gap-2">
              <Phone className="h-4 w-4" />
              Get Personalized Recommendations
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Locations;
