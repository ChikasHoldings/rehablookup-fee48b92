import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { SearchForm } from "@/components/search/SearchForm";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { treatmentCenters } from "@/data/treatmentCenters";
import { useApprovedFacilities } from "@/hooks/useApprovedFacilities";
import { Heart, MapPin, Search, ArrowRight, CheckCircle, Grid3X3, List, X, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ITEMS_PER_PAGE = 9;

type SortOption = "featured" | "rating-high" | "rating-low" | "name-asc" | "name-desc" | "reviews";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured First" },
  { value: "rating-high", label: "Highest Rated" },
  { value: "rating-low", label: "Lowest Rated" },
  { value: "reviews", label: "Most Reviews" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
];

const RehabCenters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = searchParams.get("location") || "";
  const treatment = searchParams.get("treatment") || "";
  const insurance = searchParams.get("insurance") || "";
  const type = searchParams.get("type") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const sortParam = (searchParams.get("sort") as SortOption) || "featured";

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: approvedFacilities = [], isLoading } = useApprovedFacilities();

  // Combine static data with approved facilities from database
  const allCenters = useMemo(() => {
    return [...treatmentCenters, ...approvedFacilities];
  }, [approvedFacilities]);

  // Map type query param to treatment types
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

  const filteredCenters = useMemo(() => {
    let results = [...allCenters];

    // Filter by location
    if (location) {
      const locationLower = location.toLowerCase();
      results = results.filter(
        (c) =>
          c.city.toLowerCase().includes(locationLower) ||
          c.state.toLowerCase().includes(locationLower) ||
          c.zipCode.includes(location)
      );
    }

    // Filter by treatment type (from search form)
    if (treatment) {
      results = results.filter((c) =>
        c.treatmentTypes.some((t) => t.toLowerCase() === treatment.toLowerCase())
      );
    }

    // Filter by type (from homepage cards)
    if (type && typeFilterMap[type]) {
      results = results.filter((c) =>
        c.treatmentTypes.some((t) => typeFilterMap[type].includes(t))
      );
    }

    // Filter by insurance
    if (insurance) {
      results = results.filter((c) =>
        c.insuranceAccepted.some((i) =>
          i.toLowerCase().includes(insurance.toLowerCase())
        )
      );
    }

    // Apply sorting
    switch (sortParam) {
      case "featured":
        // Sort by Featured subscription first (search priority), then by rating
        results.sort((a, b) => {
          // First: Featured subscription holders always appear first
          const aHasFeaturedSub = (a as any).hasFeaturedSubscription ? 1 : 0;
          const bHasFeaturedSub = (b as any).hasFeaturedSubscription ? 1 : 0;
          if (bHasFeaturedSub !== aHasFeaturedSub) return bHasFeaturedSub - aHasFeaturedSub;
          
          // Second: Legacy featured flag (for static data)
          if (b.featured !== a.featured) return b.featured ? 1 : -1;
          
          // Third: Rating for remaining sort
          return b.rating - a.rating;
        });
        break;
      case "rating-high":
        // Still prioritize featured at top, then sort by rating
        results.sort((a, b) => {
          const aHasFeaturedSub = (a as any).hasFeaturedSubscription ? 1 : 0;
          const bHasFeaturedSub = (b as any).hasFeaturedSubscription ? 1 : 0;
          if (bHasFeaturedSub !== aHasFeaturedSub) return bHasFeaturedSub - aHasFeaturedSub;
          return b.rating - a.rating;
        });
        break;
      case "rating-low":
        results.sort((a, b) => {
          const aHasFeaturedSub = (a as any).hasFeaturedSubscription ? 1 : 0;
          const bHasFeaturedSub = (b as any).hasFeaturedSubscription ? 1 : 0;
          if (bHasFeaturedSub !== aHasFeaturedSub) return bHasFeaturedSub - aHasFeaturedSub;
          return a.rating - b.rating;
        });
        break;
      case "reviews":
        results.sort((a, b) => {
          const aHasFeaturedSub = (a as any).hasFeaturedSubscription ? 1 : 0;
          const bHasFeaturedSub = (b as any).hasFeaturedSubscription ? 1 : 0;
          if (bHasFeaturedSub !== aHasFeaturedSub) return bHasFeaturedSub - aHasFeaturedSub;
          return b.reviewCount - a.reviewCount;
        });
        break;
      case "name-asc":
        results.sort((a, b) => {
          const aHasFeaturedSub = (a as any).hasFeaturedSubscription ? 1 : 0;
          const bHasFeaturedSub = (b as any).hasFeaturedSubscription ? 1 : 0;
          if (bHasFeaturedSub !== aHasFeaturedSub) return bHasFeaturedSub - aHasFeaturedSub;
          return a.name.localeCompare(b.name);
        });
        break;
      case "name-desc":
        results.sort((a, b) => {
          const aHasFeaturedSub = (a as any).hasFeaturedSubscription ? 1 : 0;
          const bHasFeaturedSub = (b as any).hasFeaturedSubscription ? 1 : 0;
          if (bHasFeaturedSub !== aHasFeaturedSub) return bHasFeaturedSub - aHasFeaturedSub;
          return b.name.localeCompare(a.name);
        });
        break;
    }

    return results;
  }, [allCenters, location, treatment, insurance, type, sortParam]);

  const hasFilters = location || treatment || insurance || type;
  const activeTypeFilter = type ? typeDisplayNames[type] : null;

  // Pagination
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

  return (
    <Layout>
      <SEO
        title="Find Rehab Centers Near You"
        description="Search and compare verified addiction treatment centers. Filter by location, treatment type, and insurance. Find the right rehab facility for your recovery journey."
        canonical="/rehab-centers"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Find Rehab", url: "/rehab-centers" },
        ]}
      />
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-primary py-8 md:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent" />
        
        <div className="container relative">
          <div className="mb-6 max-w-xl">
            <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary-foreground/70">
              <CheckCircle className="h-3.5 w-3.5" />
              Verified Treatment Centers
            </div>
            <h1 className="font-display text-xl font-bold tracking-tight text-primary-foreground md:text-2xl lg:text-3xl">
              Find Your Path to Recovery
            </h1>
            <p className="mt-2 text-sm text-primary-foreground/70">
              {hasFilters ? (
                <>
                  <span className="font-medium text-primary-foreground">{filteredCenters.length}</span> results
                  {activeTypeFilter && ` for ${activeTypeFilter}`}
                  {location && ` near "${location}"`}
                </>
              ) : (
                "Search verified treatment centers and find the right care for you"
              )}
            </p>
          </div>

          {/* Compact Search Form */}
          <div className="rounded-xl border border-white/10 bg-card p-4 shadow-lg">
            <SearchForm
              variant="compact"
              initialLocation={location}
              initialTreatmentType={treatment}
              initialInsurance={insurance}
              onSearchComplete={() => {
                document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>
        </div>
      </section>

      {/* Results */}
      <section id="results" className="scroll-mt-4 bg-muted/30 py-8 md:py-16">
        <div className="container px-4 md:px-6">
          {/* Mobile Results Header */}
          <div className="mb-6 md:hidden">
            {/* Results Count */}
            <p className="text-base font-medium text-foreground mb-4">
              <span className="text-primary">{filteredCenters.length}</span> treatment centers found
            </p>

            {/* Mobile Active Filters - Horizontal scroll */}
            {hasFilters && (
              <div className="mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-2 pb-2">
                  {location && (
                    <button
                      onClick={() => clearFilter("location")}
                      className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors active:bg-primary/20 shrink-0"
                    >
                      <MapPin className="h-4 w-4" />
                      {location}
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {treatment && (
                    <button
                      onClick={() => clearFilter("treatment")}
                      className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors active:bg-primary/20 shrink-0"
                    >
                      {treatment}
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {insurance && (
                    <button
                      onClick={() => clearFilter("insurance")}
                      className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors active:bg-primary/20 shrink-0"
                    >
                      {insurance}
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {activeTypeFilter && (
                    <button
                      onClick={() => clearFilter("type")}
                      className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors active:bg-primary/20 shrink-0"
                    >
                      {activeTypeFilter}
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className="text-sm font-medium text-muted-foreground underline shrink-0 px-2"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Sort & View Controls - Full width buttons */}
            <div className="flex items-center gap-3">
              <Select value={sortParam} onValueChange={(v) => handleSortChange(v as SortOption)}>
                <SelectTrigger className="h-12 flex-1 gap-2 bg-card rounded-xl text-base">
                  <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-base py-3">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Mobile View Toggle - Larger touch targets */}
              <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-lg p-3 transition-colors ${
                    viewMode === "grid" 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground active:text-foreground"
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-lg p-3 transition-colors ${
                    viewMode === "list" 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground active:text-foreground"
                  }`}
                  aria-label="List view"
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Results Header */}
          <div className="mb-8 hidden md:flex md:flex-wrap md:items-center md:justify-between md:gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredCenters.length}</span> treatment centers found
              </p>
              
              {/* Active Filters */}
              {hasFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">•</span>
                  {location && (
                    <button
                      onClick={() => clearFilter("location")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      <MapPin className="h-3 w-3" />
                      {location}
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {treatment && (
                    <button
                      onClick={() => clearFilter("treatment")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      {treatment}
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {insurance && (
                    <button
                      onClick={() => clearFilter("insurance")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      {insurance}
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {activeTypeFilter && (
                    <button
                      onClick={() => clearFilter("type")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      {activeTypeFilter}
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Sort and View Controls */}
            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <Select value={sortParam} onValueChange={(v) => handleSortChange(v as SortOption)}>
                <SelectTrigger className="h-10 w-[180px] gap-2 bg-card">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-2 transition-colors ${
                    viewMode === "grid" 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-md p-2 transition-colors ${
                    viewMode === "list" 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-5 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[420px] md:h-96 animate-pulse rounded-2xl bg-card" />
              ))}
            </div>
          ) : paginatedCenters.length > 0 ? (
            <>
              <div className={
                viewMode === "grid" 
                  ? "grid gap-5 md:gap-6 md:grid-cols-2 lg:grid-cols-3" 
                  : "flex flex-col gap-5 md:gap-4"
              }>
                {paginatedCenters.map((center, index) => (
                  <div 
                    key={center.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TreatmentCenterCard
                      center={center}
                      featured={center.featured}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination - Mobile optimized */}
              {totalPages > 1 && (
                <div className="mt-10 md:mt-12">
                  {/* Mobile Pagination - Simpler with larger touch targets */}
                  <div className="flex items-center justify-center gap-4 md:hidden">
                    <button
                      onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex h-12 items-center gap-2 rounded-xl bg-card px-5 text-base font-medium shadow-sm border border-border disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <ChevronLeft className="h-5 w-5" />
                      Prev
                    </button>
                    <span className="text-base font-medium text-foreground">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex h-12 items-center gap-2 rounded-xl bg-card px-5 text-base font-medium shadow-sm border border-border disabled:opacity-50 disabled:pointer-events-none"
                    >
                      Next
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Desktop Pagination */}
                  <div className="hidden md:block">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {[...Array(totalPages)].map((_, i) => {
                          const page = i + 1;
                          // Show first, last, current, and adjacent pages
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => handlePageChange(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                          // Show ellipsis
                          if (page === 2 || page === totalPages - 1) {
                            return (
                              <PaginationItem key={page}>
                                <span className="px-2 text-muted-foreground">...</span>
                              </PaginationItem>
                            );
                          }
                          return null;
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mx-auto max-w-md py-16 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Search className="h-10 w-10 text-primary" />
              </div>
              <h2 className="mb-3 font-display text-2xl font-semibold text-foreground">
                No Results Found
              </h2>
              <p className="mb-8 text-muted-foreground">
                We couldn't find treatment centers matching your criteria. 
                Try adjusting your search or call us for personalized help.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button variant="outline" onClick={clearAllFilters} className="gap-2">
                  Clear Filters
                </Button>
                <Link to="/request-help?source=rehab_empty">
                  <Button className="w-full gap-2 sm:w-auto">
                    <Heart className="h-4 w-4" />
                    Request Help
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="border-t border-border bg-card py-12 md:py-14">
        <div className="container">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center md:flex-row md:text-left">
            <div className="flex-1">
              <h2 className="mb-2 font-display text-lg font-semibold text-foreground md:text-xl">
                Need Help Finding the Right Center?
              </h2>
              <p className="text-sm text-muted-foreground">
                Our specialists provide free, confidential guidance on treatment options and insurance.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Link to="/request-help?source=rehab_cta">
                <Button className="w-full gap-2 sm:w-auto">
                  <Heart className="h-4 w-4" />
                  Request Help
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" className="w-full gap-2 sm:w-auto">
                  Request Callback
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default RehabCenters;
