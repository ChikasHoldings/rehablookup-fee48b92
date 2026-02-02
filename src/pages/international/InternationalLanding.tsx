import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PreCheckoutForm } from "@/components/international/PreCheckoutForm";
import { 
  Clock,
  Shield,
  Building2,
  Plane,
  Phone,
  ChevronDown,
  ChevronUp,
  Globe,
  CheckCircle2,
  Briefcase,
  Lock,
  Sparkles,
  Timer,
  Users,
  MapPin
} from "lucide-react";

const TRUST_FEATURES = [
  { 
    icon: Clock, 
    title: "24-Hour Response",
    description: "Dedicated placement advisors respond within one business day"
  },
  { 
    icon: Shield, 
    title: "Discreet & Confidential",
    description: "Private coordination with no public records or exposure"
  },
  { 
    icon: Building2, 
    title: "Premium Programs",
    description: "Access to executive, luxury, and cash-pay treatment centers"
  },
  { 
    icon: Plane, 
    title: "Travel Coordination",
    description: "We help coordinate intake timing and travel logistics"
  },
];

const WHY_US_TREATMENT = [
  {
    icon: Lock,
    title: "Complete Privacy",
    description: "US private rehabs operate independently with no government reporting. Your treatment stays completely confidential."
  },
  {
    icon: Timer,
    title: "Immediate Admission",
    description: "No waiting lists. Premium US facilities can admit patients within days, not months."
  },
  {
    icon: Sparkles,
    title: "Luxury & Executive Care",
    description: "World-class amenities, private rooms, gourmet meals, and concierge-level service."
  },
  {
    icon: Users,
    title: "Specialized Treatment",
    description: "Dual-diagnosis, trauma-focused, holistic, and evidence-based programs unavailable elsewhere."
  },
];

const STEPS = [
  {
    number: "01",
    title: "Submit Your Case",
    description: "Complete a brief intake form with treatment needs and preferences",
  },
  {
    number: "02",
    title: "Get Matched",
    description: "Our team identifies best-fit U.S. facilities based on your criteria",
  },
  {
    number: "03",
    title: "Confirm Admission",
    description: "We coordinate directly with the facility to secure your placement",
  },
];

const FAQ_ITEMS = [
  {
    question: "What does the $299 placement fee cover?",
    answer: "The placement fee covers personalized matching with vetted U.S. treatment centers, verification of availability and clinical fit, direct coordination with facility admissions teams, and ongoing support throughout your placement process. The fee is fully refunded or credited upon confirmed admission.",
  },
  {
    question: "Do you work with luxury and executive programs?",
    answer: "Yes. We maintain relationships with premium treatment facilities including luxury residential programs, executive rehabs with private accommodations, and high-end clinical centers across the United States.",
  },
  {
    question: "Can you help clients from Europe, Middle East, or Asia?",
    answer: "Absolutely. We serve clients from all regions globally. Our team is experienced in coordinating international placements and communicates across time zones to ensure a seamless process.",
  },
  {
    question: "What happens after I pay the placement fee?",
    answer: "After payment, you'll complete a detailed intake form. Within 24 hours, a placement advisor will review your case and begin identifying suitable treatment options. You'll receive personalized recommendations and next steps via email or phone.",
  },
  {
    question: "Is RehabLookup a treatment provider?",
    answer: "No. RehabLookup is a placement coordination service. We help individuals and families compare treatment options and coordinate placement with independent, licensed treatment facilities. All clinical decisions are made by the facilities themselves.",
  },
];

const TRUST_STATS = [
  { value: "50+", label: "Countries Served" },
  { value: "200+", label: "US Facilities" },
  { value: "24hr", label: "Response Time" },
];

export default function InternationalLanding() {
  const { toast } = useToast();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartPlacement = async (data: { name: string; email: string; phone: string; country: string }) => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("create-international-checkout", {
        body: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          country: data.country,
        },
      });

      if (error) throw error;
      if (response?.url) {
        window.location.href = response.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({
        title: "Error",
        description: "Unable to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="U.S. Treatment Placement for International Clients | RehabLookup"
        description="Private placement service for international patients seeking treatment in the United States. Vetted facilities, discreet coordination, 24-hour response."
        canonical="/international"
        keywords={["international rehab", "US addiction treatment", "global rehab placement", "travel for treatment", "executive rehab"]}
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        
        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative bg-gradient-to-b from-primary/5 to-background border-b">
            <div className="container mx-auto px-4 py-16 md:py-24 lg:py-28">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
                {/* Left: Value Proposition */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                    <Globe className="h-4 w-4" />
                    International Placement Services
                  </div>
                  
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-5 leading-tight tracking-tight">
                    Your Gateway to<br />
                    <span className="text-primary">American Rehab</span>
                  </h1>
                  
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    Skip the confusion. Skip the scams. We connect international clients directly with verified U.S. treatment centers—handling everything from matching to admission.
                  </p>

                  <ul className="space-y-3 mb-8">
                    {[
                      "Access 200+ vetted luxury & executive programs",
                      "No waiting lists—admission within days",
                      "Complete privacy and confidentiality",
                      "Fee refunded upon confirmed admission",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="h-12 px-6"
                    asChild
                  >
                    <a href="tel:+18005551234">
                      <Phone className="mr-2 h-4 w-4" />
                      Speak with an Advisor
                    </a>
                  </Button>
                </motion.div>

                {/* Right: Pre-Checkout Form */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <div className="bg-background border rounded-xl shadow-lg p-6 md:p-8">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-semibold text-foreground mb-2">
                        Start Your Placement
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Complete this form to begin. You'll be redirected to secure payment.
                      </p>
                    </div>
                    
                    <PreCheckoutForm 
                      onSubmit={handleStartPlacement}
                      isLoading={isLoading}
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Trust Stats Bar */}
          <section className="py-8 bg-primary/5 border-b">
            <div className="container mx-auto px-4">
              <div className="flex flex-wrap justify-center gap-8 md:gap-16">
                {TRUST_STATS.map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Why US Treatment */}
          <section className="py-16 md:py-24 border-b">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Why Choose U.S. Treatment?
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  The United States has the largest private rehab system in the world—offering what government-run programs in other countries simply cannot.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-6xl mx-auto">
                {WHY_US_TREATMENT.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="bg-background border rounded-lg p-6"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Trust Features */}
          <section className="py-16 md:py-20 bg-muted/30 border-b">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  How We Help
                </h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {TRUST_FEATURES.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="text-center p-6"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-16 md:py-24 border-b">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  How It Works
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  A streamlined process to connect you with the right treatment program
                </p>
              </div>

              <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-3 gap-8">
                  {STEPS.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.15 }}
                      className="relative"
                    >
                      <div className="bg-background border rounded-lg p-6">
                        <span className="text-4xl font-bold text-primary/20 mb-4 block">
                          {step.number}
                        </span>
                        <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Who We Serve */}
          <section className="py-16 md:py-24 bg-muted/30 border-b">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                      Serving Clients Worldwide
                    </h2>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      We work with individuals and families from Europe, the Middle East, Asia, Latin America, and beyond who are seeking high-quality treatment options in the United States.
                    </p>
                    <ul className="space-y-3">
                      {[
                        "Executives requiring discreet, private programs",
                        "Families seeking specialized clinical care",
                        "Individuals needing dual-diagnosis treatment",
                        "Clients looking for luxury or concierge-level care"
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm">
                          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-background border rounded-lg p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Briefcase className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Placement Fee</p>
                        <p className="text-2xl font-bold text-foreground">$299 <span className="text-sm font-normal text-muted-foreground">USD</span></p>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Personalized facility matching
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Direct admissions coordination
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Refunded upon admission
                      </li>
                    </ul>
                    <Button 
                      className="w-full h-11 font-semibold"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                      Start Application Above
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16 md:py-24 border-b">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Frequently Asked Questions
                </h2>
              </div>

              <div className="max-w-2xl mx-auto space-y-2">
                {FAQ_ITEMS.map((item, index) => (
                  <div 
                    key={index} 
                    className="border rounded-lg bg-background overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="font-medium text-foreground pr-4 text-[15px]">{item.question}</span>
                      {expandedFaq === index ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    {expandedFaq === index && (
                      <div className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="py-16 md:py-20 bg-primary/5">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Ready to Find the Right Program?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Start your placement today and receive personalized recommendations within 24 hours.
              </p>
              <Button 
                size="lg" 
                className="h-12 px-8 font-semibold"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Start Application
              </Button>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="py-6 border-t bg-muted/20">
            <div className="container mx-auto px-4">
              <p className="text-xs text-center text-muted-foreground max-w-2xl mx-auto">
                RehabLookup is not a treatment provider. We coordinate placement with independent, licensed treatment facilities. 
                All clinical and medical decisions are made by the facilities themselves.
              </p>
            </div>
          </section>
        </main>
        
        <PublicFooter />
      </div>
    </>
  );
}
