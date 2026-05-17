import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";
import { useFacilityLimits } from "@/hooks/useFacilityLimits";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { cn } from "@/lib/utils";
import { US_STATES, FACILITY_TYPES } from "@/lib/facilityConstants";
import { sanitizeFacilityPayload, validateYearEstablished } from "@/lib/facilitySanitization";

interface FacilityFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
  facility_type: string;
  description: string;
}

const initialFormData: FacilityFormData = {
  name: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  phone: "",
  email: "",
  website: "",
  facility_type: "",
  description: "",
};

export default function AddLocationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { facilities } = useProviderFacilities();
  const { limit: locationLimit, used: usedLocations, canAddMore, planTier, isLoading: limitsLoading } = useFacilityLimits();
  const isPro = planTier === "pro";
  
  const [formData, setFormData] = useState<FacilityFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  // Ref-based guard prevents double-submit in React 18 concurrent mode where
  // the same event handler can fire before the state update commits.
  const submittingRef = useRef(false);
  
  // Zipcode auto-detection
  const { data: zipcodeData, isLoading: isLookingUp, error: lookupError, lookup } = useZipcodeLookup();
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const [lookupTimeout, setLookupTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = (field: keyof FacilityFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle zipcode change with auto-detection
  const handleZipcodeChange = useCallback((value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 5);
    setFormData(prev => ({ ...prev, zip_code: cleanValue }));
    setHasAutoFilled(false);

    // Clear previous timeout
    if (lookupTimeout) {
      clearTimeout(lookupTimeout);
    }

    // Trigger lookup when 5 digits entered
    if (cleanValue.length === 5) {
      const timeout = setTimeout(() => {
        lookup(cleanValue);
      }, 300);
      setLookupTimeout(timeout);
    }
  }, [lookup, lookupTimeout]);

  // Auto-fill city and state when zipcode data is available
  useEffect(() => {
    if (zipcodeData && !hasAutoFilled) {
      setFormData(prev => ({
        ...prev,
        city: zipcodeData.city,
        state: zipcodeData.state,
      }));
      setHasAutoFilled(true);
    }
  }, [zipcodeData, hasAutoFilled]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (lookupTimeout) {
        clearTimeout(lookupTimeout);
      }
    };
  }, [lookupTimeout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ref-based guard is checked first to prevent double-submit in React 18
    // concurrent mode where state updates may not have committed yet.
    if (submittingRef.current || isSubmitting) return;
    
    if (!canAddMore) {
      toast({
        variant: "destructive",
        title: "Location Limit Reached",
        description: "Please upgrade your plan to add more locations.",
      });
      return;
    }

    // Validate required fields
    if (!formData.name || !formData.address || !formData.city || !formData.state || 
        !formData.zip_code || !formData.phone || !formData.facility_type) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields.",
      });
      return;
    }

    // Set both the ref (synchronous, immediate) and state (triggers re-render to
    // disable the submit button). The ref is the authoritative guard; state drives UI.
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const session = await getCachedSession();
      
      if (!session) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Please log in again to continue.",
        });
        navigate("/login");
        return;
      }

      // Sanitize and validate all inputs before DB insert
      let sanitizedPayload: Record<string, unknown>;
      try {
        sanitizedPayload = sanitizeFacilityPayload({
          name: formData.name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          phone: formData.phone,
          email: formData.email || null,
          website: formData.website || null,
          facility_type: formData.facility_type,
          description: formData.description || null,
        });
      } catch (validationErr: any) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: validationErr.message || "Please check your facility information.",
        });
        return;
      }

      // Create new facility
      const { data: newFacility, error } = await supabase
        .from("facilities")
        .insert({
          user_id: session.user.id,
          name: sanitizedPayload.name as string,
          address: sanitizedPayload.address as string,
          city: sanitizedPayload.city as string,
          state: sanitizedPayload.state as string,
          zip_code: sanitizedPayload.zip_code as string,
          phone: sanitizedPayload.phone as string,
          email: sanitizedPayload.email as string | null,
          website: sanitizedPayload.website as string | null,
          facility_type: sanitizedPayload.facility_type as string,
          description: sanitizedPayload.description as string | null,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("[AddLocation] Facility creation error:", error);
        throw error;
      }

      // Invalidate queries to refresh facility list
      queryClient.invalidateQueries({ queryKey: ["provider-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["provider-data"] });

      setSuccess(true);
      
      toast({
        title: "Location Added!",
        description: "Your new facility has been submitted for review.",
      });

      // Navigate to listings page after short delay
      setTimeout(() => {
        navigate("/provider/listings");
      }, 2000);

    } catch (err: any) {
      console.error("[AddLocation] Unexpected error:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "Failed to add location. Please try again.",
      });
    } finally {
      // Always reset both guards so the form is never permanently locked,
      // regardless of which code path (success, validation error, network error) was taken.
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // If can't add more, show upgrade message — but only after limits have loaded to prevent
  // a false "Location Limit Reached" flash during the initial data-fetch on refresh.
  if (!limitsLoading && !canAddMore) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle className="text-xl">Location Limit Reached</CardTitle>
              <CardDescription className="text-base">
                Your {isPro ? "Pro" : "Basic"} account allows up to {locationLimit} location{locationLimit !== 1 ? 's' : ''}.
                You currently have {usedLocations} location{usedLocations !== 1 ? 's' : ''}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Upgrade to Pro ($99/mo) to list up to 5 facilities, with verified
                badge, lead analytics, priority placement, and Marketing Hub access.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
                <Button 
                  onClick={() => navigate("/provider/pro-upgrade")}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                >
                  Upgrade to Pro
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Location Added Successfully!</CardTitle>
              <CardDescription className="text-base">
                Your new facility has been submitted for review. We'll notify you once it's approved.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => navigate("/provider/listings")}>
                View My Listings
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Add New Location</h1>
          <p className="text-muted-foreground mt-1">
            Add a new facility location to your provider account.
          </p>
          {!limitsLoading && (
            <p className="text-sm text-muted-foreground mt-1">
              {usedLocations} of {locationLimit} location{locationLimit !== 1 ? 's' : ''} used
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Facility Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., Sunrise Recovery Center"
                  maxLength={200}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facility_type">Facility Type *</Label>
                <Select
                  value={formData.facility_type}
                  onValueChange={(value) => handleInputChange("facility_type", value)}
                >
                  <SelectTrigger id="facility_type">
                    <SelectValue placeholder="Select facility type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FACILITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Brief description of your facility..."
                  rows={3}
                  maxLength={2000}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="123 Main Street"
                  maxLength={300}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip_code">ZIP Code *</Label>
                <div className="relative">
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => handleZipcodeChange(e.target.value)}
                    placeholder="12345"
                    maxLength={5}
                    required
                  />
                  {isLookingUp && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {hasAutoFilled && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    City and state auto-filled
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => handleInputChange("state", value)}
                  >
                    <SelectTrigger id="state">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <PhoneInput
                  id="phone"
                  value={formData.phone}
                  onChange={(value) => handleInputChange("phone", value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="contact@facility.com"
                  maxLength={254}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">
                  <Globe className="h-4 w-4 inline mr-1" />
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="https://www.facility.com"
                  maxLength={500}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || limitsLoading}
              className="min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  Add Location
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
