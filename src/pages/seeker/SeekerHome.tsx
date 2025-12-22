import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Search, 
  MapPin, 
  FileText, 
  HelpCircle, 
  Shield, 
  Phone,
  Building2,
  Heart,
  ArrowRight,
  Clock,
  Star,
  TrendingUp,
  Bookmark,
  MessageSquare,
  ChevronRight,
  Filter,
  X,
  SlidersHorizontal,
  ArrowUpDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

interface NearbyFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  facility_type: string;
  slug: string;
  phone: string | null;
  description: string | null;
  logo_url: string | null;
  gallery_urls: string[] | null;
  verified: boolean | null;
  year_established: number | null;
}

const FACILITY_TYPES = [
  "Residential Treatment",
  "Outpatient",
  "Detox Center",
  "Sober Living",
  "Dual Diagnosis",
  "Luxury Rehab",
  "Faith-Based",
  "Adolescent Treatment"
];

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

type SortOption = "name-asc" | "name-desc" | "state-asc" | "state-desc" | "years-desc" | "years-asc";

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Polished Facility Card Component
function FacilityCard({ facility }: { facility: NearbyFacility }) {
  const { toggleFavorite, isFavorite } = useFavorites();
  const [logoError, setLogoError] = useState(false);
  const [heroError, setHeroError] = useState(false);

  const initials = getInitials(facility.name);
  const hasLogo = facility.logo_url && !logoError;
  const heroImage = facility.gallery_urls?.[0];
  const hasHeroImage = heroImage && !heroError;
  const yearsInBusiness = facility.year_established 
    ? new Date().getFullYear() - facility.year_established 
    : null;

  return (
    <article className="group relative h-full overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300">
      <div className="flex h-full flex-col sm:flex-row">
        {/* Image Section - Fixed height to ensure consistent card sizes */}
        <div className="relative sm:w-48 lg:w-56 shrink-0 overflow-hidden">
          <div className="aspect-[16/10] sm:aspect-auto sm:h-[160px]">
            {hasHeroImage ? (
              <>
                <img 
                  src={heroImage}
                  alt={`${facility.name} facility`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={() => setHeroError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary">
                <div className="text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-muted shadow-sm">
                    <span className="font-display text-lg font-bold text-muted-foreground">
                      {initials}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Photo coming soon
                  </span>
                </div>
              </div>
            )}
            
            {/* Logo overlay */}
            <div className="absolute bottom-2 left-2 z-10">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 border-white bg-card shadow-md">
                {hasLogo ? (
                  <img 
                    src={facility.logo_url!}
                    alt={`${facility.name} logo`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <span className="font-display text-xs font-bold text-primary">
                      {initials}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Years badge */}
            {yearsInBusiness && yearsInBusiness > 0 && (
              <div className="absolute bottom-2 right-2 z-10">
                <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
                  <Clock className="h-3 w-3 text-blue-600" />
                  <span className="text-[10px] font-semibold text-blue-700">{yearsInBusiness}+ yrs</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <Link to={`/center/${facility.slug}`}>
                <h3 className="font-display text-base font-bold leading-tight line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                  {facility.name}
                </h3>
              </Link>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="font-medium">{facility.city}, {facility.state}</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(facility.id);
              }}
              className={cn(
                "p-2 rounded-lg border transition-all duration-200",
                isFavorite(facility.id)
                  ? "bg-rose-50 border-rose-200 text-rose-500"
                  : "bg-secondary/50 border-border text-muted-foreground hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50"
              )}
              aria-label={isFavorite(facility.id) ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={cn("h-4 w-4", isFavorite(facility.id) && "fill-current")} />
            </button>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {facility.verified && (
              <Badge className="gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 border-0">
                <Shield className="h-3 w-3" />
                Verified
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-semibold">
              <Building2 className="h-3 w-3" />
              {facility.facility_type}
            </Badge>
          </div>

          {/* Description */}
          {facility.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
              {facility.description}
            </p>
          )}

          {/* Action */}
          <div className="mt-auto">
            <Link to={`/center/${facility.slug}`}>
              <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5 group/btn">
                View Details
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

// Skeleton loader for facility cards
function FacilityCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <Skeleton className="h-32 sm:h-40 sm:w-48 lg:w-56" />
        <div className="p-4 flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );
}

export default function SeekerHome() {
  const [searchQuery, setSearchQuery] = useState("");
  const [nearbyFacilities, setNearbyFacilities] = useState<NearbyFacility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const { favoritesCount } = useFavorites();

  useEffect(() => {
    const fetchNearbyFacilities = async () => {
      const { data } = await supabase
        .from('facilities')
        .select('id, name, city, state, facility_type, slug, phone, description, logo_url, gallery_urls, verified, year_established')
        .eq('status', 'approved')
        .limit(50);
      
      setNearbyFacilities(data || []);
      setIsLoading(false);
    };

    fetchNearbyFacilities();
  }, []);

  // Filter and sort facilities
  const filteredFacilities = useMemo(() => {
    let result = nearbyFacilities.filter((facility) => {
      const matchesType = selectedType === "all" || facility.facility_type === selectedType;
      const matchesState = selectedState === "all" || facility.state === selectedState;
      return matchesType && matchesState;
    });

    // Sort facilities
    result.sort((a, b) => {
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
          const yearsA2 = a.year_established ? new Date().getFullYear() - a.year_established : Infinity;
          const yearsB2 = b.year_established ? new Date().getFullYear() - b.year_established : Infinity;
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
    const types = [...new Set(nearbyFacilities.map(f => f.facility_type))].sort();
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
      window.location.href = `/search-results?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  // Show discovery layout when no nearby facilities
  if (!isLoading && nearbyFacilities.length === 0) {
    return (
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
            <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by city, state, or zip code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-6">
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
                  { to: "/request-help", icon: HelpCircle, label: "Request Help" },
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
                <Link to="/request-help">
                  <Phone className="h-4 w-4 mr-2" />
                  Request a Call Back
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main layout with sidebar
  return (
    <div className="min-h-full">
      {/* Search Header */}
      <div className="bg-card border-b border-border py-4 px-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search treatment centers by location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="default"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Treatment Centers For You
              </h2>
              <Badge variant="secondary" className="text-xs">
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
          <aside className="lg:w-80 shrink-0 space-y-4">
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
                <Link to="/account/inbox" className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Inbox</p>
                    <p className="text-xs text-muted-foreground">Messages & Forms</p>
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
                  { to: "/request-help", icon: Phone, label: "Get Help Now" },
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
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">Need Help?</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Our team is available 24/7
                </p>
                <Button asChild size="sm" className="w-full">
                  <Link to="/request-help">Request Call Back</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
