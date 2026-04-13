import { useState, useEffect, useCallback } from "react";
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
import { useFacilityLimits } from "@/hooks/useFacilityLimits";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { cn } from "@/lib/utils";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

const FACILITY_TYPES = [
  { value: "Residential Treatment Center", label: "Residential Treatment Center" },
  { value: "Outpatient Program", label: "Outpatient Program" },
  { value: "Detox Center", label: "Detox Center" },
  { value: "Intensive Outpatient (IOP)", label: "Intensive Outpatient (IOP)" },
  { value: "Partial Hospitalization (PHP)", label: "Partial Hospitalization (PHP)" },
  { value: "Sober Living", label: "Sober Living" },
  { value: "Dual Diagnosis", label: "Dual Diagnosis" },
  { value: "Luxury Rehab", label: "Luxury Rehab" },
  { value: "Telehealth/Virtual", label: "Telehealth/Virtual" },
];

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
  const { limit: locationLimit, used: usedLocations, canAddMore, planTier } = useFacilityLimits();
  const isPro = planTier === "pro";
  
  const [formData, setFormData] = useState<FacilityFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
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
    
    // Prevent double submissions
    if (isSubmitting) return;
    
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

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Please log in again to continue.",
        });
        setIsSubmitting(false);
        navigate("/login");
        return;
      }

      // Create new facility
      const { data: newFacility, error } = await supabase
        .from("facilities")
        .insert({
          user_id: session.user.id,
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
          status: "pending", // All new facilities start as pending
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
      setIsSubmitting(false);
      
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
      setIsSubmitting(false);
    }
    // NOTE: No finally block - each path explicitly handles setIsSubmitting(false)
  };

  // If can't add more, show upgrade message
  if (!canAddMore) {
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
                Upgrade to Pro for up to 5 locations.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
                <Button onClick={() => navigate("/provider/pro-upgrade")}>
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
              <CardTitle className="text-xl">Location Submitted!</CardTitle>
              <CardDescription className="text-base">
                Your new facility has been submitted for review. Our team will review it within 24-48 hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => navigate("/provider/listings")}>
                Return to Listings
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Add New Location</h1>
            <p className="text-muted-foreground">
              Add another facility to your account ({usedLocations + 1} of {locationLimit})
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                Facility Information
              </CardTitle>
              <CardDescription>
                Enter the details for your new facility location.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Facility Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Recovery Center of California"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facility_type">Facility Type *</Label>
                  <Select
                    value={formData.facility_type}
                    onValueChange={(value) => handleInputChange("facility_type", value)}
                  >
                    <SelectTrigger>
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
              </div>

              {/* Address */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Location
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    required
                  />
                </div>

                {/* Enhanced ZIP Code with Auto-Detection */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="zip_code" className="flex items-center gap-2">
                      ZIP Code *
                      {isLookingUp && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                    </Label>
                    <div className="relative">
                      <Input
                        id="zip_code"
                        placeholder="Enter ZIP"
                        value={formData.zip_code}
                        onChange={(e) => handleZipcodeChange(e.target.value)}
                        className={cn(
                          "pr-10",
                          hasAutoFilled && "border-green-300"
                        )}
                        inputMode="numeric"
                        maxLength={5}
                        required
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isLookingUp ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : hasAutoFilled ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <MapPin className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </div>
                    </div>
                    {lookupError && (
                      <p className="text-xs text-amber-600">Enter city/state manually</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="flex items-center gap-2">
                      City *
                      {hasAutoFilled && <span className="text-xs text-green-600 font-normal">(auto-detected)</span>}
                    </Label>
                    <Input
                      id="city"
                      placeholder={isLookingUp ? "Detecting..." : "City"}
                      value={formData.city}
                      onChange={(e) => {
                        handleInputChange("city", e.target.value);
                        setHasAutoFilled(false);
                      }}
                      className={cn(
                        hasAutoFilled && "bg-green-50/50 border-green-200 dark:bg-green-950/20"
                      )}
                      disabled={isLookingUp}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="flex items-center gap-2">
                      State *
                      {hasAutoFilled && <span className="text-xs text-green-600 font-normal">(auto-detected)</span>}
                    </Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => {
                        handleInputChange("state", value);
                        setHasAutoFilled(false);
                      }}
                      disabled={isLookingUp}
                    >
                      <SelectTrigger className={cn(
                        hasAutoFilled && "bg-green-50/50 border-green-200 dark:bg-green-950/20"
                      )}>
                        <SelectValue placeholder={isLookingUp ? "Detecting..." : "Select state"} />
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
                
                {hasAutoFilled && (
                  <p className="text-xs text-green-600 flex items-center gap-1 animate-fade-in">
                    <CheckCircle2 className="h-3 w-3" />
                    City and state auto-detected from ZIP code
                  </p>
                )}
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  Contact Information
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <PhoneInput
                      id="phone"
                      value={formData.phone}
                      onChange={(value) => handleInputChange("phone", value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="info@facility.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website (optional)</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      placeholder="https://www.yourfacility.com"
                      className="pl-10"
                      value={formData.website}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell families about this facility, its programs, and what makes it unique..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  You can add more details like services, insurance, and images after the facility is approved.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Add Location
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
