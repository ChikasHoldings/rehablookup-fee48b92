import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateFAQSchema } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { scrollToTopSmooth } from "@/hooks/useScrollToTop";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search, HelpCircle, ArrowRight, Heart, Phone, Lock,
  Stethoscope, DollarSign, Building2, X, Shield, CheckCircle,
  MessageCircle, Clock,
} from "lucide-react";
import heroImg from "@/assets/images/faq-hero-seeker.jpg";
import MedicalPatternBackground from "@/components/backgrounds/MedicalPatternBackground";

interface FAQItem { question: string; answer: string; }
interface FAQCategory { id: string; name: string; icon: React.ElementType; description: string; faqs: FAQItem[]; }

const faqCategories: FAQCategory[] = [
  {
    id: "getting-help",
    name: "Getting Help",
    icon: Phone,
    description: "Starting your journey to recovery",
    faqs: [
      { question: "How do I know if treatment is needed?", answer: "If substance use is affecting your health, relationships, work, or daily responsibilities, it may be time to seek help. Common signs include difficulty controlling use, experiencing withdrawal symptoms, and continuing despite negative consequences. Speaking with a healthcare professional or addiction specialist can help clarify your situation and options." },
      { question: "What is the first step to getting help?", answer: "The first step is reaching out. You can call a treatment center directly, speak with your doctor, or use our concierge service to connect with facilities that match your needs. Many people also start by talking to a trusted friend or family member. Remember, asking for help is a sign of strength." },
      { question: "Can I get help for someone else?", answer: "Yes. Many families initiate the process on behalf of a loved one. You can research facilities, verify insurance, and even arrange admissions. However, for voluntary treatment, the individual must ultimately agree to participate. Professional interventionists can help if your loved one is resistant to seeking help." },
      { question: "Is treatment available 24/7?", answer: "Most treatment centers have admissions teams available around the clock. Crisis situations can be addressed immediately, and many facilities offer same-day or next-day intake assessments. Our support team is also available to help you find appropriate care quickly." },
      { question: "What if I'm not ready for rehab but need support?", answer: "There are many levels of care available. Outpatient counseling, support groups like AA or NA, and telehealth therapy offer support without requiring residential treatment. Speaking with a professional can help you understand your options and find an approach that feels right for where you are." },
    ],
  },
  {
    id: "matching-privacy",
    name: "Placement & Privacy",
    icon: Lock,
    description: "How we connect you with care",
    faqs: [
      { question: "How does RehabLookup match me with treatment centers?", answer: "We consider your location preferences, insurance coverage, treatment needs (substance type, co-occurring conditions), and program preferences (inpatient vs. outpatient, specialized programs). Our goal is to connect you with facilities that genuinely fit your situation, not just any available option." },
      { question: "Is my information kept confidential?", answer: "Absolutely. Your privacy is protected by HIPAA regulations and our strict privacy policies. We only share your contact information with facilities you specifically select. We never sell your data to third parties, and all communications are encrypted." },
      { question: "Will my employer find out if I seek treatment?", answer: "Treatment records are protected health information and cannot be disclosed to employers without your consent. Many people use FMLA (Family and Medical Leave Act) to take time off for treatment without disclosing the specific reason. Your treatment center can provide guidance on protecting your privacy." },
      { question: "Can I remain anonymous when searching?", answer: "Yes. You can browse our directory, read about treatment options, and research facilities without providing any personal information. You only share your details when you choose to contact a specific facility or request personalized help." },
      { question: "How do you verify treatment centers?", answer: "We verify state licensing, accreditation from organizations like The Joint Commission or CARF, and confirm that facilities meet quality standards. Our team regularly reviews listings for accuracy and monitors feedback to ensure the information we provide is trustworthy." },
    ],
  },
  {
    id: "treatment-options",
    name: "Treatment Options",
    icon: Stethoscope,
    description: "Understanding different programs",
    faqs: [
      { question: "What is the difference between inpatient and outpatient?", answer: "Inpatient (residential) treatment means living at the facility full-time, typically for 30-90 days, with 24/7 support and structured programming. Outpatient treatment allows you to live at home while attending scheduled sessions. The right choice depends on the severity of addiction, your support system at home, and personal circumstances." },
      { question: "What is medical detox?", answer: "Medical detoxification is supervised withdrawal from substances in a clinical setting. Medical staff monitor vital signs and provide medications to manage withdrawal symptoms safely. Detox is typically necessary for alcohol, opioids, and benzodiazepines, where withdrawal can be medically serious." },
      { question: "What therapies are used in treatment?", answer: "Evidence-based approaches include Cognitive Behavioral Therapy (CBT), Dialectical Behavior Therapy (DBT), Motivational Interviewing, and group therapy. Many programs also offer family therapy, trauma-informed care, and holistic options like meditation, yoga, and art therapy." },
      { question: "How long does treatment typically last?", answer: "Program lengths vary: detox typically lasts 5-10 days, short-term residential is usually 28-30 days, and long-term programs run 60-90 days or longer. Outpatient programs can last several months. Research suggests longer engagement with treatment supports better outcomes." },
      { question: "What is dual diagnosis treatment?", answer: "Dual diagnosis (or co-occurring disorders) treatment addresses both addiction and mental health conditions like depression, anxiety, or PTSD simultaneously. Treating both conditions together is important because they often influence each other." },
      { question: "What happens after completing a program?", answer: "Aftercare planning begins before discharge and typically includes ongoing therapy, support group participation, and possibly sober living arrangements. Many facilities offer alumni programs and continued support. Building a recovery-focused lifestyle with healthy routines and supportive relationships is key to long-term success." },
    ],
  },
  {
    id: "cost-insurance",
    name: "Cost & Insurance",
    icon: DollarSign,
    description: "Affording quality treatment",
    faqs: [
      { question: "Does insurance cover addiction treatment?", answer: "Most health insurance plans cover addiction treatment under mental health benefits, required by the Mental Health Parity Act. Coverage typically includes detox, residential, and outpatient programs. The extent of coverage depends on your specific plan. We can help you verify your benefits with facilities." },
      { question: "What if I do not have insurance?", answer: "Many options exist for those without insurance: state-funded programs, sliding scale fees based on income, payment plans, scholarships, and nonprofit treatment centers. Medicaid covers treatment in many states. Do not let concerns about cost prevent you from exploring your options." },
      { question: "How much does treatment cost without insurance?", answer: "Costs vary significantly: outpatient programs may range from $1,000-$10,000, while residential treatment can cost $10,000-$30,000 or more per month. Luxury facilities charge higher rates. However, many effective programs exist at various price points, and most will work with you on payment." },
      { question: "Can I use HSA or FSA funds for treatment?", answer: "Yes. Health Savings Accounts and Flexible Spending Accounts can typically be used for addiction treatment expenses, including detox, therapy, residential care, and prescribed medications. Check with your account administrator for specific eligible expenses." },
      { question: "What is in-network vs. out-of-network coverage?", answer: "In-network facilities have contracts with your insurance company, usually resulting in lower out-of-pocket costs. Out-of-network facilities may still be covered, but at a higher cost to you. Some insurance plans offer out-of-network benefits while others do not. Always verify coverage before admission." },
    ],
  },
  {
    id: "about-rehablookup",
    name: "About RehabLookup",
    icon: Building2,
    description: "How our platform works",
    faqs: [
      { question: "Is RehabLookup free to use?", answer: "Yes. Browsing our directory, reading treatment guides, and using our search tools are completely free. Our concierge placement service helps match you with the right facility based on your unique needs." },
      { question: "How are treatment centers listed on RehabLookup?", answer: "Treatment centers apply through our provider portal. We verify their licensing, accreditations, and credentials before listing. All facilities must meet our quality standards and keep their profile information accurate and current." },
      { question: "Does RehabLookup recommend specific facilities?", answer: "Our concierge team provides personalized recommendations based on your treatment needs, insurance, location preference, and budget. We match based on clinical fit, not advertising spend, ensuring you receive honest, unbiased guidance." },
      { question: "How do I contact RehabLookup for help?", answer: "You can reach us through our Contact page, or use our concierge service for personalized placement assistance. Our team is available to answer questions and help guide you through the process of finding the right treatment center." },
    ],
  },
];

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const filteredCategories = useMemo(() => {
    const cats = activeCategory
      ? faqCategories.filter((c) => c.id === activeCategory)
      : faqCategories;

    if (!searchQuery.trim()) return cats;

    const q = searchQuery.toLowerCase();
    return cats
      .map((c) => ({
        ...c,
        faqs: c.faqs.filter(
          (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
        ),
      }))
      .filter((c) => c.faqs.length > 0);
  }, [searchQuery, activeCategory]);

  const totalResults = filteredCategories.reduce((a, c) => a + c.faqs.length, 0);

  const scrollToCategory = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = el.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash && faqCategories.some((c) => c.id === hash)) {
      setActiveCategory(null);
      setTimeout(() => scrollToCategory(hash), 100);
    }
  }, [location.hash, scrollToCategory]);

  const allFaqsForSchema = faqCategories.flatMap((c) =>
    c.faqs.map((f) => ({ question: f.question, answer: f.answer }))
  );

  return (
    <Layout>
      <SEO
        title="Addiction Treatment FAQ | RehabLookup"
        description="Get answers about addiction treatment, insurance coverage, privacy, and recovery. Learn how RehabLookup helps you find the right rehab center."
        canonical="/faq"
        structuredData={generateFAQSchema(allFaqsForSchema)}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "FAQ", url: "/faq" },
        ]}
      />

      {/* Hero — Split Screen */}
      <section className="relative bg-primary overflow-hidden">
        <div className="container">
        <MedicalPatternBackground />
          <div className="grid lg:grid-cols-2 gap-0 items-stretch min-h-[320px]">
            {/* Left: Content */}
            <div className="flex flex-col justify-center py-12 lg:py-16 lg:pr-12 relative z-10">
              <nav className="mb-4">
                <span className="inline-flex items-center gap-2 text-sm">
                  <Link to="/" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Home</Link>
                  <span className="text-primary-foreground/40">/</span>
                  <span className="text-primary-foreground font-medium">FAQ</span>
                </span>
              </nav>
              <div className="inline-flex items-center gap-2 bg-primary-foreground/10 border border-primary-foreground/15 rounded-full px-4 py-1.5 mb-5 w-fit">
                <HelpCircle className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-primary-foreground/90">Frequently Asked Questions</span>
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-primary-foreground mb-4 leading-tight">
                Your Questions, Answered
              </h1>
              <p className="text-base text-primary-foreground/80 leading-relaxed max-w-lg mb-6">
                Everything you need to know about finding treatment, understanding your options, insurance coverage, and how RehabLookup helps you take the first step.
              </p>

              {/* Search */}
              <div className="relative max-w-md" ref={searchRef}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  type="text"
                  placeholder="Search questions…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 rounded-xl border-0 bg-card pl-11 pr-10 text-sm shadow-xl placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors z-10"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Image */}
            <div className="hidden lg:block relative">
              <img
                src={heroImg}
                alt="Healthcare consultation"
                className="absolute inset-0 w-full h-full object-cover"
                width={800}
                height={600}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex items-center justify-center gap-8 md:gap-14 text-center">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{faqCategories.flatMap(c => c.faqs).length}+ Questions</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">HIPAA Compliant</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">24/7 Support</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Verified Centers</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content — Sidebar + FAQ */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="container">
          {/* Search results indicator */}
          {searchQuery && (
            <div className="mb-8 flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm">
                <Search className="h-3.5 w-3.5 text-accent" />
                <span className="text-muted-foreground">
                  Found <span className="font-semibold text-foreground">{totalResults}</span> result{totalResults !== 1 ? "s" : ""} for "<span className="font-semibold text-foreground">{searchQuery}</span>"
                </span>
              </div>
              <button onClick={() => setSearchQuery("")} className="text-sm text-primary hover:underline">Clear</button>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-10">
            {/* Sidebar — Category Nav */}
            <aside className="lg:w-64 shrink-0">
              <div className="lg:sticky lg:top-24">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Categories</h3>
                <nav className="space-y-1">
                  <button
                    onClick={() => { setActiveCategory(null); scrollToTopSmooth(); }}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                      !activeCategory ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <HelpCircle className="h-4 w-4 shrink-0" />
                    All Questions
                  </button>
                  {faqCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(activeCategory === cat.id ? null : cat.id);
                        scrollToTopSmooth();
                      }}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                        activeCategory === cat.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <cat.icon className="h-4 w-4 shrink-0" />
                      {cat.name}
                      <span className="ml-auto text-xs opacity-70">{cat.faqs.length}</span>
                    </button>
                  ))}
                </nav>

                {/* Sidebar CTA */}
                <div className="mt-8 rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-accent" />
                    <p className="text-sm font-semibold text-foreground">Need Help?</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    Our specialists can match you with the right treatment center.
                  </p>
                  <Link to="/concierge">
                    <Button size="sm" className="w-full gap-1.5 h-9 text-xs font-semibold">
                      Find Treatment <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </aside>

            {/* FAQ Content */}
            <div className="flex-1 min-w-0">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-16">
                  <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">No Results Found</h3>
                  <p className="text-sm text-muted-foreground mb-6">Try different keywords or browse by category.</p>
                  <Button onClick={() => { setSearchQuery(""); setActiveCategory(null); }} variant="outline" className="gap-2">
                    View All Questions
                  </Button>
                </div>
              ) : (
                <div className="space-y-10">
                  {filteredCategories.map((category) => (
                    <div key={category.id} id={category.id} className="scroll-mt-32">
                      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <category.icon className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-lg font-display font-bold text-foreground">{category.name}</h2>
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        </div>
                      </div>

                      <Accordion type="single" collapsible className="space-y-2">
                        {category.faqs.map((faq, index) => (
                          <AccordionItem
                            key={index}
                            value={`${category.id}-${index}`}
                            className="group border border-border rounded-xl bg-card overflow-hidden transition-all hover:border-primary/20 data-[state=open]:border-primary/30 data-[state=open]:shadow-sm"
                          >
                            <AccordionTrigger className="text-left py-4 px-5 gap-3 hover:no-underline [&>svg]:shrink-0 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted-foreground [&[data-state=open]>svg]:text-primary">
                              <span className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                                {faq.question}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="px-5 pb-5">
                              <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-10 bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/5 via-card to-accent/10 p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-3xl" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 shrink-0">
                  <HelpCircle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold text-foreground mb-1">Still Have Questions?</h2>
                  <p className="text-sm text-muted-foreground">Our compassionate team is here to help you find the right path forward.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-13 md:ml-0">
                <Link to="/concierge">
                  <Button className="gap-2 font-semibold">
                    <Heart className="h-4 w-4" />
                    Find Treatment
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" className="gap-2 font-semibold">
                    Contact Us <ArrowRight className="h-4 w-4" />
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

export default FAQ;
