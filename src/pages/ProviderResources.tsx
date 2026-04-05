import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileText,
  BookOpen,
  Download,
  HelpCircle,
  Users,
  TrendingUp,
  Shield,
  Lightbulb,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  MessageSquare,
  BarChart3,
  Award,
  Sparkles,
} from "lucide-react";


const resources = [
  {
    icon: FileText,
    title: "Listing Guidelines",
    description: "Learn how to optimize your facility listing for maximum visibility and engagement with families seeking treatment.",
    link: "#listing-tips",
    badge: "Essential",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    icon: BookOpen,
    title: "Best Practices Guide",
    description: "Industry best practices for treatment centers to improve patient outcomes and boost your online presence.",
    link: "/resources/grow-treatment-center-census",
    badge: "Popular",
    color: "from-purple-500/20 to-pink-500/20",
  },
  {
    icon: Download,
    title: "Success Rate Insights",
    description: "Understand treatment success metrics and how to communicate outcomes effectively to prospective clients.",
    link: "/resources/rehab-success-rates",
    badge: null,
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    icon: TrendingUp,
    title: "What to Expect Guide",
    description: "Help families understand the treatment journey with our comprehensive guide to share with prospective patients.",
    link: "/resources/what-to-expect-in-rehab",
    badge: null,
    color: "from-indigo-500/20 to-violet-500/20",
  },
  {
    icon: Shield,
    title: "Accreditation Resources",
    description: "Stay up-to-date with JCAHO, CARF accreditation requirements and industry compliance standards.",
    link: "/resources/rehab-accreditation-guide",
    badge: "Updated",
    color: "from-teal-500/20 to-cyan-500/20",
  },
];

const quickTips = [
  {
    icon: Star,
    title: "Complete Your Profile",
    description: "Listings with 100% completion get 3x more leads",
    stat: "3x",
  },
  {
    icon: Zap,
    title: "Respond Quickly",
    description: "Reply to leads within 1 hour for best conversion",
    stat: "1hr",
  },
  {
    icon: MessageSquare,
    title: "Add Testimonials",
    description: "Facilities with reviews see 40% higher engagement",
    stat: "40%",
  },
  {
    icon: BarChart3,
    title: "Check Analytics",
    description: "Track trends weekly to optimize your strategy",
    stat: "Weekly",
  },
];

const faqs = [
  {
    question: "How do I update my facility information?",
    answer: "Log into your provider dashboard and navigate to 'Edit Listing' to update your facility details, photos, treatment programs, and contact information. Changes are reviewed within 24 hours.",
  },
  {
    question: "How long does verification take?",
    answer: "The verification process typically takes 2-3 business days. We verify your licensing, accreditation, and credentials. You'll receive an email notification once your listing is verified and live.",
  },
  {
    question: "Can I respond to patient leads?",
    answer: "Yes, all leads are forwarded to your registered email immediately. You can also manage and track them through your provider dashboard, including setting follow-up reminders.",
  },
  {
    question: "How do I upgrade to Pro?",
    answer: "Visit your provider dashboard and click on 'Upgrade to Pro' to subscribe. Pro members get 20% off lead unlocks, up to 5 facility listings, and priority placement in search results.",
  },
  {
    question: "What analytics are available?",
    answer: "Your dashboard includes views, unique visitors, lead rates, conversion metrics, and engagement trends. Premium plans include advanced analytics with demographic insights.",
  },
  {
    question: "How do I add photos to my listing?",
    answer: "Go to your provider dashboard, select your facility, and click 'Manage Photos'. You can upload up to 20 high-quality images. We recommend including exterior, interior, and amenity photos.",
  },
  {
    question: "Can I have multiple facility listings?",
    answer: "Yes, if you operate multiple treatment centers, you can add each location separately from your provider dashboard. Each facility will have its own profile and analytics.",
  },
  {
    question: "What if I need to pause my listing?",
    answer: "You can temporarily pause your listing from the dashboard settings. This is useful during renovations or capacity limitations. Your listing data will be preserved.",
  },
];

const optimizationTips = [
  "Use high-quality photos of your facility (exterior, rooms, amenities)",
  "Write a compelling description highlighting unique programs",
  "List all insurance providers and payment options accepted",
  "Include staff credentials and accreditations",
  "Keep your contact information current",
  "Respond to leads within 1 hour for best results",
  "Add testimonials and success stories",
  "Update your listing regularly with new programs",
];

export default function ProviderResources() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SEO
        title="Provider Resources - Tools & Guides for Treatment Centers"
        description="Access guides, tutorials, and resources to maximize your treatment center's visibility on RehabLookup. Learn best practices for listing optimization."
        canonical="/provider-resources"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "For Providers", url: "/for-providers" },
          { name: "Resources", url: "/provider-resources" },
        ]}
      />
      
      
      <main className="flex-1">
        {/* Hero Section - Light Background, Streamlined */}
        <section className="relative bg-gradient-to-b from-muted/40 to-background py-12 md:py-16 overflow-hidden">
          {/* Subtle Decorative Elements */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          
          <div className="container relative z-10 px-5 md:px-6">
            <BreadcrumbNav
              className="mb-4"
              variant="light"
              items={[
                { label: "For Providers", href: "/for-providers" },
                { label: "Resources" },
              ]}
            />
            <div className="text-center max-w-3xl mx-auto">
              <div className="mb-4 md:mb-4 inline-flex items-center gap-2.5 md:gap-2 rounded-full bg-accent/10 px-5 md:px-4 py-2.5 md:py-1.5">
                <Sparkles className="h-5 w-5 md:h-4 md:w-4 text-accent" />
                <span className="text-base md:text-sm font-medium text-accent">Provider Resources</span>
              </div>
              <h1 className="mb-4 md:mb-3 font-display text-3xl md:text-3xl lg:text-4xl font-bold text-foreground">
                Tools & Guides for Success
              </h1>
              <p className="text-lg md:text-base text-muted-foreground max-w-2xl mx-auto mb-8">
                Access comprehensive guides, video tutorials, and tools to maximize your facility's visibility and connect with more families.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 md:gap-3 sm:flex-row">
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="gap-2 w-full sm:w-auto h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                    Access Dashboard
                    <ArrowRight className="h-5 w-5 md:h-4 md:w-4" />
                  </Button>
                </Link>
                <a href="#resources" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                    Browse Resources
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats Bar */}
        <section className="border-b border-border bg-card py-10">
          <div className="container px-5 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {quickTips.map((tip, index) => (
                <AnimatedCard key={tip.title} delay={index * 75}>
                  <div className="text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20">
                        <tip.icon className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 md:block">
                          <div className="font-display text-xl font-bold text-accent">{tip.stat}</div>
                          <h3 className="font-semibold text-foreground text-sm">{tip.title}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 hidden md:block">{tip.description}</p>
                      </div>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>

        {/* Resources Grid */}
        <section id="resources" className="py-20 md:py-24 scroll-mt-20">
          <div className="container px-5 md:px-6">
            <div className="mb-14 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <Lightbulb className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Tools & Resources</span>
              </div>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Resources to Maximize Your Success
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to optimize your listing, engage with leads, and grow your admissions.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {resources.map((resource, index) => {
                const isInternalLink = resource.link.startsWith('/');
                const cardContent = (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${resource.color} border border-white/50 transition-transform group-hover:scale-110`}>
                        <resource.icon className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display text-lg font-bold text-foreground group-hover:text-accent transition-colors">
                          {resource.title}
                        </h3>
                      </div>
                      {resource.badge && (
                        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent uppercase tracking-wide">
                          {resource.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-14">
                      {resource.description}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent group-hover:gap-3 transition-all pl-14">
                      {isInternalLink ? 'Read article' : 'Learn more'}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </>
                );
                
                return (
                  <AnimatedCard key={resource.title} delay={index * 75}>
                    {isInternalLink ? (
                      <Link 
                        to={resource.link}
                        className="group block h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-accent/30 hover:shadow-elevated hover:-translate-y-1"
                      >
                        {cardContent}
                      </Link>
                    ) : (
                      <a 
                        href={resource.link}
                        className="group block h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-accent/30 hover:shadow-elevated hover:-translate-y-1"
                      >
                        {cardContent}
                      </a>
                    )}
                  </AnimatedCard>
                );
              })}
            </div>
          </div>
        </section>


        {/* Listing Optimization Tips */}
        <section id="listing-tips" className="py-20 md:py-24 scroll-mt-20">
          <div className="container px-5 md:px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <AnimatedCard>
                <div>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                    <Award className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium text-accent">Optimization Guide</span>
                  </div>
                  <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl mb-6">
                    Tips for a High-Performing Listing
                  </h2>
                  <p className="text-lg text-muted-foreground mb-10">
                    Follow these proven strategies to maximize your facility's visibility and attract more qualified leads.
                  </p>
                  
                  <div className="space-y-4">
                    {optimizationTips.map((tip, index) => (
                      <AnimatedCard key={index} delay={index * 50}>
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border hover:border-accent/30 hover:bg-accent/5 transition-all">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 mt-0.5">
                            <CheckCircle className="h-4 w-4 text-accent" />
                          </div>
                          <span className="text-foreground font-medium">{tip}</span>
                        </div>
                      </AnimatedCard>
                    ))}
                  </div>
                </div>
              </AnimatedCard>
              
              <AnimatedCard delay={200}>
                <div className="relative rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 via-accent/10 to-muted/30 p-8 text-center overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
                        <TrendingUp className="h-5 w-5 text-accent" />
                      </div>
                      <h3 className="font-display text-xl font-bold text-foreground">
                        Boost Your Visibility
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-6">
                      Upgrade to a featured listing and appear at the top of search results. Get up to <span className="font-bold text-accent">5x more leads</span>.
                    </p>
                    
                    <div className="space-y-3">
                      <Link to="/login" className="block">
                        <Button size="lg" className="w-full gap-2 h-12 rounded-xl text-base font-semibold shadow-md">
                          Upgrade Your Plan
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to="/for-providers" className="block">
                        <Button variant="ghost" size="lg" className="w-full gap-2 h-11 rounded-xl text-muted-foreground hover:text-foreground">
                          Compare Plans
                        </Button>
                      </Link>
                    </div>
                    
                    <div className="mt-6 pt-5 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Join 500+ treatment centers using featured listings
                      </p>
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="border-t border-border bg-muted/30 py-20 md:py-24">
          <div className="container px-5 md:px-6">
            <div className="mb-14 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <HelpCircle className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">FAQ</span>
              </div>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Find answers to common questions about managing your provider account.
              </p>
            </div>

            <div className="mx-auto max-w-3xl">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`item-${index}`}
                    className="rounded-2xl border border-border bg-card px-6 data-[state=open]:shadow-card data-[state=open]:border-accent/20 transition-all"
                  >
                    <AccordionTrigger className="text-left font-display text-base font-semibold text-foreground hover:no-underline hover:text-accent py-6 transition-colors">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Support CTA - Compact horizontal layout */}
        <section className="py-12 md:py-16">
          <div className="container px-5 md:px-6">
            <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
                    <Users className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">
                      Need Personalized Help?
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Get assistance with your listing and strategy.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link to="/provider-support">
                    <Button size="default" className="gap-2 font-semibold">
                      Contact Support
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="default">
                      Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
