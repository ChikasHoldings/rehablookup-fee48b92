import { useState, useEffect } from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Phone,
  Send,
  CheckCircle,
  MapPin,
  Loader2,
  ArrowRight,
  Building2,
  Shield,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Validation schema
const requestSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().min(10, "Phone number is required").max(20).refine((val) => {
    const digits = val.replace(/[\s\-\(\)\+\.]/g, "");
    return /^\d{10,15}$/.test(digits);
  }, "Please enter a valid phone number"),
  message: z.string().trim().max(1000).optional(),
});

type FormData = z.infer<typeof requestSchema>;

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
    email: string | null;
    logo_url: string | null;
  };
  prefillData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Analytics tracking helper
const trackAnalyticsEvent = async (
  eventType: string,
  facilityId: string,
  metadata?: Record<string, unknown>
) => {
  try {
    await supabase.functions.invoke("track-request-help", {
      body: {
        eventType,
        source: "request_info_modal",
        facilityId,
        metadata,
      },
    });
  } catch (err) {
    console.error("Analytics tracking error:", err);
  }
};

export function RequestInfoModal({
  open,
  onOpenChange,
  facility,
  prefillData,
}: RequestInfoModalProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [nearbyFacilities, setNearbyFacilities] = useState<NearbyFacility[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: prefillData?.firstName || "",
    lastName: prefillData?.lastName || "",
    email: prefillData?.email || "",
    phone: prefillData?.phone || "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Track modal open
  useEffect(() => {
    if (open) {
      trackAnalyticsEvent("modal_open", facility.id, {
        facilityName: facility.name,
        hasPrefill: !!prefillData,
      });
    }
  }, [open, facility.id, facility.name, prefillData]);

  // Update form when prefill data changes
  useEffect(() => {
    if (prefillData) {
      setFormData((prev) => ({
        ...prev,
        firstName: prefillData.firstName || prev.firstName,
        lastName: prefillData.lastName || prev.lastName,
        email: prefillData.email || prev.email,
        phone: prefillData.phone || prev.phone,
      }));
    }
  }, [prefillData]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setIsSubmitted(false);
      setNearbyFacilities([]);
      if (!prefillData) {
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          message: "",
        });
      }
      setErrors({});
    }
  }, [open, prefillData]);

  // Fetch nearby facilities when submitted
  const fetchNearbyFacilities = async () => {
    setLoadingNearby(true);
    try {
      const { data, error } = await supabase
        .from("facilities")
        .select(`
          id,
          name,
          city,
          state,
          slug,
          logo_url,
          featured,
          facility_type,
          facility_services (service_name),
          facility_insurance (insurance_name)
        `)
        .eq("status", "approved")
        .neq("suspended", true)
        .neq("id", facility.id)
        .or(`city.eq.${facility.city},state.eq.${facility.state}`)
        .order("featured", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Sort: same city first, then featured, limit to 3
      const sorted = (data || []).sort((a, b) => {
        // Same city first
        if (a.city === facility.city && b.city !== facility.city) return -1;
        if (b.city === facility.city && a.city !== facility.city) return 1;
        // Then featured
        if (a.featured && !b.featured) return -1;
        if (b.featured && !a.featured) return 1;
        return 0;
      });

      setNearbyFacilities(sorted.slice(0, 3));
    } catch (err) {
      console.error("Error fetching nearby facilities:", err);
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = requestSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("submit-direct-lead", {
        body: {
          facilityId: facility.id,
          facilityName: facility.name,
          facilityEmail: facility.email,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          message: formData.message?.trim() || null,
        },
      });

      if (error) throw error;

      setSubmittedData(formData);
      setIsSubmitted(true);
      fetchNearbyFacilities();
      
      // Track form submission
      trackAnalyticsEvent("form_submission", facility.id, {
        facilityName: facility.name,
        hasMessage: !!formData.message?.trim(),
      });
      
      toast.success("Request sent!", {
        description: `${facility.name} will contact you soon.`,
      });
    } catch (err) {
      console.error("Submission error:", err);
      toast.error("Failed to send request", {
        description: "Please try again or call the center directly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNearbyRequest = (nearbyFacility: NearbyFacility) => {
    // Track nearby facility click
    trackAnalyticsEvent("nearby_facility_click", nearbyFacility.id, {
      fromFacilityId: facility.id,
      fromFacilityName: facility.name,
      targetFacilityName: nearbyFacility.name,
      isFeatured: nearbyFacility.featured,
    });
    
    // Navigate to that facility's profile with prefill data
    navigate(`/center/${nearbyFacility.slug}`, {
      state: {
        openRequestModal: true,
        prefillData: submittedData
          ? {
              firstName: submittedData.firstName,
              lastName: submittedData.lastName,
              email: submittedData.email,
              phone: submittedData.phone,
            }
          : undefined,
      },
    });
    onOpenChange(false);
  };

  const handleRequestHelp = () => {
    // Track Request Help conversion
    trackAnalyticsEvent("request_help_conversion", facility.id, {
      fromFacilityName: facility.name,
      hasPrefillData: !!submittedData,
    });
    
    const params = new URLSearchParams();
    if (submittedData) {
      params.set("firstName", submittedData.firstName);
      params.set("lastName", submittedData.lastName);
      params.set("email", submittedData.email);
      params.set("phone", submittedData.phone);
    }
    params.set("source", "provider_profile_thankyou");
    navigate(`/request-help?${params.toString()}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {!isSubmitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Phone className="h-5 w-5 text-primary" />
                Request a Call Back
              </DialogTitle>
              <DialogDescription>
                Share your details and {facility.name} may contact you soon.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="John"
                    className={cn(errors.firstName && "border-destructive")}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Doe"
                    className={cn(errors.lastName && "border-destructive")}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="john@example.com"
                  className={cn(errors.email && "border-destructive")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                  className={cn(errors.phone && "border-destructive")}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <Label htmlFor="message">Request Details (Optional)</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Tell us about your situation or any questions you have..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
                <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Your information is confidential and will only be shared with{" "}
                  {facility.name} to help connect you with treatment options.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Request
                  </>
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="py-2">
            {/* Success Header */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Request Sent!
              </h2>
              <p className="text-muted-foreground text-sm">
                {submittedData?.firstName}, your request has been sent to{" "}
                <strong>{facility.name}</strong>. They may contact you within 24
                hours.
              </p>
            </div>

            {/* Nearby Facilities Section */}
            {(loadingNearby || nearbyFacilities.length > 0) && (
              <div className="border-t border-border pt-5 mt-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Nearby facilities you may also consider
                </h3>

                {loadingNearby ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {nearbyFacilities.map((nearbyFacility) => (
                      <div
                        key={nearbyFacility.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                      >
                        {/* Logo */}
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                          {nearbyFacility.logo_url ? (
                            <img
                              src={nearbyFacility.logo_url}
                              alt={nearbyFacility.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <span className="font-semibold text-primary text-sm">
                                {getInitials(nearbyFacility.name)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground text-sm truncate">
                              {nearbyFacility.name}
                            </h4>
                            {nearbyFacility.featured && (
                              <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0 gap-0.5">
                                <Crown className="h-2.5 w-2.5" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {nearbyFacility.city}, {nearbyFacility.state}
                          </p>
                          {nearbyFacility.facility_services?.slice(0, 2).length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {nearbyFacility.facility_services.slice(0, 2).map((s) => (
                                <Badge
                                  key={s.service_name}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {s.service_name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* CTA */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 text-xs"
                          onClick={() => handleNearbyRequest(nearbyFacility)}
                        >
                          Request Call
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Request Help CTA */}
            <div className="border-t border-border pt-5 mt-5">
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
                <h4 className="font-medium text-foreground text-sm mb-2">
                  Want help finding the right fit?
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Submit a general request and we'll match you with providers
                  based on your specific needs.
                </p>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleRequestHelp}
                >
                  Request Help
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}