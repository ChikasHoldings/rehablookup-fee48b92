import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trackEvent } from "@/lib/analytics";
import { gaFacilityContact } from "@/lib/ga";
import {
  Building2,
  MapPin,
  CheckCircle,
  Phone,
  Globe,
  ExternalLink,
  Search,
  Scale,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhoneNumber, getPhoneDigits } from "@/lib/phoneUtils";
import { FacilityInquiryForm } from "@/components/profile/FacilityInquiryForm";
import {
  useFacilityContactCapabilities,
  buildDirectionsUrl,
  buildWebsiteUrl,
} from "@/hooks/useFacilityContactCapabilities";

/**
 * Contact <Facility> — the public selected-facility inquiry experience.
 *
 * The filename is retained to avoid pointless route/import churn; the product
 * concept is "Contact this facility", not a placement intake, a lead form, or
 * a matching questionnaire.
 *
 * ONE MODEL FOR EVERY TIER
 *   Free, claimed, unclaimed and Featured-only listings all get the same
 *   inquiry form, submitting to the same backend, stored the same way. The
 *   only thing an active Pro subscription changes here is the contact strip:
 *   Pro publishes the facility's phone number and a one-tap Call action.
 *
 * WHAT THE SEEKER MUST NEVER SEE
 *   • a Free facility's phone number, in any form — no digits, no tel:, no
 *     masked hint that reconstructs it, no RehabLookup support number
 *     substituted in its place
 *   • an upsell. There is no "upgrade to Pro to see the phone" message. The
 *     patient experience is not an advertisement for our own pricing page.
 *   • any claim that payment implies quality, trust, or recommendation.
 */

interface RequestInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Facility details already loaded by the parent surface, used ONLY for the
   * header identity strip while the canonical record loads.
   *
   * Note there is deliberately no `phone` in this shape. A parent-supplied
   * phone was previously used as a fallback contact source, which is exactly
   * how a Free number could reach the UI from a stale or pre-migration
   * payload. Phone comes from the entitlement-resolved capability hook or it
   * does not come at all.
   */
  facility: {
    id?: string | null;
    name?: string | null;
    city?: string | null;
    state?: string | null;
    slug?: string | null;
    logo_url?: string | null;
    featured?: boolean;
    verified?: boolean | null;
  } | null;
  prefillData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

const track = (event: string, facilityId: string | null, metadata?: Record<string, unknown>) => {
  try {
    trackEvent(event, {
      event_category: "FacilityInquiry",
      event_label: facilityId ?? "unknown",
      ...metadata,
    });
  } catch {
    /* analytics is best-effort and never blocks contact */
  }
};

/**
 * Post-submit confirmation.
 *
 * The wording tracks what actually happened. `stored_pending_claim` means the
 * listing is approved but unclaimed: the inquiry is stored and pinned to that
 * facility, but no verified recipient exists, so claiming it was "sent to
 * them" would be a lie. No response-time promise is made in either case — the
 * facility replies on its own terms, or it does not, and RehabLookup does not
 * follow up, match, or escalate.
 */
function InquirySuccessView({
  firstName,
  facilityName,
  email,
  deliveryState,
  websiteUrl,
  directionsUrl,
  onClose,
  onKeepSearching,
  onCompare,
}: {
  firstName: string;
  facilityName: string;
  email: string;
  deliveryState: "delivered_to_provider" | "stored_pending_claim" | null;
  websiteUrl: string | null;
  directionsUrl: string | null;
  onClose: () => void;
  onKeepSearching: () => void;
  onCompare: () => void;
}) {
  const pendingClaim = deliveryState === "stored_pending_claim";

  return (
    <div className="px-5 sm:px-6 pt-4 pb-6 space-y-5" data-testid="inquiry-success">
      <div className="text-center space-y-3">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {pendingClaim ? "Inquiry recorded" : "Inquiry sent"}
            {firstName ? `, ${firstName}` : ""}
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {pendingClaim ? (
              <>
                Your inquiry was recorded for{" "}
                <span className="font-semibold text-foreground">{facilityName}</span>. This listing
                isn't managed by the facility on RehabLookup yet, so we can't confirm anyone there
                has seen it. To reach them now, use their own website or address.
              </>
            ) : (
              <>
                Your inquiry was sent to{" "}
                <span className="font-semibold text-foreground">{facilityName}</span>. They can
                respond using the contact information you provided.
              </>
            )}
          </p>
          {email && (
            <p className="text-xs text-muted-foreground mt-2">
              A copy is on its way to <span className="font-medium break-all">{email}</span>.
            </p>
          )}
        </div>
      </div>

      {(websiteUrl || directionsUrl) && (
        <div className="space-y-2.5">
          {websiteUrl && (
            <Button asChild variant="outline" size="lg" className="w-full justify-start gap-2 h-11">
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer nofollow">
                <Globe className="h-4 w-4" aria-hidden="true" />
                Visit facility website
                <ExternalLink className="h-3 w-3 ml-auto opacity-60" aria-hidden="true" />
              </a>
            </Button>
          )}
          {directionsUrl && (
            <Button asChild variant="outline" size="lg" className="w-full justify-start gap-2 h-11">
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Get directions
                <ExternalLink className="h-3 w-3 ml-auto opacity-60" aria-hidden="true" />
              </a>
            </Button>
          )}
        </div>
      )}

      <div className="pt-1 space-y-2.5 border-t border-border/60">
        <p className="text-xs text-muted-foreground pt-3">
          You can contact as many centers as you like — comparing options is normal.
        </p>
        <Button
          variant="outline"
          size="lg"
          className="w-full justify-start gap-2 h-11"
          onClick={onKeepSearching}
          data-testid="inquiry-continue-search"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Continue searching
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full justify-start gap-2 h-11"
          onClick={onCompare}
          data-testid="inquiry-compare"
        >
          <Scale className="h-4 w-4" aria-hidden="true" />
          Compare facilities
        </Button>
        <Button variant="ghost" onClick={onClose} className="w-full h-11">
          Done
        </Button>
      </div>
    </div>
  );
}

/**
 * Shown when the selected facility record could not be loaded at all, and as
 * the defensive landing state when a transitional backend rejects the inquiry.
 * Collects nothing and promises nothing.
 */
function FacilityUnavailableState({
  reason,
  websiteUrl,
  directionsUrl,
  onContinueSearching,
  onCompare,
}: {
  reason: "missing" | "not_accepted";
  websiteUrl: string | null;
  directionsUrl: string | null;
  onContinueSearching: () => void;
  onCompare: () => void;
}) {
  return (
    <div className="px-5 sm:px-6 pt-4 pb-5 space-y-4" data-testid="facility-unavailable">
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">
          {reason === "missing"
            ? "We couldn't load this facility's details"
            : "This inquiry couldn't be sent"}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {reason === "missing"
            ? "You can keep browsing the directory and reach out to another center."
            : "Nothing was sent and nothing was saved. You can contact the facility directly, or keep browsing the directory."}
        </p>
      </div>
      <div className="space-y-2.5">
        {websiteUrl && (
          <Button asChild variant="outline" size="lg" className="w-full justify-start gap-2 h-11">
            <a href={websiteUrl} target="_blank" rel="noopener noreferrer nofollow">
              <Globe className="h-4 w-4" aria-hidden="true" />
              Visit facility website
              <ExternalLink className="h-3 w-3 ml-auto opacity-60" aria-hidden="true" />
            </a>
          </Button>
        )}
        {directionsUrl && (
          <Button asChild variant="outline" size="lg" className="w-full justify-start gap-2 h-11">
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Get directions
              <ExternalLink className="h-3 w-3 ml-auto opacity-60" aria-hidden="true" />
            </a>
          </Button>
        )}
        <Button
          size="lg"
          className="w-full justify-start gap-2 h-11"
          onClick={onContinueSearching}
          data-testid="inquiry-continue-search"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Continue searching
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full justify-start gap-2 h-11"
          onClick={onCompare}
          data-testid="inquiry-compare"
        >
          <Scale className="h-4 w-4" aria-hidden="true" />
          Compare facilities
        </Button>
      </div>
    </div>
  );
}

export function RequestInfoModal({ open, onOpenChange, facility }: RequestInfoModalProps) {
  const navigate = useNavigate();
  /**
   * Set when the server answers a submission with
   * `action: "DIRECT_CONTACT_REQUIRED"`.
   *
   * DEFENCE IN DEPTH FOR THE ROLLOUT WINDOW ONLY. submit-qualified-lead 3.1.0
   * never emits this. But the frontend and the function deploy separately, so
   * a new client can briefly talk to the OLD function, which still short-
   * circuits every non-Pro facility. If that happens the inquiry was NOT
   * accepted, so we must not render success, must not navigate into
   * Concierge, and must not reveal a Free facility's phone as a consolation
   * — the seeker gets website / directions / keep-searching and nothing else.
   * This is NOT the final expected non-Pro behaviour; see the rollout order in
   * docs/directory-cutover-stage-02-inquiry-model-amendment.md.
   */
  const [serverRejected, setServerRejected] = useState(false);

  const safeFacilityId = facility?.id ?? null;

  const { data: caps, isLoading } = useFacilityContactCapabilities(open ? safeFacilityId : null);

  const resolvedName = caps?.name?.trim() || facility?.name?.trim() || "";
  const facilityName = resolvedName || "the treatment center you selected";
  const city = caps?.city?.trim() || facility?.city?.trim() || "";
  const state = caps?.state?.trim() || facility?.state?.trim() || "";
  const logoUrl = facility?.logo_url ?? null;

  // PHONE VISIBILITY — canonical Pro only, and only via the capability hook.
  // `caps.phone` is already null unless `showPhone`; the second condition is a
  // belt-and-braces read so a future refactor of the hook cannot silently
  // un-gate the UI.
  const showPhone = caps?.showPhone === true;
  const phoneDigits = showPhone && caps?.phone ? getPhoneDigits(caps.phone) : "";
  const telLink = phoneDigits.length >= 10 ? `tel:+1${phoneDigits}` : null;
  const displayPhone = telLink && caps?.phone ? formatPhoneNumber(caps.phone) : null;

  const websiteUrl = buildWebsiteUrl(caps?.website);
  const directionsUrl = buildDirectionsUrl(caps ?? null);

  const facilityMissing = !safeFacilityId || (!isLoading && caps?.facilityMissing === true);
  const canSubmitInquiry = !serverRejected && caps?.canSubmitInquiry === true;

  useEffect(() => {
    if (!open) setServerRejected(false);
  }, [open]);

  useEffect(() => {
    if (open && safeFacilityId && !isLoading) {
      track("contact_modal_opened", safeFacilityId, {
        facilityName,
        phoneVisibility: showPhone ? "pro" : "hidden",
        canSubmitInquiry,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, safeFacilityId, isLoading]);

  const handleKeepSearching = useCallback(() => {
    const location = [city, state].filter(Boolean).join(", ");
    navigate(
      location ? `/search-results?location=${encodeURIComponent(location)}` : "/search-results",
    );
    onOpenChange(false);
  }, [city, state, navigate, onOpenChange]);

  const handleCompare = useCallback(() => {
    navigate("/compare");
    onOpenChange(false);
  }, [navigate, onOpenChange]);

  const handleCallClick = () => {
    if (!safeFacilityId) return;
    track("facility_phone_clicked", safeFacilityId, { surface: "contact_modal" });
    gaFacilityContact({
      facility_id: safeFacilityId,
      method: "call",
      facility_slug: caps?.slug ?? facility?.slug ?? null,
      facility_state: state || null,
    });
  };

  const handleDirectContactRequired = useCallback(() => {
    setServerRejected(true);
    if (safeFacilityId) {
      track("facility_inquiry_rejected_by_server", safeFacilityId, { source: "legacy_backend" });
    }
  }, [safeFacilityId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl w-[calc(100vw-1.5rem)] sm:w-full max-h-[92dvh] overflow-y-auto overscroll-contain p-0 gap-0"
        data-testid="contact-facility-modal"
        data-phone-visibility={showPhone ? "pro" : "hidden"}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Contact {facilityName}</DialogTitle>
          <DialogDescription>
            Send an inquiry directly to this treatment center.
          </DialogDescription>
        </DialogHeader>

        {/* ─── Facility identity ─────────────────────────────────────────── */}
        <div className="px-5 sm:px-6 pr-12 pt-5 pb-4 border-b bg-gradient-to-b from-muted/40 to-transparent">
          <div className="flex items-start gap-3.5">
            <div className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border bg-muted border-border">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt=""
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <Building2 className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Contact
              </p>
              <h2 className="font-semibold text-foreground text-base sm:text-lg leading-tight">
                {facilityName}
              </h2>
              {(city || state) && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {[city, state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>
          {canSubmitInquiry && (
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Send an inquiry directly to this treatment center.
            </p>
          )}
        </div>

        {/* ─── Body ──────────────────────────────────────────────────────── */}
        {isLoading && !facilityMissing ? (
          <div className="px-5 sm:px-6 py-6 space-y-3" data-testid="contact-capabilities-loading">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-2/3 rounded-xl" />
          </div>
        ) : facilityMissing || !canSubmitInquiry ? (
          <FacilityUnavailableState
            reason={facilityMissing ? "missing" : "not_accepted"}
            websiteUrl={websiteUrl}
            directionsUrl={directionsUrl}
            onContinueSearching={handleKeepSearching}
            onCompare={handleCompare}
          />
        ) : (
          <div className="px-5 sm:px-6 py-5 space-y-5">
            {/* Pro contact strip — secondary to the form, never a trust signal. */}
            {telLink && displayPhone && (
              <a
                href={telLink}
                onClick={handleCallClick}
                data-testid="pro-call-facility"
                className={cn(
                  "group flex items-center justify-between gap-3 w-full p-3.5 rounded-xl",
                  "border border-primary/25 bg-primary/5 hover:bg-primary/10 transition-colors",
                )}
                aria-label={`Call ${facilityName} at ${displayPhone}`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-primary" aria-hidden="true" />
                  </span>
                  <span className="text-left min-w-0">
                    <span className="block text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                      Call facility
                    </span>
                    <span className="block text-base font-semibold text-foreground leading-tight tabular-nums">
                      {displayPhone}
                    </span>
                  </span>
                </span>
              </a>
            )}

            <FacilityInquiryForm
              facilityId={safeFacilityId!}
              facilityName={facilityName}
              onDirectContactRequired={handleDirectContactRequired}
              renderSuccess={({ firstName, email, deliveryState }) => (
                <InquirySuccessView
                  firstName={firstName}
                  facilityName={facilityName}
                  email={email}
                  deliveryState={deliveryState}
                  websiteUrl={websiteUrl}
                  directionsUrl={directionsUrl}
                  onClose={() => onOpenChange(false)}
                  onKeepSearching={handleKeepSearching}
                  onCompare={handleCompare}
                />
              )}
            />

            {/* Secondary actions — available to every tier when the data is real. */}
            {(websiteUrl || directionsUrl) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-border/60">
                {websiteUrl && (
                  <Button
                    asChild
                    variant="outline"
                    className="justify-start gap-2 h-11 mt-3"
                    data-testid="facility-website"
                  >
                    <a href={websiteUrl} target="_blank" rel="noopener noreferrer nofollow">
                      <Globe className="h-4 w-4" aria-hidden="true" />
                      Facility website
                      <ExternalLink className="h-3 w-3 ml-auto opacity-60" aria-hidden="true" />
                    </a>
                  </Button>
                )}
                {directionsUrl && (
                  <Button
                    asChild
                    variant="outline"
                    className={cn("justify-start gap-2 h-11", websiteUrl ? "sm:mt-3" : "mt-3")}
                    data-testid="facility-directions"
                  >
                    <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      Directions
                      <ExternalLink className="h-3 w-3 ml-auto opacity-60" aria-hidden="true" />
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Crisis footer ─────────────────────────────────────────────── */}
        <div className="border-t bg-muted/30 px-5 sm:px-6 py-3">
          <div className="flex items-start gap-2 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
            <LifeBuoy className="h-4 w-4 text-red-500 mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              <span className="font-semibold text-foreground">In crisis or need immediate help?</span>{" "}
              Call{" "}
              <a href="tel:988" className="font-semibold text-primary hover:underline">
                988
              </a>{" "}
              (Suicide &amp; Crisis Lifeline) or{" "}
              <a href="tel:911" className="font-semibold text-primary hover:underline">
                911
              </a>{" "}
              for emergencies.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
