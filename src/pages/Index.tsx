import { useRef, useEffect, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { SearchForm } from "@/components/search/SearchForm";
import { Button } from "@/components/ui/button";
import { HomepageFeaturedSection } from "@/components/home/HomepageFeaturedSection";
// TrustStrip moved to /concierge
import { LazySection } from "@/components/ui/lazy-section";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { buildConciergeHref } from "@/lib/conciergeHref";
import { analytics } from "@/lib/analytics";
import { SocialProofBar } from "@/components/conversion/SocialProofBar";
// Hero image moved to public folder for FCP optimization - preloaded in index.html
// Using WebP for ~70% smaller file size
const heroImage = "/hero-recovery.webp";

// Lazy-load below-fold sections to reduce initial JS bundle
const InternalLinkBlock = lazy(() => import("@/components/seo/InternalLinkBlock").then(m => ({ default: m.InternalLinkBlock })));
const InternationalCTA = lazy(() => import("@/components/home/InternationalCTA").then(m => ({ default: m.InternationalCTA })));
const TestimonialsSection = lazy(() => import("@/components/testimonials/TestimonialsSection").then(m => ({ default: m.TestimonialsSection })));
const PageFAQ = lazy(() => import("@/components/seo/PageFAQ").then(m => ({ default: m.PageFAQ })));
const seekerTestimonialsPromise = import("@/data/testimonials").then(m => m.seekerTestimonials);
const homeFaqsPromise = import("@/data/pageFaqs").then(m => m.homeFaqs);
import whyChooseUsImage from "@/assets/why-choose-us.webp";
import {
  ArrowRight,
  Pill,
  Brain,
  Home,
  Activity,
  Stethoscope,
  Sparkles,
  CheckCircle,
  Search,
  Users,
  Phone,
  Heart,
  Clock,
  MapPin,
  Navigation,
  ClipboardList,
  Building2,
  Globe,
  UserCheck,
  ShieldCheck,
  Award,
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
  // Lazy-loaded data for below-fold sections
  const [seekerTestimonials, setSeekerTestimonials] = useState<any[]>([]);
  const [homeFaqs, setHomeFaqs] = useState<any[]>([]);
  // Geo-derived location string (e.g. "Boise, ID") forwarded to /concierge
  // so the intake form can prefill the visitor's preferred location without
  // asking them to retype it. Falls back gracefully when geo isn't ready.
  const homepageGeo = useGeoLocation();
  const homepageConciergeLocation =
    homepageGeo.city && homepageGeo.regionCode
      ? `${homepageGeo.city}, ${homepageGeo.regionCode}`
      : homepageGeo.regionCode || "";

  useEffect(() => {
    seekerTestimonialsPromise.then(setSeekerTestimonials);
    homeFaqsPromise.then(setHomeFaqs);
  }, []);
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
        title="Find Drug & Alcohol Rehab Centers Near You"
        description="Search 15,000+ verified addiction treatment centers. Compare drug rehab, alcohol treatment, detox programs. Free insurance verification. 24/7 confidential help."
        canonical="/"
        keywords={[
          "drug rehab near me",
          "alcohol treatment centers",
          "addiction treatment directory",
          "rehab centers near me",
          "substance abuse treatment",
          "detox centers",
          "inpatient rehab",
          "outpatient treatment",
          "dual diagnosis treatment",
          "addiction help",
          "find rehab",
          "alcohol rehab",
          "find rehab",
          "alcohol rehab",
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
            serviceType: "Treatment Center Placement",
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
              description: "Free treatment center placement service",
            },
          },
        ]}
      />
      
      {/* Hero Section */}
      <section className="relative z-10 bg-primary">
        {/* Background Image - using img for better LCP */}
        <img 
          src={heroImage}
          alt=""
          role="presentation"
          className="absolute inset-0 w-full h-full object-cover object-center"
          width={1920}
          height={1080}
          fetchPriority="high"
          loading="eager"
          decoding="sync"
        />
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/70" />

        {/* Content */}
        <div className="container relative py-10 md:py-12 lg:py-14 px-4 md:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* Headline */}
            <h1 className="speakable-headline mb-3 font-display text-[1.875rem] font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl lg:text-[2.75rem] animate-fade-in">
              Find the Right<br className="sm:hidden" /> Treatment & Rehab
            </h1>

            {/* Subheadline */}
            <p className="speakable-summary mb-6 md:mb-8 text-[15px] md:text-base text-white/90 animate-fade-in max-w-xl mx-auto leading-relaxed" style={{ animationDelay: "50ms" }}>
              Compare verified treatment centers and check your insurance coverage.
            </p>

            {/* Search Form - Directory Style */}
            <div className="animate-fade-in relative z-20" style={{ animationDelay: "100ms" }}>
              <SearchForm variant="directory" />
            </div>

            {/* Quick Links */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 animate-fade-in relative z-0" style={{ animationDelay: "150ms" }}>
              <Link 
                to="/concierge" 
                onClick={() => analytics.ctaClick("Get Free Help", "homepage_hero_quicklink")}
                className="inline-flex items-center gap-1 text-sm font-semibold text-white hover:text-white underline underline-offset-4 transition-colors"
              >
                Get Free Help
              </Link>
              <span className="text-white/40">•</span>
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

      {/* Trust Bar - Consolidated and Updated with Gold Icons */}
      <section className="relative bg-primary border-y border-primary-foreground/10">
        <div className="container py-3 md:py-4 px-4 md:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-x-8 lg:gap-x-12">
            <div className="flex items-center gap-2 group">
              <Building2 className="h-4 w-4 text-accent" aria-hidden="true" />
              <div className="flex items-center gap-1.5">
                <strong className="text-sm md:text-base font-bold text-white">15,000+</strong>
                <span className="text-sm md:text-base font-medium text-primary-foreground/90">Verified Facilities</span>
              </div>
            </div>
            <span className="hidden sm:inline text-primary-foreground/30" aria-hidden>·</span>
            <div className="flex items-center gap-2 group">
              <Globe className="h-4 w-4 text-accent" aria-hidden="true" />
              <div className="flex items-center gap-1.5">
                <strong className="text-sm md:text-base font-bold text-white">All 50</strong>
                <span className="text-sm md:text-base font-medium text-primary-foreground/90">States Covered</span>
              </div>
            </div>
            <span className="hidden sm:inline text-primary-foreground/30" aria-hidden>·</span>
            <div className="flex items-center gap-2 group">
              <UserCheck className="h-4 w-4 text-accent" aria-hidden="true" />
              <div className="flex items-center gap-1.5">
                <strong className="text-sm md:text-base font-bold text-white">Free</strong>
                <span className="text-sm md:text-base font-medium text-primary-foreground/90">For Clients</span>
              </div>
            </div>
            <span className="hidden sm:inline text-primary-foreground/30" aria-hidden>·</span>
            <div className="flex items-center gap-2 group">
              <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
              <div className="flex items-center gap-1.5">
                <strong className="text-sm md:text-base font-bold text-white">HIPAA</strong>
                <span className="text-sm md:text-base font-medium text-primary-foreground/90">Compliant</span>
              </div>
            </div>
            <span className="hidden sm:inline text-primary-foreground/30" aria-hidden>·</span>
            <div className="flex items-center gap-2 group">
              <Award className="h-4 w-4 text-accent" aria-hidden="true" />
              <div className="flex items-center gap-1.5">
                <strong className="text-sm md:text-base font-bold text-white">4.8★</strong>
                <span className="text-sm md:text-base font-medium text-primary-foreground/90">Advisor Rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TrustStrip moved to /concierge — see ConciergeLanding.tsx */}
      {/* Social Proof Stats Bar */}
      <SocialProofBar className="container px-4 md:px-6 lg:px-8 border-b" />

      {/* Featured Centers - Premium Horizontal Scroll */}
      <HomepageFeaturedSection />

      {/* Insurance Coverage Section */}
      <section className="py-10 md:py-12 lg:py-16 bg-gradient-to-b from-muted/20 to-muted/30">
        <div className="container px-4 md:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-5 md:p-6 lg:p-10 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-6 lg:gap-12">
              {/* Left Content */}
              <div className="md:max-w-xs lg:max-w-sm text-center md:text-left shrink-0">
                <div className="mb-2 md:mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
                  <CheckCircle className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs md:text-xs font-semibold uppercase tracking-wider text-primary">
                    Insurance Verification
                  </span>
                </div>
                <h2 className="mb-2 font-display text-xl md:text-2xl font-bold text-foreground lg:text-[1.75rem]">
                  Are You Covered?
                </h2>
                <p className="mb-4 md:mb-5 text-[15px] md:text-base text-muted-foreground leading-relaxed">
                  Most insurance plans cover addiction treatment. Check your benefits in minutes.
                </p>
                <Link to="/insurance">
                  <Button size="default" className="gap-2 font-semibold shadow-md hover:shadow-lg transition-shadow md:size-lg">
                    Check Your Coverage
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Insurance Logos */}
              <div className="flex-1">
                {/* Mobile: Horizontal scroll carousel, Tablet+: Grid */}
                <div className="relative -mx-2 px-2 md:mx-0 md:px-0">
                  <div className="flex gap-4 md:gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible md:pb-0 lg:gap-6">
                    {/* Aetna */}
                    <div className="flex min-w-[80px] shrink-0 snap-start items-center justify-center md:min-w-0 md:shrink">
                      <img src="/insurance-logos/aetna.svg" alt="Aetna" width={90} height={32} className="h-8 md:h-10 lg:h-12 max-w-[90px] object-contain opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                    {/* Anthem */}
                    <div className="flex min-w-[80px] shrink-0 snap-start items-center justify-center md:min-w-0 md:shrink">
                      <img src="/insurance-logos/anthem.svg" alt="Anthem" width={90} height={32} className="h-8 md:h-10 lg:h-12 max-w-[90px] object-contain opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                    {/* BCBS */}
                    <div className="flex min-w-[80px] shrink-0 snap-start items-center justify-center md:min-w-0 md:shrink">
                      <img src="/insurance-logos/bcbs.svg" alt="Blue Cross Blue Shield" width={90} height={32} className="h-8 md:h-10 lg:h-12 max-w-[90px] object-contain opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                    {/* Cigna */}
                    <div className="flex min-w-[80px] shrink-0 snap-start items-center justify-center md:min-w-0 md:shrink">
                      <img src="/insurance-logos/cigna.svg" alt="Cigna" width={90} height={32} className="h-8 md:h-10 lg:h-12 max-w-[90px] object-contain opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                    {/* Humana */}
                    <div className="flex min-w-[80px] shrink-0 snap-start items-center justify-center md:min-w-0 md:shrink">
                      <img src="/insurance-logos/humana.svg" alt="Humana" width={90} height={32} className="h-8 md:h-10 lg:h-12 max-w-[90px] object-contain opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                    {/* Kaiser */}
                    <div className="flex min-w-[80px] shrink-0 snap-start items-center justify-center md:min-w-0 md:shrink">
                      <img src="/insurance-logos/kaiser.svg" alt="Kaiser Permanente" width={90} height={32} className="h-8 md:h-10 lg:h-12 max-w-[90px] object-contain opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                    {/* Medicare */}
                    <div className="flex min-w-[80px] shrink-0 snap-start items-center justify-center md:min-w-0 md:shrink">
                      <img src="/insurance-logos/medicare.svg" alt="Medicare" width={90} height={32} className="h-8 md:h-10 lg:h-12 max-w-[90px] object-contain opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                    {/* Medicaid */}
                    <div className="flex min-w-[80px] shrink-0 snap-start items-center justify-center md:min-w-0 md:shrink">
                      <img src="/insurance-logos/medicaid.svg" alt="Medicaid" width={90} height={32} className="h-8 md:h-10 lg:h-12 max-w-[90px] object-contain opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                    {/* Optum */}
                    <div className="flex min-w-[80px] shrink-0 snap-start items-center justify-center md:min-w-0 md:shrink">
                      <span className="text-sm md:text-base lg:text-lg font-bold text-[#FF6200] opacity-80 hover:opacity-100 transition-opacity">Optum</span>
                    </div>
                    {/* Tricare */}
                    <div className="flex min-w-[80px] shrink-0 snap-start items-center justify-center md:min-w-0 md:shrink">
                      <img src="/insurance-logos/tricare.svg" alt="TRICARE" width={90} height={32} className="h-8 md:h-10 lg:h-12 max-w-[90px] object-contain opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  {/* Scroll hint for mobile */}
                  <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground md:hidden">
                    <span>Swipe to see more</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-10 md:py-12 lg:py-20">
        <div className="container px-4 md:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            {/* Section Header */}
            <div className="mb-6 md:mb-8 text-center">
              <h2 className="font-display text-xl md:text-2xl font-bold text-foreground lg:text-3xl">
                How It Works
              </h2>
              <p className="mt-1.5 md:mt-2 text-[15px] md:text-base text-muted-foreground">
                Finding help is simple and confidential
              </p>
            </div>

            {/* Steps - Clean numbered list */}
            <div className="space-y-3 md:space-y-4">
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
                  className="group flex items-start gap-3 md:gap-4 rounded-xl border border-border bg-card p-3 md:p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  {/* Step number */}
                  <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm md:text-base font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-[15px] md:text-base">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-sm md:text-base text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  
                  <item.icon className="h-4 w-4 md:h-5 md:w-5 shrink-0 text-muted-foreground/50 mt-0.5" />
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-6 md:mt-8 text-center">
              <Link to="/rehab-centers">
                <Button size="default" className="gap-2 md:size-lg">
                  Start Your Search
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Treatment Options */}
      <section className="py-10 md:py-12 lg:py-20 bg-muted/40 border-y border-border/50">
        <div className="container px-4 md:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mb-6 md:mb-8 lg:mb-10 text-center">
            <span className="text-xs md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Browse by Category</span>
            <h2 className="mt-1.5 md:mt-2 font-display text-xl md:text-2xl font-bold text-foreground lg:text-3xl">
              Treatment Programs
            </h2>
          </div>

          {/* Options Grid - Optimized for tablet with 2 columns */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {treatmentOptions.map((option, index) => (
              <Link
                key={option.title}
                to={option.link}
                className="group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 overflow-hidden">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <option.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{option.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {option.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-10 md:py-12 lg:py-24 overflow-hidden">
        <div className="container px-4 md:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Image Side */}
            <div className="w-full lg:w-1/2 relative" ref={parallaxRef}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
                <img 
                  src={whyChooseUsImage} 
                  alt="Trusted by Families Across America" 
                  className="w-full h-full object-cover transition-transform duration-500 ease-out"
                  style={{ transform: `scale(1.1) translateY(${parallaxOffset}px)` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                
                {/* Floating badge */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Verified & Secure</p>
                      <p className="text-xs text-muted-foreground">Every facility is manually vetted by our team</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 h-24 w-24 bg-primary/5 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 h-40 w-40 bg-accent/10 rounded-full blur-3xl" />
            </div>

            {/* Content Side */}
            <div className="w-full lg:w-1/2">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Why RehabLookup
                </span>
              </div>
              <h2 className="mb-6 font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                Trusted by Families<br /> Across America
              </h2>
              <p className="mb-8 text-base md:text-lg text-muted-foreground leading-relaxed">
                We're committed to helping you find the right treatment with transparency and compassion.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  {
                    title: "Verified Listings",
                    desc: "Every facility is manually verified for licensing and accreditation.",
                    icon: CheckCircle
                  },
                  {
                    title: "Transparent Info",
                    desc: "Get clear details on programs, amenities, and insurance options.",
                    icon: ClipboardList
                  },
                  {
                    title: "Confidential Help",
                    desc: "Your privacy is our priority. All inquiries are 100% confidential.",
                    icon: ShieldCheck
                  },
                  {
                    title: "Free for Seekers",
                    desc: "Our directory and placement services are always free for families.",
                    icon: Heart
                  }
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-10">
                <Link to="/about">
                  <Button variant="outline" className="gap-2">
                    About Our Mission
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* International CTA */}
      <Suspense fallback={<div className="h-64 bg-muted animate-pulse" />}>
        <InternationalCTA />
      </Suspense>

      {/* Blog/Resources Section */}
      <section className="py-10 md:py-12 lg:py-24 bg-muted/30">
        <div className="container px-4 md:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-4">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Latest Resources</h2>
              <p className="mt-2 text-muted-foreground">Expert advice and guides for your recovery journey</p>
            </div>
            <Link to="/resources">
              <Button variant="ghost" className="gap-2 group">
                View all articles
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {blogArticles.map((article) => (
              <Link key={article.id} to={`/resources/${article.id}`} className="group flex flex-col bg-card rounded-2xl border border-border overflow-hidden transition-all hover:shadow-xl hover:border-primary/20">
                <div className="aspect-[16/9] overflow-hidden">
                  <img 
                    src={article.image} 
                    alt={article.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">{article.category}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.readTime}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-6">
                    {article.excerpt}
                  </p>
                  <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">By {article.author}</span>
                    <span className="text-primary text-sm font-bold inline-flex items-center gap-1">
                      Read More
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <Suspense fallback={<div className="h-96 bg-muted animate-pulse" />}>
        <TestimonialsSection testimonials={seekerTestimonials} />
      </Suspense>

      {/* FAQ Section */}
      <Suspense fallback={<div className="h-96 bg-muted animate-pulse" />}>
        <PageFAQ faqs={homeFaqs} />
      </Suspense>

      {/* SEO Internal Links */}
      <Suspense fallback={<div className="h-64 bg-muted animate-pulse" />}>
        <InternalLinkBlock />
      </Suspense>
    </Layout>
  );
};

export default Index;
