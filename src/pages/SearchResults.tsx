import { useMemo, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { treatmentCenters } from "@/data/treatmentCenters";
import { useApprovedFacilities } from "@/hooks/useApprovedFacilities";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { 
  Heart, 
  MapPin, 
  Search, 
  Grid3X3, 
  List, 
  X, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Phone,
  SlidersHorizontal,
  Building2,
  Shield,
  Star
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
import { Checkbox } from "@/components/ui/checkbox";

const ITEMS_PER_PAGE = 12;

type SortOption = "featured" | "rating-high" | "rating-low" | "name-asc" | "name-desc" | "reviews";

const sortOptions: { value: SortOption; label: string }[] = [
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

// Amenity filters - these would normally map to facility amenities data
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
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const sortParam = (searchParams.get("sort") as SortOption) || "featured";
  
  // Filter params (comma-separated values)
  const treatmentTypesParam = searchParams.get("treatmentTypes") || "";
  const amenitiesParam = searchParams.get("amenities") || "";
  const verifiedOnly = searchParams.get("verified") === "true";
  const featuredOnly = searchParams.get("featuredOnly") === "true";

  // Parse comma-separated filter values
  const selectedTreatmentTypes = treatmentTypesParam ? treatmentTypesParam.split(",") : [];
  const selectedAmenities = amenitiesParam ? amenitiesParam.split(",") : [];

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: approvedFacilities = [], isLoading } = useApprovedFacilities();

  const allCenters = useMemo(() => {
    return [...treatmentCenters, ...approvedFacilities];
  }, [approvedFacilities]);

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

    // Location filter
    if (location) {
      const locationLower = location.toLowerCase();
      results = results.filter(
        (c) =>
          c.city.toLowerCase().includes(locationLower) ||
          c.state.toLowerCase().includes(locationLower) ||
          c.zipCode.includes(location)
      );
    }

    // Treatment filter from search form
    if (treatment) {
      results = results.filter((c) =>
        c.treatmentTypes.some((t) => t.toLowerCase() === treatment.toLowerCase())
      );
    }

    // Type filter from homepage cards
    if (type && typeFilterMap[type]) {
      results = results.filter((c) =>
        c.treatmentTypes.some((t) => typeFilterMap[type].includes(t))
      );
    }

    // Insurance filter
    if (insurance) {
      results = results.filter((c) =>
        c.insuranceAccepted.some((i) =>
          i.toLowerCase().includes(insurance.toLowerCase())
        )
      );
    }

    // Treatment Type sidebar filters (checkbox filters)
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

    // Amenity filters (simulated - in real app these would check facility amenities)
    if (selectedAmenities.length > 0) {
      // For demo purposes, we'll filter based on description containing amenity keywords
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

    // Apply sorting
    switch (sortParam) {
      case "featured":
        results.sort((a, b) => {
          const aHasFeaturedSub = (a as any).hasFeaturedSubscription ? 1 : 0;
          const bHasFeaturedSub = (b as any).hasFeaturedSubscription ? 1 : 0;
          if (bHasFeaturedSub !== aHasFeaturedSub) return bHasFeaturedSub - aHasFeaturedSub;
          if (b.featured !== a.featured) return b.featured ? 1 : -1;
          return b.rating - a.rating;
        });
        break;
      case "rating-high":
        results.sort((a, b) => b.rating - a.rating);
        break;
      case "rating-low":
        results.sort((a, b) => a.rating - b.rating);
        break;
      case "reviews":
        results.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case "name-asc":
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        results.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return results;
  }, [allCenters, location, treatment, insurance, type, sortParam, selectedTreatmentTypes, selectedAmenities, verifiedOnly, featuredOnly]);

  const hasFilters = location || treatment || insurance || type || selectedTreatmentTypes.length > 0 || selectedAmenities.length > 0 || verifiedOnly || featuredOnly;
  const activeTypeFilter = type ? typeDisplayNames[type] : null;

  const totalPages = Math.ceil(filteredCenters.length / ITEMS_PER_PAGE);
  const paginatedCenters = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCenters.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCenters, currentPage]);

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", page.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    if (value === "featured") {
      newParams.delete("sort");
    } else {
      newParams.set("sort", value);
    }
    newParams.delete("page");
    setSearchParams(newParams);
  };

  // Count active sidebar filters
  const activeSidebarFiltersCount = selectedTreatmentTypes.length + selectedAmenities.length + (verifiedOnly ? 1 : 0) + (featuredOnly ? 1 : 0);

  return (
    <Layout>
      <SEO
        title={`Treatment Centers ${location ? `near ${location}` : ""} | Search Results`}
        description={`Browse ${filteredCenters.length} verified treatment centers. Compare programs, read reviews, and find the right rehab facility.`}
        canonical="/search-results"
      />
      
      {/* Results Header Bar */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container">
          <div className="flex items-center justify-between gap-4 py-3">
            {/* Left: Back + Search Summary */}
            <div className="flex items-center gap-3">
              <Link to="/rehab-centers" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  <span className="text-primary">{filteredCenters.length}</span>
                  <span className="text-muted-foreground"> results</span>
                  {location && <span className="text-muted-foreground"> near <span className="text-foreground">{location}</span></span>}
                </span>
              </div>
            </div>

            {/* Right: Sort + View + Filter */}
            <div className="flex items-center gap-2">
              {/* Mobile Filter Toggle */}
              <Button 
                variant="outline" 
                size="sm" 
                className="lg:hidden gap-2"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeSidebarFiltersCount > 0 && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeSidebarFiltersCount}
                  </span>
                )}
              </Button>

              {/* Sort Dropdown */}
              <Select value={sortParam} onValueChange={(v) => handleSortChange(v as SortOption)}>
                <SelectTrigger className="h-9 w-[130px] md:w-[160px] gap-2 text-sm border-border bg-background">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-sm">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="hidden md:flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded p-1.5 transition-colors ${
                    viewMode === "grid" 
                      ? "bg-secondary text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded p-1.5 transition-colors ${
                    viewMode === "list" 
                      ? "bg-secondary text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Bar */}
          {hasFilters && (
            <div className="flex items-center gap-2 flex-wrap pb-3 border-t border-border pt-3">
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
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Star className="h-3 w-3" />
                  Featured Only
                  <X className="h-3 w-3 ml-0.5" />
                </button>
              )}
              <button
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <section className="bg-secondary/20 py-6 min-h-screen">
        <div className="container">
          <div className="flex gap-6">
            {/* Left Sidebar - Filters */}
            <aside className={`
              ${showMobileFilters ? 'fixed inset-0 z-50 bg-background p-6 overflow-auto' : 'hidden'} 
              lg:block lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:p-0 lg:overflow-visible
              w-full lg:w-64 shrink-0
            `}>
              {/* Mobile Close Button */}
              <div className="lg:hidden flex items-center justify-between mb-6">
                <h2 className="font-semibold text-lg">Filters</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowMobileFilters(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Treatment Type Filter */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Treatment Type
                    {selectedTreatmentTypes.length > 0 && (
                      <span className="ml-auto text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        {selectedTreatmentTypes.length}
                      </span>
                    )}
                  </h3>
                  <div className="space-y-2.5">
                    {treatmentTypeFilters.map((filter) => (
                      <label 
                        key={filter.value} 
                        className="flex items-center gap-2.5 cursor-pointer group"
                      >
                        <Checkbox 
                          id={`treatment-${filter.value}`}
                          checked={selectedTreatmentTypes.includes(filter.value)}
                          onCheckedChange={() => toggleFilter("treatmentTypes", filter.value, selectedTreatmentTypes)}
                          className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
                        />
                        <span className={`text-sm transition-colors ${
                          selectedTreatmentTypes.includes(filter.value) 
                            ? "text-foreground font-medium" 
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}>
                          {filter.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Amenities Filter */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    Amenities
                    {selectedAmenities.length > 0 && (
                      <span className="ml-auto text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        {selectedAmenities.length}
                      </span>
                    )}
                  </h3>
                  <div className="space-y-2.5">
                    {amenityFilters.map((filter) => (
                      <label 
                        key={filter.value} 
                        className="flex items-center gap-2.5 cursor-pointer group"
                      >
                        <Checkbox 
                          id={`amenity-${filter.value}`}
                          checked={selectedAmenities.includes(filter.value)}
                          onCheckedChange={() => toggleFilter("amenities", filter.value, selectedAmenities)}
                          className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
                        />
                        <span className={`text-sm transition-colors ${
                          selectedAmenities.includes(filter.value) 
                            ? "text-foreground font-medium" 
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}>
                          {filter.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Verification Filter */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Verification
                    {(verifiedOnly || featuredOnly) && (
                      <span className="ml-auto text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        {(verifiedOnly ? 1 : 0) + (featuredOnly ? 1 : 0)}
                      </span>
                    )}
                  </h3>
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <Checkbox 
                        id="verified-filter"
                        checked={verifiedOnly}
                        onCheckedChange={() => toggleBooleanFilter("verified", verifiedOnly)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
                      />
                      <span className={`text-sm transition-colors ${
                        verifiedOnly 
                          ? "text-foreground font-medium" 
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}>
                        Verified Only
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <Checkbox 
                        id="featured-filter"
                        checked={featuredOnly}
                        onCheckedChange={() => toggleBooleanFilter("featuredOnly", featuredOnly)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
                      />
                      <span className={`text-sm transition-colors ${
                        featuredOnly 
                          ? "text-foreground font-medium" 
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}>
                        Featured Centers
                      </span>
                    </label>
                  </div>
                </div>

                {/* Need Help CTA */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Need Help?</p>
                      <p className="text-xs text-muted-foreground">Free consultation</p>
                    </div>
                  </div>
                  <Link to="/request-help?source=search_sidebar">
                    <Button size="sm" className="w-full">Get Help Now</Button>
                  </Link>
                </div>

                {/* Clear All Filters Button */}
                {activeSidebarFiltersCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete("treatmentTypes");
                      newParams.delete("amenities");
                      newParams.delete("verified");
                      newParams.delete("featuredOnly");
                      newParams.delete("page");
                      setSearchParams(newParams);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Sidebar Filters
                  </Button>
                )}
              </div>

              {/* Mobile Apply Button */}
              <div className="lg:hidden mt-6 pt-4 border-t border-border">
                <Button className="w-full" onClick={() => setShowMobileFilters(false)}>
                  Show {filteredCenters.length} Results
                </Button>
              </div>
            </aside>

            {/* Results Grid */}
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <SearchResultsLoading count={12} />
              ) : paginatedCenters.length > 0 ? (
                <>
                  <div className={
                    viewMode === "grid" 
                      ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" 
                      : "flex flex-col gap-3"
                  }>
                    {paginatedCenters.map((center) => (
                      <TreatmentCenterCard
                        key={center.id}
                        center={center}
                        featured={center.featured}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <button
                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-4 text-sm font-medium disabled:opacity-50 disabled:pointer-events-none hover:bg-secondary transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {[...Array(totalPages)].map((_, i) => {
                          const page = i + 1;
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`h-10 min-w-10 rounded-lg text-sm font-medium transition-colors ${
                                  currentPage === page
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-card border border-border hover:bg-secondary"
                                }`}
                              >
                                {page}
                              </button>
                            );
                          }
                          if (page === 2 || page === totalPages - 1) {
                            return (
                              <span key={page} className="px-1 text-muted-foreground">...</span>
                            );
                          }
                          return null;
                        })}
                      </div>
                      
                      <button
                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-4 text-sm font-medium disabled:opacity-50 disabled:pointer-events-none hover:bg-secondary transition-colors"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-card rounded-xl border border-border p-12 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
                    No Results Found
                  </h2>
                  <p className="mb-6 text-muted-foreground text-sm max-w-sm mx-auto">
                    We couldn't find treatment centers matching your criteria. Try adjusting your filters or search.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button variant="outline" size="sm" onClick={clearAllFilters} className="gap-2">
                      <X className="h-4 w-4" />
                      Clear Filters
                    </Button>
                    <Link to="/request-help?source=search_empty">
                      <Button size="sm" className="w-full gap-2 sm:w-auto">
                        <Heart className="h-4 w-4" />
                        Request Help
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-card py-8">
        <div className="container">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 md:flex-row rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 p-5 border border-primary/20">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-b from-background to-secondary/50 ring-2 ring-primary/20">
                <img 
                  src={supportSpecialistImg} 
                  alt="Support specialist" 
                  className="w-full h-full object-cover object-top scale-110"
                />
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-semibold text-foreground">
                Can't find what you're looking for?
              </h2>
              <p className="text-sm text-muted-foreground">
                Our specialists can help match you with the right treatment center.
              </p>
            </div>
            
            <div className="flex shrink-0 gap-2">
              <Link to="/request-help?source=search_cta">
                <Button size="sm" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Get Help
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SearchResults;
