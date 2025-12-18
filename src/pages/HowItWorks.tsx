import { Link } from "react-router-dom";
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
} from "lucide-react";

const steps = [
  {
    step: 1,
    icon: Search,
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
        title="How It Works - Find Treatment in 3 Simple Steps"
        description="Learn how RehabLookup helps you find the right addiction treatment center. Search, compare, and connect with verified facilities in three easy steps."
        canonical="/how-it-works"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "How It Works", url: "/how-it-works" },
        ]}
      />
      {/* Hero - Navy background */}
      <section className="bg-primary py-16 px-4 md:py-20 md:px-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>
        
        <div className="container text-center relative">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 backdrop-blur-sm border border-white/10">
            <CheckCircle className="h-5 w-5 text-accent" />
            <span className="text-base font-medium text-primary-foreground">Simple 3-Step Process</span>
          </div>
          <h1 className="mb-5 font-display text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
            How It Works
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed md:text-xl">
            Finding the right addiction treatment center is simple, confidential, and free. Here's how we help.
          </p>
          
          {/* Scroll indicator */}
          <div className="mt-10 animate-bounce">
            <ChevronDown className="h-6 w-6 text-primary-foreground/50 mx-auto" />
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

      {/* Steps Section */}
      <section className="py-16 px-4 md:py-24 md:px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="container">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl mb-4">
              Your Journey to Recovery
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Follow these three simple steps to find the treatment center that's right for you.
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Vertical connector line - hidden on mobile */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-accent/50 via-accent to-accent/50 -translate-x-1/2" />
            
            <div className="space-y-12 lg:space-y-0">
              {steps.map((step, index) => (
                <div
                  key={step.step}
                  className="relative animate-fade-in"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* Flow arrow between steps - mobile only */}
                  {index < steps.length - 1 && (
                    <div className="lg:hidden flex justify-center py-6">
                      <div className="flex flex-col items-center">
                        <div className="w-0.5 h-8 bg-gradient-to-b from-accent to-accent/50" />
                        <ChevronDown className="h-5 w-5 text-accent -mt-1" />
                      </div>
                    </div>
                  )}
                  
                  <div
                    className={`lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center ${
                      index % 2 === 1 ? "lg:grid-flow-col-dense" : ""
                    } ${index > 0 ? "lg:pt-24" : ""}`}
                  >
                    {/* Content side */}
                    <div className={`${index % 2 === 1 ? "lg:col-start-2" : ""} mb-8 lg:mb-0`}>
                      {/* Step indicator */}
                      <div className="mb-6 flex items-center gap-4">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.iconBg} text-xl font-bold text-white shadow-lg shadow-accent/20`}>
                          {step.step}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-accent uppercase tracking-widest">Step {step.step} of 3</span>
                          <h3 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                            {step.title}
                          </h3>
                        </div>
                      </div>
                      
                      <p className="mb-6 text-base text-muted-foreground leading-relaxed md:text-lg">
                        {step.description}
                      </p>
                      
                      {/* Details list */}
                      <ul className="space-y-3">
                        {step.details.map((detail, detailIndex) => (
                          <li 
                            key={detail} 
                            className="flex items-center gap-3 animate-fade-in"
                            style={{ animationDelay: `${(index * 150) + (detailIndex * 50)}ms` }}
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15">
                              <CheckCircle className="h-4 w-4 text-accent" />
                            </div>
                            <span className="text-foreground">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Card side */}
                    <div className={`${index % 2 === 1 ? "lg:col-start-1 lg:row-start-1" : ""} relative`}>
                      {/* Connection dot on the line - desktop only */}
                      <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-10">
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${step.iconBg} shadow-lg ring-4 ring-background`} />
                      </div>
                      
                      <div className={`relative rounded-3xl bg-gradient-to-br ${step.gradient} p-1 group hover:scale-[1.02] transition-transform duration-300`}>
                        <div className="rounded-[22px] bg-card/80 backdrop-blur-sm p-8 md:p-10 border border-border/50">
                          {/* Decorative circles */}
                          <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-accent/5 blur-xl" />
                          <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full bg-accent/5 blur-xl" />
                          
                          <div className="relative flex flex-col items-center text-center">
                            <div className={`mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br ${step.iconBg} shadow-xl shadow-accent/20 group-hover:shadow-2xl group-hover:shadow-accent/30 transition-shadow duration-300`}>
                              <step.icon className="h-12 w-12 text-white" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">
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

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 md:gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm animate-fade-in hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent/80 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                  <benefit.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-3 font-display text-xl font-semibold text-primary-foreground">
                  {benefit.title}
                </h3>
                <p className="text-base text-primary-foreground/70 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 px-4 md:py-24 md:px-6">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/5 via-accent/10 to-accent/5 p-10 md:p-14 text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
            
            <div className="relative">
              <div className="mb-6 inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-accent/80 shadow-xl mx-auto">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">
                Ready to Get Started?
              </h2>
              <p className="mb-8 text-base text-muted-foreground max-w-xl mx-auto leading-relaxed md:text-lg">
                Take the first step toward recovery today. Search our directory or speak with a specialist who can help guide you.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-4">
                <Link to="/rehab-centers" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full h-14 gap-2 text-base font-semibold sm:w-auto sm:px-8 hover:scale-105 hover:shadow-xl transition-all duration-200">
                    Find Treatment Centers
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/request-help?source=howitworks_cta" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full h-14 gap-2 text-base font-semibold sm:w-auto sm:px-8 hover:scale-105 transition-all duration-200">
                    <MessageSquare className="h-5 w-5" />
                    Request Help
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HowItWorks;
