import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import {
  Building2,
  Shield,
  Crown,
  Users,
  Heart,
  MapPin,
  CheckCircle,
  Loader2,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadIntakeForm } from "@/components/lead-intake";
import { LeadIntakeFormData } from "@/components/lead-intake/types";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneNumber, getPhoneDigits } from "@/lib/phoneUtils";

interface NearbyFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  slug: string;
  logo_url: string | null;
  featured: boolean;
  facility_type: string;
  facility_services: { service_name: string }[];
  facility_insurance: { insurance_name: string }[];
}

interface RequestInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Facility details. May be partially populated (or effectively empty) if the
   * parent page failed to load the center record. The modal degrades
   * gracefully in that case — the lead form is still rendered so the user can
   * submit their information, and we route them to the concierge for matching
   * when no specific facility id is available.
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
  facilityPlan?: "free" | "pro";
  prefillData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

// Track capacity warning analytics (no PII)
async function trackCapacityEvent(eventType: string, facilityId: string, metadata?: Record<string, unknown>) {
  try {
    trackEvent(eventType, {
      event_category: "Capacity",
      event_label: facilityId,
      ...metadata,
    });
    // Analytics provider removed — Meta Pixel call removed.
  } catch {
    // best-effort
  }
}

// Capacity Warning Component with analytics
function CapacityWarning({ 
  facility, 
  onOpenChange, 
  navigate 
}: { 
  facility: { id: string; name: string; city: string; state: string };
  onOpenChange: (open: boolean) => void;
  navigate: (path: string) => void;
}) {
  // Track when capacity warning is viewed
  useEffect(() => {
    trackCapacityEvent("capacity_warning_viewed", facility.id, {
      facilityName: facility.name,
      city: facility.city,
      state: facility.state,
    });
  }, [facility.id, facility.name, facility.city, facility.state]);

  const handleFindAvailable = () => {
    trackCapacityEvent("capacity_find_available_clicked", facility.id, {
      facilityName: facility.name,
      destination: "/concierge",
    });
    onOpenChange(false);
    navigate("/concierge");
  };

  const handleBrowseOther = () => {
    // The canonical route is `/search-results`; `/search` only exists as a
    // legacy redirect target. Linking directly to /search-results avoids the
    // redirect hop AND ensures the capacity-escape-hatch lands on a live
    // page if the redirect is ever pulled.
    const destination = `/search-results?state=${facility.state}&city=${encodeURIComponent(facility.city)}`;
    trackCapacityEvent("capacity_browse_other_clicked", facility.id, {
      facilityName: facility.name,
      city: facility.city,
      state: facility.state,
      destination,
    });
    onOpenChange(false);
    navigate(destination);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="text-center py-6">
        <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          This Provider is at Capacity
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          {facility.name} has reached their monthly limit for new inquiries. 
          They may not be able to respond promptly to new requests.
        </p>
        
        <div className="space-y-3">
          <Button
            type="button"
            className="w-full"
            onClick={handleFindAvailable}
          >
            <Heart className="h-4 w-4 mr-2" />
            Use Concierge Service
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleBrowseOther}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Browse Other Centers in {facility.city}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-4">
          Or call them directly for immediate assistance
        </p>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Lead-form analytics (no PII; only facility id + flags)
const trackAnalyticsEvent = async (
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
    // Analytics provider removed — Meta Pixel call removed.
  } catch {
    // best-effort
  }
};

// Custom success component for modal context
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

function ModalSuccessView({ 
  firstName, 
  facilityName,
  facility,
  nearbyFacilities,
  loadingNearby,
  onClose,
  onNearbyRequest,
  onConcierge,
  isPro,
  contact,
}: { 
  firstName: string;
  facilityName?: string | null;
  facility: { id: string; name: string; city: string; state: string; slug?: string | null; logo_url?: string | null };
  nearbyFacilities: NearbyFacility[];
  loadingNearby: boolean;
  onClose: () => void;
  onNearbyRequest: (facility: NearbyFacility) => void;
  onConcierge: () => void;
  isPro: boolean;
  contact?: ModalContactRecap;
}) {
  const preferredLabel = contact?.preferredContact
    ? PREFERRED_CONTACT_LABEL[contact.preferredContact] ?? contact.preferredContact
    : null;
  const bestTimeLabel = contact?.bestTimeToCall
    ? BEST_TIME_LABEL[contact.bestTimeToCall] ?? contact.bestTimeToCall
    : null;
  const hasContactRecap = !!(contact && (contact.email || contact.phone || preferredLabel));

  const displayFacilityName = facilityName || facility.name;
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
            <span className="font-semibold text-foreground">{displayFacilityName}</span>.
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

      {/* Clear next step */}
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
              An admissions specialist from {facilityName || facility.name} will reach out
              {preferredLabel ? <> by <span className="font-medium text-foreground">{preferredLabel.toLowerCase()}</span></> : null}
              {" "}within 24 hours. Keep an eye on your inbox — a confirmation email is on its way.
            </p>
          </div>
        </div>
      </div>

      {/* Nearby Facilities - Only for Free tier */}
      {!isPro && nearbyFacilities.length > 0 && (
        <div className="pt-4 border-t">
          <p className="text-sm font-medium text-foreground mb-3">
            Consider reaching out to these nearby centers too:
          </p>
          <div className="space-y-2">
            {nearbyFacilities.map((nearby) => (
              <button
                key={nearby.id}
                onClick={() => onNearbyRequest(nearby)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left group"
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {nearby.logo_url ? (
                    <img src={nearby.logo_url} alt={`${nearby.name} logo`} className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="font-semibold text-sm text-muted-foreground">
                      {getInitials(nearby.name)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {nearby.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {nearby.city}, {nearby.state}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}
      
      {loadingNearby && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Finding more options...
        </div>
      )}
      
      {/* Concierge CTA */}
      <button
        onClick={onConcierge}
        className="w-full p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all text-left group"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-foreground mb-1">
              Want help finding the best fit?
            </div>
            <p className="text-sm text-muted-foreground">
              Our Placement Service matches you with verified treatment centers based on your unique needs.
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

export function RequestInfoModal({
  open,
  onOpenChange,
  facility,
  facilityPlan = "free",
  prefillData,
}: RequestInfoModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [nearbyFacilities, setNearbyFacilities] = useState<NearbyFacility[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [leadUsage, setLeadUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [submittedFirstName, setSubmittedFirstName] = useState("");

  const isPro = facilityPlan === "pro";

  // Defensive normalization — when the parent failed to load center details we
  // still want the form to render. We treat any missing fields as "unknown"
  // and (when the facility id is missing) route the lead through the
  // concierge-style generic intake instead of attaching it to a real record.
  const safeFacilityId = facility?.id ?? null;
  const safeFacilityName = facility?.name?.trim() || "the treatment center you selected";
  const safeCity = facility?.city?.trim() || "";
  const safeState = facility?.state?.trim() || "";
  const safeLogoUrl = facility?.logo_url ?? null;
  const safePhone = facility?.phone?.trim() || null;
  const safeVerified = facility?.verified === true;
  const formattedPhone = safePhone ? formatPhoneNumber(safePhone) : null;
  const phoneDigits = safePhone ? getPhoneDigits(safePhone) : null;
  const telLink = phoneDigits && phoneDigits.length >= 10 ? `tel:+1${phoneDigits}` : null;
  const hasFacilityRecord = Boolean(safeFacilityId);
  const isFacilityDataIncomplete =
    !facility || !facility.name || !facility.city || !facility.state;

  // Tap-to-call analytics — fire on click but never block the tel: handler.
  const handleCallClick = () => {
    if (safeFacilityId) {
      trackAnalyticsEvent("inquiry_modal_call_click", safeFacilityId, {
        facilityName: safeFacilityName,
        facilityPlan,
      });
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setFormSubmitted(false);
      setNearbyFacilities([]);
      setLoadingNearby(false);
    }
  }, [open]);

  // Fetch lead usage to check capacity (only when we actually have a facility id)
  useEffect(() => {
    if (!open || !safeFacilityId) {
      setLeadUsage(null);
      return;
    }
    const fetchLeadUsage = async () => {
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count, error } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", safeFacilityId)
          .gte("created_at", startOfMonth.toISOString());

        if (error) throw error;

        const limit = 100;
        const used = count || 0;
        setLeadUsage({ used, limit, remaining: Math.max(0, limit - used) });
      } catch (err) {
        // Non-fatal — capacity gating is a nice-to-have. The form still works.
        console.error("Error fetching lead usage:", err);
      }
    };
    fetchLeadUsage();
  }, [open, safeFacilityId]);

  // Track modal open
  useEffect(() => {
    if (open && safeFacilityId) {
      trackAnalyticsEvent("modal_open", safeFacilityId, {
        facilityName: safeFacilityName,
        hasPrefill: !!prefillData,
        facilityPlan,
        facilityDataIncomplete: isFacilityDataIncomplete,
      });
    }
  }, [open, safeFacilityId, safeFacilityName, prefillData, facilityPlan, isFacilityDataIncomplete]);

  // Fetch nearby facilities when form is submitted (via useEffect, not during render)
  useEffect(() => {
    if (!formSubmitted || isPro || nearbyFacilities.length > 0) return;
    if (!safeFacilityId || !safeState) return;

    let cancelled = false;
    const fetchNearby = async () => {
      setLoadingNearby(true);
      try {
        const { data, error } = await supabase
          .from("facilities")
          .select(`
            id, name, city, state, slug, logo_url, featured, facility_type,
            facility_services (service_name),
            facility_insurance (insurance_name)
          `)
          .eq("status", "approved")
          .neq("id", safeFacilityId)
          .eq("state", safeState)
          .order("featured", { ascending: false })
          .limit(10);

        if (cancelled || error) return;

        const sorted = (data || []).sort((a, b) => {
          if (a.city === safeCity && b.city !== safeCity) return -1;
          if (b.city === safeCity && a.city !== safeCity) return 1;
          if (a.featured && !b.featured) return -1;
          if (b.featured && !a.featured) return 1;
          return 0;
        });

        setNearbyFacilities(sorted.slice(0, 3));
      } catch (err) {
        // Silent — nearby suggestions are optional.
        console.error("Error fetching nearby facilities:", err);
      } finally {
        if (!cancelled) setLoadingNearby(false);
      }
    };

    fetchNearby();
    return () => { cancelled = true; };
  }, [formSubmitted, isPro, safeFacilityId, safeCity, safeState, nearbyFacilities.length]);

  const handleNearbyRequest = (nearbyFacility: NearbyFacility) => {
    if (safeFacilityId) {
      trackAnalyticsEvent("nearby_facility_click", nearbyFacility.id, {
        fromFacilityId: safeFacilityId,
        fromFacilityName: safeFacilityName,
        targetFacilityName: nearbyFacility.name,
        isFeatured: nearbyFacility.featured,
      });
    }

    navigate(`/center/${nearbyFacility.slug}`, {
      state: {
        openRequestModal: true,
        prefillData,
      },
    });
    onOpenChange(false);
  };

  const handleConcierge = () => {
    if (safeFacilityId) {
      trackAnalyticsEvent("concierge_conversion", safeFacilityId, {
        fromFacilityName: safeFacilityName,
      });
    }
    navigate("/concierge");
    onOpenChange(false);
  };

  // Check if at capacity (for free tier providers) — only meaningful when we
  // were able to load real lead usage for a real facility.
  const isAtCapacity = hasFacilityRecord && leadUsage && leadUsage.remaining === 0 && !isPro;

  // When the facility record failed to load (no id), the default lead path
  // would dead-end at submit ("select a treatment center") and silently drop
  // the lead — despite the fallback banner promising "we'll follow up". Route
  // these through the concierge-matching marketing-lead function so the promise
  // is kept. Throw on failure so the form never shows a false success.
  const handleConciergeFallbackSubmit = async (formData: LeadIntakeFormData) => {
    try {
      const { error } = await supabase.functions.invoke("submit-marketing-lead", {
        body: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          preferredContact: formData.preferredContact,
          urgency: formData.urgency,
          whoSeekingHelp: formData.whoSeekingHelp,
          locationZip: formData.locationZip,
          locationCityState: formData.locationCityState,
          levelOfCare: formData.levelOfCare,
          insuranceType: formData.insuranceType,
          insuranceProvider: formData.insuranceProvider,
          primarySubstance: formData.primarySubstance,
          dualDiagnosis: formData.dualDiagnosis,
          ageRange: formData.ageRange,
          gender: formData.gender,
          previousTreatment: formData.previousTreatment,
          coOccurringConditions: formData.coOccurringConditions,
          employmentStatus: formData.employmentStatus,
          message: formData.message,
          landingPage: typeof window !== "undefined" ? window.location.pathname : "/center",
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Concierge fallback lead submission failed:", err);
      toast({
        title: "Submission failed",
        description: (err instanceof Error ? err.message : "") || "Please try again in a moment.",
        variant: "destructive",
      });
      throw err instanceof Error ? err : new Error("Submission failed");
    }
  };

  // Custom success handler for the form
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
    // Mark form as submitted to trigger nearby fetch via useEffect
    if (!formSubmitted) {
      setTimeout(() => setFormSubmitted(true), 0);
    }

    return (
      <ModalSuccessView
        firstName={firstName}
        facilityName={safeFacilityName}
        facility={{
          id: safeFacilityId ?? "unknown",
          name: safeFacilityName,
          city: safeCity,
          state: safeState,
        }}
        nearbyFacilities={nearbyFacilities}
        loadingNearby={loadingNearby}
        onClose={() => onOpenChange(false)}
        onNearbyRequest={handleNearbyRequest}
        onConcierge={handleConcierge}
        isPro={isPro}
        contact={{
          email: contact.email,
          phone: contact.phone,
          preferredContact: contact.preferredContact,
          bestTimeToCall: contact.bestTimeToCall,
        }}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Request Information from {safeFacilityName}</DialogTitle>
          <DialogDescription>
            Call the admissions team directly or send a confidential message to connect with this treatment center.
          </DialogDescription>
        </DialogHeader>

        {/* ─── Facility identity strip ─────────────────────────────────────
            Standard rehab-directory header: prominent logo, name with
            verification + Pro badges, location. Bigger than the prior
            compact header so the seeker is reassured they're contacting
            the right center before they fill anything out. */}
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

        {/* ─── Trust strip ──────────────────────────────────────────────────
            Industry-standard reassurance bar shown above the fold —
            mirrors what major rehab directories surface (Confidential,
            HIPAA-compliant, Free). Kept minimal so it scans in <1s. */}
        {!formSubmitted && !isAtCapacity && (
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

        {/* ─── Friendly fallback banner ─────────────────────────────────── */}
        {isFacilityDataIncomplete && !formSubmitted && (
          <div className="mx-5 sm:mx-6 mt-3 rounded-md border border-amber-200/60 bg-amber-50/60 px-3 py-2.5 text-xs text-amber-900">
            <p className="font-medium">We're having trouble loading this center's details.</p>
            <p className="mt-0.5 text-amber-800/90">
              You can still send your information below — our team will match you
              with the right program and follow up shortly.
            </p>
          </div>
        )}

        {/* ─── Call-first CTA ───────────────────────────────────────────────
            Standard rehab-directory pattern: a prominent tap-to-call
            button as the primary action. Most crisis-mode seekers want
            to talk to someone immediately. Form path is offered below
            as the secondary action via the "or send a message" divider.
            Hidden after submit and during capacity-warning state. */}
        {telLink && formattedPhone && !formSubmitted && !isAtCapacity && (
          <div className="px-5 sm:px-6 pt-4 pb-2">
            <a
              href={telLink}
              onClick={handleCallClick}
              className="group flex items-center justify-between gap-3 w-full p-3.5 sm:p-4 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 active:scale-[0.99] transition-all"
              aria-label={`Call ${safeFacilityName} at ${formattedPhone}`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-[11px] sm:text-xs uppercase tracking-wide opacity-90 font-medium">
                    Call admissions now
                  </div>
                  <div className="text-base sm:text-lg font-bold leading-tight tabular-nums">
                    {formattedPhone}
                  </div>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
            </a>
            <p className="text-[11px] sm:text-xs text-muted-foreground text-center mt-2">
              Speak with an admissions specialist · Typically answers in under 2 minutes
            </p>

            {/* "or send a message" divider — only when the form is the
                secondary path (i.e., we also have a phone CTA above). */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
                or send a message
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </div>
        )}

        {/* ─── Form / capacity / success area ─────────────────────────────── */}
        <div className="px-1 sm:px-2 pb-2">
          {isAtCapacity ? (
            <CapacityWarning
              facility={{
                id: safeFacilityId ?? "unknown",
                name: safeFacilityName,
                city: safeCity,
                state: safeState,
              }}
              onOpenChange={onOpenChange}
              navigate={navigate}
            />
          ) : (
            <LeadIntakeForm
              facilityId={safeFacilityId ?? undefined}
              facilityName={safeFacilityName}
              renderSuccess={renderSuccess}
              onCustomSubmit={safeFacilityId ? undefined : handleConciergeFallbackSubmit}
            />
          )}
        </div>

        {/* ─── Crisis footer ────────────────────────────────────────────────
            Required for a treatment-directory inquiry surface: every
            major rehab platform surfaces the 988 / 911 disclaimer so
            users in acute crisis don't try to wait on an inquiry
            response. Hidden after a successful submit to keep the
            success view uncluttered. */}
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
