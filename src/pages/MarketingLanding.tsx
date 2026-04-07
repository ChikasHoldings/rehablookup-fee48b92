import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Shield, Clock, CheckCircle2, Star, Heart, Sparkles, ArrowRight } from "lucide-react";
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

export default function MarketingLanding() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [matchedFacilities, setMatchedFacilities] = useState<MatchedFacility[]>([]);

  // UTM parameters
  const utmSource = searchParams.get("utm_source") || undefined;
  const utmMedium = searchParams.get("utm_medium") || undefined;
  const utmCampaign = searchParams.get("utm_campaign") || undefined;
  const utmTerm = searchParams.get("utm_term") || undefined;
  const utmContent = searchParams.get("utm_content") || undefined;

  // Custom submit handler that uses marketing lead endpoint
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
        <title>Find Treatment Today | RehabLookup</title>
        <meta name="description" content="Get placed in top-rated treatment centers near you. Free, confidential help available 24/7." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Minimal Header */}
        <header className="bg-white/95 backdrop-blur-md border-b border-border/30 sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 flex justify-center">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-primary shrink-0" />
              <span className="text-base sm:text-lg md:text-xl font-bold text-foreground">RehabLookup</span>
            </div>
          </div>
        </header>

        {/* Hero Section with Background Image */}
        <OptimizedBackground
          src={heroImage}
          priority
          className="relative"
          overlayClassName="bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/80"
        >
          <section className="py-10 sm:py-14 md:py-16 lg:py-24">
            <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-4xl">
              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-6 sm:mb-8">
                <div className="flex items-center gap-1.5 md:gap-2 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 rounded-full shadow-lg">
                  <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
                  <span className="text-xs sm:text-xs md:text-sm font-medium text-foreground">100% Confidential</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 rounded-full shadow-lg">
                  <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-green-600 flex-shrink-0" />
                  <span className="text-xs sm:text-xs md:text-sm font-medium text-foreground">Free Service</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 rounded-full shadow-lg">
                  <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-amber-600 flex-shrink-0" />
                  <span className="text-xs sm:text-xs md:text-sm font-medium text-foreground">24hr Response</span>
                </div>
              </div>

              {/* Headline */}
              <div className="text-center mb-6 sm:mb-8 md:mb-10">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 leading-tight tracking-tight drop-shadow-lg">
                  Find Treatment Centers{" "}
                  <span className="block sm:inline text-primary-foreground bg-primary/90 px-2 md:px-3 py-0.5 md:py-1 rounded-md mt-1 sm:mt-0">
                    Near You Today
                  </span>
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-white/90 max-w-xl md:max-w-2xl mx-auto leading-relaxed drop-shadow">
                  Answer a few quick questions and we'll connect you with verified treatment programs that fit your needs.
                </p>
              </div>

              {/* Stats Bar */}
              <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 mb-6 sm:mb-8 shadow-xl max-w-2xl mx-auto">
                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 text-center">
                  <div className="flex flex-col">
                    <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary">5,000+</div>
                    <div className="text-xs sm:text-sm md:text-base text-muted-foreground">Verified Centers</div>
                  </div>
                  <div className="flex flex-col border-x border-border/50">
                    <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary">50</div>
                    <div className="text-xs sm:text-sm md:text-base text-muted-foreground">States Covered</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary">24/7</div>
                    <div className="text-xs sm:text-sm md:text-base text-muted-foreground">Support</div>
                  </div>
                </div>
              </div>

              {/* Lead Intake Form */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-border/30 overflow-hidden max-w-2xl mx-auto">
                <LeadIntakeForm
                  onCustomSubmit={handleMarketingSubmit}
                  renderSuccess={() => null}
                />
              </div>
            </div>
          </section>
        </OptimizedBackground>

        {/* How It Works */}
        <section className="py-10 sm:py-14 md:py-16 lg:py-20 bg-gradient-to-b from-muted/30 to-background">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-4xl">
            <div className="text-center mb-6 sm:mb-10 md:mb-12">
              <div className="inline-flex items-center gap-1.5 md:gap-2 bg-primary/10 text-primary px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium mb-3 md:mb-4">
                <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
                Simple Process
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">How It Works</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {[
                { num: "1", title: "Tell Us Your Needs", desc: "Answer a few questions about your situation and preferences." },
                { num: "2", title: "Find Options", desc: "We'll show you verified treatment centers that fit your criteria." },
                { num: "3", title: "Connect Directly", desc: "Request info from facilities with one click — they'll reach out to you." },
              ].map((step, idx) => (
                <div key={idx} className="group bg-white rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6 text-center shadow-sm border border-border/30 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-14 md:h-14 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-md group-hover:scale-110 transition-transform">
                    <span className="text-base sm:text-lg md:text-xl font-bold text-primary-foreground">{step.num}</span>
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base md:text-lg mb-1.5 md:mb-2 text-foreground">{step.title}</h3>
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <TestimonialsSection
          testimonials={seekerTestimonials.slice(0, 3)}
          title="Families Who Found Help"
          subtitle="Real stories from people who used RehabLookup to find treatment"
          
        />

        {/* CTA Section */}
        <section className="py-8 sm:py-12 md:py-14 bg-primary/5">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-3 md:mb-4">Ready to find the right treatment?</p>
            <button 
              onClick={() => scrollToTopSmooth()}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 md:px-6 py-2.5 md:py-3 rounded-full font-medium text-sm md:text-base hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg"
            >
              Get Started Now
              <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="py-5 sm:py-6 md:py-8 bg-slate-900 text-white/60">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <p className="text-xs md:text-sm">© {new Date().getFullYear()} RehabLookup. All rights reserved.</p>
            <div className="flex justify-center gap-3 md:gap-4 mt-2 md:mt-3">
              <a href="/privacy-policy" className="text-xs md:text-sm hover:text-white transition-colors">Privacy</a>
              <span className="text-white/30">|</span>
              <a href="/terms-of-service" className="text-xs md:text-sm hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
