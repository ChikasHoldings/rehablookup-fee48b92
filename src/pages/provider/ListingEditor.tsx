import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { 
  Building2, 
  Phone, 
  Globe, 
  CheckCircle,
  MapPin,
  Mail,
  Users,
  Bed,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  Loader2,
  Stethoscope,
  CreditCard,
  ShieldCheck,
  Send,
  Info,
  Save,
  Eye,
  ArrowUpRight,
  Sparkles,
  X,
  CircleCheck,
  CircleDashed,
  Users2
} from "lucide-react";
import { MultiSelectDropdown } from "@/components/search/MultiSelectDropdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FacilityImageUpload } from "@/components/provider/FacilityImageUpload";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { ProviderTrustForm } from "@/components/provider/ProviderTrustForm";

import { useProStatus } from "@/hooks/useProStatus";
import { cn } from "@/lib/utils";
import {
  ListingTagChip,
  ListingFloatingSaveBar,
  ListingFormField,
  StaffManagementSection
} from "@/components/provider/listing";

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
  reply_email_verified: boolean | null;
  reply_email_verified_at: string | null;
  website: string | null;
  description: string | null;
  facility_type: string;
  gender_served: string | null;
  bed_count: string | null;
  status: string;
  featured: boolean;
  logo_url: string | null;
  gallery_urls: string[] | null;
  year_established: number | null;
  accepts_international_patients: boolean | null;
}

import {
  FACILITY_TYPE_VALUES,
  GENDER_OPTIONS,
  US_STATES,
  TREATMENT_SERVICES,
  AGE_GROUPS,
  INSURANCE_PROVIDERS,
} from "@/lib/facilityConstants";

const DESCRIPTION_MAX_LENGTH = 2000;

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

// Local aliases
const TagChip = ListingTagChip;
const FormField = ListingFormField;

// Tab definitions for the new design
const EDITOR_TABS = [
  { id: "photos", label: "Media", icon: ImageIcon },
  { id: "basic", label: "Details", icon: Building2 },
  { id: "location", label: "Location", icon: MapPin },
  { id: "contact", label: "Contact", icon: Phone },
  { id: "program", label: "Program", icon: Users },
  { id: "services", label: "Services", icon: Stethoscope },
  { id: "insurance", label: "Insurance", icon: CreditCard },
  { id: "ageGroups", label: "Age Groups", icon: Users },
  { id: "trust", label: "Credentials", icon: ShieldCheck },
  { id: "staff", label: "Team", icon: Users2 },
] as const;

type EditorTab = typeof EDITOR_TABS[number]["id"];

interface ListingEditorProps {
  facilityId?: string;
}

export default function ListingEditor({ facilityId: propFacilityId }: ListingEditorProps = {}) {
  const queryClient = useQueryClient();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [activeTab, setActiveTab] = useState<EditorTab>(() => {
    const saved = localStorage.getItem('provider-listing-active-tab');
    return (saved as EditorTab) || "photos";
  });

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem('provider-listing-active-tab', activeTab);
  }, [activeTab]);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevFacilityIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  const { selectedFacility, setHasUnsavedChanges } = useSelectedFacility();
  
  // Use prop facilityId if provided, otherwise use selectedFacility
  const currentFacilityId = propFacilityId || selectedFacility?.id;
  const { data: proStatus } = useProStatus(currentFacilityId);
  
  // All providers can upload up to 10 gallery images
  const galleryLimit = 10;

  // Reset state when facility changes
  useEffect(() => {
    if (currentFacilityId && prevFacilityIdRef.current !== currentFacilityId) {
      // Clear any pending auto-save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      
      // Reset form state
      setFacility(null);
      setHasChanges(false);
      setShowSaved(false);
      setTouchedFields(new Set());
      setFieldErrors({});
      setVerificationCode("");
      setCodeSent(false);
      setVerificationError(null);
      setHasUnsavedChanges(false);
      
      prevFacilityIdRef.current = currentFacilityId;
    }
  }, [currentFacilityId, setHasUnsavedChanges]);

  // Sync hasChanges to context
  useEffect(() => {
    setHasUnsavedChanges(hasChanges);
  }, [hasChanges, setHasUnsavedChanges]);

  // Reply email verification state
  const [verificationCode, setVerificationCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Fetch facility data with React Query
  const { data: facilityData, isLoading } = useQuery({
    queryKey: ["facility-listing", currentFacilityId],
    queryFn: async () => {
      if (!currentFacilityId) return null;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data } = await supabase
        .from("facilities")
        .select("id, user_id, name, slug, address, city, state, zip_code, phone, email, reply_email, reply_email_verified, reply_email_verified_at, website, description, facility_type, gender_served, bed_count, status, featured, logo_url, gallery_urls, year_established, accepts_international_patients")
        .eq("id", currentFacilityId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      return data;
    },
    enabled: !!currentFacilityId,
  });

  // Fetch services
  const { data: services = [], refetch: refetchServices } = useQuery({
    queryKey: ["facility-services", currentFacilityId],
    queryFn: async () => {
      if (!currentFacilityId) return [];
      const { data } = await supabase
        .from("facility_services")
        .select("id, service_name")
        .eq("facility_id", currentFacilityId);
      return data || [];
    },
    enabled: !!currentFacilityId,
  });

  // Fetch insurance
  const { data: insurance = [], refetch: refetchInsurance } = useQuery({
    queryKey: ["facility-insurance", currentFacilityId],
    queryFn: async () => {
      if (!currentFacilityId) return [];
      const { data } = await supabase
        .from("facility_insurance")
        .select("id, insurance_name")
        .eq("facility_id", currentFacilityId);
      return data || [];
    },
    enabled: !!currentFacilityId,
  });

  // Fetch age groups
  const { data: ageGroups = [], refetch: refetchAgeGroups } = useQuery({
    queryKey: ["facility-age-groups", currentFacilityId],
    queryFn: async () => {
      if (!currentFacilityId) return [];
      const { data } = await supabase
        .from("facility_age_groups")
        .select("id, age_group")
        .eq("facility_id", currentFacilityId);
      return data || [];
    },
    enabled: !!currentFacilityId,
  });

  // Fetch provider profile email (for reply email default)
  const { data: profileData } = useQuery({
    queryKey: ["provider-profile"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", session.user.id)
        .maybeSingle();
      return data;
    },
  });
  
  const profileEmail = profileData?.email || "";

  // Check if the current reply email needs verification
  const needsReplyEmailVerification = useMemo(() => {
    if (!facility?.reply_email) return false;
    const replyEmail = facility.reply_email.toLowerCase().trim();
    const accountEmail = profileEmail.toLowerCase().trim();
    return replyEmail !== accountEmail && !facility.reply_email_verified;
  }, [facility?.reply_email, facility?.reply_email_verified, profileEmail]);

  // Calculate profile completion
  const profileCompletion = useMemo(() => {
    if (!facility) return { percentage: 0, items: [] };
    
    const items = [
      { key: "name", label: "Facility name", completed: !!facility.name?.trim() },
      { key: "type", label: "Facility type", completed: !!facility.facility_type },
      { key: "description", label: "Description", completed: !!facility.description?.trim() },
      { key: "address", label: "Full address", completed: !!(facility.address && facility.city && facility.state && facility.zip_code) },
      { key: "phone", label: "Phone number", completed: !!facility.phone?.trim() },
      { key: "logo", label: "Facility logo", completed: !!facility.logo_url },
      { key: "gallery", label: "Gallery photos", completed: (facility.gallery_urls?.length || 0) > 0 },
      { key: "services", label: "Services offered", completed: services.length > 0 },
      { key: "insurance", label: "Insurance accepted", completed: insurance.length > 0 },
      { key: "ageGroups", label: "Age groups served", completed: ageGroups.length > 0 },
      { key: "yearEstablished", label: "Year established", completed: !!facility.year_established },
      { key: "website", label: "Website URL", completed: !!facility.website?.trim() },
    ];

    const completedCount = items.filter(item => item.completed).length;
    const percentage = Math.round((completedCount / items.length) * 100);

    return { percentage, items };
  }, [facility, services, insurance, ageGroups]);

  // Update local facility state when data changes
  useEffect(() => {
    if (facilityData) {
      setFacility(facilityData);
    }
  }, [facilityData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!currentFacilityId) return;

    const facilityChannel = supabase
      .channel(`facility-${currentFacilityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facilities",
          filter: `id=eq.${currentFacilityId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["facility-listing", currentFacilityId] });
        }
      )
      .subscribe();

    const servicesChannel = supabase
      .channel(`services-${currentFacilityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facility_services",
          filter: `facility_id=eq.${currentFacilityId}`,
        },
        () => {
          refetchServices();
        }
      )
      .subscribe();

    const insuranceChannel = supabase
      .channel(`insurance-${currentFacilityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facility_insurance",
          filter: `facility_id=eq.${currentFacilityId}`,
        },
        () => {
          refetchInsurance();
        }
      )
      .subscribe();

    const ageGroupsChannel = supabase
      .channel(`age-groups-${currentFacilityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facility_age_groups",
          filter: `facility_id=eq.${currentFacilityId}`,
        },
        () => {
          refetchAgeGroups();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(facilityChannel);
      supabase.removeChannel(servicesChannel);
      supabase.removeChannel(insuranceChannel);
      supabase.removeChannel(ageGroupsChannel);
    };
  }, [currentFacilityId, queryClient, refetchServices, refetchInsurance, refetchAgeGroups]);

  // Auto-save function (silent, no toast)
  const performAutoSave = useCallback(async () => {
    if (!facility || isSaving) return;
    
    const requiredFields = ["name", "facility_type", "address", "city", "state", "zip_code", "phone"];
    for (const field of requiredFields) {
      const error = validateField(field, facility[field as keyof Facility] as string | null);
      if (error) return;
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
        year_established: facility.year_established,
        accepts_international_patients: facility.accepts_international_patients,
      })
      .eq("id", facility.id);

    setIsAutoSaving(false);

    if (!error) {
      queryClient.setQueryData(["facility-listing", currentFacilityId], facility);
      queryClient.invalidateQueries({ queryKey: ["provider-data"] });
      queryClient.invalidateQueries({ queryKey: ["provider-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      setHasChanges(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } else {
      console.error("[ListingEditor] Auto-save failed:", error.message);
    }
  }, [facility, isSaving, currentFacilityId, queryClient, toast]);

  // Auto-save effect
  useEffect(() => {
    if (hasChanges && facility) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
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

  

  const handleSave = async () => {
    if (!facility) return;
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    if (!validateAllFields()) {
      toast({
        title: "Validation Error",
        description: "Please fix the highlighted errors before saving.",
        variant: "destructive",
      });
      return;
    }
    
    const previousData = queryClient.getQueryData(["facility-listing", currentFacilityId]);
    queryClient.setQueryData(["facility-listing", currentFacilityId], facility);
    
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
        year_established: facility.year_established,
        accepts_international_patients: facility.accepts_international_patients,
      })
      .eq("id", facility.id);

    setIsSaving(false);

    if (error) {
      queryClient.setQueryData(["facility-listing", currentFacilityId], previousData);
      setFacility(previousData as Facility | null);
      setHasChanges(true);
      setShowSaved(false);
      toast({
        title: "Error saving",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ["provider-data"] });
      queryClient.invalidateQueries({ queryKey: ["provider-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility-services-count", currentFacilityId] });
      queryClient.invalidateQueries({ queryKey: ["facility-insurance-count", currentFacilityId] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
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

  // Keyboard shortcut: Ctrl+S / Cmd+S
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

  const updateField = (field: keyof Facility, value: string | number | boolean | null) => {
    if (facility) {
      setFacility({ ...facility, [field]: value });
      setHasChanges(true);
      
      if (touchedFields.has(field) && typeof value === 'string') {
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

  const handleServicesChange = async (selectedServices: string[]) => {
    if (!facility) return;
    
    const currentServiceNames = services.map(s => s.service_name);
    const toAdd = selectedServices.filter(s => !currentServiceNames.includes(s));
    const toRemove = services.filter(s => !selectedServices.includes(s.service_name));
    
    // Add new services
    for (const serviceName of toAdd) {
      await supabase
        .from("facility_services")
        .insert({ facility_id: facility.id, service_name: serviceName });
    }
    
    // Remove deselected services
    for (const service of toRemove) {
      await supabase
        .from("facility_services")
        .delete()
        .eq("id", service.id);
    }
    
    if (toAdd.length > 0 || toRemove.length > 0) {
      refetchServices();
      queryClient.invalidateQueries({ queryKey: ["facility-services-count", facility.id] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      toast({ title: toAdd.length > 0 ? "Services updated" : "Service removed" });
    }
  };

  const handleInsuranceChange = async (selectedInsurance: string[]) => {
    if (!facility) return;
    
    const currentInsuranceNames = insurance.map(i => i.insurance_name);
    const toAdd = selectedInsurance.filter(i => !currentInsuranceNames.includes(i));
    const toRemove = insurance.filter(i => !selectedInsurance.includes(i.insurance_name));
    
    // Add new insurance
    for (const insuranceName of toAdd) {
      await supabase
        .from("facility_insurance")
        .insert({ facility_id: facility.id, insurance_name: insuranceName });
    }
    
    // Remove deselected insurance
    for (const ins of toRemove) {
      await supabase
        .from("facility_insurance")
        .delete()
        .eq("id", ins.id);
    }
    
    if (toAdd.length > 0 || toRemove.length > 0) {
      refetchInsurance();
      queryClient.invalidateQueries({ queryKey: ["facility-insurance-count", facility.id] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      toast({ title: toAdd.length > 0 ? "Insurance updated" : "Insurance removed" });
    }
  };

  const handleAgeGroupsChange = async (selectedAgeGroups: string[]) => {
    if (!facility) return;
    
    const currentAgeGroupNames = ageGroups.map(ag => ag.age_group);
    const toAdd = selectedAgeGroups.filter(ag => !currentAgeGroupNames.includes(ag));
    const toRemove = ageGroups.filter(ag => !selectedAgeGroups.includes(ag.age_group));
    
    // Add new age groups
    for (const ageGroup of toAdd) {
      await supabase
        .from("facility_age_groups")
        .insert({ facility_id: facility.id, age_group: ageGroup });
    }
    
    // Remove deselected age groups
    for (const ag of toRemove) {
      await supabase
        .from("facility_age_groups")
        .delete()
        .eq("id", ag.id);
    }
    
    if (toAdd.length > 0 || toRemove.length > 0) {
      refetchAgeGroups();
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      toast({ title: toAdd.length > 0 ? "Age groups updated" : "Age group removed" });
    }
  };

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

  const handleRemoveAgeGroup = async (ageGroupId: string) => {
    const { error } = await supabase
      .from("facility_age_groups")
      .delete()
      .eq("id", ageGroupId);

    if (error) {
      toast({ title: "Failed to remove age group", variant: "destructive" });
    } else {
      refetchAgeGroups();
      if (facility) {
        queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
        queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      }
    }
  };

  const handleSendVerificationCode = async () => {
    if (!facility?.reply_email) {
      toast({
        title: "Email required",
        description: "Please enter a reply email address first.",
        variant: "destructive",
      });
      return;
    }

    const emailError = validateField("reply_email", facility.reply_email);
    if (emailError) {
      toast({
        title: "Invalid email",
        description: emailError,
        variant: "destructive",
      });
      return;
    }

    setIsSendingCode(true);
    setVerificationError(null);

    try {
      const response = await supabase.functions.invoke("send-reply-email-verification", {
        body: {
          facilityId: facility.id,
          email: facility.reply_email,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send verification code");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setCodeSent(true);
      setVerificationCode("");
      toast({
        title: "Code sent!",
        description: `Check ${facility.reply_email} for your verification code.`,
      });
    } catch (error: any) {
      setVerificationError(error.message);
      toast({
        title: "Failed to send code",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!facility?.reply_email || !verificationCode.trim()) {
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const response = await supabase.functions.invoke("verify-reply-email-code", {
        body: {
          facilityId: facility.id,
          email: facility.reply_email,
          code: verificationCode.trim(),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Verification failed");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setFacility({
        ...facility,
        reply_email_verified: true,
        reply_email_verified_at: new Date().toISOString(),
      });
      setCodeSent(false);
      setVerificationCode("");

      queryClient.invalidateQueries({ queryKey: ["facility-listing", currentFacilityId] });
      queryClient.invalidateQueries({ queryKey: ["provider-data"] });

      toast({
        title: "Email verified!",
        description: "Your reply email has been verified. You can now send emails to leads.",
      });
    } catch (error: any) {
      setVerificationError(error.message);
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
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

  // Loading state - skeleton matching final layout to prevent shift
  if (isLoading || (facilityData && !facility)) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6 pb-8">
          {/* Header skeleton */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
              <div className="h-4 w-72 rounded bg-muted animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
              <div className="h-9 w-[100px] rounded-md bg-muted animate-pulse" />
            </div>
          </div>
          {/* Grid skeleton */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-lg border border-border/60 bg-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                      <div className="h-3 w-48 rounded bg-muted animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-10 rounded-md bg-muted animate-pulse" />
                    <div className="h-10 rounded-md bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4 order-1 lg:order-2">
              <div className="rounded-lg border border-border/60 bg-card p-6">
                <div className="h-4 w-36 rounded bg-muted animate-pulse mb-3" />
                <div className="h-3 w-full rounded bg-muted animate-pulse" />
                <div className="h-8 w-full rounded-full bg-muted animate-pulse mt-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No listing state
  if (!isLoading && !facilityData && !facility) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-md mx-auto text-center py-20">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">No Listing Found</h2>
          <p className="mt-2 text-muted-foreground">
            Create your facility listing to start receiving leads from families.
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link to="/provider-signup">Create Your Listing</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
          <div className="text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">Loading your listing...</p>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(facility.status);
  const StatusIcon = statusConfig.icon;
  const descriptionLength = facility.description?.length || 0;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6 pb-28 lg:pb-24">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-2xl font-bold text-foreground">My Listing</h1>
              <Badge className={cn("gap-1.5", statusConfig.className)}>
                <StatusIcon className="h-3.5 w-3.5" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg">
              {statusConfig.description}
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Save status indicators */}
            <div className="flex items-center gap-2 text-xs">
              {isAutoSaving && (
                <span className="text-muted-foreground flex items-center gap-1.5 animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </span>
              )}
              {showSaved && !isAutoSaving && !hasChanges && (
                <span className="text-green-600 flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  All changes saved
                </span>
              )}
              {hasChanges && !isAutoSaving && (
                <span className="text-amber-600 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Unsaved changes
                </span>
              )}
            </div>
            
            {facility.slug && (
              <Button 
                variant="outline" 
                size="sm" 
                asChild
                className="gap-2"
              >
                <a 
                  href={`/center/${facility.slug}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">View Public Profile</span>
                  <span className="sm:hidden">Preview</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            <Button 
              onClick={handleSave} 
              disabled={isSaving || isAutoSaving || !hasChanges} 
              size="sm"
              className="gap-2 min-w-[100px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Forms */}
          <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
            {/* Logo & Photos */}
            <Collapsible open={expandedSections.has("photos")} onOpenChange={() => toggleSection("photos")}>
              <Card className="border-border/60 shadow-sm">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-4 bg-gradient-to-r from-purple-500/5 to-transparent cursor-pointer hover:bg-purple-500/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <SectionHeader
                        icon={ImageIcon}
                        iconColor="bg-purple-500/10 text-purple-600"
                        title="Logo & Photos"
                        description="Showcase your facility with professional images"
                        badge={
                          (facility.logo_url || (facility.gallery_urls?.length || 0) > 0) && (
                            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Added
                            </Badge>
                          )
                        }
                      />
                      {expandedSections.has("photos") ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-6 pt-2">
                    {/* Logo Upload */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Facility Logo</Label>
                        {facility.logo_url && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                            Uploaded
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your logo appears on search results and your public profile. Use a square image for best results.
                      </p>
                      <FacilityImageUpload
                        type="logo"
                        currentImages={facility.logo_url ? [facility.logo_url] : []}
                        userId={facility.user_id}
                        facilityId={facility.id}
                        onImagesChange={handleLogoChange}
                      />
                    </div>

                    <Separator className="my-4" />

                    {/* Gallery Upload */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Facility Gallery</Label>
                        <Badge variant="outline" className="text-xs">
                          {facility.gallery_urls?.length || 0} / {galleryLimit} photos
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Upload up to {galleryLimit} photos. The first image will be your primary gallery photo.
                      </p>
                      <FacilityImageUpload
                        type="gallery"
                        currentImages={facility.gallery_urls || []}
                        userId={facility.user_id}
                        facilityId={facility.id}
                        onImagesChange={handleGalleryChange}
                        maxImages={galleryLimit}
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Basic Information */}
            <Collapsible open={expandedSections.has("basic")} onOpenChange={() => toggleSection("basic")}>
              <Card className="border-border/60 shadow-sm">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent cursor-pointer hover:bg-primary/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <SectionHeader
                        icon={Building2}
                        iconColor="bg-primary/10 text-primary"
                        title="Basic Information"
                        description="Essential details about your facility"
                      />
                      {expandedSections.has("basic") ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-5 pt-2">
                    <FormField 
                      label="Facility Name" 
                      required 
                      error={fieldErrors.name}
                      touched={touchedFields.has("name")}
                    >
                      <Input
                        id="name"
                        value={facility.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        onBlur={(e) => handleFieldBlur("name", e.target.value)}
                        className={cn(
                          "h-11",
                          fieldErrors.name && touchedFields.has("name") && "border-destructive focus-visible:ring-destructive"
                        )}
                        placeholder="Enter your facility name"
                      />
                    </FormField>
                    
                    <FormField 
                      label="Facility Type" 
                      required
                      error={fieldErrors.facility_type}
                      touched={touchedFields.has("facility_type")}
                    >
                      <Select
                        value={facility.facility_type}
                        onValueChange={(value) => {
                          updateField("facility_type", value);
                          handleFieldBlur("facility_type", value);
                        }}
                      >
                        <SelectTrigger className={cn(
                          "h-11",
                          fieldErrors.facility_type && touchedFields.has("facility_type") && "border-destructive focus-visible:ring-destructive"
                        )}>
                          <SelectValue placeholder="Select facility type" />
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                          {FACILITY_TYPE_VALUES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField 
                      label="Description"
                      hint="This will be displayed prominently on your public profile."
                    >
                      <div className="relative">
                        <Textarea
                          id="description"
                          value={facility.description || ""}
                          onChange={(e) => {
                            if (e.target.value.length <= DESCRIPTION_MAX_LENGTH) {
                              updateField("description", e.target.value);
                            }
                          }}
                          rows={5}
                          placeholder="Describe your facility, treatment approach, and what makes you unique..."
                          className="resize-none text-sm pr-16"
                        />
                        <span className={cn(
                          "absolute bottom-2 right-3 text-xs",
                          descriptionLength > DESCRIPTION_MAX_LENGTH * 0.9 ? "text-amber-600" : "text-muted-foreground"
                        )}>
                          {descriptionLength}/{DESCRIPTION_MAX_LENGTH}
                        </span>
                      </div>
                    </FormField>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Location */}
            <Collapsible open={expandedSections.has("location")} onOpenChange={() => toggleSection("location")}>
              <Card className="border-border/60 shadow-sm">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-4 bg-gradient-to-r from-blue-500/5 to-transparent cursor-pointer hover:bg-blue-500/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <SectionHeader
                        icon={MapPin}
                        iconColor="bg-blue-500/10 text-blue-600"
                        title="Location"
                        description="Where families can find you"
                      />
                      {expandedSections.has("location") ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-5 pt-2">
                    <FormField 
                      label="Street Address" 
                      required
                      error={fieldErrors.address}
                      touched={touchedFields.has("address")}
                    >
                      <Input
                        id="address"
                        value={facility.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        onBlur={(e) => handleFieldBlur("address", e.target.value)}
                        className={cn(
                          "h-11",
                          fieldErrors.address && touchedFields.has("address") && "border-destructive focus-visible:ring-destructive"
                        )}
                        placeholder="123 Main Street"
                      />
                    </FormField>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <FormField 
                        label="City" 
                        required
                        error={fieldErrors.city}
                        touched={touchedFields.has("city")}
                      >
                        <Input
                          id="city"
                          value={facility.city}
                          onChange={(e) => updateField("city", e.target.value)}
                          onBlur={(e) => handleFieldBlur("city", e.target.value)}
                          className={cn(
                            "h-11",
                            fieldErrors.city && touchedFields.has("city") && "border-destructive focus-visible:ring-destructive"
                          )}
                          placeholder="City"
                        />
                      </FormField>
                      
                      <FormField 
                        label="State" 
                        required
                        error={fieldErrors.state}
                        touched={touchedFields.has("state")}
                      >
                        <Select
                          value={facility.state}
                          onValueChange={(value) => {
                            updateField("state", value);
                            handleFieldBlur("state", value);
                          }}
                        >
                          <SelectTrigger className={cn(
                            "h-11",
                            fieldErrors.state && touchedFields.has("state") && "border-destructive focus-visible:ring-destructive"
                          )}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-card max-h-[200px]">
                            {US_STATES.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      
                      <FormField 
                        label="ZIP Code" 
                        required
                        error={fieldErrors.zip_code}
                        touched={touchedFields.has("zip_code")}
                      >
                        <Input
                          id="zip"
                          value={facility.zip_code}
                          onChange={(e) => updateField("zip_code", e.target.value)}
                          onBlur={(e) => handleFieldBlur("zip_code", e.target.value)}
                          className={cn(
                            "h-11",
                            fieldErrors.zip_code && touchedFields.has("zip_code") && "border-destructive focus-visible:ring-destructive"
                          )}
                          placeholder="12345"
                        />
                      </FormField>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Contact Information */}
            <Collapsible open={expandedSections.has("contact")} onOpenChange={() => toggleSection("contact")}>
              <Card className="border-border/60 shadow-sm">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-4 bg-gradient-to-r from-green-500/5 to-transparent cursor-pointer hover:bg-green-500/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <SectionHeader
                        icon={Phone}
                        iconColor="bg-green-500/10 text-green-600"
                        title="Contact Information"
                        description="How families can reach you"
                      />
                      {expandedSections.has("contact") ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-5 pt-2">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField 
                        label="Phone Number" 
                        required
                        error={fieldErrors.phone}
                        touched={touchedFields.has("phone")}
                      >
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            value={facility.phone}
                            onChange={(e) => updateField("phone", e.target.value)}
                            onBlur={(e) => handleFieldBlur("phone", e.target.value)}
                            className={cn(
                              "h-11 pl-10",
                              fieldErrors.phone && touchedFields.has("phone") && "border-destructive focus-visible:ring-destructive"
                            )}
                            placeholder="(555) 123-4567"
                          />
                        </div>
                      </FormField>
                      
                      <FormField 
                        label="Email Address"
                        error={fieldErrors.email}
                        touched={touchedFields.has("email")}
                      >
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={facility.email || ""}
                            onChange={(e) => updateField("email", e.target.value)}
                            onBlur={(e) => handleFieldBlur("email", e.target.value)}
                            className={cn(
                              "h-11 pl-10",
                              fieldErrors.email && touchedFields.has("email") && "border-destructive focus-visible:ring-destructive"
                            )}
                            placeholder="contact@facility.com"
                          />
                        </div>
                      </FormField>
                    </div>

                    <FormField 
                      label="Website"
                      error={fieldErrors.website}
                      touched={touchedFields.has("website")}
                      hint="Include the full URL starting with https://"
                    >
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="website"
                          type="url"
                          value={facility.website || ""}
                          onChange={(e) => updateField("website", e.target.value)}
                          onBlur={(e) => handleFieldBlur("website", e.target.value)}
                          className={cn(
                            "h-11 pl-10",
                            fieldErrors.website && touchedFields.has("website") && "border-destructive focus-visible:ring-destructive"
                          )}
                          placeholder="https://www.yourfacility.com"
                        />
                      </div>
                    </FormField>
                    
                    {/* Reply Email Section */}
                    <div className="p-4 rounded-xl border bg-muted/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">Reply Email</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[250px]">
                                <p className="text-xs">
                                  This is the email address where lead replies will be sent. If left blank, your account email will be used.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {(!facility.reply_email || 
                          facility.reply_email.toLowerCase().trim() === profileEmail.toLowerCase().trim() ||
                          facility.reply_email_verified) && (
                          <Badge variant="outline" className="gap-1 text-green-700 border-green-200 bg-green-500/10 text-xs">
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      
                      {!facility.reply_email && profileEmail && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            Using your account email: <span className="font-medium text-foreground">{profileEmail}</span>
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="reply_email"
                            type="email"
                            value={facility.reply_email || ""}
                            onChange={(e) => {
                              updateField("reply_email", e.target.value);
                              if (e.target.value !== facilityData?.reply_email) {
                                setCodeSent(false);
                                setVerificationCode("");
                                setVerificationError(null);
                              }
                            }}
                            onBlur={(e) => handleFieldBlur("reply_email", e.target.value)}
                            className={cn(
                              "h-11 pl-10",
                              fieldErrors.reply_email && touchedFields.has("reply_email") && "border-destructive focus-visible:ring-destructive"
                            )}
                            placeholder={profileEmail || "replies@facility.com"}
                          />
                        </div>
                        {needsReplyEmailVerification && !fieldErrors.reply_email && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleSendVerificationCode}
                            disabled={isSendingCode}
                            className="h-11 gap-2"
                          >
                            {isSendingCode ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4" />
                                {codeSent ? "Resend" : "Verify"}
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {fieldErrors.reply_email && touchedFields.has("reply_email") && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {fieldErrors.reply_email}
                        </p>
                      )}

                      {codeSent && needsReplyEmailVerification && (
                        <div className="space-y-3 pt-3 border-t">
                          <Label className="text-sm font-medium">Enter verification code</Label>
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={verificationCode}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                                setVerificationCode(value);
                                setVerificationError(null);
                              }}
                              placeholder="000000"
                              className="h-11 text-center font-mono text-lg tracking-widest max-w-[140px]"
                            />
                            <Button
                              type="button"
                              onClick={handleVerifyCode}
                              disabled={isVerifying || verificationCode.length !== 6}
                              className="h-11 gap-2"
                            >
                              {isVerifying ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4" />
                                  Verify
                                </>
                              )}
                            </Button>
                          </div>
                          {verificationError && (
                            <p className="text-xs text-destructive">{verificationError}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Code sent to {facility.reply_email}. Check your inbox and spam folder.
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {!facility.reply_email 
                          ? "Leave blank to use your account email for lead replies."
                          : facility.reply_email.toLowerCase().trim() === profileEmail.toLowerCase().trim()
                            ? "Using your account email for lead replies."
                            : facility.reply_email_verified 
                              ? "Lead replies will be sent to this verified custom email."
                              : "Verify this email to receive lead replies here."}
                      </p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Program Details */}
            <Collapsible open={expandedSections.has("program")} onOpenChange={() => toggleSection("program")}>
              <Card className="border-border/60 shadow-sm">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-4 bg-gradient-to-r from-indigo-500/5 to-transparent cursor-pointer hover:bg-indigo-500/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <SectionHeader
                        icon={Users}
                        iconColor="bg-indigo-500/10 text-indigo-600"
                        title="Program Details"
                        description="Treatment capacity and demographics"
                      />
                      {expandedSections.has("program") ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-2">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Gender Served">
                        <Select
                          value={facility.gender_served || "all"}
                          onValueChange={(value) => updateField("gender_served", value)}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent className="bg-card">
                            {GENDER_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      
                      <FormField 
                        label="Bed Count / Capacity"
                        hint="How many clients can you serve at once?"
                      >
                        <div className="relative">
                          <Bed className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="beds"
                            value={facility.bed_count || ""}
                            onChange={(e) => updateField("bed_count", e.target.value)}
                            placeholder="e.g., 24"
                            className="h-11 pl-10"
                          />
                        </div>
                      </FormField>
                    </div>

                    {/* International Patients Toggle */}
                    <div className="mt-4 p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary" />
                            Accept International Patients
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Enable this if your facility accepts patients from outside the United States
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={facility.accepts_international_patients || false}
                          onClick={() => updateField("accepts_international_patients", !facility.accepts_international_patients)}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            facility.accepts_international_patients ? "bg-primary" : "bg-muted-foreground/30"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                              facility.accepts_international_patients ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </div>
                      {facility.accepts_international_patients && (
                        <div className="mt-3 p-3 rounded-md bg-primary/5 border border-primary/10">
                          <p className="text-xs text-primary">
                            Your facility will be visible to international clients seeking treatment in the US through our placement service.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Services Offered */}
            <Collapsible open={expandedSections.has("services")} onOpenChange={() => toggleSection("services")}>
              <Card className="border-border/60 shadow-sm">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-4 bg-gradient-to-r from-teal-500/5 to-transparent cursor-pointer hover:bg-teal-500/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <SectionHeader
                        icon={Stethoscope}
                        iconColor="bg-teal-500/10 text-teal-600"
                        title="Services Offered"
                        description="Treatment programs and therapies available"
                        badge={
                          services.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {services.length} service{services.length !== 1 ? "s" : ""}
                            </Badge>
                          )
                        }
                      />
                      {expandedSections.has("services") ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-2">
                    {services.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {services.map((service) => (
                          <TagChip
                            key={service.id}
                            label={service.service_name}
                            onRemove={() => handleRemoveService(service.id)}
                            variant="service"
                          />
                        ))}
                      </div>
                    )}

                    <MultiSelectDropdown
                      options={[...TREATMENT_SERVICES]}
                      selected={services.map(s => s.service_name)}
                      onChange={handleServicesChange}
                      placeholder="Select services to add..."
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Insurance Accepted */}
            <Collapsible open={expandedSections.has("insurance")} onOpenChange={() => toggleSection("insurance")}>
              <Card className="border-border/60 shadow-sm">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-4 bg-gradient-to-r from-amber-500/5 to-transparent cursor-pointer hover:bg-amber-500/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <SectionHeader
                        icon={CreditCard}
                        iconColor="bg-amber-500/10 text-amber-600"
                        title="Insurance Accepted"
                        description="Payment options and insurance providers"
                        badge={
                          insurance.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {insurance.length} provider{insurance.length !== 1 ? "s" : ""}
                            </Badge>
                          )
                        }
                      />
                      {expandedSections.has("insurance") ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-2">
                    {insurance.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {insurance.map((ins) => (
                          <TagChip
                            key={ins.id}
                            label={ins.insurance_name}
                            onRemove={() => handleRemoveInsurance(ins.id)}
                            variant="insurance"
                          />
                        ))}
                      </div>
                    )}

                    <MultiSelectDropdown
                      options={[...INSURANCE_PROVIDERS]}
                      selected={insurance.map(i => i.insurance_name)}
                      onChange={handleInsuranceChange}
                      placeholder="Select insurance providers to add..."
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Age Groups Served */}
            <Collapsible open={expandedSections.has("ageGroups")} onOpenChange={() => toggleSection("ageGroups")}>
              <Card className="border-border/60 shadow-sm">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-4 bg-gradient-to-r from-violet-500/5 to-transparent cursor-pointer hover:bg-violet-500/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <SectionHeader
                        icon={Users}
                        iconColor="bg-violet-500/10 text-violet-600"
                        title="Age Groups Served"
                        description="Specify which age demographics you treat"
                        badge={
                          ageGroups.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {ageGroups.length} group{ageGroups.length !== 1 ? "s" : ""}
                            </Badge>
                          )
                        }
                      />
                      {expandedSections.has("ageGroups") ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-2">
                    {ageGroups.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {ageGroups.map((ag) => (
                          <TagChip
                            key={ag.id}
                            label={ag.age_group}
                            onRemove={() => handleRemoveAgeGroup(ag.id)}
                            variant="default"
                          />
                        ))}
                      </div>
                    )}

                    <MultiSelectDropdown
                      options={[...AGE_GROUPS]}
                      selected={ageGroups.map(ag => ag.age_group)}
                      onChange={handleAgeGroupsChange}
                      placeholder="Select age groups to add..."
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Trust & Credentials */}
            <Collapsible open={expandedSections.has("trust")} onOpenChange={() => toggleSection("trust")}>
              <Card className="border-border/60 shadow-sm">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-4 bg-gradient-to-r from-emerald-500/5 to-transparent cursor-pointer hover:bg-emerald-500/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <SectionHeader
                        icon={ShieldCheck}
                        iconColor="bg-emerald-500/10 text-emerald-600"
                        title="Trust & Credentials"
                        description="Accreditations and certifications to build trust"
                      />
                      {expandedSections.has("trust") ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-2">
                    <ProviderTrustForm
                      facilityId={facility.id}
                      userId={facility.user_id}
                      yearEstablished={facility.year_established}
                      onYearChange={(year) => updateField("year_established", year)}
                      isEmbedded
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Our Team / Staff */}
            <StaffManagementSection
              facilityId={facility.id}
              isExpanded={expandedSections.has("staff")}
              onToggle={() => toggleSection("staff")}
            />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4 order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start">
            {/* Profile Completion Card */}
            <ListingProfileCompletion
              percentage={profileCompletion.percentage}
              items={profileCompletion.items}
            />

            {/* Status Card */}
            <ListingStatusCard
              status={facility.status}
              facilityType={facility.facility_type}
              city={facility.city}
              state={facility.state}
              slug={facility.slug}
            />

            {/* Tips Card */}
            <ListingTipsCard />
          </div>
        </div>

        {/* Floating Save Bar */}
        <ListingFloatingSaveBar
          hasChanges={hasChanges}
          isSaving={isSaving}
          isAutoSaving={isAutoSaving}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
