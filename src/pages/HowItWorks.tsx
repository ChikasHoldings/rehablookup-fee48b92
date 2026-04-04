import { Link } from "react-router-dom";
import { PageFAQ } from "@/components/seo/PageFAQ";
import { howItWorksFaqs } from "@/data/pageFaqs";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Search,
  FileCheck,
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
  Heart,
  Users,
  Star,
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import step1Image from "@/assets/how-it-works/step-1-search.png";
import step2Image from "@/assets/how-it-works/step-2-compare.png";
import step3Image from "@/assets/how-it-works/step-3-connect.png";

const steps = [
  {
    step: 1,
    icon: Search,
    image: step1Image,
    title: "Search Treatment Centers",
    description: "Enter your location and preferences to browse verified treatment facilities in your area. Filter by treatment type, insurance, amenities, and more.",
    details: [
      "Search by city, state, or ZIP code",
      "Filter by treatment type and specialization",
      "Compare programs side-by-side",
      "View verified ratings and reviews",
    ],
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconBg: "from-blue-500 to-cyan-500",
  },
  {
    step: 2,
    icon: FileCheck,
    image: step2Image,
    title: "Review & Compare",
    description: "Explore detailed facility profiles with information about programs, costs, insurance acceptance, and success rates to make an informed decision.",
    details: [
      "Detailed program descriptions",
      "Transparent pricing information",
      "Staff credentials and certifications",
      "Facility photos and virtual tours",
    ],
    gradient: "from-violet-500/20 to-purple-500/20",
    iconBg: "from-violet-500 to-purple-500",
  },
  {
    step: 3,
    icon: MessageSquare,
    image: step3Image,
    title: "Connect Directly",
    description: "Contact treatment centers directly through our platform or speak with our specialists who can help guide you to the right program.",
    details: [
      "Direct contact with facilities",
      "Free consultation with specialists",
      "Insurance verification assistance",
      "Admission coordination support",
    ],
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconBg: "from-emerald-500 to-teal-500",
  },
];

const benefits = [
  {
    icon: Shield,
    title: "Verified Facilities",
    description: "Every center is verified for proper licensing, accreditation, and quality standards.",
  },
  {
    icon: Heart,
    title: "Compassionate Support",
    description: "Our team understands the challenges of finding treatment and provides judgment-free guidance.",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Help is available around the clock for urgent situations and immediate assistance.",
  },
  {
    icon: Users,
    title: "Free Service",
    description: "Our directory service is completely free for individuals and families seeking treatment.",
  },
];

const HowItWorks = () => {
  return (
    <Layout>
      <SEO
        title="How It Works - Find Rehab in 3 Steps | RehabLookup"
        description="Learn how RehabLookup helps you find addiction treatment. Search, compare, and connect with verified rehab centers in three easy steps."
        canonical="/how-it-works"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "How It Works", url: "/how-it-works" },
        ]}
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": "How to Find Addiction Treatment",
            "description": "Three simple steps to find the right treatment center for drug or alcohol addiction recovery.",
            "totalTime": "PT10M",
            "step": [
              {
                "@type": "HowToStep",
                "position": 1,
                "name": "Search Treatment Centers",
                "text": "Enter your location and preferences to browse verified treatment facilities in your area. Filter by treatment type, insurance, amenities, and more.",
                "url": "https://rehablookup.com/how-it-works#step-1"
              },
              {
                "@type": "HowToStep",
                "position": 2,
                "name": "Review & Compare",
                "text": "Explore detailed facility profiles with information about programs, costs, insurance acceptance, and success rates to make an informed decision.",
                "url": "https://rehablookup.com/how-it-works#step-2"
              },
              {
                "@type": "HowToStep",
                "position": 3,
                "name": "Connect Directly",
                "text": "Contact treatment centers directly through our platform or speak with our specialists who can help guide you to the right program.",
                "url": "https://rehablookup.com/how-it-works#step-3"
              }
            ]
          }
        ]}
      />
      {/* Hero - Compact navy header matching About page */}
      <section className="bg-primary py-10 px-4 md:py-14 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-2xl -translate-y-1/2" />
        </div>
        
        <div className="container relative">
          {/* Breadcrumb */}
          <nav className="mb-5 text-center">
            <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
              <Link to="/" className="text-white/70 hover:text-white transition-colors">Home</Link>
              <span className="text-white/50">/</span>
              <span className="text-white font-medium">How It Works</span>
            </span>
          </nav>
          
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/10">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Simple 3-Step Process</span>
            </div>
            <h1 className="mb-3 font-display text-xl font-bold text-primary-foreground md:text-2xl lg:text-3xl">
              How It Works
            </h1>
            <p className="text-base text-primary-foreground/80 leading-relaxed md:text-lg max-w-xl mx-auto">
              Finding the right addiction treatment center is simple, confidential, and free.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-5 px-4 md:py-4 md:px-6">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-base md:gap-12 md:text-sm">
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Shield className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>100% Free</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Clock className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>Quick & Easy</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Heart className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>Confidential</span>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section - Polished */}
      <section className="py-12 px-4 md:py-16 md:px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="container">
          {/* Section header */}
          <div className="text-center mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2">
              <Star className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Your Path Forward</span>
            </div>
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-3">
              Your Journey to Recovery
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
              Follow these three simple steps to find the treatment center that's right for you.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            {/* Vertical connector line - hidden on mobile */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-accent/50 via-accent to-accent/50 -translate-x-1/2" />
            
            <div className="space-y-8 lg:space-y-0">
              {steps.map((step, index) => (
                <div
                  key={step.step}
                  className="relative animate-fade-in"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* Flow arrow between steps - mobile only */}
                  {index < steps.length - 1 && (
                    <div className="lg:hidden flex justify-center py-4">
                      <div className="flex flex-col items-center">
                        <div className="w-0.5 h-6 bg-gradient-to-b from-accent to-accent/50" />
                        <ChevronDown className="h-4 w-4 text-accent -mt-1" />
                      </div>
                    </div>
                  )}
                  
                  <div
                    className={`lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center ${
                      index % 2 === 1 ? "lg:grid-flow-col-dense" : ""
                    } ${index > 0 ? "lg:pt-16" : ""}`}
                  >
                    {/* Content side */}
                    <div className={`${index % 2 === 1 ? "lg:col-start-2" : ""} mb-6 lg:mb-0`}>
                      {/* Step indicator */}
                      <div className="mb-4 flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.iconBg} text-lg font-bold text-white shadow-lg shadow-accent/20`}>
                          {step.step}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-accent uppercase tracking-widest">Step {step.step} of 3</span>
                          <h3 className="font-display text-xl font-bold text-foreground md:text-2xl">
                            {step.title}
                          </h3>
                        </div>
                      </div>
                      
                      <p className="mb-4 text-sm text-muted-foreground leading-relaxed md:text-base">
                        {step.description}
                      </p>
                      
                      {/* Details list */}
                      <ul className="space-y-2">
                        {step.details.map((detail, detailIndex) => (
                          <li 
                            key={detail} 
                            className="flex items-center gap-2 animate-fade-in text-sm"
                            style={{ animationDelay: `${(index * 150) + (detailIndex * 50)}ms` }}
                          >
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15">
                              <CheckCircle className="h-3 w-3 text-accent" />
                            </div>
                            <span className="text-foreground">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Image side */}
                    <div className={`${index % 2 === 1 ? "lg:col-start-1 lg:row-start-1" : ""} relative`}>
                      {/* Connection dot on the line - desktop only */}
                      <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-10">
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${step.iconBg} shadow-lg ring-4 ring-background`} />
                      </div>
                      
                      <div className={`relative rounded-2xl bg-gradient-to-br ${step.gradient} p-1 group hover:scale-[1.02] transition-transform duration-300`}>
                        <div className="rounded-[14px] bg-card/80 backdrop-blur-sm p-6 md:p-8 border border-border/50">
                          {/* Decorative circles */}
                          <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-accent/5 blur-xl" />
                          <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full bg-accent/5 blur-xl" />
                          
                          <div className="relative flex flex-col items-center text-center">
                            <img 
                              src={step.image} 
                              alt={step.title}
                              className="w-32 h-32 md:w-40 md:h-40 object-contain mb-4"
                              width={160}
                              height={160}
                              loading="lazy"
                            />
                            <span className="text-xs font-medium text-muted-foreground">
                              {step.step === 1 && "Find your options"}
                              {step.step === 2 && "Make informed choices"}
                              {step.step === 3 && "Start your journey"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-primary md:py-20 md:px-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl translate-y-1/2" />
        </div>
        
        <div className="container relative">
          <div className="text-center mb-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 backdrop-blur-sm border border-white/10">
              <Star className="h-5 w-5 text-accent" />
              <span className="text-base font-medium text-primary-foreground">Why Choose Us</span>
            </div>
            <h2 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
              The RehabLookup Difference
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto leading-relaxed">
              We're committed to helping you find the right treatment with transparency and compassion.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-5">
            {benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm animate-fade-in hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/80 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                    <benefit.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-primary-foreground">
                    {benefit.title}
                  </h3>
                </div>
                <p className="text-sm text-primary-foreground/70 leading-relaxed pl-[52px]">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-12 px-4 md:py-16 md:px-6">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-accent/10 to-accent/5 p-8 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
            
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="text-center md:text-left">
                <h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-2">
                  Ready to Get Started?
                </h2>
                <p className="text-muted-foreground text-sm md:text-base max-w-md">
                  Take the first step toward recovery. Search our directory or speak with a specialist.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link to="/rehab-centers">
                  <Button size="default" className="gap-2 font-semibold hover:scale-105 transition-all duration-200">
                    Find Treatment
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/concierge">
                  <Button variant="outline" size="default" className="gap-2 font-semibold">
                    <MessageSquare className="h-4 w-4" />
                    Concierge Service
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PageFAQ faqs={howItWorksFaqs} className="border-t border-border bg-muted/30" />
    </Layout>
  );
};

export default HowItWorks;
