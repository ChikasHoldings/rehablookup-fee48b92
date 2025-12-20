import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Loader2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import logoImage from "@/assets/logo.png";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhoneNumber } from "@/lib/phoneUtils";
import { EmailInput } from "@/components/ui/email-input";
import { formatEmailInput, normalizeEmail, isValidEmail } from "@/lib/emailUtils";

// Configure your vertical video here (9:16 aspect ratio recommended)
const VIDEO_CONFIG = {
  // For vertical video, use a 9:16 YouTube Short or TikTok-style video
  videoId: "dQw4w9WgXcQ", // Replace with your actual vertical video ID
  // Poster image for initial load (optional)
  posterUrl: "",
};

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  isUrgent: boolean;
}

interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

const initialFormData: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
  isUrgent: false,
};

export default function SocialLanding() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showDetails, setShowDetails] = useState(false);
  const hasTrackedFormStart = useRef(false);
  const hasTrackedVideoPlay = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Email verification state
  const [codeSent, setCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // UTM parameters
  const utmParams = useRef<UTMParams>({
    utm_source: searchParams.get("utm_source"),
    utm_medium: searchParams.get("utm_medium"),
    utm_campaign: searchParams.get("utm_campaign"),
    utm_term: searchParams.get("utm_term"),
    utm_content: searchParams.get("utm_content"),
  });
  
  // Track page view on mount
  useEffect(() => {
    trackEvent("page_view", { utm: utmParams.current, page: "social_landing" });
    
    // Fire Meta Pixel PageView
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "PageView");
    }
    
    // Fire TikTok Pixel PageView
    if (typeof window !== "undefined" && (window as any).ttq) {
      (window as any).ttq.track("ViewContent");
    }
  }, []);
  
  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);
  
  const trackEvent = async (eventType: string, metadata?: Record<string, unknown>) => {
    try {
      await supabase.from("request_help_analytics").insert([{
        event_type: eventType,
        source: "social_landing",
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      }]);
    } catch (error) {
      console.error("Analytics tracking error:", error);
    }
  };

  const trackFormStart = () => {
    if (!hasTrackedFormStart.current) {
      hasTrackedFormStart.current = true;
      trackEvent("form_start", { utm: utmParams.current });
      
      // Fire Meta Pixel InitiateCheckout (form start)
      if (typeof window !== "undefined" && (window as any).fbq) {
        (window as any).fbq("track", "InitiateCheckout");
      }
      
      // Fire TikTok Pixel
      if (typeof window !== "undefined" && (window as any).ttq) {
        (window as any).ttq.track("AddToCart");
      }
    }
  };
  
  const trackVideoPlay = () => {
    if (!hasTrackedVideoPlay.current) {
      hasTrackedVideoPlay.current = true;
      trackEvent("video_play", { utm: utmParams.current });
    }
  };
  
  const handleSendCode = async () => {
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors(prev => ({ ...prev, email: "Please enter a valid email" }));
      return;
    }
    
    setIsSendingCode(true);
    setErrors(prev => ({ ...prev, email: undefined }));
    
    try {
      const { error } = await supabase.functions.invoke("send-verification-code", {
        body: { email: formData.email },
      });
      
      if (error) throw error;
      
      setCodeSent(true);
      setResendCooldown(60);
      trackEvent("verification_code_sent");
      toast({
        title: "Verification code sent",
        description: "Please check your email for the 6-digit code.",
      });
    } catch (error) {
      console.error("Error sending code:", error);
      toast({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingCode(false);
    }
  };
  
  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) return;
    
    setIsVerifying(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("verify-code", {
        body: { email: formData.email, code: verificationCode },
      });
      
      if (error) throw error;
      
      if (data?.verified) {
        setIsEmailVerified(true);
        trackEvent("email_verified");
        toast({
          title: "Email verified",
          description: "Your email has been verified successfully.",
        });
      } else {
        toast({
          title: "Invalid code",
          description: "The verification code is incorrect. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      toast({
        title: "Error",
        description: "Failed to verify code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleEmailChange = (value: string) => {
    trackFormStart();
    const formatted = formatEmailInput(value);
    setFormData(prev => ({ ...prev, email: formatted }));
    // Reset verification state if email changes
    if (isEmailVerified || codeSent) {
      setIsEmailVerified(false);
      setCodeSent(false);
      setVerificationCode("");
    }
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[\d\s\-\(\)\+]{10,}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid phone number";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (!isEmailVerified) {
      toast({
        title: "Email verification required",
        description: "Please verify your email before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Build metadata with UTM params
      const utm = utmParams.current;
      const metadata = {
        landing_page: "social",
        ...(utm.utm_source && { utm_source: utm.utm_source }),
        ...(utm.utm_medium && { utm_medium: utm.utm_medium }),
        ...(utm.utm_campaign && { utm_campaign: utm.utm_campaign }),
        ...(utm.utm_term && { utm_term: utm.utm_term }),
        ...(utm.utm_content && { utm_content: utm.utm_content }),
      };
      
      const { error } = await supabase.functions.invoke("submit-qualified-lead", {
        body: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          message: formData.message.trim(),
          preferredContact: "call",
          urgency: formData.isUrgent ? "urgent" : "this_week",
          whoSeekingHelp: "myself",
          locationZip: "00000", // Default for social landing - location not collected
          locationCityState: "Unknown",
          primarySubstance: [],
          levelOfCare: "unknown", // Default for social landing - not collected
          dualDiagnosis: "unknown",
          insuranceType: "unknown",
          source: "social_landing",
          metadata,
        },
      });
      
      if (error) throw error;
      
      setIsSubmitted(true);
      trackEvent("form_submit_success", { utm: utmParams.current });
      
      // Fire Meta Pixel Lead event
      if (typeof window !== "undefined" && (window as any).fbq) {
        (window as any).fbq("track", "Lead");
      }
      
      // Fire TikTok Pixel
      if (typeof window !== "undefined" && (window as any).ttq) {
        (window as any).ttq.track("SubmitForm");
      }
      
      // Scroll to top to show thank you
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (error) {
      console.error("Error submitting lead:", error);
      trackEvent("form_submit_error", { error: String(error), utm: utmParams.current });
      toast({
        title: "Something went wrong",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Validation state for checkmarks
  const validation = useMemo(() => ({
    firstName: formData.firstName.trim().length >= 2,
    lastName: formData.lastName.trim().length >= 2,
    phone: isValidPhoneNumber(formData.phone),
    email: isValidEmail(formData.email),
  }), [formData.firstName, formData.lastName, formData.phone, formData.email]);

  const handleFieldChange = (field: keyof FormData, value: string | boolean) => {
    trackFormStart();
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormData]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  // Full-screen Thank You State
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Helmet>
          <title>Thank You | RehabLookup</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-sm w-full text-center space-y-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-foreground">
                Thank you.
              </h1>
              <p className="text-muted-foreground">
                Your request has been received. A provider may reach out using your preferred contact method.
              </p>
            </div>
            
            <div className="pt-4">
              <Link 
                to={`/request-help?firstName=${encodeURIComponent(formData.firstName)}&lastName=${encodeURIComponent(formData.lastName)}&email=${encodeURIComponent(formData.email)}&phone=${encodeURIComponent(formData.phone)}`}
              >
                <Button variant="outline" className="w-full">
                  Explore treatment options
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Looking for treatment options? | RehabLookup</title>
        <meta name="description" content="Share a few details and we'll help guide you to available options. Confidential and no obligation." />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Helmet>
      
      {/* Minimal header with small logo */}
      <header className="py-4 px-4">
        <img src={logoImage} alt="RehabLookup" className="h-7 opacity-70" />
      </header>
      
      <main className="flex-1 px-4 pb-24 md:pb-8">
        <div className="max-w-md mx-auto space-y-6">
          
          {/* Hero - Attention Grabbing */}
          <section className="text-center space-y-2 pt-2">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground leading-tight">
              Looking for treatment options?
            </h1>
            <p className="text-muted-foreground text-base">
              Share a few details and we'll help guide you to available options.
            </p>
          </section>
          
          {/* Vertical Video Section (9:16) */}
          <section className="relative mx-auto" style={{ maxWidth: "280px" }}>
            <div className="relative rounded-2xl overflow-hidden bg-muted" style={{ aspectRatio: "9/16" }}>
              {/* YouTube embed with autoplay, muted, loop */}
              <iframe
                src={`https://www.youtube.com/embed/${VIDEO_CONFIG.videoId}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_CONFIG.videoId}&controls=0&modestbranding=1&rel=0&showinfo=0&playsinline=1`}
                title="Treatment information video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                loading="lazy"
                onLoad={() => trackVideoPlay()}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              A brief explanation of how we help people explore treatment options privately and respectfully.
            </p>
          </section>
          
          {/* Lead Form - Ultra Lightweight */}
          <section className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-medium text-foreground">
                Request Information
              </h2>
              <p className="text-sm text-muted-foreground">
                It only takes a moment.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* First Name */}
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm text-foreground">First Name</Label>
                <div className="relative">
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleFieldChange("firstName", e.target.value)}
                    placeholder="First name"
                    className={cn("h-12 text-base", errors.firstName && "border-destructive", validation.firstName && !errors.firstName && "pr-10")}
                    autoComplete="given-name"
                  />
                  {validation.firstName && !errors.firstName && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                </div>
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName}</p>
                )}
              </div>
              
              {/* Last Name */}
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm text-foreground">Last Name</Label>
                <div className="relative">
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleFieldChange("lastName", e.target.value)}
                    placeholder="Last name"
                    className={cn("h-12 text-base", errors.lastName && "border-destructive", validation.lastName && !errors.lastName && "pr-10")}
                    autoComplete="family-name"
                  />
                  {validation.lastName && !errors.lastName && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                </div>
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName}</p>
                )}
              </div>
              
              {/* Email with verification */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm text-foreground">Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="your@email.com"
                    className={cn("flex-1 h-12 text-base", errors.email && "border-destructive")}
                    autoComplete="email"
                    disabled={isEmailVerified}
                  />
                  {!isEmailVerified && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={isSendingCode || resendCooldown > 0 || !formData.email}
                      className="shrink-0 h-12 px-4"
                    >
                      {isSendingCode ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : resendCooldown > 0 ? (
                        `${resendCooldown}s`
                      ) : codeSent ? (
                        "Resend"
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  )}
                  {isEmailVerified && (
                    <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
                
                {/* Verification code input */}
                {codeSent && !isEmailVerified && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter 6-digit code"
                      className="flex-1 h-12 text-base text-center tracking-widest"
                    />
                    <Button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={verificationCode.length !== 6 || isVerifying}
                      className="shrink-0 h-12 px-6"
                    >
                      {isVerifying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Submit"
                      )}
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm text-foreground">Phone Number</Label>
                <div className="relative">
                  <PhoneInput
                    id="phone"
                    value={formData.phone}
                    onChange={(value) => handleFieldChange("phone", value)}
                    className={cn("h-12 text-base", errors.phone && "border-destructive", validation.phone && !errors.phone && "pr-10")}
                  />
                  {validation.phone && !errors.phone && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                </div>
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>
              
              {/* Optional Details (Collapsible) */}
              <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={cn("w-4 h-4 transition-transform", showDetails && "rotate-180")} />
                    Add details (optional)
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <Textarea
                    value={formData.message}
                    onChange={(e) => handleFieldChange("message", e.target.value)}
                    placeholder="Any details you'd like to share..."
                    className="min-h-[80px] text-base resize-none"
                  />
                </CollapsibleContent>
              </Collapsible>
              
              {/* Urgency Toggle */}
              <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-foreground">Need help urgently?</span>
                  <p className="text-xs text-muted-foreground">We'll prioritize available options.</p>
                </div>
                <Switch
                  checked={formData.isUrgent}
                  onCheckedChange={(checked) => handleFieldChange("isUrgent", checked)}
                />
              </div>
              
              {/* Trust Signals - Text Only */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground py-2">
                <span>Confidential & private</span>
                <span>•</span>
                <span>No obligation</span>
                <span>•</span>
                <span>No shared leads</span>
              </div>
              
              {/* Submit Button - Desktop */}
              <div className="hidden md:block">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 text-base font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Get Information"
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </main>
      
      {/* Sticky Submit Button - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border md:hidden safe-area-bottom">
        <Button
          type="submit"
          disabled={isSubmitting}
          onClick={handleSubmit}
          className="w-full h-12 text-base font-medium"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Get Information"
          )}
        </Button>
      </div>
    </div>
  );
}
