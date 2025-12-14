import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SearchForm } from "@/components/search/SearchForm";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { Button } from "@/components/ui/button";
import { treatmentCenters } from "@/data/treatmentCenters";
import heroImage from "@/assets/hero-recovery.jpg";
import { 
  Shield, 
  Phone, 
  CheckCircle, 
  Users, 
  Heart, 
  Clock,
  ArrowRight,
  Star,
  BadgeCheck,
  Headphones,
  Pill,
  Brain,
  Home,
  Activity,
  Stethoscope,
  Sparkles
} from "lucide-react";

const treatmentOptions = [
  {
    icon: Pill,
    title: "Drug Addiction",
    description: "Evidence-based programs for substance abuse including opioids, stimulants, and more.",
  },
  {
    icon: Activity,
    title: "Alcohol Treatment",
    description: "Medically supervised detox and long-term recovery programs for alcohol dependence.",
  },
  {
    icon: Brain,
    title: "Mental Health",
    description: "Dual diagnosis treatment addressing addiction alongside anxiety, depression, and PTSD.",
  },
  {
    icon: Home,
    title: "Residential Rehab",
    description: "24/7 inpatient care in a structured, supportive environment for focused recovery.",
  },
  {
    icon: Stethoscope,
    title: "Outpatient Programs",
    description: "Flexible treatment options that allow you to maintain work and family commitments.",
  },
  {
    icon: Sparkles,
    title: "Holistic Therapy",
    description: "Complementary approaches including yoga, meditation, art therapy, and nutrition.",
  },
];

const trustBadges = [
  { icon: BadgeCheck, label: "Verified Centers" },
  { icon: Shield, label: "Insurance Accepted" },
  { icon: Headphones, label: "24/7 Support" },
  { icon: Users, label: "10,000+ Helped" },
];

const Index = () => {
  const featuredCenters = treatmentCenters.filter((c) => c.featured).slice(0, 3);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        
        {/* Light overlay to maintain current colors */}
        <div className="absolute inset-0 bg-card/85" />
        
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        </div>

        {/* Content Container */}
        <div className="container relative flex flex-1 flex-col justify-center py-8 md:py-10">
          <div className="mx-auto w-full max-w-4xl text-center">
            {/* Trust Badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 animate-fade-in">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="text-sm font-semibold text-accent">
                Trusted by 10,000+ families nationwide
              </span>
            </div>

            {/* Headline */}
            <h1 className="mb-4 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl animate-fade-in" style={{ animationDelay: "50ms" }}>
              Find the Right Path to{" "}
              <span className="text-primary">Recovery</span>
            </h1>

            {/* Subheadline */}
            <p className="mb-8 text-base text-muted-foreground sm:text-lg md:text-xl animate-fade-in max-w-2xl mx-auto" style={{ animationDelay: "100ms" }}>
              Search verified addiction treatment centers and take the first step toward a healthier future.
            </p>

            {/* Search Form */}
            <div className="mb-8 animate-fade-in" style={{ animationDelay: "150ms" }}>
              <SearchForm variant="compact-hero" />
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 animate-fade-in md:gap-8" style={{ animationDelay: "200ms" }}>
              {trustBadges.map((badge) => (
                <div key={badge.label} className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <badge.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{badge.label}</span>
                </div>
              ))}
            </div>

            {/* Quick Call CTA */}
            <div className="mt-8 animate-fade-in" style={{ animationDelay: "250ms" }}>
              <a href="tel:1-800-555-0199" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Phone className="h-4 w-4" />
                <span>Need help now? Call <strong className="text-foreground">1-800-555-0199</strong></span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Featured Centers */}
      <section className="py-20 md:py-24">
        <div className="container">
          {/* Section Header */}
          <div className="mb-12 flex flex-col items-center text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">Featured</span>
            </div>
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              Top-Rated Treatment Centers
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Hand-selected facilities known for exceptional care, verified outcomes, and compassionate treatment.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredCenters.map((center, index) => (
              <div 
                key={center.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <TreatmentCenterCard center={center} featured />
              </div>
            ))}
          </div>

          {/* View All Link */}
          <div className="mt-10 text-center">
            <Link to="/rehab-centers">
              <Button variant="outline" size="lg" className="gap-2 group">
                View All Centers
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Treatment Options */}
      <section className="relative py-20 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-secondary/30" />
        
        <div className="container relative">
          {/* Section Header */}
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
              <Heart className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Treatment Options</span>
            </div>
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              Comprehensive Care for Every Need
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Find specialized treatment programs tailored to your unique situation and recovery goals.
            </p>
          </div>

          {/* Options Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {treatmentOptions.map((option, index) => (
              <div
                key={option.title}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="relative h-full rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20">
                  {/* Icon */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <option.icon className="h-6 w-6 text-primary" />
                  </div>
                  
                  <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                    {option.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {option.description}
                  </p>
                  
                  {/* Hover arrow */}
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Learn more <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 text-center">
            <Link to="/rehab-centers">
              <Button variant="default" size="lg" className="gap-2 group">
                Explore All Treatment Options
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-20 md:py-24 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-secondary/50" />
        <div className="absolute inset-0 opacity-50">
          <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="container relative">
          {/* Section Header */}
          <div className="mb-14 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Simple Process</span>
            </div>
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Finding the right treatment is simple, confidential, and free.
            </p>
          </div>

          {/* Steps */}
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: 1,
                title: "Search",
                description: "Enter your location to find verified treatment centers near you.",
                icon: "🔍",
              },
              {
                step: 2,
                title: "Compare",
                description: "Review programs, insurance options, and facility details.",
                icon: "📋",
              },
              {
                step: 3,
                title: "Connect",
                description: "Contact centers directly or request a callback from our team.",
                icon: "📞",
              },
            ].map((item, index) => (
              <div
                key={item.step}
                className="group relative animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Connector line */}
                {index < 2 && (
                  <div className="absolute top-8 left-1/2 hidden h-0.5 w-full bg-border md:block" />
                )}
                
                <div className="relative rounded-2xl border border-border bg-card p-8 shadow-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  {/* Step number */}
                  <div className="absolute -top-4 left-8 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md">
                    {item.step}
                  </div>
                  
                  <div className="mb-4 text-4xl">{item.icon}</div>
                  <h3 className="mb-2 font-display text-xl font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 md:py-24">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Content */}
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
                <Heart className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Why RehabLookup</span>
              </div>
              <h2 className="mb-5 font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
                Trusted by Families Across America
              </h2>
              <p className="mb-8 text-muted-foreground leading-relaxed">
                We understand that finding addiction treatment is one of the most important decisions 
                your family will make. That's why we're committed to transparency, accuracy, and compassion.
              </p>

              <ul className="space-y-4">
                {[
                  "Every facility verified for licensing & accreditation",
                  "Transparent program and cost information",
                  "No hidden fees or surprise referrals",
                  "Confidential, secure communication",
                  "24/7 support for urgent situations",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 group">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 transition-colors group-hover:bg-accent/30">
                      <CheckCircle className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link to="/about">
                  <Button variant="secondary" className="gap-2 group">
                    Learn More About Us
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats Card */}
            <div className="relative">
              {/* Decorative elements */}
              <div className="absolute -top-6 -left-6 h-24 w-24 rounded-2xl border border-accent/20 bg-accent/5" />
              <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-2xl border border-primary/20 bg-primary/5" />
              
              <div className="relative rounded-2xl border border-border bg-card p-10 shadow-lg">
                <div className="grid gap-8 sm:grid-cols-2">
                  <div className="text-center">
                    <div className="mb-2 font-display text-4xl font-bold text-primary md:text-5xl">10K+</div>
                    <p className="text-sm text-muted-foreground">Families Helped</p>
                  </div>
                  <div className="text-center">
                    <div className="mb-2 font-display text-4xl font-bold text-primary md:text-5xl">500+</div>
                    <p className="text-sm text-muted-foreground">Verified Centers</p>
                  </div>
                  <div className="text-center">
                    <div className="mb-2 font-display text-4xl font-bold text-primary md:text-5xl">50</div>
                    <p className="text-sm text-muted-foreground">States Covered</p>
                  </div>
                  <div className="text-center">
                    <div className="mb-2 font-display text-4xl font-bold text-accent md:text-5xl">24/7</div>
                    <p className="text-sm text-muted-foreground">Support Available</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-primary" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white blur-3xl" />
        </div>

        <div className="container relative text-center">
          <h2 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
            Ready to Take the First Step?
          </h2>
          <p className="mb-8 text-lg text-primary-foreground/85 max-w-xl mx-auto">
            Recovery is possible. Find the right treatment center for you or your loved one today.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/rehab-centers">
              <Button variant="hero-light" size="lg" className="gap-2 min-w-[200px]">
                Find Rehab Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="tel:1-800-555-0199">
              <Button 
                size="lg" 
                className="gap-2 min-w-[200px] bg-transparent border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Phone className="h-4 w-4" />
                Call 1-800-555-0199
              </Button>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
