import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, ShieldCheck, Clock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

interface NoResultsConciergeCTAProps {
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
 * Zero-result conversion card.
 *
 * When a search returns 0 verified facilities we still have a valuable
 * visitor — surface the Concierge placement service so they can convert
 * instead of bouncing. Pre-fills `/concierge` with the user's search
 * context via query params.
 */
export function NoResultsConciergeCTA({
  location,
  treatmentTypes = [],
  insuranceTypes = [],
  source = "search_results",
}: NoResultsConciergeCTAProps) {
  // Build a prefilled concierge URL so step 1 already knows what we know.
  const params = new URLSearchParams();
  params.set("from", source);
  if (location) params.set("location", location);
  if (treatmentTypes[0]) params.set("treatment", treatmentTypes[0]);
  if (insuranceTypes[0]) params.set("insurance", insuranceTypes[0]);
  const conciergeHref = `/concierge?${params.toString()}`;

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
              ? `No verified centers in ${location} yet — let our team find one for you`
              : "Let our placement team find the right center for you"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Our admissions specialists work with vetted facilities nationwide.
            Tell us what you need and we&apos;ll match you with options that
            fit — typically within an hour.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 text-xs">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span className="text-foreground font-medium">100% confidential</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <span className="text-foreground font-medium">Match in ~60 minutes</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
          <Heart className="h-4 w-4 text-primary shrink-0" />
          <span className="text-foreground font-medium">Vetted facilities only</span>
        </div>
      </div>

      <Button
        asChild
        variant="success"
        size="lg"
        className="w-full gap-2"
        onClick={handleClick}
      >
        <Link to={conciergeHref}>
          <Heart className="h-4 w-4" />
          Match Me With a Verified Center
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-3">
        No obligation. We never share your information without permission.
      </p>
    </div>
  );
}
