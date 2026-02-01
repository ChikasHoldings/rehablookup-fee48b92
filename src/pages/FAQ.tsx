import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateFAQSchema } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Search, 
  HelpCircle, 
  ArrowRight,
  Heart,
  Phone,
  Lock,
  Stethoscope,
  DollarSign,
  Building2,
  ChevronRight,
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  faqs: FAQItem[];
}

interface SearchSuggestion {
  question: string;
  categoryId: string;
  categoryName: string;
}

const faqCategories: FAQCategory[] = [
  {
    id: "getting-help",
    name: "Getting Help",
    icon: Phone,
    description: "Starting your journey to recovery",
    faqs: [
      {
        question: "How do I know if treatment is needed?",
        answer: "If substance use is affecting your health, relationships, work, or daily responsibilities, it may be time to seek help. Common signs include difficulty controlling use, experiencing withdrawal symptoms, and continuing despite negative consequences. Speaking with a healthcare professional or addiction specialist can help clarify your situation and options."
      },
      {
        question: "What is the first step to getting help?",
        answer: "The first step is reaching out. You can call a treatment center directly, speak with your doctor, or use our Request Help form to connect with facilities that match your needs. Many people also start by talking to a trusted friend or family member. Remember, asking for help is a sign of strength."
      },
      {
        question: "Can I get help for someone else?",
        answer: "Yes. Many families initiate the process on behalf of a loved one. You can research facilities, verify insurance, and even arrange admissions. However, for voluntary treatment, the individual must ultimately agree to participate. Professional interventionists can help if your loved one is resistant to seeking help."
      },
      {
        question: "Is treatment available 24/7?",
        answer: "Most treatment centers have admissions teams available around the clock. Crisis situations can be addressed immediately, and many facilities offer same-day or next-day intake assessments. Our support team is also available 24/7 to help you find appropriate care quickly."
      },
      {
        question: "What if I'm not ready for rehab but need support?",
        answer: "There are many levels of care available. Outpatient counseling, support groups like AA or NA, and telehealth therapy offer support without requiring residential treatment. Speaking with a professional can help you understand your options and find an approach that feels right for where you are."
      }
    ]
  },
  {
    id: "matching-privacy",
    name: "Matching & Privacy",
    icon: Lock,
    description: "How we connect you with care",
    faqs: [
      {
        question: "How does RehabLookup match me with treatment centers?",
        answer: "We consider your location preferences, insurance coverage, treatment needs (substance type, co-occurring conditions), and program preferences (inpatient vs. outpatient, specialized programs). Our goal is to connect you with facilities that genuinely fit your situation, not just any available option."
      },
      {
        question: "Is my information kept confidential?",
        answer: "Absolutely. Your privacy is protected by HIPAA regulations and our strict privacy policies. We only share your contact information with facilities you specifically select. We never sell your data to third parties, and all communications are encrypted."
      },
      {
        question: "Will my employer find out if I seek treatment?",
        answer: "Treatment records are protected health information and cannot be disclosed to employers without your consent. Many people use FMLA (Family and Medical Leave Act) to take time off for treatment without disclosing the specific reason. Your treatment center can provide guidance on protecting your privacy."
      },
      {
        question: "Can I remain anonymous when searching?",
        answer: "Yes. You can browse our directory, read about treatment options, and research facilities without providing any personal information. You only share your details when you choose to contact a specific facility or request personalized help."
      },
      {
        question: "How do you verify treatment centers?",
        answer: "We verify state licensing, accreditation from organizations like The Joint Commission or CARF, and confirm that facilities meet quality standards. Our team regularly reviews listings for accuracy and monitors feedback to ensure the information we provide is trustworthy."
      }
    ]
  },
  {
    id: "treatment-options",
    name: "Treatment Options",
    icon: Stethoscope,
    description: "Understanding different programs",
    faqs: [
      {
        question: "What is the difference between inpatient and outpatient?",
        answer: "Inpatient (residential) treatment means living at the facility full-time, typically for 30-90 days, with 24/7 support and structured programming. Outpatient treatment allows you to live at home while attending scheduled sessions. The right choice depends on the severity of addiction, your support system at home, and personal circumstances."
      },
      {
        question: "What is medical detox?",
        answer: "Medical detoxification is supervised withdrawal from substances in a clinical setting. Medical staff monitor vital signs and provide medications to manage withdrawal symptoms safely. Detox is typically necessary for alcohol, opioids, and benzodiazepines, where withdrawal can be medically serious."
      },
      {
        question: "What therapies are used in treatment?",
        answer: "Evidence-based approaches include Cognitive Behavioral Therapy (CBT), Dialectical Behavior Therapy (DBT), Motivational Interviewing, and group therapy. Many programs also offer family therapy, trauma-informed care, and holistic options like meditation, yoga, and art therapy. Treatment is typically individualized."
      },
      {
        question: "How long does treatment typically last?",
        answer: "Program lengths vary: detox typically lasts 5-10 days, short-term residential is usually 28-30 days, and long-term programs run 60-90 days or longer. Outpatient programs can last several months. Research suggests longer engagement with treatment supports better outcomes."
      },
      {
        question: "What is dual diagnosis treatment?",
        answer: "Dual diagnosis (or co-occurring disorders) treatment addresses both addiction and mental health conditions like depression, anxiety, or PTSD simultaneously. Treating both conditions together is important because they often influence each other. Many facilities specialize in this integrated approach."
      },
      {
        question: "What happens after completing a program?",
        answer: "Aftercare planning begins before discharge and typically includes ongoing therapy, support group participation, and possibly sober living arrangements. Many facilities offer alumni programs and continued support. Building a recovery-focused lifestyle with healthy routines and supportive relationships is key to long-term success."
      }
    ]
  },
  {
    id: "cost-insurance",
    name: "Cost & Insurance",
    icon: DollarSign,
    description: "Affording quality treatment",
    faqs: [
      {
        question: "Does insurance cover addiction treatment?",
        answer: "Most health insurance plans cover addiction treatment under mental health benefits, required by the Mental Health Parity Act. Coverage typically includes detox, residential, and outpatient programs. The extent of coverage depends on your specific plan. We can help you verify your benefits with facilities."
      },
      {
        question: "What if I do not have insurance?",
        answer: "Many options exist for those without insurance: state-funded programs, sliding scale fees based on income, payment plans, scholarships, and nonprofit treatment centers. Medicaid covers treatment in many states. Do not let concerns about cost prevent you from exploring your options."
      },
      {
        question: "How much does treatment cost without insurance?",
        answer: "Costs vary significantly: outpatient programs may range from $1,000-$10,000, while residential treatment can cost $10,000-$30,000 or more per month. Luxury facilities charge higher rates. However, many effective programs exist at various price points, and most will work with you on payment."
      },
      {
        question: "Can I use HSA or FSA funds for treatment?",
        answer: "Yes. Health Savings Accounts and Flexible Spending Accounts can typically be used for addiction treatment expenses, including detox, therapy, residential care, and prescribed medications. Check with your account administrator for specific eligible expenses."
      },
      {
        question: "What is in-network vs. out-of-network coverage?",
        answer: "In-network facilities have contracts with your insurance company, usually resulting in lower out-of-pocket costs. Out-of-network facilities may still be covered, but at a higher cost to you. Some insurance plans offer out-of-network benefits while others do not. Always verify coverage before admission."
      }
    ]
  },
  {
    id: "for-providers",
    name: "For Providers",
    icon: Building2,
    description: "Information for treatment facilities",
    faqs: [
      {
        question: "How can my facility be listed on RehabLookup?",
        answer: "Treatment centers can apply through our For Providers page. Listing is completely free. We review licensing, accreditation, and credentials before approval. All facilities must meet our quality standards and provide accurate information. The listing process is straightforward and our team is available to assist."
      },
      {
        question: "What are the requirements to be listed?",
        answer: "Facilities must have valid state licensing, appropriate accreditation, and a track record of providing quality care. We verify credentials and may request documentation. Facilities must keep their profile information accurate and current."
      },
      {
        question: "How are inquiries distributed?",
        answer: "When a family expresses interest in treatment, we notify matching facilities based on location, services, and insurance accepted. Providers can choose to unlock inquiries they want to respond to—you only pay when you decide to connect."
      },
      {
        question: "Is there a cost to list my facility?",
        answer: "Listing your facility is completely free. You only pay when you choose to unlock an inquiry to view contact details and connect with a family. There are no monthly fees or hidden charges. An optional Pro upgrade is available for enhanced visibility."
      },
      {
        question: "How do I update my facility information?",
        answer: "Listed providers can access their dashboard to update contact information, services offered, insurance accepted, and other details. Changes are reviewed to ensure accuracy before going live. Our support team can assist with any updates or questions."
      }
    ]
  }
];

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  // Generate search suggestions
  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase();
    const suggestions: SearchSuggestion[] = [];
    
    faqCategories.forEach(category => {
      category.faqs.forEach(faq => {
        if (faq.question.toLowerCase().includes(query)) {
          suggestions.push({
            question: faq.question,
            categoryId: category.id,
            categoryName: category.name
          });
        }
      });
    });
    
    return suggestions.slice(0, 6); // Limit to 6 suggestions
  }, [searchQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || searchSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < searchSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev > 0 ? prev - 1 : searchSuggestions.length - 1
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(searchSuggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.question);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setTimeout(() => scrollToCategory(suggestion.categoryId), 100);
  };

  // Scroll to category based on URL hash
  const scrollToCategory = useCallback((categoryId: string) => {
    const element = document.getElementById(categoryId);
    if (element) {
      const headerOffset = 140; // Account for sticky header + filters
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  }, []);

  // Handle URL hash on load and changes
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && faqCategories.some(cat => cat.id === hash)) {
      setSelectedCategory(null); // Clear filter to show all categories
      setTimeout(() => scrollToCategory(hash), 100);
    }
  }, [location.hash, scrollToCategory]);


  const filteredCategories = useMemo(() => {
    if (!searchQuery) return faqCategories;
    
    return faqCategories
      .map(category => ({
        ...category,
        faqs: category.faqs.filter(faq => 
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }))
      .filter(category => category.faqs.length > 0);
  }, [searchQuery]);

  // Display categories - all when not searching, filtered when searching
  const displayCategories = searchQuery ? filteredCategories : faqCategories;

  const totalResults = filteredCategories.reduce((acc, cat) => acc + cat.faqs.length, 0);

  // Generate FAQ structured data
  const allFaqsForSchema = faqCategories.flatMap(cat => 
    cat.faqs.map(faq => ({ question: faq.question, answer: faq.answer }))
  );

  return (
    <Layout>
      <SEO
        title="Addiction Treatment FAQ | RehabLookup"
        description="Get answers about addiction treatment, insurance coverage, family support, and recovery. Learn how RehabLookup helps you find the right rehab center."
        canonical="/faq"
        structuredData={generateFAQSchema(allFaqsForSchema)}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "FAQ", url: "/faq" },
        ]}
      />
      
      {/* Hero Section */}
      <section className="relative bg-primary py-10 px-4 md:py-14 overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-accent/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container relative">
          {/* Breadcrumb */}
          <nav className="mb-5 flex items-center gap-2 text-sm text-white/70">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">FAQ</span>
          </nav>
          
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-3 text-2xl font-bold text-primary-foreground md:text-3xl">
              Addiction Treatment FAQ
            </h1>
            <p className="mb-6 text-sm text-primary-foreground/80 leading-relaxed max-w-lg mx-auto md:text-base">
              Find answers to common questions about finding treatment, costs, privacy, and how RehabLookup works.
            </p>
            
            {/* Search Bar with Suggestions */}
            <div className="relative mx-auto max-w-md" ref={searchContainerRef}>
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                className="h-11 rounded-lg border-0 bg-card pl-11 pr-10 text-sm shadow-lg placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors z-10"
                  aria-label="Clear search"
                >
                  <svg className="h-3 w-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              
              {/* Search Suggestions Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-lg shadow-xl border border-border overflow-hidden z-50">
                  <ul className="py-1 max-h-80 overflow-y-auto">
                    {searchSuggestions.map((suggestion, index) => (
                      <li key={`${suggestion.categoryId}-${index}`}>
                        <button
                          onClick={() => handleSuggestionClick(suggestion)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={`w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors ${
                            highlightedIndex === index 
                              ? "bg-accent/10" 
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <span className="text-sm font-medium text-foreground line-clamp-2">
                            {suggestion.question}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            in {suggestion.categoryName}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border bg-muted/30">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">↑↓</kbd> to navigate • <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> to select
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Jump Navigation */}
      <section className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md py-2.5 px-4 shadow-sm">
        <div className="container">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 md:flex-wrap md:justify-center md:overflow-visible md:pb-0 md:mx-0 md:px-0 scrollbar-hide">
            <button
              onClick={() => {
                setSelectedCategory(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="h-8 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 bg-primary text-primary-foreground"
            >
              All
            </button>
            {faqCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(null);
                  setTimeout(() => scrollToCategory(category.id), 50);
                }}
                className="h-8 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted"
              >
                <category.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{category.name}</span>
                <span className="sm:hidden">{category.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-10 px-4 md:py-14 md:px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="container">
          {/* Search Results Info */}
          {searchQuery && (
            <div className="mb-6 flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-sm">
                <Search className="h-3.5 w-3.5 text-accent" />
                <span className="text-muted-foreground">
                  Found <span className="font-semibold text-foreground">{totalResults}</span> result{totalResults !== 1 ? 's' : ''} for 
                  <span className="font-semibold text-foreground ml-1">"{searchQuery}"</span>
                </span>
              </div>
              <button
                onClick={() => setSearchQuery("")}
                className="text-sm text-accent hover:underline"
              >
                Clear
              </button>
            </div>
          )}

          {displayCategories.length === 0 ? (
            <div className="mx-auto max-w-md text-center py-12">
              <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-display text-xl font-bold text-foreground">No Results Found</h3>
              <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
                We couldn't find any questions matching your search. Try different keywords or browse by category.
              </p>
              <Button 
                onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                className="h-10 px-6 gap-2 text-sm"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                View All Questions
              </Button>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-12">
              {displayCategories.map((category, catIndex) => (
                <div 
                  key={category.id}
                  id={category.id}
                  className="animate-fade-in scroll-mt-32"
                  style={{ animationDelay: `${catIndex * 80}ms` }}
                >
                  {/* Category Header - inline icon with heading */}
                  <div className="mb-6 pb-3 border-b border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <category.icon className="h-5 w-5 text-primary shrink-0" />
                      <h2 className="text-lg font-semibold text-foreground md:text-xl">
                        {category.name}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground ml-7">{category.description}</p>
                  </div>

                  {/* FAQ Accordion - standardized typography */}
                  <Accordion type="single" collapsible className="space-y-2.5">
                    {category.faqs.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`${category.id}-${index}`}
                        className="group border border-border rounded-lg bg-card overflow-hidden transition-all duration-200 hover:border-primary/20 data-[state=open]:border-primary/30 data-[state=open]:shadow-sm"
                      >
                        <AccordionTrigger className="text-left py-4 px-4 md:px-5 gap-3 hover:no-underline [&>svg]:shrink-0 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted-foreground [&>svg]:transition-colors [&[data-state=open]>svg]:text-primary">
                          <span className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors md:text-base">
                            {faq.question}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 md:px-5 md:pb-5">
                          <p className="text-sm text-muted-foreground leading-relaxed md:text-base md:leading-relaxed">
                            {faq.answer}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Help CTA - Compact horizontal layout */}
      <section className="py-8 px-4 bg-muted/30 md:py-10 md:px-6">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-xl border border-accent/20 bg-gradient-to-r from-accent/5 via-card to-accent/10 p-6 md:p-8 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-accent/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-primary/5 rounded-full blur-xl" />
            
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    Still Have Questions?
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                    Our compassionate support team is here to help you find the right treatment center.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-8 md:ml-0">
                <Link to="/concierge">
                  <Button size="sm" className="h-9 gap-2 text-sm font-semibold px-4">
                    <Heart className="h-4 w-4" />
                    Get Matched
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="sm" className="h-9 gap-2 text-sm font-semibold px-4">
                    Contact Us
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

export default FAQ;