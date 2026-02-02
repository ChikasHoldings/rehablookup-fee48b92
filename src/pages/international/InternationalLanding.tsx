import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { 
  Clock,
  Shield,
  Building2,
  Plane,
  ChevronDown,
  ChevronUp,
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
    number: "01",
    title: "Complete Application",
    description: "Fill out our comprehensive intake form with your treatment needs and preferences",
  },
  {
    number: "02",
    title: "Get Matched",
    description: "Our team identifies best-fit U.S. facilities based on your specific criteria",
  },
  {
    number: "03",
    title: "Confirm Admission",
    description: "We coordinate directly with the facility to secure your placement",
  },
];

const FAQ_ITEMS = [
  {
    question: "How much does placement cost?",
    answer: "We charge a $299 service fee to begin your placement. This fee ensures we can dedicate personalized attention to every case—matching you with the right facilities, verifying clinical fit, and coordinating directly with admissions teams on your behalf. The fee filters out casual inquiries so our advisors can focus on clients who are serious about treatment. Best of all, the $299 is fully refunded when you're admitted to a facility through our service.",
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
  { value: "50+", label: "Countries Served" },
  { value: "200+", label: "US Facilities" },
  { value: "24hr", label: "Response Time" },
];

export default function InternationalLanding() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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
          {/* Hero Section - Fits Viewport with Trust Bar */}
          <section className="relative h-[calc(100svh-64px)] flex flex-col">
            {/* Background with refined overlay */}
            <div className="absolute inset-0 z-0">
              <img
                src={internationalHeroImg}
                alt="Professional treatment center therapy lounge"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--background))] via-[hsl(var(--background)/0.9)] to-[hsl(var(--background)/0.3)]" />
            </div>

            {/* Main Content - Centered */}
            <div className="relative z-10 flex-1 flex items-center">
              <div className="container mx-auto px-6 lg:px-8">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="max-w-2xl"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
                    <Globe className="h-4 w-4" />
                    International Placement Services
                  </div>
                  
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
                    Your Gateway to
                    <span className="block text-primary">American Rehab</span>
                  </h1>
                  
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl">
                    Expert placement into America's finest treatment centers. We handle everything—from matching to admission—so you can focus on recovery.
                  </p>

                  <Button 
                    size="lg" 
                    className="h-14 px-10 text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/25 mb-10"
                    asChild
                  >
                    <Link to="/international/apply">
                      Find Treatment
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>

                  {/* Trust Stats */}
                  <div className="flex gap-10 lg:gap-14">
                    {TRUST_STATS.map((stat, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                      >
                        <p className="text-3xl lg:text-4xl font-bold text-primary">{stat.value}</p>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Trust Bar - Dark Background */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="relative z-10 bg-foreground"
            >
              <div className="container mx-auto px-6 lg:px-8 py-4">
                <div className="flex flex-wrap justify-center gap-x-10 gap-y-2">
                  {[
                    "Vetted Luxury Programs",
                    "Immediate Admission",
                    "Complete Privacy",
                    "Money-Back Guarantee",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm font-medium text-background">
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </section>

          {/* Why US Treatment */}
          <section className="py-16 md:py-24">
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
                    className="bg-background border rounded-xl p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Image + Text Section */}
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <img
                    src={internationalTherapyImg}
                    alt="Professional therapy consultation session"
                    className="rounded-2xl shadow-2xl w-full"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
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
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Button asChild size="lg">
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

          {/* How It Works */}
          <section className="py-16 md:py-24">
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
                      <div className="bg-background border rounded-xl p-6 h-full">
                        <span className="text-5xl font-bold text-primary/20 mb-4 block">
                          {step.number}
                        </span>
                        <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-muted-foreground/30">
                          <ArrowRight className="h-8 w-8" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Trust Features */}
          <section className="py-16 md:py-20 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  What We Provide
                </h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-6xl mx-auto">
                {TRUST_FEATURES.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="text-center p-6"
                  >
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Frequently Asked Questions
                </h2>
              </div>

              <div className="max-w-3xl mx-auto space-y-3">
                {FAQ_ITEMS.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="font-medium text-foreground pr-4">{item.question}</span>
                      {expandedFaq === index ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    {expandedFaq === index && (
                      <div className="px-5 pb-5">
                        <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="max-w-4xl mx-auto bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-10 md:p-14 text-center shadow-xl"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
                  Ready to Begin Your Recovery Journey?
                </h2>
                <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
                  Take the first step towards accessing world-class treatment in the United States. Our advisors are standing by to help.
                </p>
                <Button 
                  size="lg" 
                  className="h-12 px-8 text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg" 
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
