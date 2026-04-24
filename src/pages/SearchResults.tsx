import { useMemo, useState, useCallback, useEffect, type ReactNode } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateSearchResultsSchema } from "@/components/SEO";
import { SearchResultCard } from "@/components/cards/SearchResultCard";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { scrollToTopSmooth } from "@/hooks/useScrollToTop";
import { SearchResultsForm } from "@/components/search/SearchResultsForm";
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
  Compass,
  Share2,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  enrichLocationMatchWithZip,
  getProximityTier,
  getStateAbbr,
  getNearbyStates,
  normalizeLocation,
  facilityMatchesLocation,
  PROXIMITY_TIER_ORDER,
  type ProximityTier, 
  type ProximityResult,
  type LocationMatch 
} from "@/lib/proximitySearch";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getPlanPriority } from "@/lib/facilityPlanSort";

// Restore user ID from localStorage to avoid getSession/getUser deadlocks
function getStoredUserId(): string | null {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || 'plckxokpyiubuekvodtc';
    const storageKey = `sb-${projectRef}-auth-token`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const session = parsed?.currentSession || parsed;
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

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
  const stateParam = searchParams.get("state") || ""; // Support direct state filtering from near-me pages
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
  const { lookup: lookupZipcode } = useZipcodeLookup();
  
  // Resolved ZIP data for enriching location match
  const [resolvedZipData, setResolvedZipData] = useState<{ city: string; state: string; stateAbbr: string } | null>(null);

  // Get seeker profile location for proximity when no explicit location is searched
  const storedUserId = getStoredUserId();
  const { data: seekerProfile } = useQuery({
    queryKey: ["seeker-profile-location-search", storedUserId],
    queryFn: async () => {
      if (!storedUserId) return null;
      const { data } = await supabase
        .from("seeker_profiles")
        .select("state, city")
        .eq("user_id", storedUserId)
        .maybeSingle();
      return data;
    },
    enabled: !!storedUserId,
    staleTime: 1000 * 60 * 10,
  });

  // Resolve ZIP codes to city/state for better proximity matching
  useEffect(() => {
    const parsed = parseLocationInput(location);
    if (parsed.isZipcode && parsed.zipcode) {
      lookupZipcode(parsed.zipcode).then((result) => {
        if (result) {
          setResolvedZipData(result);
        }
      });
    } else {
      setResolvedZipData(null);
    }
  }, [location, lookupZipcode]);

  // Determine effective location for proximity sorting
  // Priority: explicit location → seeker profile → geo-IP
  const effectiveLocation = useMemo(() => {
    if (location) return location;
    if (seekerProfile?.city && seekerProfile?.state) {
      return `${seekerProfile.city}, ${seekerProfile.state}`;
    }
    if (seekerProfile?.state) return seekerProfile.state;
    // Geo-IP fallback
    if (!geo.isLoading && geo.regionCode && geo.isUS) {
      if (geo.city) return `${geo.city}, ${geo.regionCode}`;
      return geo.region || "";
    }
    return "";
  }, [location, seekerProfile, geo.isLoading, geo.city, geo.regionCode, geo.region, geo.isUS]);

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

  const { filteredCenters, isExpandedSearch } = useMemo(() => {
    let results = [...allCenters];
    let expanded = false;

    // Direct state filter from URL param (e.g. from near-me pages: ?state=FL)
    if (stateParam) {
      const stateUpper = stateParam.toUpperCase();
      results = results.filter(c => {
        const cState = getStateAbbr(c.state)?.toUpperCase() || c.state.toUpperCase();
        return cState === stateUpper || c.state.toLowerCase() === stateParam.toLowerCase();
      });
    }

    // Build location match from explicit location or effective fallback
    let locationMatch: LocationMatch | null = null;
    const locationForFilter = location; // Only filter by explicit location
    const locationForSort = effectiveLocation; // Sort by effective (includes profile/geo fallback)
    
    if (locationForFilter) {
      locationMatch = parseLocationInput(locationForFilter);
      // Enrich with ZIP resolution data for better city/state matching
      if (resolvedZipData) {
        locationMatch = enrichLocationMatchWithZip(locationMatch, resolvedZipData);
      }
      
      // Filter to include relevant results by location
      const locationFiltered = results.filter((c) => facilityMatchesLocation(c, locationMatch!));
      
      // Auto-expand: if strict location filtering yields 0 results, show all results sorted by proximity
      if (locationFiltered.length === 0) {
        expanded = true;
        // Don't filter — let proximity sort handle ranking
      } else {
        results = locationFiltered;
      }
    }

    // Free-text search with fuzzy/partial matching
    if (queryParam) {
      const q = queryParam.toLowerCase().trim();
      // Split query into individual tokens for partial matching
      const tokens = q.split(/\s+/).filter(t => t.length > 1);
      
      results = results.filter((c) => {
        const nameL = c.name.toLowerCase();
        const descL = (c.description || "").toLowerCase();
        const cityL = c.city.toLowerCase();
        const stateL = c.state.toLowerCase();
        const treatmentL = c.treatmentTypes.map(t => t.toLowerCase()).join(" ");
        const insuranceL = c.insuranceAccepted.map(i => i.toLowerCase()).join(" ");
        const zipL = c.zipCode || "";
        const facilityTypeL = (c.facilityType || "").toLowerCase();
        const haystack = `${nameL} ${descL} ${cityL} ${stateL} ${treatmentL} ${insuranceL} ${zipL} ${facilityTypeL}`;
        
        // Full query match
        if (haystack.includes(q)) return true;
        
        // All individual tokens must match somewhere (AND logic for multi-word queries)
        if (tokens.length > 1) {
          return tokens.every(token => haystack.includes(token));
        }
        
        // Single token: also check partial word starts for typo tolerance
        if (tokens.length === 1) {
          const token = tokens[0];
          const words = haystack.split(/\s+/);
          return words.some(w => w.startsWith(token) || w.includes(token));
        }
        
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

    // Insurance filter from search form (supports comma-separated multi-select)
    if (insurance) {
      const insuranceValues = insurance.split(",").map(i => i.trim().toLowerCase()).filter(Boolean);
      results = results.filter((c) =>
        insuranceValues.some(iv =>
          c.insuranceAccepted.some((i) => i.toLowerCase().includes(iv))
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

    // Amenity filters — match against description + treatment types + facility type
    if (selectedAmenities.length > 0) {
      results = results.filter((center) => {
        const description = (center.description || "").toLowerCase();
        const allTypes = center.treatmentTypes.map(t => t.toLowerCase()).join(" ");
        const combined = `${description} ${allTypes}`;
        return selectedAmenities.some(amenity => {
          switch (amenity) {
            case "private-rooms":
              return combined.includes("private") && (combined.includes("room") || combined.includes("suite"));
            case "gym":
              return combined.includes("gym") || combined.includes("fitness") || combined.includes("exercise");
            case "pool":
              return combined.includes("pool") || combined.includes("aqua") || combined.includes("swimming");
            case "meditation":
              return combined.includes("meditation") || combined.includes("yoga") || combined.includes("mindfulness") || combined.includes("holistic");
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

    // Build proximity scoring using the enriched location match
    const getProximityScore = (center: { city: string; state: string; zipCode?: string }): number => {
      const sortLoc = locationForSort || locationForFilter;
      if (!sortLoc) return 4; // No location = all equal
      
      let match = locationMatch;
      if (!match) {
        match = parseLocationInput(sortLoc);
        // Also enrich sort-only location with geo data
        if (resolvedZipData) {
          match = enrichLocationMatchWithZip(match, resolvedZipData);
        }
      }
      
      const { tier } = getProximityTier(center, match);
      return PROXIMITY_TIER_ORDER[tier];
    };

    // Sort results with stable tiebreakers
    results.sort((a, b) => {
      if (sortParam === "proximity") {
        const proxA = getProximityScore(a);
        const proxB = getProximityScore(b);
        if (proxA !== proxB) return proxA - proxB;
        // Secondary: Pro/featured within tier
        const proA = getPlanPriority(a as any);
        const proB = getPlanPriority(b as any);
        if (proA !== proB) return proA - proB;
        // Tertiary: ranking score
        const rA = (a as any).calculatedRankingScore || 0;
        const rB = (b as any).calculatedRankingScore || 0;
        if (rA !== rB) return rB - rA;
        // Final: stable by ID
        return a.id.localeCompare(b.id);
      }

      if (sortParam === "featured") {
        if (locationForSort) {
          const proxA = getProximityScore(a);
          const proxB = getProximityScore(b);
          if (proxA !== proxB) return proxA - proxB;
        }
        const proA = getPlanPriority(a as any);
        const proB = getPlanPriority(b as any);
        if (proA !== proB) return proA - proB;
        return a.id.localeCompare(b.id);
      }

      // For other sorts, Pro first then secondary
      const proA = getPlanPriority(a as any);
      const proB = getPlanPriority(b as any);
      if (proA !== proB) return proA - proB;

      switch (sortParam) {
        case "rating-high": {
          const diff = ((b as any).calculatedRankingScore || 0) - ((a as any).calculatedRankingScore || 0);
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "rating-low": {
          const diff = ((a as any).calculatedRankingScore || 0) - ((b as any).calculatedRankingScore || 0);
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "reviews": {
          return a.id.localeCompare(b.id);
        }
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        default: return 0;
      }
    });

    // Attach proximity tier to each result for badge display
    const sortLoc = locationForSort || locationForFilter;
    if (sortLoc) {
      let match = locationMatch || parseLocationInput(sortLoc);
      if (resolvedZipData) {
        match = enrichLocationMatchWithZip(match, resolvedZipData);
      }
      results.forEach((r: any) => {
        const { tier, reason } = getProximityTier(r, match!);
        r._proximityTier = tier;
        r._proximityReason = reason;
      });
    }

    return { filteredCenters: results, isExpandedSearch: expanded };
  }, [allCenters, location, effectiveLocation, treatment, insurance, type, stateParam, queryParam, sortParam, selectedTreatmentTypes, selectedAmenities, selectedInsuranceTypes, verifiedOnly, featuredOnly, resolvedZipData]);

  const hasFilters = location || treatment || insurance || type || stateParam || queryParam || selectedTreatmentTypes.length > 0 || selectedAmenities.length > 0 || selectedInsuranceTypes.length > 0 || selectedDistance || verifiedOnly || featuredOnly;
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
    setSearchParams(new URLSearchParams());
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
  const hasSearchParams = !!(location || treatment || insurance || type || stateParam || queryParam || treatmentTypesParam || amenitiesParam || insuranceTypesParam);
  const shouldNoindex = hasSearchParams || filteredCenters.length === 0;

  // Determine display title
  const searchDisplayTitle = queryParam
    ? `Results for "${queryParam}"`
    : location
      ? `Rehab Centers Near ${location}`
      : "Find Treatment Centers";

  // Mobile filter sidebar open state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Accordion state — only one section open at a time, all collapsed by default
  const [openFilterSection, setOpenFilterSection] = useState<string | null>(null);

  const toggleFilterSection = useCallback((section: string) => {
    setOpenFilterSection(prev => prev === section ? null : section);
  }, []);

  // Collapsible filter section component
  const FilterSection = ({ id, icon, label, children, count }: { id: string; icon: ReactNode; label: string; children: ReactNode; count?: number }) => {
    const isOpen = openFilterSection === id;
    return (
      <div className="border border-border/60 rounded-xl overflow-hidden transition-all">
        <button
          onClick={() => toggleFilterSection(id)}
          className="w-full flex items-center justify-between px-3.5 py-3 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2.5">
            {icon}
            {label}
            {count && count > 0 ? (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold bg-primary/10 text-primary">{count}</Badge>
            ) : null}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="px-3.5 pb-3.5 pt-1">
            {children}
          </div>
        </div>
      </div>
    );
  };

  // Sidebar filter content — reused for desktop and mobile
  const FilterSidebar = () => (
    <div className="space-y-2">
      {/* Sort — always visible */}
      <div className="pb-3 mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Sort By
        </h3>
        <Select value={sortParam} onValueChange={(v) => handleSortChange(v as SortOption)}>
          <SelectTrigger className="w-full h-9 text-sm border-border bg-card">
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

      {/* Treatment Type */}
      <FilterSection id="treatment" icon={<Building2 className="h-3.5 w-3.5" />} label="Treatment Type" count={selectedTreatmentTypes.length}>
        <div className="space-y-1.5">
          {treatmentTypeFilters.map((filter) => {
            const active = selectedTreatmentTypes.includes(filter.value);
            return (
              <button
                key={filter.value}
                onClick={() => toggleFilter("treatmentTypes", filter.value, selectedTreatmentTypes)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                  active
                    ? "bg-primary/10 text-primary font-medium border border-primary/20"
                    : "text-foreground hover:bg-secondary/60 border border-transparent"
                }`}
              >
                <span>{filter.label}</span>
                {active && <X className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Distance */}
      <FilterSection id="distance" icon={<Navigation className="h-3.5 w-3.5" />} label="Distance" count={selectedDistance ? 1 : 0}>
        <div className="space-y-1.5">
          {distanceFilters.map((filter) => {
            const active = selectedDistance === filter.value;
            return (
              <button
                key={filter.value}
                onClick={() => setSingleFilter("distance", active ? "" : filter.value)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                  active
                    ? "bg-primary/10 text-primary font-medium border border-primary/20"
                    : "text-foreground hover:bg-secondary/60 border border-transparent"
                }`}
              >
                <span>{filter.label}</span>
                {active && <X className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Insurance */}
      <FilterSection id="insurance" icon={<Shield className="h-3.5 w-3.5" />} label="Insurance" count={selectedInsuranceTypes.length}>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
          {insuranceFilters.map((filter) => {
            const active = selectedInsuranceTypes.includes(filter.value);
            return (
              <button
                key={filter.value}
                onClick={() => toggleFilter("insuranceTypes", filter.value, selectedInsuranceTypes)}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                  active
                    ? "bg-primary/10 text-primary font-medium border border-primary/20"
                    : "text-foreground hover:bg-secondary/60 border border-transparent"
                }`}
              >
                {filter.logo ? (
                  <img src={filter.logo} alt={`${filter.label} logo`} className="h-4 w-5 object-contain shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1 text-left truncate">{filter.label}</span>
                {active && <X className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Amenities */}
      <FilterSection id="amenities" icon={<Star className="h-3.5 w-3.5" />} label="Amenities" count={selectedAmenities.length}>
        <div className="space-y-1.5">
          {amenityFilters.map((filter) => {
            const active = selectedAmenities.includes(filter.value);
            return (
              <button
                key={filter.value}
                onClick={() => toggleFilter("amenities", filter.value, selectedAmenities)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                  active
                    ? "bg-primary/10 text-primary font-medium border border-primary/20"
                    : "text-foreground hover:bg-secondary/60 border border-transparent"
                }`}
              >
                <span>{filter.label}</span>
                {active && <X className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Quick Filters */}
      <FilterSection id="quick" icon={<Sparkles className="h-3.5 w-3.5" />} label="Quick Filters" count={(verifiedOnly ? 1 : 0) + (featuredOnly ? 1 : 0)}>
        <div className="space-y-1.5">
          <button
            onClick={() => toggleBooleanFilter("verified", verifiedOnly)}
            className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
              verifiedOnly
                ? "bg-primary/10 text-primary font-medium border border-primary/20"
                : "text-foreground hover:bg-secondary/60 border border-transparent"
            }`}
          >
            <Shield className="h-4 w-4 shrink-0" />
            <span>Verified Only</span>
          </button>
          <button
            onClick={() => toggleBooleanFilter("featuredOnly", featuredOnly)}
            className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
              featuredOnly
                ? "bg-amber-50 text-amber-700 font-medium border border-amber-200"
                : "text-foreground hover:bg-secondary/60 border border-transparent"
            }`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Featured Only</span>
          </button>
        </div>
      </FilterSection>

      {/* Clear All */}
      {activeFiltersCount > 0 && (
        <>
          <div className="h-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="w-full text-muted-foreground hover:text-destructive gap-2"
          >
            <X className="h-4 w-4" />
            Clear All Filters ({activeFiltersCount})
          </Button>
        </>
      )}

      {/* Concierge CTA */}
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 border border-primary/15">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 shrink-0">
            <img src={supportSpecialistImg} alt="RehabLookup support specialist" className="w-full h-full object-cover object-top scale-110" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Need Help?</p>
            <p className="text-xs text-muted-foreground">Free guidance</p>
          </div>
        </div>
        <Link to="/concierge">
          <Button size="sm" className="w-full gap-2 text-xs">
            <Heart className="h-3.5 w-3.5" />
            Get Matched Free
          </Button>
        </Link>
      </div>
    </div>
  );

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

      {/* Compact Top Bar */}
      <div className="sticky top-[68px] z-30 border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm">
        <div className="container">
          <div className="flex items-center justify-between gap-2 sm:gap-4 py-2.5">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Link
                to="/rehab-centers"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors group shrink-0"
                aria-label="Back to all centers"
              >
                <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="h-5 w-px bg-border shrink-0 hidden xs:block" />
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 shrink-0">
                  <Search className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold whitespace-nowrap">
                    <span className="text-primary">{filteredCenters.length}</span>
                    <span className="text-foreground"> Centers</span>
                  </span>
                  {(location || queryParam) && (
                    <p className="text-xs text-muted-foreground hidden sm:block truncate">
                      {queryParam ? `"${queryParam}"` : `Near ${location}`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Active filter pills — compact */}
            {hasFilters && (
              <div className="hidden md:flex items-center gap-1.5 flex-1 justify-center overflow-hidden max-w-md mx-4">
                {queryParam && (
                  <button onClick={() => clearFilter("q")} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors shrink-0">
                    "{queryParam}" <X className="h-2.5 w-2.5" />
                  </button>
                )}
                {location && (
                  <button onClick={() => clearFilter("location")} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors shrink-0">
                    <MapPin className="h-2.5 w-2.5" />{location} <X className="h-2.5 w-2.5" />
                  </button>
                )}
                {activeFiltersCount > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">+{activeFiltersCount} filters</span>
                )}
              </div>
            )}

            {/* Mobile filter toggle */}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden gap-2"
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Inline search form — location + treatment + insurance */}
          <div className="pb-3">
            <SearchResultsForm />
          </div>
        </div>
      </div>

      {/* Mobile Filter Overlay */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[320px] max-w-[85vw] bg-card border-l border-border shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-card">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Filters & Sort
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setMobileFiltersOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <FilterSidebar />
            </div>
          </div>
        </div>
      )}

      {/* Split Screen Layout */}
      <div className="bg-gradient-to-b from-secondary/20 to-background min-h-screen">
        <div className="container py-6">
          <div className="flex gap-6">
            {/* Left Sidebar — Desktop Only */}
            <aside className="hidden lg:block w-[280px] shrink-0">
              <div className="sticky top-[128px] max-h-[calc(100vh-144px)] overflow-y-auto rounded-2xl border border-border bg-card shadow-sm p-5 scrollbar-thin">
                {/* Sidebar Header */}
                <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <SlidersHorizontal className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Filters</h2>
                    <p className="text-xs text-muted-foreground">Refine your search</p>
                  </div>
                </div>
                <FilterSidebar />
              </div>
            </aside>

            {/* Right Content — Results */}
            <main className="flex-1 min-w-0">
              {isLoading ? (
                <SearchResultsLoading count={6} />
              ) : paginatedCenters.length > 0 ? (
                <>
                  {/* Expanded search notice */}
                  {isExpandedSearch && location && (
                    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 flex items-start gap-3">
                      <Navigation className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          No exact matches near "{location}"
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Showing the closest facilities nationwide, sorted by proximity. Results nearest to your search appear first.
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Results Summary */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm text-muted-foreground tabular-nums">
                        Showing <span className="font-medium text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredCenters.length)}</span> of{" "}
                        <span className="font-medium text-foreground">{filteredCenters.length}</span>
                      </p>
                      {(location || effectiveLocation) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Compass className="h-3 w-3 text-primary" />
                          {location ? (
                            <>Near <span className="font-medium text-foreground">{resolvedZipData ? `${resolvedZipData.city}, ${resolvedZipData.stateAbbr}` : location}</span></>
                          ) : (
                            <>Near <span className="font-medium text-foreground">{effectiveLocation}</span> <span className="text-muted-foreground/60">(auto)</span></>
                          )}
                        </p>
                      )}
                    </div>
                    {(location || effectiveLocation) && (
                      <div className="hidden xl:flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                          <MapPin className="h-2.5 w-2.5" /> Exact
                        </span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          <Building2 className="h-2.5 w-2.5" /> City
                        </span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                          <Navigation className="h-2.5 w-2.5" /> State
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Results List */}
                  <div className="space-y-4">
                    {paginatedCenters.map((center, index) => (
                      <div
                        key={center.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 40}ms` }}
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
                <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                    <Search className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">No Results Found</h2>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    {queryParam
                      ? `No treatment centers match "${queryParam}". Try a different search term or adjust the filters below.`
                      : location
                        ? `No centers found near "${location}". Try a wider area or remove a filter below.`
                        : "We couldn't find any treatment centers matching your criteria. Try one of the suggestions below."}
                  </p>

                  {/* Suggested filter changes — one-tap removal of each active filter */}
                  {(selectedTreatmentTypes.length > 0 || selectedInsuranceTypes.length > 0 || selectedDistance || verifiedOnly || featuredOnly) && (
                    <div className="w-full max-w-md mb-6 rounded-xl border border-border bg-card p-4">
                      <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">
                        Try removing a filter
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTreatmentTypes.map((t) => (
                          <button
                            key={`rm-t-${t}`}
                            onClick={() => {
                              const next = selectedTreatmentTypes.filter((x) => x !== t);
                              setSingleFilter("treatmentTypes", next.join(","));
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary transition-colors"
                          >
                            <X className="h-3 w-3" />
                            Treatment: {t}
                          </button>
                        ))}
                        {selectedInsuranceTypes.map((i) => (
                          <button
                            key={`rm-i-${i}`}
                            onClick={() => {
                              const next = selectedInsuranceTypes.filter((x) => x !== i);
                              setSingleFilter("insuranceTypes", next.join(","));
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary transition-colors"
                          >
                            <X className="h-3 w-3" />
                            Insurance: {i}
                          </button>
                        ))}
                        {selectedDistance && (
                          <button
                            onClick={() => setSingleFilter("distance", "")}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary transition-colors"
                          >
                            <X className="h-3 w-3" />
                            Within {selectedDistance} mi
                          </button>
                        )}
                        {verifiedOnly && (
                          <button
                            onClick={() => toggleBooleanFilter("verified", true)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary transition-colors"
                          >
                            <X className="h-3 w-3" />
                            Verified only
                          </button>
                        )}
                        {featuredOnly && (
                          <button
                            onClick={() => toggleBooleanFilter("featuredOnly", true)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary transition-colors"
                          >
                            <X className="h-3 w-3" />
                            Featured only
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Try a different treatment type */}
                  {selectedTreatmentTypes.length > 0 && (
                    <div className="w-full max-w-md mb-6">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide text-center">
                        Or try a different treatment type
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {[
                          { value: "outpatient", label: "Outpatient" },
                          { value: "inpatient", label: "Inpatient" },
                          { value: "detox", label: "Detox" },
                          { value: "dual-diagnosis", label: "Dual Diagnosis" },
                          { value: "holistic", label: "Holistic" },
                        ]
                          .filter((opt) => !selectedTreatmentTypes.includes(opt.value))
                          .slice(0, 4)
                          .map((opt) => (
                            <button
                              key={`alt-${opt.value}`}
                              onClick={() => setSingleFilter("treatmentTypes", opt.value)}
                              className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary transition-colors"
                            >
                              {opt.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Nearby states (when location resolves to a state) */}
                  {location && (() => {
                    const parsed = parseLocationInput(location);
                    const nearbyAbbrs = parsed.stateAbbr ? getNearbyStates(parsed.stateAbbr) : [];
                    return nearbyAbbrs.length > 0 ? (
                      <div className="flex flex-wrap justify-center items-center gap-2 mb-6">
                        <span className="text-xs text-muted-foreground">Try nearby states:</span>
                        {nearbyAbbrs.slice(0, 4).map((abbr) => (
                          <Link
                            key={abbr}
                            to={`/search-results?location=${abbr}`}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            {abbr}
                          </Link>
                        ))}
                      </div>
                    ) : null;
                  })()}

                  {/* Example locations — always offered as a quick reset path */}
                  <div className="flex flex-wrap justify-center items-center gap-2 mb-6">
                    <span className="text-xs text-muted-foreground">Try a popular location:</span>
                    {[
                      { label: "Los Angeles, CA", q: "Los Angeles, CA" },
                      { label: "Miami, FL", q: "Miami, FL" },
                      { label: "Houston, TX", q: "Houston, TX" },
                      { label: "New York, NY", q: "New York, NY" },
                      { label: "ZIP 90210", q: "90210" },
                    ].map((ex) => (
                      <Link
                        key={ex.label}
                        to={`/search-results?location=${encodeURIComponent(ex.q)}`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        {ex.label}
                      </Link>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={clearAllFilters} variant="outline" className="gap-2">
                      <X className="h-4 w-4" />
                      Clear All Filters
                    </Button>
                    <Link to="/rehab-centers">
                      <Button className="gap-2">Browse All Centers</Button>
                    </Link>
                    <Link to="/account/concierge">
                      <Button variant="secondary" className="gap-2">
                        <Heart className="h-4 w-4" />
                        Get Personalized Help
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SearchResults;
