import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateFAQSchema } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import {
  Search, HelpCircle, ArrowRight, Heart, Phone, Lock,
  Stethoscope, DollarSign, Building2, X, Shield, CheckCircle,
  ChevronDown,
} from "lucide-react";
import MedicalPatternBackground from "@/components/backgrounds/MedicalPatternBackground";
import { cn } from "@/lib/utils";

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

// Custom FAQ item with smooth expand/collapse
function FAQAccordionItem({ faq, isOpen, onToggle }: { faq: FAQItem; isOpen: boolean; onToggle: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen]);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-all duration-200",
        isOpen
          ? "border-primary/30 shadow-sm ring-1 ring-primary/10"
          : "border-border hover:border-primary/20"
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className={cn(
          "text-sm font-semibold leading-snug transition-colors",
          isOpen ? "text-primary" : "text-foreground"
        )}>
          {faq.question}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180 text-primary"
        )} />
      </button>
      <div
        className="overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height }}
      >
        <div ref={contentRef}>
          <div className="px-5 pb-5 pt-0">
            <div className="h-px bg-border mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  const toggleItem = useCallback((key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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
  const totalQuestions = faqCategories.flatMap(c => c.faqs).length;

  // Auto-expand matching results when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const matchingKeys = new Set<string>();
      filteredCategories.forEach(cat => {
        cat.faqs.forEach((_, idx) => {
          matchingKeys.add(`${cat.id}-${idx}`);
        });
      });
      setOpenItems(matchingKeys);
    } else {
      setOpenItems(new Set());
    }
  }, [searchQuery, filteredCategories]);

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

  const handleCategoryClick = (catId: string | null) => {
    setActiveCategory(catId);
    setOpenItems(new Set());
    setSearchQuery("");
  };

  const expandAll = () => {
    const all = new Set<string>();
    filteredCategories.forEach(cat => {
      cat.faqs.forEach((_, idx) => all.add(`${cat.id}-${idx}`));
    });
    setOpenItems(all);
  };

  const collapseAll = () => setOpenItems(new Set());

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

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary py-10 md:py-12">
        <MedicalPatternBackground />
        <div className="container relative z-10">
          <BreadcrumbNav
            className="mb-4"
            variant="dark"
            items={[
              { label: "Home", href: "/" },
              { label: "FAQ" },
            ]}
          />

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4 text-sm font-medium text-white/90 backdrop-blur-sm">
              <HelpCircle className="h-4 w-4" />
              <span>Frequently Asked Questions</span>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white mb-3 leading-tight tracking-tight">
              Your Questions, Answered
            </h1>
            <p className="text-base text-white/80 leading-relaxed max-w-lg">
              Everything you need to know about finding treatment, understanding your options, and how RehabLookup helps.
            </p>
          </div>

          {/* Search in hero */}
          <div className="relative max-w-md mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              ref={searchRef}
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

          {/* Quick stats */}
          <div className="mt-5 flex items-center gap-6 text-white/70 text-sm">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4" />
              <span>{totalQuestions} Questions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" />
              <span>Verified Info</span>
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills (horizontal on mobile, replace sidebar) */}
      <section className="border-b border-border bg-card sticky top-[68px] z-20">
        <div className="container">
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => handleCategoryClick(null)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                !activeCategory
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              All
              <span className="text-xs opacity-70">({totalQuestions})</span>
            </button>
            {faqCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <cat.icon className="h-3.5 w-3.5" />
                {cat.name}
                <span className="text-xs opacity-70">({cat.faqs.length})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10 md:py-14 bg-gradient-to-b from-background to-muted/20">
        <div className="container">
          {/* Search results indicator */}
          {searchQuery && (
            <div className="mb-6 flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm">
                <Search className="h-3.5 w-3.5 text-accent" />
                <span className="text-muted-foreground">
                  Found <span className="font-semibold text-foreground tabular-nums">{totalResults}</span> result{totalResults !== 1 ? "s" : ""} for &ldquo;<span className="font-semibold text-foreground">{searchQuery}</span>&rdquo;
                </span>
              </div>
              <button onClick={() => setSearchQuery("")} className="text-sm text-primary hover:underline">Clear</button>
            </div>
          )}

          {/* Expand/Collapse controls */}
          {!searchQuery && filteredCategories.length > 0 && (
            <div className="flex items-center justify-end gap-3 mb-6">
              <button onClick={expandAll} className="text-xs text-primary hover:underline font-medium">
                Expand All
              </button>
              <span className="text-border">|</span>
              <button onClick={collapseAll} className="text-xs text-primary hover:underline font-medium">
                Collapse All
              </button>
            </div>
          )}

          <div className="max-w-3xl mx-auto">
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
                  <div key={category.id} id={category.id} className="scroll-mt-36">
                    {/* Category header */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <category.icon className="h-[18px] w-[18px] text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-display font-bold text-foreground">{category.name}</h2>
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {category.faqs.length} questions
                      </span>
                    </div>

                    <div className="border-t border-border mb-5" />

                    {/* FAQ items */}
                    <div className="space-y-2.5">
                      {category.faqs.map((faq, index) => {
                        const key = `${category.id}-${index}`;
                        return (
                          <FAQAccordionItem
                            key={key}
                            faq={faq}
                            isOpen={openItems.has(key)}
                            onToggle={() => toggleItem(key)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
