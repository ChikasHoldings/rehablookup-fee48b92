import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { SEO } from "@/components/SEO";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileText,
  BookOpen,
  Video,
  Download,
  HelpCircle,
  Users,
  TrendingUp,
  Shield,
  Lightbulb,
  CheckCircle,
  ArrowRight,
  Play,
  Clock,
  Star,
  Zap,
  MessageSquare,
  BarChart3,
  Award,
} from "lucide-react";
import heroImage from "@/assets/provider-resources-hero.jpg";
import supportImage from "@/assets/provider-support-cta.jpg";

const providerNavLinks = [
  { href: "/for-providers", label: "Why List With Us" },
  { href: "/provider-resources", label: "Resources" },
  { href: "/provider-support", label: "Support" },
];

const resources = [
  {
    icon: FileText,
    title: "Listing Guidelines",
    description: "Learn how to optimize your facility listing for maximum visibility and engagement with families seeking treatment.",
    link: "#listing-tips",
    badge: "Essential",
  },
  {
    icon: BookOpen,
    title: "Best Practices Guide",
    description: "Industry best practices for treatment centers to improve patient outcomes and boost your online presence.",
    link: "#",
    badge: null,
  },
  {
    icon: Video,
    title: "Training Videos",
    description: "Step-by-step video tutorials on managing your provider dashboard, updating listings, and responding to leads.",
    link: "#",
    badge: "Popular",
  },
  {
    icon: Download,
    title: "Marketing Materials",
    description: "Download brochures, flyers, and digital assets to promote your facility and partnership with RehabLookup.",
    link: "#",
    badge: null,
  },
  {
    icon: TrendingUp,
    title: "Analytics & Insights",
    description: "Understand your listing performance with detailed metrics on views, inquiries, and engagement patterns.",
    link: "#",
    badge: null,
  },
  {
    icon: Shield,
    title: "Compliance Resources",
    description: "Stay up-to-date with regulatory requirements, HIPAA guidelines, and industry compliance standards.",
    link: "#",
    badge: "Updated",
  },
];

const quickTips = [
  {
    icon: Star,
    title: "Complete Your Profile",
    description: "Listings with 100% completion get 3x more inquiries",
  },
  {
    icon: Zap,
    title: "Respond Quickly",
    description: "Reply to leads within 1 hour for best conversion rates",
  },
  {
    icon: MessageSquare,
    title: "Add Testimonials",
    description: "Facilities with reviews see 40% higher engagement",
  },
  {
    icon: BarChart3,
    title: "Check Analytics Weekly",
    description: "Track trends to optimize your listing strategy",
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
    question: "Can I respond to patient inquiries?",
    answer: "Yes, all inquiries are forwarded to your registered email immediately. You can also manage and track them through your provider dashboard, including setting follow-up reminders.",
  },
  {
    question: "How do I upgrade to a featured listing?",
    answer: "Visit your provider dashboard and click on 'Upgrade Plan' to see available options. Featured listings appear at the top of search results and on our homepage.",
  },
  {
    question: "What analytics are available?",
    answer: "Your dashboard includes views, unique visitors, inquiry rates, conversion metrics, and engagement trends. Premium plans include advanced analytics with demographic insights.",
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

const videoTutorials = [
  {
    title: "Getting Started with Your Dashboard",
    duration: "5:30",
    thumbnail: heroImage,
  },
  {
    title: "Optimizing Your Facility Profile",
    duration: "8:15",
    thumbnail: heroImage,
  },
  {
    title: "Managing and Responding to Leads",
    duration: "6:45",
    thumbnail: heroImage,
  },
];

export default function ProviderResources() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
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
      
      <Header
        navLinks={providerNavLinks}
        ctaLink="/provider-login"
        ctaLabel="Provider Login"
        variant="provider"
      />
      
      <main className="flex-1">
        {/* Hero Section with Image */}
        <section className="relative bg-primary py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <img 
              src={heroImage} 
              alt="" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="container relative z-10 px-5 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <div className="mb-4 inline-flex items-center gap-2.5 rounded-full bg-white/10 px-5 py-2.5">
                <BookOpen className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-primary-foreground">Provider Resources</span>
              </div>
              <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
                Everything You Need to Succeed
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-primary-foreground/80">
                Access guides, tutorials, and tools to maximize your facility's visibility and connect with more families seeking treatment.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/provider-login">
                  <Button variant="hero-light" size="lg" className="gap-2 h-12 rounded-xl">
                    Access Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#resources">
                  <Button variant="outline" size="lg" className="gap-2 h-12 rounded-xl border-white/30 text-white hover:bg-white/10 hover:text-white">
                    Browse Resources
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Tips Bar */}
        <section className="border-b border-border bg-card py-8">
          <div className="container px-5 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {quickTips.map((tip, index) => (
                <AnimatedCard key={tip.title} delay={index * 75}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <tip.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{tip.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>

        {/* Resources Grid */}
        <section id="resources" className="py-16 md:py-20 scroll-mt-20">
          <div className="container px-5 md:px-6">
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <Lightbulb className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Tools & Resources</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                Resources to Maximize Your Success
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Access comprehensive guides, tutorials, and materials designed to help your facility thrive on RehabLookup.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {resources.map((resource, index) => (
                <AnimatedCard key={resource.title} delay={index * 75}>
                  <div className="group h-full rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:border-accent/30 hover:shadow-elevated hover:-translate-y-1">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20">
                        <resource.icon className="h-7 w-7 text-accent" />
                      </div>
                      {resource.badge && (
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {resource.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-xl font-semibold text-foreground">
                      {resource.title}
                    </h3>
                    <p className="mt-3 text-muted-foreground">
                      {resource.description}
                    </p>
                    <a
                      href={resource.link}
                      className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
                    >
                      Learn more
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>

        {/* Video Tutorials Section */}
        <section className="py-16 md:py-20 bg-muted/30 border-y border-border">
          <div className="container px-5 md:px-6">
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <Video className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Video Tutorials</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                Learn With Step-by-Step Videos
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Watch our comprehensive video guides to get the most out of your provider dashboard.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {videoTutorials.map((video, index) => (
                <AnimatedCard key={video.title} delay={index * 100}>
                  <div className="group rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-elevated hover:-translate-y-1">
                    <div className="relative aspect-video bg-muted">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="h-6 w-6 text-primary ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1">
                        <Clock className="h-3.5 w-3.5 text-white" />
                        <span className="text-xs font-medium text-white">{video.duration}</span>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                        {video.title}
                      </h3>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Button variant="outline" size="lg" className="gap-2 rounded-xl">
                View All Tutorials
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Listing Optimization Tips */}
        <section id="listing-tips" className="py-16 md:py-20 scroll-mt-20">
          <div className="container px-5 md:px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <AnimatedCard>
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                    <Award className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium text-accent">Optimization Guide</span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl mb-5">
                    Tips for a High-Performing Listing
                  </h2>
                  <p className="text-muted-foreground mb-8">
                    Follow these proven strategies to maximize your facility's visibility and attract more qualified leads.
                  </p>
                  
                  <div className="space-y-4">
                    {[
                      "Use high-quality photos of your facility (exterior, rooms, amenities)",
                      "Write a compelling description highlighting unique programs",
                      "List all insurance providers and payment options accepted",
                      "Include staff credentials and accreditations",
                      "Keep your contact information current",
                      "Respond to inquiries within 1 hour for best results",
                      "Add testimonials and success stories",
                      "Update your listing regularly with new programs",
                    ].map((tip, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 mt-0.5">
                          <CheckCircle className="h-4 w-4 text-accent" />
                        </div>
                        <span className="text-foreground">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedCard>
              
              <AnimatedCard delay={150}>
                <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-primary to-primary/90 p-8 text-center">
                  <div className="mb-5 inline-flex items-center justify-center h-16 w-16 rounded-full bg-white/10">
                    <TrendingUp className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-primary-foreground mb-3">
                    Boost Your Visibility
                  </h3>
                  <p className="text-primary-foreground/80 mb-6">
                    Upgrade to a featured listing and appear at the top of search results. Get up to 5x more inquiries.
                  </p>
                  <div className="space-y-3">
                    <Link to="/provider-login">
                      <Button variant="hero-light" size="lg" className="w-full gap-2 h-12 rounded-xl">
                        Upgrade Your Plan
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/for-providers">
                      <Button variant="ghost" size="lg" className="w-full gap-2 h-12 rounded-xl text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10">
                        Learn About Plans
                      </Button>
                    </Link>
                  </div>
                </div>
              </AnimatedCard>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="border-t border-border bg-muted/30 py-16 md:py-20">
          <div className="container px-5 md:px-6">
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <HelpCircle className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">FAQ</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Find answers to common questions about managing your provider account.
              </p>
            </div>

            <div className="mx-auto max-w-3xl">
              <Accordion type="single" collapsible className="space-y-3">
                {faqs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`item-${index}`}
                    className="rounded-xl border border-border bg-card px-6 data-[state=open]:shadow-card"
                  >
                    <AccordionTrigger className="text-left font-display text-base font-semibold text-foreground hover:no-underline py-5">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Support CTA */}
        <section className="py-16 md:py-20">
          <div className="container px-5 md:px-6">
            <div className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-8 md:p-12 overflow-hidden relative">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 hidden lg:block">
                <img 
                  src={supportImage} 
                  alt="" 
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="relative z-10 max-w-xl">
                <Users className="h-12 w-12 text-accent mb-6" />
                <h2 className="font-display text-2xl font-bold text-primary-foreground md:text-3xl">
                  Need Personalized Help?
                </h2>
                <p className="mt-4 text-primary-foreground/80 text-lg">
                  Our dedicated provider support team is here to help you maximize your success on RehabLookup. Get personalized assistance with your listing.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link to="/provider-support">
                    <Button variant="hero-light" size="lg" className="gap-2 h-12 rounded-xl">
                      Contact Support
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/provider-login">
                    <Button variant="outline" size="lg" className="gap-2 h-12 rounded-xl border-white/30 text-white hover:bg-white/10 hover:text-white">
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
      <BackToTop />
    </div>
  );
}
