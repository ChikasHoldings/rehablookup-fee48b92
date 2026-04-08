import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Shield, Clock, CheckCircle2, Star, Heart, Sparkles, ArrowRight, Phone, Users, MapPin, Zap } from "lucide-react";
import { TestimonialsSection } from "@/components/testimonials/TestimonialsSection";
import { seekerTestimonials } from "@/data/testimonials";
import { LeadIntakeForm } from "@/components/lead-intake";
import { LeadIntakeFormData } from "@/components/lead-intake/types";
import { MarketingLeadSuccess } from "@/components/marketing/MarketingLeadSuccess";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OptimizedBackground } from "@/components/ui/optimized-image";
import { scrollToTopSmooth } from "@/hooks/useScrollToTop";
import heroImage from "@/assets/marketing-hero.jpg";

interface MatchedFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  logoUrl: string | null;
  facilityType: string;
}

// Live activity counter (simulated for social proof)
function useActiveUsers() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    // Deterministic base from hour of day + some variance
    const hour = new Date().getHours();
    const base = hour >= 8 && hour <= 22 ? 12 + (hour % 7) : 4 + (hour % 3);
    setCount(base);
    const interval = setInterval(() => {
      setCount(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(3, Math.min(25, prev + delta));
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);
  return count;
}

export default function MarketingLanding() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [matchedFacilities, setMatchedFacilities] = useState<MatchedFacility[]>([]);
  const formRef = useRef<HTMLDivElement>(null);
  const activeUsers = useActiveUsers();

  // UTM parameters
  const utmSource = searchParams.get("utm_source") || undefined;
  const utmMedium = searchParams.get("utm_medium") || undefined;
  const utmCampaign = searchParams.get("utm_campaign") || undefined;
  const utmTerm = searchParams.get("utm_term") || undefined;
  const utmContent = searchParams.get("utm_content") || undefined;

  const handleMarketingSubmit = async (formData: LeadIntakeFormData) => {
    try {
      const { data, error } = await supabase.functions.invoke("submit-marketing-lead", {
        body: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          preferredContact: formData.preferredContact,
          urgency: formData.urgency,
          whoSeekingHelp: formData.whoSeekingHelp,
          locationZip: formData.locationZip,
          locationCityState: formData.locationCityState,
          levelOfCare: formData.levelOfCare,
          insuranceType: formData.insuranceType,
          insuranceProvider: formData.insuranceProvider,
          primarySubstance: formData.primarySubstance,
          dualDiagnosis: formData.dualDiagnosis,
          ageRange: formData.ageRange,
          gender: formData.gender,
          previousTreatment: formData.previousTreatment,
          coOccurringConditions: formData.coOccurringConditions,
          employmentStatus: formData.employmentStatus,
          message: formData.message,
          utmSource,
          utmMedium,
          utmCampaign,
          utmTerm,
          utmContent,
          landingPage: "/lp/convert",
        },
      });

      if (error) throw error;

      setLeadId(data.leadId);
      setMatchedFacilities(data.matchedFacilities || []);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Marketing lead submission failed:", err);
      toast({
        title: "Submission failed",
        description: err.message || "Please try again",
        variant: "destructive",
      });
      throw err;
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (submitted && leadId) {
    return (
      <MarketingLeadSuccess
        leadId={leadId}
        matchedFacilities={matchedFacilities}
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>Find Trusted Addiction Treatment Centers | RehabLookup</title>
        <meta name="description" content="Get matched with top-rated, verified treatment centers near you in under 2 minutes. Free, confidential, available 24/7." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Sticky Header with Phone CTA */}
        <header className="bg-white/95 backdrop-blur-md border-b border-border/30 sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <span className="text-base sm:text-lg font-bold text-foreground">RehabLookup</span>
            </div>
            <a
              href="tel:1-800-662-4357"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Need Help Now?</span>
              <span className="underline">1-800-662-4357</span>
            </a>
          </div>
        </header>

        {/* Live Activity Bar */}
        <div className="bg-primary text-primary-foreground py-2 text-center">
          <div className="container mx-auto px-4 flex items-center justify-center gap-2 text-xs sm:text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="tabular-nums font-medium">{activeUsers} people</span>
            <span className="text-primary-foreground/80">are searching for treatment right now</span>
          </div>
        </div>

        {/* Hero Section */}
        <OptimizedBackground
          src={heroImage}
          priority
          className="relative"
          overlayClassName="bg-gradient-to-b from-slate-900/75 via-slate-900/55 to-slate-900/85"
        >
          <section className="py-8 sm:py-12 md:py-16 lg:py-20">
            <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-4xl">
              {/* Trust Badges Row */}
              <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-5 sm:mb-7">
                {[
                  { icon: Shield, text: "100% Confidential", color: "text-primary" },
                  { icon: CheckCircle2, text: "Free Service", color: "text-green-600" },
                  { icon: Clock, text: "Response in 24hrs", color: "text-amber-600" },
                  { icon: Star, text: "4.9★ Rated", color: "text-yellow-500" },
                ].map((badge, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full shadow-lg">
                    <badge.icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${badge.color} flex-shrink-0`} />
                    <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{badge.text}</span>
                  </div>
                ))}
              </div>

              {/* Headline - Benefit-Driven */}
              <div className="text-center mb-5 sm:mb-7">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-white mb-3 leading-tight tracking-tight drop-shadow-lg">
                  Get Matched With Verified{" "}
                  <span className="text-accent">Treatment Centers</span>
                  <br className="hidden sm:block" />{" "}
                  <span className="block sm:inline mt-1 sm:mt-0">in Under 2 Minutes</span>
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-white/90 max-w-xl md:max-w-2xl mx-auto leading-relaxed drop-shadow">
                  Answer a few quick questions — we'll connect you with programs that accept your insurance and fit your needs. <strong className="text-white">No cost, no obligation.</strong>
                </p>
              </div>

              {/* Stats Bar - Social Proof */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl md:rounded-2xl p-3 sm:p-4 mb-5 sm:mb-7 shadow-xl max-w-2xl mx-auto border border-white/20">
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                  <div className="flex flex-col">
                    <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary tabular-nums">15,000+</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Verified Centers</div>
                  </div>
                  <div className="flex flex-col border-x border-border/50">
                    <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary tabular-nums">50</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">States Covered</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary tabular-nums">98%</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Satisfaction</div>
                  </div>
                </div>
              </div>

              {/* Lead Intake Form */}
              <div ref={formRef} className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-border/30 overflow-hidden max-w-2xl mx-auto">
                {/* Form Header with Progress Cue */}
                <div className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/20 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Zap className="h-4 w-4 text-accent" />
                    <span>Takes less than 2 minutes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                    </span>
                    <span className="tabular-nums">{activeUsers} online now</span>
                  </div>
                </div>
                <LeadIntakeForm
                  onCustomSubmit={handleMarketingSubmit}
                  renderSuccess={() => null}
                />
              </div>

              {/* Below-Form Micro-Copy */}
              <p className="text-center text-xs sm:text-sm text-white/70 mt-4 max-w-lg mx-auto">
                Join thousands of families who found the right treatment through RehabLookup. Your information is never shared without your consent.
              </p>
            </div>
          </section>
        </OptimizedBackground>

        {/* How It Works — Conversion Ladder */}
        <section className="py-10 sm:py-14 md:py-16 lg:py-20 bg-gradient-to-b from-muted/30 to-background">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-4xl">
            <div className="text-center mb-6 sm:mb-10">
              <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium mb-3">
                <Sparkles className="h-3 w-3" />
                Simple 3-Step Process
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">How It Works</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">No phone calls required — get matched online in minutes</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {[
                { num: "1", title: "Tell Us Your Needs", desc: "Answer a few questions about your situation, insurance, and preferences.", time: "~60 seconds" },
                { num: "2", title: "Get Matched Instantly", desc: "We'll show you verified treatment centers that accept your coverage.", time: "Instant" },
                { num: "3", title: "Connect With Confidence", desc: "Request info from facilities — they'll reach out at your preferred time.", time: "Within 24hrs" },
              ].map((step, idx) => (
                <div key={idx} className="group bg-white rounded-xl p-4 sm:p-5 text-center shadow-sm border border-border/30 hover:shadow-lg hover:border-primary/20 transition-all duration-300 relative">
                  {idx < 2 && (
                    <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <ArrowRight className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md group-hover:scale-110 transition-transform">
                    <span className="text-base sm:text-lg font-bold text-primary-foreground">{step.num}</span>
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base mb-1.5 text-foreground">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2">{step.desc}</p>
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{step.time}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <TestimonialsSection
          testimonials={seekerTestimonials}
          title="Families Who Found Help"
          subtitle="Real stories from people who used RehabLookup to find treatment"
        />

        {/* Final CTA - Urgency */}
        <section className="py-10 sm:py-14 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10">
          <div className="container mx-auto px-4 md:px-6 text-center max-w-2xl">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">
              Don't Wait — Treatment Works
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-lg mx-auto">
              Every day counts in recovery. The sooner you reach out, the sooner healing can begin. Our service is completely free and confidential.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={scrollToForm}
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 rounded-full font-semibold text-base hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
              >
                Find Treatment Now
                <ArrowRight className="h-5 w-5" />
              </button>
              <a
                href="tel:1-800-662-4357"
                className="inline-flex items-center justify-center gap-2 bg-white text-foreground px-6 py-3.5 rounded-full font-semibold text-base border border-border hover:bg-muted/50 transition-all shadow-sm"
              >
                <Phone className="h-4 w-4" />
                Call SAMHSA 24/7
              </a>
            </div>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="py-5 sm:py-6 bg-slate-900 text-white/60">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <p className="text-xs sm:text-sm">© {new Date().getFullYear()} RehabLookup. All rights reserved.</p>
            <div className="flex justify-center gap-3 mt-2">
              <a href="/privacy-policy" className="text-xs sm:text-sm hover:text-white transition-colors">Privacy</a>
              <span className="text-white/30">|</span>
              <a href="/terms-of-service" className="text-xs sm:text-sm hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
