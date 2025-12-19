import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EmailVerificationStep } from "@/components/provider/EmailVerificationStep";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Building2,
  Stethoscope,
  CreditCard,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Globe,
  Lock,
  Image as ImageIcon,
  ShieldCheck,
  Sparkles,
  Users,
  TrendingUp,
  Shield,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage, validateImageFile } from "@/lib/imageUtils";
import { PlanSelectionStep } from "@/components/provider/PlanSelectionStep";
import { PLAN_DETAILS } from "@/hooks/useSubscription";
import { providerNavLinks } from "@/data/providerNavLinks";

const getBrowserInfo = (): { browser: string; os: string; device: string } => {
  const ua = navigator.userAgent;
  
  let browser = "Unknown Browser";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  
  let os = "Unknown OS";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  let device = "Desktop";
  if (ua.includes("Mobile") || ua.includes("Android")) device = "Mobile";
  else if (ua.includes("Tablet") || ua.includes("iPad")) device = "Tablet";
  
  return { browser, os, device };
};

const generateSessionToken = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

const steps = [
  { id: 1, name: "Account", icon: User },
  { id: 2, name: "Verify", icon: ShieldCheck },
  { id: 3, name: "Facility", icon: Building2 },
  { id: 4, name: "Branding", icon: ImageIcon },
  { id: 5, name: "Services", icon: Stethoscope },
  { id: 6, name: "Insurance", icon: CreditCard },
  { id: 7, name: "Plan", icon: Crown },
  { id: 8, name: "Review", icon: CheckCircle },
];

const treatmentTypes = [
  "Detoxification",
  "Inpatient/Residential",
  "Outpatient",
  "Intensive Outpatient (IOP)",
  "Partial Hospitalization (PHP)",
  "Medication-Assisted Treatment (MAT)",
  "Dual Diagnosis",
  "Trauma Therapy",
  "Cognitive Behavioral Therapy (CBT)",
  "Group Therapy",
  "Family Therapy",
  "Holistic/Alternative Therapies",
  "Aftercare/Continuing Care",
];

const insuranceProviders = [
  "Aetna",
  "Anthem Blue Cross",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Medicaid",
  "Medicare",
  "Tricare",
  "UnitedHealthcare",
  "Self-Pay/Private Pay",
  "Sliding Scale/Financial Assistance",
];

const facilityTypes = [
  "Residential Treatment Center",
  "Outpatient Clinic",
  "Detox Center",
  "Sober Living Home",
  "Hospital-Based Program",
  "Telehealth/Virtual",
];

const states = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

export default function ProviderSignup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/provider-dashboard");
      }
    });
  }, [navigate]);

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Account
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    jobTitle: "",

    // Step 3: Facility
    facilityName: "",
    facilityType: "",
    facilityPhone: "",
    facilityEmail: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    description: "",

    // Step 4: Branding
    logoFile: null as File | null,
    logoPreview: "",
    galleryFiles: [] as File[],
    galleryPreviews: [] as string[],

    // Step 5: Services
    selectedTreatments: [] as string[],
    bedCount: "",
    ageGroups: [] as string[],
    genderServed: "",

    // Step 6: Insurance
    selectedInsurance: [] as string[],
    licensingInfo: "",
    accreditations: "",

    // Step 7: Plan
    selectedPlan: "basic" as "basic" | "professional" | "featured",

    // Terms
    agreeToTerms: false,
  });

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: string, item: string) => {
    setFormData((prev) => {
      const array = prev[field as keyof typeof prev] as string[];
      if (array.includes(item)) {
        return { ...prev, [field]: array.filter((i) => i !== item) };
      } else {
        return { ...prev, [field]: [...array, item] };
      }
    });
  };

  const nextStep = () => {
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleEmailVerified = () => {
    setEmailVerified(true);
    setCurrentStep(3); // Move to Facility step
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // 1. Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/provider-dashboard`,
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          toast({
            title: "Account Exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Signup Failed",
            description: authError.message,
            variant: "destructive",
          });
        }
        setIsSubmitting(false);
        return;
      }

      if (!authData.user) {
        toast({
          title: "Signup Failed",
          description: "Unable to create account. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const userId = authData.user.id;

      // 2. Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: userId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        job_title: formData.jobTitle,
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }

      // 3. Create facility
      const { data: facilityData, error: facilityError } = await supabase
        .from("facilities")
        .insert({
          user_id: userId,
          name: formData.facilityName,
          facility_type: formData.facilityType,
          phone: formData.facilityPhone,
          email: formData.facilityEmail,
          website: formData.website,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          description: formData.description,
          bed_count: formData.bedCount,
          gender_served: formData.genderServed,
        })
        .select()
        .single();

      if (facilityError) {
        console.error("Facility creation error:", facilityError);
        toast({
          title: "Partial Success",
          description: "Account created but there was an issue saving facility data. Please update in your dashboard.",
        });
        navigate("/provider-dashboard");
        return;
      }

      const facilityId = facilityData.id;

      // 4. Insert services
      if (formData.selectedTreatments.length > 0) {
        const servicesData = formData.selectedTreatments.map((service) => ({
          facility_id: facilityId,
          service_name: service,
        }));
        await supabase.from("facility_services").insert(servicesData);
      }

      // 5. Insert age groups
      if (formData.ageGroups.length > 0) {
        const ageGroupsData = formData.ageGroups.map((ageGroup) => ({
          facility_id: facilityId,
          age_group: ageGroup,
        }));
        await supabase.from("facility_age_groups").insert(ageGroupsData);
      }

      // 6. Insert insurance
      if (formData.selectedInsurance.length > 0) {
        const insuranceData = formData.selectedInsurance.map((insurance) => ({
          facility_id: facilityId,
          insurance_name: insurance,
        }));
        await supabase.from("facility_insurance").insert(insuranceData);
      }

      // 7. Insert credentials
      if (formData.licensingInfo || formData.accreditations) {
        await supabase.from("facility_credentials").insert({
          facility_id: facilityId,
          licensing_info: formData.licensingInfo,
          accreditations: formData.accreditations,
        });
      }

      // 8. Upload images if provided
      let logoUrl: string | null = null;
      const galleryUrls: string[] = [];

      if (formData.logoFile) {
        try {
          const compressedLogo = await compressImage(formData.logoFile, "logo");
          const logoFileName = `${userId}/${facilityId}/logo/${Date.now()}.webp`;
          
          const { error: logoUploadError } = await supabase.storage
            .from("facility-images")
            .upload(logoFileName, compressedLogo, { upsert: true });

          if (!logoUploadError) {
            const { data: logoUrlData } = supabase.storage
              .from("facility-images")
              .getPublicUrl(logoFileName);
            logoUrl = logoUrlData.publicUrl;
          }
        } catch (e) {
          console.error("Logo upload error:", e);
        }
      }

      if (formData.galleryFiles.length > 0) {
        for (const file of formData.galleryFiles) {
          try {
            const compressedImage = await compressImage(file, "gallery");
            const galleryFileName = `${userId}/${facilityId}/gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
            
            const { error: galleryUploadError } = await supabase.storage
              .from("facility-images")
              .upload(galleryFileName, compressedImage, { upsert: true });

            if (!galleryUploadError) {
              const { data: galleryUrlData } = supabase.storage
                .from("facility-images")
                .getPublicUrl(galleryFileName);
              galleryUrls.push(galleryUrlData.publicUrl);
            }
          } catch (e) {
            console.error("Gallery upload error:", e);
          }
        }
      }

      // Update facility with image URLs if any were uploaded
      if (logoUrl || galleryUrls.length > 0) {
        await supabase
          .from("facilities")
          .update({
            logo_url: logoUrl,
            gallery_urls: galleryUrls.length > 0 ? galleryUrls : null,
          })
          .eq("id", facilityId);
      }

      // 9. Create notification preferences
      await supabase.from("notification_preferences").insert({
        user_id: userId,
      });

      // 10. Create initial login session tracking
      try {
        const { browser, os, device } = getBrowserInfo();
        const sessionToken = generateSessionToken();
        localStorage.setItem("current_session_token", sessionToken);
        
        await supabase.from("user_sessions").insert({
          user_id: userId,
          session_token: sessionToken,
          browser,
          os,
          device_name: device,
          is_current: true,
          last_active_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        });
        
        // Log the signup as activity
        supabase.functions.invoke("log-activity", {
          body: {
            user_id: userId,
            event_type: "signup",
            event_description: `Created new provider account from ${browser} on ${os}`,
          },
        });
      } catch (sessionError) {
        console.error("Session tracking error:", sessionError);
        // Non-blocking - continue even if session tracking fails
      }

      // 11. Notify admin of new provider signup
      try {
        await supabase.functions.invoke("notify-admin-provider-signup", {
          body: {
            facilityId,
            facilityName: formData.facilityName,
            providerEmail: formData.email,
            city: formData.city,
            state: formData.state,
          },
        });
      } catch (notifyError) {
        console.error("Admin notification error:", notifyError);
        // Non-blocking - continue even if notification fails
      }

      // 12. Send welcome email to provider
      try {
        await supabase.functions.invoke("send-provider-welcome-email", {
          body: {
            facilityId,
            facilityName: formData.facilityName,
            providerEmail: formData.email,
            providerFirstName: formData.firstName,
            selectedPlan: formData.selectedPlan,
          },
        });
      } catch (welcomeError) {
        console.error("Welcome email error:", welcomeError);
        // Non-blocking - continue even if email fails
      }

      // 13. Handle subscription for paid plans
      if (formData.selectedPlan !== "basic") {
        toast({
          title: "Account Created!",
          description: "Redirecting to complete your subscription...",
        });

        // Create checkout session and redirect to Stripe
        try {
          const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke("create-checkout", {
            body: { plan: formData.selectedPlan },
          });

          if (checkoutError || !checkoutData?.url) {
            console.error("Checkout error:", checkoutError);
            toast({
              title: "Account Created",
              description: "Your account is ready. You can subscribe from your dashboard.",
            });
            navigate("/provider-dashboard");
          } else {
            // Redirect to Stripe Checkout
            window.location.href = checkoutData.url;
          }
        } catch (checkoutErr) {
          console.error("Checkout invocation error:", checkoutErr);
          toast({
            title: "Account Created",
            description: "Your account is ready. You can subscribe from your dashboard.",
          });
          navigate("/provider-dashboard");
        }
      } else {
        toast({
          title: "Welcome to RehabLookup!",
          description: "Your account and facility have been created successfully.",
        });
        navigate("/provider-dashboard");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.firstName &&
          formData.lastName &&
          formData.email &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
          formData.phone &&
          formData.password &&
          formData.password.length >= 6 &&
          formData.password === formData.confirmPassword
        );
      case 2:
        return emailVerified;
      case 3:
        return (
          formData.facilityName &&
          formData.facilityType &&
          formData.facilityPhone &&
          formData.address &&
          formData.city &&
          formData.state &&
          formData.zipCode
        );
      case 4:
        return true; // Branding is optional
      case 5:
        return formData.selectedTreatments.length > 0;
      case 6:
        return formData.selectedInsurance.length > 0;
      case 7:
        return true; // Plan selection always has a default
      case 8:
        return formData.agreeToTerms;
      default:
        return false;
    }
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      logoFile: file,
      logoPreview: preview,
    }));
  };

  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 5 - formData.galleryFiles.length;
    if (files.length > remainingSlots) {
      toast({
        title: "Too many images",
        description: `You can only upload ${remainingSlots} more image${remainingSlots !== 1 ? "s" : ""}.`,
        variant: "destructive",
      });
      return;
    }

    const validFiles: File[] = [];
    const previews: string[] = [];

    for (const file of files) {
      const validation = validateImageFile(file);
      if (validation.valid) {
        validFiles.push(file);
        previews.push(URL.createObjectURL(file));
      }
    }

    setFormData((prev) => ({
      ...prev,
      galleryFiles: [...prev.galleryFiles, ...validFiles],
      galleryPreviews: [...prev.galleryPreviews, ...previews],
    }));
  };

  const removeGalleryImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      galleryFiles: prev.galleryFiles.filter((_, i) => i !== index),
      galleryPreviews: prev.galleryPreviews.filter((_, i) => i !== index),
    }));
  };

  const removeLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoFile: null,
      logoPreview: "",
    }));
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        navLinks={providerNavLinks}
        ctaLink="/provider-login"
        ctaLabel="Provider Login"
        variant="provider"
      />

      <main className="flex-1 py-6 md:py-12">
        <div className="container px-5 md:px-4">
          <div className="mx-auto max-w-2xl">
            {/* Value Proposition Banner */}
            {currentStep === 1 && (
              <div className="mb-6 md:mb-8 rounded-2xl md:rounded-xl border border-accent/30 bg-gradient-to-br from-accent/5 via-background to-primary/5 p-5 md:p-8">
                <div className="flex items-center gap-3 md:gap-2 mb-4 md:mb-3">
                  <div className="flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-full bg-accent/15">
                    <Sparkles className="h-5 w-5 md:h-4 md:w-4 text-accent" />
                  </div>
                  <span className="text-sm font-semibold text-accent uppercase tracking-wide">Exclusive Leads</span>
                </div>
                <h2 className="text-xl md:text-xl font-bold text-foreground mb-3 md:mb-2">
                  Connect with families seeking treatment
                </h2>
                <p className="text-base md:text-base text-muted-foreground mb-6 md:mb-5">
                  No shared leads. No bidding. No race to call. Each lead is delivered exclusively to one provider.
                </p>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-4">
                  <div className="flex items-start gap-4 md:gap-3">
                    <div className="flex h-12 w-12 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-xl md:rounded-lg bg-primary/10">
                      <Users className="h-6 w-6 md:h-4 md:w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-base md:text-sm text-foreground">Exclusive Leads</p>
                      <p className="text-sm md:text-xs text-muted-foreground">Never shared between providers</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 md:gap-3">
                    <div className="flex h-12 w-12 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-xl md:rounded-lg bg-primary/10">
                      <TrendingUp className="h-6 w-6 md:h-4 md:w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-base md:text-sm text-foreground">Qualified Inquiries</p>
                      <p className="text-sm md:text-xs text-muted-foreground">Pre-screened and verified</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 md:gap-3">
                    <div className="flex h-12 w-12 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-xl md:rounded-lg bg-primary/10">
                      <Shield className="h-6 w-6 md:h-4 md:w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-base md:text-sm text-foreground">No Commitment</p>
                      <p className="text-sm md:text-xs text-muted-foreground">Free to list, upgrade anytime</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Header & Progress */}
            <div className="mb-6 md:mb-8">
              <div className="text-center mb-5 md:mb-6">
                <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                  List Your Facility
                </h1>
                <p className="mt-2 text-base md:text-base text-muted-foreground">
                  Step {currentStep} of {steps.length}: {steps[currentStep - 1].name}
                </p>
              </div>

              {/* Progress bar */}
              <div className="h-2 md:h-1.5 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                />
              </div>

              {/* Step indicators - horizontal scroll on mobile */}
              <div className="mt-4 flex justify-between overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => {
                      // Only allow going back to completed steps
                      if (step.id < currentStep) {
                        // Don't allow going back to verify step if already verified
                        if (step.id === 2 && emailVerified) return;
                        setCurrentStep(step.id);
                      }
                    }}
                    disabled={step.id > currentStep || (step.id === 2 && emailVerified)}
                    className={cn(
                      "flex flex-col items-center gap-2 md:gap-1.5 text-xs transition-colors min-w-[48px] px-1",
                      currentStep === step.id
                        ? "text-primary font-medium"
                        : step.id < currentStep
                        ? "text-accent cursor-pointer hover:text-accent/80"
                        : "text-muted-foreground cursor-not-allowed",
                      step.id === 2 && emailVerified && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-full transition-all",
                      currentStep === step.id
                        ? "bg-primary text-primary-foreground"
                        : step.id < currentStep
                        ? "bg-accent/15 text-accent"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {step.id < currentStep ? (
                        <CheckCircle className="h-5 w-5 md:h-4 md:w-4" />
                      ) : (
                        <step.icon className="h-5 w-5 md:h-4 md:w-4" />
                      )}
                    </div>
                    <span className="hidden sm:block">{step.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 1: Account Info */}
            {currentStep === 1 && (
              <div className="space-y-5 md:space-y-6 animate-fade-in rounded-2xl md:rounded-xl border border-border bg-card p-5 md:p-8 shadow-card">
                <div>
                  <p className="text-base md:text-sm text-muted-foreground">
                    Create your provider account to manage your facility listing.
                  </p>
                </div>

                <div className="grid gap-5 md:gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-base md:text-sm font-medium">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => updateFormData("firstName", e.target.value)}
                      placeholder="John"
                      className="h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-base md:text-sm font-medium">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => updateFormData("lastName", e.target.value)}
                      placeholder="Smith"
                      className="h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobTitle" className="text-base md:text-sm font-medium">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={formData.jobTitle}
                    onChange={(e) => updateFormData("jobTitle", e.target.value)}
                    placeholder="Admissions Director"
                    className="h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base md:text-sm font-medium">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 md:left-3 top-1/2 h-5 w-5 md:h-4 md:w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        updateFormData("email", e.target.value);
                        // Reset email verification if email changes
                        if (emailVerified) {
                          setEmailVerified(false);
                        }
                      }}
                      placeholder="john@facility.com"
                      className="pl-12 md:pl-10 h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    />
                  </div>
                  {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                    <p className="text-sm md:text-xs text-destructive">Please enter a valid email address</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-base md:text-sm font-medium">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 md:left-3 top-1/2 h-5 w-5 md:h-4 md:w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormData("phone", e.target.value)}
                      placeholder="(555) 123-4567"
                      className="pl-12 md:pl-10 h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-base md:text-sm font-medium">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 md:left-3 top-1/2 h-5 w-5 md:h-4 md:w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => updateFormData("password", e.target.value)}
                        placeholder="••••••••"
                        className="pl-12 md:pl-10 h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                      />
                    </div>
                    {formData.password && formData.password.length < 6 && (
                      <p className="text-sm md:text-xs text-destructive">Password must be at least 6 characters</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-base md:text-sm font-medium">Confirm Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 md:left-3 top-1/2 h-5 w-5 md:h-4 md:w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                        placeholder="••••••••"
                        className="pl-12 md:pl-10 h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                      />
                    </div>
                    {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-sm md:text-xs text-destructive">Passwords do not match</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Email Verification */}
            {currentStep === 2 && (
              <EmailVerificationStep
                email={formData.email}
                onVerified={handleEmailVerified}
                onBack={() => setCurrentStep(1)}
              />
            )}

            {/* Step 3: Facility Info */}
            {currentStep === 3 && (
              <div className="space-y-5 md:space-y-6 animate-fade-in rounded-2xl md:rounded-xl border border-border bg-card p-5 md:p-8 shadow-card">
                <div>
                  <p className="text-base md:text-sm text-muted-foreground">
                    Tell us about your treatment facility.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facilityName" className="text-base md:text-sm font-medium">Facility Name *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 md:left-3 top-1/2 h-5 w-5 md:h-4 md:w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="facilityName"
                      value={formData.facilityName}
                      onChange={(e) => updateFormData("facilityName", e.target.value)}
                      placeholder="Serenity Recovery Center"
                      className="pl-12 md:pl-10 h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facilityType" className="text-base md:text-sm font-medium">Facility Type *</Label>
                  <Select
                    value={formData.facilityType}
                    onValueChange={(value) => updateFormData("facilityType", value)}
                  >
                    <SelectTrigger className="h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg">
                      <SelectValue placeholder="Select facility type" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilityTypes.map((type) => (
                        <SelectItem key={type} value={type} className="py-3 md:py-2">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-5 md:gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="facilityPhone" className="text-base md:text-sm font-medium">Facility Phone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 md:left-3 top-1/2 h-5 w-5 md:h-4 md:w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="facilityPhone"
                        type="tel"
                        value={formData.facilityPhone}
                        onChange={(e) => updateFormData("facilityPhone", e.target.value)}
                        placeholder="(555) 123-4567"
                        className="pl-12 md:pl-10 h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facilityEmail" className="text-base md:text-sm font-medium">Facility Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 md:left-3 top-1/2 h-5 w-5 md:h-4 md:w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="facilityEmail"
                        type="email"
                        value={formData.facilityEmail}
                        onChange={(e) => updateFormData("facilityEmail", e.target.value)}
                        placeholder="info@facility.com"
                        className="pl-12 md:pl-10 h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-base md:text-sm font-medium">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-4 md:left-3 top-1/2 h-5 w-5 md:h-4 md:w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => updateFormData("website", e.target.value)}
                      placeholder="https://www.yourfacility.com"
                      className="pl-12 md:pl-10 h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-base md:text-sm font-medium">Street Address *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 md:left-3 top-1/2 h-5 w-5 md:h-4 md:w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => updateFormData("address", e.target.value)}
                      placeholder="123 Recovery Lane"
                      className="pl-12 md:pl-10 h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-base md:text-sm font-medium">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateFormData("city", e.target.value)}
                      placeholder="Los Angeles"
                      className="h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-base md:text-sm font-medium">State *</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => updateFormData("state", value)}
                    >
                      <SelectTrigger className="h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state} value={state} className="py-3 md:py-2">
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-base md:text-sm font-medium">ZIP Code *</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => updateFormData("zipCode", e.target.value)}
                      placeholder="90210"
                      className="h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base md:text-sm font-medium">Facility Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData("description", e.target.value)}
                    placeholder="Tell potential clients about your facility, treatment philosophy, and what makes you unique..."
                    rows={4}
                    className="text-base md:text-sm rounded-xl md:rounded-lg min-h-[120px]"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Branding */}
            {currentStep === 4 && (
              <div className="space-y-5 md:space-y-6 animate-fade-in rounded-2xl md:rounded-xl border border-border bg-card p-5 md:p-8 shadow-card">
                <div>
                  <p className="text-base md:text-sm text-muted-foreground">
                    Add your logo and gallery images to make your listing stand out.
                  </p>
                </div>

                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label className="text-base md:text-sm font-medium">Facility Logo</Label>
                  {formData.logoPreview ? (
                    <div className="flex items-center gap-4">
                      <img
                        src={formData.logoPreview}
                        alt="Logo preview"
                        className="h-24 w-24 md:h-20 md:w-20 rounded-xl md:rounded-lg object-cover border"
                      />
                      <Button variant="outline" onClick={removeLogo} className="h-12 md:h-9 px-5 md:px-4 rounded-xl md:rounded-lg">
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-border rounded-2xl md:rounded-lg p-8 md:p-6 text-center block cursor-pointer hover:border-primary/50 transition-colors">
                      <ImageIcon className="mx-auto h-12 w-12 md:h-10 md:w-10 text-muted-foreground mb-3 md:mb-2" />
                      <span className="text-primary hover:underline text-base md:text-sm font-medium">
                        Upload logo
                      </span>
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="hidden"
                      />
                      <p className="text-sm md:text-xs text-muted-foreground mt-2 md:mt-1">
                        PNG, JPG, or WebP (max 5MB)
                      </p>
                    </label>
                  )}
                </div>

                {/* Gallery Upload */}
                <div className="space-y-3">
                  <Label className="text-base md:text-sm font-medium">Gallery Images ({formData.galleryPreviews.length}/5)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-3">
                    {formData.galleryPreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Gallery ${index + 1}`}
                          className="aspect-video w-full rounded-xl md:rounded-lg object-cover border"
                        />
                        <button
                          onClick={() => removeGalleryImage(index)}
                          className="absolute top-2 right-2 md:top-1 md:right-1 bg-destructive text-destructive-foreground rounded-full p-2 md:p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        >
                          <CheckCircle className="h-4 w-4 md:h-3 md:w-3" />
                        </button>
                      </div>
                    ))}
                    {formData.galleryPreviews.length < 5 && (
                      <label className="border-2 border-dashed border-border rounded-xl md:rounded-lg aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                        <ImageIcon className="h-10 w-10 md:h-8 md:w-8 text-muted-foreground mb-2 md:mb-1" />
                        <span className="text-sm md:text-xs text-muted-foreground">Add image</span>
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleGallerySelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Services */}
            {currentStep === 5 && (
              <div className="space-y-5 md:space-y-6 animate-fade-in rounded-2xl md:rounded-xl border border-border bg-card p-5 md:p-8 shadow-card">
                <div>
                  <p className="text-base md:text-sm text-muted-foreground">
                    Select the treatment services and programs you offer.
                  </p>
                </div>

                <div className="space-y-4 md:space-y-3">
                  <Label className="text-base md:text-sm font-medium">Treatment Types *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-2">
                    {treatmentTypes.map((treatment) => (
                      <div
                        key={treatment}
                        className="flex items-center space-x-3 md:space-x-2 py-2 md:py-0"
                      >
                        <Checkbox
                          id={treatment}
                          checked={formData.selectedTreatments.includes(treatment)}
                          onCheckedChange={() => toggleArrayItem("selectedTreatments", treatment)}
                          className="h-6 w-6 md:h-4 md:w-4 rounded-md md:rounded"
                        />
                        <Label htmlFor={treatment} className="text-base md:text-sm font-normal cursor-pointer py-1">
                          {treatment}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5 md:gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bedCount" className="text-base md:text-sm font-medium">Bed Count</Label>
                    <Select
                      value={formData.bedCount}
                      onValueChange={(value) => updateFormData("bedCount", value)}
                    >
                      <SelectTrigger className="h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10" className="py-3 md:py-2">1-10</SelectItem>
                        <SelectItem value="11-25" className="py-3 md:py-2">11-25</SelectItem>
                        <SelectItem value="26-50" className="py-3 md:py-2">26-50</SelectItem>
                        <SelectItem value="51-100" className="py-3 md:py-2">51-100</SelectItem>
                        <SelectItem value="100+" className="py-3 md:py-2">100+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="genderServed" className="text-base md:text-sm font-medium">Gender Served</Label>
                    <Select
                      value={formData.genderServed}
                      onValueChange={(value) => updateFormData("genderServed", value)}
                    >
                      <SelectTrigger className="h-14 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Genders" className="py-3 md:py-2">All Genders</SelectItem>
                        <SelectItem value="Men Only" className="py-3 md:py-2">Men Only</SelectItem>
                        <SelectItem value="Women Only" className="py-3 md:py-2">Women Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 md:space-y-3">
                  <Label className="text-base md:text-sm font-medium">Age Groups Served</Label>
                  <div className="flex flex-wrap gap-4 md:gap-2">
                    {["Adults (18+)", "Young Adults (18-25)", "Adolescents (13-17)", "Seniors (65+)"].map((age) => (
                      <div key={age} className="flex items-center space-x-3 md:space-x-2 py-2 md:py-0">
                        <Checkbox
                          id={age}
                          checked={formData.ageGroups.includes(age)}
                          onCheckedChange={() => toggleArrayItem("ageGroups", age)}
                          className="h-6 w-6 md:h-4 md:w-4 rounded-md md:rounded"
                        />
                        <Label htmlFor={age} className="text-base md:text-sm font-normal cursor-pointer py-1">
                          {age}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Insurance */}
            {currentStep === 6 && (
              <div className="space-y-5 md:space-y-6 animate-fade-in rounded-2xl md:rounded-xl border border-border bg-card p-5 md:p-8 shadow-card">
                <div>
                  <p className="text-base md:text-sm text-muted-foreground">
                    Select the insurance providers you accept.
                  </p>
                </div>

                <div className="space-y-4 md:space-y-3">
                  <Label className="text-base md:text-sm font-medium">Accepted Insurance *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-2">
                    {insuranceProviders.map((insurance) => (
                      <div
                        key={insurance}
                        className="flex items-center space-x-3 md:space-x-2 py-2 md:py-0"
                      >
                        <Checkbox
                          id={insurance}
                          checked={formData.selectedInsurance.includes(insurance)}
                          onCheckedChange={() => toggleArrayItem("selectedInsurance", insurance)}
                          className="h-6 w-6 md:h-4 md:w-4 rounded-md md:rounded"
                        />
                        <Label htmlFor={insurance} className="text-base md:text-sm font-normal cursor-pointer py-1">
                          {insurance}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licensingInfo" className="text-base md:text-sm font-medium">Licensing Information</Label>
                  <Textarea
                    id="licensingInfo"
                    value={formData.licensingInfo}
                    onChange={(e) => updateFormData("licensingInfo", e.target.value)}
                    placeholder="e.g., State License #12345, DEA Registration..."
                    rows={2}
                    className="text-base md:text-sm rounded-xl md:rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accreditations" className="text-base md:text-sm font-medium">Accreditations</Label>
                  <Textarea
                    id="accreditations"
                    value={formData.accreditations}
                    onChange={(e) => updateFormData("accreditations", e.target.value)}
                    placeholder="e.g., JCAHO, CARF, LegitScript Certified..."
                    rows={2}
                    className="text-base md:text-sm rounded-xl md:rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Step 7: Plan Selection */}
            {currentStep === 7 && (
              <div className="rounded-2xl md:rounded-xl border border-border bg-card p-5 md:p-8 shadow-card">
                <PlanSelectionStep
                  selectedPlan={formData.selectedPlan}
                  onPlanSelect={(plan) => updateFormData("selectedPlan", plan)}
                />
              </div>
            )}

            {/* Step 8: Review */}
            {currentStep === 8 && (
              <div className="space-y-5 md:space-y-6 animate-fade-in rounded-2xl md:rounded-xl border border-border bg-card p-5 md:p-8 shadow-card">
                <div>
                  <p className="text-base md:text-sm text-muted-foreground">
                    Review your information before submitting.
                  </p>
                </div>

                {/* Account Summary */}
                <div className="space-y-3 md:space-y-2">
                  <h3 className="font-medium flex items-center gap-2 text-base md:text-sm">
                    <User className="h-5 w-5 md:h-4 md:w-4" /> Account
                  </h3>
                  <div className="bg-muted/50 rounded-xl md:rounded-lg p-5 md:p-4 text-base md:text-sm space-y-2 md:space-y-1">
                    <p><span className="text-muted-foreground">Name:</span> {formData.firstName} {formData.lastName}</p>
                    <p><span className="text-muted-foreground">Email:</span> {formData.email} <span className="text-accent text-sm md:text-xs">✓ Verified</span></p>
                    <p><span className="text-muted-foreground">Phone:</span> {formData.phone}</p>
                    {formData.jobTitle && <p><span className="text-muted-foreground">Title:</span> {formData.jobTitle}</p>}
                  </div>
                </div>

                {/* Facility Summary */}
                <div className="space-y-3 md:space-y-2">
                  <h3 className="font-medium flex items-center gap-2 text-base md:text-sm">
                    <Building2 className="h-5 w-5 md:h-4 md:w-4" /> Facility
                  </h3>
                  <div className="bg-muted/50 rounded-xl md:rounded-lg p-5 md:p-4 text-base md:text-sm space-y-2 md:space-y-1">
                    <p><span className="text-muted-foreground">Name:</span> {formData.facilityName}</p>
                    <p><span className="text-muted-foreground">Type:</span> {formData.facilityType}</p>
                    <p><span className="text-muted-foreground">Address:</span> {formData.address}, {formData.city}, {formData.state} {formData.zipCode}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {formData.facilityPhone}</p>
                    {formData.website && <p><span className="text-muted-foreground">Website:</span> {formData.website}</p>}
                  </div>
                </div>

                {/* Services Summary */}
                <div className="space-y-3 md:space-y-2">
                  <h3 className="font-medium flex items-center gap-2 text-base md:text-sm">
                    <Stethoscope className="h-5 w-5 md:h-4 md:w-4" /> Services
                  </h3>
                  <div className="bg-muted/50 rounded-xl md:rounded-lg p-5 md:p-4 text-sm">
                    <div className="flex flex-wrap gap-2 md:gap-1">
                      {formData.selectedTreatments.map((t) => (
                        <span key={t} className="bg-primary/10 text-primary px-3 md:px-2 py-1 md:py-0.5 rounded-lg md:rounded text-sm md:text-xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Insurance Summary */}
                <div className="space-y-3 md:space-y-2">
                  <h3 className="font-medium flex items-center gap-2 text-base md:text-sm">
                    <CreditCard className="h-5 w-5 md:h-4 md:w-4" /> Insurance
                  </h3>
                  <div className="bg-muted/50 rounded-xl md:rounded-lg p-5 md:p-4 text-sm">
                    <div className="flex flex-wrap gap-2 md:gap-1">
                      {formData.selectedInsurance.map((i) => (
                        <span key={i} className="bg-accent/10 text-accent px-3 md:px-2 py-1 md:py-0.5 rounded-lg md:rounded text-sm md:text-xs">
                          {i}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Plan Summary */}
                <div className="space-y-3 md:space-y-2">
                  <h3 className="font-medium flex items-center gap-2 text-base md:text-sm">
                    <Crown className="h-5 w-5 md:h-4 md:w-4" /> Selected Plan
                  </h3>
                  <div className={cn(
                    "rounded-xl md:rounded-lg p-5 md:p-4 text-base md:text-sm",
                    formData.selectedPlan === "basic" && "bg-muted/50",
                    formData.selectedPlan === "professional" && "bg-primary/5 border border-primary/20",
                    formData.selectedPlan === "featured" && "bg-accent/5 border border-accent/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {PLAN_DETAILS[formData.selectedPlan].name}
                        </p>
                        <p className="text-sm md:text-xs text-muted-foreground">
                          {formData.selectedPlan === "basic" 
                            ? "Free forever" 
                            : `${PLAN_DETAILS[formData.selectedPlan].price}${PLAN_DETAILS[formData.selectedPlan].period}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm md:text-xs text-muted-foreground">
                          {PLAN_DETAILS[formData.selectedPlan].qualified_lead_limit === 0 
                            ? "No qualified leads" 
                            : `${PLAN_DETAILS[formData.selectedPlan].qualified_lead_limit} leads/mo`}
                        </p>
                      </div>
                    </div>
                    {formData.selectedPlan !== "basic" && (
                      <p className="mt-3 md:mt-2 text-sm md:text-xs text-muted-foreground">
                        You'll be redirected to complete payment after account creation.
                      </p>
                    )}
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start space-x-4 md:space-x-3 pt-5 md:pt-4 border-t">
                  <Checkbox
                    id="terms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) => updateFormData("agreeToTerms", checked)}
                    className="h-6 w-6 md:h-4 md:w-4 rounded-md md:rounded mt-0.5"
                  />
                  <Label htmlFor="terms" className="text-base md:text-sm font-normal leading-relaxed cursor-pointer">
                    I agree to the{" "}
                    <Link to="/terms-of-service" className="text-primary hover:underline" target="_blank">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy-policy" className="text-primary hover:underline" target="_blank">
                      Privacy Policy
                    </Link>
                    . I confirm that all information provided is accurate.
                  </Label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-6 flex justify-between gap-4">
              {currentStep > 1 && currentStep !== 2 && (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={isSubmitting}
                  className="h-14 md:h-10 px-6 md:px-4 text-base md:text-sm rounded-xl md:rounded-lg"
                >
                  <ArrowLeft className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                  Back
                </Button>
              )}
              {currentStep === 2 && (
                <div /> // Placeholder for flex spacing
              )}

              {currentStep < 8 && currentStep !== 2 && (
                <Button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="ml-auto h-14 md:h-10 px-8 md:px-6 text-base md:text-sm font-semibold rounded-xl md:rounded-lg"
                >
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5 md:h-4 md:w-4" />
                </Button>
              )}

              {currentStep === 8 && (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || isSubmitting}
                  className="ml-auto h-14 md:h-10 px-6 md:px-4 text-base md:text-sm font-semibold rounded-xl md:rounded-lg"
                >
                  {isSubmitting ? "Creating Account..." : formData.selectedPlan === "basic" ? "Create Account" : "Create Account & Subscribe"}
                  <CheckCircle className="ml-2 h-5 w-5 md:h-4 md:w-4" />
                </Button>
              )}
            </div>

            {/* Already have account */}
            <p className="mt-6 text-center text-base md:text-sm text-muted-foreground py-2">
              Already have an account?{" "}
              <Link to="/provider-login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}