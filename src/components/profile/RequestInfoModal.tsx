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
  facility: {
    id: string;
    name: string;
    city: string;
    state: string;
    slug: string;
    logo_url: string | null;
    featured?: boolean;
  };
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

  // Fetch lead usage to check capacity
  useEffect(() => {
    if (open) {
      const fetchLeadUsage = async () => {
        try {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          const { count, error } = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("facility_id", facility.id)
            .gte("created_at", startOfMonth.toISOString());

          if (error) throw error;

          const limit = 100;
          const used = count || 0;
          setLeadUsage({ used, limit, remaining: Math.max(0, limit - used) });
        } catch (err) {
          console.error("Error fetching lead usage:", err);
        }
      };
      fetchLeadUsage();
    }
  }, [open, facility.id]);

  // Track modal open
  useEffect(() => {
    if (open) {
      trackAnalyticsEvent("modal_open", facility.id, {
        facilityName: facility.name,
        hasPrefill: !!prefillData,
        facilityPlan,
      });
    }
  }, [open, facility.id, facility.name, prefillData, facilityPlan]);

  // Fetch nearby facilities when form is submitted (via useEffect, not during render)
  useEffect(() => {
    if (!formSubmitted || isPro || nearbyFacilities.length > 0) return;
    
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
          .neq("id", facility.id)
          .eq("state", facility.state)
          .order("featured", { ascending: false })
          .limit(10);

        if (cancelled || error) return;

        const sorted = (data || []).sort((a, b) => {
          if (a.city === facility.city && b.city !== facility.city) return -1;
          if (b.city === facility.city && a.city !== facility.city) return 1;
          if (a.featured && !b.featured) return -1;
          if (b.featured && !a.featured) return 1;
          return 0;
        });

        setNearbyFacilities(sorted.slice(0, 3));
      } catch (err) {
        console.error("Error fetching nearby facilities:", err);
      } finally {
        if (!cancelled) setLoadingNearby(false);
      }
    };
    
    fetchNearby();
    return () => { cancelled = true; };
  }, [formSubmitted, isPro, facility.id, facility.city, facility.state]);

  const handleNearbyRequest = (nearbyFacility: NearbyFacility) => {
    trackAnalyticsEvent("nearby_facility_click", nearbyFacility.id, {
      fromFacilityId: facility.id,
      fromFacilityName: facility.name,
      targetFacilityName: nearbyFacility.name,
      isFeatured: nearbyFacility.featured,
    });
    
    navigate(`/center/${nearbyFacility.slug}`, {
      state: {
        openRequestModal: true,
        prefillData,
      },
    });
    onOpenChange(false);
  };

  const handleConcierge = () => {
    trackAnalyticsEvent("concierge_conversion", facility.id, {
      fromFacilityName: facility.name,
    });
    navigate("/concierge");
    onOpenChange(false);
  };

  // Check if at capacity (for free tier providers)
  const isAtCapacity = leadUsage && leadUsage.remaining === 0 && !isPro;

  // Custom success handler for the form
  const renderSuccess = ({ firstName }: { firstName: string; facilityName?: string | null }) => {
    // Trigger nearby fetch when success renders
    if (nearbyFacilities.length === 0 && !loadingNearby) {
      fetchNearbyFacilities();
    }
    
    return (
      <ModalSuccessView
        firstName={firstName}
        facilityName={facility.name}
        facility={facility}
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
          <DialogTitle>Request Information from {facility.name}</DialogTitle>
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
              {facility.logo_url ? (
                <img src={facility.logo_url} alt={`${facility.name} logo`} className="h-full w-full object-contain p-1" />
              ) : (
                <Building2 className={cn("h-4 w-4", isPro ? "text-amber-600" : "text-muted-foreground")} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-medium text-foreground text-sm truncate flex-1 min-w-0 max-w-[220px] sm:max-w-[320px]" title={facility.name}>{facility.name}</h3>
                {isPro && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0.5 shrink-0">
                    <Crown className="h-2.5 w-2.5 mr-0.5" />
                    Pro
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{facility.city}, {facility.state}</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4">
          {isAtCapacity ? (
            <CapacityWarning 
              facility={facility} 
              onOpenChange={onOpenChange} 
              navigate={navigate} 
            />
          ) : (
            <LeadIntakeForm 
              facilityId={facility.id}
              facilityName={facility.name}
              renderSuccess={renderSuccess}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
