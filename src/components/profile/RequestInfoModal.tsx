import { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Phone,
  Send,
  CheckCircle,
  CheckCircle2,
  MapPin,
  Loader2,
  ArrowRight,
  Building2,
  Shield,
  Crown,
  Clock,
  Heart,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhoneNumber, formatPhoneNumber } from "@/lib/phoneUtils";
import { EmailInput } from "@/components/ui/email-input";
import { isValidEmail } from "@/lib/emailUtils";

// Validation schema
const requestSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().min(10, "Phone number is required").max(20).refine((val) => {
    const digits = val.replace(/[\s\-\(\)\+\.]/g, "");
    return /^\d{10,15}$/.test(digits);
  }, "Please enter a valid phone number"),
  urgency: z.enum(["immediate", "this_week", "exploring"]),
  seekingFor: z.enum(["self", "loved_one", "professional"]),
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
    featured?: boolean;
  };
  facilityPlan?: "basic" | "professional" | "featured";
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
  facilityPlan = "basic",
  prefillData,
}: RequestInfoModalProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [nearbyFacilities, setNearbyFacilities] = useState<NearbyFacility[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: prefillData?.firstName || "",
    lastName: prefillData?.lastName || "",
    email: prefillData?.email || "",
    phone: prefillData?.phone || "",
    urgency: "exploring",
    seekingFor: "self",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Real-time validation
  const validation = useMemo(() => ({
    firstName: formData.firstName.trim().length >= 1,
    lastName: formData.lastName.trim().length >= 1,
    email: isValidEmail(formData.email),
    phone: isValidPhoneNumber(formData.phone),
  }), [formData]);

  const isStep1Valid = formData.urgency && formData.seekingFor;
  const isStep2Valid = validation.firstName && validation.lastName && validation.email && validation.phone;

  // Determine lead type based on plan
  const leadType = facilityPlan === "featured" ? "exclusive" : "shared";
  const isPaidPlan = facilityPlan === "featured" || facilityPlan === "professional";

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
      setCurrentStep(1);
      if (!prefillData) {
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          urgency: "exploring",
          seekingFor: "self",
          message: "",
        });
      }
      setErrors({});
    }
  }, [open, prefillData]);

  // Fetch nearby facilities when submitted
  const fetchNearbyFacilities = async () => {
    if (facilityPlan === "featured") {
      // Don't show competitors for Featured plans
      return;
    }
    
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
          facilityPlan,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          message: formData.message?.trim() || null,
          urgency: formData.urgency,
          seekingFor: formData.seekingFor,
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
        urgency: formData.urgency,
        seekingFor: formData.seekingFor,
        leadType,
        facilityPlan,
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
    trackAnalyticsEvent("nearby_facility_click", nearbyFacility.id, {
      fromFacilityId: facility.id,
      fromFacilityName: facility.name,
      targetFacilityName: nearbyFacility.name,
      isFeatured: nearbyFacility.featured,
    });
    
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

  const urgencyOptions = [
    { value: "immediate", label: "Immediate - Need help today", icon: Clock, color: "text-red-500" },
    { value: "this_week", label: "This week", icon: Clock, color: "text-amber-500" },
    { value: "exploring", label: "Just exploring options", icon: Heart, color: "text-blue-500" },
  ];

  const seekingOptions = [
    { value: "self", label: "For myself" },
    { value: "loved_one", label: "For a loved one" },
    { value: "professional", label: "I'm a healthcare professional" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {!isSubmitted ? (
          <>
            {/* Header */}
            <div className={cn(
              "px-6 pt-6 pb-4 border-b border-border",
              facilityPlan === "featured" && "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20"
            )}>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {facility.logo_url ? (
                    <img 
                      src={facility.logo_url} 
                      alt={facility.name} 
                      className="h-12 w-12 rounded-lg object-contain border border-border bg-white"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-display font-bold text-primary">{getInitials(facility.name)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-lg font-semibold truncate">
                      {facility.name}
                    </DialogTitle>
                    <DialogDescription className="text-sm flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {facility.city}, {facility.state}
                    </DialogDescription>
                  </div>
                  {facilityPlan === "featured" && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1 shrink-0">
                      <Crown className="h-3 w-3" />
                      Featured
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              {/* Trust indicators */}
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-green-600" />
                  <span>Confidential</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Response within 24h</span>
                </div>
                {facilityPlan === "featured" && (
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Priority response</span>
                  </div>
                )}
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Step Indicator */}
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-full text-sm font-semibold transition-colors",
                  currentStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  1
                </div>
                <div className={cn(
                  "flex-1 h-1 rounded-full transition-colors",
                  currentStep >= 2 ? "bg-primary" : "bg-muted"
                )} />
                <div className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-full text-sm font-semibold transition-colors",
                  currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  2
                </div>
              </div>

              {currentStep === 1 ? (
                <>
                  {/* Step 1: Qualification */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">How urgent is your need?</Label>
                      <div className="space-y-2">
                        {urgencyOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, urgency: option.value as FormData["urgency"] })}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                              formData.urgency === option.value
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                            )}
                          >
                            <option.icon className={cn("h-5 w-5", option.color)} />
                            <span className="text-sm font-medium">{option.label}</span>
                            {formData.urgency === option.value && (
                              <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Who is seeking help?</Label>
                      <Select
                        value={formData.seekingFor}
                        onValueChange={(value) => setFormData({ ...formData, seekingFor: value as FormData["seekingFor"] })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select one..." />
                        </SelectTrigger>
                        <SelectContent>
                          {seekingOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="w-full gap-2"
                    size="lg"
                    disabled={!isStep1Valid}
                    onClick={() => setCurrentStep(2)}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  {/* Step 2: Contact Details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="firstName" className="text-sm">First Name *</Label>
                        <div className="relative mt-1">
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) =>
                              setFormData({ ...formData, firstName: e.target.value })
                            }
                            placeholder="John"
                            className={cn(
                              errors.firstName && "border-destructive",
                              validation.firstName && formData.firstName && "pr-10"
                            )}
                          />
                          {validation.firstName && formData.firstName && !errors.firstName && (
                            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                          )}
                        </div>
                        {errors.firstName && (
                          <p className="text-xs text-destructive mt-1">{errors.firstName}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-sm">Last Name *</Label>
                        <div className="relative mt-1">
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) =>
                              setFormData({ ...formData, lastName: e.target.value })
                            }
                            placeholder="Doe"
                            className={cn(
                              errors.lastName && "border-destructive",
                              validation.lastName && formData.lastName && "pr-10"
                            )}
                          />
                          {validation.lastName && formData.lastName && !errors.lastName && (
                            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                          )}
                        </div>
                        {errors.lastName && (
                          <p className="text-xs text-destructive mt-1">{errors.lastName}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-sm">Phone Number *</Label>
                      <div className="relative mt-1">
                        <PhoneInput
                          id="phone"
                          value={formData.phone}
                          onChange={(value) =>
                            setFormData({ ...formData, phone: value })
                          }
                          className={cn(
                            errors.phone && "border-destructive",
                            validation.phone && "pr-10"
                          )}
                        />
                        {validation.phone && !errors.phone && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                        )}
                      </div>
                      {errors.phone && (
                        <p className="text-xs text-destructive mt-1">{errors.phone}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-sm">Email *</Label>
                      <div className="relative mt-1">
                        <EmailInput
                          id="email"
                          value={formData.email}
                          onChange={(value) =>
                            setFormData({ ...formData, email: value })
                          }
                          placeholder="john@example.com"
                          className={cn(
                            errors.email && "border-destructive",
                            validation.email && formData.email && "pr-10"
                          )}
                        />
                        {validation.email && formData.email && !errors.email && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                        )}
                      </div>
                      {errors.email && (
                        <p className="text-xs text-destructive mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="message" className="text-sm">Additional Details (Optional)</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        placeholder="Tell us about your situation or any questions you have..."
                        rows={3}
                        className="resize-none mt-1"
                      />
                    </div>
                  </div>

                  {/* Privacy notice */}
                  <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
                    <Shield className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Your information is confidential and will only be shared with{" "}
                      <strong>{facility.name}</strong>
                      {facilityPlan === "professional" && " and may be shared with one additional trusted provider"} to help connect you with treatment options.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setCurrentStep(1)}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-[2] gap-2"
                      size="lg"
                      disabled={isSubmitting || !isStep2Valid}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Request Call Back
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </>
        ) : (
          <div className="p-6">
            {/* Success Header */}
            <div className="text-center mb-6">
              <div className={cn(
                "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full",
                facilityPlan === "featured" 
                  ? "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30" 
                  : "bg-success/10"
              )}>
                <CheckCircle className={cn(
                  "h-8 w-8",
                  facilityPlan === "featured" ? "text-amber-600" : "text-success"
                )} />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Request Sent Successfully!
              </h2>
              <p className="text-muted-foreground text-sm">
                {submittedData?.firstName}, your request has been sent to{" "}
                <strong>{facility.name}</strong>. 
                {facilityPlan === "featured" 
                  ? " As a Featured provider, they prioritize quick responses." 
                  : " They may contact you within 24 hours."}
              </p>
            </div>

            {/* Featured provider exclusive badge */}
            {facilityPlan === "featured" && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 text-center">
                <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300">
                  <Crown className="h-4 w-4" />
                  <span className="text-sm font-semibold">Your lead is exclusive to this provider</span>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Your information will only be shared with {facility.name}
                </p>
              </div>
            )}

            {/* Shared lead notice for Professional */}
            {facilityPlan === "professional" && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-semibold">Matched with trusted providers</span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  To help you faster, your request may also be shared with one additional qualified provider in your area
                </p>
              </div>
            )}

            {/* Nearby Facilities Section (only for non-featured) */}
            {facilityPlan !== "featured" && (loadingNearby || nearbyFacilities.length > 0) && (
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
                  <span className="font-bold text-foreground">Need help urgently?</span>
                  <br />
                  Complete this request and we'll prioritize connecting you based on your needs.
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
