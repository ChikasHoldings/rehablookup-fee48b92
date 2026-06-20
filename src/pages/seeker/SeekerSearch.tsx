import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  SlidersHorizontal,
  X,
  Building2,
  Navigation,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ShieldCheck,
  Loader2,
  Trash2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import { FacilityCard, FacilityCardData, FacilityCardSkeleton } from "@/components/seeker/FacilityCard";
import { SaveSearchButton } from "@/components/search/SaveSearchButton";
import {
  parseLocationInput,
  getProximityTier,
  facilityMatchesLocation,
  PROXIMITY_TIER_ORDER,
} from "@/lib/proximitySearch";
import { getPlanPriority } from "@/lib/facilityPlanSort";
import { cn } from "@/lib/utils";
import { getLocationSuggestions, formatLocationSuggestion, type LocationSuggestion } from "@/data/locationSuggestions";
import {
  TREATMENT_FILTERS,
  INSURANCE_FILTERS,
  matchesTreatmentFilter,
  matchesInsuranceFilter,
  asSearchableFacility,
} from "@/lib/searchFilters";

const SEARCH_PAGE_SIZE = 12;

type SortKey = "relevance" | "rating" | "distance" | "newest" | "name";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Most relevant" },
  { value: "rating", label: "Highest rated" },
  { value: "distance", label: "Closest to me" },
  { value: "newest", label: "Most recently added" },
  { value: "name", label: "Name (A–Z)" },
];

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

const popularLocations = [
  { city: "Los Angeles", state: "CA" },
  { city: "Miami", state: "FL" },
  { city: "New York", state: "NY" },
  { city: "Chicago", state: "IL" },
  { city: "Houston", state: "TX" },
];

// Treatment + insurance options come from the canonical filter library so
// the seeker workspace sees the same surface as the public /search-results
// + /rehab-centers pages. The `bluecross` URL value is retained as a
// legacy alias in src/lib/searchFilters.ts so saved seeker searches keep
// working.
const treatmentTypeFilters = TREATMENT_FILTERS.map((o) => ({ value: o.value, label: o.label }));
const insuranceFilters = INSURANCE_FILTERS.map((o) => ({ value: o.value, label: o.label }));

const facilityTypeFilters = [
  { value: "residential", label: "Residential" },
  { value: "outpatient-center", label: "Outpatient Center" },
  { value: "detox-center", label: "Detox Center" },
  { value: "sober-living", label: "Sober Living" },
];

const genderFilters = [
  { value: "male", label: "Men" },
  { value: "female", label: "Women" },
  { value: "co-ed", label: "Co-ed / All" },
];

const TREATMENT_LABEL_BY_VALUE = Object.fromEntries(treatmentTypeFilters.map((f) => [f.value, f.label]));
const FACILITY_LABEL_BY_VALUE = Object.fromEntries(facilityTypeFilters.map((f) => [f.value, f.label]));
const INSURANCE_LABEL_BY_VALUE = Object.fromEntries(insuranceFilters.map((f) => [f.value, f.label]));
const GENDER_LABEL_BY_VALUE = Object.fromEntries(genderFilters.map((f) => [f.value, f.label]));

function readCsvParam(sp: URLSearchParams, key: string): string[] {
  const raw = sp.get(key);
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function SeekerSearch() {
  const { data: facilities, isLoading: facilitiesLoading, error: facilitiesError, refetch: refetchFacilities } = useStaticFacilities();
  const { isAuthenticated, searches: savedSearches } = useSavedSearches();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Hydrate state from URL on mount + sync changes back. Loop-guarded
  // via `hydratedRef` so the in-effect setSearchParams doesn't retrigger
  // the hydration block.
  const hydratedRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "");
  const [locationInput, setLocationInput] = useState(() => searchParams.get("loc") || "");
  const [selectedTreatmentTypes, setSelectedTreatmentTypes] = useState<string[]>(() => readCsvParam(searchParams, "t"));
  const [selectedFacilityTypes, setSelectedFacilityTypes] = useState<string[]>(() => readCsvParam(searchParams, "ft"));
  const [selectedInsurance, setSelectedInsurance] = useState<string[]>(() => readCsvParam(searchParams, "ins"));
  const [selectedGenders, setSelectedGenders] = useState<string[]>(() => readCsvParam(searchParams, "g"));
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(() => searchParams.get("v") === "1");
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    const raw = searchParams.get("sort");
    return (SORT_OPTIONS.some((o) => o.value === raw) ? raw : "relevance") as SortKey;
  });
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const raw = Number(searchParams.get("p"));
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  });

  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSuggestionIndex, setLocationSuggestionIndex] = useState<number>(-1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Mark hydration complete after first render so the sync effect knows
  // it's safe to write to the URL.
  useEffect(() => {
    hydratedRef.current = true;
  }, []);

  // Sync state → URL. We only write keys with non-default values so a
  // bare /account/search stays clean.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const next = new URLSearchParams(searchParams);
    const set = (key: string, val: string | null) => {
      if (val && val.length > 0) next.set(key, val);
      else next.delete(key);
    };
    set("q", searchQuery.trim());
    set("loc", locationInput.trim());
    set("t", selectedTreatmentTypes.join(","));
    set("ft", selectedFacilityTypes.join(","));
    set("ins", selectedInsurance.join(","));
    set("g", selectedGenders.join(","));
    set("v", verifiedOnly ? "1" : "");
    set("sort", sortKey === "relevance" ? "" : sortKey);
    set("p", currentPage > 1 ? String(currentPage) : "");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [searchQuery, locationInput, selectedTreatmentTypes, selectedFacilityTypes, selectedInsurance, selectedGenders, verifiedOnly, sortKey, currentPage, searchParams, setSearchParams]);

  // hasActiveSearch derived from state — drops the dual-state-of-truth
  // problem the previous `hasSearched` boolean introduced.
  const hasActiveSearch = !!(
    searchQuery.trim()
    || locationInput.trim()
    || selectedTreatmentTypes.length > 0
    || selectedFacilityTypes.length > 0
    || selectedInsurance.length > 0
    || selectedGenders.length > 0
    || verifiedOnly
  );

  // ─── Location suggestions ──────────────────────────────────────────────
  const locationSuggestions = useMemo<LocationSuggestion[]>(() => {
    if (locationInput.length < 2) return [];
    return getLocationSuggestions(locationInput).slice(0, 5);
  }, [locationInput]);

  // Reset highlight when the list changes
  useEffect(() => {
    setLocationSuggestionIndex(-1);
  }, [locationSuggestions]);

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    setLocationInput(formatLocationSuggestion(suggestion));
    setShowLocationSuggestions(false);
    setLocationSuggestionIndex(-1);
    setCurrentPage(1);
  };

  const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (locationSuggestions.length === 0) {
      if (e.key === "Enter") setCurrentPage(1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowLocationSuggestions(true);
      setLocationSuggestionIndex((i) => (i + 1) % locationSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setShowLocationSuggestions(true);
      setLocationSuggestionIndex((i) => (i <= 0 ? locationSuggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (locationSuggestionIndex >= 0 && locationSuggestionIndex < locationSuggestions.length) {
        e.preventDefault();
        handleLocationSelect(locationSuggestions[locationSuggestionIndex]);
      } else {
        setCurrentPage(1);
      }
    } else if (e.key === "Escape") {
      setShowLocationSuggestions(false);
      setLocationSuggestionIndex(-1);
    }
  };

  // ─── Quick-pick handlers ──────────────────────────────────────────────
  const handleKeywordClick = (keyword: string) => {
    setSearchQuery(keyword);
    setCurrentPage(1);
  };

  const handlePopularSearchClick = (term: string) => {
    setSearchQuery(term);
    setCurrentPage(1);
  };

  const handlePopularLocationClick = (city: string, state: string) => {
    setLocationInput(`${city}, ${state}`);
    setCurrentPage(1);
  };

  // ─── Filter results ───────────────────────────────────────────────────
  const filteredFacilities = useMemo(() => {
    if (!facilities || !hasActiveSearch) return [];

    let results = [...facilities];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter((f) =>
        f.name.toLowerCase().includes(query)
        || f.description?.toLowerCase().includes(query)
        || f.facilityType?.toLowerCase().includes(query)
        || f.treatmentTypes?.some((t) => t.toLowerCase().includes(query)),
      );
    }

    const locationMatch = locationInput ? parseLocationInput(locationInput) : null;

    if (locationInput && locationMatch) {
      results = results.filter((f) => facilityMatchesLocation(f, locationMatch));
    }

    if (selectedTreatmentTypes.length > 0) {
      results = results.filter((f) =>
        selectedTreatmentTypes.some((type) =>
          matchesTreatmentFilter(asSearchableFacility(f), type),
        ),
      );
    }

    if (selectedFacilityTypes.length > 0) {
      // facility_type is a separate dimension from clinical treatment — keep
      // it on its own simple substring match. Whitespace folded so
      // "outpatient-center" matches "Outpatient Program" etc.
      results = results.filter((f) => {
        const ft = (f.facilityType || "").toLowerCase().replace(/[\s-]+/g, "");
        return selectedFacilityTypes.some((type) =>
          ft.includes(type.toLowerCase().replace(/[\s-]+/g, "")),
        );
      });
    }

    if (selectedInsurance.length > 0) {
      results = results.filter((f) =>
        selectedInsurance.some((sel) =>
          matchesInsuranceFilter(asSearchableFacility(f), sel),
        ),
      );
    }

    if (selectedGenders.length > 0) {
      results = results.filter((f) => {
        const g = ((f as unknown as { genderServed?: string }).genderServed || "").toLowerCase();
        if (!g || g.includes("all") || g.includes("co-ed") || g.includes("coed")) return true;
        return selectedGenders.some((sel) => {
          if (sel === "co-ed") return g.includes("co-ed") || g.includes("coed") || g.includes("all");
          return g.includes(sel);
        });
      });
    }

    if (verifiedOnly) {
      results = results.filter((f) => !!f.verified);
    }

    // Sort by chosen key; default "relevance" = proximity-first + Pro + rating
    results.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "newest") {
        const ya = (a as unknown as { year_established?: number | null }).year_established ?? 0;
        const yb = (b as unknown as { year_established?: number | null }).year_established ?? 0;
        if (ya !== yb) return yb - ya;
      }
      if (sortKey === "rating") {
        const rA = (a as unknown as { googleRating?: number }).googleRating || 0;
        const rB = (b as unknown as { googleRating?: number }).googleRating || 0;
        if (rA !== rB) return rB - rA;
      }
      if (sortKey === "distance" || sortKey === "relevance") {
        if (locationMatch) {
          const { tier: tierA } = getProximityTier(a, locationMatch);
          const { tier: tierB } = getProximityTier(b, locationMatch);
          const proxA = PROXIMITY_TIER_ORDER[tierA];
          const proxB = PROXIMITY_TIER_ORDER[tierB];
          if (proxA !== proxB) return proxA - proxB;
        }
      }
      // Within the same prox/sort bucket, Pro first then rating
      const proA = getPlanPriority(a as Parameters<typeof getPlanPriority>[0]);
      const proB = getPlanPriority(b as Parameters<typeof getPlanPriority>[0]);
      if (proA !== proB) return proA - proB;
      const rA = (a as unknown as { googleRating?: number }).googleRating || 0;
      const rB = (b as unknown as { googleRating?: number }).googleRating || 0;
      if (rA !== rB) return rB - rA;
      return a.id.localeCompare(b.id);
    });

    return results;
  }, [facilities, searchQuery, locationInput, selectedTreatmentTypes, selectedFacilityTypes, selectedInsurance, selectedGenders, verifiedOnly, sortKey, hasActiveSearch]);

  // ─── Pagination ───────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredFacilities.length / SEARCH_PAGE_SIZE));

  // Clamp page when results shrink (e.g., filter narrowed the list)
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedFacilities = useMemo(() => {
    const start = (currentPage - 1) * SEARCH_PAGE_SIZE;
    return filteredFacilities.slice(start, start + SEARCH_PAGE_SIZE);
  }, [filteredFacilities, currentPage]);

  // Container-scoped scroll target — avoids `window.scrollTo` so this
  // page works inside the seeker shell (which has its own overflow
  // container) without yanking the body.
  const resultsTopRef = useRef<HTMLDivElement | null>(null);
  const scrollToResultsTop = () => {
    resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const facilityCards: FacilityCardData[] = useMemo(() => {
    return paginatedFacilities.map((f) => ({
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

  // ─── Filter toggles ───────────────────────────────────────────────────
  const togglePagedSetter = (set: string[], value: string, setter: (v: string[]) => void) => {
    setter(set.includes(value) ? set.filter((v) => v !== value) : [...set, value]);
    setCurrentPage(1);
  };

  const toggleTreatmentType = (value: string) => togglePagedSetter(selectedTreatmentTypes, value, setSelectedTreatmentTypes);
  const toggleFacilityType = (value: string) => togglePagedSetter(selectedFacilityTypes, value, setSelectedFacilityTypes);
  const toggleInsurance = (value: string) => togglePagedSetter(selectedInsurance, value, setSelectedInsurance);
  const toggleGender = (value: string) => togglePagedSetter(selectedGenders, value, setSelectedGenders);

  const clearAll = () => {
    setSearchQuery("");
    setLocationInput("");
    setSelectedTreatmentTypes([]);
    setSelectedFacilityTypes([]);
    setSelectedInsurance([]);
    setSelectedGenders([]);
    setVerifiedOnly(false);
    setSortKey("relevance");
    setCurrentPage(1);
  };

  const clearFiltersOnly = () => {
    setSelectedTreatmentTypes([]);
    setSelectedFacilityTypes([]);
    setSelectedInsurance([]);
    setSelectedGenders([]);
    setVerifiedOnly(false);
    setCurrentPage(1);
  };

  const activeFilterCount =
    selectedTreatmentTypes.length
    + selectedFacilityTypes.length
    + selectedInsurance.length
    + selectedGenders.length
    + (verifiedOnly ? 1 : 0);

  // ─── Save Search — build payload for the existing component ───────────
  const saveSearchUrl = `${location.pathname}${location.search}`;
  const saveSearchCriteria: Record<string, unknown> = {
    q: searchQuery.trim() || null,
    loc: locationInput.trim() || null,
    t: selectedTreatmentTypes,
    ft: selectedFacilityTypes,
    ins: selectedInsurance,
    g: selectedGenders,
    v: verifiedOnly,
    sort: sortKey,
  };
  const saveSearchSuggestedName = useMemo(() => {
    const parts: string[] = [];
    if (searchQuery.trim()) parts.push(searchQuery.trim());
    if (selectedTreatmentTypes.length > 0) parts.push(selectedTreatmentTypes.map((v) => TREATMENT_LABEL_BY_VALUE[v] || v).join(" + "));
    if (locationInput.trim()) parts.push(`in ${locationInput.trim()}`);
    if (selectedInsurance.length > 0) parts.push(`with ${selectedInsurance.map((v) => INSURANCE_LABEL_BY_VALUE[v] || v).join("/")}`);
    return parts.join(" ").slice(0, 80) || "My saved search";
  }, [searchQuery, locationInput, selectedTreatmentTypes, selectedInsurance]);

  const recentSavedSearches = (savedSearches || []).slice(0, 4);

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <>
      <Helmet>
        <title>Search Treatment Centers | RehabLookup</title>
        <meta name="description" content="Search and find treatment centers near you. Filter by location, treatment type, insurance, and facility type." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="flex flex-col min-h-full bg-background">
        {/* Search Header */}
        <div className="bg-card border-b border-border sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pt-4 pb-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by name, treatment type, or keyword"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                onKeyDown={(e) => { if (e.key === "Enter") { setCurrentPage(1); scrollToResultsTop(); } }}
                aria-label="Search treatment centers"
                className="pl-12 pr-11 h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl text-base"
              />
              {searchQuery && (
                <button
                  type="button"
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
                  setCurrentPage(1);
                }}
                onFocus={() => setShowLocationSuggestions(true)}
                onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                onKeyDown={handleLocationKeyDown}
                aria-label="Location"
                aria-autocomplete="list"
                aria-expanded={showLocationSuggestions && locationSuggestions.length > 0}
                aria-controls="location-suggestions-list"
                aria-activedescendant={locationSuggestionIndex >= 0 ? `location-suggestion-${locationSuggestionIndex}` : undefined}
                role="combobox"
                className="pl-12 pr-11 h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl text-base"
              />
              {locationInput && (
                <button
                  type="button"
                  onClick={() => setLocationInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-lg transition-colors"
                  aria-label="Clear location"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}

              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <ul
                  id="location-suggestions-list"
                  role="listbox"
                  className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto"
                >
                  {locationSuggestions.map((suggestion, index) => (
                    <li key={`${suggestion.name}-${index}`} role="presentation">
                      <button
                        type="button"
                        id={`location-suggestion-${index}`}
                        role="option"
                        aria-selected={locationSuggestionIndex === index}
                        onClick={() => handleLocationSelect(suggestion)}
                        onMouseEnter={() => setLocationSuggestionIndex(index)}
                        className={cn(
                          "w-full px-4 py-3 text-left flex items-center gap-3 border-b border-border last:border-b-0 transition-colors",
                          locationSuggestionIndex === index ? "bg-muted" : "hover:bg-muted",
                        )}
                      >
                        <Navigation className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm text-foreground">
                          {formatLocationSuggestion(suggestion)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Search / Filters Row */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => { setCurrentPage(1); scrollToResultsTop(); }}
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
                      activeFilterCount > 0 && "border-primary text-primary",
                    )}
                    aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : "Filters"}
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
                        <Button variant="ghost" size="sm" onClick={clearFiltersOnly} className="text-primary">
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
                          {selectedTreatmentTypes.length > 0 && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              ({selectedTreatmentTypes.length})
                            </span>
                          )}
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
                          {selectedFacilityTypes.length > 0 && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              ({selectedFacilityTypes.length})
                            </span>
                          )}
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

                      <AccordionItem value="insurance" className="border-border">
                        <AccordionTrigger className="text-base font-medium text-foreground">
                          Insurance
                          {selectedInsurance.length > 0 && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              ({selectedInsurance.length})
                            </span>
                          )}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            {insuranceFilters.map((filter) => (
                              <div key={filter.value} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`insurance-${filter.value}`}
                                  checked={selectedInsurance.includes(filter.value)}
                                  onCheckedChange={() => toggleInsurance(filter.value)}
                                />
                                <Label
                                  htmlFor={`insurance-${filter.value}`}
                                  className="text-sm font-normal cursor-pointer text-foreground"
                                >
                                  {filter.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="gender" className="border-border">
                        <AccordionTrigger className="text-base font-medium text-foreground">
                          Gender Served
                          {selectedGenders.length > 0 && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              ({selectedGenders.length})
                            </span>
                          )}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {genderFilters.map((filter) => (
                              <div key={filter.value} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`gender-${filter.value}`}
                                  checked={selectedGenders.includes(filter.value)}
                                  onCheckedChange={() => toggleGender(filter.value)}
                                />
                                <Label
                                  htmlFor={`gender-${filter.value}`}
                                  className="text-sm font-normal cursor-pointer text-foreground"
                                >
                                  {filter.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="trust" className="border-border">
                        <AccordionTrigger className="text-base font-medium text-foreground">
                          Trust & Verification
                          {verifiedOnly && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">(1)</span>
                          )}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id="verified-only"
                                checked={verifiedOnly}
                                onCheckedChange={(c) => { setVerifiedOnly(c === true); setCurrentPage(1); }}
                              />
                              <Label
                                htmlFor="verified-only"
                                className="text-sm font-normal cursor-pointer text-foreground"
                              >
                                <ShieldCheck className="inline-block h-3.5 w-3.5 mr-1.5 text-primary -mt-0.5" />
                                Verified listings only
                              </Label>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
                    <Button
                      className="w-full h-12 rounded-xl font-medium"
                      onClick={() => setFiltersOpen(false)}
                    >
                      Show {filteredFacilities.length} {filteredFacilities.length === 1 ? "result" : "results"}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8 py-4 pb-24">
          {!hasActiveSearch ? (
            <InitialState
              keywords={searchKeywords}
              popularSearches={popularSearches}
              popularLocations={popularLocations}
              onKeywordClick={handleKeywordClick}
              onPopularSearchClick={handlePopularSearchClick}
              onPopularLocationClick={handlePopularLocationClick}
              recentSavedSearches={recentSavedSearches}
              isAuthenticated={isAuthenticated}
            />
          ) : (
            <div ref={resultsTopRef}>
              {/* Active filter chips — ALL dimensions now (not just treatment/facility) */}
              {activeFilterCount > 0 && (
                <div className="mb-4 overflow-x-auto scrollbar-hide">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FilterChips
                      values={selectedTreatmentTypes}
                      labelMap={TREATMENT_LABEL_BY_VALUE}
                      onRemove={(v) => toggleTreatmentType(v)}
                    />
                    <FilterChips
                      values={selectedFacilityTypes}
                      labelMap={FACILITY_LABEL_BY_VALUE}
                      onRemove={(v) => toggleFacilityType(v)}
                    />
                    <FilterChips
                      values={selectedInsurance}
                      labelMap={INSURANCE_LABEL_BY_VALUE}
                      onRemove={(v) => toggleInsurance(v)}
                    />
                    <FilterChips
                      values={selectedGenders}
                      labelMap={GENDER_LABEL_BY_VALUE}
                      onRemove={(v) => toggleGender(v)}
                    />
                    {verifiedOnly && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 gap-1 pr-1 bg-primary/10 text-primary border-primary/20"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        Verified only
                        <button
                          onClick={() => { setVerifiedOnly(false); setCurrentPage(1); }}
                          className="ml-1 p-0.5 hover:bg-primary/20 rounded"
                          aria-label="Remove verified filter"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {activeFilterCount > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFiltersOnly}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Clear filters
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {facilitiesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <FacilityCardSkeleton key={i} />
                  ))}
                </div>
              ) : facilitiesError ? (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/5 p-4 flex items-start gap-3"
                >
                  <Building2 className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-destructive">
                      Couldn't load treatment centers
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">
                      {facilitiesError instanceof Error ? facilitiesError.message : "Please try again."}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchFacilities()}>
                    Retry
                  </Button>
                </div>
              ) : filteredFacilities.length === 0 ? (
                <EmptyResults
                  searchQuery={searchQuery}
                  locationInput={locationInput}
                  hasLocation={!!locationInput.trim()}
                  activeFilterCount={activeFilterCount}
                  onClearLocation={() => setLocationInput("")}
                  onClearFilters={clearFiltersOnly}
                  onClearAll={clearAll}
                />
              ) : (
                <div className="space-y-4">
                  {/* Result count + sort + save */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground tabular-nums">
                        {(currentPage - 1) * SEARCH_PAGE_SIZE + 1}–{Math.min(currentPage * SEARCH_PAGE_SIZE, filteredFacilities.length)}
                      </span>
                      {" of "}
                      <span className="font-medium text-foreground tabular-nums">{filteredFacilities.length}</span>
                      {searchQuery && <span> for "<span className="text-foreground font-medium">{searchQuery}</span>"</span>}
                      {locationInput && <span> near <span className="text-foreground font-medium">{locationInput}</span></span>}
                    </p>
                    <div className="flex items-center gap-2">
                      <Select value={sortKey} onValueChange={(v) => { setSortKey(v as SortKey); setCurrentPage(1); }}>
                        <SelectTrigger
                          className="h-8 w-[170px] text-xs"
                          aria-label="Sort results"
                        >
                          <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SORT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <SaveSearchButton
                        criteria={saveSearchCriteria}
                        suggestedName={saveSearchSuggestedName}
                        searchUrl={saveSearchUrl}
                        resultCount={filteredFacilities.length}
                        size="sm"
                      />
                    </div>
                  </div>

                  {facilityCards.map((facility) => (
                    <FacilityCard key={facility.id} facility={facility} />
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <nav aria-label="Search results pagination" className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => { setCurrentPage((p) => p - 1); scrollToResultsTop(); }}
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
                              onClick={() => { setCurrentPage(page); scrollToResultsTop(); }}
                              aria-current={currentPage === page ? "page" : undefined}
                              aria-label={`Page ${page}`}
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
                        onClick={() => { setCurrentPage((p) => p + 1); scrollToResultsTop(); }}
                        className="h-8 gap-1"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </nav>
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

function FilterChips({
  values,
  labelMap,
  onRemove,
}: {
  values: string[];
  labelMap: Record<string, string>;
  onRemove: (value: string) => void;
}) {
  return (
    <>
      {values.map((v) => (
        <Badge
          key={v}
          variant="secondary"
          className="shrink-0 gap-1 pr-1 bg-primary/10 text-primary border-primary/20"
        >
          {labelMap[v] || v}
          <button
            onClick={() => onRemove(v)}
            className="ml-1 p-0.5 hover:bg-primary/20 rounded"
            aria-label={`Remove ${labelMap[v] || v} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </>
  );
}

function EmptyResults({
  searchQuery,
  locationInput,
  hasLocation,
  activeFilterCount,
  onClearLocation,
  onClearFilters,
  onClearAll,
}: {
  searchQuery: string;
  locationInput: string;
  hasLocation: boolean;
  activeFilterCount: number;
  onClearLocation: () => void;
  onClearFilters: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Building2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No facilities found</h3>
      <p className="text-muted-foreground text-sm max-w-md mb-4">
        {searchQuery && hasLocation
          ? `Nothing matched "${searchQuery}" near ${locationInput}.`
          : searchQuery
            ? `Nothing matched "${searchQuery}".`
            : hasLocation
              ? `No facilities matched your filters near ${locationInput}.`
              : "No facilities matched your filters."}
      </p>
      <div className="flex flex-wrap items-center gap-2 justify-center">
        {hasLocation && (
          <Button variant="outline" size="sm" onClick={onClearLocation} className="rounded-xl">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            Remove location
          </Button>
        )}
        {activeFilterCount > 0 && (
          <Button variant="outline" size="sm" onClick={onClearFilters} className="rounded-xl">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
            Clear filters
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClearAll} className="rounded-xl">
          Start over
        </Button>
      </div>
    </div>
  );
}

function InitialState({
  keywords,
  popularSearches,
  popularLocations,
  onKeywordClick,
  onPopularSearchClick,
  onPopularLocationClick,
  recentSavedSearches,
  isAuthenticated,
}: {
  keywords: typeof searchKeywords;
  popularSearches: string[];
  popularLocations: { city: string; state: string }[];
  onKeywordClick: (k: string) => void;
  onPopularSearchClick: (t: string) => void;
  onPopularLocationClick: (city: string, state: string) => void;
  recentSavedSearches: { id: string; name: string; search_url: string; last_match_count: number }[];
  isAuthenticated: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Saved searches (authenticated users with at least one saved) */}
      {isAuthenticated && recentSavedSearches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Your Saved Searches</h2>
          </div>
          <div className="space-y-1">
            {recentSavedSearches.map((s) => (
              <Link
                key={s.id}
                to={s.search_url}
                className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl hover:bg-muted hover:border-primary/50 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground truncate">{s.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.last_match_count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {s.last_match_count}
                    </Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Quick Search</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <button
              key={keyword.label}
              onClick={() => onKeywordClick(keyword.label)}
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-full hover:bg-muted hover:border-primary/50 transition-all active:scale-95"
            >
              <span className="text-base">{keyword.icon}</span>
              <span className="text-sm font-medium text-foreground">{keyword.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Popular Searches</h2>
        </div>
        <div className="space-y-1">
          {popularSearches.map((term) => (
            <button
              key={term}
              onClick={() => onPopularSearchClick(term)}
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

      <section>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Popular Locations</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {popularLocations.map((loc) => (
            <button
              key={`${loc.city}-${loc.state}`}
              onClick={() => onPopularLocationClick(loc.city, loc.state)}
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-full hover:bg-muted hover:border-primary/50 transition-all active:scale-95"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium text-foreground">{loc.city}, {loc.state}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <div className="flex gap-3">
          <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">Find the Right Treatment</h3>
            <p className="text-sm text-muted-foreground">
              Search by name, location, treatment type, or insurance. {isAuthenticated && "Save searches to get notified when new facilities match."}
            </p>
          </div>
        </div>
      </div>

      {/* Initial-state loader indicator */}
      <div className="sr-only" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" /> Ready to search
      </div>
    </div>
  );
}
