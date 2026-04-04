import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateFAQSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Star,
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
  Heart,
  ChevronRight,
  Phone,
  Sparkles,
  Building2,
  Users,
  Utensils,
  Dumbbell,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { treatmentCenters } from "@/data/treatmentCenters";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import MedicalPatternBackground from "@/components/backgrounds/MedicalPatternBackground";

const faqs = [
  {
    question: "What makes luxury rehab different from standard treatment?",
    answer: "Luxury rehab facilities offer private or semi-private rooms, gourmet nutrition, spa services, fitness centers, and smaller patient-to-staff ratios. The clinical care — evidence-based therapies, medical oversight, and individualized treatment planning — is comparable, but the environment is designed for comfort, privacy, and a resort-like experience.",
  },
  {
    question: "Does insurance cover luxury rehab?",
    answer: "Insurance typically covers the clinical treatment component of luxury rehab at standard rates. The premium amenities, private rooms, and concierge services are generally out-of-pocket costs. Some high-tier PPO plans may offer more generous reimbursement. Always verify your specific benefits before enrolling.",
  },
  {
    question: "How much does luxury rehab cost?",
    answer: "Luxury rehab programs range from $30,000 to $100,000+ per month depending on location, amenities, and program specialization. Executive programs may cost more. Many facilities offer financing and payment plans to make treatment accessible.",
  },
  {
    question: "Is luxury rehab more effective than standard rehab?",
    answer: "Research shows that treatment outcomes depend primarily on clinical quality, treatment duration, and patient engagement — not facility amenities. However, luxury settings can improve retention and completion rates because patients feel more comfortable and are less likely to leave early.",
  },
  {
    question: "Who is luxury rehab best suited for?",
    answer: "Luxury rehab is ideal for executives, professionals, and individuals who value privacy, comfort, and personalized attention. It's also beneficial for those who may have avoided treatment due to concerns about the typical clinical environment.",
  },
  {
    question: "What amenities are typical at luxury rehab centers?",
    answer: "Common amenities include private suites, gourmet chef-prepared meals, swimming pools, fitness centers, yoga studios, equine therapy, spa services, ocean or mountain views, and outdoor recreational activities. Many also offer business centers for executives who need to stay connected.",
  },
];

const features = [
  { icon: Building2, title: "Private Suites", desc: "Spacious, hotel-quality accommodations with privacy" },
  { icon: Utensils, title: "Gourmet Nutrition", desc: "Chef-prepared meals tailored to recovery needs" },
  { icon: Dumbbell, title: "Fitness & Wellness", desc: "Personal trainers, yoga, meditation, and spa" },
  { icon: Users, title: "Low Patient Ratio", desc: "1:3 staff-to-patient ratio for personalized care" },
  { icon: Shield, title: "Clinical Excellence", desc: "Board-certified psychiatrists and licensed therapists" },
  { icon: Heart, title: "Holistic Therapies", desc: "Art, music, equine, and adventure therapy" },
];

export default function LuxuryRehab() {
  const luxuryFacilities = treatmentCenters
    .filter((f) => f.featured || f.treatmentTypes?.some((t) => t.toLowerCase().includes("luxury")))
    .slice(0, 6);

  return (
    <Layout>
      <SEO
        title="Luxury Rehab Centers — Premium Addiction Treatment | RehabLookup"
        description="Explore luxury rehab centers offering private suites, gourmet nutrition, spa services, and world-class clinical care. Find premium addiction treatment programs."
        canonical="/treatment-types/luxury-rehab"
        structuredData={generateFAQSchema(faqs)}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Luxury Rehab", url: "/treatment-types/luxury-rehab" },
        ]}
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary/95 to-primary/85 py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
        <MedicalPatternBackground />
        <div className="container relative z-10 max-w-4xl">
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-sm">
              <li><Link to="/" className="text-white/70 hover:text-white transition-colors">Home</Link></li>
              <li className="text-white/40">/</li>
              <li><Link to="/treatment-types" className="text-white/70 hover:text-white transition-colors">Treatment Types</Link></li>
              <li className="text-white/40">/</li>
              <li className="text-white font-medium">Luxury Rehab</li>
            </ol>
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 mb-4">
            <Star className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-white">Premium Treatment</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            Luxury Rehab Centers
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mb-8">
            World-class addiction treatment in resort-like settings. Private suites, gourmet nutrition, holistic therapies, and clinical excellence — because recovery should never mean sacrificing dignity.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg">
              <Link to="/concierge">
                Find Luxury Treatment
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button asChild variant="hero-secondary" size="lg" className="border-white/30 text-white hover:bg-white/10">
              <Link to="/rehab-centers">Browse All Centers</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 bg-background">
        <div className="container max-w-5xl">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">What Defines Luxury Rehab</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-xl border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 bg-muted/30">
        <div className="container max-w-4xl space-y-10">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Understanding Luxury Rehab</h2>
            <p className="text-muted-foreground leading-relaxed">
              Luxury rehabilitation centers combine evidence-based addiction treatment with premium amenities and personalized care. These facilities are designed for individuals who need professional help but are deterred by the clinical feel of standard treatment centers. By offering privacy, comfort, and a high staff-to-patient ratio, luxury rehab removes barriers to seeking help and creates an environment where recovery feels like a priority — not a punishment.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">What to Expect in Luxury Treatment</h2>
            <ul className="space-y-3">
              {[
                "Comprehensive medical and psychiatric assessment upon admission",
                "Individualized treatment plan created by a multidisciplinary team",
                "Private or semi-private suites with high-end furnishings",
                "Daily individual therapy sessions with licensed specialists",
                "Holistic therapies: yoga, meditation, art therapy, equine therapy",
                "Gourmet nutrition programs designed by dietitians",
                "Fitness programs with personal training options",
                "Executive accommodations for professionals needing connectivity",
                "Comprehensive aftercare and alumni support programs",
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Is Luxury Rehab Right for You?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Luxury rehab is best suited for individuals who value privacy, comfort, and personalized attention in their recovery journey. It's particularly popular among executives, professionals, public figures, and anyone who has previously avoided treatment due to concerns about the clinical environment. The enhanced amenities and lower patient-to-staff ratios can significantly improve treatment engagement and completion rates, leading to better long-term outcomes.
            </p>
          </div>
        </div>
      </section>

      {/* Facility Listings */}
      {luxuryFacilities.length > 0 && (
        <section className="py-12 bg-background">
          <div className="container">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-3">
                <Star className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Featured Centers</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Premium Treatment Facilities</h2>
              <p className="mt-2 text-muted-foreground">Verified luxury rehab centers with world-class clinical programs.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {luxuryFacilities.map((facility) => (
                <TreatmentCenterCard key={facility.id} center={facility} featured={facility.featured} variant="compact" />
              ))}
            </div>
            <div className="text-center mt-8">
              <Button asChild variant="outline" size="lg">
                <Link to="/rehab-centers">View All Centers <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-12 bg-muted/30">
        <div className="container max-w-4xl">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Find Your Ideal Luxury Treatment Center
            </h2>
            <p className="text-white/80 mb-6 max-w-xl mx-auto">
              Our concierge team specializes in matching you with premium facilities that fit your needs, preferences, and insurance. Confidential and personalized.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild variant="hero-light" size="lg">
                <Link to="/concierge">
                  <Phone className="h-4 w-4 mr-1" />
                  Get Matched Now
                </Link>
              </Button>
              <Button asChild variant="hero-secondary" size="lg" className="border-white/30 text-white hover:bg-white/10">
                <Link to="/insurance">Check Insurance Coverage</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 bg-background">
        <div className="container max-w-3xl">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Luxury Rehab FAQs
          </h2>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`faq-${idx}`} className="border rounded-xl px-5 data-[state=open]:border-primary/30">
                <AccordionTrigger className="text-left text-foreground font-medium hover:no-underline py-4 text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Related Links */}
      <section className="py-10 bg-muted/30 border-t">
        <div className="container max-w-5xl">
          <h2 className="text-lg font-bold text-foreground mb-4">Explore Treatment Types</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { to: "/treatment-types/residential-inpatient", label: "Inpatient Rehab" },
              { to: "/treatment-types/outpatient-programs", label: "Outpatient Programs" },
              { to: "/treatment-types/detox-programs", label: "Detox Programs" },
              { to: "/treatment-types/dual-diagnosis-treatment", label: "Dual Diagnosis" },
              { to: "/treatment-types/alcohol-rehabilitation", label: "Alcohol Rehab" },
              { to: "/treatment-types/drug-addiction-treatment", label: "Drug Rehab" },
              { to: "/treatment-types/holistic-therapy", label: "Holistic Therapy" },
              { to: "/us-rehab/luxury-rehab-america", label: "Luxury in America" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 hover:border-primary/30 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
