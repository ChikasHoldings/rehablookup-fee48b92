import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateFAQSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
  Heart,
  ChevronRight,
  Phone,
  Leaf,
  Music,
  Palette,
  Dog,
  Mountain,
  Wind,
  Apple,
  Waves,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { treatmentCenters } from "@/data/treatmentCenters";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

const holisticTherapies = [
  {
    icon: Wind,
    title: "Yoga & Meditation",
    description: "Mind-body practices that reduce stress, improve mental clarity, and promote emotional balance through breathing exercises and mindful movement.",
  },
  {
    icon: Palette,
    title: "Art Therapy",
    description: "Creative expression through visual arts helps process emotions, reduce anxiety, and develop healthy coping mechanisms without words.",
  },
  {
    icon: Music,
    title: "Music Therapy",
    description: "Therapeutic use of music to address emotional, cognitive, and social needs while promoting relaxation and self-expression.",
  },
  {
    icon: Dog,
    title: "Equine & Animal Therapy",
    description: "Working with horses and other animals builds trust, responsibility, and emotional awareness in a unique therapeutic setting.",
  },
  {
    icon: Mountain,
    title: "Adventure Therapy",
    description: "Outdoor activities like hiking, rock climbing, and wilderness experiences build confidence, teamwork, and resilience.",
  },
  {
    icon: Leaf,
    title: "Acupuncture",
    description: "Traditional Chinese medicine technique that can help reduce cravings, ease withdrawal symptoms, and restore energy balance.",
  },
  {
    icon: Apple,
    title: "Nutritional Counseling",
    description: "Personalized dietary guidance to repair damage from substance abuse and establish healthy eating habits that support recovery.",
  },
  {
    icon: Waves,
    title: "Massage Therapy",
    description: "Therapeutic touch that releases physical tension, reduces anxiety, and promotes overall relaxation and well-being.",
  },
];

const benefits = [
  {
    title: "Reduced Stress & Anxiety",
    description: "Holistic practices activate the body's relaxation response, lowering cortisol levels and promoting calm.",
  },
  {
    title: "Improved Emotional Regulation",
    description: "Learn to identify, process, and manage emotions without turning to substances.",
  },
  {
    title: "Enhanced Self-Awareness",
    description: "Develop deeper understanding of triggers, patterns, and personal needs in recovery.",
  },
  {
    title: "Physical Healing",
    description: "Support the body's natural healing processes damaged by substance abuse.",
  },
  {
    title: "Spiritual Connection",
    description: "Find meaning, purpose, and connection to something greater than oneself.",
  },
  {
    title: "Sustainable Coping Skills",
    description: "Build a toolkit of healthy practices that can be used long after treatment ends.",
  },
];

const faqs = [
  {
    question: "What is holistic therapy in addiction treatment?",
    answer: "Holistic therapy is an approach that treats the whole person—mind, body, and spirit—rather than focusing solely on addiction symptoms. It incorporates complementary practices like yoga, meditation, art therapy, acupuncture, and nutritional counseling alongside traditional evidence-based treatments to support comprehensive healing.",
  },
  {
    question: "Is holistic treatment effective for addiction?",
    answer: "Yes, research shows holistic therapies can significantly enhance addiction treatment outcomes when combined with evidence-based approaches. Studies indicate yoga and meditation reduce stress and cravings, art therapy improves emotional expression, and nutritional support aids physical recovery. Most effective treatment programs integrate holistic methods with clinical therapies.",
  },
  {
    question: "What types of holistic therapies are offered in rehab?",
    answer: "Common holistic therapies include yoga and meditation, art and music therapy, equine (horse) therapy, adventure therapy, acupuncture, massage therapy, nutritional counseling, mindfulness training, tai chi, aromatherapy, and nature-based activities. The specific offerings vary by treatment center.",
  },
  {
    question: "Can holistic therapy replace traditional addiction treatment?",
    answer: "Holistic therapies are most effective as complementary treatments, not replacements for evidence-based approaches like cognitive behavioral therapy, medication-assisted treatment, and medical supervision. The best outcomes occur when holistic practices enhance traditional methods, providing additional tools for managing stress, cravings, and emotional challenges.",
  },
  {
    question: "How does yoga help with addiction recovery?",
    answer: "Yoga supports recovery by reducing stress hormones, improving body awareness, teaching breathing techniques for managing cravings, increasing dopamine naturally, improving sleep quality, and providing healthy coping strategies. Regular practice helps rewire the brain's reward system and builds resilience against relapse.",
  },
  {
    question: "Is holistic treatment covered by insurance?",
    answer: "Insurance coverage for holistic therapies varies. Many plans cover holistic treatments when they're part of a comprehensive addiction treatment program. Individual services like acupuncture or massage may have separate coverage. Contact your insurance provider and the treatment center to understand what's covered under your specific plan.",
  },
  {
    question: "What is equine therapy and how does it help addiction?",
    answer: "Equine therapy involves working with horses under professional guidance. Horses are highly sensitive to human emotions, providing immediate feedback that helps individuals develop self-awareness, emotional regulation, trust, and communication skills. This experiential therapy can break through emotional barriers that talk therapy alone may not reach.",
  },
  {
    question: "How long do holistic treatment programs typically last?",
    answer: "Holistic treatment programs typically follow the same timelines as traditional programs: 30, 60, or 90+ days for residential treatment, or ongoing sessions for outpatient care. Many people continue holistic practices like yoga, meditation, and nutrition counseling long after formal treatment as part of their ongoing recovery lifestyle.",
  },
];

const otherTreatmentTypes = [
  { title: "Drug Addiction Treatment", link: "/treatment-types/drug-addiction" },
  { title: "Alcohol Rehabilitation", link: "/treatment-types/alcohol-rehabilitation" },
  { title: "Dual Diagnosis Treatment", link: "/treatment-types/dual-diagnosis" },
  { title: "Residential Inpatient", link: "/treatment-types/residential-inpatient" },
  { title: "Outpatient Programs", link: "/treatment-types/outpatient-programs" },
];

const HolisticTherapy = () => {
  const featuredCenters = treatmentCenters.slice(0, 3);
  const faqSchema = generateFAQSchema(faqs);

  return (
    <Layout>
      <SEO
        title="Holistic Therapy for Addiction Treatment | Mind, Body & Spirit Healing"
        description="Explore holistic addiction treatment including yoga, meditation, art therapy, equine therapy, and nutritional counseling. Learn how complementary therapies support whole-person recovery."
        canonical="/treatment-types/holistic-therapy"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Holistic Therapy", url: "/treatment-types/holistic-therapy" },
        ]}
        structuredData={[faqSchema, { "@context": "https://schema.org", "@type": "MedicalWebPage", specialty: "Addiction Medicine", lastReviewed: new Date().toISOString().split("T")[0] }]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
          {/* Breadcrumbs */}
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Treatment Types", href: "/treatment-types" },
              { label: "Holistic Therapy" },
            ]}
          /><div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Complementary Treatment</span>
            </div>
            <h1 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
              Holistic Therapy for Addiction
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-primary-foreground/80">
              Heal the whole person—mind, body, and spirit—with complementary therapies that enhance traditional addiction treatment.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/rehab-centers">
                <Button size="lg" variant="secondary" className="gap-2">
                  <Heart className="h-5 w-5" />
                  Find Treatment
                </Button>
              </Link>
              <Link to="/search-results?type=holistic">
                <Button size="lg" variant="outline" className="gap-2 border-white/30 text-primary-foreground hover:bg-white/10">
                  <Phone className="h-5 w-5" />
                  Find Holistic Centers
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
              <span>Evidence-Supported</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>Whole-Person Care</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Complementary Approach</span>
            </div>
          </div>
        </div>
      </section>

      {/* What is Holistic Therapy */}
      <section className="section-padding">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">
              What is Holistic Therapy?
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Holistic therapy treats addiction by addressing the whole person—not just the symptoms. This approach recognizes that substance use disorders affect every aspect of life: physical health, mental well-being, emotional balance, and spiritual connection. By combining complementary practices with evidence-based treatments, holistic therapy helps individuals heal on multiple levels and develop sustainable recovery skills.
            </p>
          </div>
        </div>
      </section>

      {/* Types of Holistic Therapies */}
      <section className="bg-muted/30 section-padding">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">
              Types of Holistic Therapies
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Explore the complementary therapies commonly offered in addiction treatment programs.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {holisticTherapies.map((therapy, index) => (
              <div
                key={therapy.title}
                className="rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <therapy.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  {therapy.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {therapy.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section-padding">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">
              Benefits of Holistic Treatment
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Discover how holistic approaches enhance addiction recovery outcomes.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className="rounded-xl border border-border bg-card p-6 shadow-card animate-fade-in"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-accent shrink-0" />
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {benefit.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 section-padding">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">
              How Holistic Treatment Works
            </h2>
          </div>
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  1
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">Assessment</h3>
                <p className="text-sm text-muted-foreground">
                  Your treatment team evaluates your physical, mental, emotional, and spiritual needs to create a personalized plan.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  2
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Holistic therapies are woven into your treatment schedule alongside clinical therapies and medical care.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  3
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">Continuation</h3>
                <p className="text-sm text-muted-foreground">
                  Learn practices you can continue after treatment to maintain balance and support long-term recovery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Centers - Only show when centers available */}
      {featuredCenters.length > 0 && (
        <section className="section-padding">
          <div className="container">
            <div className="mb-12 text-center">
              <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">
                Treatment Centers with Holistic Programs
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Find treatment facilities that offer comprehensive holistic therapy options.
              </p>
            </div>
            {/* Horizontal scroll on mobile, grid on larger screens */}
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
              {featuredCenters.map((center, index) => (
                <Link
                  key={center.id}
                  to={center.slug ? `/center/${center.slug}` : `/rehab-centers`}
                  className="flex-shrink-0 w-[280px] md:w-auto snap-center group rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <h3 className="mb-2 font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {center.name}
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {center.city}, {center.state}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-accent">
                    View Details
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
            
            {/* Scroll indicator for mobile */}
            <div className="flex justify-center gap-1.5 mt-3 md:hidden">
              <span className="text-xs text-muted-foreground/70">← Swipe →</span>
            </div>
            <div className="mt-8 text-center">
              <Link to="/search-results?type=holistic">
                <Button variant="outline" className="gap-2">
                  View All Holistic Centers
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      <section className="bg-muted/30 section-padding">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Common questions about holistic therapy in addiction treatment.
            </p>
          </div>
          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`faq-${index}`}
                  className="rounded-xl border border-border bg-card px-6 shadow-card"
                >
                  <AccordionTrigger className="text-left font-display text-base font-semibold text-foreground hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Other Treatment Types */}
      <section className="section-padding-sm">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">
              Explore Other Treatment Types
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {otherTreatmentTypes.map((type) => (
              <Link key={type.title} to={type.link}>
                <Button variant="outline" className="gap-2">
                  {type.title}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="section-padding">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-12 text-center">
            <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl">
              Ready to Explore Holistic Treatment?
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Our specialists can help you find programs that combine holistic therapies with evidence-based addiction treatment.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/rehab-centers">
                <Button size="lg" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Find Treatment
                </Button>
              </Link>
              <Link to="/rehab-centers">
                <Button variant="outline" size="lg" className="gap-2">
                  Browse All Centers
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HolisticTherapy;
