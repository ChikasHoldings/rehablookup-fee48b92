import { useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, ShieldCheck, Scale, Sparkles, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

interface NoResultsDirectoryCTAProps {
  /** Search location the user typed, e.g. "Boise, ID" or "90210" */
  location?: string;
  /** Selected treatment types (slugs or labels) */
  treatmentTypes?: string[];
  /** Selected insurance types */
  insuranceTypes?: string[];
  /** Source label for analytics, e.g. "search_results", "state_landing" */
  source?: string;
}

/**
 * Zero-result recovery card.
 *
 * Replaces the former NoResultsConciergeCTA, which pushed a visitor with
 * no matches into the retired RehabLookup placement funnel (directory
 * cutover stage 1). A directory answers a dead-end search by helping the
 * visitor widen it, so this card offers the two moves that actually
 * work: drop the filters, or browse by location.
 */
export function NoResultsDirectoryCTA({
  location,
  treatmentTypes = [],
  insuranceTypes = [],
  source = "search_results",
}: NoResultsDirectoryCTAProps) {
  // Re-run the search with the location kept but the narrowing filters
  // (level of care, insurance) dropped — the usual reason a search is dry.
  const broaderParams = new URLSearchParams();
  if (location) broaderParams.set("location", location);
  const broaderHref = broaderParams.toString()
    ? `/search-results?${broaderParams.toString()}`
    : "/search-results";

  // Fire view event once when this CTA is rendered.
  useEffect(() => {
    trackEvent("zero_results_cta_view", {
      event_category: "Conversion",
      event_label: source,
      search_location: location,
      treatment_type: treatmentTypes[0],
      insurance_type: insuranceTypes[0],
    });
  }, [location, treatmentTypes, insuranceTypes, source]);

  const handleClick = () => {
    trackEvent("zero_results_cta_click", {
      event_category: "Conversion",
      event_label: source,
      search_location: location,
      treatment_type: treatmentTypes[0],
      insurance_type: insuranceTypes[0],
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 md:p-8 shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-1.5">
            {location
              ? `No listings match those filters in ${location}`
              : "No listings match those filters"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Try removing the level-of-care or insurance filters, or widen the
            area — the directory covers licensed programs in all 50 states, and
            many people travel to a neighbouring city for the right program.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 text-xs">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span className="text-foreground font-medium">Licensed providers</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
          <Scale className="h-4 w-4 text-primary shrink-0" />
          <span className="text-foreground font-medium">Compare side by side</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span className="text-foreground font-medium">All 50 states</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          asChild
          variant="success"
          size="lg"
          className="flex-1 gap-2"
          onClick={handleClick}
        >
          <Link to={broaderHref}>
            <Search className="h-4 w-4" />
            {location ? "Search without filters" : "Browse all centers"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="flex-1 gap-2">
          <Link to="/locations">
            <MapPin className="h-4 w-4" />
            Browse by location
          </Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-3">
        Browsing the directory is free and requires no account.
      </p>
    </div>
  );
}
