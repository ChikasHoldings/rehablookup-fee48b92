import { Link } from "react-router-dom";
import MedicalPatternBackground from "@/components/backgrounds/MedicalPatternBackground";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
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
  Clock,
  Shield,
  Building2,
  Plane,
  Globe,
  CheckCircle2,
  Lock,
  Sparkles,
  Timer,
  Users,
  ArrowRight,
} from "lucide-react";
import internationalHeroImg from "@/assets/international-hero.jpg";
import internationalTherapyImg from "@/assets/international-therapy.jpg";

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
    title: "Complete Application",
    description: "Fill out our comprehensive intake form with your treatment needs and preferences",
  },
  {
    title: "Get Placed",
    description: "Our team identifies best-fit U.S. facilities based on your specific criteria",
  },
  {
    title: "Confirm Admission",
    description: "We coordinate directly with the facility to secure your placement",
  },
];

const FAQ_ITEMS = [
  {
    question: "How much does placement cost?",
    answer: "We charge a $299 service fee to begin your placement. This fee ensures we can dedicate personalized attention to every case, connecting you with the right facilities, verifying clinical fit, and coordinating directly with admissions teams on your behalf. It also filters out casual inquiries so our advisors can focus on clients who are serious about treatment. Best of all, the $299 is fully refunded when you're admitted to a facility through our service.",
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
    question: "What happens after I complete the application?",
    answer: "After submitting your application and payment, you'll receive a confirmation email. Within 24 hours, a placement advisor will review your case and begin identifying suitable treatment options. You'll receive personalized recommendations and next steps via email or phone.",
  },
  {
    question: "Is RehabLookup a treatment provider?",
    answer: "No. RehabLookup is a placement coordination service. We help individuals and families compare treatment options and coordinate placement with independent, licensed treatment facilities. All clinical decisions are made by the facilities themselves.",
  },
];

const TRUST_STATS = [
  { value: "50+", label: "Countries Served", icon: Globe },
  { value: "200+", label: "US Facilities", icon: Building2 },
  { value: "24hr", label: "Response Time", icon: Clock },
];

export default function InternationalLanding() {
  return (
    <>
      <SEO
        title="U.S. Treatment Placement for International Clients | RehabLookup"
        description="Private placement service for international patients seeking treatment in the United States. Vetted facilities, discreet coordination, 24-hour response."
        canonical="/international"
        keywords={["international rehab", "US addiction treatment", "global rehab placement", "travel for treatment", "executive rehab", "luxury rehab USA"]}
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        
        <main className="flex-1">
          {/* Hero Section - Image Background, Centered */}
          <section className="relative z-10 bg-primary">
            <img 
              src={internationalHeroImg}
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

            <div className="container relative px-4 md:px-6 lg:px-8 py-10 md:py-12 lg:py-14">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-3xl mx-auto text-center"
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 mb-6">
                  <Globe className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-white/90">International Placement Services</span>
                </div>
                
                <h1 className="text-[1.625rem] sm:text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-white mb-3 tracking-tight leading-tight">
                  Your Gateway to American Rehab
                </h1>
                
                <p className="text-base md:text-lg text-white/85 mb-8 leading-relaxed max-w-2xl mx-auto px-2">
                  Expert placement into America's finest treatment centers. We handle everything—from placement to admission—so you can focus on recovery.
                </p>

                <Button 
                  size="lg" 
                  className="h-12 md:h-14 px-6 md:px-10 text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/25 w-full sm:w-auto"
                  asChild
                >
                  <Link to="/international/apply">
                    Find Treatment
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </motion.div>
            </div>
          </section>

          {/* Stats Bar - Solid Primary Background */}
          <section className="border-b border-border bg-primary text-primary-foreground py-2.5 md:py-4">
            <div className="container px-4 sm:px-5 md:px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center max-w-4xl mx-auto">
                {TRUST_STATS.map((stat) => (
                  <div key={stat.label} className="px-1">
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-0.5">
                      <stat.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent shrink-0" />
                      <span className="text-lg sm:text-xl md:text-2xl font-bold">{stat.value}</span>
                    </div>
                    <p className="text-[9px] sm:text-[10px] md:text-xs text-primary-foreground/80">{stat.label}</p>
                  </div>
                ))}
                <div className="px-1">
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-0.5">
                    <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent shrink-0" />
                    <span className="text-lg sm:text-xl md:text-2xl font-bold">100%</span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] md:text-xs text-primary-foreground/80">Money-Back Guarantee</p>
                </div>
              </div>
            </div>
          </section>

          {/* Why US Treatment */}
          <section className="py-12 sm:py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <div className="text-center mb-10 sm:mb-14">
                <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">Why U.S. Treatment</p>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4 px-2">
                  World-Class Care, Complete Privacy
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-2">
                  The United States has the largest private rehab system in the world—offering what government-run programs in other countries simply cannot.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
                {WHY_US_TREATMENT.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="bg-background border rounded-xl p-5 md:p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4">
                      <item.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1.5 md:mb-2 text-sm md:text-base">{item.title}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Image + Text Section */}
          <section className="py-12 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center max-w-6xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="order-2 lg:order-1"
                >
                  <img
                    src={internationalTherapyImg}
                    alt="Professional therapy consultation session"
                    className="rounded-xl md:rounded-2xl shadow-xl md:shadow-2xl w-full"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="order-1 lg:order-2"
                >
                  <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">Global Reach</p>
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-3 md:mb-4">
                    Serving Clients Worldwide
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground mb-5 md:mb-6 leading-relaxed">
                    We work with individuals and families from Europe, the Middle East, Asia, Latin America, and beyond who are seeking high-quality treatment options in the United States.
                  </p>
                  <ul className="space-y-2.5 md:space-y-3">
                    {[
                      "Executives requiring discreet, private programs",
                      "Families seeking specialized clinical care",
                      "Individuals needing dual-diagnosis treatment",
                      "Clients looking for luxury or concierge-level care"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2.5 md:gap-3">
                        <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm md:text-base text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 md:mt-8">
                    <Button asChild size="lg" className="w-full sm:w-auto">
                      <Link to="/international/apply">
                        Find Treatment
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* US Rehab Destinations - Cross-linking */}
          <section className="py-12 md:py-20 border-t bg-background">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <div className="text-center mb-8 md:mb-10">
                <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">Explore Options</p>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2 md:mb-3">
                  Explore U.S. Treatment Options
                </h2>
                <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                  Discover America's top treatment destinations and specialty programs
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 max-w-5xl mx-auto">
                {[
                  { name: "Best Rehab in USA", path: "/us-rehab/best-rehab-usa" },
                  { name: "Luxury Rehab America", path: "/us-rehab/luxury-rehab-america" },
                  { name: "Luxury Rehab California", path: "/us-rehab/luxury-rehab-california" },
                  { name: "Luxury Rehab Florida", path: "/us-rehab/luxury-rehab-florida" },
                  { name: "Executive Rehab USA", path: "/us-rehab/executive-rehab" },
                  { name: "Celebrity Rehab USA", path: "/us-rehab/celebrity-rehab-usa" },
                  { name: "Alcohol Rehab USA", path: "/us-rehab/alcohol-rehab-usa" },
                  { name: "Drug Rehab USA", path: "/us-rehab/drug-rehab-usa" },
                  { name: "Dual Diagnosis USA", path: "/us-rehab/dual-diagnosis-usa" },
                  { name: "Rehab from UK", path: "/us-rehab/uk-patients" },
                  { name: "Rehab from UAE", path: "/us-rehab/uae-middle-east" },
                  { name: "Rehab from Australia", path: "/us-rehab/australian-patients" },
                ].map((item, i) => (
                  <Link
                    key={i}
                    to={item.path}
                    className="group px-4 py-3 md:px-5 md:py-4 rounded-xl border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all text-center"
                  >
                    <span className="text-sm md:text-[15px] font-medium text-foreground group-hover:text-primary transition-colors">
                      {item.name}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="text-center mt-6 md:mt-8">
                <Link
                  to="/us-rehab"
                  className="inline-flex items-center gap-2 text-sm md:text-base font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  View All US Treatment Options
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-12 sm:py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <div className="text-center mb-10 sm:mb-14">
                <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">How It Works</p>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4 px-2">
                  A Streamlined Placement Process
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
                  A streamlined process to connect you with the right treatment program
                </p>
              </div>

              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3 max-w-4xl mx-auto">
                {STEPS.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.15 }}
                    className="relative"
                  >
                    {index < 2 && (
                      <div className="hidden sm:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-3rem)] border-t-2 border-dashed border-border" />
                    )}
                    <div className="relative bg-card border border-border rounded-xl p-5 md:p-6 text-center h-full">
                      <div className="flex items-center justify-center mb-3 sm:mb-4">
                        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-base sm:text-lg font-bold">
                          {index + 1}
                        </div>
                      </div>
                      <h3 className="font-semibold text-foreground mb-1 md:mb-2 text-sm md:text-base">{step.title}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Trust Features */}
          <section className="py-12 md:py-20 bg-background">
            <div className="container mx-auto px-5 md:px-4">
              <div className="text-center mb-10 sm:mb-14">
                <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">What We Provide</p>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2 md:mb-3">
                  Comprehensive Support
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 max-w-6xl mx-auto">
                {TRUST_FEATURES.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="text-center p-4 md:p-6"
                  >
                    <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 md:mb-4">
                      <feature.icon className="h-5 w-5 md:h-7 md:w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1 md:mb-2 text-sm md:text-base">{feature.title}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ Section - Radix Accordion */}
          <section className="py-12 sm:py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-5 md:px-4">
              <div className="text-center mb-10 sm:mb-14">
                <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">FAQ</p>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2 md:mb-3">
                  Frequently Asked Questions
                </h2>
              </div>

              <div className="max-w-2xl mx-auto">
                <Accordion type="single" collapsible className="space-y-2 sm:space-y-3">
                  {FAQ_ITEMS.map((item) => (
                    <AccordionItem key={item.question} value={item.question} className="border border-border rounded-lg px-3 sm:px-5 bg-card">
                      <AccordionTrigger className="text-left text-foreground text-sm sm:text-base font-medium hover:no-underline py-3 sm:py-4">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-xs sm:text-sm text-muted-foreground pb-3 sm:pb-4">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-12 md:py-24 bg-background">
            <div className="container mx-auto px-5 md:px-4">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="max-w-4xl mx-auto bg-gradient-to-br from-primary to-primary/80 rounded-xl md:rounded-2xl p-6 md:p-10 lg:p-14 text-center shadow-xl"
              >
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-primary-foreground mb-3 md:mb-4">
                  Ready to Begin Your Recovery Journey?
                </h2>
                <p className="text-sm md:text-base text-primary-foreground/80 max-w-xl mx-auto mb-6 md:mb-8">
                  Take the first step towards accessing world-class treatment in the United States. Our advisors are standing by to help.
                </p>
                <Button 
                  size="lg" 
                  className="h-11 md:h-12 px-6 md:px-8 text-sm md:text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg w-full sm:w-auto" 
                  asChild
                >
                  <Link to="/international/apply">
                    Find Treatment
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </motion.div>
            </div>
          </section>
        </main>
        
        <PublicFooter />
      </div>
    </>
  );
}
