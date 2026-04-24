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
import { toast } from "sonner";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadIntakeForm } from "@/components/lead-intake";

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
  } | null;
  facilityPlan?: "free" | "pro";
  prefillData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

// Track capacity warning analytics (legacy - now silent)
async function trackCapacityEvent(eventType: string, facilityId: string, metadata?: Record<string, unknown>) {
  // Analytics function removed - was using deleted track-request-help edge function
  console.debug("Capacity event:", eventType, facilityId);
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
    const destination = `/search?state=${facility.state}&city=${encodeURIComponent(facility.city)}`;
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

// Analytics tracking helper
// Analytics tracking (legacy - now silent)
const trackAnalyticsEvent = async (
  eventType: string,
  facilityId: string,
  metadata?: Record<string, unknown>
) => {
  // Analytics function removed - was using deleted track-request-help edge function
  console.debug("Lead form event:", eventType, facilityId);
};

// Custom success component for modal context
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
}: { 
  firstName: string;
  facilityName?: string | null;
  facility: { id: string; name: string; city: string; state: string; slug: string; logo_url: string | null };
  nearbyFacilities: NearbyFacility[];
  loadingNearby: boolean;
  onClose: () => void;
  onNearbyRequest: (facility: NearbyFacility) => void;
  onConcierge: () => void;
  isPro: boolean;
}) {
  return (
    <div className="py-4 text-center space-y-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Request Sent, {firstName}!
        </h3>
        <p className="text-muted-foreground">
          {facilityName || facility.name} will be in touch with you soon.
        </p>
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
      <div className="pt-4 border-t">
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
                Our Concierge service matches you with verified treatment centers based on your unique needs.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
          </div>
        </button>
      </div>
      
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
  const hasFacilityRecord = Boolean(safeFacilityId);
  const isFacilityDataIncomplete =
    !facility || !facility.name || !facility.city || !facility.state;

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
          .select("*", { count: "exact", head: true })
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

  // Custom success handler for the form
  const renderSuccess = ({ firstName }: { firstName: string; facilityName?: string | null }) => {
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
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Request Information from {safeFacilityName}</DialogTitle>
          <DialogDescription>
            Fill out the form to connect with this treatment center
          </DialogDescription>
        </DialogHeader>

        {/* Compact Facility Header */}
        <div className="px-6 pr-12 pt-5 pb-3">
          <div className="flex items-start gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden",
              isPro ? "bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200/50" : "bg-muted"
            )}>
              {safeLogoUrl ? (
                <img src={safeLogoUrl} alt={`${safeFacilityName} logo`} className="h-full w-full object-contain p-1" />
              ) : (
                <Building2 className={cn("h-4 w-4", isPro ? "text-amber-600" : "text-muted-foreground")} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-medium text-foreground text-sm truncate flex-1 min-w-0 max-w-[220px] sm:max-w-[320px]" title={safeFacilityName}>{safeFacilityName}</h3>
                {isPro && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-1.5 py-0.5 shrink-0">
                    <Crown className="h-2.5 w-2.5 mr-0.5" />
                    Pro
                  </Badge>
                )}
              </div>
              {(safeCity || safeState) ? (
                <p className="text-xs text-muted-foreground truncate">
                  {[safeCity, safeState].filter(Boolean).join(", ")}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground truncate">
                  Location details unavailable
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Friendly fallback banner when center details failed to load */}
        {isFacilityDataIncomplete && (
          <div className="mx-6 mb-2 rounded-md border border-amber-200/60 bg-amber-50/60 px-3 py-2.5 text-xs text-amber-900">
            <p className="font-medium">We're having trouble loading this center's details.</p>
            <p className="mt-0.5 text-amber-800/90">
              You can still send your information below — our team will match you
              with the right program and follow up shortly.
            </p>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4">
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
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
