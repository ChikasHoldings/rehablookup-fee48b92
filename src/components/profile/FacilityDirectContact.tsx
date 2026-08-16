import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Globe,
  MapPin,
  Search,
  Scale,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { gaFacilityContact } from "@/lib/ga";
import { formatPhoneNumber, getPhoneDigits } from "@/lib/phoneUtils";
import {
  buildDirectionsUrl,
  buildWebsiteUrl,
  type FacilityDirectContactInfo,
} from "@/hooks/useFacilityContactRouting";

interface FacilityDirectContactProps {
  contact: FacilityDirectContactInfo | null;
  /** Where this panel was rendered — recorded as a non-PII analytics dimension. */
  surface: "profile_modal" | "search_card_modal";
  onClose: () => void;
}

/**
 * Directory cutover stage 2 — the contact experience for any facility that
 * is NOT a confirmed active Pro listing (Free, unclaimed, Featured-only,
 * lapsed, or an entitlement we could not confirm).
 *
 * RehabLookup collects nothing here. There is no name/email/phone intake,
 * no email verification, no clinical questions, no concierge case, and no
 * promise that anyone from RehabLookup will follow up. The visitor contacts
 * the facility they selected, directly, using that facility's own published
 * contact details — or keeps searching the directory.
 *
 * Every action below is rendered only when the underlying data actually
 * exists. We never manufacture a phone number, a website, or an address,
 * and we never substitute a RehabLookup number as a treatment-navigation
 * path.
 */
export function FacilityDirectContact({
  contact,
  surface,
  onClose,
}: FacilityDirectContactProps) {
  const navigate = useNavigate();

  const facilityId = contact?.id ?? null;
  const facilityName = contact?.name?.trim() || "this facility";

  const phoneDigits = contact?.phone ? getPhoneDigits(contact.phone) : "";
  const telLink = phoneDigits.length >= 10 ? `tel:+1${phoneDigits}` : null;
  const displayPhone = telLink ? formatPhoneNumber(contact!.phone!) : null;

  const websiteUrl = buildWebsiteUrl(contact?.website);
  const directionsUrl = buildDirectionsUrl(contact);

  const hasAnyDirectContact = !!(telLink || websiteUrl || directionsUrl);

  // Non-PII engagement analytics. These describe what the visitor did —
  // they are not lead records, and no contact record is created for them.
  const track = (
    action: "call" | "website" | "directions" | "continue_search" | "compare",
  ) => {
    trackEvent("facility_direct_contact_click", {
      event_category: "DirectContact",
      event_label: facilityId ?? facilityName,
      action,
      surface,
    });
    if (
      facilityId &&
      (action === "call" || action === "website" || action === "directions")
    ) {
      gaFacilityContact({
        facility_id: facilityId,
        method: action,
        facility_slug: contact?.slug ?? null,
        facility_state: contact?.state ?? null,
      });
    }
  };

  const continueSearching = () => {
    track("continue_search");
    const location = [contact?.city, contact?.state].filter(Boolean).join(", ");
    navigate(
      location
        ? `/search-results?location=${encodeURIComponent(location)}`
        : "/search-results",
    );
    onClose();
  };

  const compareFacilities = () => {
    track("compare");
    navigate("/compare");
    onClose();
  };

  return (
    <div className="px-5 sm:px-6 pt-4 pb-5 space-y-4">
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">
          Contact {facilityName} directly
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {hasAnyDirectContact
            ? "Admissions questions, availability, insurance and cost are all handled by the facility itself. Reach them using the details below."
            : "Direct contact information is not available for this facility yet."}
        </p>
      </div>

      {hasAnyDirectContact ? (
        <div className="space-y-2.5">
          {telLink && displayPhone && (
            <a
              href={telLink}
              onClick={() => track("call")}
              className="group flex items-center justify-between gap-3 w-full p-3.5 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 active:scale-[0.99] transition-all"
              aria-label={`Call ${facilityName} at ${displayPhone}`}
              data-testid="direct-contact-call"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-left min-w-0">
                  <span className="block text-[11px] uppercase tracking-wide opacity-90 font-medium">
                    Call facility
                  </span>
                  <span className="block text-base font-bold leading-tight tabular-nums">
                    {displayPhone}
                  </span>
                </span>
              </span>
              <ArrowRight className="h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true" />
            </a>
          )}

          {websiteUrl && (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full justify-start gap-2 h-11"
              data-testid="direct-contact-website"
            >
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                onClick={() => track("website")}
                aria-label={`Visit the website for ${facilityName}`}
              >
                <Globe className="h-4 w-4" aria-hidden="true" />
                Visit facility website
                <ExternalLink className="h-3 w-3 ml-auto opacity-60" aria-hidden="true" />
              </a>
            </Button>
          )}

          {directionsUrl && (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full justify-start gap-2 h-11"
              data-testid="direct-contact-directions"
            >
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("directions")}
                aria-label={`Get directions to ${facilityName}`}
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Get directions
                <ExternalLink className="h-3 w-3 ml-auto opacity-60" aria-hidden="true" />
              </a>
            </Button>
          )}
        </div>
      ) : null}

      <div className="pt-1 space-y-2.5 border-t border-border/60">
        <p className="text-xs text-muted-foreground pt-3">
          Comparing a few options before you call is normal — most people do.
        </p>
        <Button
          variant={hasAnyDirectContact ? "outline" : "default"}
          size="lg"
          className="w-full justify-start gap-2 h-11"
          onClick={continueSearching}
          data-testid="direct-contact-continue-search"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Continue searching
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full justify-start gap-2 h-11"
          onClick={compareFacilities}
          data-testid="direct-contact-compare"
        >
          <Scale className="h-4 w-4" aria-hidden="true" />
          Compare facilities
        </Button>
      </div>
    </div>
  );
}
