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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage, validateImageFile } from "@/lib/imageUtils";

const providerNavLinks = [
  { href: "/for-providers", label: "Why List With Us" },
  { href: "/provider-resources", label: "Resources" },
  { href: "/provider-support", label: "Support" },
];

const steps = [
  { id: 1, name: "Account", icon: User },
  { id: 2, name: "Facility", icon: Building2 },
  { id: 3, name: "Branding", icon: ImageIcon },
  { id: 4, name: "Services", icon: Stethoscope },
  { id: 5, name: "Insurance", icon: CreditCard },
  { id: 6, name: "Review", icon: CheckCircle },
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

    // Step 2: Facility
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

    // Step 3: Branding
    logoFile: null as File | null,
    logoPreview: "",
    galleryFiles: [] as File[],
    galleryPreviews: [] as string[],

    // Step 4: Services
    selectedTreatments: [] as string[],
    bedCount: "",
    ageGroups: [] as string[],
    genderServed: "",

    // Step 5: Insurance
    selectedInsurance: [] as string[],
    licensingInfo: "",
    accreditations: "",

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
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
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

      toast({
        title: "Welcome to RehabLookup!",
        description: "Your account and facility have been created successfully.",
      });

      navigate("/provider-dashboard");
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
          formData.phone &&
          formData.password &&
          formData.password.length >= 6 &&
          formData.password === formData.confirmPassword
        );
      case 2:
        return (
          formData.facilityName &&
          formData.facilityType &&
          formData.facilityPhone &&
          formData.address &&
          formData.city &&
          formData.state &&
          formData.zipCode
        );
      case 3:
        return true; // Branding is optional
      case 4:
        return formData.selectedTreatments.length > 0;
      case 5:
        return formData.selectedInsurance.length > 0;
      case 6:
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

      <main className="flex-1 py-8 md:py-12">
        <div className="container">
          <div className="mx-auto max-w-2xl">
            {/* Header & Progress */}
            <div className="mb-8">
              <div className="text-center mb-6">
                <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                  List Your Facility
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Step {currentStep} of {steps.length}: {steps[currentStep - 1].name}
                </p>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                />
              </div>

              {/* Step indicators */}
              <div className="mt-4 flex justify-between">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                    disabled={step.id > currentStep}
                    className={cn(
                      "flex flex-col items-center gap-1.5 text-xs transition-colors",
                      currentStep === step.id
                        ? "text-primary font-medium"
                        : step.id < currentStep
                        ? "text-accent cursor-pointer hover:text-accent/80"
                        : "text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                      currentStep === step.id
                        ? "bg-primary text-primary-foreground"
                        : step.id < currentStep
                        ? "bg-accent/15 text-accent"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {step.id < currentStep ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <step.icon className="h-4 w-4" />
                      )}
                    </div>
                    <span className="hidden sm:block">{step.name}</span>
                  </button>
                ))}
              </div>
            </div>

              {/* Step 1: Account Info */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fade-in rounded-xl border border-border bg-card p-6 md:p-8 shadow-card">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Create your provider account to manage your facility listing.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => updateFormData("firstName", e.target.value)}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => updateFormData("lastName", e.target.value)}
                        placeholder="Smith"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={formData.jobTitle}
                      onChange={(e) => updateFormData("jobTitle", e.target.value)}
                      placeholder="Admissions Director"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateFormData("email", e.target.value)}
                        placeholder="john@facility.com"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateFormData("phone", e.target.value)}
                        placeholder="(555) 123-4567"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => updateFormData("password", e.target.value)}
                          placeholder="••••••••"
                          className="pl-10"
                        />
                      </div>
                      {formData.password && formData.password.length < 6 && (
                        <p className="text-xs text-destructive">Password must be at least 6 characters</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                          placeholder="••••••••"
                          className="pl-10"
                        />
                      </div>
                      {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="text-xs text-destructive">Passwords do not match</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Facility Info */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-fade-in rounded-xl border border-border bg-card p-6 md:p-8 shadow-card">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tell us about your treatment facility.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facilityName">Facility Name *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="facilityName"
                        value={formData.facilityName}
                        onChange={(e) => updateFormData("facilityName", e.target.value)}
                        placeholder="Serenity Recovery Center"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facilityType">Facility Type *</Label>
                    <Select
                      value={formData.facilityType}
                      onValueChange={(value) => updateFormData("facilityType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select facility type" />
                      </SelectTrigger>
                      <SelectContent>
                        {facilityTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="facilityPhone">Facility Phone *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="facilityPhone"
                          type="tel"
                          value={formData.facilityPhone}
                          onChange={(e) => updateFormData("facilityPhone", e.target.value)}
                          placeholder="(555) 123-4567"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="facilityEmail">Facility Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="facilityEmail"
                          type="email"
                          value={formData.facilityEmail}
                          onChange={(e) => updateFormData("facilityEmail", e.target.value)}
                          placeholder="info@facility.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => updateFormData("website", e.target.value)}
                        placeholder="https://www.yourfacility.com"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => updateFormData("address", e.target.value)}
                        placeholder="123 Recovery Lane"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => updateFormData("city", e.target.value)}
                        placeholder="Los Angeles"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => updateFormData("state", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {states.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code *</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => updateFormData("zipCode", e.target.value)}
                        placeholder="90210"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Facility Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateFormData("description", e.target.value)}
                      placeholder="Briefly describe your facility, approach to treatment, and what makes you unique..."
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Branding & Photos */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fade-in rounded-xl border border-border bg-card p-6 md:p-8 shadow-card">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Upload your facility's logo and photos to stand out in search results.
                    </p>
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <Label>Facility Logo</Label>
                    <p className="text-xs text-muted-foreground">
                      Your logo will appear on your public profile and in search results.
                    </p>
                    {formData.logoPreview ? (
                      <div className="relative w-32 h-32">
                        <img
                          src={formData.logoPreview}
                          alt="Logo preview"
                          className="w-full h-full object-cover rounded-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleLogoSelect}
                          className="sr-only"
                        />
                        <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground">Upload logo</span>
                      </label>
                    )}
                  </div>

                  {/* Gallery Upload */}
                  <div className="space-y-3">
                    <Label>Facility Gallery</Label>
                    <p className="text-xs text-muted-foreground">
                      Upload up to 5 photos of your facility. These will appear on your public profile.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {formData.galleryPreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square">
                          <img
                            src={preview}
                            alt={`Gallery ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border border-border"
                          />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(index)}
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-sm"
                          >
                            ×
                          </button>
                          {index === 0 && (
                            <span className="absolute bottom-1 left-1 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded">
                              Primary
                            </span>
                          )}
                        </div>
                      ))}
                      {formData.galleryFiles.length < 5 && (
                        <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={handleGallerySelect}
                            className="sr-only"
                          />
                          <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground text-center px-2">
                            Add ({formData.galleryFiles.length}/5)
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
                    You can skip this step and add images later from your dashboard.
                  </p>
                </div>
              )}

              {/* Step 4: Services */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-fade-in rounded-xl border border-border bg-card p-6 md:p-8 shadow-card">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Select the treatments and services your facility offers.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>Treatment Programs Offered *</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {treatmentTypes.map((treatment) => (
                        <label
                          key={treatment}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                            formData.selectedTreatments.includes(treatment)
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <Checkbox
                            checked={formData.selectedTreatments.includes(treatment)}
                            onCheckedChange={() => toggleArrayItem("selectedTreatments", treatment)}
                          />
                          <span className="text-sm">{treatment}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bedCount">Number of Beds/Capacity</Label>
                    <Input
                      id="bedCount"
                      value={formData.bedCount}
                      onChange={(e) => updateFormData("bedCount", e.target.value)}
                      placeholder="e.g., 30"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Age Groups Served</Label>
                    <div className="flex flex-wrap gap-3">
                      {["Adults (18+)", "Young Adults (18-25)", "Adolescents (13-17)", "Seniors (65+)"].map((age) => (
                        <label
                          key={age}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all",
                            formData.ageGroups.includes(age)
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <Checkbox
                            checked={formData.ageGroups.includes(age)}
                            onCheckedChange={() => toggleArrayItem("ageGroups", age)}
                            className="h-4 w-4"
                          />
                          {age}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="genderServed">Gender Served</Label>
                    <Select
                      value={formData.genderServed}
                      onValueChange={(value) => updateFormData("genderServed", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender options" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Genders</SelectItem>
                        <SelectItem value="men">Men Only</SelectItem>
                        <SelectItem value="women">Women Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Step 5: Insurance */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-fade-in rounded-xl border border-border bg-card p-6 md:p-8 shadow-card">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Select accepted insurance and provide licensing information.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>Accepted Insurance *</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {insuranceProviders.map((insurance) => (
                        <label
                          key={insurance}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                            formData.selectedInsurance.includes(insurance)
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <Checkbox
                            checked={formData.selectedInsurance.includes(insurance)}
                            onCheckedChange={() => toggleArrayItem("selectedInsurance", insurance)}
                          />
                          <span className="text-sm">{insurance}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licensingInfo">State Licensing Information</Label>
                    <Textarea
                      id="licensingInfo"
                      value={formData.licensingInfo}
                      onChange={(e) => updateFormData("licensingInfo", e.target.value)}
                      placeholder="Enter your state license numbers and issuing authorities..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accreditations">Accreditations</Label>
                    <Textarea
                      id="accreditations"
                      value={formData.accreditations}
                      onChange={(e) => updateFormData("accreditations", e.target.value)}
                      placeholder="e.g., Joint Commission, CARF, NAATP..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Step 6: Review */}
              {currentStep === 6 && (
                <div className="space-y-6 animate-fade-in rounded-xl border border-border bg-card p-6 md:p-8 shadow-card">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Review your information before submitting your application.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-muted/30 p-5">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" /> Account
                      </h3>
                      <div className="mt-3 grid gap-2 text-sm">
                        <p><span className="text-muted-foreground">Name:</span> {formData.firstName} {formData.lastName}</p>
                        <p><span className="text-muted-foreground">Email:</span> {formData.email}</p>
                        <p><span className="text-muted-foreground">Phone:</span> {formData.phone}</p>
                        {formData.jobTitle && <p><span className="text-muted-foreground">Title:</span> {formData.jobTitle}</p>}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-5">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" /> Facility
                      </h3>
                      <div className="mt-3 grid gap-2 text-sm">
                        <p><span className="text-muted-foreground">Name:</span> {formData.facilityName}</p>
                        <p><span className="text-muted-foreground">Type:</span> {formData.facilityType}</p>
                        <p><span className="text-muted-foreground">Address:</span> {formData.address}, {formData.city}, {formData.state} {formData.zipCode}</p>
                        <p><span className="text-muted-foreground">Phone:</span> {formData.facilityPhone}</p>
                      </div>
                    </div>

                    {/* Branding Preview */}
                    {(formData.logoPreview || formData.galleryPreviews.length > 0) && (
                      <div className="rounded-lg border border-border bg-muted/30 p-5">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-primary" /> Branding
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-3">
                          {formData.logoPreview && (
                            <div className="text-center">
                              <img src={formData.logoPreview} alt="Logo" className="h-16 w-16 object-cover rounded-lg border border-border" />
                              <span className="text-xs text-muted-foreground mt-1 block">Logo</span>
                            </div>
                          )}
                          {formData.galleryPreviews.map((preview, idx) => (
                            <div key={idx} className="text-center">
                              <img src={preview} alt={`Gallery ${idx + 1}`} className="h-16 w-16 object-cover rounded-lg border border-border" />
                              <span className="text-xs text-muted-foreground mt-1 block">Photo {idx + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border border-border bg-muted/30 p-5">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-primary" /> Services
                      </h3>
                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground mb-2">Treatment Programs:</p>
                        <div className="flex flex-wrap gap-2">
                          {formData.selectedTreatments.map((t) => (
                            <span key={t} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-5">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" /> Insurance
                      </h3>
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2">
                          {formData.selectedInsurance.map((i) => (
                            <span key={i} className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                              {i}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 rounded-lg border-2 border-primary/20 bg-primary/5 p-4 cursor-pointer hover:border-primary/40 transition-colors">
                    <Checkbox
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => updateFormData("agreeToTerms", checked)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-foreground">
                      I agree to the{" "}
                      <Link to="/terms-of-service" className="text-primary hover:underline font-medium">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy-policy" className="text-primary hover:underline font-medium">
                        Privacy Policy
                      </Link>
                      . I confirm that the information provided is accurate and I am authorized to represent this facility.
                    </span>
                  </label>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-8 flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card">
                {currentStep > 1 ? (
                  <Button variant="outline" onClick={prevStep} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < 6 ? (
                  <Button 
                    onClick={nextStep} 
                    disabled={!canProceed()} 
                    className="gap-2 px-6"
                    size="lg"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={!canProceed() || isSubmitting}
                    className="gap-2 px-6"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account & Submit
                        <CheckCircle className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Already have account */}
              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/provider-login" className="text-primary hover:underline font-semibold">
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </div>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}
