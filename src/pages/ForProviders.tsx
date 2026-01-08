import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { SEO } from "@/components/SEO";
import { AnimatedCard } from "@/components/ui/animated-card";
import {
  Building2,
  Users,
  TrendingUp,
  Shield,
  CheckCircle,
  ArrowRight,
  Star,
  Eye,
  MessageSquare,
  BarChart3,
  Clock,
  Sparkles,
  Quote,
  Zap,
  Award,
  HeartHandshake,
  BadgeCheck,
  Phone,
  Target,
  Check,
  Unlock,
  CreditCard,
  Crown,
} from "lucide-react";
import { providerNavLinks } from "@/data/providerNavLinks";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import providerDashboardMockup from "@/assets/provider-dashboard-mockup.jpg";
import rehabFacilityHero from "@/assets/rehab-facility-hero.jpg";
import providerAvatar1 from "@/assets/avatars/provider-avatar-1.jpg";
import providerAvatar2 from "@/assets/avatars/provider-avatar-2.jpg";
import providerAvatar3 from "@/assets/avatars/provider-avatar-3.jpg";
import providerAvatar4 from "@/assets/avatars/provider-avatar-4.jpg";

const providerAvatars = [providerAvatar1, providerAvatar2, providerAvatar3, providerAvatar4];

import testimonialSarah from "@/assets/testimonials/testimonial-sarah.jpg";
import testimonialMichael from "@/assets/testimonials/testimonial-michael.jpg";
import testimonialJennifer from "@/assets/testimonials/testimonial-jennifer.jpg";

const benefits = [
  {
    icon: Target,
    title: "High-Intent Inquiries",
    description: "Connect with families actively seeking treatment—not cold prospects.",
    stat: "85%",
    statLabel: "Ready to Admit",
  },
  {
    icon: Eye,
    title: "Maximum Visibility",
    description: "Get discovered by thousands searching for quality treatment.",
    stat: "10K+",
    statLabel: "Monthly Searches",
  },
  {
    icon: BadgeCheck,
    title: "Trust & Credibility",
    description: "Our verification badge signals quality to families.",
    stat: "3x",
    statLabel: "More Inquiries",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Track every view, click, and inquiry with precision.",
    stat: "24/7",
    statLabel: "Live Dashboard",
  },
  {
    icon: Zap,
    title: "Instant Notifications",
    description: "Get real-time alerts when families show interest.",
    stat: "<1min",
    statLabel: "Alert Speed",
  },
  {
    icon: HeartHandshake,
    title: "Dedicated Support",
    description: "Our team helps optimize your listing and maximize results.",
    stat: "100%",
    statLabel: "Satisfaction",
  },
];

const listingFeatures = [
  { text: "Unlimited facility photos and virtual tours", highlight: true },
  { text: "Custom program descriptions and specializations", highlight: false },
  { text: "Insurance verification integration", highlight: true },
  { text: "Staff credentials and accreditations display", highlight: false },
  { text: "Direct inquiry forms and contact capture", highlight: true },
  { text: "Real-time analytics dashboard", highlight: false },
];

const testimonials = [
  {
    quote: "RehabLookup transformed our admissions. We saw a 40% increase in qualified inquiries within three months.",
    author: "Dr. Sarah Mitchell",
    role: "Clinical Director",
    facility: "Sunrise Recovery Center",
    location: "California",
    metric: "+40%",
    metricLabel: "Admissions",
    avatar: testimonialSarah,
    rating: 5,
    date: "2 weeks ago",
    verified: true,
  },
  {
    quote: "The quality of referrals is exceptional. Families arrive informed and ready to begin treatment.",
    author: "Michael Torres",
    role: "Admissions Director",
    facility: "New Horizons Treatment",
    location: "Florida",
    metric: "95%",
    metricLabel: "Lead Quality",
    avatar: testimonialMichael,
    rating: 5,
    date: "1 month ago",
    verified: true,
  },
  {
    quote: "The pay-per-inquiry model means we only pay for real opportunities. Best decision we made.",
    author: "Jennifer Adams",
    role: "Marketing Manager",
    facility: "Coastal Wellness Center",
    location: "Texas",
    metric: "2x",
    metricLabel: "ROI",
    avatar: testimonialJennifer,
    rating: 5,
    date: "3 weeks ago",
    verified: true,
  },
];

// How it works steps for providers
const howItWorksSteps = [
  {
    step: 1,
    title: "List Your Facility Free",
    description: "Create your profile in minutes. Add photos, services, insurance accepted, and your story.",
    icon: Building2,
  },
  {
    step: 2,
    title: "Receive Family Inquiries",
    description: "When families find your facility and express interest, you'll receive a notification.",
    icon: MessageSquare,
  },
  {
    step: 3,
    title: "Review & Unlock",
    description: "See inquiry details and choose to unlock contact information to connect directly.",
    icon: Unlock,
  },
  {
    step: 4,
    title: "Connect & Convert",
    description: "Reach out to families, answer their questions, and welcome them to your program.",
    icon: Phone,
  },
];

const ForProviders = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="List Your Rehab Center Free - For Providers | RehabLookup"
        description="List your treatment center for free on RehabLookup. Receive inquiries from families seeking care and pay only when you choose to connect."
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
      
      <Header
        navLinks={providerNavLinks}
        ctaLink="/provider-signup"
        ctaLabel="List Free"
        variant="provider"
      />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-12 md:py-16">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-primary/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4" />
          
          <div className="container relative z-10 px-5 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                  <Award className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-accent">#1 Treatment Directory</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">500+ Verified Partners</span>
                </div>
              </div>

              <h1 className="mb-4 font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                List Your Facility.
                <span className="text-primary"> Connect With Families.</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                Create your free listing and receive inquiries from families actively seeking treatment. 
                Pay only when you choose to connect.
              </p>

              {/* Value Props */}
              <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">Free to List</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">No Monthly Fees</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">Pay Per Inquiry</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-8">
                <Link to="/provider-signup">
                  <Button size="lg" className="gap-2 h-12 px-8 text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all">
                    List Your Facility Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="lg" className="gap-2 h-12 px-8 text-base font-semibold rounded-xl">
                    <Phone className="h-5 w-5" />
                    Schedule Demo
                  </Button>
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {providerAvatars.map((avatar, i) => (
                      <img 
                        key={i} 
                        src={avatar} 
                        alt={`Provider ${i + 1}`}
                        className="w-8 h-8 rounded-full border-2 border-background object-cover"
                      />
                    ))}
                  </div>
                  <span className="font-medium">500+ facilities trust us</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                  <span className="ml-1 font-medium">4.9/5 rating</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border bg-card py-8">
          <div className="container px-5 md:px-6">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
              {[
                { value: "10K+", label: "Families Helped Monthly" },
                { value: "500+", label: "Verified Partners" },
                { value: "50", label: "States Covered" },
                { value: "40%", label: "Avg. Admission Increase", accent: true },
              ].map((stat, index) => (
                <div key={stat.label} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className={cn(
                    "font-display text-3xl md:text-4xl font-bold mb-1",
                    stat.accent ? "text-accent" : "text-primary"
                  )}>
                    {stat.value}
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works - Clear 4-Step Process */}
        <section className="section-padding bg-gradient-to-b from-muted/50 to-background">
          <div className="container">
            <div className="text-center mb-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <Clock className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">How It Works</span>
              </div>
              <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                Simple, Transparent Process
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                List for free. Receive inquiries. Pay only when you choose to connect.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
              {howItWorksSteps.map((item, index) => (
                <div
                  key={item.step}
                  className="relative rounded-xl border border-border bg-card p-6 shadow-sm text-center animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 border-t-2 border-dashed border-accent/30" />
                  )}
                  
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 text-base font-bold text-accent-foreground shadow-md">
                      {item.step}
                    </div>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 mx-auto mb-3">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link to="/provider-signup">
                <Button size="lg" className="gap-2 h-12 px-8 text-base font-semibold rounded-xl">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="section-padding">
          <div className="container">
            <div className="text-center mb-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Why Choose RehabLookup</span>
              </div>
              <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                Everything You Need to Grow Admissions
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Our platform is built specifically for treatment centers.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit, index) => (
                <AnimatedCard key={benefit.title} delay={index * 75}>
                  <div className="group h-full rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-accent/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20">
                        <benefit.icon className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-display text-base font-semibold text-foreground">
                          {benefit.title}
                        </h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-primary">{benefit.stat}</span>
                          <span className="text-xs text-muted-foreground">{benefit.statLabel}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-[52px]">
                      {benefit.description}
                    </p>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>

        {/* Pro Visibility Upgrade Section */}
        <section className="section-padding bg-gradient-to-b from-background to-muted/30">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8 md:p-10 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
                
                <div className="relative z-10">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 mb-4">
                        <Crown className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">Pro Visibility</span>
                      </div>
                      
                      <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                        Want More Visibility?
                      </h2>
                      
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        Upgrade to Pro for premium placement and save on every inquiry you unlock.
                      </p>
                      
                      <ul className="space-y-3 mb-6">
                        {[
                          "20% off every inquiry unlock",
                          "Featured on homepage",
                          "Priority placement on state & city pages",
                          "Top of search results",
                          "Gold Pro badge on your listing",
                        ].map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                            <span className="text-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="lg:text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        Available after you create your free listing
                      </p>
                      <Link to="/provider-signup">
                        <Button size="lg" className="gap-2 h-12 px-8 text-base font-semibold rounded-xl">
                          Start Free, Upgrade Later
                          <ArrowRight className="h-5 w-5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section with Dashboard Image */}
        <section className="section-padding">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Powerful Dashboard</span>
                </div>
                <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                  Everything at Your Fingertips
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Manage your listing, track inquiries, and grow your admissions from one intuitive dashboard.
                </p>
                
                <ul className="space-y-4">
                  {listingFeatures.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className={cn(
                        "h-5 w-5 shrink-0 mt-0.5",
                        feature.highlight ? "text-accent" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-base",
                        feature.highlight ? "text-foreground font-medium" : "text-muted-foreground"
                      )}>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl blur-2xl" />
                <img 
                  src={providerDashboardMockup} 
                  alt="Provider Dashboard"
                  className="relative rounded-2xl shadow-2xl border border-border"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="section-padding bg-gradient-to-b from-muted/50 to-background">
          <div className="container">
            <div className="text-center mb-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <Quote className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Partner Success Stories</span>
              </div>
              <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                Trusted by Leading Treatment Centers
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-6">
                See how our partners are transforming their admissions.
              </p>
              
              {/* Overall rating widget */}
              <div className="inline-flex items-center gap-3 bg-card border border-border rounded-full px-5 py-2.5 shadow-sm">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="font-semibold text-foreground">4.9</span>
                <span className="text-muted-foreground text-sm">from 500+ reviews</span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <AnimatedCard key={testimonial.author} delay={index * 100}>
                  <div className="h-full flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all group">
                    {/* Header with platform styling */}
                    <div className="px-5 py-4 border-b border-border/50 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={testimonial.avatar} 
                            alt={testimonial.author}
                            className="w-11 h-11 rounded-full object-cover ring-2 ring-background shadow-sm"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-foreground text-sm">{testimonial.author}</p>
                              {testimonial.verified && (
                                <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-0.5">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5">{testimonial.date}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quote content */}
                    <div className="flex-1 px-5 py-4">
                      <blockquote className="text-foreground/90 text-sm leading-relaxed">
                        "{testimonial.quote}"
                      </blockquote>
                    </div>
                    
                    {/* Footer with metric and facility */}
                    <div className="px-5 py-3 bg-gradient-to-r from-primary/5 to-accent/5 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{testimonial.facility}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-accent/10 rounded-full px-2.5 py-1">
                          <TrendingUp className="h-3 w-3 text-accent" />
                          <span className="text-xs font-bold text-accent">{testimonial.metric}</span>
                          <span className="text-[10px] text-accent/80">{testimonial.metricLabel}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
            
            {/* Trust footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Shield className="h-3.5 w-3.5" />
                All reviews are from verified RehabLookup partners
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="section-padding bg-muted/30">
          <div className="container">
            <div className="text-center mb-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Frequently Asked Questions</span>
              </div>
              <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                Got Questions? We've Got Answers
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Everything you need to know about listing on RehabLookup.
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                <AccordionItem value="free-listing" className="border border-border rounded-xl px-6 bg-card shadow-sm">
                  <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline py-5">
                    Is it really free to list my facility?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    Yes, creating your listing is completely free. You only pay when you choose to unlock an inquiry to view contact details and reach out to a family. There are no monthly fees, setup fees, or hidden charges.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="how-unlock-works" className="border border-border rounded-xl px-6 bg-card shadow-sm">
                  <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline py-5">
                    How does the inquiry unlock system work?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    When a family expresses interest in your facility, you'll receive a notification with basic details about their needs. If you'd like to connect with them, you can unlock the inquiry to view their full contact information (name, phone, email) and reach out directly. You're in complete control of which inquiries you pursue.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pro-upgrade" className="border border-border rounded-xl px-6 bg-card shadow-sm">
                  <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline py-5">
                    What is Pro Visibility and do I need it?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    Pro Visibility is an optional upgrade that gives you premium placement (homepage, state/city pages, top of search results) and 20% off every inquiry you unlock. It's designed for facilities that want maximum exposure. You can start free and upgrade anytime from your dashboard.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="inquiry-quality" className="border border-border rounded-xl px-6 bg-card shadow-sm">
                  <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline py-5">
                    What kind of inquiry quality can I expect?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    Our inquiries come from families actively seeking treatment—not cold prospects from purchased lists. Each inquiry includes verified contact information, treatment preferences, insurance details, and urgency level. Families find your facility through our directory and express genuine interest.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="setup-time" className="border border-border rounded-xl px-6 bg-card shadow-sm">
                  <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline py-5">
                    How long does it take to get started?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    Most providers complete their profile and go live in under 10 minutes. Simply create an account, fill in your facility details, add photos, and submit for verification. Our team reviews new listings quickly, and you'll be notified once you're approved and live.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="support" className="border border-border rounded-xl px-6 bg-card shadow-sm">
                  <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline py-5">
                    What kind of support do you offer?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    All providers have access to email support and our comprehensive help center. We're here to help you optimize your listing and get the most from the platform. Pro members receive priority support with faster response times.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="mt-8 text-center">
                <Link to="/provider-faq" className="text-primary hover:underline text-sm font-medium">
                  View all FAQs <ArrowRight className="inline h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="section-padding bg-gradient-to-b from-background to-primary/5">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <Sparkles className="h-4 w-4 text-accent animate-pulse" />
                <span className="text-sm font-medium text-accent">Join 500+ Treatment Centers</span>
              </div>
              
              <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                Ready to Connect With More Families?
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Create your free listing today and start receiving inquiries from families who need your help.
              </p>
              
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link to="/provider-signup">
                  <Button size="lg" className="gap-2 h-14 px-10 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                    List Your Facility Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
              
              <p className="text-sm text-muted-foreground mt-6">
                No credit card required • Free to list • Pay only when you connect
              </p>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
      <BackToTop />
    </div>
  );
};

export default ForProviders;
