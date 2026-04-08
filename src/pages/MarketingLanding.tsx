import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Shield, Clock, CheckCircle2, Star, ArrowRight, Phone, Zap } from "lucide-react";
import headerLogo from "@/assets/logo-header.webp";
import { TestimonialsSection } from "@/components/testimonials/TestimonialsSection";
import { seekerTestimonials } from "@/data/testimonials";
import { LeadIntakeForm } from "@/components/lead-intake";
import { LeadIntakeFormData } from "@/components/lead-intake/types";
import { MarketingLeadSuccess } from "@/components/marketing/MarketingLeadSuccess";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OptimizedBackground } from "@/components/ui/optimized-image";
import heroImage from "@/assets/marketing-hero.jpg";

interface MatchedFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  logoUrl: string | null;
  facilityType: string;
}

export default function MarketingLanding() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [matchedFacilities, setMatchedFacilities] = useState<MatchedFacility[]>([]);
  const formRef = useRef<HTMLDivElement>(null);

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
        {/* Sticky Header */}
        <header className="bg-white/95 backdrop-blur-md border-b border-border/30 sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={headerLogo} alt="RehabLookup" className="h-7 sm:h-8 w-auto" />
            </div>
            <a
              href="tel:1-800-662-4357"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Need Help Now?</span>
              <span className="underline tabular-nums">1-800-662-4357</span>
            </a>
          </div>
        </header>

        {/* Hero Section — clean, spacious */}
        <OptimizedBackground
          src={heroImage}
          priority
          className="relative"
          overlayClassName="bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900/90"
        >
          <section className="py-10 sm:py-14 md:py-20 lg:py-24">
            <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-3xl text-center">
              {/* Headline */}
              <h1 className="text-[1.75rem] sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight drop-shadow-lg [text-wrap:balance] max-w-3xl mx-auto">
                Find the Right Treatment Center — Matched to You
              </h1>

              <p className="mt-4 text-sm sm:text-base md:text-lg text-white/85 max-w-xl mx-auto leading-relaxed drop-shadow">
                Answer a few quick questions and we'll connect you with verified programs that accept your insurance.{" "}
                <strong className="text-white">Free & confidential.</strong>
              </p>

              {/* Trust row — compact, single line */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-white/70 text-xs sm:text-sm">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-white/80" />
                  100% Confidential
                </span>
                <span className="hidden sm:inline text-white/30">·</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  Free Service
                </span>
                <span className="hidden sm:inline text-white/30">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  Response in 24 hrs
                </span>
                <span className="hidden sm:inline text-white/30">·</span>
                <span className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-yellow-400" />
                  4.9★ Rated
                </span>
              </div>

              {/* CTA Button */}
              <button
                onClick={scrollToForm}
                className="mt-8 inline-flex items-center gap-2 bg-accent text-accent-foreground px-7 py-3.5 rounded-full font-semibold text-base shadow-lg hover:bg-accent/90 transition-all active:scale-[0.98]"
              >
                Get Matched Now
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </section>
        </OptimizedBackground>

        {/* Stats Bar */}
        <div className="border-b border-border/40 bg-background">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-2xl py-5 sm:py-6">
            <div className="grid grid-cols-3 text-center gap-4">
              <div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary tabular-nums">15,000+</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">Verified Centers</div>
              </div>
              <div className="border-x border-border/50">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary tabular-nums">50</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">States Covered</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary tabular-nums">98%</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Intake Form Section */}
        <section className="py-8 sm:py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-2xl">
            <div ref={formRef} className="bg-card rounded-xl sm:rounded-2xl shadow-xl border border-border/40 overflow-hidden">
              {/* Form Header */}
              <div className="bg-primary/5 border-b border-border/20 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Zap className="h-4 w-4 text-accent" />
                  Takes less than 2 minutes
                </div>
              </div>
              <LeadIntakeForm
                onCustomSubmit={handleMarketingSubmit}
                renderSuccess={() => null}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4 max-w-md mx-auto">
              Your information is never shared without your consent.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-10 sm:py-14 md:py-16 bg-background">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-3xl">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground text-center [text-wrap:balance]">How It Works</h2>
            <p className="text-sm text-muted-foreground text-center mt-2 max-w-md mx-auto">Get matched online in minutes — no phone calls required</p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {[
                { num: "1", title: "Tell Us Your Needs", desc: "Answer a few questions about your situation, insurance, and preferences.", time: "~60 sec" },
                { num: "2", title: "Get Matched Instantly", desc: "We'll show you verified centers that accept your coverage.", time: "Instant" },
                { num: "3", title: "Connect With Confidence", desc: "Request info from facilities — they'll reach out at your preferred time.", time: "Within 24 hrs" },
              ].map((step, idx) => (
                <div key={idx} className="relative bg-card rounded-xl p-5 text-center shadow-sm border border-border/30 hover:shadow-md transition-shadow">
                  {idx < 2 && (
                    <div className="hidden sm:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10">
                      <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-sm font-bold text-primary-foreground">{step.num}</span>
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1.5">{step.desc}</p>
                  <span className="inline-block mt-2.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">{step.time}</span>
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

        {/* Final CTA */}
        <section className="py-10 sm:py-14 bg-primary/5">
          <div className="container mx-auto px-4 md:px-6 text-center max-w-xl">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground [text-wrap:balance]">
              Don't Wait — Treatment Works
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-3 max-w-lg mx-auto">
              Every day counts in recovery. Our service is completely free and confidential.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={scrollToForm}
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 rounded-full font-semibold text-base hover:bg-primary/90 transition-all shadow-lg active:scale-[0.98]"
              >
                Find Treatment Now
                <ArrowRight className="h-5 w-5" />
              </button>
              <a
                href="tel:1-800-662-4357"
                className="inline-flex items-center justify-center gap-2 bg-card text-foreground px-6 py-3.5 rounded-full font-semibold text-base border border-border hover:bg-muted/50 transition-all shadow-sm"
              >
                <Phone className="h-4 w-4" />
                Call SAMHSA 24/7
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-5 bg-slate-900 text-white/60">
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
