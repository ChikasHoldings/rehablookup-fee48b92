import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Shield, Lock, Heart, CheckCircle2, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LazyVideoEmbed } from "@/components/ui/lazy-video-embed";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import logoImage from "@/assets/logo.png";

// Configure your video here - replace with your actual video ID
const VIDEO_CONFIG = {
  platform: "youtube" as const, // or "vimeo"
  videoId: "dQw4w9WgXcQ", // Replace with your actual YouTube/Vimeo video ID
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

export default function AdLanding() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const hasTrackedFormStart = useRef(false);
  
  // UTM parameters
  const utmParams = useRef<UTMParams>({
    utm_source: searchParams.get("utm_source"),
    utm_medium: searchParams.get("utm_medium"),
    utm_campaign: searchParams.get("utm_campaign"),
    utm_term: searchParams.get("utm_term"),
    utm_content: searchParams.get("utm_content"),
  });
  
  // Email verification state
  const [codeSent, setCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Track page view on mount with UTM params
  useEffect(() => {
    trackEvent("page_view", { utm: utmParams.current });
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
        source: "ad_landing",
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      }]);
    } catch (error) {
      console.error("Analytics tracking error:", error);
    }
  };

  const trackFormStart = () => {
    if (!hasTrackedFormStart.current) {
      hasTrackedFormStart.current = true;
      trackEvent("form_start");
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
    trackEvent("form_submit_start");
    
    try {
      // Build metadata with UTM params
      const utm = utmParams.current;
      const metadata = {
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
          locationZip: "",
          locationCityState: "",
          primarySubstance: [],
          levelOfCare: "",
          dualDiagnosis: "unknown",
          insuranceType: "unknown",
          source: "ad_landing",
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        },
      });
      
      if (error) throw error;
      
      setIsSubmitted(true);
      trackEvent("form_submit_success", { utm: utmParams.current });
      
      // Scroll to top to show thank you
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (error) {
      console.error("Error submitting lead:", error);
      trackEvent("form_submit_error", { error: String(error), utm: utmParams.current });
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleVideoPlay = () => {
    trackEvent("video_play", { utm: utmParams.current });
  };
  
  const handleEmailChange = (value: string) => {
    trackFormStart();
    setFormData(prev => ({ ...prev, email: value }));
    // Reset verification state if email changes
    if (isEmailVerified || codeSent) {
      setIsEmailVerified(false);
      setCodeSent(false);
      setVerificationCode("");
    }
  };
  
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handleFieldChange = (field: keyof FormData, value: string | boolean) => {
    trackFormStart();
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Thank you state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
        <Helmet>
          <title>Thank You | RehabLookup</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        
        {/* Minimal header with logo */}
        <header className="py-6 px-4">
          <div className="max-w-md mx-auto">
            <img src={logoImage} alt="RehabLookup" className="h-10" />
          </div>
        </header>
        
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                Thank you. Your request has been received.
              </h1>
              <p className="text-muted-foreground text-lg">
                A treatment provider may reach out using your preferred contact method.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 text-left space-y-3">
              <h2 className="font-medium text-foreground">What happens next?</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Your request has been securely forwarded to a matching provider</span>
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Expect a call or email within 24-48 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <Heart className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>There's absolutely no obligation — this is just information</span>
                </li>
              </ul>
            </div>
            
            <div className="pt-2">
              <Link to="/request-help">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Explore More Treatment Options
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col">
      <Helmet>
        <title>Find Treatment Options | RehabLookup</title>
        <meta name="description" content="Get help exploring treatment options today. Share a few details and we'll help connect you with appropriate treatment options — no obligation." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      {/* Minimal header with logo only */}
      <header className="py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <img src={logoImage} alt="RehabLookup" className="h-10" />
        </div>
      </header>
      
      <main className="flex-1 px-4 py-6 md:py-10">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Hero Section */}
          <section className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight leading-tight">
              Find treatment options that fit your needs
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
              Share a few details and we'll help connect you with appropriate treatment options — no obligation.
            </p>
          </section>
          
          {/* Video Section */}
          <section className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
            <LazyVideoEmbed
              platform={VIDEO_CONFIG.platform}
              videoId={VIDEO_CONFIG.videoId}
              title="How RehabLookup helps connect people with treatment"
              onPlay={handleVideoPlay}
            />
            <p className="text-sm text-muted-foreground text-center">
              A brief overview of how we help connect people with treatment options in a respectful, confidential way.
            </p>
          </section>
          
          {/* Lead Form */}
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <div className="text-center space-y-2">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                Request Information
              </h2>
              <p className="text-muted-foreground">
                Complete this form and we'll help connect you with treatment options that fit your needs.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
              {/* Name fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-foreground">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleFieldChange("firstName", e.target.value)}
                    placeholder="First name"
                    className={cn("h-11", errors.firstName && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-foreground">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleFieldChange("lastName", e.target.value)}
                    placeholder="Last name"
                    className={cn("h-11", errors.lastName && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName}</p>
                  )}
                </div>
              </div>
              
              {/* Email with verification */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email *</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="your@email.com"
                    className={cn("flex-1 h-11", errors.email && "border-destructive focus-visible:ring-destructive")}
                    disabled={isEmailVerified}
                  />
                  {!isEmailVerified && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={isSendingCode || resendCooldown > 0 || !formData.email}
                      className="shrink-0 h-11 px-4"
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
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
                {isEmailVerified && (
                  <p className="text-sm text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Email verified
                  </p>
                )}
              </div>
              
              {/* Verification code input */}
              {codeSent && !isEmailVerified && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="code" className="text-foreground">Verification Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      className="flex-1 h-11 font-mono text-center tracking-widest"
                    />
                    <Button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={isVerifying || verificationCode.length !== 6}
                      className="shrink-0 h-11 px-6"
                    >
                      {isVerifying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Check your email for the 6-digit verification code.
                  </p>
                </div>
              )}
              
              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    trackFormStart();
                    setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }));
                  }}
                  placeholder="(555) 123-4567"
                  className={cn("h-11", errors.phone && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
              
              {/* Request details */}
              <div className="space-y-2">
                <Label htmlFor="message" className="text-foreground">Request Details <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleFieldChange("message", e.target.value)}
                  placeholder="Share any details about what you're looking for..."
                  rows={4}
                  className="resize-none"
                />
              </div>
              
              {/* Urgency toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border">
                <div className="space-y-0.5 pr-4">
                  <p className="font-medium text-foreground">Need help urgently?</p>
                  <p className="text-sm text-muted-foreground">
                    If this is time-sensitive, we'll prioritize available options.
                  </p>
                </div>
                <Switch
                  checked={formData.isUrgent}
                  onCheckedChange={(checked) => handleFieldChange("isUrgent", checked)}
                  className="shrink-0"
                />
              </div>
              
              {/* Submit button */}
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-base font-medium"
                disabled={isSubmitting || !isEmailVerified}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Get Information"
                )}
              </Button>

              {!isEmailVerified && (
                <p className="text-xs text-center text-muted-foreground">
                  Please verify your email to submit
                </p>
              )}
            </form>
          </section>
          
          {/* Trust badges */}
          <section className="pt-4 pb-8 animate-in fade-in duration-500 delay-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-border/50">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-center text-muted-foreground">Confidential & Private</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-border/50">
                <Heart className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-center text-muted-foreground">No Obligation</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-border/50">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-center text-muted-foreground">No Shared Leads</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-border/50">
                <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-center text-muted-foreground">Healthcare Support</span>
              </div>
            </div>
          </section>
          
        </div>
      </main>
    </div>
  );
}
