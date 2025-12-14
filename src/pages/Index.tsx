import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SearchForm } from "@/components/search/SearchForm";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { Button } from "@/components/ui/button";
import { treatmentCenters } from "@/data/treatmentCenters";
import heroImage from "@/assets/hero-recovery.jpg";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Sparkles,
  Quote,
  BookOpen,
  Calendar,
  Search
} from "lucide-react";

const blogArticles = [
  {
    title: "Understanding the Stages of Addiction Recovery",
    excerpt: "Recovery is a journey with distinct stages. Learn what to expect and how to navigate each phase successfully.",
    category: "Recovery",
    readTime: "5 min read",
  },
  {
    title: "How to Support a Loved One in Treatment",
    excerpt: "Family support is crucial for recovery. Discover effective ways to be there for someone during their treatment journey.",
    category: "Family Support",
    readTime: "4 min read",
  },
  {
    title: "Choosing Between Inpatient and Outpatient Care",
    excerpt: "Not sure which treatment option is right? We break down the key differences to help you make an informed decision.",
    category: "Treatment Options",
    readTime: "6 min read",
  },
];

const testimonials = [
  {
    name: "Sarah M.",
    location: "California",
    quote: "RehabLookup helped me find the perfect treatment center for my son. The process was easy and the support team was incredibly compassionate.",
    rating: 5,
  },
  {
    name: "Michael T.",
    location: "Texas",
    quote: "After struggling to find help for years, I finally found a facility that changed my life. Forever grateful for this resource.",
    rating: 5,
  },
  {
    name: "Jennifer K.",
    location: "Florida",
    quote: "The verified reviews and transparent information made all the difference. We knew exactly what to expect before making our decision.",
    rating: 5,
  },
];

const treatmentOptions = [
  {
    icon: Pill,
    title: "Drug Addiction",
    description: "Evidence-based programs for substance abuse including opioids, stimulants, and more.",
    link: "/rehab-centers?type=drug",
  },
  {
    icon: Activity,
    title: "Alcohol Treatment",
    description: "Medically supervised detox and long-term recovery programs for alcohol dependence.",
    link: "/rehab-centers?type=alcohol",
  },
  {
    icon: Brain,
    title: "Mental Health",
    description: "Dual diagnosis treatment addressing addiction alongside anxiety, depression, and PTSD.",
    link: "/rehab-centers?type=mental-health",
  },
  {
    icon: Home,
    title: "Residential Rehab",
    description: "24/7 inpatient care in a structured, supportive environment for focused recovery.",
    link: "/rehab-centers?type=residential",
  },
  {
    icon: Stethoscope,
    title: "Outpatient Programs",
    description: "Flexible treatment options that allow you to maintain work and family commitments.",
    link: "/rehab-centers?type=outpatient",
  },
  {
    icon: Sparkles,
    title: "Holistic Therapy",
    description: "Complementary approaches including yoga, meditation, art therapy, and nutrition.",
    link: "/rehab-centers?type=holistic",
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
      {/* Hero Section - Light Background with Image */}
      <section className="relative flex min-h-[70vh] md:min-h-[75vh] lg:min-h-[80vh] overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        
        {/* Light overlay to maintain readability */}
        <div className="absolute inset-0 bg-card/85" />
        
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        </div>

        {/* Content Container */}
        <div className="container relative flex flex-1 flex-col justify-center py-6 md:py-8">
          <div className="mx-auto w-full max-w-4xl text-center">
            {/* Trust Badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 animate-fade-in">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              <span className="text-xs sm:text-sm font-semibold text-accent">
                Trusted by 10,000+ families nationwide
              </span>
            </div>

            {/* Headline */}
            <h1 className="mb-3 font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl animate-fade-in drop-shadow-sm" style={{ animationDelay: "50ms" }}>
              Find the Right Path to{" "}
              <span className="text-primary">Recovery</span>
            </h1>

            {/* Subheadline */}
            <p className="mb-6 text-sm text-foreground/80 sm:text-base md:text-lg animate-fade-in max-w-2xl mx-auto font-medium" style={{ animationDelay: "100ms" }}>
              Search verified addiction treatment centers and take the first step toward a healthier future.
            </p>

            {/* Search Form */}
            <div className="mb-6 animate-fade-in" style={{ animationDelay: "150ms" }}>
              <SearchForm variant="compact-hero" />
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in md:gap-6" style={{ animationDelay: "200ms" }}>
              {trustBadges.map((badge) => (
                <div key={badge.label} className="flex items-center gap-1.5 text-foreground/70 transition-colors hover:text-primary">
                  <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full bg-primary/15">
                    <badge.icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                  </div>
                  <span className="text-xs md:text-sm font-medium">{badge.label}</span>
                </div>
              ))}
            </div>

            {/* Quick Call CTA */}
            <div className="mt-5 animate-fade-in" style={{ animationDelay: "250ms" }}>
              <a href="tel:1-800-555-0199" className="inline-flex items-center gap-2 text-xs sm:text-sm text-foreground/70 hover:text-primary transition-colors">
                <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Need help now? Call <strong className="text-foreground">1-800-555-0199</strong></span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Trust Bar - Enhanced Design */}
      <section className="relative border-y border-border bg-primary py-4 md:py-5">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:gap-x-12 lg:gap-x-16">
            <div className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 transition-colors group-hover:bg-white/15">
                <Shield className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs md:text-sm font-medium text-primary-foreground/90">Licensed & Accredited</span>
            </div>
            <div className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 transition-colors group-hover:bg-white/15">
                <Clock className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs md:text-sm font-medium text-primary-foreground/90">24/7 Confidential Support</span>
            </div>
            <div className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 transition-colors group-hover:bg-white/15">
                <Heart className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs md:text-sm font-medium text-primary-foreground/90">Free Assessment</span>
            </div>
            <div className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 transition-colors group-hover:bg-white/15">
                <CheckCircle className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs md:text-sm font-medium text-primary-foreground/90">Insurance Verified</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Centers */}
      <section className="py-20 md:py-24">
        <div className="container">
          {/* Section Header */}
          <div className="mb-12 flex flex-col items-center text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
              <Star className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Featured Facilities</span>
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
          <div className="mt-12 text-center">
            <Link to="/rehab-centers">
              <Button variant="outline" size="lg" className="gap-2 group border-primary/30 hover:border-primary hover:bg-primary hover:text-primary-foreground">
                View All Centers
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Treatment Options */}
      <section className="py-20 md:py-24 bg-primary">
        <div className="container">
          {/* Section Header */}
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Treatment Programs</span>
            </div>
            <h2 className="mb-3 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Comprehensive Care for Every Need
            </h2>
            <p className="mx-auto max-w-xl text-primary-foreground/70">
              Find specialized treatment programs tailored to your unique situation and recovery goals.
            </p>
          </div>

          {/* Options Grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {treatmentOptions.map((option, index) => (
              <Link
                key={option.title}
                to={option.link}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="relative h-full rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white/15 hover:border-accent/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/10">
                  {/* Decorative glow */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  
                  {/* Icon */}
                  <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/20 transition-all duration-300 group-hover:bg-accent/25 group-hover:ring-accent/40 group-hover:scale-110">
                    <option.icon className="h-7 w-7 text-accent transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  
                  <h3 className="relative mb-2 font-display text-lg font-semibold text-primary-foreground">
                    {option.title}
                  </h3>
                  <p className="relative text-sm text-primary-foreground/70 leading-relaxed">
                    {option.description}
                  </p>
                  
                  {/* Hover arrow */}
                  <div className="relative mt-4 flex items-center gap-1.5 text-sm font-medium text-accent opacity-0 transition-all duration-300 group-hover:opacity-100">
                    <span>Learn more</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Link to="/rehab-centers">
              <Button variant="hero-light" size="lg" className="gap-2 group shadow-lg hover:shadow-xl transition-shadow">
                Explore All Treatment Options
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-24">
        <div className="container">
          {/* Section Header */}
          <div className="mb-14 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Simple Process</span>
            </div>
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Finding the right treatment is simple, confidential, and free.
            </p>
          </div>

          {/* Steps - Horizontal Timeline */}
          <div className="relative max-w-4xl mx-auto">
            {/* Connector line */}
            <div className="absolute top-12 left-0 right-0 hidden h-0.5 bg-gradient-to-r from-transparent via-accent/30 to-transparent md:block" />
            
            <div className="grid gap-8 md:grid-cols-3 md:gap-6">
              {[
                {
                  step: 1,
                  title: "Search",
                  description: "Enter your location to find verified treatment centers near you.",
                  icon: Search,
                },
                {
                  step: 2,
                  title: "Compare",
                  description: "Review programs, insurance options, and facility details.",
                  icon: Users,
                },
                {
                  step: 3,
                  title: "Connect",
                  description: "Contact centers directly or request a callback from our team.",
                  icon: Phone,
                },
              ].map((item, index) => (
                <div
                  key={item.step}
                  className="group relative text-center animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Step circle */}
                  <div className="relative mx-auto mb-6 h-24 w-24">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-accent/20 bg-card shadow-lg transition-all duration-300 group-hover:border-accent/50 group-hover:shadow-xl">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent/10 to-accent/20">
                        <item.icon className="h-7 w-7 text-accent" />
                      </div>
                    </div>
                    {/* Step number badge */}
                    <div className="absolute top-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 text-xs font-bold text-accent-foreground shadow-md ring-2 ring-background">
                      {item.step}
                    </div>
                  </div>
                  
                  <h3 className="mb-2 font-display text-xl font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-12 text-center">
              <Link to="/rehab-centers">
                <Button size="lg" className="gap-2 group">
                  Start Your Search
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 md:py-24 bg-muted/30">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Content */}
            <div className="animate-fade-in">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <Heart className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Why Choose Us</span>
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
                ].map((item, index) => (
                  <li key={item} className="flex items-start gap-3 group animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/25 transition-all group-hover:ring-accent/40">
                      <CheckCircle className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link to="/about">
                  <Button variant="outline" className="gap-2 group border-primary/30 hover:border-primary hover:bg-primary hover:text-primary-foreground">
                    Learn More About Us
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats Card */}
            <div className="relative animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-primary to-primary/90 p-10 shadow-xl">
                <div className="grid gap-8 sm:grid-cols-2">
                  <div className="text-center group">
                    <div className="mb-2 font-display text-4xl font-bold text-accent md:text-5xl transition-transform group-hover:scale-105">10K+</div>
                    <p className="text-sm text-primary-foreground/70">Families Helped</p>
                  </div>
                  <div className="text-center group">
                    <div className="mb-2 font-display text-4xl font-bold text-accent md:text-5xl transition-transform group-hover:scale-105">500+</div>
                    <p className="text-sm text-primary-foreground/70">Verified Centers</p>
                  </div>
                  <div className="text-center group">
                    <div className="mb-2 font-display text-4xl font-bold text-accent md:text-5xl transition-transform group-hover:scale-105">50</div>
                    <p className="text-sm text-primary-foreground/70">States Covered</p>
                  </div>
                  <div className="text-center group">
                    <div className="mb-2 font-display text-4xl font-bold text-primary-foreground md:text-5xl transition-transform group-hover:scale-105">24/7</div>
                    <p className="text-sm text-primary-foreground/70">Support Available</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-24 bg-gradient-to-b from-background to-muted/20">
        <div className="container">
          {/* Section Header */}
          <div className="mb-14 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
              <Quote className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Testimonials</span>
            </div>
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              Stories of Hope and Recovery
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Real families share their experiences finding treatment through RehabLookup.
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.name}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative h-full rounded-2xl border border-border bg-card p-8 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 hover:border-accent/30">
                  {/* Large decorative quote */}
                  <div className="absolute -top-4 left-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 shadow-lg ring-4 ring-background">
                      <Quote className="h-5 w-5 text-accent-foreground" />
                    </div>
                  </div>
                  
                  {/* Rating */}
                  <div className="mt-4 mb-5 flex gap-0.5">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-accent text-accent" />
                    ))}
                  </div>
                  
                  {/* Quote */}
                  <blockquote className="mb-6">
                    <p className="text-foreground leading-relaxed italic">
                      "{testimonial.quote}"
                    </p>
                  </blockquote>
                  
                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 md:py-24 bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            {/* Section Header */}
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <CheckCircle className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">FAQ</span>
              </div>
              <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground">
                Get answers to common questions about addiction treatment and recovery.
              </p>
            </div>

            {/* FAQ Accordion */}
            <Accordion type="single" collapsible className="space-y-3">
              <AccordionItem value="item-1" className="rounded-xl border border-border bg-card px-6 shadow-card hover:border-accent/30 transition-colors">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  How do I know if I or my loved one needs rehab?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  Signs that treatment may be needed include inability to control substance use, 
                  withdrawal symptoms when not using, neglecting responsibilities, and continued use 
                  despite negative consequences. If substance use is affecting health, relationships, 
                  or daily life, it may be time to seek professional help.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="rounded-xl border border-border bg-card px-6 shadow-card hover:border-accent/30 transition-colors">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  What is the difference between inpatient and outpatient treatment?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  Inpatient (residential) treatment requires living at the facility 24/7 and provides 
                  intensive, structured care. Outpatient treatment allows you to live at home while 
                  attending scheduled therapy sessions. The best option depends on the severity of 
                  addiction, support system, and personal circumstances.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="rounded-xl border border-border bg-card px-6 shadow-card hover:border-accent/30 transition-colors">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  Does insurance cover addiction treatment?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  Most health insurance plans cover some form of addiction treatment under mental health 
                  benefits. Coverage varies by provider and plan. Many treatment centers offer insurance 
                  verification and can help you understand your benefits. Some facilities also offer 
                  sliding scale fees or payment plans.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="rounded-xl border border-border bg-card px-6 shadow-card hover:border-accent/30 transition-colors">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  How long does rehab typically last?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  Treatment duration varies based on individual needs. Short-term programs typically last 
                  28-30 days, while long-term programs can be 60-90 days or longer. Research shows that 
                  longer treatment periods often lead to better outcomes. Your treatment team will help 
                  determine the appropriate length of stay.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="rounded-xl border border-border bg-card px-6 shadow-card hover:border-accent/30 transition-colors">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  What happens after completing a treatment program?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  Aftercare is a crucial part of long-term recovery. This may include ongoing therapy, 
                  support groups like AA or NA, sober living arrangements, and regular check-ins with 
                  counselors. Most treatment centers help create a comprehensive aftercare plan before 
                  discharge to support continued sobriety.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-12 text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              Ready to Take the First Step?
            </h2>
            <p className="mb-8 text-muted-foreground max-w-xl mx-auto">
              Recovery is possible. Find the right treatment center for you or your loved one today.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/rehab-centers">
                <Button size="lg" className="gap-2 min-w-[200px]">
                  Find Rehab Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="tel:1-800-555-0199">
                <Button variant="outline" size="lg" className="gap-2 min-w-[200px]">
                  <Phone className="h-4 w-4" />
                  Call 1-800-555-0199
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Resources / Blog Section */}
      <section className="py-20 md:py-24">
        <div className="container">
          {/* Section Header */}
          <div className="mb-12 flex flex-col items-center text-center md:flex-row md:items-end md:justify-between md:text-left">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <BookOpen className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Resources</span>
              </div>
              <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
                Resources & Guides
              </h2>
              <p className="max-w-xl text-muted-foreground">
                Helpful articles to guide you through the recovery journey.
              </p>
            </div>
            <Link to="/resources" className="mt-4 md:mt-0">
              <Button variant="outline" className="gap-2 group border-primary/30 hover:border-primary hover:bg-primary hover:text-primary-foreground">
                View All Articles
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          {/* Articles Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {blogArticles.map((article, index) => (
              <article
                key={article.title}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 hover:border-accent/30">
                  {/* Category & Read Time */}
                  <div className="mb-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                      <BookOpen className="h-3 w-3" />
                      {article.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {article.readTime}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <h3 className="mb-3 font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  
                  {/* Excerpt */}
                  <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                    {article.excerpt}
                  </p>
                  
                  {/* Read More Link */}
                  <div className="flex items-center gap-1 text-sm font-medium text-accent">
                    Read article
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
