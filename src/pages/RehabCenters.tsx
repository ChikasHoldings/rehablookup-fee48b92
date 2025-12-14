import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SearchForm } from "@/components/search/SearchForm";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { treatmentCenters } from "@/data/treatmentCenters";
import { useApprovedFacilities } from "@/hooks/useApprovedFacilities";
import { Phone, MapPin, Filter, Search, ArrowRight, Shield, Clock, CheckCircle, Grid3X3, List, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 9;

const RehabCenters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = searchParams.get("location") || "";
  const treatment = searchParams.get("treatment") || "";
  const insurance = searchParams.get("insurance") || "";
  const type = searchParams.get("type") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

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

    // Sort featured first
    results.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

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

    return results;
  }, [allCenters, location, treatment, insurance, type]);

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
    setSearchParams({});
  };

  return (
    <Layout>
      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 py-12 md:py-16">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="container relative">
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-primary-foreground/90 backdrop-blur-sm">
                <CheckCircle className="h-4 w-4" />
                Verified Treatment Centers
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl lg:text-5xl">
                Find Your Path to Recovery
              </h1>
              <p className="mt-3 text-lg text-primary-foreground/80">
                {hasFilters ? (
                  <>
                    Showing <span className="font-semibold text-primary-foreground">{filteredCenters.length}</span> results
                    {activeTypeFilter && ` for ${activeTypeFilter}`}
                    {location && ` near "${location}"`}
                  </>
                ) : (
                  "Browse verified treatment centers and start your recovery journey today"
                )}
              </p>
            </div>
            <a href="tel:1-800-555-0199" className="shrink-0">
              <Button 
                variant="secondary" 
                size="lg" 
                className="gap-2 bg-white text-primary shadow-xl hover:bg-white/90"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Call for Immediate Help</span>
                <span className="sm:hidden">Get Help Now</span>
              </Button>
            </a>
          </div>

          {/* Search Form */}
          <div className="rounded-2xl border border-white/10 bg-card p-5 shadow-2xl md:p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4 text-primary" />
              Refine Your Search
            </div>
            <SearchForm
              variant="compact"
              initialLocation={location}
              initialTreatmentType={treatment}
              initialInsurance={insurance}
            />
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground md:gap-10">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" />
              <span>All Centers Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              <span>24/7 Support Available</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-accent" />
              <span>Free Consultation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="bg-muted/30 py-12 md:py-16">
        <div className="container">
          {/* Results header with count, filters, and view toggle */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
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

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-96 animate-pulse rounded-2xl bg-card" />
              ))}
            </div>
          ) : paginatedCenters.length > 0 ? (
            <>
              <div className={
                viewMode === "grid" 
                  ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
                  : "flex flex-col gap-4"
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
                <div className="mt-12">
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
                <a href="tel:1-800-555-0199">
                  <Button className="w-full gap-2 sm:w-auto">
                    <Phone className="h-4 w-4" />
                    Call 1-800-555-0199
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Help Banner */}
      <section className="relative overflow-hidden bg-primary py-16 md:py-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        </div>
        <div className="container relative">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Need Help Finding the Right Center?
            </h2>
            <p className="mb-8 text-lg text-primary-foreground/80">
              Our specialists can help you navigate treatment options and insurance coverage. 
              Get free, confidential guidance today.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a href="tel:1-800-555-0199">
                <Button 
                  size="lg" 
                  className="w-full gap-2 bg-white text-primary shadow-xl hover:bg-white/90 sm:w-auto"
                >
                  <Phone className="h-4 w-4" />
                  Speak With a Specialist
                </Button>
              </a>
              <Link to="/contact">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full gap-2 border-white/30 bg-white/10 text-primary-foreground backdrop-blur-sm hover:bg-white/20 sm:w-auto"
                >
                  Request a Callback
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
