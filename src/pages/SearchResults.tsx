import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateSearchResultsSchema } from "@/components/SEO";
import { SearchResultCard } from "@/components/cards/SearchResultCard";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { scrollToTopSmooth } from "@/hooks/useScrollToTop";
import { 
  Heart, 
  MapPin, 
  Search, 
  X, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Phone,
  SlidersHorizontal,
  Building2,
  Shield,
  Star,
  DollarSign,
  Sparkles,
  ChevronDown,
  Navigation,
  CreditCard,
  Compass
} from "lucide-react";
import supportSpecialistImg from "@/assets/support-specialist.png";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  parseLocationInput, 
  sortByProximity, 
  getStateAbbr,
  getNearbyStates,
  type ProximityTier, 
  type ProximityResult,
  type LocationMatch 
} from "@/lib/proximitySearch";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getPlanPriority } from "@/lib/facilityPlanSort";

const ITEMS_PER_PAGE = 12;

type SortOption = "proximity" | "featured" | "rating-high" | "rating-low" | "name-asc" | "name-desc" | "reviews";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "proximity", label: "Nearest First" },
  { value: "featured", label: "Featured First" },
  { value: "rating-high", label: "Highest Rated" },
  { value: "rating-low", label: "Lowest Rated" },
  { value: "reviews", label: "Most Reviews" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
];

// Treatment type filters with mappings to actual treatment types in data
const treatmentTypeFilters = [
  { value: "detox", label: "Detox", matches: ["Detox", "Detoxification"] },
  { value: "inpatient", label: "Inpatient", matches: ["Inpatient", "Inpatient/Residential", "Residential"] },
  { value: "outpatient", label: "Outpatient", matches: ["Outpatient", "Intensive Outpatient (IOP)", "Partial Hospitalization (PHP)"] },
  { value: "dual-diagnosis", label: "Dual Diagnosis", matches: ["Dual Diagnosis"] },
  { value: "holistic", label: "Holistic", matches: ["Holistic", "Holistic Therapy"] },
];

// Distance filters
const distanceFilters = [
  { value: "10", label: "Within 10 miles" },
  { value: "25", label: "Within 25 miles" },
  { value: "50", label: "Within 50 miles" },
  { value: "100", label: "Within 100 miles" },
  { value: "any", label: "Any distance" },
];

// Insurance filters with logos
const insuranceFilters = [
  { value: "aetna", label: "Aetna", logo: "/insurance-logos/aetna.svg" },
  { value: "bcbs", label: "Blue Cross Blue Shield", logo: "/insurance-logos/bcbs.svg" },
  { value: "cigna", label: "Cigna", logo: "/insurance-logos/cigna.svg" },
  { value: "united", label: "United Healthcare", logo: "/insurance-logos/united.svg" },
  { value: "kaiser", label: "Kaiser Permanente", logo: "/insurance-logos/kaiser.svg" },
  { value: "humana", label: "Humana", logo: "/insurance-logos/humana.svg" },
  { value: "anthem", label: "Anthem", logo: "/insurance-logos/anthem.svg" },
  { value: "medicare", label: "Medicare", logo: "/insurance-logos/medicare.svg" },
  { value: "medicaid", label: "Medicaid", logo: "/insurance-logos/medicaid.svg" },
  { value: "tricare", label: "TRICARE", logo: "/insurance-logos/tricare.svg" },
  { value: "private-pay", label: "Self-Pay / Private Pay" },
];

// Amenity filters
const amenityFilters = [
  { value: "private-rooms", label: "Private Rooms" },
  { value: "gym", label: "Fitness Center" },
  { value: "pool", label: "Swimming Pool" },
  { value: "meditation", label: "Meditation" },
];

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Basic search params
  const location = searchParams.get("location") || "";
  const treatment = searchParams.get("treatment") || "";
  const insurance = searchParams.get("insurance") || "";
  const type = searchParams.get("type") || "";
  const queryParam = searchParams.get("q") || ""; // Free-text search from header/seeker
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const sortParam = (searchParams.get("sort") as SortOption) || "proximity";
  
  // Filter params (comma-separated values)
  const treatmentTypesParam = searchParams.get("treatmentTypes") || "";
  const amenitiesParam = searchParams.get("amenities") || "";
  const insuranceTypesParam = searchParams.get("insuranceTypes") || "";
  const distanceParam = searchParams.get("distance") || "";
  const verifiedOnly = searchParams.get("verified") === "true";
  const featuredOnly = searchParams.get("featuredOnly") === "true";

  // Parse comma-separated filter values
  const selectedTreatmentTypes = treatmentTypesParam ? treatmentTypesParam.split(",") : [];
  const selectedAmenities = amenitiesParam ? amenitiesParam.split(",") : [];
  const selectedInsuranceTypes = insuranceTypesParam ? insuranceTypesParam.split(",") : [];
  const selectedDistance = distanceParam || "";

  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();
  const geo = useGeoLocation();

  // Get seeker profile location for proximity when no explicit location is searched
  const { data: seekerProfile } = useQuery({
    queryKey: ["seeker-profile-location-search"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("seeker_profiles")
        .select("state, city")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  // Determine effective location for proximity sorting
  const effectiveLocation = useMemo(() => {
    if (location) return location;
    // Use seeker profile state as fallback for proximity
    if (seekerProfile?.state) return seekerProfile.state;
    return "";
  }, [location, seekerProfile]);

  const allCenters = approvedFacilities;

  const typeFilterMap: Record<string, string[]> = {
    drug: ["Detox", "Inpatient", "Outpatient"],
    alcohol: ["Detox", "Inpatient", "Outpatient"],
    "mental-health": ["Dual Diagnosis"],
    residential: ["Inpatient"],
    outpatient: ["Outpatient"],
    holistic: ["Inpatient", "Outpatient"],
  };

  const typeDisplayNames: Record<string, string> = {
    drug: "Drug Addiction",
    alcohol: "Alcohol Treatment",
    "mental-health": "Mental Health",
    residential: "Residential Rehab",
    outpatient: "Outpatient Programs",
    holistic: "Holistic Therapy",
  };

  // Toggle filter helper
  const toggleFilter = useCallback((paramName: string, value: string, currentValues: string[]) => {
    const newParams = new URLSearchParams(searchParams);
    const isCurrentlySelected = currentValues.includes(value);
    
    let newValues: string[];
    if (isCurrentlySelected) {
      newValues = currentValues.filter(v => v !== value);
    } else {
      newValues = [...currentValues, value];
    }
    
    if (newValues.length > 0) {
      newParams.set(paramName, newValues.join(","));
    } else {
      newParams.delete(paramName);
    }
    
    newParams.delete("page"); // Reset to page 1 when filtering
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Set single value filter
  const setSingleFilter = useCallback((paramName: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "any") {
      newParams.set(paramName, value);
    } else {
      newParams.delete(paramName);
    }
    newParams.delete("page");
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Toggle boolean filter
  const toggleBooleanFilter = useCallback((paramName: string, currentValue: boolean) => {
    const newParams = new URLSearchParams(searchParams);

    if (currentValue) {
      newParams.delete(paramName);
    } else {
      newParams.set(paramName, "true");
    }
    newParams.delete("page");
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const filteredCenters = useMemo(() => {
    let results = [...allCenters];

    // Build location match from explicit location or effective fallback
    let locationMatch: LocationMatch | null = null;
    const locationForFilter = location; // Only filter by explicit location
    const locationForSort = effectiveLocation; // Sort by effective (includes profile fallback)
    
    if (locationForFilter) {
      locationMatch = parseLocationInput(locationForFilter);
      const locationLower = locationForFilter.toLowerCase();
      
      // Filter to include relevant results by location
      results = results.filter((c) => {
        if (locationMatch?.zipcode && c.zipCode === locationMatch.zipcode) return true;
        if (c.city.toLowerCase().includes(locationLower)) return true;
        if (c.state.toLowerCase().includes(locationLower)) return true;
        if (locationMatch?.stateAbbr && 
            (c.state.toLowerCase() === locationMatch.stateAbbr.toLowerCase() ||
             c.state.toLowerCase() === (locationMatch.state?.toLowerCase() || ''))) return true;
        if (locationMatch?.nearbyStates.length) {
          const cStateAbbr = getStateAbbr(c.state);
          if (cStateAbbr && locationMatch.nearbyStates.includes(cStateAbbr.toUpperCase())) return true;
        }
        if (c.zipCode.includes(locationForFilter)) return true;
        return false;
      });
    }

    // Free-text search (from header search bar / seeker home ?q= param)
    if (queryParam) {
      const q = queryParam.toLowerCase();
      results = results.filter((c) => {
        if (c.name.toLowerCase().includes(q)) return true;
        if (c.description?.toLowerCase().includes(q)) return true;
        if (c.city.toLowerCase().includes(q)) return true;
        if (c.state.toLowerCase().includes(q)) return true;
        if (c.treatmentTypes.some((t) => t.toLowerCase().includes(q))) return true;
        if (c.insuranceAccepted.some((i) => i.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    // Treatment filter from search form (supports comma-separated multi-select)
    if (treatment) {
      const treatmentValues = treatment.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
      results = results.filter((c) =>
        treatmentValues.some(tv => 
          c.treatmentTypes.some((t) => t.toLowerCase() === tv || t.toLowerCase().includes(tv))
        )
      );
    }

    // Type filter from homepage cards
    if (type && typeFilterMap[type]) {
      results = results.filter((c) =>
        c.treatmentTypes.some((t) => typeFilterMap[type].includes(t))
      );
    }

    // Insurance filter from search form
    if (insurance) {
      results = results.filter((c) =>
        c.insuranceAccepted.some((i) =>
          i.toLowerCase().includes(insurance.toLowerCase())
        )
      );
    }

    // Insurance Types dropdown filters
    if (selectedInsuranceTypes.length > 0) {
      results = results.filter((center) => {
        return selectedInsuranceTypes.some(filterValue => {
          const filterConfig = insuranceFilters.find(f => f.value === filterValue);
          if (!filterConfig) return false;
          return center.insuranceAccepted.some(ins => 
            ins.toLowerCase().includes(filterConfig.label.toLowerCase()) ||
            ins.toLowerCase().includes(filterValue.toLowerCase())
          );
        });
      });
    }

    // Treatment Type dropdown filters
    if (selectedTreatmentTypes.length > 0) {
      results = results.filter((center) => {
        return selectedTreatmentTypes.some(filterValue => {
          const filterConfig = treatmentTypeFilters.find(f => f.value === filterValue);
          if (!filterConfig) return false;
          return center.treatmentTypes.some(tt => 
            filterConfig.matches.some(match => 
              tt.toLowerCase().includes(match.toLowerCase())
            )
          );
        });
      });
    }

    // Amenity filters
    if (selectedAmenities.length > 0) {
      results = results.filter((center) => {
        const description = (center.description || "").toLowerCase();
        return selectedAmenities.some(amenity => {
          switch (amenity) {
            case "private-rooms":
              return description.includes("private") || description.includes("room");
            case "gym":
              return description.includes("gym") || description.includes("fitness");
            case "pool":
              return description.includes("pool") || description.includes("swim");
            case "meditation":
              return description.includes("meditation") || description.includes("yoga") || description.includes("holistic");
            default:
              return false;
          }
        });
      });
    }

    // Verified only filter
    if (verifiedOnly) {
      results = results.filter((center) => (center as any).verified === true);
    }

    // Featured only filter
    if (featuredOnly) {
      results = results.filter((center) => center.featured === true);
    }

    // Proximity scoring function
    const getProximityScore = (center: { city: string; state: string; zipCode?: string }): number => {
      const sortLoc = locationForSort || locationForFilter;
      if (!sortLoc) return 4; // No location = all equal
      const match = locationMatch || parseLocationInput(sortLoc);
      
      if (match.zipcode && center.zipCode === match.zipcode) return 0;
      if (match.city && center.city.toLowerCase() === match.city.toLowerCase()) return 1;
      const centerAbbr = getStateAbbr(center.state);
      if (match.stateAbbr && centerAbbr?.toUpperCase() === match.stateAbbr.toUpperCase()) return 2;
      if (centerAbbr && match.nearbyStates.includes(centerAbbr.toUpperCase())) return 3;
      return 4;
    };

    // Sort results
    results.sort((a, b) => {
      if (sortParam === "proximity") {
        // Primary: proximity tier
        const proxA = getProximityScore(a);
        const proxB = getProximityScore(b);
        if (proxA !== proxB) return proxA - proxB;
        // Secondary: Pro/featured within tier
        const proA = getPlanPriority(a as any);
        const proB = getPlanPriority(b as any);
        if (proA !== proB) return proA - proB;
        return a.name.localeCompare(b.name);
      }

      if (sortParam === "featured") {
        // If location context exists, respect proximity tiers
        if (locationForSort) {
          const proxA = getProximityScore(a);
          const proxB = getProximityScore(b);
          if (proxA !== proxB) return proxA - proxB;
        }
        const proA = getPlanPriority(a as any);
        const proB = getPlanPriority(b as any);
        if (proA !== proB) return proA - proB;
        return a.name.localeCompare(b.name);
      }

      // For other sorts, Pro first then secondary
      const proA = getPlanPriority(a as any);
      const proB = getPlanPriority(b as any);
      if (proA !== proB) return proA - proB;

      switch (sortParam) {
        case "rating-high": return (b.rating || 0) - (a.rating || 0);
        case "rating-low": return (a.rating || 0) - (b.rating || 0);
        case "reviews": return (b.reviewCount || 0) - (a.reviewCount || 0);
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        default: return 0;
      }
    });

    return results;
  }, [allCenters, location, effectiveLocation, treatment, insurance, type, queryParam, sortParam, selectedTreatmentTypes, selectedAmenities, selectedInsuranceTypes, verifiedOnly, featuredOnly]);

  const hasFilters = location || treatment || insurance || type || queryParam || selectedTreatmentTypes.length > 0 || selectedAmenities.length > 0 || selectedInsuranceTypes.length > 0 || selectedDistance || verifiedOnly || featuredOnly;
  const activeTypeFilter = type ? typeDisplayNames[type] : null;

  // Count active filters
  const activeFiltersCount = selectedTreatmentTypes.length + selectedAmenities.length + selectedInsuranceTypes.length + (selectedDistance ? 1 : 0) + (verifiedOnly ? 1 : 0) + (featuredOnly ? 1 : 0);

  const totalPages = Math.ceil(filteredCenters.length / ITEMS_PER_PAGE);
  const paginatedCenters = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCenters.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCenters, currentPage]);

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", page.toString());
    setSearchParams(newParams);
    scrollToTopSmooth();
  };

  const clearFilter = (filterKey: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(filterKey);
    newParams.delete("page");
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    const newParams = new URLSearchParams();
    if (sortParam !== "featured") newParams.set("sort", sortParam);
    setSearchParams(newParams);
  };

  const handleSortChange = (value: SortOption) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === "proximity") {
      newParams.delete("sort");
    } else {
      newParams.set("sort", value);
    }
    newParams.delete("page");
    setSearchParams(newParams);
  };

  // Determine if this is a search with query params (should be noindexed)
  const hasSearchParams = !!(location || treatment || insurance || type || queryParam || treatmentTypesParam || amenitiesParam || insuranceTypesParam);
  const shouldNoindex = hasSearchParams || filteredCenters.length === 0;

  // Determine display title
  const searchDisplayTitle = queryParam
    ? `Results for "${queryParam}"`
    : location
      ? `Rehab Centers Near ${location}`
      : "Find Treatment Centers";

  return (
    <Layout>
      <SEO
        title={searchDisplayTitle}
        description={`Browse ${filteredCenters.length} verified addiction treatment centers${location ? ` near ${location}` : queryParam ? ` matching "${queryParam}"` : ""}. Compare rehab programs, check insurance, and start recovery.`}
        canonical="/search-results"
        noindex={shouldNoindex}
        structuredData={!shouldNoindex ? generateSearchResultsSchema({
          location: location || undefined,
          resultCount: filteredCenters.length,
          facilities: paginatedCenters.slice(0, 10).map(c => ({
            name: c.name,
            city: c.city,
            state: c.state,
            slug: 'slug' in c ? (c as any).slug : undefined,
          })),
        }) : undefined}
      />
      
      {/* Sticky Filter Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm">
        <div className="container max-w-5xl mx-auto">
          {/* Top Row: Back + Results Count + Sort */}
          <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-4">
              <Link 
                to="/rehab-centers" 
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="h-5 w-px bg-border" />
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <Search className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-semibold">
                    <span className="text-primary">{filteredCenters.length}</span>
                    <span className="text-foreground"> Treatment Centers</span>
                  </span>
                  {(location || queryParam) && (
                    <p className="text-xs text-muted-foreground">
                      {queryParam ? (
                        <>Results for "<span className="text-foreground font-medium">{queryParam}</span>"</>
                      ) : (
                        <>Near <span className="text-foreground font-medium">{location}</span></>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sort Dropdown */}
            <Select value={sortParam} onValueChange={(v) => handleSortChange(v as SortOption)}>
              <SelectTrigger className="h-9 w-[140px] md:w-[170px] gap-2 text-sm border-border bg-card hover:bg-secondary/50 transition-colors">
                <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border shadow-lg">
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-sm cursor-pointer">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
            {/* Treatment Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`gap-2 shrink-0 ${selectedTreatmentTypes.length > 0 ? 'border-primary bg-primary/5 text-primary' : ''}`}
                >
                  <Building2 className="h-4 w-4" />
                  Treatment Type
                  {selectedTreatmentTypes.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                      {selectedTreatmentTypes.length}
                    </Badge>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-card border-border shadow-lg">
                <DropdownMenuLabel>Treatment Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {treatmentTypeFilters.map((filter) => (
                  <DropdownMenuCheckboxItem
                    key={filter.value}
                    checked={selectedTreatmentTypes.includes(filter.value)}
                    onCheckedChange={() => toggleFilter("treatmentTypes", filter.value, selectedTreatmentTypes)}
                  >
                    {filter.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Distance Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`gap-2 shrink-0 ${selectedDistance ? 'border-primary bg-primary/5 text-primary' : ''}`}
                >
                  <Navigation className="h-4 w-4" />
                  Distance
                  {selectedDistance && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                      1
                    </Badge>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-card border-border shadow-lg">
                <DropdownMenuLabel>Distance</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {distanceFilters.map((filter) => (
                  <DropdownMenuCheckboxItem
                    key={filter.value}
                    checked={selectedDistance === filter.value}
                    onCheckedChange={() => setSingleFilter("distance", selectedDistance === filter.value ? "" : filter.value)}
                  >
                    {filter.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Insurance Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`gap-2 shrink-0 ${selectedInsuranceTypes.length > 0 ? 'border-primary bg-primary/5 text-primary' : ''}`}
                >
                  <Shield className="h-4 w-4" />
                  Insurance
                  {selectedInsuranceTypes.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                      {selectedInsuranceTypes.length}
                    </Badge>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-card border-border shadow-lg max-h-80 overflow-y-auto">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Filter by Insurance
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {insuranceFilters.map((filter) => (
                  <DropdownMenuCheckboxItem
                    key={filter.value}
                    checked={selectedInsuranceTypes.includes(filter.value)}
                    onCheckedChange={() => toggleFilter("insuranceTypes", filter.value, selectedInsuranceTypes)}
                    className="flex items-center gap-3 py-2"
                  >
                    {filter.logo ? (
                      <div className="flex h-6 w-8 shrink-0 items-center justify-center">
                        <img 
                          src={filter.logo} 
                          alt={filter.label} 
                          className="h-5 w-auto max-w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex h-6 w-8 shrink-0 items-center justify-center">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <span>{filter.label}</span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Amenities Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`gap-2 shrink-0 ${selectedAmenities.length > 0 ? 'border-primary bg-primary/5 text-primary' : ''}`}
                >
                  <Star className="h-4 w-4" />
                  Amenities
                  {selectedAmenities.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                      {selectedAmenities.length}
                    </Badge>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-card border-border shadow-lg">
                <DropdownMenuLabel>Amenities</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {amenityFilters.map((filter) => (
                  <DropdownMenuCheckboxItem
                    key={filter.value}
                    checked={selectedAmenities.includes(filter.value)}
                    onCheckedChange={() => toggleFilter("amenities", filter.value, selectedAmenities)}
                  >
                    {filter.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Verified Toggle */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => toggleBooleanFilter("verified", verifiedOnly)}
              className={`gap-2 shrink-0 ${verifiedOnly ? 'border-primary bg-primary/5 text-primary' : ''}`}
            >
              <Shield className="h-4 w-4" />
              Verified
            </Button>

            {/* Featured Toggle */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => toggleBooleanFilter("featuredOnly", featuredOnly)}
              className={`gap-2 shrink-0 ${featuredOnly ? 'border-amber-500 bg-amber-50 text-amber-700' : ''}`}
            >
              <Sparkles className="h-4 w-4" />
              Featured
            </Button>

            {/* Separator */}
            {activeFiltersCount > 0 && (
              <>
                <div className="h-6 w-px bg-border shrink-0 mx-1" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </>
            )}
          </div>

          {/* Active Filters Pills */}
          {hasFilters && (
            <div className="flex items-center gap-2 flex-wrap pb-3 animate-fade-in">
              <span className="text-xs font-medium text-muted-foreground mr-1">Active:</span>
              {queryParam && (
                <button
                  onClick={() => clearFilter("q")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <Search className="h-3 w-3" />
                  "{queryParam}"
                  <X className="h-3 w-3 ml-0.5" />
                </button>
              )}
              {location && (
                <button
                  onClick={() => clearFilter("location")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <MapPin className="h-3 w-3" />
                  {location}
                  <X className="h-3 w-3 ml-0.5" />
                </button>
              )}
              {treatment && (
                <button
                  onClick={() => clearFilter("treatment")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  {treatment}
                  <X className="h-3 w-3 ml-0.5" />
                </button>
              )}
              {insurance && (
                <button
                  onClick={() => clearFilter("insurance")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  {insurance}
                  <X className="h-3 w-3 ml-0.5" />
                </button>
              )}
              {activeTypeFilter && (
                <button
                  onClick={() => clearFilter("type")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  {activeTypeFilter}
                  <X className="h-3 w-3 ml-0.5" />
                </button>
              )}
              {selectedTreatmentTypes.map(tt => {
                const filter = treatmentTypeFilters.find(f => f.value === tt);
                return (
                  <button
                    key={tt}
                    onClick={() => toggleFilter("treatmentTypes", tt, selectedTreatmentTypes)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <Building2 className="h-3 w-3" />
                    {filter?.label || tt}
                    <X className="h-3 w-3 ml-0.5" />
                  </button>
                );
              })}
              {selectedInsuranceTypes.map(ins => {
                const filter = insuranceFilters.find(f => f.value === ins);
                return (
                  <button
                    key={ins}
                    onClick={() => toggleFilter("insuranceTypes", ins, selectedInsuranceTypes)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <CreditCard className="h-3 w-3" />
                    {filter?.label || ins}
                    <X className="h-3 w-3 ml-0.5" />
                  </button>
                );
              })}
              {selectedDistance && (
                <button
                  onClick={() => clearFilter("distance")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Navigation className="h-3 w-3" />
                  {distanceFilters.find(f => f.value === selectedDistance)?.label || selectedDistance}
                  <X className="h-3 w-3 ml-0.5" />
                </button>
              )}
              {selectedAmenities.map(am => {
                const filter = amenityFilters.find(f => f.value === am);
                return (
                  <button
                    key={am}
                    onClick={() => toggleFilter("amenities", am, selectedAmenities)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <Star className="h-3 w-3" />
                    {filter?.label || am}
                    <X className="h-3 w-3 ml-0.5" />
                  </button>
                );
              })}
              {verifiedOnly && (
                <button
                  onClick={() => toggleBooleanFilter("verified", true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Shield className="h-3 w-3" />
                  Verified Only
                  <X className="h-3 w-3 ml-0.5" />
                </button>
              )}
              {featuredOnly && (
                <button
                  onClick={() => toggleBooleanFilter("featuredOnly", true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  Featured Only
                  <X className="h-3 w-3 ml-0.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area - Centered Cards */}
      <section className="bg-gradient-to-b from-secondary/30 to-background py-8 min-h-screen">
        <div className="container max-w-5xl mx-auto">
          {isLoading ? (
            <SearchResultsLoading count={6} />
          ) : paginatedCenters.length > 0 ? (
            <>
              {/* Results Summary */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredCenters.length)}</span> of{" "}
                    <span className="font-medium text-foreground">{filteredCenters.length}</span> results
                  </p>
                  {location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Compass className="h-3 w-3 text-primary" />
                      Results sorted by proximity to <span className="font-medium text-foreground">{location}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {location && (
                    <div className="hidden md:flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        <MapPin className="h-2.5 w-2.5" /> Exact
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        <Building2 className="h-2.5 w-2.5" /> City
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                        <Navigation className="h-2.5 w-2.5" /> State
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                        <Compass className="h-2.5 w-2.5" /> Nearby
                      </span>
                    </div>
                  )}
                  {paginatedCenters.some(c => c.featured || (c as any).hasFeaturedSubscription) && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Featured centers highlighted</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-4">
                {paginatedCenters.map((center, index) => (
                  <div 
                    key={center.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <SearchResultCard 
                      center={center} 
                      featured={center.featured}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-10 px-4 rounded-xl border-border bg-card shadow-sm hover:shadow-md transition-all"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className={`h-10 w-10 rounded-xl transition-all ${
                            currentPage === pageNum 
                              ? "bg-primary text-primary-foreground shadow-md" 
                              : "border-border bg-card shadow-sm hover:shadow-md"
                          }`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-10 px-4 rounded-xl border-border bg-card shadow-sm hover:shadow-md transition-all"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">No Results Found</h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                We couldn't find any treatment centers matching your criteria. Try adjusting your filters or search in a different location.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={clearAllFilters} variant="outline" className="gap-2">
                  <X className="h-4 w-4" />
                  Clear All Filters
                </Button>
                <Link to="/rehab-centers">
                  <Button className="gap-2">
                    Browse All Centers
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-gradient-to-r from-primary/5 via-background to-primary/5 py-12">
        <div className="container max-w-5xl mx-auto">
          <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-8 border border-primary/20 shadow-lg">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="shrink-0">
                <div className="relative">
                  <img 
                    src={supportSpecialistImg} 
                    alt="Recovery specialist ready to help" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center border-2 border-white">
                    <Phone className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Need Help Finding the Right Center?
                </h3>
                <p className="text-muted-foreground mb-4">
                  Our recovery specialists are available 24/7 to help you find the perfect treatment program for your needs.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Link to="/concierge">
                    <Button size="lg" className="gap-2 shadow-md hover:shadow-lg transition-shadow">
                      <Heart className="h-5 w-5" />
                      Find Treatment
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SearchResults;
