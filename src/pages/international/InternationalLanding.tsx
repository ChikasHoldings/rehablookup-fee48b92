import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/SEO";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { InternationalPhoneInput } from "@/components/ui/international-phone-input";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock,
  Shield,
  Building2,
  Plane,
  ArrowRight,
  CheckCircle,
  Phone,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const COUNTRIES = [
  "Canada", "United Kingdom", "Australia", "Germany", "France", "Netherlands",
  "Ireland", "Mexico", "Brazil", "United Arab Emirates", "Saudi Arabia", "India",
  "Japan", "South Korea", "Singapore", "Switzerland", "Sweden", "Norway", "Other"
];

const TRUST_BULLETS = [
  { icon: Clock, text: "24-hour response" },
  { icon: Shield, text: "Discreet admissions" },
  { icon: Building2, text: "Cash-pay & executive programs" },
  { icon: Plane, text: "We coordinate intake and travel timing" },
];

const STEPS = [
  {
    number: "1",
    title: "Start your placement",
    description: "Submit your case to our placement team",
  },
  {
    number: "2",
    title: "Get matched",
    description: "We recommend best-fit centers based on budget, needs, and urgency",
  },
  {
    number: "3",
    title: "Confirm admission",
    description: "We coordinate acceptance and intake details",
  },
];

const FAQ_ITEMS = [
  {
    question: "What does the $299 cover?",
    answer: "The $299 placement fee covers personalized matching with vetted U.S. treatment centers, verification of availability and fit, direct coordination with facility admissions teams, and ongoing support throughout your placement process. If you are admitted, the fee is refunded or credited.",
  },
  {
    question: "Do you work with luxury and executive rehabs?",
    answer: "Yes. We work with a network of premium treatment facilities including luxury residential programs, executive rehabs with private accommodations, and high-end clinical centers across the United States.",
  },
  {
    question: "Can you help if we are in Europe / Middle East / Africa?",
    answer: "Absolutely. We serve clients from all regions including Europe, the Middle East, Africa, Asia, and the Americas. Our team is experienced in coordinating international placements and can communicate across time zones.",
  },
  {
    question: "What happens after I pay?",
    answer: "After payment, you'll complete a brief intake form. Within 24 hours, a placement advisor will review your case and begin identifying suitable treatment options. You'll receive personalized recommendations and next steps via email or phone.",
  },
  {
    question: "Is RehabLookup a treatment provider?",
    answer: "No. RehabLookup is a placement coordination service. We help people compare treatment options and coordinate placement with independent, licensed treatment facilities. All medical decisions are made by the facilities themselves.",
  },
];

export default function InternationalLanding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "",
    phoneNumber: "",
    country: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.country) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const fullPhone = formData.countryCode && formData.phoneNumber 
      ? `${formData.countryCode} ${formData.phoneNumber}` 
      : "";

    const submitData = {
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: fullPhone,
      country: formData.country,
    };

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-international-checkout", {
        body: submitData,
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
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

  const scrollToForm = () => {
    document.getElementById("placement-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <SEO
        title="Find the Right Rehab in the United States | International Placement"
        description="Private placement for international patients. We match you with vetted U.S. treatment centers and coordinate admission. $299 placement fee, refunded on admission."
        canonical="/international"
        keywords={["international rehab", "US addiction treatment", "global rehab placement", "travel for treatment", "executive rehab"]}
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        
        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-muted/30 border-b">
            <div className="container mx-auto px-4 py-12 md:py-20 lg:py-24">
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
                {/* Left: Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="max-w-xl"
                >
                  <h1 className="text-2xl font-bold md:text-3xl lg:text-4xl text-foreground mb-4 leading-tight">
                    Find the Right Rehab in the United States
                  </h1>
                  
                  <p className="text-base md:text-lg text-muted-foreground mb-8 leading-relaxed">
                    Private placement for international patients. We match you with vetted U.S. treatment centers and coordinate admission.
                  </p>

                  {/* Trust Bullets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                    {TRUST_BULLETS.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm text-foreground">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      size="lg" 
                      className="h-12 px-6 font-semibold"
                      onClick={scrollToForm}
                    >
                      Start Placement
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="h-12 px-6"
                      asChild
                    >
                      <a href="tel:+18005551234">
                        <Phone className="mr-2 h-4 w-4" />
                        Talk to a Placement Advisor
                      </a>
                    </Button>
                  </div>
                </motion.div>

                {/* Right: Form */}
                <motion.div
                  id="placement-form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <Card className="border shadow-sm">
                    <CardContent className="p-6">
                      <div className="mb-5">
                        <h2 className="text-lg font-semibold text-foreground mb-1">Start Your Placement</h2>
                        <p className="text-sm text-muted-foreground">One-time $299 fee • Refunded on admission</p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="firstName" className="text-sm">First Name *</Label>
                            <Input
                              id="firstName"
                              value={formData.firstName}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              placeholder="First name"
                              className="mt-1"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName" className="text-sm">Last Name *</Label>
                            <Input
                              id="lastName"
                              value={formData.lastName}
                              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                              placeholder="Last name"
                              className="mt-1"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="email" className="text-sm">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="your@email.com"
                            className="mt-1"
                            required
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Phone</Label>
                          <div className="mt-1">
                            <InternationalPhoneInput
                              countryCode={formData.countryCode}
                              phoneNumber={formData.phoneNumber}
                              onCountryCodeChange={(code) => setFormData({ ...formData, countryCode: code })}
                              onPhoneNumberChange={(number) => setFormData({ ...formData, phoneNumber: number })}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="country" className="text-sm">Country of Residence *</Label>
                          <select
                            id="country"
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
                            required
                          >
                            <option value="">Select your country</option>
                            {COUNTRIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <Button 
                          type="submit" 
                          size="lg" 
                          className="w-full h-11 font-semibold"
                          disabled={isLoading}
                        >
                          {isLoading ? "Processing..." : (
                            <>
                              Start Placement – $299
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                          Fee refunded or credited upon confirmed admission
                        </p>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-14 md:py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold md:text-3xl text-foreground mb-3">
                  How It Works
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Three simple steps to quality treatment in the U.S.
                </p>
              </div>

              <div className="max-w-3xl mx-auto">
                <div className="grid md:grid-cols-3 gap-6">
                  {STEPS.map((step, index) => (
                    <div key={index} className="relative">
                      <div className="flex flex-col items-center text-center p-6 bg-muted/30 rounded-lg border">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-4">
                          {step.number}
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                          <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Mid-Page CTA */}
          <section className="py-12 bg-primary/5 border-y">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Ready to find the right treatment?
              </h2>
              <Button 
                size="lg" 
                className="h-12 px-8 font-semibold"
                onClick={scrollToForm}
              >
                Start Placement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-14 md:py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold md:text-3xl text-foreground mb-3">
                  Frequently Asked Questions
                </h2>
              </div>

              <div className="max-w-2xl mx-auto space-y-3">
                {FAQ_ITEMS.map((item, index) => (
                  <div 
                    key={index} 
                    className="border rounded-lg bg-background overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="font-medium text-foreground pr-4">{item.question}</span>
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
          <section className="py-14 md:py-20 bg-muted/30 border-t">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl font-bold md:text-3xl text-foreground mb-3">
                Start Your Placement Today
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Get matched with vetted U.S. treatment centers within 24 hours.
              </p>
              <Button 
                size="lg" 
                className="h-12 px-8 font-semibold"
                onClick={scrollToForm}
              >
                Start Placement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="py-6 border-t bg-muted/20">
            <div className="container mx-auto px-4">
              <p className="text-xs text-center text-muted-foreground max-w-2xl mx-auto">
                RehabLookup is not a treatment provider. We help people compare options and coordinate placement. 
                All medical decisions are made by licensed professionals at partner facilities.
              </p>
            </div>
          </section>
        </main>
        
        <PublicFooter />
      </div>
    </>
  );
}
