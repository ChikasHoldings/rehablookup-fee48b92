import { useState, useMemo } from "react";
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
  TrendingUp,
  Bookmark,
  Send,
  ChevronRight,
  Filter,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowRight
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
import { sortByPlanHierarchyWithSecondary, getPlanPriority } from "@/lib/facilityPlanSort";
import { useQuery } from "@tanstack/react-query";

type SortOption = "name-asc" | "name-desc" | "state-asc" | "state-desc" | "years-desc" | "years-asc";

export default function SeekerHome() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const { favoritesCount } = useFavorites();
  const { data: featuredData } = useFeaturedFacilityIds();

  // Use static facilities hook for CDN-cached data
  const { data: staticFacilities = [], isLoading } = useStaticFacilities();

  // Map static facilities to FacilityCardData format
  const nearbyFacilities: FacilityCardData[] = useMemo(() => {
    return staticFacilities.slice(0, 50).map(f => ({
      id: f.id,
      name: f.name,
      city: f.city,
      state: f.state,
      facility_type: f.facilityType || null,
      slug: f.slug,
      phone: f.phone,
      description: f.description,
      logo_url: f.logo_url,
      gallery_urls: f.gallery_urls,
      verified: f.verified ?? null,
      year_established: f.year_established ?? null,
      planTier: f.planTier,
    }));
  }, [staticFacilities]);

  // Filter and sort facilities with plan hierarchy
  const filteredFacilities = useMemo(() => {
    let result = nearbyFacilities.filter((facility) => {
      const matchesType = selectedType === "all" || facility.facility_type === selectedType;
      const matchesState = selectedState === "all" || facility.state?.toLowerCase() === selectedState.toLowerCase();
      return matchesType && matchesState;
    });

    // Sort with plan hierarchy first, then secondary sort
    result = sortByPlanHierarchyWithSecondary(result, (a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "state-asc":
          return a.state.localeCompare(b.state) || a.city.localeCompare(b.city);
        case "state-desc":
          return b.state.localeCompare(a.state) || b.city.localeCompare(a.city);
        case "years-desc":
          const yearsA = a.year_established ? new Date().getFullYear() - a.year_established : 0;
          const yearsB = b.year_established ? new Date().getFullYear() - b.year_established : 0;
          return yearsB - yearsA;
        case "years-asc":
          // Unknown years go to end (treated as newest/0 years)
          const yearsA2 = a.year_established ? new Date().getFullYear() - a.year_established : 0;
          const yearsB2 = b.year_established ? new Date().getFullYear() - b.year_established : 0;
          return yearsA2 - yearsB2;
        default:
          return 0;
      }
    });

    return result;
  }, [nearbyFacilities, selectedType, selectedState, sortBy]);

  // Get unique states and types from data
  const availableStates = useMemo(() => {
    const states = [...new Set(nearbyFacilities.map(f => f.state))].sort();
    return states;
  }, [nearbyFacilities]);

  const availableTypes = useMemo(() => {
    const types = [...new Set(nearbyFacilities.map(f => f.facility_type).filter(Boolean))].sort() as string[];
    return types;
  }, [nearbyFacilities]);

  const activeFiltersCount = (selectedType !== "all" ? 1 : 0) + (selectedState !== "all" ? 1 : 0);

  const clearFilters = () => {
    setSelectedType("all");
    setSelectedState("all");
    setSortBy("name-asc");
  };

  const getSortLabel = (sort: SortOption): string => {
    switch (sort) {
      case "name-asc": return "Name (A-Z)";
      case "name-desc": return "Name (Z-A)";
      case "state-asc": return "Location (A-Z)";
      case "state-desc": return "Location (Z-A)";
      case "years-desc": return "Most Established";
      case "years-asc": return "Newest First";
      default: return "Sort";
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search-results?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Show discovery layout when no nearby facilities
  if (!isLoading && nearbyFacilities.length === 0) {
    return (
      <>
      <Helmet>
        <title>Find Treatment Centers | RehabLookup</title>
        <meta name="description" content="Discover addiction treatment centers near you. Search, compare, and connect with verified rehab facilities." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-full">
        {/* Hero Search Section */}
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

        {/* Quick Links Grid */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Popular Pages */}
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

            {/* Find Treatment */}
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

          {/* Call to Action */}
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

  // Main layout with sidebar
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
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-2xl">
              <div className="relative flex-1 group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type="text"
                    placeholder="Search by city, state, or facility name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-background border-border/60 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>
              </div>
              <Button type="submit" size="lg" className="h-11 px-5 shadow-sm">
                <Search className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Search</span>
              </Button>
            </form>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="lg"
              onClick={() => setShowFilters(!showFilters)}
              className="h-11 gap-2 shrink-0 shadow-sm"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <Badge variant={showFilters ? "secondary" : "default"} className="ml-1 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs rounded-full">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter Results
                </h3>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
                    <X className="h-3 w-3" />
                    Clear All
                  </Button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Facility Type Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Facility Type</label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {availableTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* State Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">State</label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {availableStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <ArrowUpDown className="h-3 w-3" />
                    Sort By
                  </label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
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

              {/* Active Filters */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
                  {selectedType !== "all" && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      <Building2 className="h-3 w-3" />
                      {selectedType}
                      <button
                        onClick={() => setSelectedType("all")}
                        className="ml-1 p-0.5 rounded-full hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {selectedState !== "all" && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      <MapPin className="h-3 w-3" />
                      {selectedState}
                      <button
                        onClick={() => setSelectedState("all")}
                        className="ml-1 p-0.5 rounded-full hover:bg-muted-foreground/20"
                      >
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
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Feed */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg sm:text-xl font-display font-bold text-foreground flex items-center gap-2 truncate">
                <TrendingUp className="h-5 w-5 text-primary shrink-0" />
                <span className="truncate">Treatment Centers For You</span>
              </h2>
              <Badge variant="secondary" className="text-xs shrink-0">
                {filteredFacilities.length} result{filteredFacilities.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <FacilityCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredFacilities.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <div className="p-3 rounded-full bg-muted w-fit mx-auto mb-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">No facilities found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your filters or search criteria
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredFacilities.map((facility) => (
                  <FacilityCard key={facility.id} facility={facility} />
                ))}
              </div>
            )}

            {/* Load More */}
            {!isLoading && filteredFacilities.length > 0 && (
              <div className="mt-6 text-center">
                <Button variant="outline" asChild>
                  <Link to="/search-results" className="gap-2">
                    View All Treatment Centers
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-72 xl:w-80 shrink-0 space-y-4">
            {/* Quick Stats */}
            <Card className="border-border/50">
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
                    <p className="font-semibold text-foreground">My Requests</p>
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
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
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
