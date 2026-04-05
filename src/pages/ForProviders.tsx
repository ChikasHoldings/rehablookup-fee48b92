import { Link } from "react-router-dom";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { PageFAQ } from "@/components/seo/PageFAQ";
import { forProvidersFaqs } from "@/data/pageFaqs";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  Building2,
  Users,
  TrendingUp,
  Shield,
  CheckCircle,
  ArrowRight,
  Star,
  MessageSquare,
  BarChart3,
  Clock,
  Zap,
  BadgeCheck,
  Eye,
  Target,
  Heart,
  Globe,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import providerHero from "@/assets/provider-hero.jpg";
import providerTeam from "@/assets/provider-team.jpg";
import providerFacility from "@/assets/provider-facility.jpg";
import providerDashboardScreenshot from "@/assets/provider-dashboard-screenshot.png";
import testimonialSarah from "@/assets/testimonials/testimonial-sarah.jpg";
import testimonialMichael from "@/assets/testimonials/testimonial-michael.jpg";
import testimonialJennifer from "@/assets/testimonials/testimonial-jennifer.jpg";

const ForProviders = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SEO
        title="List Your Rehab Center Free | RehabLookup for Providers"
        description="List your treatment center for free on RehabLookup. Connect with families actively seeking care and grow your admissions."
        canonical="/for-providers"
        keywords={[
          "list rehab center free",
          "treatment center marketing",
          "addiction treatment referrals",
          "rehab facility listing",
          "treatment center directory",
          "behavioral health marketing"
        ]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "RehabLookup Provider Listing Service",
          serviceType: "Treatment Center Directory Listing",
          provider: {
            "@type": "Organization",
            name: "RehabLookup",
          },
          description: "List your treatment center for free and connect with families actively seeking addiction recovery services",
          areaServed: {
            "@type": "Country",
            name: "United States",
          },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "For Providers", url: "/for-providers" },
        ]}
      />
      
      <main className="flex-1">
        {/* Hero Section - Image background like homepage */}
        <section className="relative z-10 bg-primary">
          {/* Background Image - using img for better LCP and no flash */}
          <img 
            src={providerHero}
            alt=""
            role="presentation"
            className="absolute inset-0 w-full h-full object-cover object-center"
            width={1920}
            height={1080}
            fetchPriority="high"
            loading="eager"
            decoding="sync"
          />
          
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/75" />

          {/* Content */}
          <div className="container relative px-4 md:px-6 lg:px-8 py-10 md:py-12 lg:py-14">
            <BreadcrumbNav
              className="mb-4"
              variant="dark"
              items={[{ label: "For Providers" }]}
            />
            <div className="mx-auto max-w-3xl text-center">
              {/* Trust indicator */}
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 mb-6 animate-fade-in">
                <Shield className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-white/90">Trusted by 500+ Treatment Centers Nationwide</span>
              </div>

              {/* Headline */}
              <h1 className="mb-3 font-display text-[1.625rem] font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl lg:text-[2.75rem] animate-fade-in" style={{ animationDelay: "50ms" }}>
                Grow Your Admissions with Qualified Families
              </h1>

              {/* Subheadline */}
              <p className="mb-8 text-base md:text-lg text-white/85 animate-fade-in max-w-2xl mx-auto leading-relaxed" style={{ animationDelay: "100ms" }}>
                List your facility on the largest treatment center directory and connect with families actively searching for care.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-in px-4 sm:px-0" style={{ animationDelay: "150ms" }}>
                <Link to="/provider-signup" className="w-full sm:w-auto">
                  <Button size="lg" className="gap-2 h-12 sm:h-14 px-8 sm:px-10 text-base font-semibold shadow-lg transition-all w-full sm:w-auto">
                    List Your Facility Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/provider-resources" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base font-semibold border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm w-full sm:w-auto">
                    Learn More
                  </Button>
                </Link>
              </div>

              {/* Value props row */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3 text-xs sm:text-sm text-white/70 mt-8 sm:mt-10 animate-fade-in px-2 sm:px-0" style={{ animationDelay: "200ms" }}>
                <div className="flex items-center gap-1.5 sm:gap-2 justify-center">
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0" />
                  <span>Free to List</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 justify-center">
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0" />
                  <span>Verified Families</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 justify-center">
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0" />
                  <span>Quick Setup</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 justify-center">
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0" />
                  <span>Nationwide Reach</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-b border-border bg-primary text-primary-foreground py-2.5 md:py-4">
          <div className="container px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 text-center max-w-4xl mx-auto">
              {[
                { value: "10K+", label: "Families Helped Monthly", icon: Users },
                { value: "500+", label: "Verified Partners", icon: Building2 },
                { value: "50", label: "States Covered", icon: Globe },
                { value: "40%", label: "Avg. Admission Increase", icon: TrendingUp },
              ].map((stat) => (
                <div key={stat.label} className="px-1">
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-0.5">
                    <stat.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent shrink-0" />
                    <span className="text-lg sm:text-xl md:text-2xl font-bold">{stat.value}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-primary-foreground/80 leading-tight">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 sm:py-16 md:py-24 bg-background">
          <div className="container px-4 md:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-14">
              <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">How It Works</p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4 px-2">
                Start Receiving Inquiries in 4 Simple Steps
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-2">
                No complicated setup. Create your listing and start connecting with families today.
              </p>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
              {[
                { step: 1, title: "Create Your Listing", description: "Sign up and add your facility details, photos, and services.", icon: Building2 },
                { step: 2, title: "Get Verified", description: "Our team reviews your listing to ensure quality and accuracy.", icon: BadgeCheck },
                { step: 3, title: "Get Discovered", description: "Families find your facility through search and directories.", icon: Eye },
                { step: 4, title: "Connect Directly", description: "Reach out to interested families and grow your census.", icon: MessageSquare },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative"
                >
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-3rem)] border-t-2 border-dashed border-border" />
                  )}
                  <div className="relative bg-card border border-border rounded-xl p-4 sm:p-6 text-center h-full">
                    <div className="flex items-center justify-center mb-3 sm:mb-4">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-base sm:text-lg font-bold">
                        {item.step}
                      </div>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-muted mx-auto mb-3 sm:mb-4">
                      <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1 sm:mb-2">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Value Proposition with Image */}
        <section className="py-12 sm:py-16 md:py-24 bg-muted/30 border-y border-border">
          <div className="container px-4 md:px-6 lg:px-8">
            {/* Centered Section Header */}
            <div className="text-center mb-8 sm:mb-12 max-w-3xl mx-auto">
              <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">Why RehabLookup</p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4 px-2">
                Connect With Families Ready for Treatment
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed px-2">
                Unlike lead aggregators that share contacts with multiple facilities, our inquiries come directly from families who found your specific listing and expressed genuine interest in your program.
              </p>
            </div>

            <div className="grid gap-8 lg:gap-16 lg:grid-cols-2 items-stretch max-w-6xl mx-auto">
              {/* Features List */}
              <div className="flex flex-col justify-center order-2 lg:order-1">
                <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
                  {[
                    { icon: Target, title: "High Intent Inquiries", desc: "Families actively seeking treatment, not cold prospects" },
                    { icon: Eye, title: "Maximum Visibility", desc: "Get discovered in search results and state directories" },
                    { icon: Zap, title: "Instant Notifications", desc: "Real-time alerts when families show interest" },
                    { icon: BarChart3, title: "Analytics Dashboard", desc: "Track views, inquiries, and conversion metrics" },
                    { icon: Heart, title: "Quality Matches", desc: "Connect with families who fit your program" },
                  ].map((item) => (
                    <div key={item.title} className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-card border border-border/50 hover:border-border hover:shadow-sm transition-all">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                        <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-xs sm:text-sm text-foreground">{item.title}</h3>
                        <p className="text-xs sm:text-xs text-muted-foreground truncate sm:whitespace-normal">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Dashboard Preview */}
              <div className="relative flex items-center order-1 lg:order-2">
                <div className="w-full bg-card rounded-lg sm:rounded-xl shadow-xl sm:shadow-2xl border border-border overflow-hidden flex flex-col">
                  {/* Browser header */}
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-3 bg-muted/50 border-b border-border shrink-0">
                    <div className="flex gap-1 sm:gap-1.5">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-destructive/60" />
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500/60" />
                    </div>
                    <div className="flex-1 mx-2 sm:mx-4">
                      <div className="bg-background/80 rounded-md px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-xs text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500/80 shrink-0" />
                        <span className="truncate">rehablookup.com/provider/dashboard</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3">
                    <img 
                      src={providerDashboardScreenshot} 
                      alt="Provider Dashboard showing analytics, inquiries, and recent leads"
                      className="w-full h-auto rounded-sm shadow-sm"
                    />
                  </div>
                </div>
                {/* Decorative elements - hidden on mobile */}
                <div className="hidden sm:block absolute -bottom-6 -right-6 w-32 h-32 bg-primary/15 rounded-full blur-3xl -z-10" />
                <div className="hidden sm:block absolute -top-6 -left-6 w-40 h-40 bg-accent/15 rounded-full blur-3xl -z-10" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid with Images */}
        <section className="py-12 sm:py-16 md:py-24 bg-background">
          <div className="container px-4 md:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-14">
              <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">Platform Features</p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4 px-2">
                Everything You Need to Grow
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-2">
                Tools designed specifically for treatment centers to attract and convert more admissions.
              </p>
            </div>

            <div className="grid gap-4 sm:gap-8 md:grid-cols-2 max-w-5xl mx-auto">
              {/* Feature Card 1 */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="aspect-video relative">
                  <img 
                    src={providerTeam} 
                    alt="Treatment center team collaborating"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <h3 className="font-semibold text-sm sm:text-base text-foreground">Rich Facility Profiles</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Showcase your facility with photos, videos, staff bios, and detailed program information. Help families understand what makes your center unique.
                  </p>
                </div>
              </div>

              {/* Feature Card 2 */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="aspect-video relative">
                  <img 
                    src={providerFacility} 
                    alt="Modern treatment facility lobby"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <h3 className="font-semibold text-sm sm:text-base text-foreground">Nationwide Exposure</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Reach families across all 50 states searching for treatment options. Our SEO optimized pages help your facility get found when it matters most.
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Features List */}
            <div className="mt-8 sm:mt-12 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {[
                { icon: Shield, title: "Verified Badge", desc: "Build trust with a verified facility badge" },
                { icon: Clock, title: "Quick Response", desc: "Connect with families within minutes" },
                { icon: BarChart3, title: "Performance Insights", desc: "Track your listing performance" },
              ].map((feature) => (
                <div key={feature.title} className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 bg-muted/50 rounded-lg">
                  <feature.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground text-xs sm:text-sm">{feature.title}</h4>
                    <p className="text-xs sm:text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-12 sm:py-16 md:py-24 bg-muted/30 border-y border-border">
          <div className="container px-4 md:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-14">
              <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">Success Stories</p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4 px-2">
                Trusted by Leading Treatment Centers
              </h2>
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span>4.9/5 from 500+ reviews</span>
              </div>
            </div>

            <div className="grid gap-4 sm:gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {[
                {
                  quote: "RehabLookup transformed our admissions. We saw a 40% increase in qualified inquiries within three months.",
                  author: "Dr. Sarah Mitchell",
                  role: "Clinical Director",
                  facility: "Sunrise Recovery Center",
                  avatar: testimonialSarah,
                  metric: "+40%",
                },
                {
                  quote: "The quality of families we connect with is exceptional. They arrive informed and ready to begin treatment.",
                  author: "Michael Torres",
                  role: "Admissions Director",
                  facility: "New Horizons Treatment",
                  avatar: testimonialMichael,
                  metric: "95%",
                },
                {
                  quote: "Our admissions team loves how easy it is to manage inquiries. Best decision we made for our marketing.",
                  author: "Jennifer Adams",
                  role: "Marketing Manager",
                  facility: "Coastal Wellness Center",
                  avatar: testimonialJennifer,
                  metric: "2x Growth",
                },
              ].map((testimonial) => (
                <div key={testimonial.author} className="bg-card border border-border rounded-xl p-4 sm:p-6">
                  <div className="flex items-center gap-0.5 sm:gap-1 mb-3 sm:mb-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <blockquote className="text-sm sm:text-base text-foreground mb-4 sm:mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <img 
                        src={testimonial.avatar} 
                        alt={testimonial.author}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-xs sm:text-sm truncate">{testimonial.author}</p>
                        <p className="text-xs sm:text-xs text-muted-foreground truncate">{testimonial.role}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary text-sm sm:text-base">{testimonial.metric}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 sm:py-16 md:py-24 bg-background">
          <div className="container px-4 md:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-14">
              <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">FAQ</p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4">
                Common Questions
              </h2>
            </div>

            <div className="max-w-2xl mx-auto">
              <Accordion type="single" collapsible className="space-y-2 sm:space-y-3">
                {[
                  {
                    q: "Is it really free to list my facility?",
                    a: "Yes, creating your listing is completely free. There are no setup fees, monthly fees, or hidden charges to get your facility visible on our platform."
                  },
                  {
                    q: "What kind of inquiry quality can I expect?",
                    a: "Our inquiries come from families actively seeking treatment. Each inquiry includes verified contact information, treatment preferences, insurance details, and urgency level."
                  },
                  {
                    q: "How long does it take to get started?",
                    a: "Most providers complete their profile and go live in under 10 minutes. Simply create an account, add your facility details and photos, then submit for verification."
                  },
                  {
                    q: "How do families find my facility?",
                    a: "Families discover your facility through our search engine, state directories, and treatment type pages. Our SEO ensures your listing is visible when families search for care."
                  },
                  {
                    q: "Can I update my listing after it goes live?",
                    a: "Absolutely. You can update your facility information, photos, services, and availability at any time through your provider dashboard."
                  },
                ].map((faq) => (
                  <AccordionItem key={faq.q} value={faq.q} className="border border-border rounded-lg px-3 sm:px-5 bg-card">
                    <AccordionTrigger className="text-left text-foreground text-sm sm:text-base font-medium hover:no-underline py-3 sm:py-4">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-xs sm:text-sm text-muted-foreground pb-3 sm:pb-4">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Provider Growth Guides Internal Linking */}
        <section className="py-12 sm:py-16 bg-muted/30 border-t border-border">
          <div className="container px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-10">
              <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Free Resources</p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">
                Provider Growth Guides
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
                Actionable strategies for treatment center owners and admissions directors.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {[
                { href: "/provider-guides/get-more-rehab-patients", title: "Get More Patients", desc: "Fill beds faster with proven strategies" },
                { href: "/provider-guides/rehab-marketing-strategies", title: "Marketing Strategies", desc: "What actually works in 2026" },
                { href: "/provider-guides/addiction-treatment-lead-generation", title: "Lead Generation", desc: "Quality leads that convert" },
                { href: "/provider-guides/increase-rehab-admissions", title: "Increase Admissions", desc: "Data-driven census growth" },
              ].map((guide) => (
                <Link
                  key={guide.href}
                  to={guide.href}
                  className="group block rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors mb-1">
                    {guide.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">{guide.desc}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Read guide <ChevronRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link to="/providers/resources" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                Browse all provider resources
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA - Card style, not full-width background */}
        <section className="py-12 sm:py-16 md:py-24 bg-background">
          <div className="container px-4 md:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 text-center shadow-lg">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-primary/10 px-3 sm:px-4 py-1.5 sm:py-2 mb-4 sm:mb-6">
                  <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium text-primary">Join 500+ Treatment Centers</span>
                </div>
                
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4 px-2">
                  Ready to Connect With More Families?
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-xl mx-auto px-2">
                  Join hundreds of treatment centers already growing their admissions with RehabLookup.
                </p>
                
                <Link to="/provider-signup" className="block sm:inline-block">
                  <Button size="lg" className="gap-2 h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base font-semibold shadow-md w-full sm:w-auto">
                    List Your Facility Free
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </Link>
                
                <p className="text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6">
                  No credit card required. Free to get started.
                </p>
              </div>
            </div>
          </div>
        </section>
        <PageFAQ faqs={forProvidersFaqs} className="border-t border-border bg-muted/30" />
      </main>
      <Footer />
    </div>
  );
};

export default ForProviders;
