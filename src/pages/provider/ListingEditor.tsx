import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeText, sanitizeFacilityName, validateFacilityType, validateState, validateZipCode, validatePhone, validateEmail, sanitizeDescription, sanitizeWebsite, validateYearEstablished } from "@/lib/facilitySanitization";
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
import { ListingPreviewModal } from "@/components/provider/listing/ListingPreviewModal";

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
      if (trimmedValue && /^(javascript|data):/i.test(trimmedValue)) {
        return "Invalid URL protocol";
      }
      return null;
    case "year_established":
      if (trimmedValue) {
        const year = parseInt(trimmedValue, 10);
        if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
          return `Year must be between 1900 and ${new Date().getFullYear()}`;
        }
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
  const [previewOpen, setPreviewOpen] = useState(false);
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

  // Auto-save function (silent, no toast) - with input sanitization
  const performAutoSave = useCallback(async () => {
    if (!facility || isSaving) return;
    
    const requiredFields = ["name", "facility_type", "address", "city", "state", "zip_code", "phone"];
    for (const field of requiredFields) {
      const error = validateField(field, facility[field as keyof Facility] as string | null);
      if (error) return;
    }

    // Validate and sanitize before saving
    try {
      validateFacilityType(facility.facility_type);
      validateState(facility.state);
      validateZipCode(facility.zip_code);
      validatePhone(facility.phone);
      if (facility.year_established != null) {
        validateYearEstablished(facility.year_established);
      }
      if (facility.email) validateEmail(facility.email);
      if (facility.website && /^(javascript|data):/i.test(facility.website.trim())) {
        return; // Block dangerous URLs silently
      }
    } catch {
      return; // Skip auto-save if validation fails
    }
    
    setIsAutoSaving(true);
    
    const { error } = await supabase
      .from("facilities")
      .update({
        name: sanitizeFacilityName(facility.name),
        address: sanitizeText(facility.address).slice(0, 200),
        city: sanitizeText(facility.city).slice(0, 100),
        state: facility.state,
        zip_code: facility.zip_code.trim(),
        phone: facility.phone.trim(),
        email: validateEmail(facility.email) ?? null,
        reply_email: facility.reply_email?.trim() || null,
        website: sanitizeWebsite(facility.website),
        description: sanitizeDescription(facility.description),
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
    
    // Validate enums before saving
    try {
      validateFacilityType(facility.facility_type);
      validateState(facility.state);
      validateZipCode(facility.zip_code);
      validatePhone(facility.phone);
      if (facility.year_established != null) {
        validateYearEstablished(facility.year_established);
      }
      if (facility.email) validateEmail(facility.email);
      if (facility.website && /^(javascript|data):/i.test(facility.website.trim())) {
        toast({
          title: "Invalid Website URL",
          description: "The website URL contains a blocked protocol.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
    } catch (validationErr: any) {
      toast({
        title: "Validation Error",
        description: validationErr.message || "Please fix the highlighted errors before saving.",
        variant: "destructive",
      });
      setHasChanges(true);
      setShowSaved(false);
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("facilities")
      .update({
        name: sanitizeFacilityName(facility.name),
        address: sanitizeText(facility.address).slice(0, 200),
        city: sanitizeText(facility.city).slice(0, 100),
        state: facility.state,
        zip_code: facility.zip_code.trim(),
        phone: facility.phone.trim(),
        email: validateEmail(facility.email) ?? null,
        reply_email: facility.reply_email?.trim() || null,
        website: sanitizeWebsite(facility.website),
        description: sanitizeDescription(facility.description),
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

  // Warn before closing tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

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
    
    // Batch operations in parallel
    const ops: Promise<unknown>[] = [];
    if (toAdd.length > 0) {
      ops.push(supabase.from("facility_services").insert(toAdd.map(s => ({ facility_id: facility.id, service_name: s }))).select());
    }
    for (const service of toRemove) {
      ops.push(supabase.from("facility_services").delete().eq("id", service.id).select());
    }
    
    if (ops.length > 0) {
      await Promise.all(ops);
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
    
    const ops: Promise<unknown>[] = [];
    if (toAdd.length > 0) {
      ops.push(supabase.from("facility_insurance").insert(toAdd.map(i => ({ facility_id: facility.id, insurance_name: i }))).select());
    }
    for (const ins of toRemove) {
      ops.push(supabase.from("facility_insurance").delete().eq("id", ins.id).select());
    }
    
    if (ops.length > 0) {
      await Promise.all(ops);
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
    
    const ops: Promise<unknown>[] = [];
    if (toAdd.length > 0) {
      ops.push(supabase.from("facility_age_groups").insert(toAdd.map(ag => ({ facility_id: facility.id, age_group: ag }))).select());
    }
    for (const ag of toRemove) {
      ops.push(supabase.from("facility_age_groups").delete().eq("id", ag.id).select());
    }
    
    if (ops.length > 0) {
      await Promise.all(ops);
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "approved":
        return { label: "Live", icon: CheckCircle, className: "bg-green-500/10 text-green-700 border-green-200" };
      case "pending":
        return { label: "Under Review", icon: Clock, className: "bg-amber-500/10 text-amber-700 border-amber-200" };
      default:
        return { label: "Draft", icon: AlertCircle, className: "bg-muted text-muted-foreground border-border" };
    }
  };

  // Loading skeleton
  if (isLoading || (facilityData && !facility)) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="h-14 rounded-xl bg-muted animate-pulse" />
        <div className="flex gap-4">
          <div className="hidden md:block w-48 shrink-0 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
          <div className="flex-1 space-y-4">
            <div className="h-48 rounded-xl bg-muted animate-pulse" />
            <div className="h-32 rounded-xl bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && !facilityData && !facility) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">No Listing Found</h2>
        <p className="mt-2 text-muted-foreground">Create your facility listing to start receiving leads from families.</p>
        <Button asChild className="mt-6" size="lg">
          <Link to="/provider-signup">Create Your Listing</Link>
        </Button>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="h-14 rounded-xl bg-muted animate-pulse" />
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  const statusConfig = getStatusConfig(facility.status);
  const StatusIcon = statusConfig.icon;
  const descriptionLength = facility.description?.length || 0;

  // Check which tabs have completion
  const tabCompletion: Record<string, boolean> = {
    photos: !!(facility.logo_url || (facility.gallery_urls?.length || 0) > 0),
    basic: !!(facility.name && facility.facility_type && facility.description),
    location: !!(facility.address && facility.city && facility.state && facility.zip_code),
    contact: !!facility.phone,
    program: !!(facility.gender_served || facility.bed_count),
    services: services.length > 0,
    insurance: insurance.length > 0,
    ageGroups: ageGroups.length > 0,
    trust: !!facility.year_established,
    staff: false, // handled by StaffManagementSection
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 pb-28 lg:pb-8">
      {/* ── Top Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          {facility.logo_url ? (
            <img src={facility.logo_url} alt={`${facility.name} logo`} className="h-10 w-10 rounded-xl object-cover border border-border shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-lg font-bold text-foreground truncate">{facility.name}</h1>
              <Badge className={cn("gap-1 text-xs shrink-0", statusConfig.className)}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>{profileCompletion.percentage}% complete</span>
              <span>·</span>
              <span>{facility.city}, {facility.state}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Save indicator */}
          <div className="text-xs min-w-[80px] text-right">
            {isAutoSaving && (
              <span className="text-muted-foreground flex items-center gap-1 justify-end animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving
              </span>
            )}
            {showSaved && !isAutoSaving && !hasChanges && (
              <span className="text-green-600 flex items-center gap-1 justify-end">
                <CheckCircle className="h-3 w-3" />
                Saved
              </span>
            )}
            {hasChanges && !isAutoSaving && (
              <span className="text-amber-600 flex items-center gap-1 justify-end">
                <AlertCircle className="h-3 w-3" />
                Unsaved
              </span>
            )}
          </div>
          {facility.slug && (
            <Button variant="outline" size="sm" className="gap-1.5 hidden sm:flex" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving || isAutoSaving || !hasChanges} size="sm" className="gap-1.5">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      {/* ── Profile Progress Bar ── */}
      {profileCompletion.percentage < 100 && (
        <div className="mb-6 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Profile Strength</span>
            </div>
            <span className="text-sm font-bold text-primary">{profileCompletion.percentage}%</span>
          </div>
          <Progress value={profileCompletion.percentage} className="h-2" />
          <div className="flex flex-wrap gap-2 mt-3">
            {profileCompletion.items.filter(i => !i.completed).map(item => (
              <span key={item.key} className="text-xs px-2 py-1 rounded-full border border-dashed border-border text-muted-foreground">
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Mobile Tab Scroll ── */}
      <div className="md:hidden mb-4 -mx-3 px-3 overflow-x-auto scrollbar-none">
        <div className="flex gap-1 min-w-max pb-2">
          {EDITOR_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isComplete = tabCompletion[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {isComplete && !isActive && (
                  <CircleCheck className="h-3 w-3 text-green-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Desktop Layout: Sidebar Tabs + Content ── */}
      <div className="flex gap-6">
        {/* Desktop sidebar nav */}
        <nav className="hidden md:flex flex-col w-44 shrink-0 space-y-0.5 sticky top-6 self-start">
          {EDITOR_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isComplete = tabCompletion[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                <span className="truncate flex-1">{tab.label}</span>
                {isComplete && (
                  <CircleCheck className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-green-600")} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Content area – fixed min height prevents shift */}
        <div className="flex-1 min-w-0 min-h-[500px]">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              {/* ═══ PHOTOS TAB ═══ */}
              {activeTab === "photos" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-semibold text-foreground mb-1">Logo & Photos</h2>
                    <p className="text-sm text-muted-foreground">Showcase your facility with professional images</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Facility Logo</Label>
                      {facility.logo_url && <Badge variant="outline" className="text-xs text-green-600 border-green-200">Uploaded</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">Square image recommended. Appears on search results.</p>
                    <FacilityImageUpload type="logo" currentImages={facility.logo_url ? [facility.logo_url] : []} userId={facility.user_id} facilityId={facility.id} facilityName={facility.name} onImagesChange={handleLogoChange} />
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Gallery</Label>
                      <Badge variant="outline" className="text-xs">{facility.gallery_urls?.length || 0} / {galleryLimit}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Upload up to {galleryLimit} photos. First image is primary.</p>
                    <FacilityImageUpload type="gallery" currentImages={facility.gallery_urls || []} userId={facility.user_id} facilityId={facility.id} facilityName={facility.name} onImagesChange={handleGalleryChange} maxImages={galleryLimit} />
                  </div>
                </div>
              )}

              {/* ═══ BASIC INFO TAB ═══ */}
              {activeTab === "basic" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-foreground mb-1">Basic Information</h2>
                    <p className="text-sm text-muted-foreground">Essential details about your facility</p>
                  </div>
                  <FormField label="Facility Name" required error={fieldErrors.name} touched={touchedFields.has("name")}>
                    <Input value={facility.name} onChange={(e) => updateField("name", e.target.value)} onBlur={(e) => handleFieldBlur("name", e.target.value)} className={cn("h-11", fieldErrors.name && touchedFields.has("name") && "border-destructive")} placeholder="Enter your facility name" />
                  </FormField>
                  <FormField label="Facility Type" required error={fieldErrors.facility_type} touched={touchedFields.has("facility_type")}>
                    <Select value={facility.facility_type} onValueChange={(v) => { updateField("facility_type", v); handleFieldBlur("facility_type", v); }}>
                      <SelectTrigger className={cn("h-11", fieldErrors.facility_type && touchedFields.has("facility_type") && "border-destructive")}><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent className="bg-card">{FACILITY_TYPE_VALUES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Description" hint="Displayed on your public profile.">
                    <div className="relative">
                      <Textarea value={facility.description || ""} onChange={(e) => { if (e.target.value.length <= DESCRIPTION_MAX_LENGTH) updateField("description", e.target.value); }} rows={5} placeholder="Describe your facility..." className="resize-none text-sm pr-16" />
                      <span className={cn("absolute bottom-2 right-3 text-xs", descriptionLength > DESCRIPTION_MAX_LENGTH * 0.9 ? "text-amber-600" : "text-muted-foreground")}>{descriptionLength}/{DESCRIPTION_MAX_LENGTH}</span>
                    </div>
                  </FormField>
                </div>
              )}

              {/* ═══ LOCATION TAB ═══ */}
              {activeTab === "location" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-foreground mb-1">Location</h2>
                    <p className="text-sm text-muted-foreground">Where families can find you</p>
                  </div>
                  <FormField label="Street Address" required error={fieldErrors.address} touched={touchedFields.has("address")}>
                    <Input value={facility.address} onChange={(e) => updateField("address", e.target.value)} onBlur={(e) => handleFieldBlur("address", e.target.value)} className={cn("h-11", fieldErrors.address && touchedFields.has("address") && "border-destructive")} placeholder="123 Main Street" />
                  </FormField>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField label="City" required error={fieldErrors.city} touched={touchedFields.has("city")}>
                      <Input value={facility.city} onChange={(e) => updateField("city", e.target.value)} onBlur={(e) => handleFieldBlur("city", e.target.value)} className={cn("h-11", fieldErrors.city && touchedFields.has("city") && "border-destructive")} placeholder="City" />
                    </FormField>
                    <FormField label="State" required error={fieldErrors.state} touched={touchedFields.has("state")}>
                      <Select value={facility.state} onValueChange={(v) => { updateField("state", v); handleFieldBlur("state", v); }}>
                        <SelectTrigger className={cn("h-11", fieldErrors.state && touchedFields.has("state") && "border-destructive")}><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="bg-card max-h-[200px]">{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="ZIP Code" required error={fieldErrors.zip_code} touched={touchedFields.has("zip_code")}>
                      <Input value={facility.zip_code} onChange={(e) => updateField("zip_code", e.target.value)} onBlur={(e) => handleFieldBlur("zip_code", e.target.value)} className={cn("h-11", fieldErrors.zip_code && touchedFields.has("zip_code") && "border-destructive")} placeholder="12345" />
                    </FormField>
                  </div>
                </div>
              )}

              {/* ═══ CONTACT TAB ═══ */}
              {activeTab === "contact" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-foreground mb-1">Contact Information</h2>
                    <p className="text-sm text-muted-foreground">How families can reach you</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Phone Number" required error={fieldErrors.phone} touched={touchedFields.has("phone")}>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={facility.phone} onChange={(e) => updateField("phone", e.target.value)} onBlur={(e) => handleFieldBlur("phone", e.target.value)} className={cn("h-11 pl-10", fieldErrors.phone && touchedFields.has("phone") && "border-destructive")} placeholder="(555) 123-4567" />
                      </div>
                    </FormField>
                    <FormField label="Email Address" error={fieldErrors.email} touched={touchedFields.has("email")}>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="email" value={facility.email || ""} onChange={(e) => updateField("email", e.target.value)} onBlur={(e) => handleFieldBlur("email", e.target.value)} className={cn("h-11 pl-10", fieldErrors.email && touchedFields.has("email") && "border-destructive")} placeholder="contact@facility.com" />
                      </div>
                    </FormField>
                  </div>
                  <FormField label="Website" error={fieldErrors.website} touched={touchedFields.has("website")} hint="Include full URL starting with https://">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="url" value={facility.website || ""} onChange={(e) => updateField("website", e.target.value)} onBlur={(e) => handleFieldBlur("website", e.target.value)} className={cn("h-11 pl-10", fieldErrors.website && touchedFields.has("website") && "border-destructive")} placeholder="https://www.yourfacility.com" />
                    </div>
                  </FormField>

                  {/* Reply Email */}
                  <div className="p-4 rounded-xl border bg-muted/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Reply Email</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                            <TooltipContent className="max-w-[250px]"><p className="text-xs">This is where lead replies will be sent. If blank, your account email is used.</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {(!facility.reply_email || facility.reply_email.toLowerCase().trim() === profileEmail.toLowerCase().trim() || facility.reply_email_verified) && (
                        <Badge variant="outline" className="gap-1 text-green-700 border-green-200 bg-green-500/10 text-xs"><ShieldCheck className="h-3 w-3" />Verified</Badge>
                      )}
                    </div>
                    {!facility.reply_email && profileEmail && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">Using your account email: <span className="font-medium text-foreground">{profileEmail}</span></p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="email" value={facility.reply_email || ""} onChange={(e) => { updateField("reply_email", e.target.value); if (e.target.value !== facilityData?.reply_email) { setCodeSent(false); setVerificationCode(""); setVerificationError(null); } }} onBlur={(e) => handleFieldBlur("reply_email", e.target.value)} className={cn("h-11 pl-10", fieldErrors.reply_email && touchedFields.has("reply_email") && "border-destructive")} placeholder={profileEmail || "replies@facility.com"} />
                      </div>
                      {needsReplyEmailVerification && !fieldErrors.reply_email && (
                        <Button type="button" variant="outline" onClick={handleSendVerificationCode} disabled={isSendingCode} className="h-11 gap-2">
                          {isSendingCode ? <><Loader2 className="h-4 w-4 animate-spin" />Sending...</> : <><Send className="h-4 w-4" />{codeSent ? "Resend" : "Verify"}</>}
                        </Button>
                      )}
                    </div>
                    {fieldErrors.reply_email && touchedFields.has("reply_email") && (
                      <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{fieldErrors.reply_email}</p>
                    )}
                    {codeSent && needsReplyEmailVerification && (
                      <div className="space-y-3 pt-3 border-t">
                        <Label className="text-sm font-medium">Enter verification code</Label>
                        <div className="flex gap-2">
                          <Input type="text" inputMode="numeric" maxLength={6} value={verificationCode} onChange={(e) => { setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setVerificationError(null); }} placeholder="000000" className="h-11 text-center font-mono text-lg tracking-widest max-w-[140px]" />
                          <Button type="button" onClick={handleVerifyCode} disabled={isVerifying || verificationCode.length !== 6} className="h-11 gap-2">
                            {isVerifying ? <><Loader2 className="h-4 w-4 animate-spin" />Verifying...</> : <><CheckCircle className="h-4 w-4" />Verify</>}
                          </Button>
                        </div>
                        {verificationError && <p className="text-xs text-destructive">{verificationError}</p>}
                        <p className="text-xs text-muted-foreground">Code sent to {facility.reply_email}. Check inbox and spam.</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {!facility.reply_email ? "Leave blank to use your account email." : facility.reply_email.toLowerCase().trim() === profileEmail.toLowerCase().trim() ? "Using your account email." : facility.reply_email_verified ? "Lead replies go to this verified email." : "Verify this email to receive replies here."}
                    </p>
                  </div>
                </div>
              )}

              {/* ═══ PROGRAM TAB ═══ */}
              {activeTab === "program" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-foreground mb-1">Program Details</h2>
                    <p className="text-sm text-muted-foreground">Treatment capacity and demographics</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Gender Served">
                      <Select value={facility.gender_served || "all"} onValueChange={(v) => updateField("gender_served", v)}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent className="bg-card">{GENDER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Bed Count / Capacity" hint="How many clients can you serve at once?">
                      <div className="relative">
                        <Bed className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={facility.bed_count || ""} onChange={(e) => updateField("bed_count", e.target.value)} placeholder="e.g., 24" className="h-11 pl-10" />
                      </div>
                    </FormField>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium flex items-center gap-2"><Globe className="h-4 w-4 text-primary" />Accept International Patients</Label>
                        <p className="text-xs text-muted-foreground">Enable if you accept patients from outside the US</p>
                      </div>
                      <button type="button" role="switch" aria-checked={facility.accepts_international_patients || false} onClick={() => updateField("accepts_international_patients", !facility.accepts_international_patients)} className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", facility.accepts_international_patients ? "bg-primary" : "bg-muted-foreground/30")}>
                        <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform", facility.accepts_international_patients ? "translate-x-6" : "translate-x-1")} />
                      </button>
                    </div>
                    {facility.accepts_international_patients && (
                      <div className="mt-3 p-3 rounded-md bg-primary/5 border border-primary/10"><p className="text-xs text-primary">Your facility will be visible to international clients.</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══ SERVICES TAB ═══ */}
              {activeTab === "services" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-foreground mb-1">Services Offered</h2>
                      <p className="text-sm text-muted-foreground">Treatment programs and therapies</p>
                    </div>
                    {services.length > 0 && <Badge variant="secondary" className="text-xs">{services.length} service{services.length !== 1 ? "s" : ""}</Badge>}
                  </div>
                  {services.length > 0 && (
                    <div className="flex flex-wrap gap-2">{services.map(s => <TagChip key={s.id} label={s.service_name} onRemove={() => handleRemoveService(s.id)} variant="service" />)}</div>
                  )}
                  <MultiSelectDropdown options={[...TREATMENT_SERVICES]} selected={services.map(s => s.service_name)} onChange={handleServicesChange} placeholder="Select services to add..." />
                </div>
              )}

              {/* ═══ INSURANCE TAB ═══ */}
              {activeTab === "insurance" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-foreground mb-1">Insurance Accepted</h2>
                      <p className="text-sm text-muted-foreground">Payment options and insurance providers</p>
                    </div>
                    {insurance.length > 0 && <Badge variant="secondary" className="text-xs">{insurance.length} provider{insurance.length !== 1 ? "s" : ""}</Badge>}
                  </div>
                  {insurance.length > 0 && (
                    <div className="flex flex-wrap gap-2">{insurance.map(ins => <TagChip key={ins.id} label={ins.insurance_name} onRemove={() => handleRemoveInsurance(ins.id)} variant="insurance" />)}</div>
                  )}
                  <MultiSelectDropdown options={[...INSURANCE_PROVIDERS]} selected={insurance.map(i => i.insurance_name)} onChange={handleInsuranceChange} placeholder="Select insurance providers to add..." />
                </div>
              )}

              {/* ═══ AGE GROUPS TAB ═══ */}
              {activeTab === "ageGroups" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-foreground mb-1">Age Groups Served</h2>
                      <p className="text-sm text-muted-foreground">Specify which age demographics you treat</p>
                    </div>
                    {ageGroups.length > 0 && <Badge variant="secondary" className="text-xs">{ageGroups.length} group{ageGroups.length !== 1 ? "s" : ""}</Badge>}
                  </div>
                  {ageGroups.length > 0 && (
                    <div className="flex flex-wrap gap-2">{ageGroups.map(ag => <TagChip key={ag.id} label={ag.age_group} onRemove={() => handleRemoveAgeGroup(ag.id)} variant="default" />)}</div>
                  )}
                  <MultiSelectDropdown options={[...AGE_GROUPS]} selected={ageGroups.map(ag => ag.age_group)} onChange={handleAgeGroupsChange} placeholder="Select age groups to add..." />
                </div>
              )}

              {/* ═══ TRUST TAB ═══ */}
              {activeTab === "trust" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-foreground mb-1">Trust & Credentials</h2>
                    <p className="text-sm text-muted-foreground">Accreditations and certifications</p>
                  </div>
                  <ProviderTrustForm facilityId={facility.id} userId={facility.user_id} yearEstablished={facility.year_established} onYearChange={(year) => updateField("year_established", year)} isEmbedded />
                </div>
              )}

              {/* ═══ STAFF TAB ═══ */}
              {activeTab === "staff" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-foreground mb-1">Our Team</h2>
                    <p className="text-sm text-muted-foreground">Add staff and team members to your profile</p>
                  </div>
                  <StaffManagementSection facilityId={facility.id} isExpanded={true} onToggle={() => {}} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Save Bar */}
      <ListingFloatingSaveBar hasChanges={hasChanges} isSaving={isSaving} isAutoSaving={isAutoSaving} onSave={handleSave} />

      {/* Preview Modal */}
      {facility?.slug && (
        <ListingPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          facilityName={facility.name}
          facilitySlug={facility.slug}
        />
      )}
    </div>
  );
}
