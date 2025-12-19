import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { SearchForm } from "@/components/search/SearchForm";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { Button } from "@/components/ui/button";
import { treatmentCenters } from "@/data/treatmentCenters";
import { useApprovedFacilities } from "@/hooks/useApprovedFacilities";
import { FeaturedCentersLoading } from "@/components/skeletons/FeaturedCenterSkeleton";
import { supabase } from "@/integrations/supabase/client";
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
  Search,
  MapPin
} from "lucide-react";

const blogArticles = [
  {
    id: "stages-of-recovery",
    title: "Understanding the Stages of Addiction Recovery",
    excerpt: "Recovery is a journey with distinct stages. Learn what to expect and how to navigate each phase successfully.",
    category: "Recovery",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop",
    author: "Dr. Sarah Mitchell",
  },
  {
    id: "support-loved-one",
    title: "How to Support a Loved One in Treatment",
    excerpt: "Family support is crucial for recovery. Discover effective ways to be there for someone during their treatment journey.",
    category: "Family Support",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop",
    author: "Jennifer Walsh, LCSW",
  },
  {
    id: "inpatient-vs-outpatient",
    title: "Choosing Between Inpatient and Outpatient Care",
    excerpt: "Not sure which treatment option is right? We break down the key differences to help you make an informed decision.",
    category: "Treatment Options",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop",
    author: "Dr. Michael Chen",
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
  const { data: approvedFacilities = [], isLoading: isFacilitiesLoading } = useApprovedFacilities();
  
  // Get homepage featured centers (max 6, with rotation from backend)
  const featuredCenters = useMemo(() => {
    const homepageFeatured = approvedFacilities
      .filter((f: any) => f.isHomepageFeatured || f.hasFeaturedSubscription)
      .slice(0, 6);
    
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
    
    const combined = [...homepageFeatured];
    const remainingSlots = 6 - combined.length;
    
    if (remainingSlots > 0) {
      combined.push(...staticFeatured.slice(0, remainingSlots));
    }
    
    return combined.slice(0, 6);
  }, [approvedFacilities]);

  // Track impressions for featured facilities (once per session)
  const hasTrackedImpressions = useRef(false);
  
  const trackFeaturedImpressions = useCallback(async () => {
    if (hasTrackedImpressions.current) return;
    
    const featuredDbFacilities = featuredCenters.filter(
      (c: any) => c.isFromDatabase && c.hasFeaturedSubscription && c.id
    );
    
    if (featuredDbFacilities.length === 0) return;
    
    hasTrackedImpressions.current = true;
    
    for (const facility of featuredDbFacilities) {
      try {
        await supabase.functions.invoke("track-featured-analytics", {
          body: { facility_id: facility.id, event_type: "impression" }
        });
      } catch (error) {
        console.error("Failed to track impression:", error);
      }
    }
  }, [featuredCenters]);

  useEffect(() => {
    if (featuredCenters.length > 0) {
      trackFeaturedImpressions();
    }
  }, [featuredCenters, trackFeaturedImpressions]);

  return (
    <Layout>
      <SEO
        title="Find Addiction Treatment Centers Near You | RehabLookup"
        description="Search verified addiction treatment centers and find the right path to recovery. Compare rehab facilities, check insurance coverage, and get help today. 24/7 support available."
        canonical="/"
      />

      {/* Hero Section - Full bleed image with overlay */}
      <section className="relative min-h-[520px] md:min-h-[580px] lg:min-h-[620px] flex items-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-foreground/60" />

        {/* Content */}
        <div className="container relative z-10 py-16 md:py-20 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            {/* Headline */}
            <h1 className="mb-4 font-display text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl lg:text-[3.5rem]">
              Find the Right Path to Recovery
            </h1>

            {/* Subheadline */}
            <p className="mb-8 text-base text-white/90 md:text-lg lg:text-xl max-w-2xl mx-auto">
              Search verified treatment centers and take the first step toward a healthier future.
            </p>

            {/* Search Form */}
            <div className="mb-8">
              <SearchForm variant="compact-hero" />
            </div>

            {/* Provider Link */}
            <p className="text-sm text-white/70">
              <Link to="/for-providers" className="underline hover:text-white">
                Get Listed On Our Site
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:gap-x-12 lg:gap-x-16">
            {trustBadges.map((badge) => (
              <div 
                key={badge.label} 
                className="flex items-center gap-2 text-muted-foreground"
              >
                <badge.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Centers */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="container">
          {/* Section Header */}
          <div className="mb-10 md:mb-12 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
              Featured Facilities
            </p>
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              Top-Rated Treatment Centers
            </h2>
            <p className="max-w-2xl mx-auto text-muted-foreground">
              Hand-selected facilities known for exceptional care, verified outcomes, and compassionate treatment.
            </p>
          </div>

          {/* Cards Grid */}
          {isFacilitiesLoading ? (
            <FeaturedCentersLoading />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCenters.map((center) => (
                <TreatmentCenterCard key={center.id} center={center} featured />
              ))}
            </div>
          )}

          {/* View All Link */}
          <div className="mt-10 md:mt-12 text-center">
            <Link to="/rehab-centers">
              <Button variant="outline" size="lg" className="gap-2">
                View All Centers
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Treatment Options */}
      <section className="py-16 md:py-20 lg:py-24 bg-primary">
        <div className="container">
          {/* Section Header */}
          <div className="mb-10 md:mb-12 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">
              Treatment Programs
            </p>
            <h2 className="mb-3 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Comprehensive Care for Every Need
            </h2>
            <p className="mx-auto max-w-2xl text-primary-foreground/80">
              Find specialized treatment programs tailored to your unique situation and recovery goals.
            </p>
          </div>

          {/* Options Grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {treatmentOptions.map((option) => (
              <Link
                key={option.title}
                to={option.link}
                className="group"
              >
                <div className="h-full rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
                  {/* Icon */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                    <option.icon className="h-6 w-6 text-accent" />
                  </div>
                  
                  <h3 className="mb-2 font-display text-lg font-semibold text-primary-foreground">
                    {option.title}
                  </h3>
                  <p className="text-sm text-primary-foreground/70 leading-relaxed">
                    {option.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 md:mt-12 text-center">
            <Link to="/rehab-centers">
              <Button variant="secondary" size="lg" className="gap-2">
                Explore All Treatment Options
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="container">
          {/* Section Header */}
          <div className="mb-12 md:mb-14 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
              Simple Process
            </p>
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Finding the right treatment is simple, confidential, and free.
            </p>
          </div>

          {/* Steps */}
          <div className="max-w-4xl mx-auto">
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
              ].map((item) => (
                <div key={item.step} className="text-center">
                  {/* Step circle */}
                  <div className="relative mx-auto mb-5 h-20 w-20">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-border bg-card">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    {/* Step number badge */}
                    <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
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
                <Button size="lg" className="gap-2">
                  Start Your Search
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-20 lg:py-24 bg-muted/40">
        <div className="container">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Content */}
            <div className="order-2 lg:order-1">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
                Why Choose Us
              </p>
              <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
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
                  <li key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link to="/about">
                  <Button variant="outline" className="gap-2">
                    Learn More About Us
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Image with Stats */}
            <div className="relative order-1 lg:order-2">
              <div className="relative overflow-hidden rounded-xl">
                <img 
                  src={whyChooseUsImage} 
                  alt="Healthcare professional consulting with a family about treatment options"
                  className="w-full aspect-[4/3] object-cover"
                />
                
                {/* Stats Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-primary/95 p-4 sm:p-5">
                  <div className="grid grid-cols-4 gap-2 sm:gap-4">
                    {[
                      { value: "10K+", label: "Families" },
                      { value: "500+", label: "Centers" },
                      { value: "50", label: "States" },
                      { value: "24/7", label: "Support" },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <div className="font-display text-lg sm:text-xl md:text-2xl font-bold text-accent">
                          {stat.value}
                        </div>
                        <p className="text-[10px] sm:text-xs text-primary-foreground/80">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="container">
          {/* Section Header */}
          <div className="mb-12 md:mb-14 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
              Testimonials
            </p>
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              Stories of Hope and Recovery
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Real families share their experiences finding treatment through RehabLookup.
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="rounded-xl border border-border bg-card p-6 md:p-8"
              >
                {/* Quote icon */}
                <div className="mb-4">
                  <Quote className="h-8 w-8 text-primary/20" />
                </div>
                
                {/* Rating */}
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                
                {/* Quote */}
                <blockquote className="mb-6">
                  <p className="text-foreground leading-relaxed">
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
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources / Blog Section */}
      <section className="py-16 md:py-20 lg:py-24 bg-muted/40">
        <div className="container">
          {/* Section Header */}
          <div className="mb-10 md:mb-12 flex flex-col items-center text-center md:flex-row md:items-end md:justify-between md:text-left">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
                Resources
              </p>
              <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
                Resources & Guides
              </h2>
              <p className="max-w-xl text-muted-foreground">
                Expert articles to guide you through the recovery journey with practical advice and support.
              </p>
            </div>
            <Link to="/resources" className="mt-6 md:mt-0">
              <Button variant="outline" className="gap-2">
                View All Articles
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Articles Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {blogArticles.map((article) => (
              <Link
                key={article.id}
                to={`/resources/${article.id}`}
                className="group"
              >
                <article className="h-full rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {/* Category Badge */}
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-foreground">
                      <BookOpen className="h-3 w-3 text-primary" />
                      {article.category}
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="p-5 md:p-6">
                    {/* Meta */}
                    <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {article.readTime}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                      <span>{article.author}</span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="mb-3 font-display text-lg font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    
                    {/* Excerpt */}
                    <p className="mb-4 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {article.excerpt}
                    </p>
                    
                    {/* Read More Link */}
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                      Read article
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-8 md:p-12 text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">
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
              <Link to="/request-help?source=cta_bottom">
                <Button variant="outline" size="lg" className="gap-2 min-w-[200px]">
                  <Heart className="h-4 w-4" />
                  Request Help
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
