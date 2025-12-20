import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  CreditCard,
  ShieldCheck,
  Send,
  Sparkles,
  TrendingUp,
  CircleCheck,
  CircleDashed,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FacilityImageUpload } from "@/components/provider/FacilityImageUpload";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { ProviderTrustForm } from "@/components/provider/ProviderTrustForm";
import { useSubscription, PLAN_DETAILS } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

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

const availableAgeGroups = [
  "Adults (18+)",
  "Young Adults (18-25)",
  "Adolescents (13-17)",
  "Seniors (65+)",
  "All Ages",
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

// Section Header Component
function SectionHeader({ 
  icon: Icon, 
  iconColor,
  title, 
  description,
  badge
}: { 
  icon: React.ElementType; 
  iconColor: string;
  title: string; 
  description: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn(
        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105",
        iconColor
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {badge}
        </div>
        <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
      </div>
    </div>
  );
}

// Form Field with enhanced styling
function FormField({
  label,
  required,
  error,
  touched,
  hint,
  children,
  className
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  touched?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium flex items-center gap-1.5">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && touched && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

// Tag/Chip Component for Services and Insurance
function TagChip({ 
  label, 
  onRemove,
  variant = "default"
}: { 
  label: string; 
  onRemove: () => void;
  variant?: "default" | "service" | "insurance";
}) {
  const variantStyles = {
    default: "bg-secondary hover:bg-secondary/80",
    service: "bg-teal-500/10 text-teal-700 border-teal-200 hover:bg-teal-500/20",
    insurance: "bg-amber-500/10 text-amber-700 border-amber-200 hover:bg-amber-500/20"
  };

  return (
    <Badge 
      variant="outline"
      className={cn(
        "gap-1.5 pr-1.5 py-1.5 text-sm font-normal transition-all duration-200",
        variantStyles[variant]
      )}
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

// Empty State Component
function EmptyTagsState({ type }: { type: "services" | "insurance" }) {
  return (
    <div className="py-4 px-3 rounded-lg border border-dashed border-border bg-muted/30 text-center">
      <p className="text-sm text-muted-foreground">
        {type === "services" 
          ? "No services added yet. Add your treatment services to help families find the right care."
          : "No insurance providers added yet. Add accepted insurance to help families understand their options."}
      </p>
    </div>
  );
}

// Profile Completion Item
function CompletionItem({ 
  label, 
  completed,
  onClick
}: { 
  label: string; 
  completed: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 w-full text-left py-1.5 px-2 rounded-md transition-colors",
        completed ? "text-muted-foreground" : "text-foreground hover:bg-muted/50"
      )}
    >
      {completed ? (
        <CircleCheck className="h-4 w-4 text-green-600 shrink-0" />
      ) : (
        <CircleDashed className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <span className={cn("text-xs", completed && "line-through")}>{label}</span>
    </button>
  );
}

export default function ProviderListingPage() {
  const queryClient = useQueryClient();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [newService, setNewService] = useState("");
  const [newInsurance, setNewInsurance] = useState("");
  const [newAgeGroup, setNewAgeGroup] = useState("");
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('provider-listing-expanded-sections');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Persist expanded sections to localStorage
  useEffect(() => {
    localStorage.setItem('provider-listing-expanded-sections', JSON.stringify([...expandedSections]));
  }, [expandedSections]);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevFacilityIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  const { selectedFacility, setHasUnsavedChanges } = useSelectedFacility();
  const { data: subscription } = useSubscription();
  
  // Get gallery limit based on plan
  const galleryLimit = subscription?.plan 
    ? PLAN_DETAILS[subscription.plan]?.gallery_limit || 5 
    : 5;

  // Reset state when facility changes
  useEffect(() => {
    if (selectedFacility?.id && prevFacilityIdRef.current !== selectedFacility.id) {
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
      setNewService("");
      setNewInsurance("");
      setNewAgeGroup("");
      setVerificationCode("");
      setCodeSent(false);
      setVerificationError(null);
      setHasUnsavedChanges(false);
      
      prevFacilityIdRef.current = selectedFacility.id;
    }
  }, [selectedFacility?.id, setHasUnsavedChanges]);

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

  // Fetch age groups
  const { data: ageGroups = [], refetch: refetchAgeGroups } = useQuery({
    queryKey: ["facility-age-groups", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data } = await supabase
        .from("facility_age_groups")
        .select("id, age_group")
        .eq("facility_id", selectedFacility.id);
      return data || [];
    },
    enabled: !!selectedFacility?.id,
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

    const ageGroupsChannel = supabase
      .channel(`age-groups-${selectedFacility.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facility_age_groups",
          filter: `facility_id=eq.${selectedFacility.id}`,
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
  }, [selectedFacility?.id, queryClient, refetchServices, refetchInsurance, refetchAgeGroups]);

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
      })
      .eq("id", facility.id);

    setIsAutoSaving(false);

    if (!error) {
      queryClient.setQueryData(["facility-listing", selectedFacility?.id], facility);
      queryClient.invalidateQueries({ queryKey: ["provider-data"] });
      queryClient.invalidateQueries({ queryKey: ["provider-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      setHasChanges(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
      
      toast({
        title: "Changes saved",
        description: "Your public profile has been updated.",
        action: facility.slug ? (
          <ToastAction altText="View Public Profile" asChild>
            <a href={`/center/${facility.slug}`} target="_blank" rel="noopener noreferrer">
              View Profile
            </a>
          </ToastAction>
        ) : undefined,
      });
    }
  }, [facility, isSaving, selectedFacility?.id, queryClient, toast]);

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
    
    const previousData = queryClient.getQueryData(["facility-listing", selectedFacility?.id]);
    queryClient.setQueryData(["facility-listing", selectedFacility?.id], facility);
    
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
      })
      .eq("id", facility.id);

    setIsSaving(false);

    if (error) {
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
      queryClient.invalidateQueries({ queryKey: ["provider-data"] });
      queryClient.invalidateQueries({ queryKey: ["provider-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility-services-count", selectedFacility?.id] });
      queryClient.invalidateQueries({ queryKey: ["facility-insurance-count", selectedFacility?.id] });
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

  const updateField = (field: keyof Facility, value: string | number | null) => {
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
      queryClient.invalidateQueries({ queryKey: ["facility-services-count", facility.id] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      toast({ title: "Service added" });
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
      queryClient.invalidateQueries({ queryKey: ["facility-insurance-count", facility.id] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      toast({ title: "Insurance added" });
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

  const handleAddAgeGroup = async (ageGroup: string) => {
    if (!facility || !ageGroup.trim()) return;
    
    const { error } = await supabase
      .from("facility_age_groups")
      .insert({ facility_id: facility.id, age_group: ageGroup.trim() });

    if (error) {
      toast({ title: "Failed to add age group", variant: "destructive" });
    } else {
      setNewAgeGroup("");
      refetchAgeGroups();
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      toast({ title: "Age group added" });
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

      queryClient.invalidateQueries({ queryKey: ["facility-listing", selectedFacility?.id] });
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

  // Loading state
  if (isLoading || (facilityData && !facility)) {
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
      <div className="max-w-6xl mx-auto space-y-6 pb-8">
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
                        {galleryLimit > 5 && (
                          <span className="text-primary font-medium"> (Paid plan benefit)</span>
                        )}
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
                          {facilityTypes.map((type) => (
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
                            {states.map((state) => (
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
                            {genderOptions.map((option) => (
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
                    {services.length > 0 ? (
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
                    ) : (
                      <EmptyTagsState type="services" />
                    )}

                    <div className="flex gap-2">
                      <Select value={newService} onValueChange={setNewService}>
                        <SelectTrigger className="h-11 flex-1">
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
                        className="h-11 gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
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
                    {insurance.length > 0 ? (
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
                    ) : (
                      <EmptyTagsState type="insurance" />
                    )}

                    <div className="flex gap-2">
                      <Select value={newInsurance} onValueChange={setNewInsurance}>
                        <SelectTrigger className="h-11 flex-1">
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
                        className="h-11 gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
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
                    {ageGroups.length > 0 ? (
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
                    ) : (
                      <div className="py-4 px-3 rounded-lg border border-dashed border-border bg-muted/30 text-center">
                        <p className="text-sm text-muted-foreground">
                          No age groups added yet. Specify which age groups you serve to help families find appropriate care.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Select value={newAgeGroup} onValueChange={setNewAgeGroup}>
                        <SelectTrigger className="h-11 flex-1">
                          <SelectValue placeholder="Select age group to add..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card max-h-[200px]">
                          {availableAgeGroups
                            .filter(ag => !ageGroups.some(existing => existing.age_group === ag))
                            .map((ag) => (
                              <SelectItem key={ag} value={ag}>
                                {ag}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={() => handleAddAgeGroup(newAgeGroup)}
                        disabled={!newAgeGroup}
                        className="h-11 gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
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
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4 order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start">
            {/* Profile Completion Card */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Profile Completion
                  </CardTitle>
                  <Badge 
                    variant={profileCompletion.percentage === 100 ? "default" : "secondary"}
                    className={cn(
                      "text-xs font-semibold",
                      profileCompletion.percentage === 100 && "bg-green-500 hover:bg-green-500/90"
                    )}
                  >
                    {profileCompletion.percentage}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress 
                  value={profileCompletion.percentage} 
                  className="h-2"
                />
                
                {profileCompletion.percentage < 100 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground mb-2">
                      Complete your profile to improve visibility
                    </p>
                    {profileCompletion.items.map((item) => (
                      <CompletionItem
                        key={item.key}
                        label={item.label}
                        completed={item.completed}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-700">Profile Complete!</p>
                      <p className="text-xs text-green-600">Your listing is fully optimized</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Card */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Listing Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center",
                    facility.status === 'approved' ? 'bg-green-500/10' : 
                    facility.status === 'pending' ? 'bg-amber-500/10' : 'bg-muted'
                  )}>
                    <StatusIcon className={cn(
                      "h-5 w-5",
                      facility.status === 'approved' ? 'text-green-600' : 
                      facility.status === 'pending' ? 'text-amber-600' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{statusConfig.label}</p>
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
                    <Badge variant={facility.status === 'approved' ? "default" : "secondary"} className="text-xs">
                      {facility.status === 'approved' ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium text-xs">{facility.facility_type || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium text-xs">{facility.city}, {facility.state}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Need Help?</p>
                  <Button variant="outline" size="sm" className="w-full text-xs gap-2" asChild>
                    <Link to="/provider-support">
                      <Info className="h-3.5 w-3.5" />
                      Contact Support
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border-primary/10 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Optimization Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">Add a detailed description with your unique approach</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">Upload high-quality photos of your facility</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">Respond to leads within 24 hours</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">Keep services and insurance list up to date</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Floating Save Bar */}
        <div className="sticky bottom-4 flex justify-center pt-4 z-10">
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-full bg-card/95 backdrop-blur-sm border shadow-lg transition-all duration-300",
            hasChanges ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          )}>
            <span className="text-sm text-muted-foreground">You have unsaved changes</span>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || isAutoSaving} 
              size="sm"
              className="gap-2 rounded-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
