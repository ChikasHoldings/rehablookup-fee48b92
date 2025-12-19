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
  ArrowRight,
  Star,
  Pill,
  Brain,
  Home,
  Activity,
  Stethoscope,
  Sparkles,
  Quote,
  BookOpen,
  Calendar,
  CheckCircle,
  Search,
  Users,
  Phone,
  Heart,
  MapPin,
  Clock,
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


const Index = () => {
  const { data: approvedFacilities = [], isLoading: isFacilitiesLoading } = useApprovedFacilities();
  
  // Get homepage featured centers (max 6, with rotation from backend)
  const featuredCenters = useMemo(() => {
    // Get facilities that are designated for homepage display (isHomepageFeatured from rotation)
    const homepageFeatured = approvedFacilities
      .filter((f: any) => f.isHomepageFeatured || f.hasFeaturedSubscription)
      .slice(0, 6);
    
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
    
    // Track impression for each featured facility
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
      
      {/* Hero Section - Rehabs.com Style */}
      <section className="relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />

        {/* Content */}
        <div className="container relative py-16 md:py-20 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            {/* Headline */}
            <h1 className="mb-4 font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.5rem] animate-fade-in">
              Find Drug & Alcohol Rehab Options
            </h1>

            {/* Subheadline */}
            <p className="mb-8 md:mb-10 text-base md:text-lg text-white/85 animate-fade-in max-w-2xl mx-auto" style={{ animationDelay: "50ms" }}>
              Find and compare addiction treatment facilities across the United States.
            </p>

            {/* Search Form - Directory Style */}
            <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
              <SearchForm variant="directory" />
            </div>

            {/* Provider CTA */}
            <div className="mt-6 animate-fade-in" style={{ animationDelay: "150ms" }}>
              <Link 
                to="/for-providers" 
                className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white underline underline-offset-4 transition-colors"
              >
                Get Listed On Our Site
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Insurance Coverage Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* Left Content */}
            <div className="lg:max-w-md">
              <span className="mb-2 inline-block text-xs font-bold uppercase tracking-wider text-primary">
                Insurance Coverage
              </span>
              <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl">
                Are You Covered For Treatment?
              </h2>
              <p className="mb-6 text-muted-foreground">
                Check to see if your insurance is covered for addiction treatment.
              </p>
              <Link to="/request-help">
                <Button size="lg" className="gap-2 font-semibold">
                  Check Your Coverage
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Insurance Logos - Horizontal scroll on mobile, grid on desktop */}
            <div className="flex-1 lg:max-w-2xl">
              {/* Mobile: Horizontal scroll carousel */}
              <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0 md:grid-cols-6">
                  {/* Aetna - has logo */}
                  <div className="flex h-14 min-w-[100px] shrink-0 snap-start items-center justify-center rounded-lg border border-border bg-card px-3 py-2 transition-all hover:border-primary/30 hover:shadow-md sm:min-w-0 sm:shrink md:h-16">
                    <img src="/insurance-logos/aetna.svg" alt="Aetna" className="h-6 md:h-7 w-auto object-contain" />
                  </div>
                  {/* Anthem - styled text */}
                  <div className="flex h-14 min-w-[100px] shrink-0 snap-start items-center justify-center rounded-lg border border-border bg-card px-3 py-2 transition-all hover:border-primary/30 hover:shadow-md sm:min-w-0 sm:shrink md:h-16">
                    <span className="text-sm md:text-base font-bold text-[#0891B2]">Anthem</span>
                  </div>
                  {/* BCBS - has logo */}
                  <div className="flex h-14 min-w-[100px] shrink-0 snap-start items-center justify-center rounded-lg border border-border bg-card px-3 py-2 transition-all hover:border-primary/30 hover:shadow-md sm:min-w-0 sm:shrink md:h-16">
                    <img src="/insurance-logos/bcbs.svg" alt="Blue Cross Blue Shield" className="h-8 md:h-10 w-auto object-contain" />
                  </div>
                  {/* Cigna - has logo */}
                  <div className="flex h-14 min-w-[100px] shrink-0 snap-start items-center justify-center rounded-lg border border-border bg-card px-3 py-2 transition-all hover:border-primary/30 hover:shadow-md sm:min-w-0 sm:shrink md:h-16">
                    <img src="/insurance-logos/cigna.svg" alt="Cigna" className="h-5 md:h-6 w-auto object-contain" />
                  </div>
                  {/* Humana - styled text */}
                  <div className="flex h-14 min-w-[100px] shrink-0 snap-start items-center justify-center rounded-lg border border-border bg-card px-3 py-2 transition-all hover:border-primary/30 hover:shadow-md sm:min-w-0 sm:shrink md:h-16">
                    <span className="text-sm md:text-base font-bold text-[#84CC16]">Humana</span>
                  </div>
                  {/* Kaiser - has logo */}
                  <div className="flex h-14 min-w-[100px] shrink-0 snap-start items-center justify-center rounded-lg border border-border bg-card px-3 py-2 transition-all hover:border-primary/30 hover:shadow-md sm:min-w-0 sm:shrink md:h-16">
                    <img src="/insurance-logos/kaiser.svg" alt="Kaiser Permanente" className="h-6 md:h-7 w-auto object-contain" />
                  </div>
                  {/* Medicare - styled text */}
                  <div className="flex h-14 min-w-[100px] shrink-0 snap-start items-center justify-center rounded-lg border border-border bg-card px-3 py-2 transition-all hover:border-primary/30 hover:shadow-md sm:min-w-0 sm:shrink md:h-16">
                    <span className="text-sm md:text-base font-bold text-[#DC2626]">Medicare</span>
                  </div>
                  {/* Medicaid - styled text */}
                  <div className="flex h-14 min-w-[100px] shrink-0 snap-start items-center justify-center rounded-lg border border-border bg-card px-3 py-2 transition-all hover:border-primary/30 hover:shadow-md sm:min-w-0 sm:shrink md:h-16">
                    <span className="text-sm md:text-base font-bold text-[#2563EB]">Medicaid</span>
                  </div>
                  {/* United - has logo */}
                  <div className="flex h-14 min-w-[100px] shrink-0 snap-start items-center justify-center rounded-lg border border-border bg-card px-3 py-2 transition-all hover:border-primary/30 hover:shadow-md sm:min-w-0 sm:shrink md:h-16">
                    <img src="/insurance-logos/united.svg" alt="UnitedHealthcare" className="h-6 md:h-7 w-auto object-contain" />
                  </div>
                  {/* Tricare - styled text */}
                  <div className="flex h-14 min-w-[100px] shrink-0 snap-start items-center justify-center rounded-lg border border-border bg-card px-3 py-2 transition-all hover:border-primary/30 hover:shadow-md sm:min-w-0 sm:shrink md:h-16">
                    <span className="text-sm md:text-base font-bold text-[#0D9488]">TRICARE</span>
                  </div>
                  {/* Magellan - styled text */}
                  <div className="flex h-14 min-w-[100px] shrink-0 snap-start items-center justify-center rounded-lg border border-border bg-card px-3 py-2 transition-all hover:border-primary/30 hover:shadow-md sm:min-w-0 sm:shrink md:h-16">
                    <span className="text-sm md:text-base font-bold text-[#7C3AED]">Magellan</span>
                  </div>
                  {/* More indicator */}
                  <div className="flex h-14 min-w-[100px] shrink-0 snap-start items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 transition-all hover:border-primary/30 sm:min-w-0 sm:shrink md:h-16">
                    <span className="text-xs md:text-sm font-medium text-muted-foreground">+ More</span>
                  </div>
                </div>
                {/* Scroll hint for mobile */}
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground sm:hidden">
                  <span>Swipe to see more</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Centers */}
      <section className="section-padding-lg">
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

          {/* Cards Grid - Up to 6 featured centers */}
          {isFacilitiesLoading ? (
            <FeaturedCentersLoading />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
          )}

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
      <section className="section-padding-lg bg-primary">
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
                className="group animate-fade-in opacity-0"
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
              >
                <div className="relative h-full rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-500 hover:bg-white/15 hover:border-accent/50 hover:-translate-y-2 hover:shadow-2xl hover:shadow-accent/20">
                  {/* Decorative glow - enhanced */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/10 via-transparent to-primary/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  
                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                  </div>
                  
                  {/* Icon - Enhanced with pulse and rotate on hover */}
                  <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 ring-1 ring-accent/30 transition-all duration-500 group-hover:ring-accent/60 group-hover:shadow-lg group-hover:shadow-accent/30 group-hover:scale-110 group-hover:rotate-3">
                    <option.icon className="h-8 w-8 text-accent transition-all duration-500 group-hover:scale-110" />
                    {/* Icon glow */}
                    <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-60" />
                  </div>
                  
                  <h3 className="relative mb-2 font-display text-lg font-semibold text-primary-foreground transition-colors duration-300 group-hover:text-accent">
                    {option.title}
                  </h3>
                  <p className="relative text-sm text-primary-foreground/70 leading-relaxed">
                    {option.description}
                  </p>
                  
                  {/* Hover arrow - Enhanced */}
                  <div className="relative mt-5 flex items-center gap-2 text-sm font-medium text-accent translate-y-2 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                    <span>Explore options</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                  
                  {/* Corner accent */}
                  <div className="absolute bottom-0 right-0 h-24 w-24 rounded-tl-full bg-gradient-to-tl from-accent/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
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
      <section className="section-padding-lg">
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

          {/* Steps - Enhanced Horizontal Timeline */}
          <div className="relative max-w-4xl mx-auto">
            {/* Animated connector line */}
            <div className="absolute top-12 left-[16.67%] right-[16.67%] hidden md:block">
              <div className="h-0.5 bg-border" />
              <div className="absolute inset-0 h-0.5 bg-gradient-to-r from-accent via-primary to-accent animate-pulse" style={{ opacity: 0.5 }} />
            </div>
            
            <div className="grid gap-10 md:grid-cols-3 md:gap-8">
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
                  className="group relative text-center animate-fade-in opacity-0"
                  style={{ animationDelay: `${200 + index * 200}ms`, animationFillMode: 'forwards' }}
                >
                  {/* Step circle - Enhanced */}
                  <div className="relative mx-auto mb-6 h-24 w-24">
                    {/* Outer ring with pulse */}
                    <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" style={{ animationDuration: '3s', animationDelay: `${index * 0.5}s` }} />
                    
                    {/* Main circle */}
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-accent/30 bg-card shadow-lg transition-all duration-500 group-hover:border-accent group-hover:shadow-xl group-hover:shadow-accent/20 group-hover:scale-105">
                      {/* Inner gradient circle */}
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent/15 to-primary/10 transition-all duration-500 group-hover:from-accent/25 group-hover:to-primary/20">
                        <item.icon className="h-7 w-7 text-accent transition-transform duration-500 group-hover:scale-110" />
                      </div>
                    </div>
                    
                    {/* Step number badge - Enhanced */}
                    <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary text-sm font-bold text-accent-foreground shadow-lg ring-4 ring-background transition-transform duration-300 group-hover:scale-110">
                      {item.step}
                    </div>
                  </div>
                  
                  {/* Arrow connector (visible on desktop between items) */}
                  {index < 2 && (
                    <div className="absolute top-10 -right-4 hidden md:flex items-center text-accent/40 group-hover:text-accent transition-colors duration-300">
                      <ArrowRight className="h-6 w-6" />
                    </div>
                  )}
                  
                  <h3 className="mb-2 font-display text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    {item.description}
                  </p>
                  
                  {/* Hover indicator line */}
                  <div className="mt-4 mx-auto h-1 w-0 rounded-full bg-gradient-to-r from-accent to-primary transition-all duration-500 group-hover:w-16" />
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-14 text-center">
              <Link to="/rehab-centers">
                <Button size="lg" className="gap-2 group shadow-lg hover:shadow-xl transition-all duration-300">
                  Start Your Search
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding-lg bg-muted/30 overflow-hidden">
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
      <section className="section-padding-lg bg-gradient-to-b from-background via-muted/30 to-background overflow-hidden">
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

          {/* Testimonials Grid - Enhanced */}
          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.name}
                className="group animate-fade-in opacity-0"
                style={{ animationDelay: `${200 + index * 150}ms`, animationFillMode: 'forwards' }}
              >
                <div className="relative h-full rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/30 p-8 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:border-accent/40">
                  {/* Background glow on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 via-transparent to-primary/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  
                  {/* Large decorative quote - Enhanced */}
                  <div className="absolute -top-5 left-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-primary shadow-xl shadow-accent/30 ring-4 ring-background transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                      <Quote className="h-6 w-6 text-accent-foreground" />
                    </div>
                  </div>
                  
                  {/* Rating - Animated stars */}
                  <div className="relative mt-5 mb-5 flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star 
                        key={i} 
                        className="h-5 w-5 fill-accent text-accent transition-all duration-300 hover:scale-125"
                        style={{ 
                          animationDelay: `${400 + index * 150 + i * 100}ms`,
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Quote - Enhanced typography */}
                  <blockquote className="relative mb-6">
                    <p className="text-foreground leading-relaxed text-[15px]">
                      <span className="text-accent/60 text-xl leading-none">"</span>
                      {testimonial.quote}
                      <span className="text-accent/60 text-xl leading-none">"</span>
                    </p>
                  </blockquote>
                  
                  {/* Author - Enhanced */}
                  <div className="relative flex items-center gap-4 pt-5 border-t border-border/50">
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-base font-bold text-primary ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-primary/40">
                        {testimonial.name.charAt(0)}
                      </div>
                      {/* Online indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {testimonial.location}
                      </p>
                    </div>
                  </div>
                  
                  {/* Decorative corner accent */}
                  <div className="absolute bottom-0 right-0 h-20 w-20 rounded-tl-3xl bg-gradient-to-tl from-accent/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources / Blog Section */}
      <section className="section-padding-lg bg-muted/30">
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
                Expert articles to guide you through the recovery journey with practical advice and support.
              </p>
            </div>
            <Link to="/resources" className="mt-6 md:mt-0">
              <Button variant="outline" className="gap-2 group border-primary/30 hover:border-primary hover:bg-primary hover:text-primary-foreground">
                View All Articles
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          {/* Articles Grid */}
          <div className="grid gap-6 md:gap-8 md:grid-cols-3">
            {blogArticles.map((article, index) => (
              <Link
                key={article.id}
                to={`/resources/${article.id}`}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <article className="h-full rounded-2xl border border-border bg-card shadow-card overflow-hidden transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 hover:border-accent/30">
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
                    {/* Category Badge */}
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                      <BookOpen className="h-3 w-3 text-accent" />
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
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="section-padding-lg">
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
