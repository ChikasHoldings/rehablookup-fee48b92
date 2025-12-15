import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { 
  Save, 
  Building2, 
  Phone, 
  Globe, 
  FileText, 
  CheckCircle,
  MapPin,
  Mail,
  Users,
  Bed,
  Eye,
  ArrowUpRight,
  Shield,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  Plus,
  X,
  Loader2,
  Stethoscope,
  CreditCard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FacilityImageUpload } from "@/components/provider/FacilityImageUpload";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";

interface Facility {
  id: string;
  user_id: string;
  name: string;
  slug: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string | null;
  reply_email: string | null;
  website: string | null;
  description: string | null;
  facility_type: string;
  gender_served: string | null;
  bed_count: string | null;
  status: string;
  featured: boolean;
  logo_url: string | null;
  gallery_urls: string[] | null;
}

const facilityTypes = [
  "Residential Treatment",
  "Outpatient Program",
  "Detox Center",
  "Sober Living",
  "Dual Diagnosis",
  "Luxury Rehab",
];

const genderOptions = [
  { value: "all", label: "All Genders" },
  { value: "male", label: "Men Only" },
  { value: "female", label: "Women Only" },
];

const states = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const availableServices = [
  "Detox Programs",
  "Inpatient Treatment",
  "Outpatient Treatment",
  "Medication-Assisted Treatment (MAT)",
  "Dual Diagnosis",
  "Individual Therapy",
  "Group Therapy",
  "Family Therapy",
  "Cognitive Behavioral Therapy (CBT)",
  "12-Step Programs",
  "Holistic Therapy",
  "Aftercare Planning",
  "Relapse Prevention",
  "Trauma Therapy",
  "Mental Health Services",
];

const availableInsurance = [
  "Aetna",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "United Healthcare",
  "Medicare",
  "Medicaid",
  "Tricare",
  "Self-Pay",
  "Private Pay",
  "Sliding Scale",
];

// Validation schema for required fields
const validateField = (field: string, value: string | null): string | null => {
  const trimmedValue = value?.trim() || "";
  
  switch (field) {
    case "name":
      if (!trimmedValue) return "Facility name is required";
      if (trimmedValue.length < 2) return "Name must be at least 2 characters";
      if (trimmedValue.length > 100) return "Name must be less than 100 characters";
      return null;
    case "facility_type":
      if (!trimmedValue) return "Facility type is required";
      return null;
    case "address":
      if (!trimmedValue) return "Street address is required";
      if (trimmedValue.length > 200) return "Address must be less than 200 characters";
      return null;
    case "city":
      if (!trimmedValue) return "City is required";
      if (trimmedValue.length > 100) return "City must be less than 100 characters";
      return null;
    case "state":
      if (!trimmedValue) return "State is required";
      return null;
    case "zip_code":
      if (!trimmedValue) return "ZIP code is required";
      if (!/^\d{5}(-\d{4})?$/.test(trimmedValue)) return "Enter a valid ZIP code (e.g., 12345)";
      return null;
    case "phone":
      if (!trimmedValue) return "Phone number is required";
      if (!/^[\d\s\-\(\)\+]{10,}$/.test(trimmedValue)) return "Enter a valid phone number";
      return null;
    case "email":
      if (trimmedValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
        return "Enter a valid email address";
      }
      return null;
    case "reply_email":
      if (trimmedValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
        return "Enter a valid email address";
      }
      return null;
    case "website":
      if (trimmedValue && !/^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+/.test(trimmedValue)) {
        return "Enter a valid website URL";
      }
      return null;
    default:
      return null;
  }
};

export default function ProviderListingPage() {
  const queryClient = useQueryClient();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [newService, setNewService] = useState("");
  const [newInsurance, setNewInsurance] = useState("");
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { selectedFacility } = useSelectedFacility();

  // Fetch facility data with React Query
  const { data: facilityData, isLoading } = useQuery({
    queryKey: ["facility-listing", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return null;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data } = await supabase
        .from("facilities")
        .select("*")
        .eq("id", selectedFacility.id)
        .eq("user_id", session.user.id)
        .maybeSingle();

      return data;
    },
    enabled: !!selectedFacility?.id,
  });

  // Fetch services
  const { data: services = [], refetch: refetchServices } = useQuery({
    queryKey: ["facility-services", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data } = await supabase
        .from("facility_services")
        .select("id, service_name")
        .eq("facility_id", selectedFacility.id);
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  // Fetch insurance
  const { data: insurance = [], refetch: refetchInsurance } = useQuery({
    queryKey: ["facility-insurance", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data } = await supabase
        .from("facility_insurance")
        .select("id, insurance_name")
        .eq("facility_id", selectedFacility.id);
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  // Update local facility state when data changes
  useEffect(() => {
    if (facilityData) {
      setFacility(facilityData);
    }
  }, [facilityData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!selectedFacility?.id) return;

    const facilityChannel = supabase
      .channel(`facility-${selectedFacility.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facilities",
          filter: `id=eq.${selectedFacility.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["facility-listing", selectedFacility.id] });
        }
      )
      .subscribe();

    const servicesChannel = supabase
      .channel(`services-${selectedFacility.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facility_services",
          filter: `facility_id=eq.${selectedFacility.id}`,
        },
        () => {
          refetchServices();
        }
      )
      .subscribe();

    const insuranceChannel = supabase
      .channel(`insurance-${selectedFacility.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facility_insurance",
          filter: `facility_id=eq.${selectedFacility.id}`,
        },
        () => {
          refetchInsurance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(facilityChannel);
      supabase.removeChannel(servicesChannel);
      supabase.removeChannel(insuranceChannel);
    };
  }, [selectedFacility?.id, queryClient, refetchServices, refetchInsurance]);

  // Auto-save function (silent, no toast)
  const performAutoSave = useCallback(async () => {
    if (!facility || isSaving) return;
    
    // Check for validation errors silently - don't auto-save if there are errors
    const requiredFields = ["name", "facility_type", "address", "city", "state", "zip_code", "phone"];
    for (const field of requiredFields) {
      const error = validateField(field, facility[field as keyof Facility] as string | null);
      if (error) return; // Don't auto-save if required fields have errors
    }
    
    setIsAutoSaving(true);
    
    const { error } = await supabase
      .from("facilities")
      .update({
        name: facility.name,
        address: facility.address,
        city: facility.city,
        state: facility.state,
        zip_code: facility.zip_code,
        phone: facility.phone,
        email: facility.email,
        reply_email: facility.reply_email,
        website: facility.website,
        description: facility.description,
        facility_type: facility.facility_type,
        gender_served: facility.gender_served,
        bed_count: facility.bed_count,
        logo_url: facility.logo_url,
        gallery_urls: facility.gallery_urls,
      })
      .eq("id", facility.id);

    setIsAutoSaving(false);

    if (!error) {
      queryClient.setQueryData(["facility-listing", selectedFacility?.id], facility);
      // Invalidate all relevant queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["provider-data"] });
      queryClient.invalidateQueries({ queryKey: ["provider-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      setHasChanges(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
      
      // Show toast for auto-save to confirm public profile is updated
      toast({
        title: "Changes saved",
        description: "Your public profile has been updated and is now live.",
        action: facility.slug ? (
          <ToastAction altText="View Public Profile" asChild>
            <a href={`/center/${facility.slug}`} target="_blank" rel="noopener noreferrer">
              View Profile
            </a>
          </ToastAction>
        ) : undefined,
      });
    }
  }, [facility, isSaving, selectedFacility?.id, queryClient]);

  // Auto-save effect - triggers 3 seconds after last change
  useEffect(() => {
    if (hasChanges && facility) {
      // Clear any existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // Set new timer for auto-save after 3 seconds of inactivity
      autoSaveTimerRef.current = setTimeout(() => {
        performAutoSave();
      }, 3000);
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasChanges, facility, performAutoSave]);

  // Keyboard shortcut: Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !isSaving && !isAutoSaving) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, isSaving, isAutoSaving]);

  const handleSave = async () => {
    if (!facility) return;
    
    // Clear auto-save timer when manually saving
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Validate all fields before saving
    if (!validateAllFields()) {
      toast({
        title: "Validation Error",
        description: "Please fix the highlighted errors before saving.",
        variant: "destructive",
      });
      return;
    }
    
    // Optimistic update: immediately update cache and UI state
    const previousData = queryClient.getQueryData(["facility-listing", selectedFacility?.id]);
    
    // Optimistically update the cache
    queryClient.setQueryData(["facility-listing", selectedFacility?.id], facility);
    
    // Immediately show saved state for responsive feel
    setHasChanges(false);
    setShowSaved(true);
    setIsSaving(true);
    
    const { error } = await supabase
      .from("facilities")
      .update({
        name: facility.name,
        address: facility.address,
        city: facility.city,
        state: facility.state,
        zip_code: facility.zip_code,
        phone: facility.phone,
        email: facility.email,
        reply_email: facility.reply_email,
        website: facility.website,
        description: facility.description,
        facility_type: facility.facility_type,
        gender_served: facility.gender_served,
        bed_count: facility.bed_count,
        logo_url: facility.logo_url,
        gallery_urls: facility.gallery_urls,
      })
      .eq("id", facility.id);

    setIsSaving(false);

    if (error) {
      // Rollback on error
      queryClient.setQueryData(["facility-listing", selectedFacility?.id], previousData);
      setFacility(previousData as Facility | null);
      setHasChanges(true);
      setShowSaved(false);
      toast({
        title: "Error saving",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } else {
      // Invalidate all relevant queries to update in real-time across the app
      queryClient.invalidateQueries({ queryKey: ["provider-data"] });
      queryClient.invalidateQueries({ queryKey: ["provider-facilities"] }); // Header dropdown
      queryClient.invalidateQueries({ queryKey: ["facility-services-count", selectedFacility?.id] });
      queryClient.invalidateQueries({ queryKey: ["facility-insurance-count", selectedFacility?.id] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] }); // Public cards
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] }); // Public profile
      setTimeout(() => setShowSaved(false), 2000);
      toast({
        title: "Profile updated",
        description: "Your public profile is now live with the latest changes.",
        action: facility.slug ? (
          <ToastAction altText="View Public Profile" asChild>
            <a href={`/center/${facility.slug}`} target="_blank" rel="noopener noreferrer">
              View Profile
            </a>
          </ToastAction>
        ) : undefined,
      });
    }
  };

  const handleLogoChange = (images: string[]) => {
    if (facility) {
      setFacility({ ...facility, logo_url: images[0] || null });
      setHasChanges(true);
    }
  };

  const handleGalleryChange = (images: string[]) => {
    if (facility) {
      setFacility({ ...facility, gallery_urls: images });
      setHasChanges(true);
    }
  };

  const updateField = (field: keyof Facility, value: string | null) => {
    if (facility) {
      setFacility({ ...facility, [field]: value });
      setHasChanges(true);
      
      // Validate on change if field has been touched
      if (touchedFields.has(field)) {
        const error = validateField(field, value);
        setFieldErrors(prev => ({ ...prev, [field]: error }));
      }
    }
  };

  const handleFieldBlur = (field: string, value: string | null) => {
    setTouchedFields(prev => new Set(prev).add(field));
    const error = validateField(field, value);
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateAllFields = (): boolean => {
    if (!facility) return false;
    
    const requiredFields = ["name", "facility_type", "address", "city", "state", "zip_code", "phone"];
    const errors: Record<string, string | null> = {};
    let isValid = true;
    
    requiredFields.forEach(field => {
      const error = validateField(field, facility[field as keyof Facility] as string | null);
      errors[field] = error;
      if (error) isValid = false;
    });
    
    // Also validate optional fields for format
    const optionalFields = ["email", "website"];
    optionalFields.forEach(field => {
      const error = validateField(field, facility[field as keyof Facility] as string | null);
      errors[field] = error;
      if (error) isValid = false;
    });
    
    setFieldErrors(errors);
    setTouchedFields(new Set([...requiredFields, ...optionalFields]));
    
    return isValid;
  };

  // Add service
  const handleAddService = async (serviceName: string) => {
    if (!facility || !serviceName.trim()) return;
    
    const { error } = await supabase
      .from("facility_services")
      .insert({ facility_id: facility.id, service_name: serviceName.trim() });

    if (error) {
      toast({ title: "Failed to add service", variant: "destructive" });
    } else {
      setNewService("");
      refetchServices();
      // Invalidate all relevant queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["facility-services-count", facility.id] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      toast({ title: "Service added" });
    }
  };

  // Remove service
  const handleRemoveService = async (serviceId: string) => {
    const { error } = await supabase
      .from("facility_services")
      .delete()
      .eq("id", serviceId);

    if (error) {
      toast({ title: "Failed to remove service", variant: "destructive" });
    } else {
      refetchServices();
      if (facility) {
        queryClient.invalidateQueries({ queryKey: ["facility-services-count", facility.id] });
        queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
        queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      }
    }
  };

  // Add insurance
  const handleAddInsurance = async (insuranceName: string) => {
    if (!facility || !insuranceName.trim()) return;
    
    const { error } = await supabase
      .from("facility_insurance")
      .insert({ facility_id: facility.id, insurance_name: insuranceName.trim() });

    if (error) {
      toast({ title: "Failed to add insurance", variant: "destructive" });
    } else {
      setNewInsurance("");
      refetchInsurance();
      // Invalidate all relevant queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["facility-insurance-count", facility.id] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      toast({ title: "Insurance added" });
    }
  };

  // Remove insurance
  const handleRemoveInsurance = async (insuranceId: string) => {
    const { error } = await supabase
      .from("facility_insurance")
      .delete()
      .eq("id", insuranceId);

    if (error) {
      toast({ title: "Failed to remove insurance", variant: "destructive" });
    } else {
      refetchInsurance();
      if (facility) {
        queryClient.invalidateQueries({ queryKey: ["facility-insurance-count", facility.id] });
        queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
        queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      }
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "approved":
        return { 
          label: "Live", 
          description: "Your listing is visible to families searching for treatment",
          icon: CheckCircle, 
          variant: "default" as const,
          className: "bg-green-500/10 text-green-700 border-green-200"
        };
      case "pending":
        return { 
          label: "Under Review", 
          description: "Our team is reviewing your listing. This usually takes 24-48 hours.",
          icon: Clock, 
          variant: "secondary" as const,
          className: "bg-amber-500/10 text-amber-700 border-amber-200"
        };
      default:
        return { 
          label: "Draft", 
          description: "Complete all required fields and submit for review",
          icon: AlertCircle, 
          variant: "outline" as const,
          className: "bg-muted text-muted-foreground border-border"
        };
    }
  };

  // Show loading state while data is being fetched OR while facility state is being initialized
  if (isLoading || (facilityData && !facility)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading your listing...</p>
        </div>
      </div>
    );
  }

  // Only show "No Listing Found" when we're sure there's no data (not loading and no facilityData)
  if (!isLoading && !facilityData && !facility) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">No Listing Found</h2>
        <p className="mt-2 text-muted-foreground">
          Create your facility listing to start receiving inquiries from families.
        </p>
        <Button asChild className="mt-6" size="lg">
          <Link to="/provider-signup">Create Your Listing</Link>
        </Button>
      </div>
    );
  }

  // If we still don't have facility data at this point, show loading
  if (!facility) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading your listing...</p>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(facility.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6 pb-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-foreground">My Listing</h1>
              <Badge className={`gap-1.5 ${statusConfig.className}`}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {statusConfig.description}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Auto-save indicator */}
            {isAutoSaving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Auto-saving...
              </span>
            )}
            {showSaved && !isAutoSaving && !hasChanges && (
              <span className="text-xs text-green-600 flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3" />
                Saved
              </span>
            )}
            {hasChanges && !isAutoSaving && (
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}
            
            {facility.slug && (
              <Button 
                variant="outline" 
                size="sm" 
                asChild
              >
                <a 
                  href={`/center/${facility.slug}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View Public Profile
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </Button>
            )}
            <Button 
              onClick={handleSave} 
              disabled={isSaving || isAutoSaving || !hasChanges} 
              size="sm"
              className="gap-2 min-w-[120px]"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Now"}
            </Button>
          </div>
        </div>

        {/* Main Content Grid - Reorder columns on mobile for better UX */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Forms (appears first on all screens) */}
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
            {/* Logo & Facility Photos */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Logo & Facility Photos</CardTitle>
                    <CardDescription className="text-xs">Upload your logo and gallery images to showcase your facility</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium">Facility Logo</Label>
                  <p className="text-xs text-muted-foreground">
                    Your logo will appear on your public profile and in search results.
                  </p>
                  <FacilityImageUpload
                    type="logo"
                    currentImages={facility.logo_url ? [facility.logo_url] : []}
                    userId={facility.user_id}
                    facilityId={facility.id}
                    onImagesChange={handleLogoChange}
                  />
                </div>

                <Separator />

                {/* Gallery Upload */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium">Facility Gallery</Label>
                  <p className="text-xs text-muted-foreground">
                    Upload up to 5 photos of your facility. The first image will be your primary gallery photo.
                  </p>
                  <FacilityImageUpload
                    type="gallery"
                    currentImages={facility.gallery_urls || []}
                    userId={facility.user_id}
                    facilityId={facility.id}
                    onImagesChange={handleGalleryChange}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Basic Information</CardTitle>
                    <CardDescription className="text-xs">Core details about your facility</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-medium">
                    Facility Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={facility.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    onBlur={(e) => handleFieldBlur("name", e.target.value)}
                    className={`h-10 ${fieldErrors.name && touchedFields.has("name") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {fieldErrors.name && touchedFields.has("name") && (
                    <p className="text-xs text-destructive">{fieldErrors.name}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-xs font-medium">
                    Facility Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={facility.facility_type}
                    onValueChange={(value) => {
                      updateField("facility_type", value);
                      handleFieldBlur("facility_type", value);
                    }}
                  >
                    <SelectTrigger className={`h-10 ${fieldErrors.facility_type && touchedFields.has("facility_type") ? "border-destructive focus-visible:ring-destructive" : ""}`}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      {facilityTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.facility_type && touchedFields.has("facility_type") && (
                    <p className="text-xs text-destructive">{fieldErrors.facility_type}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={facility.description || ""}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={4}
                    placeholder="Describe your facility, treatment approach, and what makes you unique..."
                    className="resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be displayed on your public profile.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Location</CardTitle>
                    <CardDescription className="text-xs">Where families can find you</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-xs font-medium">
                    Street Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="address"
                    value={facility.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    onBlur={(e) => handleFieldBlur("address", e.target.value)}
                    className={`h-10 ${fieldErrors.address && touchedFields.has("address") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {fieldErrors.address && touchedFields.has("address") && (
                    <p className="text-xs text-destructive">{fieldErrors.address}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-xs font-medium">
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="city"
                      value={facility.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      onBlur={(e) => handleFieldBlur("city", e.target.value)}
                      className={`h-10 ${fieldErrors.city && touchedFields.has("city") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {fieldErrors.city && touchedFields.has("city") && (
                      <p className="text-xs text-destructive">{fieldErrors.city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-xs font-medium">
                      State <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={facility.state}
                      onValueChange={(value) => {
                        updateField("state", value);
                        handleFieldBlur("state", value);
                      }}
                    >
                      <SelectTrigger className={`h-10 ${fieldErrors.state && touchedFields.has("state") ? "border-destructive focus-visible:ring-destructive" : ""}`}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-card max-h-[200px]">
                        {states.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.state && touchedFields.has("state") && (
                      <p className="text-xs text-destructive">{fieldErrors.state}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip" className="text-xs font-medium">
                      ZIP Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="zip"
                      value={facility.zip_code}
                      onChange={(e) => updateField("zip_code", e.target.value)}
                      onBlur={(e) => handleFieldBlur("zip_code", e.target.value)}
                      className={`h-10 ${fieldErrors.zip_code && touchedFields.has("zip_code") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {fieldErrors.zip_code && touchedFields.has("zip_code") && (
                      <p className="text-xs text-destructive">{fieldErrors.zip_code}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                    <CardDescription className="text-xs">How families can reach you</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-medium">
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={facility.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        onBlur={(e) => handleFieldBlur("phone", e.target.value)}
                        className={`h-10 pl-10 ${fieldErrors.phone && touchedFields.has("phone") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    {fieldErrors.phone && touchedFields.has("phone") && (
                      <p className="text-xs text-destructive">{fieldErrors.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={facility.email || ""}
                        onChange={(e) => updateField("email", e.target.value)}
                        onBlur={(e) => handleFieldBlur("email", e.target.value)}
                        className={`h-10 pl-10 ${fieldErrors.email && touchedFields.has("email") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        placeholder="contact@facility.com"
                      />
                    </div>
                    {fieldErrors.email && touchedFields.has("email") && (
                      <p className="text-xs text-destructive">{fieldErrors.email}</p>
                    )}
                  </div>
                </div>
                
                {/* Reply Email - Important for lead communication */}
                <div className="space-y-2">
                  <Label htmlFor="reply_email" className="text-xs font-medium">
                    Reply Email <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reply_email"
                      type="email"
                      value={facility.reply_email || ""}
                      onChange={(e) => updateField("reply_email", e.target.value)}
                      onBlur={(e) => handleFieldBlur("reply_email", e.target.value)}
                      className={`h-10 pl-10 ${fieldErrors.reply_email && touchedFields.has("reply_email") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      placeholder="replies@facility.com"
                    />
                  </div>
                  {fieldErrors.reply_email && touchedFields.has("reply_email") && (
                    <p className="text-xs text-destructive">{fieldErrors.reply_email}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Replies from leads will be sent to this email address.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-xs font-medium">
                    Website
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      type="url"
                      value={facility.website || ""}
                      onChange={(e) => updateField("website", e.target.value)}
                      onBlur={(e) => handleFieldBlur("website", e.target.value)}
                      placeholder="https://www.yourfacility.com"
                      className={`h-10 pl-10 ${fieldErrors.website && touchedFields.has("website") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                  </div>
                  {fieldErrors.website && touchedFields.has("website") && (
                    <p className="text-xs text-destructive">{fieldErrors.website}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Program Details */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Program Details</CardTitle>
                    <CardDescription className="text-xs">Treatment capacity and demographics</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-xs font-medium">
                      <Users className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      Population Served
                    </Label>
                    <Select
                      value={facility.gender_served || "all"}
                      onValueChange={(value) => updateField("gender_served", value)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-card">
                        {genderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="beds" className="text-xs font-medium">
                      <Bed className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      Bed Count / Capacity
                    </Label>
                    <Input
                      id="beds"
                      value={facility.bed_count || ""}
                      onChange={(e) => updateField("bed_count", e.target.value)}
                      placeholder="e.g., 24"
                      className="h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services Offered */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <Stethoscope className="h-4 w-4 text-teal-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Services Offered</CardTitle>
                    <CardDescription className="text-xs">Treatment programs and therapies available</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Services */}
                {services.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <Badge 
                        key={service.id} 
                        variant="secondary" 
                        className="gap-1.5 pr-1.5 py-1"
                      >
                        {service.service_name}
                        <button
                          onClick={() => handleRemoveService(service.id)}
                          className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add Service */}
                <div className="flex gap-2">
                  <Select value={newService} onValueChange={setNewService}>
                    <SelectTrigger className="h-10 flex-1">
                      <SelectValue placeholder="Select a service to add..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card max-h-[200px]">
                      {availableServices
                        .filter(s => !services.some(existing => existing.service_name === s))
                        .map((service) => (
                          <SelectItem key={service} value={service}>
                            {service}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => handleAddService(newService)}
                    disabled={!newService}
                    size="icon"
                    className="h-10 w-10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Add the treatment services your facility offers to help families find the right care.
                </p>
              </CardContent>
            </Card>

            {/* Insurance Accepted */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Insurance Accepted</CardTitle>
                    <CardDescription className="text-xs">Payment options and insurance providers</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Insurance */}
                {insurance.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {insurance.map((ins) => (
                      <Badge 
                        key={ins.id} 
                        variant="secondary" 
                        className="gap-1.5 pr-1.5 py-1"
                      >
                        {ins.insurance_name}
                        <button
                          onClick={() => handleRemoveInsurance(ins.id)}
                          className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add Insurance */}
                <div className="flex gap-2">
                  <Select value={newInsurance} onValueChange={setNewInsurance}>
                    <SelectTrigger className="h-10 flex-1">
                      <SelectValue placeholder="Select insurance to add..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card max-h-[200px]">
                      {availableInsurance
                        .filter(i => !insurance.some(existing => existing.insurance_name === i))
                        .map((ins) => (
                          <SelectItem key={ins} value={ins}>
                            {ins}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => handleAddInsurance(newInsurance)}
                    disabled={!newInsurance}
                    size="icon"
                    className="h-10 w-10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Let families know which insurance providers you accept.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar (appears second on mobile, first position doesn't matter due to order) */}
          <div className="space-y-6 order-1 lg:order-2">
            {/* Status Card - Not sticky on mobile to prevent overlap */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Listing Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    facility.status === 'approved' ? 'bg-green-500/10' : 
                    facility.status === 'pending' ? 'bg-amber-500/10' : 'bg-muted'
                  }`}>
                    <StatusIcon className={`h-4 w-4 ${
                      facility.status === 'approved' ? 'text-green-600' : 
                      facility.status === 'pending' ? 'text-amber-600' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{statusConfig.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {facility.status === 'approved' ? 'Visible to families' : 
                       facility.status === 'pending' ? 'Under review' : 'Not published'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Visibility</span>
                    <span className="font-medium">
                      {facility.status === 'approved' ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Listing Type</span>
                    <span className="font-medium">Standard</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Need Help?</p>
                  <p className="text-xs text-muted-foreground">
                    Contact our support team for assistance with your listing.
                  </p>
                  <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                    <Link to="/provider-support">Contact Support</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="bg-primary/5 border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Optimization Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span>Add a detailed description to improve visibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span>Keep contact information up to date</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span>Respond to inquiries within 24 hours</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Save Button at the end of the page */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !hasChanges} 
            size="lg"
            className="gap-2 min-w-[160px]"
          >
            {showSaved ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Saved Successfully
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </>
            )}
        </Button>
      </div>
      </div>
    </div>
  );
}
