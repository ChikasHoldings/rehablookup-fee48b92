import { Button } from "@/components/ui/button";
import { TestimonialsSection } from "@/components/testimonials/TestimonialsSection";
import { seekerTestimonials } from "@/data/testimonials";
import { PageFAQ } from "@/components/seo/PageFAQ";
import { conciergeFaqs } from "@/data/pageFaqs";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useLocation } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  CheckCircle,
  Shield,
  Clock,
  HeartHandshake,
  ArrowRight,
  Star,
  Users,
  MessageCircle,
  Sparkles,
  BadgeCheck,
  Building2,
  Heart,
} from "lucide-react";
import conciergeHero from "@/assets/concierge-hero.jpg";


const STATS = [
  { value: "500+", label: "Families Helped", icon: Users },
  { value: "1,000+", label: "Partner Facilities", icon: Building2 },
  { value: "24hr", label: "Avg Response Time", icon: Clock },
  { value: "4.9", label: "Client Rating", icon: Star },
];

const FAQ_ITEMS = [
  {
    question: "Is the placement service really free?",
    answer: "Yes — there is no fee for clients. Our placement specialists provide personalized recommendations, insurance verification assistance, and direct introductions to vetted programs at no cost to you. We're compensated by partner facilities only when a successful placement is made.",
  },
  {
    question: "How quickly will I hear back?",
    answer: "Most clients receive their first program recommendations within 24-48 hours of completing their intake form.",
  },
  {
    question: "Is my information kept confidential?",
    answer: "Absolutely. We follow HIPAA-aware practices and only share your information with programs we connect you with. Your privacy is our priority.",
  },
  {
    question: "What if I don't like the programs recommended?",
    answer: "Our team will work with you to understand your concerns and find additional options. We're committed to helping you find the right fit.",
  },
];

export default function ConciergeLanding() {
  // Phase 3: forward incoming search params (?location=...&treatment=...&insurance=...&from=...)
  // from search-results / SEO pages into the intake flow so step 1 is pre-filled.
  const { search } = useLocation();
  const intakeHref = search ? `/concierge/intake${search}` : "/concierge/intake";
  const steps = [
    {
      icon: Sparkles,
      title: "Tell Us Your Needs",
      description: "Complete a quick intake form about your situation, preferences, and insurance",
    },
    {
      icon: Users,
      title: "We Find Your Options",
      description: "Our specialists identify programs that fit your specific requirements",
    },
    {
      icon: MessageCircle,
      title: "Get Connected",
      description: "Selected programs reach out directly to discuss next steps with you",
    },
  ];

  const benefits = [
    {
      icon: HeartHandshake,
      title: "Personal Attention",
      description: "Real specialists who listen, not algorithms. We understand every situation is unique.",
    },
    {
      icon: BadgeCheck,
      title: "Verified Programs",
      description: "Every facility in our network is vetted for quality, licensing, and accreditation.",
    },
    {
      icon: Shield,
      title: "Insurance Help",
      description: "We help verify coverage and find programs that work with your insurance plan.",
    },
    {
      icon: Clock,
      title: "Fast Response",
      description: "Get placement options within 24-48 hours. When you're ready for help, we move quickly.",
    },
  ];

  return (
    <>
      <SEO
        title="Find Treatment That Fits | Free Concierge Placement"
        description="Stop searching alone. Our specialists connect you with treatment programs that fit your needs, insurance, and location — free for clients. Get placed in 24-48 hours."
        canonical="/concierge"
        keywords={["treatment placement", "rehab concierge", "addiction treatment placement", "personalized rehab help", "find rehab near me"]}
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "RehabLookup Concierge Placement Service",
            "description": "Free personalized treatment placement service connecting individuals with rehab programs matching their needs, insurance, and location.",
            "url": "https://rehablookup.com/concierge",
            "provider": { "@type": "Organization", "name": "RehabLookup", "url": "https://rehablookup.com" },
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
          },
        ]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Concierge", url: "/concierge" },
        ]}
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        
        <main className="flex-1">
          {/* Hero Section - Image Background */}
          <section className="relative z-10 bg-primary">
            <img 
              src={conciergeHero}
              alt=""
              role="presentation"
              className="absolute inset-0 w-full h-full object-cover object-center"
              width={1920}
              height={1080}
              fetchPriority="high"
              loading="eager"
              decoding="sync"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/75" />
            
            <div className="container relative mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-12 lg:py-14">
              <BreadcrumbNav
                className="mb-4"
                variant="dark"
                items={[{ label: "Concierge" }]}
              />
              <div className="max-w-3xl mx-auto text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 mb-6">
                    <HeartHandshake className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium text-white/90">Personalized Placement</span>
                  </div>
                  
                  <h1 className="text-[1.625rem] sm:text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-white mb-3 tracking-tight leading-tight">
                    Find the Right Treatment
                  </h1>
                  
                  <p className="text-base md:text-lg text-white/85 mb-8 leading-relaxed max-w-2xl mx-auto px-2">
                    Our specialists connect you with programs that fit your needs, insurance, and location.
                  </p>
                  
                  {/* CTA */}
                  <div className="flex flex-col items-center">
                    <Button asChild size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 text-base font-semibold shadow-lg shadow-primary/25 rounded-xl group">
                      <Link to="/concierge/intake">
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
          
          {/* Stats Bar - Solid Primary Background */}
          <section className="border-b border-border bg-primary text-primary-foreground py-2.5 md:py-4">
            <div className="container px-4 md:px-6 lg:px-8">
              <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 text-center max-w-4xl mx-auto">
                {STATS.map((stat) => (
                  <div key={stat.label} className="px-1">
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-0.5">
                      <stat.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent shrink-0" />
                      <span className="text-lg sm:text-xl md:text-2xl font-bold">{stat.value}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-primary-foreground/80">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
          
          {/* How It Works */}
          <section className="py-12 sm:py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <div className="text-center mb-10 sm:mb-14">
                <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">How It Works</p>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4 px-2">
                  Three Simple Steps to Find Treatment
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-2">
                  No complicated process. We guide you every step of the way.
                </p>
              </div>
              
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3 max-w-4xl mx-auto">
                {steps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="relative"
                  >
                    {index < 2 && (
                      <div className="hidden sm:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-3rem)] border-t-2 border-dashed border-border" />
                    )}
                    <Card className="relative h-full bg-card border border-border rounded-xl text-center">
                      <CardContent className="pt-6 pb-5 px-4 sm:pt-8 sm:pb-6 sm:px-6">
                        <div className="flex items-center justify-center mb-4">
                          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-base sm:text-lg font-bold">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-muted mx-auto mb-3 sm:mb-4">
                          <step.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1 sm:mb-2">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
              
              {/* CTA after steps */}
              <div className="text-center mt-8 sm:mt-10">
                <Button asChild size="lg" className="w-full sm:w-auto h-12 px-6 sm:px-8 text-base shadow-lg shadow-primary/25 rounded-xl">
                  <Link to="/concierge/intake">
                    Start Your Intake
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground mt-3">Takes only 5 minutes</p>
              </div>
            </div>
          </section>
          
          {/* Benefits Grid */}
          <section className="py-12 sm:py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10 sm:mb-14">
                  <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">Why Choose Us</p>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4 px-2">
                    More Than Just Matching
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-2">
                    We're committed to helping you find the right path
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <Card className="h-full border bg-card hover:border-primary/30 transition-colors">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                              <benefit.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base sm:text-lg text-foreground mb-1 sm:mb-2">{benefit.title}</h3>
                              <p className="text-muted-foreground text-sm leading-relaxed">
                                {benefit.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          
          {/* Testimonials */}
          <TestimonialsSection 
            testimonials={seekerTestimonials}
            title="Families We've Helped"
            subtitle="Real stories from people who found the right treatment through our concierge service"
          />
          
          {/* FAQ Section - Radix Accordion */}
          <section className="py-12 sm:py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-10 sm:mb-14">
                  <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">FAQ</p>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4">
                    Common Questions
                  </h2>
                </div>
                
                <Accordion type="single" collapsible className="space-y-2 sm:space-y-3">
                  {FAQ_ITEMS.map((item) => (
                    <AccordionItem key={item.question} value={item.question} className="border border-border rounded-lg px-3 sm:px-5 bg-card">
                      <AccordionTrigger className="text-left text-foreground text-sm sm:text-base font-medium hover:no-underline py-3 sm:py-4">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-3 sm:pb-4">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </section>
          
          {/* Final CTA Section */}
          <section className="py-12 sm:py-20 md:py-28 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_70%)]" />
            
            <div className="container relative mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center text-primary-foreground">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                    Ready to Find Help?
                  </h2>
                  <p className="text-sm sm:text-lg md:text-xl opacity-90 mb-6 sm:mb-8 leading-relaxed px-2">
                    You don't have to navigate this alone. Take the first step today.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                    <Button asChild size="lg" variant="secondary" className="h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-semibold shadow-xl rounded-xl group">
                      <Link to="/concierge/intake">
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 sm:mt-8 text-xs sm:text-sm opacity-80">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>No hidden fees</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>24-48hr response</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>100% confidential</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
          
          {/* Disclaimers */}
          <section className="py-6 sm:py-10 bg-muted/40 border-t">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center text-sm text-muted-foreground space-y-2 sm:space-y-3">
                <p>
                  <strong className="text-foreground/80">Important:</strong> This service provides placement assistance, not medical advice. 
                  Treatment decisions should be made with qualified healthcare professionals.
                </p>
                <p className="hidden sm:block">
                  If you or someone you know is in immediate danger, please call 911 or your local 
                  emergency number. For crisis support, visit the{" "}
                  <a 
                    href="https://988lifeline.org" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    988 Suicide and Crisis Lifeline
                  </a>.
                </p>
              </div>
            </div>
          </section>

          <PageFAQ faqs={conciergeFaqs} className="border-t border-border bg-muted/30" />
        </main>
        
        <PublicFooter />
      </div>
    </>
  );
}
