import { useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { 
  Search, 
  MapPin, 
  FileText, 
  HelpCircle, 
  Shield, 
  Phone,
  Heart,
  Building2,
  Star,
  Bookmark,
  Send,
  ChevronRight,
  ChevronLeft,
  Filter,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowRight,
  Compass
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { FacilityCard, FacilityCardData, FacilityCardSkeleton } from "@/components/seeker/FacilityCard";
import { useFeaturedFacilityIds } from "@/hooks/useApprovedFacilities";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { getPlanPriority } from "@/lib/facilityPlanSort";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getStateAbbr, getNearbyStates } from "@/lib/proximitySearch";
import { useQuery } from "@tanstack/react-query";

const PAGE_SIZE = 12;

type SortOption = "proximity" | "name-asc" | "name-desc" | "state-asc" | "state-desc" | "years-desc" | "years-asc";

// Get seeker's state from profile if logged in
function useSeekerLocation() {
  const geo = useGeoLocation();

  const { data: seekerProfile } = useQuery({
    queryKey: ["seeker-profile-location"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("seeker_profiles")
        .select("state, zipcode, city")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  // Prefer saved profile state, then geo
  const state = seekerProfile?.state || "";
  const stateAbbr = state ? getStateAbbr(state) : null;
  const nearbyStates = stateAbbr ? getNearbyStates(stateAbbr) : [];
  const city = seekerProfile?.city || "";

  return { state, stateAbbr, nearbyStates, city, isLoading: geo.isLoading };
}

export default function SeekerHome() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("proximity");
  const [currentPage, setCurrentPage] = useState(1);
  const { favoritesCount } = useFavorites();
  const { data: featuredData } = useFeaturedFacilityIds();
  const seekerLocation = useSeekerLocation();

  const { data: staticFacilities = [], isLoading } = useStaticFacilities();

  // Map to FacilityCardData
  const allFacilities: (FacilityCardData & { zipCode?: string })[] = useMemo(() => {
    return staticFacilities.map(f => ({
      id: f.id,
      name: f.name,
      city: f.city,
      state: f.state,
      zipCode: f.zipCode,
      facility_type: f.facilityType || null,
      slug: f.slug,
      phone: f.phone,
      description: f.description,
      logo_url: f.logo_url,
      gallery_urls: f.gallery_urls,
      verified: f.verified ?? null,
      year_established: f.year_established ?? null,
      planTier: f.planTier,
      featured: f.isPro,
    }));
  }, [staticFacilities]);

  // Proximity scoring function
  const getProximityScore = useCallback((facility: { city: string; state: string }) => {
    if (!seekerLocation.stateAbbr) return 3; // No location = all equal
    const facilityStateAbbr = getStateAbbr(facility.state);
    
    // Same city + state = highest
    if (seekerLocation.city && facility.city.toLowerCase() === seekerLocation.city.toLowerCase() &&
        facilityStateAbbr?.toUpperCase() === seekerLocation.stateAbbr.toUpperCase()) {
      return 0;
    }
    // Same state
    if (facilityStateAbbr?.toUpperCase() === seekerLocation.stateAbbr.toUpperCase()) {
      return 1;
    }
    // Nearby state
    if (facilityStateAbbr && seekerLocation.nearbyStates.includes(facilityStateAbbr.toUpperCase())) {
      return 2;
    }
    return 3; // Nationwide
  }, [seekerLocation]);

  // Filter and sort
  const filteredFacilities = useMemo(() => {
    let result = allFacilities.filter((facility) => {
      const matchesType = selectedType === "all" || facility.facility_type === selectedType;
      const matchesState = selectedState === "all" || facility.state?.toLowerCase() === selectedState.toLowerCase();
      return matchesType && matchesState;
    });

    result = [...result].sort((a, b) => {
      // Pro facilities always first within each proximity tier
      const proA = getPlanPriority(a);
      const proB = getPlanPriority(b);

      if (sortBy === "proximity") {
        const proxA = getProximityScore(a);
        const proxB = getProximityScore(b);
        if (proxA !== proxB) return proxA - proxB;
        if (proA !== proB) return proA - proB;
        return a.name.localeCompare(b.name);
      }

      // For non-proximity sorts, still put Pro first
      if (proA !== proB) return proA - proB;

      switch (sortBy) {
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        case "state-asc": return a.state.localeCompare(b.state) || a.city.localeCompare(b.city);
        case "state-desc": return b.state.localeCompare(a.state) || b.city.localeCompare(a.city);
        case "years-desc": {
          const ya = a.year_established ? new Date().getFullYear() - a.year_established : 0;
          const yb = b.year_established ? new Date().getFullYear() - b.year_established : 0;
          return yb - ya;
        }
        case "years-asc": {
          const ya = a.year_established ? new Date().getFullYear() - a.year_established : 0;
          const yb = b.year_established ? new Date().getFullYear() - b.year_established : 0;
          return ya - yb;
        }
        default: return 0;
      }
    });

    return result;
  }, [allFacilities, selectedType, selectedState, sortBy, getProximityScore]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredFacilities.length / PAGE_SIZE));
  const paginatedFacilities = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredFacilities.slice(start, start + PAGE_SIZE);
  }, [filteredFacilities, currentPage]);

  // Reset page on filter change
  const handleFilterChange = useCallback((setter: (v: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  }, []);

  const availableStates = useMemo(() => {
    return [...new Set(allFacilities.map(f => f.state))].sort();
  }, [allFacilities]);

  const availableTypes = useMemo(() => {
    return [...new Set(allFacilities.map(f => f.facility_type).filter(Boolean))].sort() as string[];
  }, [allFacilities]);

  const activeFiltersCount = (selectedType !== "all" ? 1 : 0) + (selectedState !== "all" ? 1 : 0);

  const clearFilters = () => {
    setSelectedType("all");
    setSelectedState("all");
    setSortBy("proximity");
    setCurrentPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search-results?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Empty state — no facilities at all
  if (!isLoading && allFacilities.length === 0) {
    return (
      <>
      <Helmet>
        <title>Find Treatment Centers | RehabLookup</title>
        <meta name="description" content="Discover addiction treatment centers near you. Search, compare, and connect with verified rehab facilities." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-full">
        <div className="bg-gradient-to-b from-primary/5 via-primary/3 to-background py-12 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Search className="h-4 w-4" />
              Find Your Path to Recovery
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-4">
              Find Treatment Near You
            </h1>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Search for addiction treatment centers by location, treatment type, or facility name.
            </p>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <div className="relative flex-1 group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center">
                  <Search className="absolute left-4 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type="text"
                    placeholder="Search by city, state, or zip code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 text-base bg-background border-border/60 shadow-md focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <Button type="submit" size="lg" className="h-12 px-8 shadow-md">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </form>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border/50 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  Popular Pages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {[
                  { to: "/rehab-centers", icon: Building2, label: "Find Rehab Centers" },
                  { to: "/account/concierge", icon: HelpCircle, label: "Concierge Service" },
                  { to: "/how-it-works", icon: Star, label: "How It Works" },
                  { to: "/insurance", icon: Shield, label: "Insurance Coverage" },
                ].map((link) => (
                  <Link 
                    key={link.to}
                    to={link.to} 
                    className="flex items-center gap-3 p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors group"
                  >
                    <link.icon className="h-4 w-4" />
                    <span className="flex-1 font-medium">{link.label}</span>
                    <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  Find Treatment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {[
                  { to: "/drug-rehab-near-me", label: "Drug Rehab Near Me" },
                  { to: "/alcohol-rehab-near-me", label: "Alcohol Rehab Near Me" },
                  { to: "/detox-near-me", label: "Detox Centers" },
                  { to: "/inpatient-rehab-near-me", label: "Inpatient Treatment" },
                  { to: "/outpatient-near-me", label: "Outpatient Programs" },
                  { to: "/dual-diagnosis-near-me", label: "Dual Diagnosis" },
                ].map((link) => (
                  <Link 
                    key={link.to}
                    to={link.to} 
                    className="flex items-center gap-3 p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors group"
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="flex-1 font-medium">{link.label}</span>
                    <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-8 bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200/50">
            <CardContent className="p-6 sm:p-8 text-center">
              <p className="text-amber-700 font-medium mb-2">Need immediate help?</p>
              <h3 className="text-xl font-display font-semibold mb-4 text-foreground">
                Our support team is available 24/7 to connect you with treatment
              </h3>
              <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25">
                <Link to="/account/concierge">
                  <Phone className="h-4 w-4 mr-2" />
                  Find Treatment
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      </>
    );
  }

  // Main layout
  return (
    <>
    <Helmet>
      <title>Find Treatment Centers | RehabLookup</title>
      <meta name="description" content="Discover addiction treatment centers near you. Search, compare, and connect with verified rehab facilities." />
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <div className="min-h-full">
      {/* Search Header */}
      <div className="bg-gradient-to-b from-primary/5 to-background border-b border-border/50">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-2xl">
              <div className="relative flex-1 group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center">
                  <Search className="absolute left-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type="text"
                    placeholder="Search city, state, or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 sm:h-11 bg-background border-border/60 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>
              </div>
              <Button type="submit" size="default" className="h-10 sm:h-11 px-4 sm:px-5 shadow-sm">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="default"
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 sm:h-11 gap-1.5 sm:gap-2 shrink-0 shadow-sm"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-sm">Filters</span>
              {activeFiltersCount > 0 && (
                <Badge variant={showFilters ? "secondary" : "default"} className="ml-0.5 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] rounded-full">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h3 className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  Filter & Sort
                </h3>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-[11px] gap-1 px-2">
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Facility Type</label>
                  <Select value={selectedType} onValueChange={(v) => handleFilterChange(setSelectedType, v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {availableTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">State</label>
                  <Select value={selectedState} onValueChange={(v) => handleFilterChange(setSelectedState, v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {availableStates.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <ArrowUpDown className="h-3 w-3" />
                    Sort By
                  </label>
                  <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortOption); setCurrentPage(1); }}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proximity">Nearest First</SelectItem>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                      <SelectItem value="state-asc">Location (A-Z)</SelectItem>
                      <SelectItem value="state-desc">Location (Z-A)</SelectItem>
                      <SelectItem value="years-desc">Most Established</SelectItem>
                      <SelectItem value="years-asc">Newest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
                  {selectedType !== "all" && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      <Building2 className="h-3 w-3" />
                      {selectedType}
                      <button onClick={() => handleFilterChange(setSelectedType, "all")} className="ml-1 p-0.5 rounded-full hover:bg-muted-foreground/20">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {selectedState !== "all" && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      <MapPin className="h-3 w-3" />
                      {selectedState}
                      <button onClick={() => handleFilterChange(setSelectedState, "all")} className="ml-1 p-0.5 rounded-full hover:bg-muted-foreground/20">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Main Feed */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg lg:text-xl font-display font-bold text-foreground flex items-center gap-1.5 sm:gap-2 truncate">
                <Compass className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <span className="truncate">Discover Centers Near You</span>
              </h2>
              {seekerLocation.stateAbbr && (
                <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {seekerLocation.stateAbbr}
                </span>
              )}
            </div>
            
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <FacilityCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredFacilities.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <div className="p-3 rounded-full bg-muted w-fit mx-auto mb-3">
                  <MapPin className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">No facilities found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your filters to see more treatment centers
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </Card>
            ) : (
              <>
                <div className="grid gap-3 sm:gap-4">
                  {paginatedFacilities.map((facility) => (
                    <FacilityCard key={facility.id} facility={facility} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="h-8 gap-1"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let page: number;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0 text-xs"
                            onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="h-8 gap-1"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {/* Browse all link */}
                <div className="mt-4 text-center">
                  <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                    <Link to="/search-results" className="gap-1.5">
                      Browse All Treatment Centers
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-72 xl:w-80 shrink-0 space-y-3 sm:space-y-4">
            {/* Quick Stats - mobile horizontal scroll */}
            <div className="lg:hidden">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">Your Activity</p>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
                <Link to="/account/saved" className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/50 hover:bg-muted transition-colors shrink-0 snap-start min-w-[140px]">
                  <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
                    <Bookmark className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{favoritesCount}</p>
                    <p className="text-[10px] text-muted-foreground">Saved</p>
                  </div>
                </Link>
                <Link to="/account/requests" className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/50 hover:bg-muted transition-colors shrink-0 snap-start min-w-[140px]">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                    <Send className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Inbox</p>
                    <p className="text-[10px] text-muted-foreground">Track</p>
                  </div>
                </Link>
                <Link to="/account/reviews" className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/50 hover:bg-muted transition-colors shrink-0 snap-start min-w-[140px]">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                    <Star className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Reviews</p>
                    <p className="text-[10px] text-muted-foreground">View</p>
                  </div>
                </Link>
              </div>
            </div>
            
            {/* Desktop sidebar cards */}
            <Card className="border-border/50 hidden lg:block">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Your Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/account/saved" className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
                  <div className="p-2 rounded-lg bg-rose-100 text-rose-600">
                    <Bookmark className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{favoritesCount}</p>
                    <p className="text-xs text-muted-foreground">Saved Facilities</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link to="/account/requests" className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <Send className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                     <p className="font-semibold text-foreground">Inbox</p>
                    <p className="text-xs text-muted-foreground">Track Submissions</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link to="/account/reviews" className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                    <Star className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">My Reviews</p>
                    <p className="text-xs text-muted-foreground">View & Edit</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {[
                  { to: "/rehab-centers", icon: Building2, label: "Browse All Centers" },
                  { to: "/insurance", icon: Shield, label: "Insurance Guide" },
                  { to: "/account/concierge", icon: Phone, label: "Find Treatment" },
                ].map((link) => (
                  <Link 
                    key={link.to}
                    to={link.to} 
                    className="flex items-center gap-3 p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <link.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{link.label}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* CTA Card */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hidden lg:block">
              <CardContent className="p-4 text-center">
                <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-3">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">Need Help?</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Get placed in treatment
                </p>
                <Button asChild size="sm" className="w-full">
                  <Link to="/account/concierge">Start Concierge</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
    </>
  );
}
