import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";
// 2026-05-23: import the public-snapshot query key so save handlers
// can invalidate it alongside the provider-scoped keys. Without this,
// homepage Featured + /search-results cards kept the cached
// (placeholder-fallback) row for up to 5 minutes after a provider
// uploaded photos, even though the DB row was already updated.
import { PUBLIC_FACILITIES_QUERY_KEY } from "@/hooks/useStaticFacilities";
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
  Sparkles,
  CircleCheck,
  Users2,
  AlertTriangle,
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
import { Switch } from "@/components/ui/switch";
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
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";
import { PLAN_LIMITS } from "@/lib/planLimits";
import { getListingStatusMeta, type ListingStatusTone } from "@/lib/listingStatus";
import { FacilityPhoneVerifySection } from "@/components/provider/listing/FacilityPhoneVerifySection";
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
  verified_phone: string | null;
  verified_phone_set_at: string | null;
  has_facility_verified_contact: boolean | null;
  // Profile-content columns added in migration 20260709000000.
  // Rendered on both /center/[slug] and /account/facility/[id] via
  // the shared FacilityProfileExtras component.
  hours_of_operation: string | null;
  languages_spoken: string[] | null;
  accessibility_features: string[] | null;
  accepting_admissions: boolean | null;
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
      if (!/^[\d\s()+-]{10,}$/.test(trimmedValue)) return "Enter a valid phone number";
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
      if (trimmedValue) {
        if (/^(javascript|data):/i.test(trimmedValue)) {
          return "Invalid URL protocol";
        }
        // Normalize bare domains to https:// before validating
        const normalized = /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
        try {
          const parsed = new URL(normalized);
          if (!['http:', 'https:'].includes(parsed.protocol)) return "Enter a valid website URL";
        } catch {
          return "Enter a valid website URL (e.g. https://www.yourfacility.com)";
        }
      }
      return null;
    case "bed_count":
      if (trimmedValue) {
        const beds = parseInt(trimmedValue, 10);
        if (isNaN(beds) || beds < 1 || beds > 9999) {
          return "Bed count must be a number between 1 and 9999";
        }
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

  // Keyboard navigation between editor tabs — Left/Right (and
  // Home/End) wrap around the EDITOR_TABS list when focus is on a
  // tab button. Matches the WAI-ARIA "Tabs with Automatic Activation"
  // authoring pattern.
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, currentId: EditorTab) => {
    const idx = EDITOR_TABS.findIndex(t => t.id === currentId);
    if (idx === -1) return;
    let nextIdx = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIdx = (idx + 1) % EDITOR_TABS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIdx = (idx - 1 + EDITOR_TABS.length) % EDITOR_TABS.length;
    } else if (e.key === "Home") {
      nextIdx = 0;
    } else if (e.key === "End") {
      nextIdx = EDITOR_TABS.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const nextTab = EDITOR_TABS[nextIdx];
    setActiveTab(nextTab.id);
    // Move focus to the new tab button so the user can continue
    // arrow-navigation without re-tabbing back into the list.
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(`[data-editor-tab="${nextTab.id}"]`)
        ?.focus();
    });
  }, []);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevFacilityIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  const { selectedFacility, setHasUnsavedChanges } = useSelectedFacility();
  
  // Use prop facilityId if provided, otherwise use selectedFacility
  const currentFacilityId = propFacilityId || selectedFacility?.id;
  const { data: proStatus } = useProStatus(currentFacilityId);
  // International-patient acceptance is a Concierge-Partner-exclusive
  // capability (mirrors the is_active_concierge_partner DB gate + trigger).
  const { data: editorSubscription } = useFacilitySubscription(currentFacilityId);
  const isConciergePartner =
    editorSubscription?.has_concierge_partner === true &&
    // Mirror the is_active_concierge_partner DB gate exactly: grace window
    // (active OR past_due) + the add-on's own period must not have lapsed.
    (editorSubscription?.status === "active" || editorSubscription?.status === "past_due") &&
    (!editorSubscription?.concierge_current_period_end ||
      new Date(editorSubscription.concierge_current_period_end) > new Date());
  
  // Gallery cap reflects the active plan — Free 5, Pro 10 (matches the
  // enforce_facility_plan_photo_cap server-side trigger). proStatus.isPro
  // is the canonical client-side mirror of profiles.plan='pro' so this
  // tier-flips automatically when Stripe webhook activates Pro benefits.
  const galleryLimit = PLAN_LIMITS[proStatus?.isPro ? "pro" : "free"].photos;

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
      const session = await getCachedSession();
      if (!session) return null;

      const { data } = await supabase
        .from("facilities")
        .select("id, user_id, name, slug, address, city, state, zip_code, phone, email, reply_email, reply_email_verified, reply_email_verified_at, website, description, facility_type, gender_served, bed_count, status, suspended, profile_completion_celebrated, featured, logo_url, gallery_urls, year_established, accepts_international_patients, verified_phone, verified_phone_set_at, has_facility_verified_contact, hours_of_operation, languages_spoken, accessibility_features, accepting_admissions")
        .eq("id", currentFacilityId)
        .maybeSingle();

      return data;
    },
    enabled: !!currentFacilityId,
  });

  // Resolve the caller's role on THIS facility. The team feature grants
  // owners + managers edit rights and viewers read-only access (enforced
  // server-side: facilities_team_update / *_team_cud RLS = facility_role IN
  // (owner, manager)). We mirror it here so a viewer gets a read-only view
  // rather than editable controls whose saves RLS would silently reject
  // (0 rows, no error).
  const { data: editRole } = useQuery({
    queryKey: ["facility-edit-role", currentFacilityId],
    queryFn: async (): Promise<"owner" | "manager" | "viewer" | null> => {
      const session = await getCachedSession();
      if (!session || !currentFacilityId) return null;
      const { data: f } = await supabase
        .from("facilities")
        .select("user_id")
        .eq("id", currentFacilityId)
        .maybeSingle();
      if ((f as { user_id?: string } | null)?.user_id === session.user.id) return "owner";
      const { data: tm } = await supabase
        .from("facility_team_members")
        .select("role")
        .eq("facility_id", currentFacilityId)
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .maybeSingle();
      return ((tm as { role?: "manager" | "viewer" } | null)?.role) ?? null;
    },
    enabled: !!currentFacilityId,
  });
  // Optimistic while the role query is in flight (owner is the common case);
  // RLS is the real backstop and the manual-save path detects a denied write.
  const canEdit = editRole === undefined || editRole === "owner" || editRole === "manager";
  const isViewer = editRole === "viewer";

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
      const session = await getCachedSession();
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

  // Real-time subscriptions.
  //
  // Per-mount random suffix on every channel name so successive mounts
  // of the editor (provider closes the tab and re-opens, navigates to
  // another listing and back, etc.) never collide with a still-cached
  // subscribed channel — same fix we shipped across the dashboard +
  // pending-concierge-count + useProviderData hooks. Without the
  // suffix, supabase.channel(samename) returns the existing channel
  // and the next .on() chain throws "cannot add postgres_changes
  // callbacks after subscribe()" — which SEORouteBoundary catches
  // and renders as the "temporarily unavailable" fallback. cleanup
  // removeChannel wrapped in try/catch because the channel can be
  // torn down server-side asynchronously.
  useEffect(() => {
    if (!currentFacilityId) return;
    const suffix = Math.random().toString(36).slice(2, 10);

    const facilityChannel = supabase
      .channel(`facility-${currentFacilityId}-${suffix}`)
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
      .channel(`services-${currentFacilityId}-${suffix}`)
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
      .channel(`insurance-${currentFacilityId}-${suffix}`)
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
      .channel(`age-groups-${currentFacilityId}-${suffix}`)
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
      for (const ch of [facilityChannel, servicesChannel, insuranceChannel, ageGroupsChannel]) {
        try {
          supabase.removeChannel(ch);
        } catch {
          /* channel may already be torn down server-side */
        }
      }
    };
  }, [currentFacilityId, queryClient, refetchServices, refetchInsurance, refetchAgeGroups]);

  // Auto-save function (silent, no toast) - with input sanitization
  const performAutoSave = useCallback(async () => {
    if (!facility || isSaving) return;

    // Surface the FIRST validation issue as a subtle toast so the provider
    // doesn't sit watching the auto-save spinner think changes are persisting
    // when they're not. Toast is throttled by message-key dedup in our
    // useToast layer so repeated 3s ticks of the same error don't spam.
    const requiredFields = ["name", "facility_type", "address", "city", "state", "zip_code", "phone"];
    for (const field of requiredFields) {
      const error = validateField(field, facility[field as keyof Facility] as string | null);
      if (error) {
        toast({
          title: "Auto-save paused",
          description: `${error} Fix to resume saving.`,
          variant: "destructive",
        });
        return;
      }
    }

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
          title: "Auto-save paused",
          description: "Website URL is not allowed. Fix the website field to resume saving.",
          variant: "destructive",
        });
        return;
      }
    } catch (validationErr) {
      const msg = validationErr instanceof Error ? validationErr.message : "Invalid field value.";
      toast({
        title: "Auto-save paused",
        description: `${msg} Fix to resume saving.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsAutoSaving(true);

    const autoSaveSession = await getCachedSession();
    if (!autoSaveSession) {
      setIsAutoSaving(false);
      return;
    }
    
    try {
      const { data: savedRows, error } = await supabase
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
          accepts_international_patients: isConciergePartner ? facility.accepts_international_patients : false,
          hours_of_operation: facility.hours_of_operation,
          languages_spoken: facility.languages_spoken,
          accessibility_features: facility.accessibility_features,
          accepting_admissions: facility.accepting_admissions,
        })
        .eq("id", facility.id)
        .select("id");

      // 0 rows + no error == RLS rejected the write (e.g. access changed
      // mid-session). Mirror handleSave: never show "Saved" on a write that
      // didn't land. `hasChanges` stays true so the next debounce retries.
      if (!error && savedRows && savedRows.length > 0) {
        queryClient.setQueryData(["facility-listing", currentFacilityId], facility);
        queryClient.invalidateQueries({ queryKey: ["provider-data"] });
        queryClient.invalidateQueries({ queryKey: ["provider-facilities"] });
        queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
        queryClient.invalidateQueries({ queryKey: PUBLIC_FACILITIES_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
        setHasChanges(false);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
      } else {
        // Surface auto-save failures so providers don't think their
        // typing was saved when it silently wasn't. `hasChanges` stays
        // true on error so the floating save bar continues to nag and
        // the next 3-second debounce will retry automatically.
        console.error("[ListingEditor] Auto-save failed:", error?.message ?? "no rows updated (write blocked)");
        toast({
          title: "Auto-save failed",
          description: "Your latest changes weren't saved. Click Save Changes or try again — we'll keep retrying.",
          variant: "destructive",
        });
      }
    } catch (networkErr) {
      console.error("[ListingEditor] Auto-save network error:", networkErr);
      toast({
        title: "Auto-save offline",
        description: "We couldn't reach the server. Check your connection — your local edits are still in the form.",
        variant: "destructive",
      });
    } finally {
      setIsAutoSaving(false);
    }
    // isConciergePartner gates the persisted accepts_international_patients
    // value (line ~660); omitting it let a stale `false` overwrite a Concierge
    // partner's enabled flag when the subscription query resolved after the
    // last `facility` change.
  }, [facility, isSaving, currentFacilityId, queryClient, toast, isConciergePartner]);

  // Auto-save effect
  useEffect(() => {
    if (hasChanges && facility && canEdit) {
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
  }, [hasChanges, facility, performAutoSave, canEdit]);

  

  const handleSave = useCallback(async () => {
    if (!facility) return;
    if (!canEdit) {
      toast({
        title: "View-only access",
        description: "You have view-only access to this listing. Ask the facility owner for manager access to make changes.",
        variant: "destructive",
      });
      return;
    }
    
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
    } catch (validationErr) {
      toast({
        title: "Validation Error",
        description: (validationErr instanceof Error ? validationErr.message : "") || "Please fix the highlighted errors before saving.",
        variant: "destructive",
      });
      setHasChanges(true);
      setShowSaved(false);
      setIsSaving(false);
      return;
    }

    const saveSession = await getCachedSession();
    if (!saveSession) {
      toast({
        title: "Session Expired",
        description: "Please refresh the page and sign in again.",
        variant: "destructive",
      });
      setHasChanges(true);
      setShowSaved(false);
      setIsSaving(false);
      return;
    }

    // First-time 100%-complete celebration. Decide BEFORE the write so
    // we can persist `profile_completion_celebrated` in the SAME update —
    // otherwise the flag never gets set and the congratulatory email
    // re-fires on every save at 100%.
    const shouldCelebrate =
      profileCompletion.percentage === 100 &&
      !(facility as { profile_completion_celebrated?: boolean }).profile_completion_celebrated;

    try {
      const { data: savedRows, error } = await supabase
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
          accepts_international_patients: isConciergePartner ? facility.accepts_international_patients : false,
          hours_of_operation: facility.hours_of_operation,
          languages_spoken: facility.languages_spoken,
          accessibility_features: facility.accessibility_features,
          accepting_admissions: facility.accepting_admissions,
          ...(shouldCelebrate ? { profile_completion_celebrated: true } : {}),
        })
        .eq("id", facility.id)
        .select("id");

      // 0 rows + no error == RLS rejected the write (e.g. access changed
      // mid-session). Never claim success on a write that didn't land.
      if (error || !savedRows || savedRows.length === 0) {
        queryClient.setQueryData(["facility-listing", currentFacilityId], previousData);
        setFacility(previousData as Facility | null);
        setHasChanges(true);
        setShowSaved(false);
        toast({
          title: error ? "Error saving" : "Changes not saved",
          description: error
            ? "Failed to save changes. Please try again."
            : "You may no longer have edit access to this listing, so your changes weren't saved.",
          variant: "destructive",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["provider-data"] });
        queryClient.invalidateQueries({ queryKey: ["provider-facilities"] });
        queryClient.invalidateQueries({ queryKey: ["facility-services-count", currentFacilityId] });
        queryClient.invalidateQueries({ queryKey: ["facility-insurance-count", currentFacilityId] });
        // Stats chips on /provider/listings (ListingCard) read these
        // per-facility view/lead counters with a 5-minute staleTime.
        // Without an explicit invalidation on save, the listings index
        // shows stale stats for up to 5 minutes after the user edited
        // the listing — confusing because the rest of the row reflects
        // their latest changes. These keys mirror the queries in
        // src/components/provider/listing/ListingCard.tsx lines 102+.
        queryClient.invalidateQueries({ queryKey: ["facility-views-count", currentFacilityId] });
        queryClient.invalidateQueries({ queryKey: ["facility-leads-count", currentFacilityId] });
        queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
        queryClient.invalidateQueries({ queryKey: PUBLIC_FACILITIES_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
        // Saved-badge dwell time bumped 2s → 4s. The earlier window
        // dismissed before slow networks could even render the badge.
        setTimeout(() => setShowSaved(false), 4000);

        // First-time 100%-complete celebration. The flag was persisted in
        // the UPDATE above, so reflect it locally + in cache to keep an
        // immediate re-save from re-evaluating shouldCelebrate as true
        // before the next refetch. Fire the email exactly once.
        if (shouldCelebrate) {
          const celebrated = { ...facility, profile_completion_celebrated: true } as Facility;
          setFacility(celebrated);
          queryClient.setQueryData(["facility-listing", currentFacilityId], celebrated);
          void supabase.functions
            .invoke("send-profile-complete-email", {
              body: { facilityId: currentFacilityId },
            })
            .catch((err) =>
              console.warn("[ListingEditor] profile-complete email failed", err),
            );
        }

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
    } catch (networkErr) {
      // Network-level throw (e.g. fetch abort, offline) — restore optimistic state
      console.error("[ListingEditor] handleSave network error:", networkErr);
      queryClient.setQueryData(["facility-listing", currentFacilityId], previousData);
      setFacility(previousData as Facility | null);
      setHasChanges(true);
      setShowSaved(false);
      toast({
        title: "Network error",
        description: "Could not reach the server. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
    // isConciergePartner gates the persisted accepts_international_patients
    // value (~826) and profileCompletion drives the one-time 100%-complete
    // celebration (~803); both live outside `facility`, so they must be deps
    // or a stale value can wipe a partner's international flag / mis-fire the
    // completion email.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- validateAllFields is declared below; React runs callbacks after the full render so the forward reference is safe.
  }, [facility, canEdit, toast, queryClient, currentFacilityId, setFacility, isConciergePartner, profileCompletion]);

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
  }, [hasChanges, isSaving, isAutoSaving, handleSave]);

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

  const updateField = (field: keyof Facility, value: string | number | boolean | string[] | null) => {
    if (!canEdit) return; // viewers are read-only — keep the form inert rather than letting edits build up that RLS would reject
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

  const validateAllFields = useCallback((): boolean => {
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
  }, [facility]);

  // Helper: assert all Supabase batch ops succeeded; throw on first DB/RLS error.
  const assertAllOk = (
    results: Array<{ error: { message: string } | null }>,
    label: string,
  ) => {
    const failed = results.find((r) => r?.error);
    if (failed?.error) {
      throw new Error(`${label}: ${failed.error.message}`);
    }
  };

  const handleServicesChange = async (selectedServices: string[]) => {
    if (!facility || !canEdit) return;

    const currentServiceNames = services.map(s => s.service_name);
    const toAdd = selectedServices.filter(s => !currentServiceNames.includes(s));
    const toRemove = services.filter(s => !selectedServices.includes(s.service_name));

    if (toAdd.length === 0 && toRemove.length === 0) return;

    try {
      const ops: Array<Promise<{ error: { message: string } | null }>> = [];
      if (toAdd.length > 0) {
        ops.push(
          supabase
            .from("facility_services")
            .insert(toAdd.map(s => ({ facility_id: facility.id, service_name: s }))) as unknown as Promise<{ error: { message: string } | null }>
        );
      }
      for (const service of toRemove) {
        ops.push(
          supabase.from("facility_services").delete().eq("id", service.id) as unknown as Promise<{ error: { message: string } | null }>
        );
      }
      const results = await Promise.all(ops);
      assertAllOk(results, "Failed to update services");

      refetchServices();
      queryClient.invalidateQueries({ queryKey: ["facility-services-count", facility.id] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: PUBLIC_FACILITIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      toast({ title: toAdd.length > 0 ? "Services updated" : "Service removed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update services";
      toast({ title: "Could not update services", description: message, variant: "destructive" });
    }
  };

  const handleInsuranceChange = async (selectedInsurance: string[]) => {
    if (!facility || !canEdit) return;

    const currentInsuranceNames = insurance.map(i => i.insurance_name);
    const toAdd = selectedInsurance.filter(i => !currentInsuranceNames.includes(i));
    const toRemove = insurance.filter(i => !selectedInsurance.includes(i.insurance_name));

    if (toAdd.length === 0 && toRemove.length === 0) return;

    try {
      const ops: Array<Promise<{ error: { message: string } | null }>> = [];
      if (toAdd.length > 0) {
        ops.push(
          supabase
            .from("facility_insurance")
            .insert(toAdd.map(i => ({ facility_id: facility.id, insurance_name: i }))) as unknown as Promise<{ error: { message: string } | null }>
        );
      }
      for (const ins of toRemove) {
        ops.push(
          supabase.from("facility_insurance").delete().eq("id", ins.id) as unknown as Promise<{ error: { message: string } | null }>
        );
      }
      const results = await Promise.all(ops);
      assertAllOk(results, "Failed to update insurance");

      refetchInsurance();
      queryClient.invalidateQueries({ queryKey: ["facility-insurance-count", facility.id] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: PUBLIC_FACILITIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      toast({ title: toAdd.length > 0 ? "Insurance updated" : "Insurance removed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update insurance";
      toast({ title: "Could not update insurance", description: message, variant: "destructive" });
    }
  };

  const handleAgeGroupsChange = async (selectedAgeGroups: string[]) => {
    if (!facility || !canEdit) return;

    const currentAgeGroupNames = ageGroups.map(ag => ag.age_group);
    const toAdd = selectedAgeGroups.filter(ag => !currentAgeGroupNames.includes(ag));
    const toRemove = ageGroups.filter(ag => !selectedAgeGroups.includes(ag.age_group));

    if (toAdd.length === 0 && toRemove.length === 0) return;

    try {
      const ops: Array<Promise<{ error: { message: string } | null }>> = [];
      if (toAdd.length > 0) {
        ops.push(
          supabase
            .from("facility_age_groups")
            .insert(toAdd.map(ag => ({ facility_id: facility.id, age_group: ag }))) as unknown as Promise<{ error: { message: string } | null }>
        );
      }
      for (const ag of toRemove) {
        ops.push(
          supabase.from("facility_age_groups").delete().eq("id", ag.id) as unknown as Promise<{ error: { message: string } | null }>
        );
      }
      const results = await Promise.all(ops);
      assertAllOk(results, "Failed to update age groups");

      refetchAgeGroups();
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      queryClient.invalidateQueries({ queryKey: PUBLIC_FACILITIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      toast({ title: toAdd.length > 0 ? "Age groups updated" : "Age group removed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update age groups";
      toast({ title: "Could not update age groups", description: message, variant: "destructive" });
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    if (!canEdit) return;
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
        queryClient.invalidateQueries({ queryKey: PUBLIC_FACILITIES_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      }
    }
  };

  const handleRemoveInsurance = async (insuranceId: string) => {
    if (!canEdit) return;
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
        queryClient.invalidateQueries({ queryKey: PUBLIC_FACILITIES_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["facility", facility.slug] });
      }
    }
  };

  const handleRemoveAgeGroup = async (ageGroupId: string) => {
    if (!canEdit) return;
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
        queryClient.invalidateQueries({ queryKey: PUBLIC_FACILITIES_QUERY_KEY });
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
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Couldn't send the code. Try again.";
      setVerificationError(msg);
      toast({
        title: "Failed to send code",
        description: msg,
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
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Verification failed. Try again.";
      setVerificationError(msg);
      toast({
        title: "Verification failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Status chip styling per presentation tone. The label/tone themselves come
  // from the shared getListingStatusMeta so rejected / needs_edits /
  // pending_review no longer masquerade as "Draft".
  const STATUS_TONE_STYLES: Record<ListingStatusTone, { icon: typeof CheckCircle; className: string }> = {
    live: { icon: CheckCircle, className: "bg-green-500/10 text-green-700 border-green-200" },
    review: { icon: Clock, className: "bg-amber-500/10 text-amber-700 border-amber-200" },
    attention: { icon: AlertTriangle, className: "bg-red-500/10 text-red-700 border-red-200" },
    paused: { icon: AlertTriangle, className: "bg-amber-500/10 text-amber-700 border-amber-200" },
    draft: { icon: AlertCircle, className: "bg-muted text-muted-foreground border-border" },
  };
  const getStatusConfig = (status: string) => {
    const meta = getListingStatusMeta(status, (facility as { suspended?: boolean } | null)?.suspended);
    return { label: meta.label, ...STATUS_TONE_STYLES[meta.tone] };
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
          <Building2 className="h-8 w-8 text-primary" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold text-foreground">No Listing Found</h2>
        <p className="mt-2 text-muted-foreground">
          Create your facility listing to start receiving leads from families.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
          {/* Send signed-in providers to the in-app add flow rather than
              back to the public marketing signup. */}
          <Button asChild size="lg">
            <Link to="/provider/add-location">Add facility</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/provider/listings">Back to listings</Link>
          </Button>
        </div>
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
      {/* Suspended facility banner. Saves still go through (the row
          is RLS-readable + RLS-writable by the owner) but we surface
          the state prominently so the provider knows their listing
          isn't public and what to do about it. Without this banner
          they could spend 20 minutes polishing a facility that won't
          appear in search results and have no clue why. */}
      {(facility as { suspended?: boolean }).suspended && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">
              This listing is paused
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-amber-800/80">
              Edits still save, but the facility won't appear in public
              search results or accept new inquiries. Contact support to
              reactivate.
            </p>
          </div>
        </div>
      )}

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
          <Button onClick={handleSave} disabled={!canEdit || isSaving || isAutoSaving || !hasChanges} size="sm" className="gap-1.5">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      {isViewer && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          <span>You have <strong>view-only</strong> access to this listing. Ask the facility owner for manager access to make changes.</span>
        </div>
      )}

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
      <div
        role="tablist"
        aria-label="Listing editor sections"
        aria-orientation="horizontal"
        className="md:hidden mb-4 -mx-3 px-3 overflow-x-auto scrollbar-none"
      >
        <div className="flex gap-1 min-w-max pb-2">
          {EDITOR_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isComplete = tabCompletion[tab.id];
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`editor-tab-panel-${tab.id}`}
                id={`editor-tab-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                data-editor-tab={tab.id}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {tab.label}
                {isComplete && !isActive && (
                  <CircleCheck className="h-3 w-3 text-green-600" aria-label="section complete" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Desktop Layout: Sidebar Tabs + Content ── */}
      <div className="flex gap-6">
        {/* Desktop sidebar nav */}
        <nav
          role="tablist"
          aria-label="Listing editor sections"
          aria-orientation="vertical"
          className="hidden md:flex flex-col w-44 shrink-0 space-y-0.5 sticky top-6 self-start"
        >
          {EDITOR_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isComplete = tabCompletion[tab.id];
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`editor-tab-panel-${tab.id}`}
                id={`editor-tab-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                data-editor-tab={tab.id}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} aria-hidden />
                <span className="truncate flex-1">{tab.label}</span>
                {isComplete && (
                  <CircleCheck
                    className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-green-600")}
                    aria-label="section complete"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Content area – fixed min height prevents shift */}
        <div className="flex-1 min-w-0 min-h-[500px]">
          <Card className="border-border/60 shadow-sm">
            {/* Viewers (read-only team members) get a non-interactive view.
                The core text fields already ignore viewer edits (updateField
                guard) and the child-table handlers early-return, but the
                embedded Services/Insurance/Age-Group/Staff/Trust/Photo controls
                don't accept a role prop — so we make the whole panel
                pointer-inert for non-editors. RLS is still the real backstop;
                this just stops a viewer from poking controls whose writes would
                be silently rejected behind the "view-only" banner. */}
            <CardContent className={cn("p-4 sm:p-6", !canEdit && "pointer-events-none")} aria-disabled={!canEdit}>
              {/* ═══ PHOTOS TAB ═══ */}
              {activeTab === "photos" && (
                <div
                  role="tabpanel"
                  id="editor-tab-panel-photos"
                  aria-labelledby="editor-tab-photos"
                  tabIndex={0}
                  className="space-y-6 focus-visible:outline-none"
                >
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
                <div
                  role="tabpanel"
                  id="editor-tab-panel-basic"
                  aria-labelledby="editor-tab-basic"
                  tabIndex={0}
                  className="space-y-5 focus-visible:outline-none"
                >
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
                <div
                  role="tabpanel"
                  id="editor-tab-panel-location"
                  aria-labelledby="editor-tab-location"
                  tabIndex={0}
                  className="space-y-5 focus-visible:outline-none"
                >
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
                <div
                  role="tabpanel"
                  id="editor-tab-panel-contact"
                  aria-labelledby="editor-tab-contact"
                  tabIndex={0}
                  className="space-y-5 focus-visible:outline-none"
                >
                  <div>
                    <h2 className="text-base font-semibold text-foreground mb-1">Contact Information</h2>
                    <p className="text-sm text-muted-foreground">How families can reach you</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FacilityPhoneVerifySection
                      value={facility.phone}
                      onChange={(v) => updateField("phone", v)}
                      onBlur={() => handleFieldBlur("phone", facility.phone)}
                      facilityId={facility.id}
                      alreadyVerified={
                        !!facility.has_facility_verified_contact &&
                        !!facility.verified_phone &&
                        facility.verified_phone.replace(/\D/g, "").slice(-10) ===
                          facility.phone.replace(/\D/g, "").slice(-10)
                      }
                      onVerified={() => {
                        // Mirror onto local state so the badge persists
                        // across re-renders before the next facility refetch.
                        setFacility((prev) =>
                          prev
                            ? {
                                ...prev,
                                verified_phone: prev.phone,
                                verified_phone_set_at: new Date().toISOString(),
                                has_facility_verified_contact: true,
                              }
                            : prev,
                        );
                      }}
                      error={fieldErrors.phone}
                      touched={touchedFields.has("phone")}
                      label="Phone Number"
                      required
                    />
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
                        <Input type="email" value={facility.reply_email || ""} onChange={(e) => {
                          updateField("reply_email", e.target.value);
                          if (e.target.value !== facilityData?.reply_email) {
                            // New email address — revoke the old verified status so it cannot be saved as verified
                            setFacility(prev => prev ? { ...prev, reply_email: e.target.value, reply_email_verified: false, reply_email_verified_at: null } : prev);
                            setCodeSent(false);
                            setVerificationCode("");
                            setVerificationError(null);
                          }
                        }} onBlur={(e) => handleFieldBlur("reply_email", e.target.value)} className={cn("h-11 pl-10", fieldErrors.reply_email && touchedFields.has("reply_email") && "border-destructive")} placeholder={profileEmail || "replies@facility.com"} />
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
                <div
                  role="tabpanel"
                  id="editor-tab-panel-program"
                  aria-labelledby="editor-tab-program"
                  tabIndex={0}
                  className="space-y-5 focus-visible:outline-none"
                >
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
                        <Input
                          type="number"
                          min="1"
                          max="9999"
                          value={facility.bed_count || ""}
                          onChange={(e) => {
                            // Only allow positive integers
                            const raw = e.target.value.replace(/[^0-9]/g, "");
                            updateField("bed_count", raw);
                            if (touchedFields.has("bed_count")) {
                              setFieldErrors(prev => ({ ...prev, bed_count: validateField("bed_count", raw) }));
                            }
                          }}
                          onBlur={(e) => handleFieldBlur("bed_count", e.target.value)}
                          placeholder="e.g., 24"
                          className={cn("h-11 pl-10", fieldErrors.bed_count && touchedFields.has("bed_count") && "border-destructive")}
                        />
                        {fieldErrors.bed_count && touchedFields.has("bed_count") && (
                          <p className="text-xs text-destructive mt-1">{fieldErrors.bed_count}</p>
                        )}
                      </div>
                    </FormField>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium flex items-center gap-2"><Globe className="h-4 w-4 text-primary" />Accept International Patients</Label>
                        <p className="text-xs text-muted-foreground">
                          {isConciergePartner
                            ? "Enable if you accept patients from outside the US"
                            : "Available to Concierge Partners — international exposure is part of the Concierge upgrade"}
                        </p>
                      </div>
                      {/* International acceptance is a Concierge-Partner-only
                          capability — the toggle is disabled for non-partners
                          (a DB trigger also blocks enabling it server-side). */}
                      <Switch
                        checked={isConciergePartner && (facility.accepts_international_patients || false)}
                        onCheckedChange={(checked) => updateField("accepts_international_patients", checked)}
                        disabled={!isConciergePartner}
                        aria-label="Accept International Patients"
                      />
                    </div>
                    {!isConciergePartner ? (
                      <div className="mt-3 p-3 rounded-md bg-violet-50 border border-violet-200 flex items-center justify-between gap-3">
                        <p className="text-xs text-violet-800">
                          Become a Concierge Partner to be featured on our international pages and accept patients from abroad.
                        </p>
                        <Button asChild size="sm" variant="outline" className="shrink-0 border-violet-300 text-violet-700 hover:bg-violet-100">
                          <Link to="/provider/marketing/concierge">Learn more</Link>
                        </Button>
                      </div>
                    ) : facility.accepts_international_patients ? (
                      <div className="mt-3 p-3 rounded-md bg-primary/5 border border-primary/10"><p className="text-xs text-primary">Your facility will be visible to international clients.</p></div>
                    ) : null}
                  </div>

                  {/* ═══ PROFILE EXTRAS ═══
                      Hours, languages, accessibility, admissions. All
                      optional + display-only on the profile pages. Empty
                      values render nothing on the public side. */}
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                    <div>
                      <Label className="text-sm font-medium">Hours of Operation</Label>
                      <p className="text-xs text-muted-foreground mb-2">Free-form. Example: "Mon-Fri 9am-5pm, Sat 10am-2pm, Sun closed"</p>
                      <Input
                        value={facility.hours_of_operation || ""}
                        onChange={(e) => updateField("hours_of_operation", e.target.value.slice(0, 200))}
                        placeholder="Mon-Fri 9am-5pm"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Languages Spoken</Label>
                      <p className="text-xs text-muted-foreground mb-2">Comma-separated. Example: English, Spanish, ASL</p>
                      <Input
                        value={(facility.languages_spoken || []).join(", ")}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const arr = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
                          updateField("languages_spoken", arr.length > 0 ? arr : null);
                        }}
                        placeholder="English, Spanish, ASL"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Accessibility Features</Label>
                      <p className="text-xs text-muted-foreground mb-2">Comma-separated. Example: Wheelchair accessible, ASL interpreters available, Hearing loops</p>
                      <Input
                        value={(facility.accessibility_features || []).join(", ")}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const arr = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
                          updateField("accessibility_features", arr.length > 0 ? arr : null);
                        }}
                        placeholder="Wheelchair accessible, ASL interpreters"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">Currently Accepting Admissions</Label>
                          <p className="text-xs text-muted-foreground">
                            {facility.accepting_admissions === null
                              ? "Status not set — no badge will display."
                              : facility.accepting_admissions
                                ? "Green badge will display: “Currently accepting admissions”"
                                : "Grey badge will display: “Not currently accepting admissions”"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={facility.accepting_admissions === true ? "default" : "outline"}
                            onClick={() => updateField("accepting_admissions", facility.accepting_admissions === true ? null : true)}
                            className="h-8 px-3"
                          >
                            Yes
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={facility.accepting_admissions === false ? "default" : "outline"}
                            onClick={() => updateField("accepting_admissions", facility.accepting_admissions === false ? null : false)}
                            className="h-8 px-3"
                          >
                            No
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ SERVICES TAB ═══ */}
              {activeTab === "services" && (
                <div
                  role="tabpanel"
                  id="editor-tab-panel-services"
                  aria-labelledby="editor-tab-services"
                  tabIndex={0}
                  className="space-y-5 focus-visible:outline-none"
                >
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
                <div
                  role="tabpanel"
                  id="editor-tab-panel-insurance"
                  aria-labelledby="editor-tab-insurance"
                  tabIndex={0}
                  className="space-y-5 focus-visible:outline-none"
                >
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
                <div
                  role="tabpanel"
                  id="editor-tab-panel-ageGroups"
                  aria-labelledby="editor-tab-ageGroups"
                  tabIndex={0}
                  className="space-y-5 focus-visible:outline-none"
                >
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
                <div
                  role="tabpanel"
                  id="editor-tab-panel-trust"
                  aria-labelledby="editor-tab-trust"
                  tabIndex={0}
                  className="space-y-5 focus-visible:outline-none"
                >
                  <div>
                    <h2 className="text-base font-semibold text-foreground mb-1">Trust & Credentials</h2>
                    <p className="text-sm text-muted-foreground">Accreditations and certifications</p>
                  </div>
                  <ProviderTrustForm facilityId={facility.id} userId={facility.user_id} yearEstablished={facility.year_established} onYearChange={(year) => updateField("year_established", year)} isEmbedded />
                </div>
              )}

              {/* ═══ STAFF TAB ═══ */}
              {activeTab === "staff" && (
                <div
                  role="tabpanel"
                  id="editor-tab-panel-staff"
                  aria-labelledby="editor-tab-staff"
                  tabIndex={0}
                  className="space-y-5 focus-visible:outline-none"
                >
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
      {canEdit && <ListingFloatingSaveBar hasChanges={hasChanges} isSaving={isSaving} isAutoSaving={isAutoSaving} onSave={handleSave} />}

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
