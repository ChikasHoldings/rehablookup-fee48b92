import { useMemo, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateSearchResultsSchema } from "@/components/SEO";
import { SearchResultCard } from "@/components/cards/SearchResultCard";
import { FeaturedRail } from "@/components/featured/FeaturedRail";
import { resolveSearchBucket } from "@/lib/featuredBucket";
import { DataPagination } from "@/components/common/DataPagination";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { scrollToTopSmooth } from "@/hooks/useScrollToTop";
import { SearchResultsForm } from "@/components/search/SearchResultsForm";

import { NoResultsDirectoryCTA } from "@/components/search/NoResultsDirectoryCTA";
import { AreaWaitlistCapture } from "@/components/seo/AreaWaitlistCapture";
import { MapPin, Search, X, ArrowUpDown, ChevronLeft, ChevronRight, Phone, SlidersHorizontal, Building2, Shield, Star, DollarSign, Sparkles, ChevronDown, Navigation, CreditCard, Share2, Check, AlertCircle, RefreshCw, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


import { Badge } from "@/components/ui/badge";
import { 
  parseLocationInput, 
  enrichLocationMatchWithZip,
  getProximityTier,
  getStateAbbr,
  getNearbyStates,
  facilityMatchesLocation,
  PROXIMITY_TIER_ORDER,
  type LocationMatch,
  type ProximityTier
} from "@/lib/proximitySearch";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getPlanRank } from "@/lib/facilityPlanSort";
import { analytics } from "@/lib/analytics";
import {
  TREATMENT_FILTERS,
  INSURANCE_FILTERS,
  matchesTreatmentFilter,
  matchesInsuranceFilter,
  countTreatmentFacets,
  countInsuranceFacets,
  asSearchableFacility,
} from "@/lib/searchFilters";

// Restore user ID from localStorage to avoid getSession/getUser deadlocks
function getStoredUserId(): string | null {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || 'mldbxpntzcjalgjmwnqa';
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

type SortOption = "proximity" | "featured" | "rating-high" | "rating-low" | "name-asc" | "name-desc";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "proximity", label: "Nearest First" },
  { value: "featured", label: "Featured First" },
  { value: "rating-high", label: "Highest Rated" },
  { value: "rating-low", label: "Lowest Rated" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
];

// Treatment + insurance filter options live in `src/lib/searchFilters.ts`
// (shared with `RehabCenters.tsx`) so a change to a `matches` array only has
// to happen in one place. Imported above as TREATMENT_FILTERS / INSURANCE_FILTERS.

// Distance filters
const distanceFilters = [
  { value: "10", label: "Within 10 miles" },
  { value: "25", label: "Within 25 miles" },
  { value: "50", label: "Within 50 miles" },
  { value: "100", label: "Within 100 miles" },
  { value: "any", label: "Any distance" },
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
  const { toast } = useToast();
  const [shareCopied, setShareCopied] = useState(false);
  
  // Basic search params
  const location = searchParams.get("location") || "";
  const treatment = searchParams.get("treatment") || "";
  const insurance = searchParams.get("insurance") || "";
  const type = searchParams.get("type") || "";
  const stateParam = searchParams.get("state") || ""; // Support direct state filtering from near-me pages
  const queryParam = searchParams.get("q") || ""; // Free-text search from header/seeker
  // A non-numeric ?page= (mangled external link) used to parse to NaN, which
  // survived the clamp below and made the grid slice(NaN, NaN) → zero cards
  // rendered under a non-zero result count.
  const parsedPage = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  // Normalize unknown/removed sorts (e.g. a stale ?sort=reviews bookmark — the
  // review sort was removed pending review-count data on public_facilities) to
  // the default, so the Select doesn't render blank and the switch doesn't hit
  // a no-op.
  const rawSort = searchParams.get("sort");
  const sortParam: SortOption = sortOptions.some((o) => o.value === rawSort)
    ? (rawSort as SortOption)
    : "proximity";
  
  // Resolve the Featured rail's placement bucket from the active
  // filters. The memo only depends on the params the resolver reads;
  // a different treatment OR state filter re-renders the rail with
  // the right pool.
  const featuredBucket = useMemo(
    () => resolveSearchBucket({
      state: stateParam || null,
      citySlug: location && stateParam ? location : null,
      treatmentSlug: treatment || null,
    }),
    [stateParam, location, treatment],
  );

  // Filter params (comma-separated values)
  const treatmentTypesParam = searchParams.get("treatmentTypes") || "";
  const amenitiesParam = searchParams.get("amenities") || "";
  const insuranceTypesParam = searchParams.get("insuranceTypes") || "";
  const distanceParam = searchParams.get("distance") || "";
  const verifiedOnly = searchParams.get("verified") === "true";
  const featuredOnly = searchParams.get("featuredOnly") === "true";

  // Parse comma-separated filter values — wrapped in useMemo so array references are stable across renders
  const selectedTreatmentTypes = useMemo(() => treatmentTypesParam ? treatmentTypesParam.split(",") : [], [treatmentTypesParam]);
  const selectedAmenities = useMemo(() => amenitiesParam ? amenitiesParam.split(",") : [], [amenitiesParam]);
  const selectedInsuranceTypes = useMemo(() => insuranceTypesParam ? insuranceTypesParam.split(",") : [], [insuranceTypesParam]);
  const selectedDistance = distanceParam || "";

  const { data: approvedFacilities = [], isLoading, error: facilitiesError, refetch: refetchFacilities } = useStaticFacilities();
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
      lookupZipcode(parsed.zipcode)
        .then((result) => {
          if (result) {
            setResolvedZipData(result);
          }
        })
        .catch((err) => {
          // Zip lookup failure is non-fatal — proximity sort just
          // falls back to the raw input. Log so we notice systemic
          // outages but don't block the search.
          console.error("[SearchResults] lookupZipcode failed:", err);
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

  // Wrapped in useMemo so the object reference is stable across renders
  const typeFilterMap = useMemo<Record<string, string[]>>(() => ({
    drug: ["Detox", "Inpatient", "Outpatient"],
    alcohol: ["Detox", "Inpatient", "Outpatient"],
    "mental-health": ["Dual Diagnosis"],
    residential: ["Inpatient"],
    outpatient: ["Outpatient"],
    holistic: ["Inpatient", "Outpatient"],
  }), []);

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

  const { filteredCenters, isExpandedSearch, facetPool } = useMemo(() => {
    let results = [...allCenters];
    let expanded = false;
    // Snapshot of the result set BEFORE treatment-multi and insurance-multi
    // and amenities filters are applied. Facet counts are computed against
    // this pool so toggling within a filter group doesn't suppress its
    // own counts — selecting "Aetna" must not show "(0)" for "BCBS" etc.
    let preMultiPool: typeof results = [];

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

    // Treatment filter from the hero search form. Supports comma-separated
    // multi-select. Routed through the same matcher as the dropdown so
    // `?treatment=inpatient` resolves the 44 facility_type='Residential
    // Treatment Center' rows (previously zero-result).
    if (treatment) {
      const treatmentValues = treatment.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
      results = results.filter((c) =>
        treatmentValues.some((tv) => matchesTreatmentFilter(asSearchableFacility(c), tv)),
      );
    }

    // Type filter from homepage cards
    if (type && typeFilterMap[type]) {
      results = results.filter((c) =>
        c.treatmentTypes.some((t) => typeFilterMap[type].includes(t))
      );
    }

    // Insurance filter from the hero search form. Same shared matcher as the
    // dropdown so `?insurance=private-pay` recovers ~2,918 facilities the
    // pre-2026-05-21 substring matcher silently excluded.
    if (insurance) {
      const insuranceValues = insurance.split(",").map((i) => i.trim().toLowerCase()).filter(Boolean);
      results = results.filter((c) =>
        insuranceValues.some((iv) => matchesInsuranceFilter(asSearchableFacility(c), iv)),
      );
    }

    // Capture the pool BEFORE the multi-select treatment / insurance /
    // amenities filters apply. Facet counts read from here so the user can
    // freely toggle within a group without each option self-suppressing.
    preMultiPool = results;

    // Insurance Types dropdown filters — shared matcher folds case + internal
    // whitespace and walks the alias list in src/lib/searchFilters.ts so e.g.
    // `private-pay` matches "Self-Pay/Private Pay" (no spaces) which the
    // production catalog actually contains.
    if (selectedInsuranceTypes.length > 0) {
      results = results.filter((center) =>
        selectedInsuranceTypes.some((filterValue) =>
          matchesInsuranceFilter(asSearchableFacility(center), filterValue),
        ),
      );
    }

    // Treatment Type dropdown filters — shared matcher walks services →
    // facility_type → description so `inpatient` (zero rows in
    // facility_services) still resolves the 44 facilities tagged
    // `facility_type='Residential Treatment Center'`.
    if (selectedTreatmentTypes.length > 0) {
      results = results.filter((center) =>
        selectedTreatmentTypes.some((filterValue) =>
          matchesTreatmentFilter(asSearchableFacility(center), filterValue),
        ),
      );
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
      results = results.filter((center) => center.verified === true);
    }

    // Featured only filter
    if (featuredOnly) {
      results = results.filter((center) => center.featured === true);
    }

    // Distance filter. Without lat/long on every facility we can't compute
    // true mile-distance, so we map the user's mile radius onto the
    // categorical proximity tier — a defensible UX approximation that
    // matches how the rest of the page already sorts results.
    //   ≤10 mi   → exact OR city
    //   ≤25 mi   → exact / city / state
    //   ≤50/100 → also nearby
    //   "any"   → unfiltered
    // The chip was previously cosmetic (selectedDistance read + counted as
    // active but never applied), so any results being narrowed is a win
    // versus the prior dead-feature behavior.
    // Audit fix (2026-05-23): the distance filter previously only fired
    // when `locationMatch` existed, which was built strictly from the
    // explicit `location` URL param. A user with no typed location but
    // a geo-IP-resolved `effectiveLocation` could select "Within 10
    // miles" and see a no-op — the filter chip displayed as active but
    // nothing was actually narrowed. Now we build a separate distance
    // location match from `effectiveLocation` as a fallback so the
    // distance filter actually constrains results in the geo-IP path.
    //
    // Tier ladder also tightened: 50 mi no longer pulls in the "nearby
    // state" tier (cross-state adjacents that can be 100s of miles
    // away). 100 mi keeps the looser tier because at that radius
    // crossing into an adjacent state is plausible.
    const distanceLocationMatch: LocationMatch | null =
      locationMatch ??
      (effectiveLocation
        ? (() => {
            const m = parseLocationInput(effectiveLocation);
            return resolvedZipData ? enrichLocationMatchWithZip(m, resolvedZipData) : m;
          })()
        : null);

    if (selectedDistance && selectedDistance !== "any" && distanceLocationMatch) {
      const miles = parseInt(selectedDistance, 10);
      const allow = (tier: string): boolean => {
        if (miles <= 10) return tier === "exact" || tier === "city";
        if (miles <= 25) return tier === "exact" || tier === "city";
        if (miles <= 50) return tier === "exact" || tier === "city" || tier === "state";
        return tier === "exact" || tier === "city" || tier === "state" || tier === "nearby";
      };
      results = results.filter((center) => {
        const { tier } = getProximityTier(center, distanceLocationMatch);
        return allow(tier);
      });
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
        // Secondary: 4-tier organic rank (Featured → Pro → free-claimed → unclaimed)
        const rankA = getPlanRank(a);
        const rankB = getPlanRank(b);
        if (rankA !== rankB) return rankA - rankB;
        // Tertiary: ranking score
        const rA = a.calculatedRankingScore || 0;
        const rB = b.calculatedRankingScore || 0;
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
        const rankA = getPlanRank(a);
        const rankB = getPlanRank(b);
        if (rankA !== rankB) return rankA - rankB;
        // Tie-break on ranking score before ID for consistency with proximity.
        const rA = a.calculatedRankingScore || 0;
        const rB = b.calculatedRankingScore || 0;
        if (rA !== rB) return rB - rA;
        return a.id.localeCompare(b.id);
      }

      // For other sorts, 4-tier organic rank first then the chosen secondary
      const rankA = getPlanRank(a);
      const rankB = getPlanRank(b);
      if (rankA !== rankB) return rankA - rankB;

      switch (sortParam) {
        case "rating-high": {
          const diff = (b.calculatedRankingScore || 0) - (a.calculatedRankingScore || 0);
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "rating-low": {
          const diff = (a.calculatedRankingScore || 0) - (b.calculatedRankingScore || 0);
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
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
      results.forEach((r) => {
        const { tier, reason } = getProximityTier(r, match!);
        const annotated = r as typeof r & { _proximityTier?: ProximityTier; _proximityReason?: string };
        annotated._proximityTier = tier;
        annotated._proximityReason = reason;
      });
    }

    return { filteredCenters: results, isExpandedSearch: expanded, facetPool: preMultiPool };
  }, [allCenters, location, effectiveLocation, treatment, insurance, type, stateParam, queryParam, sortParam, selectedTreatmentTypes, selectedAmenities, selectedInsuranceTypes, selectedDistance, verifiedOnly, featuredOnly, resolvedZipData, typeFilterMap]);

  const hasFilters = location || treatment || insurance || type || stateParam || queryParam || selectedTreatmentTypes.length > 0 || selectedAmenities.length > 0 || selectedInsuranceTypes.length > 0 || selectedDistance || verifiedOnly || featuredOnly;
  const activeTypeFilter = type ? typeDisplayNames[type] : null;

  // Count active filters
  const activeFiltersCount = selectedTreatmentTypes.length + selectedAmenities.length + selectedInsuranceTypes.length + (selectedDistance ? 1 : 0) + (verifiedOnly ? 1 : 0) + (featuredOnly ? 1 : 0);

  const totalPages = Math.max(1, Math.ceil(filteredCenters.length / ITEMS_PER_PAGE));
  // F11 clamp: ?page=99 against a 6-page result set previously rendered an
  // empty grid; now we slice from the last available page instead.
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedCenters = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredCenters.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCenters, safePage]);

  // Facet counts — read from `facetPool`, which is the result set narrowed
  // by location/state/query/type/distance/verified/featured but BEFORE the
  // multi-select treatment + insurance + amenities filters apply. That way
  // toggling within those groups doesn't suppress the group's own counts,
  // while still reflecting the user's location/query context.
  const facetSourceFacilities = useMemo(
    () => facetPool.map(asSearchableFacility),
    [facetPool],
  );
  const treatmentFacets = useMemo(
    () => countTreatmentFacets(facetSourceFacilities),
    [facetSourceFacilities],
  );
  const insuranceFacets = useMemo(
    () => countInsuranceFacets(facetSourceFacilities),
    [facetSourceFacilities],
  );

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

  // The saved-search snapshot (criteria / suggested name / deep-link URL)
  // was removed with the consumer account product — nothing consumes it now
  // that /account/saved-searches is retired. Filter state still round-trips
  // through the URL, which is what Share copies.

  // Build a shareable URL that preserves all current filters/location/sort/page
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const shareTitle = location
      ? `Rehab Centers near ${location} — RehabLookup`
      : queryParam
      ? `Rehab Centers matching "${queryParam}" — RehabLookup`
      : "Rehab Centers Search — RehabLookup";

    // Try Web Share API first (mobile-friendly)
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shareTitle, url });
        return;
      } catch (err) {
        // User cancelled or share failed — fall through to clipboard
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      toast({
        title: "Link copied",
        description: "Shareable search link copied to your clipboard.",
      });
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      toast({
        title: "Couldn't copy link",
        description: "Copy this URL manually from your address bar.",
        variant: "destructive",
      });
    }
  }, [location, queryParam, toast]);

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

  // Zero-result tracking for queries that originated on the 404 page
  // (NotFound submits with ?from=404). Captures intent we couldn't fulfill
  // so admins can add redirects or content for the top dead-end queries.
  const fromParam = searchParams.get("from") || "";
  const reportedZeroQueryRef = useRef<string | null>(null);
  useEffect(() => {
    if (fromParam !== "404") return;
    if (isLoading) return;
    if (filteredCenters.length !== 0) return;
    // Build a stable key per query so we only fire once per unique search.
    const key = `${location}|${treatment}|${insurance}`;
    if (reportedZeroQueryRef.current === key) return;
    reportedZeroQueryRef.current = key;

    analytics.notFoundSearchZeroResults({
      location: location || undefined,
      treatment: treatment || undefined,
      insurance: insurance || undefined,
      resultsCount: 0,
      sourcePath: "/search-results",
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
      viewport:
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}`
          : undefined,
      sessionId:
        typeof window !== "undefined"
          ? window.sessionStorage?.getItem("rl_session_id") ?? null
          : null,
    });
  }, [fromParam, isLoading, filteredCenters.length, location, treatment, insurance]);

  // Phase 4: generic funnel event — fire `search_performed` and
  // `search_zero_results` for every search (not just /404 referrals) so we
  // can measure conversion drop-off across the whole funnel.
  const reportedSearchKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading) return;
    const key = `${location}|${treatment}|${insurance}|${queryParam}`;
    if (reportedSearchKeyRef.current === key) return;
    reportedSearchKeyRef.current = key;

    analytics.search(queryParam || location || "(empty)", filteredCenters.length);
    // Analytics provider removed — zero-result searches tracked via analytics.search() above.
  }, [isLoading, filteredCenters.length, location, treatment, insurance, queryParam]);

  // Determine display title (used in the page header). The SEO <title> below
  // augments this with the page number so paginated variants don't collide.
  const searchDisplayTitle = queryParam
    ? `Results for "${queryParam}"`
    : location
      ? `Rehab Centers Near ${location}`
      : "Find Treatment Centers";

  // Build a unique-per-variant SEO title and self-canonical for indexable
  // (i.e. unfiltered) paginated variants so page 2+ isn't deduped against
  // page 1. Filtered/empty variants stay noindexed but still ship unique
  // meta to crawlers that ignore noindex hints.
  const seoTitleSuffix = currentPage > 1 ? ` — Page ${currentPage}` : "";
  const seoTitle = `${searchDisplayTitle}${seoTitleSuffix}`;
  const seoCanonical = !shouldNoindex && currentPage > 1
    ? `/search-results?page=${currentPage}`
    : "/search-results";
  const seoDescription = `Browse ${filteredCenters.length} verified addiction treatment centers${
    location ? ` near ${location}` : queryParam ? ` matching "${queryParam}"` : ""
  }${currentPage > 1 ? ` (page ${currentPage} of ${totalPages})` : ""}. Compare rehab programs, check insurance, and start recovery.`;

  // rel="prev"/"next" — only emit on indexable paginated views so crawlers
  // can stitch the sequence together without us advertising filtered/noindex
  // variants.
  const seoPrevUrl = !shouldNoindex && currentPage > 1
    ? (currentPage - 1 === 1 ? "/search-results" : `/search-results?page=${currentPage - 1}`)
    : undefined;
  const seoNextUrl = !shouldNoindex && currentPage < totalPages
    ? `/search-results?page=${currentPage + 1}`
    : undefined;

  // Mobile filter sidebar open state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Accordion state — only one section open at a time, all collapsed by default
  const [openFilterSection, setOpenFilterSection] = useState<string | null>(null);

  // Hide-on-scroll-down for the sticky results header — frees vertical
  // space for the listing cards once the user has committed to
  // browsing (mirrors the Yelp / Healthgrades sticky-bar pattern).
  // Hide-on-scroll behavior removed in the 2026-05-23 directory-style
  // rebuild — modern directory pages keep the search bar visible at
  // the top of the page (non-sticky) and use a separate sticky toolbar
  // for sort + filters. Auto-hiding chrome on scroll felt jittery and
  // hid the inline search form right when the user might want it.

  const toggleFilterSection = useCallback((section: string) => {
    setOpenFilterSection(prev => prev === section ? null : section);
  }, []);

  // Collapsible filter section. Hairline-divided rows (no per-section
  // border/rounded box) — each section is a button-header + collapsible
  // body separated from siblings by the divide-y on the parent. Result
  // is a clean tabular feel, similar to Airbnb / Yelp's filter panels.
  const FilterSection = ({ id, icon, label, children, count }: { id: string; icon: ReactNode; label: string; children: ReactNode; count?: number }) => {
    const isOpen = openFilterSection === id;
    return (
      <div>
        <button
          type="button"
          onClick={() => toggleFilterSection(id)}
          className="w-full flex items-center justify-between py-3.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-2.5">
            <span className="text-muted-foreground">{icon}</span>
            {label}
            {count && count > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground tabular-nums">{count}</span>
            ) : null}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="pb-4 pt-0">
            {children}
          </div>
        </div>
      </div>
    );
  };

  // Sidebar filter content — reused for desktop card and mobile sheet.
  // `divide-y` between sections gives the hairline structure; sort sits
  // at the top as a FilterSection (consistent chrome) instead of its
  // own special heading + Select.
  const FilterSidebar = () => (
    <div className="divide-y divide-border/70">
      {/* Sort — same FilterSection chrome as everything else so the
          sidebar reads as one consistent column. Defaults open since
          sort is the most likely first interaction. */}
      <FilterSection id="sort" icon={<ArrowUpDown className="h-3.5 w-3.5" />} label="Sort by">
        <Select value={sortParam} onValueChange={(v) => handleSortChange(v as SortOption)}>
          <SelectTrigger className="w-full h-10 text-sm border-border bg-background">
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
      </FilterSection>

      {/* Treatment Type — single-select dropdown. Options come from
          src/lib/searchFilters.ts; facet badge shows how many facilities
          match each option against the current location/state/query filters
          so users can see "(N)" before clicking and avoid zero-result dead
          ends. */}
      <FilterSection id="treatment" icon={<Building2 className="h-3.5 w-3.5" />} label="Treatment Type" count={selectedTreatmentTypes.length}>
        <Select
          value={selectedTreatmentTypes[0] ?? "any"}
          onValueChange={(v) => setSingleFilter("treatmentTypes", v)}
        >
          <SelectTrigger className="w-full h-9 text-sm border-border bg-card">
            <SelectValue placeholder="Any treatment type" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border shadow-lg max-h-72">
            <SelectItem value="any" className="text-sm cursor-pointer">
              Any treatment type
            </SelectItem>
            {TREATMENT_FILTERS.map((filter) => {
              const count = treatmentFacets[filter.value] ?? 0;
              return (
                <SelectItem
                  key={filter.value}
                  value={filter.value}
                  className="text-sm cursor-pointer"
                  disabled={count === 0}
                >
                  <span className="flex items-center gap-2">
                    <span>{filter.label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">({count})</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
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

      {/* Insurance — multi-select toggle buttons (mirrors Amenities pattern).
          Persists via the `insuranceTypes` URL param (comma-separated).
          Facet counts surface up-front so users see e.g. "Medicaid (2,759)" vs
          "Aetna (2)" before they click. Options with zero matches are
          disabled to prevent dead-end interactions. */}
      <FilterSection id="insurance" icon={<Shield className="h-3.5 w-3.5" />} label="Insurance" count={selectedInsuranceTypes.length}>
        <div className="space-y-1.5">
          {INSURANCE_FILTERS.map((filter) => {
            const active = selectedInsuranceTypes.includes(filter.value);
            const count = insuranceFacets[filter.value] ?? 0;
            const disabled = count === 0 && !active;
            return (
              <button
                key={filter.value}
                onClick={() => {
                  if (disabled) return;
                  toggleFilter("insuranceTypes", filter.value, selectedInsuranceTypes);
                }}
                aria-pressed={active}
                aria-disabled={disabled}
                disabled={disabled}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                  active
                    ? "bg-primary/10 text-primary font-medium border border-primary/20"
                    : disabled
                    ? "text-muted-foreground/50 border border-transparent cursor-not-allowed"
                    : "text-foreground hover:bg-secondary/60 border border-transparent"
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {filter.logo ? (
                    <img
                      src={filter.logo}
                      alt=""
                      aria-hidden="true"
                      className="h-3.5 w-4 object-contain shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <CreditCard className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{filter.label}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums">({count.toLocaleString()})</span>
                  {active && <X className="h-3.5 w-3.5" aria-hidden="true" />}
                </span>
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

      {/* Clear-all — appears at the bottom of the divider stack as
          its own row when any filter is active. */}
      {activeFiltersCount > 0 && (
        <div className="pt-3">
          <button
            type="button"
            onClick={clearAllFilters}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
          >
            <X className="h-4 w-4" />
            Clear all filters ({activeFiltersCount})
          </button>
        </div>
      )}
    </div>
  );

  // Directory helper CTA — rendered OUTSIDE the FilterSidebar component so
  // it sits below the divider stack with its own breathing room. Was
  // previously the last child of FilterSidebar which made it inherit
  // the new divide-y rule and stack visually adjacent to the filter
  // sections; the standalone block reads more like a contextual
  // affordance, less like another filter.
  const DirectoryHelperCTA = () => (
    <div className="mt-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 border border-primary/15">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 shrink-0">
          <Scale className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Narrowed it down?</p>
          <p className="text-xs text-muted-foreground">Compare your shortlist side by side</p>
        </div>
      </div>
      <Link to="/compare">
        <Button size="sm" className="w-full gap-2 text-xs">
          <Scale className="h-3.5 w-3.5" />
          Compare Facilities
        </Button>
      </Link>
    </div>
  );

  return (
    <Layout>
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={seoCanonical}
        prevUrl={seoPrevUrl}
        nextUrl={seoNextUrl}
        noindex={shouldNoindex}
        structuredData={!shouldNoindex ? generateSearchResultsSchema({
          query: queryParam || undefined,
          location: location || undefined,
          resultCount: filteredCenters.length,
          canonicalUrl: seoCanonical,
          currentPage,
          totalPages,
          pageSize: ITEMS_PER_PAGE,
          prevUrl: seoPrevUrl,
          nextUrl: seoNextUrl,
          facilities: paginatedCenters.slice(0, 10).map(c => ({
            name: c.name,
            city: c.city,
            state: c.state,
            slug: 'slug' in c ? c.slug ?? undefined : undefined,
          })),
        }) : undefined}
      />

      {/* DIRECTORY HERO — top of the page, non-sticky. Replaces the old
          Healthgrades-style sticky header that crammed back-link +
          count-chip + filter pills + save + share + filter-toggle +
          search form into one bar. New layout puts the SEARCH FORM
          front-and-center (the page's primary affordance), then a
          single line announcing the result count + location context.
          Save / Share / Sort / Filters all live in a separate toolbar
          inside the results column (rebuilt below). */}
      <section className="border-b border-border bg-gradient-to-b from-secondary/30 via-secondary/15 to-background py-4 sm:py-5 md:py-7">
        <div className="container">
          {/* Back link — small, secondary, on its own row above the
              search form so it doesn't compete for prominence. */}
          <div className="mb-3 flex items-center gap-3">
            <Link
              to="/rehab-centers"
              className="group inline-flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
              aria-label="Back to all centers"
            >
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-medium">All centers</span>
            </Link>
          </div>

          {/* Search form — the page's primary affordance, hero-treated
              with full-width prominence. */}
          <SearchResultsForm />

          {/* Location subtitle. Single quiet line under the search
              form. Renders "Near <city, state>" whether the location
              came from the user (explicit `?location=`) or geo-IP
              (effectiveLocation fallback) — the chrome no longer
              distinguishes the two ("(auto-detected)" label removed
              per the 2026-05-23 cleanup). Result count + queryParam
              context are NOT surfaced here anymore — they live
              inside the toolbar's range chip below. */}
          {(location || effectiveLocation) && (
            <p className="mt-4 text-xs sm:text-sm text-muted-foreground inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" aria-hidden />
              Near{" "}
              <span className="font-semibold text-foreground">
                {location
                  ? (resolvedZipData
                      ? `${resolvedZipData.city}, ${resolvedZipData.stateAbbr}`
                      : location)
                  : effectiveLocation}
              </span>
            </p>
          )}
        </div>
      </section>

      {/* Mobile Filter Overlay */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
          {/* Flex column with overflow-hidden so the sticky header + scrollable
              middle + sticky footer all coexist correctly. Previously the whole
              panel scrolled which meant the "Show results" footer couldn't sit
              fixed at the bottom of the viewport. */}
          <div className="absolute right-0 top-0 h-full w-[320px] max-w-[85vw] bg-card border-l border-border shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Filters & Sort
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <FilterSidebar />
              <DirectoryHelperCTA />
            </div>
            {/* Sticky "Show results" footer — closes the sheet and confirms the
                filter set is applied. Matches iOS / Android filter-sheet
                pattern. (Phase 6C) */}
            <div className="shrink-0 p-3 border-t border-border bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full h-11 font-semibold"
              >
                {filteredCenters.length === 0
                  ? "No matches — adjust filters"
                  : `Show ${filteredCenters.length} ${filteredCenters.length === 1 ? "result" : "results"}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Split Screen Layout */}
      <div className="bg-gradient-to-b from-secondary/20 to-background min-h-screen">
        <div className="container py-6">
          <div className="flex gap-6 xl:gap-8">
            {/* Left Sidebar — Desktop Only.
                Sticky `top-[88px]` aligns the sidebar's top with the
                viewport area just below the global nav (~68 px) +
                a small breathing buffer. Previous `top-[188px]` was
                inherited from the old sticky directory header which
                no longer exists, so the sidebar started awkwardly
                far down the page.

                Visual chrome simplified: single hairline card
                (`border` + `rounded-2xl` only — no shadow stack)
                with a tighter header that drops the "Narrow your
                results" filler subtitle. The sidebar now reads as a
                clean controls panel, not a card-on-card. */}
            <aside className="hidden lg:block w-[290px] xl:w-[320px] shrink-0">
              <div className="sticky top-[88px] max-h-[calc(100vh-110px)] overflow-y-auto scrollbar-thin">
                <div className="rounded-2xl border border-border bg-card p-5">
                  {/* Sidebar header — compact, single-line */}
                  <div className="flex items-center justify-between mb-2 pb-3 border-b border-border">
                    <h2 className="text-sm font-bold text-foreground inline-flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-primary" />
                      Filters
                    </h2>
                    {activeFiltersCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground tabular-nums">
                        {activeFiltersCount}
                      </span>
                    )}
                  </div>
                  <FilterSidebar />
                </div>
                <DirectoryHelperCTA />
              </div>
            </aside>

            {/* Right Content — Results */}
            <main className="flex-1 min-w-0">
              {/* Auto-detected-location banner removed per the
                  2026-05-23 cleanup. The geo-IP detection itself
                  still runs (effectiveLocation drives the proximity
                  sort) — the chrome around it is gone. The hero's
                  "Near <city, state>" subtitle is the only surface
                  that hints at the detected location. */}

              {/* Featured rail — bucket resolved from current filters.
                  city+state → (city, slug); state only → (state, abbr);
                  treatment only → (treatment, slug); otherwise national.
                  Silent absence when bucket pool is empty. */}
              {featuredBucket && (
                <FeaturedRail
                  placement_type={featuredBucket.placement_type}
                  placement_value={featuredBucket.placement_value}
                  className="mb-6"
                />
              )}

              {/* Hold the result list during the brief window between page
                  load and geo-IP resolution. Without this guard, default-sort
                  ("proximity") sees no location → every facility gets the
                  "nationwide" tier (equal score 4) → falls back to plan
                  priority + ranking score → user sees out-of-state featured
                  centers before re-ordering kicks in. Only applies when the
                  user hasn't typed a location AND has no profile location;
                  once cached in localStorage (7-day TTL) repeat visits skip
                  this window entirely. */}
              {isLoading || (
                !location &&
                !seekerProfile?.state &&
                geo.isLoading &&
                sortParam === "proximity"
              ) ? (
                <SearchResultsLoading count={6} />
              ) : facilitiesError ? (
                // Distinguish a backend failure from a genuinely empty result —
                // otherwise an outage looks like "no rehabs exist."
                <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center space-y-3">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                  <p className="text-sm font-medium text-foreground">
                    We couldn't load treatment centers right now.
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    This is a temporary issue on our end — your search is fine. Please try again in a moment.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetchFacilities()} className="gap-1.5">
                    <RefreshCw className="h-4 w-4" /> Try again
                  </Button>
                </div>
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

                  {/* TOOLBAR — directory-style controls row. Unifies the
                      old mobile-only chip strip + desktop-only filter
                      pills + results-summary header + action buttons
                      into ONE row. Renders above the cards on every
                      breakpoint. On lg+ it sits under the FeaturedRail
                      (or directly under the hero if no featured pool).

                      Layout:
                        LEFT  — page indicator (N of M, range chip)
                                + active filter chips (horizontally
                                scrollable on mobile when overflowing)
                                + "Clear all" pill when any filter is set
                        RIGHT — Filters trigger (mobile only), Save,
                                Share. Sort lives inside the filter
                                sidebar (and the mobile sheet) so it
                                doesn't compete here.

                      `sticky top-[68px] z-20` keeps the toolbar pinned
                      to the top of the main scroll area on lg+ so the
                      controls remain reachable during long-list scroll.
                      On mobile the toolbar is in normal flow — the
                      browser scroll-to-top is the recovery affordance. */}
                  <div className="mb-4 lg:sticky lg:top-[68px] lg:z-20 lg:bg-background/95 lg:backdrop-blur-sm lg:py-2 lg:-mx-2 lg:px-2">
                    <div className="flex items-center justify-between gap-3">
                      {/* LEFT cluster: range + chips */}
                      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                        <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20 tabular-nums">
                          {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                          {Math.min(safePage * ITEMS_PER_PAGE, filteredCenters.length)}
                          {" "}of {filteredCenters.length.toLocaleString()}
                        </span>

                        {/* Active filter chips — single horizontal
                            row, scrollable on overflow. Replaces both
                            the old desktop pills and mobile chip
                            strip (which were redundant). */}
                        {activeFiltersCount > 0 && (
                          <div
                            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -my-1 py-1"
                            style={{
                              WebkitOverflowScrolling: "touch",
                              maskImage: "linear-gradient(to right, black calc(100% - 24px), transparent)",
                              WebkitMaskImage: "linear-gradient(to right, black calc(100% - 24px), transparent)",
                            }}
                          >
                            {selectedTreatmentTypes.map((value) => (
                              <button
                                key={`tt-${value}`}
                                type="button"
                                onClick={() => toggleFilter("treatmentTypes", value, selectedTreatmentTypes)}
                                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                                aria-label={`Remove ${value} filter`}
                              >
                                <span className="truncate max-w-[140px]">{value}</span>
                                <X className="h-3 w-3" />
                              </button>
                            ))}
                            {selectedInsuranceTypes.map((value) => (
                              <button
                                key={`ins-${value}`}
                                type="button"
                                onClick={() => toggleFilter("insuranceTypes", value, selectedInsuranceTypes)}
                                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                                aria-label={`Remove ${value} filter`}
                              >
                                <span className="truncate max-w-[140px]">{value}</span>
                                <X className="h-3 w-3" />
                              </button>
                            ))}
                            {selectedAmenities.map((value) => (
                              <button
                                key={`am-${value}`}
                                type="button"
                                onClick={() => toggleFilter("amenities", value, selectedAmenities)}
                                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                                aria-label={`Remove ${value} filter`}
                              >
                                <span className="truncate max-w-[140px]">{value}</span>
                                <X className="h-3 w-3" />
                              </button>
                            ))}
                            {selectedDistance && (
                              <button
                                type="button"
                                onClick={() => setSingleFilter("distance", "")}
                                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                                aria-label="Remove distance filter"
                              >
                                <span>Within {selectedDistance} mi</span>
                                <X className="h-3 w-3" />
                              </button>
                            )}
                            {verifiedOnly && (
                              <button
                                type="button"
                                onClick={() => toggleBooleanFilter("verified", true)}
                                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                                aria-label="Remove verified-only filter"
                              >
                                <span>Verified</span>
                                <X className="h-3 w-3" />
                              </button>
                            )}
                            {featuredOnly && (
                              <button
                                type="button"
                                onClick={() => toggleBooleanFilter("featuredOnly", true)}
                                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                                aria-label="Remove featured-only filter"
                              >
                                <span>Featured</span>
                                <X className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={clearAllFilters}
                              className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                              aria-label="Clear all filters"
                            >
                              Clear all
                            </button>
                          </div>
                        )}
                      </div>

                      {/* RIGHT cluster: Filters (mobile) · Share.
                          "Save search" is gone — it was the one control on
                          this page that required a consumer account, and
                          consumer accounts are retired. Share still gives
                          the user a durable, filter-preserving link to come
                          back to, with no sign-in. */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="lg:hidden gap-1.5"
                          onClick={() => setMobileFiltersOpen(true)}
                          aria-label="Open filters and sort"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                          <span className="hidden xs:inline">Filters</span>
                          {activeFiltersCount > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                              {activeFiltersCount}
                            </Badge>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={handleShare}
                          aria-label="Copy a shareable link to this search"
                          title="Share this search"
                        >
                          {shareCopied ? <Check className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
                          <span className="hidden sm:inline">{shareCopied ? "Copied" : "Share"}</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Results List */}
                  <div className="space-y-4">
                    {paginatedCenters.map((center) => (
                      <SearchResultCard
                        key={center.id}
                        center={center}
                        featured={center.featured}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  <DataPagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    className="mt-10 justify-center"
                  />

                  {/* End-of-results helper bands. Two compact sections
                      that catch the visitor who scrolled the full list
                      without clicking through:
                       (1) "What to do next" — widen the search + cost
                           estimator + insurance verification — three
                           lateral actions that don't require picking a
                           specific facility yet.
                       (2) "Common questions about this search" — short
                           plain-English answers tied to the things
                           seekers ask after browsing (verified means
                           what, who pays, how fast). */}
                  <section className="mt-14 border-t border-border pt-10">
                    <header className="mb-6 text-center max-w-2xl mx-auto">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Not seeing the right fit?
                      </span>
                      <h2 className="mt-1.5 font-display text-xl md:text-2xl font-bold text-foreground tracking-tight">
                        What to do next
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        Three options that don't require picking a specific facility yet —
                        sometimes the right next step is a phone call, an insurance check,
                        or a clear sense of cost.
                      </p>
                    </header>

                    <div className="grid gap-4 md:grid-cols-3">
                      <Link to="/search-results"
                        className="group flex flex-col rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 mb-3">
                          <Search className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors">
                          Widen your search
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                          Drop the level-of-care or insurance filter, or look at nearby
                          cities — many people travel a short distance for the right
                          program.
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                          Browse all centers
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>

                      <Link
                        to="/insurance"
                        className="group flex flex-col rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 mb-3">
                          <Shield className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors">
                          Verify your insurance
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                          Most major plans cover addiction treatment by federal parity law.
                          See which carriers we work with and check your specific benefits
                          before you commit.
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                          Check coverage
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>

                      <Link
                        to="/cost-estimator"
                        className="group flex flex-col rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 mb-3">
                          <DollarSign className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors">
                          Estimate the cost
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                          Inpatient, outpatient, and detox cost ranges with and without
                          insurance — plus payment-without-insurance routes if you don't
                          have coverage.
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                          See cost ranges
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>
                    </div>
                  </section>

                  <section className="mt-12 mb-2 rounded-2xl border border-border bg-muted/30 p-6 md:p-8">
                    <header className="mb-5 max-w-2xl">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Quick answers
                      </span>
                      <h2 className="mt-1.5 font-display text-xl md:text-2xl font-bold text-foreground tracking-tight">
                        About these search results
                      </h2>
                    </header>
                    <dl className="grid gap-5 md:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-foreground text-[15px] mb-1.5 flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-600" />
                          What does &ldquo;verified&rdquo; mean?
                        </dt>
                        <dd className="text-sm text-muted-foreground leading-relaxed pl-6">
                          A verified facility is one that has either been claimed and
                          ownership-verified by its operator, or admin-approved after a
                          provider sign-up. Unclaimed SAMHSA-sourced records are listed
                          but not marked as verified.
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-foreground text-[15px] mb-1.5 flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-amber-600" />
                          Do you charge me to use this?
                        </dt>
                        <dd className="text-sm text-muted-foreground leading-relaxed pl-6">
                          No. RehabLookup is free for seekers and families. We don't take
                          placement fees to rank facilities higher in organic results.
                          Featured Placements are clearly labeled when they appear.
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-foreground text-[15px] mb-1.5 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-600" />
                          Is my browsing private?
                        </dt>
                        <dd className="text-sm text-muted-foreground leading-relaxed pl-6">
                          Yes. Substance-use treatment records are protected by 42 CFR
                          Part 2 — stronger than HIPAA. Our directory does not share
                          your search or inquiry data with employers, family members,
                          or the public.
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-foreground text-[15px] mb-1.5 flex items-center gap-2">
                          <Phone className="h-4 w-4 text-rose-600" />
                          What if I'm in crisis right now?
                        </dt>
                        <dd className="text-sm text-muted-foreground leading-relaxed pl-6">
                          Call <strong>911</strong> for a medical emergency. For mental-
                          health or suicide crisis, call or text <strong>988</strong>.
                          For substance-use help 24/7, call SAMHSA at{" "}
                          <strong>1-800-662-4357</strong>.
                        </dd>
                      </div>
                    </dl>
                  </section>
                </>
              ) : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
                  {/* Zero-result recovery CTA — widen the search */}
                  <NoResultsDirectoryCTA
                    location={location}
                    treatmentTypes={selectedTreatmentTypes}
                    insuranceTypes={selectedInsuranceTypes}
                    source="search_results"
                  />

                  {/* Secondary: notify-me capture for users not ready to engage */}
                  <div className="w-full mt-6">
                    <AreaWaitlistCapture
                      areaSlug={`search-${(location || "any").toLowerCase().replace(/\s+/g, "-")}`}
                      areaLabel={location || undefined}
                    />
                  </div>

                  <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mt-10 mb-5 ring-1 ring-border">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-2">No matching centers</h2>
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
                    <Link to="/search-results">
                      <Button variant="secondary" className="gap-2">
                        <Search className="h-4 w-4" />
                        Search Treatment Centers
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
