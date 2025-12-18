import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { SearchForm } from "@/components/search/SearchForm";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { treatmentCenters } from "@/data/treatmentCenters";
import { useApprovedFacilities } from "@/hooks/useApprovedFacilities";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { Heart, MapPin, Search, ArrowRight, CheckCircle, Grid3X3, List, X, ArrowUpDown, ChevronLeft, ChevronRight, Sparkles, Phone } from "lucide-react";
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
        results.sort((a, b) => {
          const aHasFeaturedSub = (a as any).hasFeaturedSubscription ? 1 : 0;
          const bHasFeaturedSub = (b as any).hasFeaturedSubscription ? 1 : 0;
          if (bHasFeaturedSub !== aHasFeaturedSub) return bHasFeaturedSub - aHasFeaturedSub;
          if (b.featured !== a.featured) return b.featured ? 1 : -1;
          return b.rating - a.rating;
        });
        break;
      case "rating-high":
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
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 py-10 md:py-12">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="container relative">
          <div className="mb-8 max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white/90 backdrop-blur-sm">
              <CheckCircle className="h-3.5 w-3.5" />
              Verified Treatment Centers
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">
              Find Your Path to Recovery
            </h1>
            <p className="mt-3 text-base text-white/80 md:text-lg">
              {hasFilters ? (
                <>
                  <span className="font-semibold text-white">{filteredCenters.length}</span> results
                  {activeTypeFilter && ` for ${activeTypeFilter}`}
                  {location && ` near "${location}"`}
                </>
              ) : (
                "Search verified treatment centers and find the right care for you or your loved one"
              )}
            </p>
          </div>

          {/* Search Form Container */}
          <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-2xl shadow-primary/20 md:p-5">
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
      <section id="results" className="scroll-mt-4 bg-gradient-to-b from-secondary/50 to-background py-8 md:py-12">
        <div className="container px-4 md:px-6">
          {/* Mobile Results Header */}
          <div className="mb-6 md:hidden">
            {/* Results Count */}
            <p className="text-base font-medium text-foreground mb-4">
              <span className="text-primary font-semibold">{filteredCenters.length}</span> treatment centers found
            </p>

            {/* Mobile Active Filters - Horizontal scroll */}
            {hasFilters && (
              <div className="mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-2 pb-2">
                  {location && (
                    <button
                      onClick={() => clearFilter("location")}
                      className="group inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-all active:bg-primary/20 active:scale-95 shrink-0 border border-primary/20"
                    >
                      <MapPin className="h-4 w-4" />
                      {location}
                      <X className="h-4 w-4 opacity-60 group-hover:opacity-100" />
                    </button>
                  )}
                  {treatment && (
                    <button
                      onClick={() => clearFilter("treatment")}
                      className="group inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-all active:bg-primary/20 active:scale-95 shrink-0 border border-primary/20"
                    >
                      {treatment}
                      <X className="h-4 w-4 opacity-60 group-hover:opacity-100" />
                    </button>
                  )}
                  {insurance && (
                    <button
                      onClick={() => clearFilter("insurance")}
                      className="group inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-all active:bg-primary/20 active:scale-95 shrink-0 border border-primary/20"
                    >
                      {insurance}
                      <X className="h-4 w-4 opacity-60 group-hover:opacity-100" />
                    </button>
                  )}
                  {activeTypeFilter && (
                    <button
                      onClick={() => clearFilter("type")}
                      className="group inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-all active:bg-primary/20 active:scale-95 shrink-0 border border-primary/20"
                    >
                      {activeTypeFilter}
                      <X className="h-4 w-4 opacity-60 group-hover:opacity-100" />
                    </button>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className="text-sm font-medium text-muted-foreground hover:text-primary shrink-0 px-2"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Sort & View Controls */}
            <div className="flex items-center gap-3">
              <Select value={sortParam} onValueChange={(v) => handleSortChange(v as SortOption)}>
                <SelectTrigger className="h-12 flex-1 gap-2 bg-card rounded-xl text-base border-border shadow-sm">
                  <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-base py-3">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Mobile View Toggle */}
              <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1.5 shadow-sm">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-lg p-3 transition-all ${
                    viewMode === "grid" 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground active:text-foreground active:bg-secondary"
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-lg p-3 transition-all ${
                    viewMode === "list" 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground active:text-foreground active:bg-secondary"
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
                      className="group inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/20 hover:shadow-sm border border-primary/20"
                    >
                      <MapPin className="h-3 w-3" />
                      {location}
                      <X className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                  {treatment && (
                    <button
                      onClick={() => clearFilter("treatment")}
                      className="group inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/20 hover:shadow-sm border border-primary/20"
                    >
                      {treatment}
                      <X className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                  {insurance && (
                    <button
                      onClick={() => clearFilter("insurance")}
                      className="group inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/20 hover:shadow-sm border border-primary/20"
                    >
                      {insurance}
                      <X className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                  {activeTypeFilter && (
                    <button
                      onClick={() => clearFilter("type")}
                      className="group inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/20 hover:shadow-sm border border-primary/20"
                    >
                      {activeTypeFilter}
                      <X className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Sort and View Controls */}
            <div className="flex items-center gap-3">
              <Select value={sortParam} onValueChange={(v) => handleSortChange(v as SortOption)}>
                <SelectTrigger className="h-10 w-[180px] gap-2 bg-card border-border shadow-sm hover:shadow-md transition-shadow">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-2 transition-all ${
                    viewMode === "grid" 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-md p-2 transition-all ${
                    viewMode === "list" 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <SearchResultsLoading count={9} />
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 md:mt-14">
                  {/* Mobile Pagination */}
                  <div className="flex items-center justify-center gap-4 md:hidden">
                    <button
                      onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex h-12 items-center gap-2 rounded-xl bg-card px-5 text-base font-medium shadow-sm border border-border disabled:opacity-50 disabled:pointer-events-none hover:shadow-md transition-shadow active:scale-95"
                    >
                      <ChevronLeft className="h-5 w-5" />
                      Prev
                    </button>
                    <span className="text-base font-semibold text-foreground px-3 py-2 bg-secondary rounded-lg">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex h-12 items-center gap-2 rounded-xl bg-card px-5 text-base font-medium shadow-sm border border-border disabled:opacity-50 disabled:pointer-events-none hover:shadow-md transition-shadow active:scale-95"
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
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-secondary"}
                          />
                        </PaginationItem>
                        
                        {[...Array(totalPages)].map((_, i) => {
                          const page = i + 1;
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
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-secondary"}
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
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10">
                <Search className="h-12 w-12 text-primary" />
              </div>
              <h2 className="mb-3 font-display text-2xl font-semibold text-foreground">
                No Results Found
              </h2>
              <p className="mb-8 text-muted-foreground leading-relaxed">
                We couldn't find treatment centers matching your criteria. 
                Try adjusting your search or request personalized help from our team.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button variant="outline" onClick={clearAllFilters} className="gap-2 h-11">
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
                <Link to="/request-help?source=rehab_empty">
                  <Button className="w-full gap-2 sm:w-auto h-11">
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
      <section className="relative overflow-hidden border-t border-border bg-gradient-to-br from-card via-card to-secondary/30 py-14 md:py-16">
        {/* Decorative accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="container">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 text-center md:flex-row md:text-left">
            {/* Icon */}
            <div className="hidden md:flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            
            <div className="flex-1">
              <h2 className="mb-2 font-display text-xl font-bold text-foreground md:text-2xl">
                Need Help Finding the Right Center?
              </h2>
              <p className="text-muted-foreground">
                Our specialists provide free, confidential guidance on treatment options and insurance coverage. We're here to help you navigate the path to recovery.
              </p>
            </div>
            
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link to="/request-help?source=rehab_cta">
                <Button size="lg" className="w-full gap-2 sm:w-auto shadow-lg hover:shadow-xl transition-shadow">
                  <Heart className="h-4 w-4" />
                  Request Help
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto hover:bg-secondary transition-colors">
                  <Phone className="h-4 w-4" />
                  Contact Us
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
