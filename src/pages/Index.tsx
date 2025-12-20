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
  Clock,
  MapPin,
  Navigation,
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
    link: "/treatment-types/drug-addiction",
  },
  {
    icon: Activity,
    title: "Alcohol Treatment",
    description: "Medically supervised detox and long-term recovery programs for alcohol dependence.",
    link: "/treatment-types/alcohol-rehabilitation",
  },
  {
    icon: Brain,
    title: "Mental Health",
    description: "Dual diagnosis treatment addressing addiction alongside anxiety, depression, and PTSD.",
    link: "/treatment-types/dual-diagnosis",
  },
  {
    icon: Home,
    title: "Residential Rehab",
    description: "24/7 inpatient care in a structured, supportive environment for focused recovery.",
    link: "/treatment-types/residential-inpatient",
  },
  {
    icon: Stethoscope,
    title: "Outpatient Programs",
    description: "Flexible treatment options that allow you to maintain work and family commitments.",
    link: "/treatment-types/outpatient-programs",
  },
  {
    icon: Sparkles,
    title: "Holistic Therapy",
    description: "Complementary approaches including yoga, meditation, art therapy, and nutrition.",
    link: "/treatment-types/holistic-therapy",
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
        description="Search 15,000+ verified drug and alcohol rehab centers. Compare treatment options, verify insurance coverage, and find the right recovery program. Confidential help available 24/7."
        canonical="/"
        keywords={[
          "drug rehab near me",
          "alcohol treatment centers",
          "addiction recovery programs",
          "inpatient rehab",
          "outpatient treatment",
          "detox centers",
          "substance abuse treatment",
          "dual diagnosis treatment",
          "rehab centers near me",
          "addiction help"
        ]}
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": "https://rehablookup.com/#webpage",
            name: "Find Addiction Treatment Centers Near You",
            description: "Search 15,000+ verified drug and alcohol rehab centers. Compare treatment options and find the right recovery program.",
            isPartOf: { "@id": "https://rehablookup.com/#website" },
            primaryImageOfPage: {
              "@type": "ImageObject",
              url: "https://rehablookup.com/og-image.jpg"
            },
            specialty: "Addiction Medicine",
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Treatment Options",
            description: "Types of addiction treatment programs available",
            numberOfItems: treatmentOptions.length,
            itemListElement: treatmentOptions.map((option, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: option.title,
              description: option.description,
              url: `https://rehablookup.com${option.link}`,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Addiction Treatment Center Directory",
            serviceType: "Treatment Center Matching",
            provider: {
              "@type": "Organization",
              name: "RehabLookup",
            },
            areaServed: {
              "@type": "Country",
              name: "United States",
            },
            description: "Free service connecting individuals with verified addiction treatment centers",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description: "Free treatment center matching service",
            },
          },
        ]}
      />
      
      {/* Hero Section */}
      <section className="relative z-10">
        {/* Background Image - preloaded for LCP */}
        <link rel="preload" as="image" href={heroImage} />
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/70" />

        {/* Content */}
        <div className="container relative py-12 md:py-14 lg:py-16">
          <div className="mx-auto max-w-4xl text-center">
            {/* Headline */}
            <h1 className="mb-3 font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl lg:text-[2.75rem] animate-fade-in">
              Find the Right Path to Recovery
            </h1>

            {/* Subheadline */}
            <p className="mb-6 md:mb-8 text-sm md:text-base text-white/90 animate-fade-in max-w-lg mx-auto leading-relaxed" style={{ animationDelay: "50ms" }}>
              Compare verified treatment centers and check your insurance coverage.
            </p>

            {/* Search Form - Directory Style */}
            <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
              <SearchForm variant="directory" />
            </div>

            {/* Provider CTA */}
            <div className="mt-5 animate-fade-in" style={{ animationDelay: "150ms" }}>
              <Link 
                to="/for-providers" 
                className="inline-flex items-center gap-1 text-sm text-white/75 hover:text-white underline underline-offset-4 transition-colors"
              >
                List Your Treatment Center
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="relative bg-primary border-y border-primary-foreground/10">
        <div className="container py-4 md:py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:gap-x-10 lg:gap-x-14">
            <div className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 transition-all group-hover:bg-white/15 group-hover:ring-white/30">
                <CheckCircle className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs md:text-sm font-medium text-primary-foreground/90">Verified Facilities</span>
            </div>
            <div className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 transition-all group-hover:bg-white/15 group-hover:ring-white/30">
                <Users className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs md:text-sm font-medium text-primary-foreground/90">15,000+ Centers</span>
            </div>
            <div className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 transition-all group-hover:bg-white/15 group-hover:ring-white/30">
                <Clock className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs md:text-sm font-medium text-primary-foreground/90">24/7 Confidential Help</span>
            </div>
            <div className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 transition-all group-hover:bg-white/15 group-hover:ring-white/30">
                <Phone className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs md:text-sm font-medium text-primary-foreground/90">Free Insurance Check</span>
            </div>
          </div>
        </div>
      </section>

      {/* Insurance Coverage Section */}
      <section className="py-10 md:py-14 lg:py-16 bg-gradient-to-b from-background to-muted/30">
        <div className="container">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 lg:p-10 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-12">
              {/* Left Content */}
              <div className="lg:max-w-sm text-center lg:text-left">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
                  <CheckCircle className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Insurance Verification
                  </span>
                </div>
                <h2 className="mb-2 font-display text-xl font-bold text-foreground md:text-2xl lg:text-[1.75rem]">
                  Are You Covered?
                </h2>
                <p className="mb-5 text-sm text-muted-foreground leading-relaxed">
                  Most insurance plans cover addiction treatment. Check your benefits in minutes.
                </p>
                <Link to="/insurance">
                  <Button size="lg" className="gap-2 font-semibold shadow-md hover:shadow-lg transition-shadow">
                    Check Your Coverage
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Insurance Logos */}
              <div className="flex-1 lg:max-w-xl">
                {/* Mobile: Horizontal scroll carousel */}
                <div className="relative -mx-2 px-2 sm:mx-0 sm:px-0">
                  <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0 md:grid-cols-6 md:gap-3">
                    {/* Aetna */}
                    <div className="flex h-12 min-w-[90px] shrink-0 snap-start items-center justify-center rounded-lg border border-border/80 bg-white px-3 py-2 transition-all hover:border-primary/40 hover:shadow-sm sm:min-w-0 sm:shrink md:h-14">
                      <img src="/insurance-logos/aetna.svg" alt="Aetna" className="h-5 md:h-6 w-auto object-contain" />
                    </div>
                    {/* Anthem */}
                    <div className="flex h-12 min-w-[90px] shrink-0 snap-start items-center justify-center rounded-lg border border-border/80 bg-white px-3 py-2 transition-all hover:border-primary/40 hover:shadow-sm sm:min-w-0 sm:shrink md:h-14">
                      <span className="text-xs md:text-sm font-bold text-[#0891B2]">Anthem</span>
                    </div>
                    {/* BCBS */}
                    <div className="flex h-12 min-w-[90px] shrink-0 snap-start items-center justify-center rounded-lg border border-border/80 bg-white px-3 py-2 transition-all hover:border-primary/40 hover:shadow-sm sm:min-w-0 sm:shrink md:h-14">
                      <img src="/insurance-logos/bcbs.svg" alt="Blue Cross Blue Shield" className="h-7 md:h-8 w-auto object-contain" />
                    </div>
                    {/* Cigna */}
                    <div className="flex h-12 min-w-[90px] shrink-0 snap-start items-center justify-center rounded-lg border border-border/80 bg-white px-3 py-2 transition-all hover:border-primary/40 hover:shadow-sm sm:min-w-0 sm:shrink md:h-14">
                      <img src="/insurance-logos/cigna.svg" alt="Cigna" className="h-4 md:h-5 w-auto object-contain" />
                    </div>
                    {/* Humana */}
                    <div className="flex h-12 min-w-[90px] shrink-0 snap-start items-center justify-center rounded-lg border border-border/80 bg-white px-3 py-2 transition-all hover:border-primary/40 hover:shadow-sm sm:min-w-0 sm:shrink md:h-14">
                      <span className="text-xs md:text-sm font-bold text-[#84CC16]">Humana</span>
                    </div>
                    {/* Kaiser */}
                    <div className="flex h-12 min-w-[90px] shrink-0 snap-start items-center justify-center rounded-lg border border-border/80 bg-white px-3 py-2 transition-all hover:border-primary/40 hover:shadow-sm sm:min-w-0 sm:shrink md:h-14">
                      <img src="/insurance-logos/kaiser.svg" alt="Kaiser Permanente" className="h-5 md:h-6 w-auto object-contain" />
                    </div>
                    {/* Medicare */}
                    <div className="flex h-12 min-w-[90px] shrink-0 snap-start items-center justify-center rounded-lg border border-border/80 bg-white px-3 py-2 transition-all hover:border-primary/40 hover:shadow-sm sm:min-w-0 sm:shrink md:h-14">
                      <span className="text-xs md:text-sm font-bold text-[#DC2626]">Medicare</span>
                    </div>
                    {/* Medicaid */}
                    <div className="flex h-12 min-w-[90px] shrink-0 snap-start items-center justify-center rounded-lg border border-border/80 bg-white px-3 py-2 transition-all hover:border-primary/40 hover:shadow-sm sm:min-w-0 sm:shrink md:h-14">
                      <span className="text-xs md:text-sm font-bold text-[#2563EB]">Medicaid</span>
                    </div>
                    {/* United */}
                    <div className="flex h-12 min-w-[90px] shrink-0 snap-start items-center justify-center rounded-lg border border-border/80 bg-white px-3 py-2 transition-all hover:border-primary/40 hover:shadow-sm sm:min-w-0 sm:shrink md:h-14">
                      <img src="/insurance-logos/united.svg" alt="UnitedHealthcare" className="h-5 md:h-6 w-auto object-contain" />
                    </div>
                    {/* Tricare */}
                    <div className="flex h-12 min-w-[90px] shrink-0 snap-start items-center justify-center rounded-lg border border-border/80 bg-white px-3 py-2 transition-all hover:border-primary/40 hover:shadow-sm sm:min-w-0 sm:shrink md:h-14">
                      <span className="text-xs md:text-sm font-bold text-[#0D9488]">TRICARE</span>
                    </div>
                    {/* Magellan */}
                    <div className="flex h-12 min-w-[90px] shrink-0 snap-start items-center justify-center rounded-lg border border-border/80 bg-white px-3 py-2 transition-all hover:border-primary/40 hover:shadow-sm sm:min-w-0 sm:shrink md:h-14">
                      <span className="text-xs md:text-sm font-bold text-[#7C3AED]">Magellan</span>
                    </div>
                    {/* More */}
                    <div className="flex h-12 min-w-[90px] shrink-0 snap-start items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 transition-all hover:bg-muted/40 sm:min-w-0 sm:shrink md:h-14">
                      <span className="text-xs font-medium text-muted-foreground">+ More</span>
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
        </div>
      </section>

      {/* Featured Centers */}
      <section className="py-12 md:py-16 lg:py-20">
        <div className="container">
          {/* Section Header - Clean directory style */}
          <div className="mb-8 md:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Star className="h-4 w-4 text-accent fill-accent" />
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">Featured</span>
              </div>
              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
                Top-Rated Treatment Centers
              </h2>
            </div>
            <Link to="/rehab-centers" className="group">
              <span className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                View all centers
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>

          {/* Cards Grid */}
          {isFacilitiesLoading ? (
            <FeaturedCentersLoading />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCenters.map((center, index) => (
                <div 
                  key={center.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TreatmentCenterCard center={center} featured />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Treatment Options */}
      <section className="py-12 md:py-16 lg:py-20 bg-muted/40 border-y border-border/50">
        <div className="container">
          {/* Section Header */}
          <div className="mb-8 md:mb-10 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Browse by Category</span>
            <h2 className="mt-2 font-display text-xl font-bold text-foreground md:text-2xl">
              Treatment Programs
            </h2>
          </div>

          {/* Options Grid - Clean card style with micro-interactions */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {treatmentOptions.map((option, index) => (
              <Link
                key={option.title}
                to={option.link}
                className="group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 overflow-hidden">
                  {/* Subtle background gradient on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  
                  {/* Icon with scale and rotate */}
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md">
                    <option.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  
                  <div className="relative flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground transition-colors duration-200 group-hover:text-primary">
                      {option.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2 transition-colors duration-200 group-hover:text-muted-foreground/80">
                      {option.description}
                    </p>
                  </div>
                  
                  {/* Arrow with enhanced animation */}
                  <div className="relative mt-1 flex items-center">
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:text-primary group-hover:translate-x-1" />
                  </div>
                  
                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-primary to-accent transition-all duration-300 group-hover:w-full" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Find Treatment Near You - SEO Section */}
      <section className="py-12 md:py-16 lg:py-20 border-t border-border/50">
        <div className="container">
          <div className="mb-8 md:mb-10 text-center">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
              <Navigation className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Near You
              </span>
            </div>
            <h2 className="mt-2 font-display text-xl font-bold text-foreground md:text-2xl">
              Find Treatment Near You
            </h2>
            <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
              Get location-based treatment options with real-time availability
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            <Link
              to="/drug-rehab-near-me"
              className="group relative flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  Drug Rehab Near Me
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Addiction treatment centers
                </p>
              </div>
            </Link>

            <Link
              to="/alcohol-rehab-near-me"
              className="group relative flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  Alcohol Rehab Near Me
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Alcohol treatment programs
                </p>
              </div>
            </Link>

            <Link
              to="/detox-near-me"
              className="group relative flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  Detox Centers Near Me
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Medical detox facilities
                </p>
              </div>
            </Link>

            <Link
              to="/dual-diagnosis-near-me"
              className="group relative flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  Dual Diagnosis Near Me
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Mental health + addiction
                </p>
              </div>
            </Link>

            <Link
              to="/inpatient-rehab-near-me"
              className="group relative flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  Inpatient Rehab Near Me
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Residential treatment
                </p>
              </div>
            </Link>

            <Link
              to="/outpatient-near-me"
              className="group relative flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  Outpatient Near Me
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  IOP & PHP programs
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            {/* Section Header */}
            <div className="mb-8 text-center">
              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
                How It Works
              </h2>
              <p className="mt-2 text-muted-foreground">
                Finding help is simple and confidential
              </p>
            </div>

            {/* Steps - Clean numbered list */}
            <div className="space-y-4">
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
                <div
                  key={item.step}
                  className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  {/* Step number */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  
                  <item.icon className="h-5 w-5 shrink-0 text-muted-foreground/50 mt-0.5" />
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8 text-center">
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
      <section className="py-12 md:py-16 lg:py-20 bg-primary">
        <div className="container">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Content */}
            <div className="order-2 lg:order-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/60">Why RehabLookup</span>
              <h2 className="mt-2 font-display text-xl font-bold text-primary-foreground md:text-2xl">
                Trusted by Families Across America
              </h2>
              <p className="mt-3 text-primary-foreground/70 leading-relaxed max-w-md">
                We're committed to helping you find the right treatment with transparency and compassion.
              </p>

              <ul className="mt-6 space-y-2.5">
                {[
                  "Every facility verified for licensing",
                  "Transparent program information",
                  "No hidden fees or referrals",
                  "Confidential communication",
                  "24/7 support available",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <CheckCircle className="h-4 w-4 shrink-0 text-accent" />
                    <span className="text-primary-foreground text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <Link to="/about">
                  <Button variant="hero-light" size="sm" className="gap-2">
                    Learn More
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Image with Stats Overlay */}
            <div ref={parallaxRef} className="order-1 lg:order-2">
              <div className="relative overflow-hidden rounded-xl">
                <img 
                  src={whyChooseUsImage} 
                  alt="Healthcare professional consulting with a family"
                  className="w-full aspect-[4/3] object-cover"
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent" />
                
                {/* Stats Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: "15K+", label: "Centers" },
                      { value: "50", label: "States" },
                      { value: "10K+", label: "Families" },
                      { value: "24/7", label: "Support" },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <div className="font-display text-lg font-bold text-accent sm:text-xl">
                          {stat.value}
                        </div>
                        <p className="text-[10px] text-primary-foreground/80 sm:text-xs">{stat.label}</p>
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
      <section className="py-12 md:py-16 lg:py-20 bg-muted/30 border-y border-border/50">
        <div className="container">
          {/* Section Header */}
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              What Families Say
            </h2>
            <p className="mt-2 text-muted-foreground">
              Real experiences from people we've helped
            </p>
          </div>

          {/* Testimonials Grid - Clean card style */}
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="rounded-xl border border-border bg-card p-5"
              >
                {/* Rating */}
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                
                {/* Quote */}
                <blockquote className="mb-4">
                  <p className="text-sm text-foreground leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                </blockquote>
                
                {/* Author */}
                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources / Blog Section */}
      <section className="py-12 md:py-16 lg:py-20">
        <div className="container">
          {/* Section Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resources</span>
              <h2 className="mt-2 font-display text-xl font-bold text-foreground md:text-2xl">
                Helpful Guides
              </h2>
            </div>
            <Link to="/resources" className="group">
              <span className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                View all articles
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>

          {/* Articles Grid - Clean card style */}
          <div className="grid gap-4 md:grid-cols-3">
            {blogArticles.map((article) => (
              <Link
                key={article.id}
                to={`/resources/${article.id}`}
                className="group"
              >
                <article className="h-full rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-md">
                  {/* Image */}
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    {/* Category & Read Time */}
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-primary">{article.category}</span>
                      <span>•</span>
                      <span>{article.readTime}</span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    
                    {/* Excerpt */}
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            {/* Main CTA Card */}
            <div className="rounded-xl border border-border bg-card p-8 md:p-10 text-center">
              <h2 className="font-display text-xl font-semibold text-foreground md:text-2xl">
                Start Your Recovery Journey
              </h2>
              <p className="mt-2 text-muted-foreground text-sm md:text-base max-w-md mx-auto">
                Connect with verified treatment centers or list your facility in our directory.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/request-help?source=cta_bottom">
                  <Button size="lg" className="gap-2 min-w-[180px]">
                    <Heart className="h-4 w-4" />
                    Get Help Now
                  </Button>
                </Link>
                <Link to="/for-providers">
                  <Button variant="outline" size="lg" className="gap-2 min-w-[180px]">
                    List Your Facility
                    <ArrowRight className="h-4 w-4" />
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

export default Index;
