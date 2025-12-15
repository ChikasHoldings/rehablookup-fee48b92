import { useRef, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { SearchForm } from "@/components/search/SearchForm";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { Button } from "@/components/ui/button";
import { treatmentCenters } from "@/data/treatmentCenters";
import { useApprovedFacilities } from "@/hooks/useApprovedFacilities";
import heroImage from "@/assets/hero-recovery.jpg";
import whyChooseUsImage from "@/assets/why-choose-us.jpg";
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
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop",
  },
  {
    title: "How to Support a Loved One in Treatment",
    excerpt: "Family support is crucial for recovery. Discover effective ways to be there for someone during their treatment journey.",
    category: "Family Support",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop",
  },
  {
    title: "Choosing Between Inpatient and Outpatient Care",
    excerpt: "Not sure which treatment option is right? We break down the key differences to help you make an informed decision.",
    category: "Treatment Options",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop",
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
  const { data: approvedFacilities = [] } = useApprovedFacilities();
  
  // Combine static featured centers with Featured subscription facilities
  const featuredCenters = useMemo(() => {
    // Get facilities with Featured subscription (from database)
    const featuredSubscriptionFacilities = approvedFacilities
      .filter((f) => f.hasFeaturedSubscription)
      .slice(0, 3);
    
    // Get static featured centers as fallback (add missing properties for type compatibility)
    const staticFeatured = treatmentCenters
      .filter((c) => c.featured)
      .map((c) => ({
        ...c,
        slug: null,
        isFromDatabase: false,
        logo_url: null,
        gallery_urls: null,
        hasFeaturedSubscription: false,
      }));
    
    // Combine: prioritize Featured subscription holders, fill remaining slots with static
    const combined = [...featuredSubscriptionFacilities];
    const remainingSlots = 3 - combined.length;
    
    if (remainingSlots > 0) {
      combined.push(...staticFeatured.slice(0, remainingSlots));
    }
    
    return combined.slice(0, 3);
  }, [approvedFacilities]);
  
  // Parallax effect for Why Choose Us image
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!parallaxRef.current) return;
      
      const rect = parallaxRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate how far the element is from the center of the viewport
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = windowHeight / 2;
      const distance = elementCenter - viewportCenter;
      
      // Only apply parallax when element is in view
      if (rect.top < windowHeight && rect.bottom > 0) {
        // Subtle parallax: move image slightly opposite to scroll direction
        const offset = distance * 0.08;
        setParallaxOffset(offset);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Layout>
      <SEO
        title="Find Addiction Treatment Centers Near You | RehabLookup"
        description="Search verified addiction treatment centers and find the right path to recovery. Compare rehab facilities, check insurance coverage, and get help today. 24/7 support available."
        canonical="/"
      />
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
            <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl lg:text-3xl">
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
            <h2 className="mb-3 font-display text-xl font-bold text-primary-foreground md:text-2xl lg:text-3xl">
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
            <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl lg:text-3xl">
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
                  
                  <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
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
      <section className="py-20 md:py-24 bg-muted/30 overflow-hidden">
        <div className="container">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-20">
            {/* Content */}
            <div className="animate-fade-in order-2 lg:order-1">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <Heart className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Why Choose Us</span>
              </div>
              <h2 className="mb-5 font-display text-xl font-bold text-foreground md:text-2xl lg:text-3xl">
                Trusted by Families Across America
              </h2>
              <p className="mb-8 text-muted-foreground leading-relaxed max-w-lg">
                We understand that finding addiction treatment is one of the most important decisions 
                your family will make. That's why we're committed to transparency, accuracy, and compassion.
              </p>

              <ul className="space-y-3">
                {[
                  "Every facility verified for licensing & accreditation",
                  "Transparent program and cost information",
                  "No hidden fees or surprise referrals",
                  "Confidential, secure communication",
                  "24/7 support for urgent situations",
                ].map((item, index) => (
                  <li key={item} className="flex items-start gap-3 group animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/25 transition-all group-hover:ring-accent/40 group-hover:bg-accent/25">
                      <CheckCircle className="h-3 w-3 text-accent" />
                    </div>
                    <span className="text-foreground text-sm md:text-base">{item}</span>
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

            {/* Image with Stats Overlay + Parallax */}
            <div ref={parallaxRef} className="relative animate-fade-in order-1 lg:order-2" style={{ animationDelay: "0.1s" }}>
              {/* Decorative background element */}
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent rounded-3xl blur-2xl opacity-60" />
              
              <div className="relative">
                {/* Main image container with parallax */}
                <div className="relative overflow-hidden rounded-2xl shadow-elevated ring-1 ring-border/50">
                  <div 
                    className="w-full aspect-[4/3] overflow-hidden"
                    style={{ transform: `translateY(${parallaxOffset}px)` }}
                  >
                    <img 
                      src={whyChooseUsImage} 
                      alt="Healthcare professional consulting with a family about treatment options"
                      className="w-full h-[120%] object-cover transition-transform duration-100 ease-out"
                      style={{ transform: `translateY(-10%)` }}
                    />
                  </div>
                  
                  {/* Subtle overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
                  
                  {/* Stats Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <div className="grid grid-cols-4 gap-2 sm:gap-4">
                      {[
                        { value: "10K+", label: "Families", accent: true },
                        { value: "500+", label: "Centers", accent: true },
                        { value: "50", label: "States", accent: true },
                        { value: "24/7", label: "Support", accent: false },
                      ].map((stat, index) => (
                        <div key={stat.label} className="text-center group" style={{ animationDelay: `${index * 50}ms` }}>
                          <div className={`font-display text-lg sm:text-xl md:text-2xl font-bold transition-transform group-hover:scale-110 ${stat.accent ? 'text-accent' : 'text-primary-foreground'}`}>
                            {stat.value}
                          </div>
                          <p className="text-[10px] sm:text-xs text-primary-foreground/80 font-medium">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Decorative accent corner */}
                <div className="absolute -bottom-3 -right-3 h-24 w-24 rounded-2xl bg-accent/20 -z-10" />
                <div className="absolute -top-3 -left-3 h-16 w-16 rounded-xl bg-primary/10 -z-10" />
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
            <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl lg:text-3xl">
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
              <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl lg:text-3xl">
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
          <div className="grid gap-8 md:grid-cols-3">
            {blogArticles.map((article, index) => (
              <article
                key={article.title}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-full rounded-2xl border border-border bg-card shadow-card overflow-hidden transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 hover:border-accent/30">
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {/* Category Badge */}
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-medium text-foreground shadow-sm">
                      <BookOpen className="h-3 w-3 text-accent" />
                      {article.category}
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="p-5">
                    {/* Read Time */}
                    <div className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {article.readTime}
                    </div>
                    
                    {/* Title */}
                    <h3 className="mb-2 font-display text-lg font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    
                    {/* Excerpt */}
                    <p className="mb-4 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {article.excerpt}
                    </p>
                    
                    {/* Read More Link */}
                    <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                      Read article
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-12 text-center">
            <h2 className="mb-4 font-display text-xl font-bold text-foreground md:text-2xl lg:text-3xl">
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
    </Layout>
  );
};

export default Index;
