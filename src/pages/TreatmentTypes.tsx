import { Link } from "react-router-dom";
import { PageFAQ } from "@/components/seo/PageFAQ";
import { treatmentTypesFaqs } from "@/data/pageFaqs";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StateLinksGroup } from "@/components/treatment/StateLinksSection";
import { 
  InternalLinkingSection, 
  nearMeLinks, 
  insuranceLinks, 
  resourceLinks 
} from "@/components/seo/InternalLinkingSection";
import { FeaturedCentersSection } from "@/components/seo/FeaturedCentersSection";
import {
  Pill,
  Brain,
  Activity,
  Home,
  Stethoscope,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Heart,
  Leaf,
  LucideIcon,
  Clock,
  Users,
  Building2,
  GraduationCap,
  Briefcase,
  Cross,
  Baby,
  Shield,
  MapPin,
  Navigation,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TreatmentType {
  icon: LucideIcon;
  title: string;
  description: string;
  link: string;
  tag?: string;
}

const primaryTreatments: TreatmentType[] = [
  {
    icon: Sparkles,
    title: "Detox Programs",
    description: "Medically supervised withdrawal management with 24/7 monitoring for safe detoxification.",
    link: "/treatment-types/detox-programs",
    tag: "3-14 days",
  },
  {
    icon: Home,
    title: "Residential Inpatient",
    description: "24/7 structured care in a supportive residential environment for intensive recovery.",
    link: "/treatment-types/residential-inpatient",
    tag: "30-90 days",
  },
  {
    icon: Stethoscope,
    title: "Outpatient Programs",
    description: "Flexible treatment while maintaining work, school, and family commitments.",
    link: "/treatment-types/outpatient-programs",
    tag: "Flexible",
  },
  {
    icon: Brain,
    title: "Dual Diagnosis",
    description: "Integrated treatment for addiction with co-occurring mental health conditions.",
    link: "/treatment-types/dual-diagnosis-treatment",
    tag: "Specialized",
  },
];

const substanceTreatments: TreatmentType[] = [
  {
    icon: Pill,
    title: "Drug Addiction Treatment",
    description: "Comprehensive programs for opioids, stimulants, benzodiazepines, and other substances.",
    link: "/treatment-types/drug-addiction-treatment",
  },
  {
    icon: Activity,
    title: "Alcohol Rehabilitation",
    description: "Specialized programs for alcohol dependence with evidence-based therapies.",
    link: "/treatment-types/alcohol-rehabilitation",
  },
  {
    icon: Pill,
    title: "Medication-Assisted Treatment",
    description: "FDA-approved medications combined with counseling for opioid and alcohol addiction.",
    link: "/treatment-types/drug-addiction-treatment",
    tag: "MAT",
  },
];

const specializedTreatments: TreatmentType[] = [
  {
    icon: Leaf,
    title: "Holistic Therapy",
    description: "Mind-body-spirit approaches including yoga, meditation, art therapy, and nutrition.",
    link: "/treatment-types/holistic-therapy",
  },
  {
    icon: Building2,
    title: "Sober Living",
    description: "Transitional housing providing structure and support after primary treatment.",
    link: "/treatment-types/residential-inpatient",
    tag: "Aftercare",
  },
  {
    icon: Clock,
    title: "Partial Hospitalization",
    description: "Day programs with intensive treatment while returning home evenings.",
    link: "/treatment-types/outpatient-programs",
    tag: "PHP",
  },
  {
    icon: Users,
    title: "Intensive Outpatient",
    description: "Structured group therapy sessions multiple times per week.",
    link: "/treatment-types/outpatient-programs",
    tag: "IOP",
  },
  {
    icon: GraduationCap,
    title: "Teen & Young Adult",
    description: "Age-appropriate treatment designed for adolescents and young adults.",
    link: "/treatment-types/dual-diagnosis-treatment",
    tag: "Ages 12-25",
  },
  {
    icon: Briefcase,
    title: "Executive Programs",
    description: "Premium treatment with privacy and amenities for professionals.",
    link: "/treatment-types/residential-inpatient",
    tag: "Luxury",
  },
  {
    icon: Cross,
    title: "Faith-Based Treatment",
    description: "Recovery programs incorporating spiritual principles and religious practices.",
    link: "/treatment-types/holistic-therapy",
  },
  {
    icon: Shield,
    title: "Veterans Programs",
    description: "Specialized care addressing military-related trauma and substance abuse.",
    link: "/treatment-types/dual-diagnosis-treatment",
    tag: "TRICARE",
  },
];

const TreatmentCard = ({ treatment, variant = "default" }: { treatment: TreatmentType; variant?: "default" | "compact" }) => {
  const IconComponent = treatment.icon;
  
  if (variant === "compact") {
    return (
      <Link
        to={treatment.link}
        className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md hover:bg-muted/30"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {treatment.title}
            </h3>
            {treatment.tag && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {treatment.tag}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {treatment.description}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5 mt-1" />
      </Link>
    );
  }
  
  return (
    <Link
      to={treatment.link}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <IconComponent className="h-5 w-5" />
        </div>
        {treatment.tag && (
          <Badge variant="outline" className="text-[10px] font-medium">
            {treatment.tag}
          </Badge>
        )}
      </div>
      
      <h3 className="mb-2 font-semibold text-foreground group-hover:text-primary transition-colors">
        {treatment.title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
        {treatment.description}
      </p>
      
      <div className="mt-auto flex items-center gap-1.5 text-sm font-medium text-primary">
        <span>Learn more</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
};

const TreatmentTypes = () => {
  return (
    <Layout>
      <SEO
        title="Types of Addiction Treatment Programs | Find the Right Care"
        description="Explore addiction treatment options: detox, inpatient rehab, outpatient programs, dual diagnosis, MAT, holistic therapy, and specialized programs. Find verified treatment centers."
        canonical="/treatment-types"
        keywords={[
          "types of addiction treatment",
          "inpatient vs outpatient rehab",
          "detox programs",
          "dual diagnosis treatment",
          "alcohol rehabilitation",
          "drug treatment programs",
          "holistic addiction therapy",
          "medication assisted treatment"
        ]}
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Types of Addiction Treatment Programs",
            description: "Comprehensive guide to addiction treatment options including detox, inpatient, outpatient, and specialized programs",
            url: "https://rehablookup.com/treatment-types",
            mainEntity: {
              "@type": "ItemList",
              name: "Treatment Program Types",
              numberOfItems: primaryTreatments.length + substanceTreatments.length,
              itemListElement: [...primaryTreatments, ...substanceTreatments].map((t, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: t.title,
                description: t.description,
                url: `https://rehablookup.com${t.link}`,
              })),
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            name: "Addiction Treatment Types Guide",
            specialty: "Addiction Medicine",
            about: [
              { "@type": "MedicalTherapy", name: "Detoxification" },
              { "@type": "MedicalTherapy", name: "Inpatient Rehabilitation" },
              { "@type": "MedicalTherapy", name: "Outpatient Treatment" },
              { "@type": "MedicalTherapy", name: "Dual Diagnosis Treatment" },
            ],
          },
        ]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
        ]}
      />
      
      {/* Streamlined Hero */}
      <section className="bg-primary py-10 md:py-12">
        <div className="container">
          {/* Breadcrumb */}
          <nav className="mb-5 text-center">
            <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
              <Link to="/" className="text-white/70 hover:text-white transition-colors">Home</Link>
              <span className="text-white/50">/</span>
              <span className="text-white font-medium">Treatment Types</span>
            </span>
          </nav>
          
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-3 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Treatment Programs
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base">
              Explore evidence-based treatment options to find the right level of care for your recovery.
            </p>
          </div>
        </div>
      </section>

      {/* Primary Treatment Types */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
              Core Treatment Programs
            </h2>
            <Link to="/rehab-centers" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              View all centers <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {primaryTreatments.map((treatment) => (
              <TreatmentCard key={treatment.title} treatment={treatment} />
            ))}
          </div>
        </div>
      </section>

      {/* Substance-Specific */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-6">
            <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
              Substance-Specific Treatment
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Programs tailored to specific substance dependencies
            </p>
          </div>
          
          <div className="grid gap-3 md:grid-cols-3">
            {substanceTreatments.map((treatment) => (
              <TreatmentCard key={treatment.title} treatment={treatment} variant="compact" />
            ))}
          </div>
        </div>
      </section>

      {/* Specialized Programs */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-6">
            <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
              Specialized Programs
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Targeted treatment for specific needs, populations, and preferences
            </p>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {specializedTreatments.map((treatment) => (
              <TreatmentCard key={treatment.title} treatment={treatment} variant="compact" />
            ))}
          </div>
        </div>
      </section>

      {/* Find Treatment Near You - SEO Section */}
      <section className="border-t border-border py-10 md:py-14">
        <div className="container">
          <div className="mb-6 text-center">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
              <Navigation className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Location-Based Search
              </span>
            </div>
            <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
              Find Treatment Near You
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your location to find available treatment options nearby
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            <Link
              to="/drug-rehab-near-me"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md hover:bg-muted/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Pill className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  Drug Rehab Near Me
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  Use location
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5" />
            </Link>

            <Link
              to="/alcohol-rehab-near-me"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md hover:bg-muted/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  Alcohol Rehab Near Me
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  Use location
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5" />
            </Link>

            <Link
              to="/detox-near-me"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md hover:bg-muted/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  Detox Near Me
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  Use location
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5" />
            </Link>

            <Link
              to="/dual-diagnosis-near-me"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md hover:bg-muted/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Brain className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  Dual Diagnosis Near Me
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  Use location
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5" />
            </Link>

            <Link
              to="/inpatient-rehab-near-me"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md hover:bg-muted/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Home className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  Inpatient Rehab Near Me
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  Use location
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5" />
            </Link>

            <Link
              to="/outpatient-near-me"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md hover:bg-muted/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                  Outpatient Near Me
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  Use location
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Comparison */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-6 text-center">
            <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
              Compare Treatment Levels
            </h2>
          </div>
          
          <div className="mx-auto max-w-3xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-4 text-left font-semibold text-foreground">Program</th>
                  <th className="py-3 px-4 text-center font-semibold text-foreground">Duration</th>
                  <th className="py-3 px-4 text-center font-semibold text-foreground">Setting</th>
                  <th className="py-3 px-4 text-center font-semibold text-foreground">Best For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-card transition-colors">
                  <td className="py-3 px-4">
                    <Link to="/treatment-types/detox-programs" className="font-medium text-primary hover:underline">Detox</Link>
                  </td>
                  <td className="py-3 px-4 text-center text-muted-foreground">3-14 days</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">Medical facility</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">Safe withdrawal</td>
                </tr>
                <tr className="hover:bg-card transition-colors">
                  <td className="py-3 px-4">
                    <Link to="/treatment-types/residential-inpatient" className="font-medium text-primary hover:underline">Inpatient</Link>
                  </td>
                  <td className="py-3 px-4 text-center text-muted-foreground">30-90 days</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">Residential</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">Intensive care</td>
                </tr>
                <tr className="hover:bg-card transition-colors">
                  <td className="py-3 px-4">
                    <Link to="/treatment-types/outpatient-programs" className="font-medium text-primary hover:underline">PHP</Link>
                  </td>
                  <td className="py-3 px-4 text-center text-muted-foreground">20-30 hrs/wk</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">Day program</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">Step-down care</td>
                </tr>
                <tr className="hover:bg-card transition-colors">
                  <td className="py-3 px-4">
                    <Link to="/treatment-types/outpatient-programs" className="font-medium text-primary hover:underline">IOP</Link>
                  </td>
                  <td className="py-3 px-4 text-center text-muted-foreground">9-20 hrs/wk</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">Outpatient</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">Work/life balance</td>
                </tr>
                <tr className="hover:bg-card transition-colors">
                  <td className="py-3 px-4">
                    <Link to="/treatment-types/outpatient-programs" className="font-medium text-primary hover:underline">Outpatient</Link>
                  </td>
                  <td className="py-3 px-4 text-center text-muted-foreground">1-8 hrs/wk</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">Office visits</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">Maintenance</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Browse by State */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
              Find Treatment by State
            </h2>
          </div>

          <div className="space-y-6">
            <StateLinksGroup
              title="Detox Programs"
              basePath="/treatment-types/detox-programs"
              icon={Sparkles}
            />
            <StateLinksGroup
              title="Inpatient Rehab"
              basePath="/treatment-types/residential-inpatient"
              icon={Home}
            />
            <StateLinksGroup
              title="Outpatient Programs"
              basePath="/treatment-types/outpatient-programs"
              icon={Stethoscope}
            />
            <StateLinksGroup
              title="Dual Diagnosis"
              basePath="/treatment-types/dual-diagnosis-treatment"
              icon={Brain}
              className=""
            />
          </div>
        </div>
      </section>

      {/* Featured Centers - SEO Internal Links */}
      <FeaturedCentersSection 
        title="Explore Treatment Centers"
        description="Verified facilities offering these treatment programs"
        limit={8}
        className="border-t border-border bg-muted/30"
      />

      {/* SEO Internal Linking */}
      <InternalLinkingSection
        title="Related Resources"
        description="Learn more about treatment options and coverage"
        variant="grid"
        groups={[
          { title: "Find Treatment Near You", links: nearMeLinks.slice(0, 5) },
          { title: "Insurance Coverage", links: insuranceLinks.slice(0, 5) },
          { title: "Recovery Guides", links: resourceLinks.slice(0, 5) },
        ]}
      />

      {/* CTA */}
      <section className="border-t border-border bg-primary py-10 md:py-12">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-3 font-display text-xl font-bold text-primary-foreground md:text-2xl">
              Need Help Choosing?
            </h2>
            <p className="mb-6 text-primary-foreground/80 text-sm">
              Our specialists can help you find the right treatment program. Free and confidential.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/concierge">
                <Button size="lg" variant="secondary" className="gap-2 font-semibold">
                  <Heart className="h-4 w-4" />
                  Find Treatment
                </Button>
              </Link>
              <Link to="/rehab-centers">
                <Button size="lg" variant="outline" className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  Browse Centers
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PageFAQ faqs={treatmentTypesFaqs} className="border-t border-border bg-muted/30" />
    </Layout>
  );
};

export default TreatmentTypes;