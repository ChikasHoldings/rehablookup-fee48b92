import { useState, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { 
  Search, 
  MapPin, 
  SlidersHorizontal, 
  X,
  Building2,
  Navigation,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { FacilityCard, FacilityCardData, FacilityCardSkeleton } from "@/components/seeker/FacilityCard";
import { 
  parseLocationInput, 
  sortByProximity,
  getStateAbbr,
} from "@/lib/proximitySearch";
import { getPlanPriority } from "@/lib/facilityPlanSort";
import { cn } from "@/lib/utils";
import { getLocationSuggestions, formatLocationSuggestion, type LocationSuggestion } from "@/data/locationSuggestions";

const SEARCH_PAGE_SIZE = 12;

// Popular search terms
const popularSearches = [
  "Alcohol Rehab",
  "Drug Treatment",
  "Detox Centers",
  "Dual Diagnosis",
  "Outpatient Programs",
  "Inpatient Rehab",
];

// Quick search keywords
const searchKeywords = [
  { label: "Detox", icon: "🏥" },
  { label: "Inpatient", icon: "🏠" },
  { label: "Outpatient", icon: "📋" },
  { label: "Sober Living", icon: "🏡" },
  { label: "Holistic", icon: "🌿" },
  { label: "Mental Health", icon: "🧠" },
];

// Recent locations (could be stored in localStorage)
const popularLocations = [
  { city: "Los Angeles", state: "CA" },
  { city: "Miami", state: "FL" },
  { city: "New York", state: "NY" },
  { city: "Chicago", state: "IL" },
  { city: "Houston", state: "TX" },
];

// Treatment type filters
const treatmentTypeFilters = [
  { value: "detox", label: "Detox" },
  { value: "inpatient", label: "Inpatient" },
  { value: "outpatient", label: "Outpatient" },
  { value: "dual-diagnosis", label: "Dual Diagnosis" },
  { value: "holistic", label: "Holistic" },
];

// Facility type filters
const facilityTypeFilters = [
  { value: "residential", label: "Residential" },
  { value: "outpatient-center", label: "Outpatient Center" },
  { value: "detox-center", label: "Detox Center" },
  { value: "sober-living", label: "Sober Living" },
];

export default function SeekerSearch() {
  const { data: facilities, isLoading: facilitiesLoading } = useStaticFacilities();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedTreatmentTypes, setSelectedTreatmentTypes] = useState<string[]>([]);
  const [selectedFacilityTypes, setSelectedFacilityTypes] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Location suggestions
  const locationSuggestions = useMemo(() => {
    if (locationInput.length < 2) return [];
    return getLocationSuggestions(locationInput).slice(0, 5);
  }, [locationInput]);
  
  // Handle location selection
  const handleLocationSelect = useCallback((suggestion: LocationSuggestion) => {
    setLocationInput(formatLocationSuggestion(suggestion));
    setShowLocationSuggestions(false);
    setHasSearched(true);
  }, []);

  // Handle popular location click
  const handlePopularLocationClick = (city: string, state: string) => {
    setLocationInput(`${city}, ${state}`);
    setHasSearched(true);
  };

  // Handle search keyword click
  const handleKeywordClick = (keyword: string) => {
    setSearchQuery(keyword);
    setHasSearched(true);
  };

  // Handle popular search click
  const handlePopularSearchClick = (term: string) => {
    setSearchQuery(term);
    setHasSearched(true);
  };

  // Handle search submission
  const handleSearch = () => {
    if (searchQuery.trim() || locationInput.trim() || selectedTreatmentTypes.length > 0 || selectedFacilityTypes.length > 0) {
      setHasSearched(true);
      setCurrentPage(1);
    }
  };

  // Check if there's an active search
  const hasActiveSearch = searchQuery.trim() || locationInput.trim() || selectedTreatmentTypes.length > 0 || selectedFacilityTypes.length > 0;
  
  // Filter, sort with proximity, and search facilities
  const filteredFacilities = useMemo(() => {
    if (!facilities || !hasSearched) return [];
    
    let results = [...facilities];
    
    // Filter by search query (name, description, facility type, treatment types)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(f => 
        f.name.toLowerCase().includes(query) ||
        f.description?.toLowerCase().includes(query) ||
        f.facilityType?.toLowerCase().includes(query) ||
        f.treatmentTypes?.some(t => t.toLowerCase().includes(query))
      );
    }
    
    // Parse location for filtering + sorting
    const locationMatch = locationInput ? parseLocationInput(locationInput) : null;
    
    // Filter by location — keep exact, city, state, and nearby matches
    if (locationInput && locationMatch) {
      const locationLower = locationInput.toLowerCase();
      results = results.filter(f => {
        if (locationMatch.zipcode && f.zipCode === locationMatch.zipcode) return true;
        if (f.city.toLowerCase().includes(locationLower)) return true;
        if (f.state.toLowerCase().includes(locationLower)) return true;
        if (locationMatch.stateAbbr) {
          const fAbbr = getStateAbbr(f.state);
          if (fAbbr?.toUpperCase() === locationMatch.stateAbbr!.toUpperCase()) return true;
          if (fAbbr && locationMatch.nearbyStates.includes(fAbbr.toUpperCase())) return true;
        }
        if (f.zipCode?.includes(locationInput)) return true;
        return false;
      });
    }
    
    // Filter by treatment type
    if (selectedTreatmentTypes.length > 0) {
      results = results.filter(f => {
        const facilityType = f.facilityType?.toLowerCase() || "";
        const types = f.treatmentTypes?.map(t => t.toLowerCase()) || [];
        return selectedTreatmentTypes.some(type => 
          facilityType.includes(type) || types.some(t => t.includes(type))
        );
      });
    }
    
    // Filter by facility type
    if (selectedFacilityTypes.length > 0) {
      results = results.filter(f => {
        const facilityType = f.facilityType?.toLowerCase() || "";
        return selectedFacilityTypes.some(type => facilityType.includes(type));
      });
    }
    
    // Sort: proximity first (if location), then Pro, then alphabetical
    results.sort((a, b) => {
      if (locationMatch) {
        const getProx = (f: typeof a) => {
          if (locationMatch.zipcode && f.zipCode === locationMatch.zipcode) return 0;
          if (locationMatch.city && f.city.toLowerCase() === locationMatch.city.toLowerCase()) return 1;
          const abbr = getStateAbbr(f.state);
          if (locationMatch.stateAbbr && abbr?.toUpperCase() === locationMatch.stateAbbr.toUpperCase()) return 2;
          if (abbr && locationMatch.nearbyStates.includes(abbr.toUpperCase())) return 3;
          return 4;
        };
        const proxA = getProx(a);
        const proxB = getProx(b);
        if (proxA !== proxB) return proxA - proxB;
      }
      // Within same proximity tier, Pro first
      const proA = getPlanPriority(a as any);
      const proB = getPlanPriority(b as any);
      if (proA !== proB) return proA - proB;
      return a.name.localeCompare(b.name);
    });
    
    return results;
  }, [facilities, searchQuery, locationInput, selectedTreatmentTypes, selectedFacilityTypes, hasSearched]);
  
  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredFacilities.length / SEARCH_PAGE_SIZE));
  const paginatedFacilities = useMemo(() => {
    const start = (currentPage - 1) * SEARCH_PAGE_SIZE;
    return filteredFacilities.slice(start, start + SEARCH_PAGE_SIZE);
  }, [filteredFacilities, currentPage]);
  
  // Map to FacilityCardData
  const facilityCards: FacilityCardData[] = useMemo(() => {
    return paginatedFacilities.map(f => ({
      id: f.id,
      name: f.name,
      city: f.city,
      state: f.state,
      phone: f.phone,
      facility_type: f.facilityType || null,
      slug: f.slug,
      description: f.description || null,
      logo_url: f.logo_url,
      gallery_urls: f.gallery_urls,
      verified: f.verified ?? null,
      year_established: f.year_established ?? null,
      planTier: f.planTier,
      featured: f.featured,
    }));
  }, [paginatedFacilities]);
  
  // Toggle filter
  const toggleTreatmentType = (value: string) => {
    setSelectedTreatmentTypes(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };
  
  const toggleFacilityType = (value: string) => {
    setSelectedFacilityTypes(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSelectedTreatmentTypes([]);
    setSelectedFacilityTypes([]);
    setLocationInput("");
    setSearchQuery("");
    setHasSearched(false);
    setCurrentPage(1);
  };
  
  const activeFilterCount = selectedTreatmentTypes.length + selectedFacilityTypes.length;
  
  return (
    <>
      <Helmet>
        <title>Search Treatment Centers | RehabLookup</title>
        <meta name="description" content="Search and find treatment centers near you. Filter by location, treatment type, and facility type." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="flex flex-col min-h-full bg-background">
        {/* Search Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pt-4 pb-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search treatment centers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 pr-11 h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl text-base"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-lg transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            
            {/* Location Input */}
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="City, State or ZIP code"
                value={locationInput}
                onChange={(e) => {
                  setLocationInput(e.target.value);
                  setShowLocationSuggestions(true);
                }}
                onFocus={() => setShowLocationSuggestions(true)}
                onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 pr-11 h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl text-base"
              />
              {locationInput && (
                <button
                  onClick={() => setLocationInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-lg transition-colors"
                  aria-label="Clear location"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              
              {/* Location Suggestions */}
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.name}-${index}`}
                      onClick={() => handleLocationSelect(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-muted flex items-center gap-3 border-b border-border last:border-b-0 transition-colors"
                    >
                      <Navigation className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm text-foreground">
                        {formatLocationSuggestion(suggestion)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Search Button & Filters */}
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleSearch}
                disabled={!hasActiveSearch}
                className="flex-1 h-12 rounded-xl font-medium text-base"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className={cn(
                      "h-12 w-12 rounded-xl shrink-0 relative",
                      activeFilterCount > 0 && "border-primary text-primary"
                    )}
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
                  <SheetHeader className="pb-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="text-foreground">Filters</SheetTitle>
                      {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-primary">
                          Clear all
                        </Button>
                      )}
                    </div>
                  </SheetHeader>
                  
                  <div className="py-4 overflow-y-auto h-[calc(100%-8rem)]">
                    <Accordion type="multiple" defaultValue={["treatment", "facility"]} className="w-full">
                      <AccordionItem value="treatment" className="border-border">
                        <AccordionTrigger className="text-base font-medium text-foreground">
                          Treatment Type
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {treatmentTypeFilters.map((filter) => (
                              <div key={filter.value} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`treatment-${filter.value}`}
                                  checked={selectedTreatmentTypes.includes(filter.value)}
                                  onCheckedChange={() => toggleTreatmentType(filter.value)}
                                />
                                <Label 
                                  htmlFor={`treatment-${filter.value}`}
                                  className="text-sm font-normal cursor-pointer text-foreground"
                                >
                                  {filter.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="facility" className="border-border">
                        <AccordionTrigger className="text-base font-medium text-foreground">
                          Facility Type
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {facilityTypeFilters.map((filter) => (
                              <div key={filter.value} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`facility-${filter.value}`}
                                  checked={selectedFacilityTypes.includes(filter.value)}
                                  onCheckedChange={() => toggleFacilityType(filter.value)}
                                />
                                <Label 
                                  htmlFor={`facility-${filter.value}`}
                                  className="text-sm font-normal cursor-pointer text-foreground"
                                >
                                  {filter.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                  
                  <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
                    <Button 
                      className="w-full h-12 rounded-xl font-medium" 
                      onClick={() => {
                        setFiltersOpen(false);
                        setHasSearched(true);
                      }}
                    >
                      Apply Filters
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8 py-4 pb-24">
          {!hasSearched ? (
            /* Initial State - Show suggestions */
            <div className="space-y-6">
              {/* Quick Search Keywords */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Quick Search</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchKeywords.map((keyword) => (
                    <button
                      key={keyword.label}
                      onClick={() => handleKeywordClick(keyword.label)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-full hover:bg-muted hover:border-primary/50 transition-all active:scale-95"
                    >
                      <span className="text-base">{keyword.icon}</span>
                      <span className="text-sm font-medium text-foreground">{keyword.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Popular Searches */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Popular Searches</h2>
                </div>
                <div className="space-y-1">
                  {popularSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handlePopularSearchClick(term)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl hover:bg-muted hover:border-primary/50 transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{term}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </section>

              {/* Popular Locations */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Popular Locations</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularLocations.map((loc) => (
                    <button
                      key={`${loc.city}-${loc.state}`}
                      onClick={() => handlePopularLocationClick(loc.city, loc.state)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-full hover:bg-muted hover:border-primary/50 transition-all active:scale-95"
                    >
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium text-foreground">{loc.city}, {loc.state}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Help Text */}
              <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex gap-3">
                  <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Find the Right Treatment</h3>
                    <p className="text-sm text-muted-foreground">
                      Search by name, location, or treatment type to find verified treatment centers that match your needs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Search Results */
            <div>
              {/* Active Filters */}
              {(selectedTreatmentTypes.length > 0 || selectedFacilityTypes.length > 0) && (
                <div className="mb-4 overflow-x-auto scrollbar-hide">
                  <div className="flex items-center gap-2">
                    {selectedTreatmentTypes.map((type) => {
                      const filter = treatmentTypeFilters.find(f => f.value === type);
                      return (
                        <Badge 
                          key={type} 
                          variant="secondary" 
                          className="shrink-0 gap-1 pr-1 bg-primary/10 text-primary border-primary/20"
                        >
                          {filter?.label}
                          <button 
                            onClick={() => toggleTreatmentType(type)}
                            className="ml-1 p-0.5 hover:bg-primary/20 rounded"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {selectedFacilityTypes.map((type) => {
                      const filter = facilityTypeFilters.find(f => f.value === type);
                      return (
                        <Badge 
                          key={type} 
                          variant="secondary" 
                          className="shrink-0 gap-1 pr-1 bg-primary/10 text-primary border-primary/20"
                        >
                          {filter?.label}
                          <button 
                            onClick={() => toggleFacilityType(type)}
                            className="ml-1 p-0.5 hover:bg-primary/20 rounded"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {facilitiesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <FacilityCardSkeleton key={i} />
                  ))}
                </div>
              ) : facilityCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No facilities found</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mb-4">
                    Try adjusting your search terms or filters to find treatment centers.
                  </p>
                  <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl">
                    Clear search & filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-medium text-foreground">{(currentPage - 1) * SEARCH_PAGE_SIZE + 1}-{Math.min(currentPage * SEARCH_PAGE_SIZE, filteredFacilities.length)}</span> of{" "}
                      <span className="font-medium text-foreground">{filteredFacilities.length}</span>
                      {searchQuery && <span> for "<span className="text-foreground font-medium">{searchQuery}</span>"</span>}
                      {locationInput && <span> near <span className="text-foreground font-medium">{locationInput}</span></span>}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearFilters}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </Button>
                  </div>
                  
                  {facilityCards.map((facility) => (
                    <FacilityCard
                      key={facility.id}
                      facility={facility}
                    />
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
