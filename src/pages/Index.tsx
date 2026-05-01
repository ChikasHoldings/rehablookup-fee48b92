import { useRef, useEffect, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { SearchForm } from "@/components/search/SearchForm";
import { Button } from "@/components/ui/button";
import { HomepageFeaturedSection } from "@/components/home/HomepageFeaturedSection";
import { TrustStrip } from "@/components/home/TrustStrip";
import { LazySection } from "@/components/ui/lazy-section";
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
                to="/international" 
                className="inline-flex items-center gap-1 text-sm text-white/75 hover:text-white underline underline-offset-4 transition-colors"
              >
                International Placement
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

      {/* Trust Bar */}
      <section className="relative bg-primary border-y border-primary-foreground/10">
        <div className="container py-3 md:py-4 px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 md:flex md:items-center md:justify-center md:gap-x-8 lg:gap-x-14">
            <div className="flex items-center gap-2 group">
              <CheckCircle className="h-4 w-4 text-accent shrink-0" />
              <span className="text-sm md:text-base font-medium text-primary-foreground/90">Verified Facilities</span>
            </div>
            <div className="flex items-center gap-2 group">
              <Users className="h-4 w-4 text-accent shrink-0" />
              <span className="text-sm md:text-base font-medium text-primary-foreground/90">15,000+ Centers</span>
            </div>
            <div className="flex items-center gap-2 group">
              <Clock className="h-4 w-4 text-accent shrink-0" />
              <span className="text-sm md:text-base font-medium text-primary-foreground/90">24/7 Help</span>
            </div>
            <div className="flex items-center gap-2 group">
              <Phone className="h-4 w-4 text-accent shrink-0" />
              <span className="text-sm md:text-base font-medium text-primary-foreground/90">Free Insurance Check</span>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 5: live trust signals — verified-facility count from DB */}
      <TrustStrip />

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
                  {/* Subtle background gradient on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  
                  {/* Icon with scale and rotate */}
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md">
                    <option.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  
                  <div className="relative flex-1 min-w-0">
                    <h3 className="font-semibold text-[15px] md:text-base text-foreground transition-colors duration-200 group-hover:text-primary">
                      {option.title}
                    </h3>
                    <p className="mt-0.5 text-sm md:text-base text-muted-foreground line-clamp-2 transition-colors duration-200 group-hover:text-muted-foreground/80">
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

      {/* Why Choose Us */}
      <section className="py-10 md:py-12 lg:py-20 bg-primary">
        <div className="container px-4 md:px-6 lg:px-8">
          <div className="grid items-center gap-6 md:gap-8 md:grid-cols-2 lg:gap-12">
            {/* Content */}
            <div className="order-2 md:order-1">
              <span className="text-xs md:text-xs font-semibold uppercase tracking-wider text-primary-foreground/60">Why RehabLookup</span>
              <h2 className="mt-1.5 md:mt-2 font-display text-xl md:text-2xl font-bold text-primary-foreground lg:text-3xl">
                Trusted by Families Across America
              </h2>
              <p className="mt-2 md:mt-3 text-[15px] md:text-base text-primary-foreground/70 leading-relaxed max-w-md">
                We're committed to helping you find the right treatment with transparency and compassion.
              </p>

              <ul className="mt-4 md:mt-6 space-y-2 md:space-y-2.5">
                {[
                  "Every facility verified for licensing",
                  "Transparent program information",
                  "No hidden fees or referrals",
                  "Confidential communication",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 md:gap-2.5">
                    <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 text-accent" />
                    <span className="text-primary-foreground text-sm md:text-base">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 md:mt-6">
                <Link to="/about">
                  <Button variant="hero-light" size="sm" className="gap-2">
                    About Our Mission
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Image with Stats Overlay */}
            <div ref={parallaxRef} className="order-1 md:order-2">
              <div className="relative overflow-hidden rounded-xl">
                <img 
                  src={whyChooseUsImage} 
                  alt="Healthcare professional consulting with a family"
                  className="w-full aspect-[4/3] object-cover"
                  width={800}
                  height={600}
                  loading="lazy"
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent" />
                
                {/* Stats Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                  <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                    {[
                      { value: "15K+", label: "Centers" },
                      { value: "50", label: "States" },
                      { value: "10K+", label: "Families" },
                      { value: "24/7", label: "Support" },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <div className="font-display text-lg md:text-xl font-bold text-accent lg:text-2xl">
                          {stat.value}
                        </div>
                        <p className="text-xs md:text-sm text-primary-foreground/80 lg:text-sm">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Placement Service */}
      <section className="py-12 md:py-16 lg:py-20 bg-accent/5 border-y border-accent/10 relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        
        <div className="container relative px-4 md:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center max-w-5xl mx-auto">
            {/* Left side - Content */}
            <div className="text-center md:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-1.5 border border-accent/20">
                <Heart className="h-4 w-4 text-accent fill-accent/30" />
                <span className="text-sm font-semibold text-accent">Placement Service</span>
              </div>
              <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl lg:text-3xl">
                Overwhelmed by Options?
                <span className="block text-accent mt-1">Let Us Help.</span>
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Our specialists personally connect you with verified treatment centers based on your insurance, location, and unique needs.
              </p>
              <Link to="/concierge">
                <Button size="lg" className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20">
                  Find Treatment
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Right side - Visual steps */}
            <div className="space-y-3">
              {[
                { icon: ClipboardList, title: "Tell Us Your Needs", desc: "Share your situation, preferences, and insurance" },
                { icon: Users, title: "We Find Matches", desc: "Our team reviews programs that fit your criteria" },
                { icon: Phone, title: "Get Connected", desc: "We introduce you directly to the best options" },
              ].map((step, idx) => (
                <div 
                  key={step.title}
                  className="flex items-start gap-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-border/50 shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-accent/60">0{idx + 1}</span>
                      <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <LazySection fallbackHeight="400px">
        <Suspense fallback={null}>
          <TestimonialsSection
            testimonials={seekerTestimonials}
            title="Real Stories from Families We've Helped"
            subtitle="Hear from people who found the right treatment through RehabLookup"
          />
        </Suspense>
      </LazySection>

      {/* International Patients CTA */}
      <LazySection fallbackHeight="200px">
        <Suspense fallback={null}>
          <InternationalCTA />
        </Suspense>
      </LazySection>

      {/* Find Treatment Near You - SEO Section */}
      <section className="py-10 md:py-12 lg:py-20 border-t border-border/50">
        <div className="container px-4 md:px-6 lg:px-8">
          <div className="mb-6 md:mb-8 lg:mb-10 text-center">
            <div className="mb-1.5 md:mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
              <Navigation className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs md:text-xs font-semibold uppercase tracking-wider text-primary">
                Near You
              </span>
            </div>
            <h2 className="mt-1.5 md:mt-2 font-display text-xl md:text-2xl font-bold text-foreground lg:text-3xl">
              Find Treatment Near You
            </h2>
            <p className="mt-1.5 md:mt-2 text-[15px] md:text-base text-muted-foreground max-w-lg mx-auto">
              Get location-based treatment options with real-time availability
            </p>
          </div>

          {/* Near me grid - 2 columns on mobile, 3 on tablet, 3 on desktop */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 max-w-4xl mx-auto">
            <Link
              to="/drug-rehab-near-me"
              className="group relative flex flex-col items-center gap-2 md:gap-3 rounded-xl border border-border bg-card p-4 md:p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Pill className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                  Drug Rehab Near Me
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Addiction treatment centers
                </p>
              </div>
            </Link>

            <Link
              to="/alcohol-rehab-near-me"
              className="group relative flex flex-col items-center gap-2 md:gap-3 rounded-xl border border-border bg-card p-4 md:p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Activity className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                  Alcohol Rehab Near Me
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Alcohol treatment programs
                </p>
              </div>
            </Link>

            <Link
              to="/detox-near-me"
              className="group relative flex flex-col items-center gap-2 md:gap-3 rounded-xl border border-border bg-card p-4 md:p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                  Detox Centers Near Me
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Medical detox facilities
                </p>
              </div>
            </Link>

            <Link
              to="/dual-diagnosis-near-me"
              className="group relative flex flex-col items-center gap-2 md:gap-3 rounded-xl border border-border bg-card p-4 md:p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Brain className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                  Dual Diagnosis Near Me
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Mental health + addiction
                </p>
              </div>
            </Link>

            <Link
              to="/inpatient-rehab-near-me"
              className="group relative flex flex-col items-center gap-2 md:gap-3 rounded-xl border border-border bg-card p-4 md:p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Home className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                  Inpatient Rehab Near Me
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Residential treatment
                </p>
              </div>
            </Link>

            <Link
              to="/outpatient-near-me"
              className="group relative flex flex-col items-center gap-2 md:gap-3 rounded-xl border border-border bg-card p-4 md:p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Stethoscope className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                  Outpatient Near Me
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  IOP & PHP programs
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Resources / Blog Section */}
      <LazySection fallbackHeight="400px">
      <section className="py-10 md:py-12 lg:py-20">
        <div className="container px-4 md:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 md:gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resources</span>
              <h2 className="mt-1.5 md:mt-2 font-display text-lg md:text-xl font-bold text-foreground lg:text-2xl">
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

          {/* Articles Grid - 1 col mobile, 2 col tablet, 3 col desktop */}
          <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {blogArticles.map((article) => (
              <Link
                key={article.id}
                to={`/resources/${article.id}`}
                className="group"
              >
                <article className="h-full rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-md">
                  {/* Image */}
                  <div className="relative h-32 md:h-40 overflow-hidden">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      width={400}
                      height={200}
                      loading="lazy"
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="p-3 md:p-4">
                    {/* Category & Read Time */}
                    <div className="mb-1.5 md:mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium text-primary">{article.category}</span>
                      <span>•</span>
                      <span>{article.readTime}</span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2 text-[15px] md:text-base">
                      {article.title}
                    </h3>
                    
                    {/* Excerpt */}
                    <p className="mt-1 md:mt-1.5 text-sm md:text-base text-muted-foreground line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>
      </LazySection>

      {/* SEO Internal Links Section */}
      <LazySection fallbackHeight="600px">
        <section className="py-10 md:py-12 lg:py-16 bg-muted/30 border-t">
          <div className="container px-4 md:px-6 lg:px-8 space-y-8 md:space-y-10">
            {/* Quick Links to Key Pages */}
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-foreground mb-4">
                Explore RehabLookup
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {[
                  { name: "How It Works", href: "/how-it-works" },
                  { name: "About Us", href: "/about" },
                  { name: "Insurance Guide", href: "/insurance" },
                  { name: "FAQs", href: "/faq" },
                  { name: "Contact Us", href: "/contact" },
                  { name: "For Providers", href: "/for-providers" },
                  { name: "Treatment Types", href: "/treatment-types" },
                  { name: "All Locations", href: "/locations" },
                  { name: "Cost Estimator", href: "/cost-estimator" },
                  { name: "Provider Resources", href: "/provider-resources" },
                  { name: "Concierge Service", href: "/concierge" },
                  { name: "Search Centers", href: "/search-results" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="text-sm md:text-base text-muted-foreground hover:text-primary transition-colors py-1"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            <Suspense fallback={null}>
              <InternalLinkBlock 
                title="Find Treatment by State" 
                variant="states" 
              />
              <InternalLinkBlock 
                title="Treatment Programs" 
                variant="treatments"
              />
              <InternalLinkBlock 
                title="Insurance Coverage Guides" 
                variant="insurance"
              />
              <InternalLinkBlock 
                title="Find Treatment Near You" 
                variant="nearme"
              />
            </Suspense>
          </div>
        </section>
      </LazySection>

      {/* CTA Section */}
      <section className="py-10 md:py-14 lg:py-20">
        <div className="container px-4 md:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            {/* Main CTA Card */}
            <div className="rounded-xl border border-border bg-card p-6 md:p-8 lg:p-10 text-center">
              <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground lg:text-3xl">
                Start Your Recovery Journey
              </h2>
              <p className="mt-1.5 md:mt-2 text-muted-foreground text-[15px] md:text-base lg:text-lg max-w-md mx-auto">
                Connect with verified treatment centers or list your facility in our directory.
              </p>
              <div className="mt-5 md:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5 md:gap-3">
                <Link to="/concierge">
                  <Button size="default" className="gap-2 min-w-[160px] md:min-w-[180px] md:size-lg">
                    <Heart className="h-4 w-4" />
                    Find Treatment
                  </Button>
                </Link>
                <Link to="/for-providers">
                  <Button variant="outline" size="default" className="gap-2 min-w-[160px] md:min-w-[180px] md:size-lg">
                    List Your Facility
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LazySection fallbackHeight="300px">
        <Suspense fallback={null}>
          {homeFaqs.length > 0 && <PageFAQ faqs={homeFaqs} className="border-t border-border bg-muted/30" />}
        </Suspense>
      </LazySection>
    </Layout>
  );
};

export default Index;
