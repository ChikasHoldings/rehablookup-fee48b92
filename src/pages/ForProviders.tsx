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
  X,
  Sparkles,
  Quote,
  Zap,
  Award,
  HeartHandshake,
  BadgeCheck,
  Phone,
  Target,
} from "lucide-react";
import { useState } from "react";
import { providerNavLinks } from "@/data/providerNavLinks";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: Target,
    title: "High-Intent Leads",
    description: "Connect with families actively seeking treatment, not cold prospects. Our leads are ready to take the next step.",
    stat: "85%",
    statLabel: "Conversion Ready",
  },
  {
    icon: Eye,
    title: "Maximum Visibility",
    description: "Get discovered by thousands of families searching for quality addiction treatment in your area.",
    stat: "10K+",
    statLabel: "Monthly Searches",
  },
  {
    icon: BadgeCheck,
    title: "Trust & Credibility",
    description: "Our verification badge signals quality and trustworthiness to families making critical decisions.",
    stat: "3x",
    statLabel: "More Inquiries",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Track every view, click, and inquiry. Make data-driven decisions to optimize your admissions.",
    stat: "24/7",
    statLabel: "Live Dashboard",
  },
  {
    icon: Zap,
    title: "Instant Notifications",
    description: "Get real-time alerts when families show interest. Respond quickly to increase conversions.",
    stat: "<1min",
    statLabel: "Alert Speed",
  },
  {
    icon: HeartHandshake,
    title: "Dedicated Support",
    description: "Our partner success team helps you optimize your listing and maximize your ROI.",
    stat: "100%",
    statLabel: "Satisfaction",
  },
];

const listingFeatures = [
  { text: "Unlimited facility photos and virtual tours", highlight: true },
  { text: "Custom program descriptions and specializations", highlight: false },
  { text: "Insurance verification integration", highlight: true },
  { text: "Staff credentials and accreditations display", highlight: false },
  { text: "Direct inquiry forms and lead capture", highlight: true },
  { text: "Real-time analytics dashboard", highlight: false },
  { text: "Priority placement in search results", highlight: true },
  { text: "Dedicated account manager", highlight: false },
];

const testimonials = [
  {
    quote: "RehabLookup has transformed our admissions. We saw a 40% increase in qualified leads within the first three months. The ROI is incredible.",
    author: "Dr. Sarah Mitchell",
    role: "Clinical Director",
    facility: "Sunrise Recovery Center",
    location: "California",
    metric: "+40%",
    metricLabel: "Admissions",
  },
  {
    quote: "The quality of referrals is exceptional. Families arrive informed and ready to begin treatment. Our intake team loves it.",
    author: "Michael Torres",
    role: "Admissions Director",
    facility: "New Horizons Treatment",
    location: "Florida",
    metric: "95%",
    metricLabel: "Lead Quality",
  },
  {
    quote: "The analytics alone are worth the investment. We finally have visibility into what drives our admissions.",
    author: "Jennifer Adams",
    role: "Marketing Manager",
    facility: "Coastal Wellness Center",
    location: "Texas",
    metric: "2x",
    metricLabel: "ROI",
  },
];

const pricingPlans = [
  {
    name: "Basic",
    price: "Free",
    period: "",
    description: "Get started with essential visibility",
    features: [
      "Basic facility listing",
      "Up to 5 photos",
      "Standard search placement",
      "Monthly analytics report",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Professional",
    price: "$199",
    period: "/mo",
    description: "For growing treatment centers",
    features: [
      "Everything in Basic, plus:",
      "Priority search placement",
      "Unlimited photos & videos",
      "Real-time lead notifications",
      "Verified badge",
      "Dedicated support",
    ],
    cta: "Get Started",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For multi-location facilities",
    features: [
      "Everything in Professional, plus:",
      "Multiple location management",
      "Custom integrations",
      "White-glove onboarding",
      "Priority lead routing",
      "Quarterly strategy reviews",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const ForProviders = () => {
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="List Your Treatment Center - For Providers"
        description="Partner with RehabLookup to increase your treatment center's visibility. Connect with families seeking quality addiction care. Free listing available."
        canonical="/for-providers"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "For Providers", url: "/for-providers" },
        ]}
      />
      
      {/* Sticky Announcement Bar */}
      {showAnnouncement && (
        <div className="sticky top-0 z-[60] bg-gradient-to-r from-accent via-accent/95 to-accent text-accent-foreground">
          <div className="container px-4">
            <div className="flex items-center justify-center gap-3 py-2.5 relative">
              <Sparkles className="h-4 w-4 shrink-0 animate-pulse" />
              <p className="text-sm font-medium text-center">
                <span className="font-bold">Limited Time:</span> Get 50% off your first 3 months!
                <Link 
                  to="/provider-signup" 
                  className="ml-2 underline underline-offset-2 hover:no-underline font-semibold"
                >
                  Claim Offer →
                </Link>
              </p>
              <button
                onClick={() => setShowAnnouncement(false)}
                className="absolute right-0 p-1.5 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Dismiss announcement"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Header
        navLinks={providerNavLinks}
        ctaLink="/provider-signup"
        ctaLabel="Get Started"
        variant="provider"
      />
      
      <main className="flex-1">
        {/* Hero Section - High Impact */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-16 md:py-24">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />
          
          <div className="container relative z-10 px-4">
            <div className="max-w-4xl mx-auto text-center">
              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2">
                  <Award className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-accent">#1 Treatment Directory</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">500+ Verified Partners</span>
                </div>
              </div>

              <h1 className="mb-6 font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Fill Your Beds With
                <span className="block text-primary">Qualified Admissions</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                Join the network trusted by 500+ treatment centers. Connect with families 
                actively seeking treatment—not tire kickers.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-10">
                <Link to="/provider-signup">
                  <Button size="lg" className="gap-2 h-14 px-8 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                    Start Free Trial
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="lg" className="gap-2 h-14 px-8 text-base font-semibold rounded-xl">
                    <Phone className="h-5 w-5" />
                    Schedule Demo
                  </Button>
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 border-2 border-background flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-foreground">{String.fromCharCode(64 + i)}</span>
                      </div>
                    ))}
                  </div>
                  <span className="font-medium">500+ facilities trust us</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                  <span className="ml-1 font-medium">4.9/5 partner rating</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border bg-card py-10">
          <div className="container px-4">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
              <div className="animate-fade-in">
                <div className="font-display text-4xl md:text-5xl font-bold text-primary mb-1">10K+</div>
                <p className="text-sm text-muted-foreground font-medium">Families Helped Monthly</p>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
                <div className="font-display text-4xl md:text-5xl font-bold text-primary mb-1">500+</div>
                <p className="text-sm text-muted-foreground font-medium">Verified Partners</p>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
                <div className="font-display text-4xl md:text-5xl font-bold text-primary mb-1">50</div>
                <p className="text-sm text-muted-foreground font-medium">States Covered</p>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: "300ms" }}>
                <div className="font-display text-4xl md:text-5xl font-bold text-accent mb-1">40%</div>
                <p className="text-sm text-muted-foreground font-medium">Avg. Admission Increase</p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-20 md:py-28">
          <div className="container px-4">
            <div className="text-center mb-16">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Why Choose RehabLookup</span>
              </div>
              <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                Everything You Need to Grow Admissions
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Our platform is built specifically for treatment centers. Get the tools and visibility you need to help more families.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit, index) => (
                <AnimatedCard key={benefit.title} delay={index * 80}>
                  <div className="group h-full rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-accent/30">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20">
                        <benefit.icon className="h-7 w-7 text-accent" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{benefit.stat}</div>
                        <div className="text-xs text-muted-foreground">{benefit.statLabel}</div>
                      </div>
                    </div>
                    <h3 className="mb-3 font-display text-xl font-semibold text-foreground">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-muted/50 to-background">
          <div className="container px-4">
            <div className="text-center mb-16">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2">
                <Clock className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Get Started in Minutes</span>
              </div>
              <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                Simple 3-Step Process
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Join our network quickly and start receiving qualified leads today.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
              {[
                { 
                  step: 1, 
                  title: "Create Your Profile", 
                  description: "Sign up and add your facility details, photos, and treatment programs. Takes about 10 minutes.",
                  icon: Building2,
                },
                { 
                  step: 2, 
                  title: "Get Verified", 
                  description: "Our team reviews your credentials and licenses. Most verifications complete within 24 hours.",
                  icon: BadgeCheck,
                },
                { 
                  step: 3, 
                  title: "Receive Leads", 
                  description: "Your listing goes live and families start finding you. Get instant notifications for new inquiries.",
                  icon: MessageSquare,
                },
              ].map((item, index) => (
                <div
                  key={item.step}
                  className="relative rounded-2xl border border-border bg-card p-8 shadow-sm text-center animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Connector line */}
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-accent/30" />
                  )}
                  
                  <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 text-2xl font-bold text-accent-foreground shadow-lg">
                    {item.step}
                  </div>
                  <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-3 font-display text-xl font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link to="/provider-signup">
                <Button size="lg" className="gap-2 h-12 px-8 text-base font-semibold rounded-xl">
                  Get Started Now
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 md:py-28">
          <div className="container px-4">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-accent">Full Feature Set</span>
                </div>
                <h2 className="mb-6 font-display text-3xl md:text-4xl font-bold text-foreground">
                  Everything You Need to Succeed
                </h2>
                <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
                  Our platform gives you the tools to showcase your facility, connect with families, and grow your admissions—all in one place.
                </p>

                <ul className="space-y-4">
                  {listingFeatures.map((feature, index) => (
                    <li key={feature.text} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                      <div className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                        feature.highlight ? "bg-accent/15" : "bg-primary/10"
                      )}>
                        <CheckCircle className={cn(
                          "h-4 w-4",
                          feature.highlight ? "text-accent" : "text-primary"
                        )} />
                      </div>
                      <span className={cn(
                        "text-foreground",
                        feature.highlight && "font-medium"
                      )}>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative">
                <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-primary via-primary to-primary/90 p-10 text-center shadow-xl">
                  <div className="mb-6 inline-flex items-center justify-center h-20 w-20 rounded-full bg-white/10 backdrop-blur">
                    <Building2 className="h-10 w-10 text-accent" />
                  </div>
                  <h3 className="mb-3 font-display text-2xl font-semibold text-primary-foreground">
                    Ready to Get Started?
                  </h3>
                  <p className="mb-8 text-primary-foreground/80 leading-relaxed">
                    Join 500+ treatment centers already growing their admissions with RehabLookup.
                  </p>
                  <Link to="/provider-signup">
                    <Button variant="hero-light" size="lg" className="w-full gap-2 h-14 text-base font-semibold rounded-xl">
                      Start Your Free Trial
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <p className="mt-4 text-sm text-primary-foreground/60">No credit card required</p>
                </div>
                
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 rounded-xl bg-accent px-4 py-2 shadow-lg animate-float">
                  <div className="flex items-center gap-2 text-accent-foreground">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-bold">Setup in 10 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-muted/50 to-background">
          <div className="container px-4">
            <div className="text-center mb-16">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2">
                <Quote className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Partner Success Stories</span>
              </div>
              <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                Trusted by Leading Treatment Centers
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                See how our partners are transforming their admissions.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <AnimatedCard key={testimonial.author} delay={index * 100}>
                  <div className="h-full flex flex-col rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-lg transition-shadow">
                    {/* Metric badge */}
                    <div className="flex items-center justify-between mb-6">
                      <Quote className="h-8 w-8 text-accent/30" />
                      <div className="text-right">
                        <div className="text-2xl font-bold text-accent">{testimonial.metric}</div>
                        <div className="text-xs text-muted-foreground">{testimonial.metricLabel}</div>
                      </div>
                    </div>
                    
                    <blockquote className="flex-1 text-foreground/90 leading-relaxed mb-6">
                      "{testimonial.quote}"
                    </blockquote>
                    
                    <div className="border-t border-border pt-6">
                      <p className="font-semibold text-foreground">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      <p className="text-sm text-primary font-medium mt-1">{testimonial.facility}, {testimonial.location}</p>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="py-20 md:py-28">
          <div className="container px-4">
            <div className="text-center mb-16">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2">
                <Star className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Simple Pricing</span>
              </div>
              <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                Plans That Scale With You
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Start free and upgrade as you grow. No hidden fees, cancel anytime.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {pricingPlans.map((plan, index) => (
                <AnimatedCard key={plan.name} delay={index * 100}>
                  <div className={cn(
                    "relative h-full flex flex-col rounded-2xl border p-8 transition-all",
                    plan.popular 
                      ? "border-accent bg-gradient-to-b from-accent/5 to-background shadow-lg scale-105" 
                      : "border-border bg-card"
                  )}>
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground shadow-lg">
                          <Sparkles className="h-3.5 w-3.5" />
                          Most Popular
                        </span>
                      </div>
                    )}
                    
                    <div className="mb-6">
                      <h3 className="font-display text-xl font-semibold text-foreground mb-2">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                        <span className="text-muted-foreground">{plan.period}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                    </div>
                    
                    <ul className="flex-1 space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Link to={plan.name === "Enterprise" ? "/contact" : "/provider-signup"}>
                      <Button 
                        variant={plan.popular ? "default" : "outline"} 
                        className="w-full h-12 font-semibold rounded-xl"
                      >
                        {plan.cta}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
          <div className="container px-4">
            <div className="mx-auto max-w-3xl rounded-3xl border border-accent/20 bg-gradient-to-br from-primary via-primary to-primary/90 p-10 md:p-14 text-center shadow-xl">
              <div className="mb-6 inline-flex items-center justify-center h-16 w-16 rounded-full bg-white/10 backdrop-blur">
                <HeartHandshake className="h-8 w-8 text-accent" />
              </div>
              <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-primary-foreground">
                Ready to Transform Your Admissions?
              </h2>
              <p className="mb-8 text-lg text-primary-foreground/80 max-w-xl mx-auto">
                Join 500+ treatment centers connecting with families who need their help. Start your free trial today.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/provider-signup">
                  <Button variant="hero-light" size="lg" className="gap-2 h-14 px-8 text-base font-semibold rounded-xl">
                    Start Free Trial
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="lg" className="gap-2 h-14 px-8 text-base font-semibold rounded-xl bg-transparent border-white/30 text-primary-foreground hover:bg-white/10">
                    Talk to Sales
                  </Button>
                </Link>
              </div>
              <p className="mt-6 text-sm text-primary-foreground/60">
                No credit card required • Setup in 10 minutes • Cancel anytime
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
