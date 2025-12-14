import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SearchForm } from "@/components/search/SearchForm";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { treatmentCenters } from "@/data/treatmentCenters";
import { useApprovedFacilities } from "@/hooks/useApprovedFacilities";
import { Phone, MapPin, Filter, Search, ArrowRight, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const RehabCenters = () => {
  const [searchParams] = useSearchParams();
  const location = searchParams.get("location") || "";
  const treatment = searchParams.get("treatment") || "";
  const insurance = searchParams.get("insurance") || "";
  const type = searchParams.get("type") || "";

  const { data: approvedFacilities = [] } = useApprovedFacilities();

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

  return (
    <Layout>
      {/* Header */}
      <section className="bg-primary py-10 md:py-14">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">
                Find Treatment Centers
              </h1>
              <p className="mt-2 flex items-center gap-2 text-primary-foreground/80">
                <MapPin className="h-4 w-4" />
                {hasFilters ? (
                  <span>
                    Showing {filteredCenters.length} results
                    {activeTypeFilter && ` for ${activeTypeFilter}`}
                    {location && ` near "${location}"`}
                  </span>
                ) : (
                  <span>Browse all verified treatment centers</span>
                )}
              </p>
            </div>
            <a href="tel:1-800-555-0199">
              <Button variant="hero-light" className="gap-2 shadow-lg">
                <Phone className="h-4 w-4" />
                Call for Immediate Help
              </Button>
            </a>
          </div>

          {/* Search Form */}
          <div className="rounded-2xl bg-card p-5 shadow-lg md:p-6">
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
              <Shield className="h-4 w-4 text-primary" />
              <span>All Centers Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>24/7 Support Available</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span>Free Consultation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-12 md:py-16">
        <div className="container">
          {filteredCenters.length > 0 ? (
            <>
              {/* Results count and active filters */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{filteredCenters.length}</span> treatment centers found
                </p>
                {activeTypeFilter && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Filtered by:</span>
                    <Link 
                      to="/rehab-centers" 
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      {activeTypeFilter}
                      <span className="text-primary/60">×</span>
                    </Link>
                  </div>
                )}
              </div>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCenters.map((center, index) => (
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
                <Link to="/rehab-centers">
                  <Button variant="outline" className="w-full gap-2 sm:w-auto">
                    Clear Filters
                  </Button>
                </Link>
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
      <section className="bg-secondary/30 py-14 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">
              Need Help Finding the Right Center?
            </h2>
            <p className="mb-8 text-muted-foreground">
              Our specialists can help you navigate treatment options and insurance coverage. 
              Get free, confidential guidance today.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a href="tel:1-800-555-0199">
                <Button size="lg" className="w-full gap-2 sm:w-auto shadow-lg">
                  <Phone className="h-4 w-4" />
                  Speak With a Specialist
                </Button>
              </a>
              <Link to="/contact">
                <Button variant="outline" size="lg" className="w-full gap-2 sm:w-auto">
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
