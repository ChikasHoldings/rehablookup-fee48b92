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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trackEvent } from "@/lib/analytics";
import {
  Building2,
  Shield,
  Crown,
  MapPin,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Mail,
  Phone,
  MessageSquare,
  User,
  Clock,
  Lock,
  BadgeCheck,
  LifeBuoy,
  Search,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadIntakeForm } from "@/components/lead-intake";
import { formatPhoneNumber, getPhoneDigits } from "@/lib/phoneUtils";
import { FacilityDirectContact } from "@/components/profile/FacilityDirectContact";
import {
  useFacilityContactRouting,
  type FacilityDirectContactInfo,
} from "@/hooks/useFacilityContactRouting";

interface RequestInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Facility details already loaded by the parent surface. These are used
   * for the header identity strip and as a fallback source of public
   * contact data — they are NEVER used to decide whether the on-platform
   * inquiry form may be shown. That decision is resolved from the canonical
   * entitlement (`public_facilities.is_pro` = `has_active_pro()`) by
   * `useFacilityContactRouting`, and re-checked server-side on submit.
   */
  facility: {
    id?: string | null;
    name?: string | null;
    city?: string | null;
    state?: string | null;
    slug?: string | null;
    logo_url?: string | null;
    featured?: boolean;
    /** Public business phone (already PII-ungated in public_facilities view). */
    phone?: string | null;
    /** Admin-verified accreditation flag — drives the "Verified" header badge. */
    verified?: boolean | null;
  } | null;
  prefillData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

// Inquiry analytics (no PII; only facility id + non-sensitive flags)
const trackAnalyticsEvent = (
  eventType: string,
  facilityId: string,
  metadata?: Record<string, unknown>
) => {
  try {
    trackEvent(eventType, {
      event_category: "LeadForm",
      event_label: facilityId,
      ...metadata,
    });
  } catch {
    // best-effort
  }
};

const PREFERRED_CONTACT_LABEL: Record<string, string> = {
  call: "Phone call",
  phone: "Phone call",
  text: "Text message (SMS)",
  sms: "Text message (SMS)",
  email: "Email",
};
const BEST_TIME_LABEL: Record<string, string> = {
  morning: "Morning (8am–12pm)",
  afternoon: "Afternoon (12pm–5pm)",
  evening: "Evening (5pm–8pm)",
  anytime: "Anytime",
};
function maskPhoneDisplay(phone?: string) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `••• ••• ${digits.slice(-4)}`;
}

interface ModalContactRecap {
  email?: string;
  phone?: string;
  preferredContact?: string;
  bestTimeToCall?: string;
}

/**
 * Post-submit view for an ACTIVE PRO inquiry only.
 *
 * The inquiry went to exactly one facility — the one the seeker selected.
 * There is no "and here are other centers we sent it to", no coordinator,
 * and no matching. The keep-comparing CTA below is plain directory
 * navigation the seeker drives themselves.
 */
function ModalSuccessView({
  firstName,
  facilityName,
  onClose,
  onKeepSearching,
  contact,
}: {
  firstName: string;
  facilityName?: string | null;
  onClose: () => void;
  onKeepSearching: () => void;
  contact?: ModalContactRecap;
}) {
  const preferredLabel = contact?.preferredContact
    ? PREFERRED_CONTACT_LABEL[contact.preferredContact] ?? contact.preferredContact
    : null;
  const bestTimeLabel = contact?.bestTimeToCall
    ? BEST_TIME_LABEL[contact.bestTimeToCall] ?? contact.bestTimeToCall
    : null;
  const hasContactRecap = !!(contact && (contact.email || contact.phone || preferredLabel));

  return (
    <div className="px-6 pb-6 pt-2 space-y-5">
      <div className="text-center space-y-3">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Request Sent, {firstName}!
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your information has been delivered to{" "}
            <span className="font-semibold text-foreground">{facilityName}</span>.
          </p>
        </div>
      </div>

      {/* Email-sent status banner */}
      {contact?.email && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-200/70 dark:border-emerald-800/50 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 flex items-start gap-3"
        >
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
            <Mail className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-sm">
            <div className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Confirmation email sent
            </div>
            <p className="text-emerald-800/90 dark:text-emerald-300/90 mt-0.5 leading-relaxed">
              We sent a copy to{" "}
              <span className="font-medium break-all">{contact.email}</span>.
              Don't see it within a few minutes? Check your spam folder.
            </p>
          </div>
        </div>
      )}

      {/* Contact recap */}
      {hasContactRecap && (
        <div className="rounded-xl border border-border/60 bg-card p-4 text-left">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-foreground">
              Contact details we received
            </h4>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Confirmed
            </span>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-foreground font-medium">{firstName}</span>
            </li>
            {contact?.email && (
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-foreground break-all">{contact.email}</span>
              </li>
            )}
            {contact?.phone && (
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{maskPhoneDisplay(contact.phone)}</span>
              </li>
            )}
            {preferredLabel && (
              <li className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">
                  Preferred: <span className="font-medium">{preferredLabel}</span>
                  {bestTimeLabel ? (
                    <span className="text-muted-foreground"> · {bestTimeLabel}</span>
                  ) : null}
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Clear next step — the facility responds, not RehabLookup. */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-left">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="text-sm">
            <div className="font-semibold text-foreground mb-0.5">
              What happens next
            </div>
            <p className="text-muted-foreground leading-relaxed">
              An admissions specialist from {facilityName} will reach out
              {preferredLabel ? <> by <span className="font-medium text-foreground">{preferredLabel.toLowerCase()}</span></> : null}
              {" "}within 24 hours. Keep an eye on your inbox — a confirmation email is on its way.
            </p>
          </div>
        </div>
      </div>

      {/* Keep-searching CTA */}
      <button
        onClick={onKeepSearching}
        className="w-full p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all text-left group"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-foreground mb-1">
              Keep comparing centers
            </div>
            <p className="text-sm text-muted-foreground">
              Search the full directory by location, level of care, and insurance — you can contact as many facilities as you like.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
        </div>
      </button>

      <Button variant="outline" onClick={onClose} className="w-full">
        Done
      </Button>
    </div>
  );
}

/**
 * Shown when we could not load the selected facility at all (no id, or the
 * public record is missing). Historically this state fell through to a
 * generic RehabLookup PII form backed by `submit-marketing-lead` with
 * "our team will match you with the right program" copy. That was a
 * placement promise the directory does not make and cannot keep, so the
 * failure state now collects nothing and simply returns the visitor to the
 * directory.
 */
function FacilityUnavailableState({
  onContinueSearching,
  onCompare,
}: {
  onContinueSearching: () => void;
  onCompare: () => void;
}) {
  return (
    <div className="px-5 sm:px-6 pt-4 pb-5 space-y-4">
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">
          We couldn't load this facility's details
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Direct contact information is not available for this facility right
          now. You can keep browsing the directory and reach out to another
          center.
        </p>
      </div>
      <div className="space-y-2.5">
        <Button
          size="lg"
          className="w-full justify-start gap-2 h-11"
          onClick={onContinueSearching}
          data-testid="direct-contact-continue-search"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Continue searching
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full justify-start gap-2 h-11"
          onClick={onCompare}
          data-testid="direct-contact-compare"
        >
          <Scale className="h-4 w-4" aria-hidden="true" />
          Compare facilities
        </Button>
      </div>
    </div>
  );
}

export function RequestInfoModal({
  open,
  onOpenChange,
  facility,
  prefillData,
}: RequestInfoModalProps) {
  const navigate = useNavigate();
  const [formSubmitted, setFormSubmitted] = useState(false);
  /**
   * Set when the server answers a submission with
   * `action: "DIRECT_CONTACT_REQUIRED"`. The client's view of entitlement
   * can be stale (a subscription can lapse between render and submit) and
   * the server is authoritative, so we drop straight to direct contact
   * rather than claiming the facility received anything.
   */
  const [serverForcedDirect, setServerForcedDirect] = useState(false);

  const safeFacilityId = facility?.id ?? null;

  const { data: routingResult, isLoading: routingLoading } =
    useFacilityContactRouting(open ? safeFacilityId : null);

  // Canonical entitlement. Anything we have not positively confirmed as an
  // active Pro listing — still loading, errored, missing, Free, unclaimed,
  // Featured-only, or overridden by the server — is direct contact.
  const isPro = !serverForcedDirect && routingResult?.routing === "pro";

  const resolvedName = routingResult?.contact?.name?.trim() || facility?.name?.trim() || "";
  const safeFacilityName = resolvedName || "the treatment center you selected";
  const safeCity = routingResult?.contact?.city?.trim() || facility?.city?.trim() || "";
  const safeState = routingResult?.contact?.state?.trim() || facility?.state?.trim() || "";
  const safeLogoUrl = facility?.logo_url ?? null;
  const safeVerified = facility?.verified === true;

  // Public contact data for the direct path. Prefer the freshly-resolved
  // public_facilities row; fall back to whatever the parent surface already
  // loaded. Nothing here is invented — a null stays null and its action is
  // simply not rendered.
  const directContact: FacilityDirectContactInfo | null = safeFacilityId
    ? {
        id: safeFacilityId,
        name: resolvedName || null,
        phone: routingResult?.contact?.phone ?? facility?.phone ?? null,
        website: routingResult?.contact?.website ?? null,
        address: routingResult?.contact?.address ?? null,
        city: safeCity || null,
        state: safeState || null,
        zipCode: routingResult?.contact?.zipCode ?? null,
        slug: routingResult?.contact?.slug ?? facility?.slug ?? null,
      }
    : null;

  const facilityUnavailable =
    !safeFacilityId || (!routingLoading && routingResult?.facilityMissing === true);

  // Pro-only call-first CTA (the direct panel renders its own).
  const proPhoneDigits = isPro && directContact?.phone ? getPhoneDigits(directContact.phone) : "";
  const proTelLink = proPhoneDigits.length >= 10 ? `tel:+1${proPhoneDigits}` : null;
  const proFormattedPhone = proTelLink ? formatPhoneNumber(directContact!.phone!) : null;

  const handleCallClick = () => {
    if (safeFacilityId) {
      trackAnalyticsEvent("inquiry_modal_call_click", safeFacilityId, {
        facilityName: safeFacilityName,
        facilityPlan: "pro",
      });
    }
  };

  // Reset transient state when the modal closes.
  useEffect(() => {
    if (!open) {
      setFormSubmitted(false);
      setServerForcedDirect(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && safeFacilityId && !routingLoading) {
      trackAnalyticsEvent("modal_open", safeFacilityId, {
        facilityName: safeFacilityName,
        hasPrefill: !!prefillData,
        contactRouting: isPro ? "pro" : "direct",
      });
    }
  }, [open, safeFacilityId, safeFacilityName, prefillData, routingLoading, isPro]);

  const handleKeepSearching = useCallback(() => {
    if (safeFacilityId) {
      trackAnalyticsEvent("keep_searching_click", safeFacilityId, {
        fromFacilityName: safeFacilityName,
      });
    }
    const location = [safeCity, safeState].filter(Boolean).join(", ");
    navigate(
      location
        ? `/search-results?location=${encodeURIComponent(location)}`
        : "/search-results",
    );
    onOpenChange(false);
  }, [safeFacilityId, safeFacilityName, safeCity, safeState, navigate, onOpenChange]);

  const handleCompare = useCallback(() => {
    navigate("/compare");
    onOpenChange(false);
  }, [navigate, onOpenChange]);

  /**
   * Server-authoritative downgrade. Fired by the lead form when
   * `submit-qualified-lead` returns DIRECT_CONTACT_REQUIRED. We must not
   * render a success state — the facility did not receive the inquiry.
   */
  const handleDirectContactRequired = useCallback(() => {
    setFormSubmitted(false);
    setServerForcedDirect(true);
    if (safeFacilityId) {
      trackAnalyticsEvent("inquiry_direct_contact_required", safeFacilityId, {
        facilityName: safeFacilityName,
        source: "server",
      });
    }
  }, [safeFacilityId, safeFacilityName]);

  const renderSuccess = ({
    firstName,
    contact,
  }: {
    firstName: string;
    facilityName?: string | null;
    contact: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      preferredContact: string;
      bestTimeToCall: string;
    };
  }) => {
    if (!formSubmitted) {
      setTimeout(() => setFormSubmitted(true), 0);
    }

    return (
      <ModalSuccessView
        firstName={firstName}
        facilityName={safeFacilityName}
        onClose={() => onOpenChange(false)}
        onKeepSearching={handleKeepSearching}
        contact={{
          email: contact.email,
          phone: contact.phone,
          preferredContact: contact.preferredContact,
          bestTimeToCall: contact.bestTimeToCall,
        }}
      />
    );
  };

  const showTrustStrip = isPro && !formSubmitted;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {isPro
              ? `Request Information from ${safeFacilityName}`
              : `Contact ${safeFacilityName}`}
          </DialogTitle>
          <DialogDescription>
            {isPro
              ? "Call the admissions team directly or send a confidential message to connect with this treatment center."
              : "Contact this treatment center directly by phone, website, or in person."}
          </DialogDescription>
        </DialogHeader>

        {/* ─── Facility identity strip ───────────────────────────────────── */}
        <div className="px-5 sm:px-6 pr-12 pt-5 pb-4 border-b bg-gradient-to-b from-muted/40 to-transparent">
          <div className="flex items-start gap-3.5">
            <div className={cn(
              "h-14 w-14 sm:h-16 sm:w-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border",
              isPro
                ? "bg-gradient-to-br from-amber-100 to-amber-50 border-amber-200/70"
                : "bg-muted border-border"
            )}>
              {safeLogoUrl ? (
                <img src={safeLogoUrl} alt={`${safeFacilityName} logo`} className="h-full w-full object-contain p-1.5" />
              ) : (
                <Building2 className={cn("h-6 w-6 sm:h-7 sm:w-7", isPro ? "text-amber-600" : "text-muted-foreground")} />
              )}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start gap-2 min-w-0 flex-wrap">
                <h3
                  className="font-semibold text-foreground text-base sm:text-lg leading-tight min-w-0 flex-1"
                  title={safeFacilityName}
                >
                  {safeFacilityName}
                </h3>
              </div>
              {(safeCity || safeState) ? (
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  {[safeCity, safeState].filter(Boolean).join(", ")}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Location details unavailable
                </p>
              )}
              {(safeVerified || isPro) && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {safeVerified && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] sm:text-xs px-1.5 py-0.5">
                      <BadgeCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                      Verified
                    </Badge>
                  )}
                  {isPro && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] sm:text-xs px-1.5 py-0.5">
                      <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                      Pro Provider
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Trust strip (Pro inquiry form only) ───────────────────────── */}
        {showTrustStrip && (
          <div className="px-5 sm:px-6 py-2.5 bg-primary/5 border-b border-primary/10">
            <div className="flex items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-foreground/80 flex-wrap">
              <span className="flex items-center gap-1 font-medium">
                <Lock className="h-3 w-3 text-primary" />
                100% Confidential
              </span>
              <span className="text-border" aria-hidden="true">·</span>
              <span className="flex items-center gap-1 font-medium">
                <Shield className="h-3 w-3 text-primary" />
                HIPAA Compliant
              </span>
              <span className="text-border" aria-hidden="true">·</span>
              <span className="flex items-center gap-1 font-medium">
                <CheckCircle className="h-3 w-3 text-emerald-600" />
                Free · No Obligation
              </span>
            </div>
          </div>
        )}

        {/* ─── Body ──────────────────────────────────────────────────────── */}
        {routingLoading && !facilityUnavailable ? (
          <div className="px-5 sm:px-6 py-6 space-y-3" data-testid="contact-routing-loading">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-2/3 rounded-xl" />
          </div>
        ) : facilityUnavailable ? (
          <FacilityUnavailableState
            onContinueSearching={handleKeepSearching}
            onCompare={handleCompare}
          />
        ) : isPro ? (
          <>
            {/* Call-first CTA — the fastest path for a crisis-mode seeker. */}
            {proTelLink && proFormattedPhone && !formSubmitted && (
              <div className="px-5 sm:px-6 pt-4 pb-2">
                <a
                  href={proTelLink}
                  onClick={handleCallClick}
                  className="group flex items-center justify-between gap-3 w-full p-3.5 sm:p-4 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 active:scale-[0.99] transition-all"
                  aria-label={`Call ${safeFacilityName} at ${proFormattedPhone}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-[11px] sm:text-xs uppercase tracking-wide opacity-90 font-medium">
                        Call admissions now
                      </div>
                      <div className="text-base sm:text-lg font-bold leading-tight tabular-nums">
                        {proFormattedPhone}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                </a>

                <div className="flex items-center gap-3 mt-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    or send a message
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </div>
            )}

            <div className="px-1 sm:px-2 pb-2">
              <LeadIntakeForm
                facilityId={safeFacilityId ?? undefined}
                facilityName={safeFacilityName}
                renderSuccess={renderSuccess}
                onDirectContactRequired={handleDirectContactRequired}
              />
            </div>
          </>
        ) : (
          <FacilityDirectContact
            contact={directContact}
            surface="profile_modal"
            onClose={() => onOpenChange(false)}
          />
        )}

        {/* ─── Crisis footer ─────────────────────────────────────────────── */}
        {!formSubmitted && (
          <div className="border-t bg-muted/30 px-5 sm:px-6 py-3">
            <div className="flex items-start gap-2 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
              <LifeBuoy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 mt-0.5 shrink-0" aria-hidden="true" />
              <p>
                <span className="font-semibold text-foreground">In crisis or need immediate help?</span>{" "}
                Call <a href="tel:988" className="font-semibold text-primary hover:underline">988</a> (Suicide &amp; Crisis Lifeline)
                {" "}or <a href="tel:911" className="font-semibold text-primary hover:underline">911</a> for emergencies.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
