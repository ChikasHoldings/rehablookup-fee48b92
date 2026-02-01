import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Shield, Clock, Phone, CheckCircle2, Star, Heart } from "lucide-react";
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

      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-muted/30">
        {/* Minimal Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex justify-center">
            <a href="/" className="flex items-center gap-2">
              <Heart className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold text-foreground">RehabLookup</span>
            </a>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-8">
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50 shadow-sm">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">100% Confidential</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">Free Service</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50 shadow-sm">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-muted-foreground">24hr Response</span>
              </div>
            </div>

            {/* Headline */}
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
                Find Treatment Centers <br className="hidden sm:block" />
                <span className="text-primary">Near You Today</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Answer a few quick questions and we'll match you with verified treatment programs that fit your needs.
              </p>
            </div>

            {/* Stats Bar */}
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 md:p-6 mb-10">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-primary">5,000+</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Verified Centers</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-primary">50</div>
                  <div className="text-xs md:text-sm text-muted-foreground">States Covered</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-primary">24/7</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Support Available</div>
                </div>
              </div>
            </div>

            {/* Lead Intake Form */}
            <div className="bg-white rounded-2xl shadow-xl border border-border/50 overflow-hidden">
              <LeadIntakeForm
                onCustomSubmit={handleMarketingSubmit}
                renderSuccess={() => null}
              />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold mb-2">Tell Us Your Needs</h3>
                <p className="text-sm text-muted-foreground">Answer a few questions about your situation and preferences.</p>
              </div>
              <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold mb-2">Get Matched</h3>
                <p className="text-sm text-muted-foreground">We'll show you verified treatment centers that match your criteria.</p>
              </div>
              <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold mb-2">Connect Directly</h3>
                <p className="text-sm text-muted-foreground">Request info from facilities with one click — they'll reach out to you.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-border/50 text-center">
              <div className="flex justify-center mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <blockquote className="text-lg text-muted-foreground italic mb-4">
                "RehabLookup made finding treatment so much easier. I was matched with several great options and got a callback within hours."
              </blockquote>
              <p className="font-medium text-foreground">— Sarah M., California</p>
            </div>
          </div>
        </section>

        {/* Emergency Notice */}
        <section className="py-8 bg-amber-50 border-y border-amber-200">
          <div className="container mx-auto px-4 text-center">
            <p className="text-amber-800 font-medium">
              <Phone className="h-4 w-4 inline mr-2" />
              Need immediate help? Call SAMHSA's National Helpline:{" "}
              <a href="tel:1-800-662-4357" className="underline font-bold">1-800-662-4357</a>
              {" "}(Free, 24/7)
            </p>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="py-8 bg-slate-900 text-white/60">
          <div className="container mx-auto px-4 text-center text-sm">
            <p>© {new Date().getFullYear()} RehabLookup. All rights reserved.</p>
            <div className="flex justify-center gap-4 mt-2">
              <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy</a>
              <a href="/terms-of-service" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
