import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useApprovedFacilities } from "@/hooks/useApprovedFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import {
  ArrowRight,
  Phone,
  CheckCircle,
  Shield,
  Clock,
  Heart,
  ChevronRight,
  Brain,
  Pill,
  Activity,
  HelpCircle,
  ChevronDown,
  Star,
  Sparkles,
  Crown,
  Utensils,
  Dumbbell,
  Leaf,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const luxuryAmenities = [
  {
    icon: Crown,
    title: "Private Accommodations",
    description: "Private or semi-private rooms with premium bedding, en-suite bathrooms, and resort-style furnishings.",
  },
  {
    icon: Utensils,
    title: "Gourmet Cuisine",
    description: "Chef-prepared meals with personalized nutrition plans, organic options, and dietary accommodations.",
  },
  {
    icon: Dumbbell,
    title: "Fitness & Wellness",
    description: "State-of-the-art gyms, personal trainers, yoga studios, swimming pools, and spa services.",
  },
  {
    icon: Leaf,
    title: "Holistic Therapies",
    description: "Massage therapy, acupuncture, meditation, equine therapy, art therapy, and adventure activities.",
  },
  {
    icon: Shield,
    title: "Privacy & Discretion",
    description: "Maximum confidentiality with private check-ins, limited social media exposure, and VIP treatment.",
  },
  {
    icon: Star,
    title: "Concierge Services",
    description: "Personal care coordinators, executive services, family accommodations, and aftercare planning.",
  },
];

const treatmentOfferings = [
  {
    title: "Executive Programs",
    description: "Continue working while in treatment with private offices, Wi-Fi, and flexible scheduling.",
    features: ["Business center access", "Video conferencing", "Flexible therapy times", "Executive coaching"],
  },
  {
    title: "Intensive Therapy",
    description: "More one-on-one time with therapists and access to specialized treatment modalities.",
    features: ["Daily individual therapy", "Specialized trauma care", "Psychiatric services", "Neurotherapy options"],
  },
  {
    title: "Family Programs",
    description: "Comprehensive family involvement with private family sessions and accommodations for visitors.",
    features: ["Family therapy intensives", "Visitor accommodations", "Couples counseling", "Parent coaching"],
  },
];

const faqs = [
  {
    question: "How much does luxury rehab cost?",
    answer:
      "Luxury rehab programs typically range from $30,000 to $100,000+ per month, depending on the facility, location, and amenities offered. While significantly more expensive than standard treatment, many luxury facilities offer private pay options, financing, and some accept insurance for the clinical portions of treatment. The cost often includes private accommodations, gourmet meals, holistic therapies, and higher staff-to-patient ratios.",
  },
  {
    question: "Is luxury rehab more effective than standard treatment?",
    answer:
      "Research shows that treatment success depends more on the quality of clinical care and patient engagement than amenities. However, luxury rehab can improve outcomes for some individuals by removing barriers to treatment (like work concerns for executives), providing a more comfortable environment that encourages longer stays, and offering additional holistic services that address overall wellness. The key is finding a program with strong clinical credentials regardless of luxury level.",
  },
  {
    question: "What makes luxury rehab different from standard rehab?",
    answer:
      "Key differences include: Lower patient-to-staff ratios (often 1:2 or better), private or semi-private rooms vs. shared dorms, gourmet nutrition vs. cafeteria meals, extensive holistic offerings (spa, fitness, equine therapy), greater privacy and discretion, more personalized treatment plans, upscale settings and accommodations, and additional services like executive support or concierge care.",
  },
  {
    question: "Does insurance cover luxury rehab?",
    answer:
      "Most insurance plans cover the clinical treatment portion (therapy, medical care, medications) at in-network rates, but typically don't cover luxury amenities like private rooms, gourmet meals, or spa services. Many luxury facilities work with insurance for clinical costs while patients pay out-of-pocket for the upgraded amenities. Some facilities are entirely private-pay only.",
  },
  {
    question: "Who benefits most from luxury rehab?",
    answer:
      "Luxury rehab may be particularly beneficial for: Executives and professionals who need to maintain some work responsibilities, high-profile individuals requiring maximum privacy, those who have struggled in standard treatment environments, individuals who value holistic wellness and comprehensive care, people with co-occurring conditions needing intensive psychiatric support, and those who can afford the investment and want the highest level of comfort during recovery.",
  },
];

const LuxuryRehab = () => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const { data: approvedFacilities = [] } = useApprovedFacilities();

  const relatedCenters = useMemo(() => {
    const allCenters = [...treatmentCenters, ...approvedFacilities];
    return allCenters.slice(0, 6);
  }, [approvedFacilities]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "name": "Luxury Rehab Programs",
      "description": "Upscale addiction treatment centers with premium amenities, private accommodations, and comprehensive care in resort-like settings.",
      "url": "https://rehablookup.com/treatment-types/luxury-rehab",
    },
    faqSchema
  ];

  return (
    <Layout>
      <SEO
        title="Luxury Rehab Centers | Executive & Upscale Addiction Treatment"
        description="Find luxury rehab programs with private accommodations, gourmet dining, holistic therapies, and executive services. Premium addiction treatment in resort-like settings."
        canonical="/treatment-types/luxury-rehab"
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Luxury Rehab", url: "/treatment-types/luxury-rehab" },
        ]}
      />

      {/* Hero Section */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container">
          <nav className="mb-5 flex items-center gap-2 text-sm text-white/70">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/treatment-types" className="hover:text-white transition-colors">Treatment Types</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">Luxury Rehab</span>
          </nav>

          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Crown className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Premium Treatment</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Luxury Rehab Centers
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Experience world-class addiction treatment in upscale, resort-like settings.
              Private accommodations, gourmet dining, and comprehensive care for those seeking the highest level of comfort during recovery.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/request-help">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                  <Phone className="h-4 w-4" />
                  Get Help Now
                </Button>
              </Link>
              <Link to="/rehab-centers">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
                  Find Luxury Centers
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:gap-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 text-accent" />
              <span>Maximum Privacy</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Star className="h-4 w-4 text-accent" />
              <span>Premium Amenities</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Personalized Care</span>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities Grid */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Luxury Amenities & Services
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Premium features that set luxury rehab apart from standard treatment
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {luxuryAmenities.map((amenity) => (
              <div
                key={amenity.title}
                className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 mb-4">
                  <amenity.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {amenity.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {amenity.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Treatment Offerings */}
      <section className="bg-secondary/30 py-12 md:py-16">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Specialized Programs
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Tailored treatment tracks for different needs and lifestyles
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {treatmentOfferings.map((offering) => (
              <div
                key={offering.title}
                className="rounded-2xl border bg-card p-6 shadow-sm"
              >
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {offering.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {offering.description}
                </p>
                <ul className="space-y-2">
                  {offering.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Centers */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Luxury Treatment Centers
              </h2>
              <p className="mt-1 text-muted-foreground">
                Premium facilities offering upscale addiction treatment
              </p>
            </div>
            <Link to="/rehab-centers">
              <Button variant="outline" className="gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {relatedCenters.map((center) => (
              <TreatmentCenterCard key={center.id} center={center} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t bg-card py-12">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <HelpCircle className="h-4 w-4" />
                Frequently Asked Questions
              </div>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Luxury Rehab FAQs
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-xl border bg-background overflow-hidden transition-shadow hover:shadow-md"
                >
                  <button
                    onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                    className="flex w-full items-center justify-between p-5 text-left"
                  >
                    <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                        openFAQ === index && "rotate-180 text-primary"
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-200 ease-in-out",
                      openFAQ === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Other Treatment Types */}
      <section className="border-t bg-secondary/30 py-10">
        <div className="container">
          <h2 className="mb-6 text-center text-xl font-bold text-foreground">
            Explore Other Treatment Options
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/treatment-types/residential-inpatient">
              <Button variant="outline" className="gap-2">
                <Activity className="h-4 w-4" />
                Residential Inpatient
              </Button>
            </Link>
            <Link to="/treatment-types/holistic-therapy">
              <Button variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Holistic Therapy
              </Button>
            </Link>
            <Link to="/treatment-types">
              <Button variant="outline" className="gap-2">
                All Treatment Types
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container text-center">
          <h2 className="mb-3 font-display text-xl font-bold text-primary-foreground md:text-2xl">
            Find Your Ideal Luxury Rehab
          </h2>
          <p className="mb-6 text-primary-foreground/80 max-w-xl mx-auto">
            Our specialists can help you find a luxury treatment center that meets your needs and preferences. Confidential consultation available.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/request-help">
              <Button size="lg" variant="secondary" className="gap-2">
                <Phone className="h-4 w-4" />
                Get Help Now
              </Button>
            </Link>
            <Link to="/rehab-centers">
              <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10">
                Browse Luxury Centers
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default LuxuryRehab;
