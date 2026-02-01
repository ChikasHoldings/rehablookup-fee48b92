import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Shield, Clock, CheckCircle2, Star, Heart, Sparkles } from "lucide-react";
import { LeadIntakeForm } from "@/components/lead-intake";
import { LeadIntakeFormData } from "@/components/lead-intake/types";
import { MarketingLeadSuccess } from "@/components/marketing/MarketingLeadSuccess";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
        <meta name="description" content="Get matched with top-rated treatment centers near you. Free, confidential help available 24/7." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        {/* Minimal Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-border/40 sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-center">
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              <span className="text-lg sm:text-xl font-bold text-foreground">RehabLookup</span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-8 sm:py-12 md:py-16 lg:py-20">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-border/50 shadow-sm">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">100% Confidential</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-border/50 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Free Service</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-border/50 shadow-sm">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">24hr Response</span>
              </div>
            </div>

            {/* Headline */}
            <div className="text-center mb-6 sm:mb-8 md:mb-10">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4 leading-tight tracking-tight">
                Find Treatment Centers{" "}
                <br className="hidden sm:block" />
                <span className="text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text">Near You Today</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
                Answer a few quick questions and we'll match you with verified treatment programs that fit your needs.
              </p>
            </div>

            {/* Stats Bar */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 mb-6 sm:mb-8 md:mb-10 shadow-sm">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                <div className="flex flex-col">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">5,000+</div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5">Verified Centers</div>
                </div>
                <div className="flex flex-col border-x border-primary/20">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">50</div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5">States Covered</div>
                </div>
                <div className="flex flex-col">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">24/7</div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5">Support Available</div>
                </div>
              </div>
            </div>

            {/* Lead Intake Form */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-border/50 overflow-hidden">
              <LeadIntakeForm
                onCustomSubmit={handleMarketingSubmit}
                renderSuccess={() => null}
              />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-10 sm:py-12 md:py-16 bg-gradient-to-b from-muted/20 to-muted/40">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="text-center mb-6 sm:mb-8 md:mb-10">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs sm:text-sm font-medium mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                Simple Process
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">How It Works</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              <div className="bg-white rounded-xl p-5 sm:p-6 text-center shadow-sm border border-border/30 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="text-lg sm:text-xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold text-sm sm:text-base mb-1.5 sm:mb-2">Tell Us Your Needs</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">Answer a few questions about your situation and preferences.</p>
              </div>
              <div className="bg-white rounded-xl p-5 sm:p-6 text-center shadow-sm border border-border/30 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="text-lg sm:text-xl font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold text-sm sm:text-base mb-1.5 sm:mb-2">Get Matched</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">We'll show you verified treatment centers that match your criteria.</p>
              </div>
              <div className="bg-white rounded-xl p-5 sm:p-6 text-center shadow-sm border border-border/30 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="text-lg sm:text-xl font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold text-sm sm:text-base mb-1.5 sm:mb-2">Connect Directly</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">Request info from facilities with one click — they'll reach out to you.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-10 sm:py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
            <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg border border-border/50 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>
              <div className="flex justify-center mb-3 sm:mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <blockquote className="text-base sm:text-lg text-muted-foreground italic mb-3 sm:mb-4 leading-relaxed">
                "RehabLookup made finding treatment so much easier. I was matched with several great options and got a callback within hours."
              </blockquote>
              <p className="font-medium text-foreground text-sm sm:text-base">— Sarah M., California</p>
            </div>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="py-6 sm:py-8 bg-slate-900 text-white/60">
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <p className="text-xs sm:text-sm">© {new Date().getFullYear()} RehabLookup. All rights reserved.</p>
            <div className="flex justify-center gap-3 sm:gap-4 mt-2">
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
