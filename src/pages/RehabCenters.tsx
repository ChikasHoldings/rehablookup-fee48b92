import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SearchForm } from "@/components/search/SearchForm";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { treatmentCenters } from "@/data/treatmentCenters";
import { Phone, MapPin, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

const RehabCenters = () => {
  const [searchParams] = useSearchParams();
  const location = searchParams.get("location") || "";
  const treatment = searchParams.get("treatment") || "";
  const insurance = searchParams.get("insurance") || "";

  const filteredCenters = useMemo(() => {
    let results = [...treatmentCenters];

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

    // Filter by treatment type
    if (treatment) {
      results = results.filter((c) =>
        c.treatmentTypes.some((t) => t.toLowerCase() === treatment.toLowerCase())
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
  }, [location, treatment, insurance]);

  const hasFilters = location || treatment || insurance;

  return (
    <Layout>
      {/* Header */}
      <section className="border-b border-border bg-secondary/30 py-8 md:py-12">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Find Treatment Centers
              </h1>
              <p className="mt-2 flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {hasFilters ? (
                  <span>
                    Showing {filteredCenters.length} results
                    {location && ` near "${location}"`}
                  </span>
                ) : (
                  <span>Browse all verified treatment centers</span>
                )}
              </p>
            </div>
            <a href="tel:1-800-555-0199">
              <Button variant="success" className="gap-2">
                <Phone className="h-4 w-4" />
                Call for Immediate Help
              </Button>
            </a>
          </div>

          {/* Search Form */}
          <div className="rounded-xl bg-card p-4 shadow-sm md:p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
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

      {/* Results */}
      <section className="py-12 md:py-16">
        <div className="container">
          {filteredCenters.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCenters.map((center) => (
                <TreatmentCenterCard
                  key={center.id}
                  center={center}
                  featured={center.featured}
                />
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-md py-16 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
                <MapPin className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="mb-2 font-display text-2xl font-semibold text-foreground">
                No Results Found
              </h2>
              <p className="mb-6 text-muted-foreground">
                We couldn't find treatment centers matching your criteria. 
                Try adjusting your search or call us for personalized help.
              </p>
              <a href="tel:1-800-555-0199">
                <Button variant="success" size="lg" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Call 1-800-555-0199
                </Button>
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Help Banner */}
      <section className="border-t border-border bg-secondary/50 py-12">
        <div className="container text-center">
          <h2 className="mb-3 font-display text-2xl font-semibold text-foreground">
            Need Help Finding the Right Center?
          </h2>
          <p className="mb-6 text-muted-foreground">
            Our specialists can help you navigate treatment options and insurance coverage.
          </p>
          <a href="tel:1-800-555-0199">
            <Button variant="default" size="lg" className="gap-2">
              <Phone className="h-4 w-4" />
              Speak With a Specialist
            </Button>
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default RehabCenters;
