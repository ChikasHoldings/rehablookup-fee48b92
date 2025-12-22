import { useState, useMemo, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { 
  Search, 
  MapPin, 
  SlidersHorizontal, 
  X,
  Building2,
  Navigation
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
import { useApprovedFacilities } from "@/hooks/useApprovedFacilities";
import { useFavorites } from "@/hooks/useFavorites";
import { FacilityCard, FacilityCardData, FacilityCardSkeleton } from "@/components/seeker/FacilityCard";
import { 
  parseLocationInput, 
  sortByProximity
} from "@/lib/proximitySearch";
import { cn } from "@/lib/utils";
import { getLocationSuggestions, formatLocationSuggestion, type LocationSuggestion } from "@/data/locationSuggestions";

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: facilities, isLoading: facilitiesLoading } = useApprovedFacilities();
  const { favorites, toggleFavorite } = useFavorites();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [locationInput, setLocationInput] = useState(searchParams.get("location") || "");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedTreatmentTypes, setSelectedTreatmentTypes] = useState<string[]>(
    searchParams.get("type")?.split(",").filter(Boolean) || []
  );
  const [selectedFacilityTypes, setSelectedFacilityTypes] = useState<string[]>(
    searchParams.get("facility")?.split(",").filter(Boolean) || []
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Location suggestions
  const locationSuggestions = useMemo(() => {
    if (locationInput.length < 2) return [];
    return getLocationSuggestions(locationInput).slice(0, 5);
  }, [locationInput]);
  
  // Handle location selection
  const handleLocationSelect = useCallback((suggestion: LocationSuggestion) => {
    setLocationInput(formatLocationSuggestion(suggestion));
    setShowLocationSuggestions(false);
  }, []);
  
  // Filter and search facilities
  const filteredFacilities = useMemo(() => {
    if (!facilities) return [];
    
    let results = [...facilities];
    
    // Filter by search query (name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(f => 
        f.name.toLowerCase().includes(query) ||
        f.description?.toLowerCase().includes(query)
      );
    }
    
    // Filter by location
    if (locationInput) {
      const locationMatch = parseLocationInput(locationInput);
      const proximityResults = sortByProximity(results, locationMatch);
      
      // Only include results that have some proximity match
      results = proximityResults
        .filter(r => r.tier !== "nationwide" || !locationInput)
        .map(r => r.item);
    }
    
    // Filter by treatment type
    if (selectedTreatmentTypes.length > 0) {
      results = results.filter(f => {
        const facilityType = f.facilityType?.toLowerCase() || "";
        return selectedTreatmentTypes.some(type => facilityType.includes(type));
      });
    }
    
    // Filter by facility type
    if (selectedFacilityTypes.length > 0) {
      results = results.filter(f => {
        const facilityType = f.facilityType?.toLowerCase() || "";
        return selectedFacilityTypes.some(type => facilityType.includes(type));
      });
    }
    
    return results;
  }, [facilities, searchQuery, locationInput, selectedTreatmentTypes, selectedFacilityTypes]);
  
  // Map to FacilityCardData
  const facilityCards: FacilityCardData[] = useMemo(() => {
    return filteredFacilities.map(f => ({
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
      hasFeaturedSubscription: f.hasFeaturedSubscription,
      hasProfessionalPlan: f.hasProfessionalPlan,
    }));
  }, [filteredFacilities]);
  
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
  };
  
  const activeFilterCount = selectedTreatmentTypes.length + selectedFacilityTypes.length;
  
  return (
    <div className="flex flex-col min-h-full">
      {/* Search Header */}
      <div className="sticky top-0 z-40 bg-background border-b">
        <div className="p-4 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search treatment centers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-10 h-11 bg-muted/50 border-muted"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          
          {/* Location Input */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
              className="pl-9 pr-10 h-11 bg-muted/50 border-muted"
            />
            {locationInput && (
              <button
                onClick={() => setLocationInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            
            {/* Location Suggestions */}
            {showLocationSuggestions && locationSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {locationSuggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.name}-${index}`}
                    onClick={() => handleLocationSelect(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-muted flex items-center gap-2 border-b last:border-b-0"
                  >
                    <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">
                      {formatLocationSuggestion(suggestion)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    "gap-2",
                    activeFilterCount > 0 && "border-primary text-primary"
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
                <SheetHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <SheetTitle>Filters</SheetTitle>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear all
                      </Button>
                    )}
                  </div>
                </SheetHeader>
                
                <div className="py-4 overflow-y-auto h-[calc(100%-8rem)]">
                  <Accordion type="multiple" defaultValue={["treatment", "facility"]} className="w-full">
                    <AccordionItem value="treatment">
                      <AccordionTrigger className="text-base font-medium">
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
                                className="text-sm font-normal cursor-pointer"
                              >
                                {filter.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="facility">
                      <AccordionTrigger className="text-base font-medium">
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
                                className="text-sm font-normal cursor-pointer"
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
                
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => setFiltersOpen(false)}
                  >
                    Show {facilityCards.length} Results
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Active filter badges */}
            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-2">
                {selectedTreatmentTypes.map((type) => {
                  const filter = treatmentTypeFilters.find(f => f.value === type);
                  return (
                    <Badge 
                      key={type} 
                      variant="secondary" 
                      className="shrink-0 gap-1 pr-1"
                    >
                      {filter?.label}
                      <button 
                        onClick={() => toggleTreatmentType(type)}
                        className="ml-1 p-0.5 hover:bg-muted rounded"
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
                      className="shrink-0 gap-1 pr-1"
                    >
                      {filter?.label}
                      <button 
                        onClick={() => toggleFacilityType(type)}
                        className="ml-1 p-0.5 hover:bg-muted rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Results */}
      <div className="flex-1 p-4">
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
            <h3 className="text-lg font-semibold mb-2">No facilities found</h3>
            <p className="text-muted-foreground text-sm max-w-xs mb-4">
              Try adjusting your search or filters to find treatment centers.
            </p>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {facilityCards.length} {facilityCards.length === 1 ? "facility" : "facilities"} found
              {locationInput && ` near ${locationInput}`}
            </p>
            
            {facilityCards.map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
