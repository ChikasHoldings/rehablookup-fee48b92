import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/SEO";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle,
  Shield,
  Clock,
  Globe,
  ArrowRight,
  Star,
  Users,
  MessageCircle,
  Sparkles,
  BadgeCheck,
  Building2,
  Heart,
  Zap,
  Calendar,
  Phone,
  AlertTriangle
} from "lucide-react";

const COUNTRIES = [
  "Canada", "United Kingdom", "Australia", "Germany", "France", "Netherlands",
  "Ireland", "Mexico", "Brazil", "United Arab Emirates", "Saudi Arabia", "India",
  "Japan", "South Korea", "Singapore", "Switzerland", "Sweden", "Norway", "Other"
];

const STATS = [
  { value: "50+", label: "Countries Served" },
  { value: "200+", label: "US Partners" },
  { value: "48hr", label: "Response Time" },
  { value: "4.8", label: "Client Rating", icon: Star },
];

const FAQ_ITEMS = [
  {
    question: "What does the $299 service fee cover?",
    answer: "The one-time placement coordination fee covers personalized matching with US treatment facilities, insurance/payment verification, visa assistance guidance, travel coordination support, and dedicated advisor access throughout your search.",
  },
  {
    question: "How is this different from US placement services?",
    answer: "Our international service includes additional support for visa requirements, international insurance navigation, travel logistics, cultural considerations, and time zone-friendly communication.",
  },
  {
    question: "What happens after I'm admitted to a facility?",
    answer: "Upon confirmed admission, your $299 service fee is either refunded or credited toward future services (your choice). The facility handles admission independently.",
  },
  {
    question: "Do you help with travel and visas?",
    answer: "We provide guidance on visa requirements and connect you with travel resources, though we do not directly process visas or book travel. Our partner facilities often assist with documentation.",
  },
];

export default function InternationalLanding() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.country) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-international-checkout", {
        body: formData,
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

  const steps = [
    {
      icon: Sparkles,
      title: "Start Your Application",
      description: "Complete the quick registration form and pay the one-time $299 service fee",
      time: "5 min",
    },
    {
      icon: Users,
      title: "Expert Matching",
      description: "Our advisors identify US facilities that match your needs and accept international clients",
      time: "24-48 hrs",
    },
    {
      icon: MessageCircle,
      title: "Connect & Coordinate",
      description: "Receive introductions to matched facilities with travel and admission support",
      time: "Ongoing",
    },
  ];

  const benefits = [
    {
      icon: Globe,
      title: "International Expertise",
      description: "Specialized advisors experienced in coordinating care for clients from around the world.",
    },
    {
      icon: BadgeCheck,
      title: "Verified US Facilities",
      description: "Partner facilities vetted for quality, licensing, and experience with international clients.",
    },
    {
      icon: Shield,
      title: "Payment Flexibility",
      description: "Guidance on international insurance, private pay options, and financial planning.",
    },
    {
      icon: Clock,
      title: "Time Zone Support",
      description: "Advisors available across time zones with communication tailored to your schedule.",
    },
  ];

  return (
    <>
      <SEO
        title="International Rehab Placement | US Treatment for Global Clients"
        description="Find quality addiction treatment in the United States. Our international placement service connects clients worldwide with accredited US rehab facilities. $299 service fee, refunded on admission."
        canonical="/international"
        keywords={["international rehab", "US addiction treatment", "global rehab placement", "travel for treatment", "medical tourism rehab"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "International Placement", url: "/international" },
        ]}
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        
        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-muted/30" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_50%)]" />
            
            <div className="container relative mx-auto px-4 py-10 sm:py-16 lg:py-20">
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                {/* Left: Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Badge className="mb-4 px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary border-primary/20">
                    <Globe className="h-4 w-4 mr-2" />
                    International Placement Service
                  </Badge>
                  
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight leading-tight">
                    World-Class Treatment in the United States
                  </h1>
                  
                  <p className="text-base sm:text-lg text-muted-foreground mb-6 leading-relaxed">
                    Our placement coordination service connects international clients with accredited US treatment facilities. 
                    <span className="text-foreground font-semibold"> $299 service fee — refunded on admission.</span>
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
                    <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                      <Shield className="h-4 w-4 text-primary" />
                      <span>Confidential</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>48hr Response</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span>200+ US Facilities</span>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="bg-muted/30 border border-border rounded-lg p-4 mb-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        <strong>Important:</strong> RehabLookup is a placement coordination service, not a treatment provider. 
                        We connect clients with independent facilities. All medical decisions are made by licensed professionals 
                        at partner facilities. This service does not provide medical advice, diagnosis, or treatment.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Right: Form */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card className="border-2 shadow-xl">
                    <CardContent className="p-6">
                      <div className="text-center mb-6">
                        <h2 className="text-xl font-semibold text-foreground mb-1">Start Your Placement</h2>
                        <p className="text-sm text-muted-foreground">One-time $299 coordination fee</p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Your full name"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="your@email.com"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="phone">Phone (with country code)</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+44 20 1234 5678"
                          />
                        </div>

                        <div>
                          <Label htmlFor="country">Country of Residence *</Label>
                          <select
                            id="country"
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
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
                          className="w-full h-12 font-semibold"
                          disabled={isLoading}
                        >
                          {isLoading ? "Processing..." : (
                            <>
                              Continue to Payment — $299
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
          
          {/* Stats Bar */}
          <section className="py-8 bg-primary/10 border-y border-primary/20">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {STATS.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</span>
                      {stat.icon && <stat.icon className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
                    </div>
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          
          {/* How It Works */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <Badge variant="outline" className="mb-4">
                  <Zap className="h-3 w-3 mr-1" />
                  Simple Process
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  How It Works
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Three steps to quality treatment in the US
                </p>
              </div>
              
              <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
                {steps.map((step, index) => (
                  <Card key={index} className="relative">
                    <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{index + 1}</span>
                    </div>
                    <CardContent className="pt-8 pb-6 px-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5">
                        <step.icon className="h-7 w-7 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg text-foreground mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
                      <div className="flex items-center gap-2 text-xs text-primary font-medium">
                        <Calendar className="h-3 w-3" />
                        {step.time}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
          
          {/* Benefits */}
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <Badge variant="outline" className="mb-4">
                  <Heart className="h-3 w-3 mr-1" />
                  Why Choose Us
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Specialized International Support
                </h2>
              </div>
              
              <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-5">
                {benefits.map((benefit, index) => (
                  <Card key={index} className="border hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0">
                          <benefit.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-foreground mb-2">{benefit.title}</h3>
                          <p className="text-muted-foreground text-sm">{benefit.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Frequently Asked Questions
                </h2>
              </div>
              
              <div className="max-w-3xl mx-auto space-y-4">
                {FAQ_ITEMS.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-foreground mb-2">{item.question}</h3>
                      <p className="text-sm text-muted-foreground">{item.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-16 bg-primary/5">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Ready to Start Your Journey?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Take the first step toward recovery with expert guidance and support.
              </p>
              <Button 
                size="lg" 
                className="h-14 px-8 font-semibold"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Begin Application — $299
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Service fee refunded upon confirmed admission
              </p>
            </div>
          </section>
        </main>
        
        <PublicFooter />
      </div>
    </>
  );
}
