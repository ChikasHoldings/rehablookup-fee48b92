import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { SearchForm } from "@/components/search/SearchForm";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { treatmentCenters } from "@/data/treatmentCenters";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { usStates } from "@/data/usStates";
import { 
  Heart, 
  MapPin, 
  Phone,
  Star,
  Shield,
  Clock,
  ChevronRight,
  Building2,
  HelpCircle,
  Users,
  Award
} from "lucide-react";
import MedicalPatternBackground from "@/components/backgrounds/MedicalPatternBackground";
import supportSpecialistImg from "@/assets/support-specialist.png";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  InternalLinkingSection, 
  nearMeLinks, 
  insuranceLinks, 
  resourceLinks 
} from "@/components/seo/InternalLinkingSection";

const RehabCenters = () => {
  const { data: approvedFacilities = [] } = useStaticFacilities();

  // Combine static data with approved facilities from database
  const allCenters = useMemo(() => {
    return [...treatmentCenters, ...approvedFacilities];
  }, [approvedFacilities]);

  const sorted = useMemo(() => {
    return [...allCenters].sort((a, b) => {
      const aF = (a as any).hasFeaturedSubscription ? 1 : 0;
      const bF = (b as any).hasFeaturedSubscription ? 1 : 0;
      if (bF !== aF) return bF - aF;
      if (b.featured !== a.featured) return b.featured ? 1 : -1;
      return b.rating - a.rating;
    });
  }, [allCenters]);

  const topRatedCenters = useMemo(() => sorted.slice(0, 6), [sorted]);

  const detoxCenters = useMemo(() =>
    sorted.filter(c => c.treatmentTypes?.some(t => /detox|withdrawal/i.test(t))).slice(0, 6),
    [sorted]);

  const inpatientCenters = useMemo(() =>
    sorted.filter(c => c.treatmentTypes?.some(t => /inpatient|residential/i.test(t))).slice(0, 6),
    [sorted]);

  const outpatientCenters = useMemo(() =>
    sorted.filter(c => c.treatmentTypes?.some(t => /outpatient|IOP/i.test(t))).slice(0, 6),
    [sorted]);

  const dualDiagnosisCenters = useMemo(() =>
    sorted.filter(c => c.treatmentTypes?.some(t => /dual.diagnosis|co.occurring|mental.health/i.test(t))).slice(0, 6),
    [sorted]);

  // Popular states for browse
  const popularStates = usStates.slice(0, 12);

  const handleSearchComplete = () => {
    // Search form handles navigation
  };

  const faqItems = [
    {
      question: "How do I find the right treatment center?",
      answer: "Start by considering your specific needs: the type of addiction, preferred location, insurance coverage, and treatment approach. Our search tools help filter centers by these criteria. You can also contact our specialists for personalized recommendations."
    },
    {
      question: "What types of treatment programs are available?",
      answer: "Common options include inpatient/residential treatment (24/7 care), outpatient programs (flexible scheduling), detox programs (medically supervised withdrawal), and dual diagnosis treatment (for co-occurring mental health conditions)."
    },
    {
      question: "Does insurance cover addiction treatment?",
      answer: "Most insurance plans provide coverage for addiction treatment under the Mental Health Parity Act. Coverage varies by plan and provider. Many treatment centers offer insurance verification to help you understand your benefits before admission."
    },
    {
      question: "How long does treatment typically last?",
      answer: "Treatment duration varies based on individual needs. Detox typically lasts 5-10 days, while residential programs often range from 30-90 days. Outpatient programs may continue for several months. Longer treatment is generally associated with better outcomes."
    },
    {
      question: "Are the treatment centers verified?",
      answer: "Yes, we verify state licensing, accreditation from organizations like The Joint Commission or CARF, and confirm that facilities meet quality standards. Look for the verified badge on center profiles."
    }
  ];

  return (
    <Layout>
      <SEO
        title="Find Rehab Centers Near You"
        description="Search and compare verified addiction treatment centers. Filter by location, treatment type, and insurance. Find the right rehab facility for your recovery journey."
        canonical="/rehab-centers"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Find Rehab Centers Near You",
            "description": "Search and compare verified addiction treatment centers across the United States.",
            "url": "https://rehablookup.com/rehab-centers",
          },
        ]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Find Rehab", url: "/rehab-centers" },
        ]}
      />
      
      {/* Hero Header */}
      <section className="relative border-b border-primary/20 bg-gradient-to-b from-primary via-primary/95 to-primary/85 py-10 md:py-14">
        <MedicalPatternBackground />
        <div className="container relative z-10">
          <BreadcrumbNav
            className="mb-4"
            variant="dark"
            items={[{ label: "Treatment Centers" }]}
          />
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl lg:text-4xl">
              Find Treatment Centers
            </h1>
            <p className="mt-3 text-sm md:text-base text-white/90 max-w-lg mx-auto leading-relaxed">
              Search verified treatment centers and find the right care for your recovery journey
            </p>
          </div>

          {/* Search Form */}
          <SearchForm
            variant="directory"
            targetPath="/search-results"
            onSearchComplete={handleSearchComplete}
          />

          {/* Quick Stats */}
          <div className="mt-6 flex items-center justify-center gap-6 text-white/80 text-xs md:text-sm">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              <span>{allCenters.length}+ Centers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              <span>Verified Listings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4" />
              <span>User Reviews</span>
            </div>
          </div>
        </div>
      </section>

      {/* Top Rated Programs */}
      <section className="bg-background py-10 md:py-14">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                <Award className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                Top Rated Programs
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Highly rated treatment centers trusted by thousands
              </p>
            </div>
            <Link 
              to="/search-results?sort=rating-high" 
              className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topRatedCenters.map((center) => (
              <TreatmentCenterCard
                key={center.id}
                center={center}
                featured={center.featured}
              />
            ))}
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Link to="/search-results?sort=rating-high">
              <Button variant="outline" size="sm" className="gap-2">
                View All Programs
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Browse by State */}
      <section className="bg-secondary/30 border-y border-border py-10 md:py-14">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="font-display text-xl md:text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <MapPin className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              Browse by State
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Find treatment centers in your area
            </p>
          </div>

          {/* Popular States Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            {popularStates.map((state) => (
              <Link
                key={state.slug}
                to={`/rehab-centers/${state.slug}`}
                className="group flex items-center gap-2 rounded-lg border border-border bg-card p-3 hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">
                  {state.name}
                </span>
              </Link>
            ))}
          </div>

          {/* All States Expandable */}
          <div className="text-center">
            <Accordion type="single" collapsible className="max-w-4xl mx-auto">
              <AccordionItem value="all-states" className="border-none">
                <AccordionTrigger className="justify-center gap-2 text-sm font-medium text-primary hover:no-underline py-2">
                  View All 50 States
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pt-4">
                    {usStates.map((state) => (
                      <Link
                        key={state.slug}
                        to={`/rehab-centers/${state.slug}`}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                      >
                        {state.name}
                      </Link>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Treatment Types Quick Links */}
      <section className="bg-background py-10 md:py-14">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">
              Treatment Options
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Explore different types of treatment programs
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { title: "Detox", icon: Clock, href: "/treatment-types/detox-programs", desc: "Medical detoxification" },
              { title: "Inpatient", icon: Building2, href: "/treatment-types/residential-inpatient", desc: "24/7 residential care" },
              { title: "Outpatient", icon: Users, href: "/treatment-types/outpatient-programs", desc: "Flexible scheduling" },
              { title: "Dual Diagnosis", icon: Heart, href: "/treatment-types/dual-diagnosis", desc: "Co-occurring disorders" },
              { title: "Alcohol Rehab", icon: Shield, href: "/treatment-types/alcohol-rehabilitation", desc: "Alcohol treatment" },
              { title: "Drug Rehab", icon: Award, href: "/treatment-types/drug-addiction", desc: "Drug addiction care" },
            ].map((item) => (
              <Link
                key={item.title}
                to={item.href}
                className="group flex flex-col items-center rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-secondary/30 border-t border-border py-10 md:py-14">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="font-display text-xl md:text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                <HelpCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                Frequently Asked Questions
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Common questions about finding treatment
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {faqItems.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`faq-${index}`}
                  className="bg-card rounded-lg border border-border px-4 data-[state=open]:border-primary/30"
                >
                  <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-6 text-center">
              <Link to="/faq">
                <Button variant="outline" size="sm" className="gap-2">
                  View All FAQs
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Internal Linking Section */}
      <InternalLinkingSection
        title="Explore More Resources"
        description="Find treatment options by location, insurance, or learn more about recovery"
        variant="grid"
        groups={[
          { title: "Find Treatment Near You", links: nearMeLinks.slice(0, 5) },
          { title: "Insurance Coverage", links: insuranceLinks.slice(0, 5) },
          { title: "Recovery Guides", links: resourceLinks.slice(0, 5) },
        ]}
      />

      {/* CTA Banner */}
      <section className="border-t border-border bg-card py-10 md:py-12">
        <div className="container">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 md:flex-row rounded-xl border border-border bg-gradient-to-r from-primary/5 to-primary/10 p-5 md:p-6">
            <div className="relative shrink-0">
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 p-0.5 ring-1 ring-primary/10">
                <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-b from-background to-secondary/50">
                  <img 
                    src={supportSpecialistImg} 
                    alt="Support specialist ready to help" 
                    className="w-full h-full object-cover object-top scale-110"
                  />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 flex items-center gap-1 rounded-full bg-card px-2 py-0.5 shadow-sm border border-border">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                </span>
                <span className="text-xs font-medium text-foreground">Online</span>
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="mb-1 font-display text-base font-bold text-foreground md:text-lg">
                Need Help Finding the Right Center?
              </h2>
              <p className="text-muted-foreground text-sm max-w-md">
                Our specialists provide free, confidential guidance on treatment options.
              </p>
            </div>
            
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Link to="/concierge">
                <Button size="sm" className="w-full gap-2 sm:w-auto">
                  <Heart className="h-4 w-4" />
                  Find Treatment
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="sm" variant="outline" className="w-full gap-2 sm:w-auto">
                  <Phone className="h-4 w-4" />
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default RehabCenters;
