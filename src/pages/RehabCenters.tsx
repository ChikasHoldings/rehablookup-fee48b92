import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { SearchForm } from "@/components/search/SearchForm";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { treatmentCenters } from "@/data/treatmentCenters";
import { useApprovedFacilities } from "@/hooks/useApprovedFacilities";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { Heart, MapPin, Search, CheckCircle, Grid3X3, List, X, ArrowUpDown, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import MedicalPatternBackground from "@/components/backgrounds/MedicalPatternBackground";
import supportSpecialistImg from "@/assets/support-specialist.png";
import { Button } from "@/components/ui/button";
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
      
      {/* Hero Header - Clean Directory Style */}
      <section className="relative border-b border-border bg-gradient-to-b from-secondary/70 via-secondary/50 to-background py-8 md:py-10">
        <MedicalPatternBackground />
        <div className="container relative z-10">
          <div className="mb-6 max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-primary border border-primary/20">
              <CheckCircle className="h-3.5 w-3.5" />
              Verified Treatment Centers
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Find Treatment Centers
            </h1>
            <p className="mt-2 text-muted-foreground text-sm md:text-base">
              {hasFilters ? (
                <>
                  <span className="font-semibold text-foreground">{filteredCenters.length}</span> results
                  {activeTypeFilter && ` for ${activeTypeFilter}`}
                  {location && ` near "${location}"`}
                </>
              ) : (
                "Search verified treatment centers and find the right care for you"
              )}
            </p>
          </div>

          {/* Search Form Container */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
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
      <section id="results" className="scroll-mt-4 bg-background py-6 md:py-8">
        <div className="container px-4 md:px-6">
          {/* Clean Results Toolbar */}
          <div className="flex flex-col gap-4 mb-6 md:mb-8">
            {/* Top row: Count + Controls */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredCenters.length}</span> centers
              </p>
              
              <div className="flex items-center gap-2">
                {/* Sort Dropdown */}
                <Select value={sortParam} onValueChange={(v) => handleSortChange(v as SortOption)}>
                  <SelectTrigger className="h-9 w-[140px] md:w-[160px] gap-2 text-sm border-border">
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
                <div className="hidden md:flex items-center gap-0.5 rounded-md border border-border p-0.5">
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

            {/* Active Filters Row */}
            {hasFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                {location && (
                  <button
                    onClick={() => clearFilter("location")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    {location}
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
                {treatment && (
                  <button
                    onClick={() => clearFilter("treatment")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    {treatment}
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
                {insurance && (
                  <button
                    onClick={() => clearFilter("insurance")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    {insurance}
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
                {activeTypeFilter && (
                  <button
                    onClick={() => clearFilter("type")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    {activeTypeFilter}
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <SearchResultsLoading count={9} />
          ) : paginatedCenters.length > 0 ? (
            <>
              <div className={
                viewMode === "grid" 
                  ? "grid gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-3" 
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
                <div className="mt-8 md:mt-10 flex items-center justify-center gap-2">
                  <button
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium disabled:opacity-50 disabled:pointer-events-none hover:bg-secondary transition-colors"
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
                            className={`h-9 min-w-9 rounded-md text-sm font-medium transition-colors ${
                              currentPage === page
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-secondary"
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
                    className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium disabled:opacity-50 disabled:pointer-events-none hover:bg-secondary transition-colors"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="mx-auto max-w-md py-16 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
                No Results Found
              </h2>
              <p className="mb-6 text-muted-foreground text-sm">
                We couldn't find treatment centers matching your criteria. 
                Try adjusting your search or request personalized help.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
                <Link to="/request-help?source=rehab_empty">
                  <Button size="sm" className="w-full gap-2 sm:w-auto">
                    <Heart className="h-4 w-4" />
                    Request Help
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner - Light Professional Style */}
      <section className="border-t border-border bg-secondary/30 py-10 md:py-12">
        <div className="container">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 md:gap-6 md:flex-row rounded-xl border border-border bg-card p-5 md:p-6 shadow-sm">
            {/* Image */}
            <div className="relative shrink-0">
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 p-0.5 ring-1 ring-primary/10">
                <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-b from-background to-secondary/50">
                  <img 
                    src={supportSpecialistImg} 
                    alt="Support specialist ready to help" 
                    className="w-full h-full object-cover object-top scale-110"
                  />
                </div>
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 flex items-center gap-1 rounded-full bg-card px-2 py-0.5 shadow-sm border border-border">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-medium text-foreground">Online</span>
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="mb-1 font-display text-base font-bold text-foreground md:text-lg">
                Need Help Finding the Right Center?
              </h2>
              <p className="text-muted-foreground text-sm max-w-md">
                Our specialists provide free, confidential guidance on treatment options.
              </p>
            </div>
            
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Link to="/request-help?source=rehab_cta">
                <Button size="sm" className="w-full gap-2 sm:w-auto">
                  <Heart className="h-4 w-4" />
                  Get Help Now
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="sm" variant="outline" className="w-full gap-2 sm:w-auto">
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
