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
  Check,
  ChevronDown,
  Calculator,
  DollarSign,
  Crown,
} from "lucide-react";
import { useState } from "react";
import { providerNavLinks } from "@/data/providerNavLinks";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import providerDashboardMockup from "@/assets/provider-dashboard-mockup.jpg";
import rehabFacilityHero from "@/assets/rehab-facility-hero.jpg";

const benefits = [
  {
    icon: Target,
    title: "High-Intent Leads",
    description: "Connect with families actively seeking treatment—not cold prospects.",
    stat: "85%",
    statLabel: "Conversion Ready",
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
    statLabel: "More Leads",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Track every view, click, and lead with precision.",
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
    description: "Our team helps optimize your listing and maximize ROI.",
    stat: "100%",
    statLabel: "Satisfaction",
  },
];

const listingFeatures = [
  { text: "Unlimited facility photos and virtual tours", highlight: true },
  { text: "Custom program descriptions and specializations", highlight: false },
  { text: "Insurance verification integration", highlight: true },
  { text: "Staff credentials and accreditations display", highlight: false },
  { text: "Direct lead forms and contact capture", highlight: true },
  { text: "Real-time analytics dashboard", highlight: false },
  { text: "Priority placement in search results", highlight: true },
  { text: "Dedicated account manager", highlight: false },
];

const testimonials = [
  {
    quote: "RehabLookup transformed our admissions. We saw a 40% increase in qualified leads within three months.",
    author: "Dr. Sarah Mitchell",
    role: "Clinical Director",
    facility: "Sunrise Recovery Center",
    location: "California",
    metric: "+40%",
    metricLabel: "Admissions",
  },
  {
    quote: "The quality of referrals is exceptional. Families arrive informed and ready to begin treatment.",
    author: "Michael Torres",
    role: "Admissions Director",
    facility: "New Horizons Treatment",
    location: "Florida",
    metric: "95%",
    metricLabel: "Lead Quality",
  },
  {
    quote: "The analytics alone are worth the investment. We finally have visibility into what drives admissions.",
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
    description: "Get listed and be discoverable",
    icon: Sparkles,
    gradient: "from-slate-500 to-slate-600",
    features: [
      { text: "Public provider profile", included: true },
      { text: "Listed in search results", included: true },
      { text: "Facility name, location & services", included: true },
      { text: "Basic dashboard (views & clicks)", included: true },
      { text: "1 facility location", included: true },
    ],
    limitations: [
      "Phone number hidden on profile",
      "Website link hidden on profile",
      "No qualified leads",
      "No lead notifications",
    ],
    cta: "Start Free",
    ctaVariant: "outline" as const,
    popular: false,
    exclusivityBadge: "Visibility Only",
    exclusivityColor: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  },
  {
    name: "Professional",
    price: "$399",
    period: "/mo",
    description: "Shared leads + steady visibility",
    icon: Star,
    gradient: "from-emerald-500 to-teal-500",
    features: [
      { text: "Everything in Basic, plus:", included: true, isHeader: true },
      { text: "100 qualified leads/month", included: true, highlight: true },
      { text: "Shared with max 1 other provider", included: true },
      { text: "Phone & website visible on profile", included: true, highlight: true },
      { text: "Up to 3 facility locations", included: true },
      { text: "Email lead notifications", included: true },
      { text: "Lead management dashboard", included: true },
      { text: "Performance analytics & insights", included: true },
    ],
    limitations: [],
    cta: "Get Started",
    ctaVariant: "default" as const,
    popular: true,
    exclusivityBadge: "Shared Leads",
    exclusivityColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  {
    name: "Featured",
    price: "$1,099",
    period: "/mo",
    description: "Exclusive leads & maximum visibility",
    icon: Crown,
    gradient: "from-amber-500 to-yellow-500",
    features: [
      { text: "Everything in Professional, plus:", included: true, isHeader: true },
      { text: "100 exclusive leads/month", included: true, highlight: true },
      { text: "Never shared with other providers", included: true, highlight: true },
      { text: "Homepage featured placement", included: true },
      { text: "Priority search placement", included: true },
      { text: "Gold Featured badge", included: true },
      { text: "Up to 5 facility locations", included: true },
      { text: "Priority email support", included: true },
      { text: "Advanced analytics", included: true },
    ],
    limitations: [],
    cta: "Upgrade Now",
    ctaVariant: "default" as const,
    popular: false,
    exclusivityBadge: "100% Exclusive",
    exclusivityColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
];

// Feature type for pricing
type PricingFeature = {
  text: string;
  included: boolean;
  highlight?: boolean;
  isHeader?: boolean;
};

// Plan type
type PricingPlan = {
  name: string;
  price: string;
  period: string;
  description: string;
  icon: typeof Sparkles;
  gradient: string;
  features: PricingFeature[];
  limitations: string[];
  cta: string;
  ctaVariant: "default" | "outline";
  popular: boolean;
  exclusivityBadge: string;
  exclusivityColor: string;
};

// ROI Calculator Component
const ROICalculator = () => {
  const [leadsPerMonth, setLeadsPerMonth] = useState([15]);
  const [conversionRate, setConversionRate] = useState([20]);
  const [avgRevenuePerAdmission, setAvgRevenuePerAdmission] = useState([15000]);

  const monthlyAdmissions = Math.round((leadsPerMonth[0] * conversionRate[0]) / 100);
  const monthlyRevenue = monthlyAdmissions * avgRevenuePerAdmission[0];
  const annualRevenue = monthlyRevenue * 12;
  const planCost = leadsPerMonth[0] === 0 ? 0 : leadsPerMonth[0] <= 100 ? 399 : 1099;
  const planName = leadsPerMonth[0] === 0 ? "Basic (Free)" : leadsPerMonth[0] <= 100 ? "Professional" : "Featured";
  const roi = planCost > 0 && monthlyRevenue > 0 ? Math.round(((monthlyRevenue - planCost) / planCost) * 100) : monthlyRevenue > 0 ? Infinity : 0;

  return (
    <div className="mt-16 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
            <Calculator className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">ROI Calculator</h3>
          <p className="text-muted-foreground">See your potential return on investment</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-3">
                <label className="text-sm font-medium text-foreground">Leads per Month</label>
                <span className="text-sm font-bold text-primary">{leadsPerMonth[0]}</span>
              </div>
              <Slider
                value={leadsPerMonth}
                onValueChange={setLeadsPerMonth}
                min={1}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>1</span>
                <span>100</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-3">
                <label className="text-sm font-medium text-foreground">Conversion Rate</label>
                <span className="text-sm font-bold text-primary">{conversionRate[0]}%</span>
              </div>
              <Slider
                value={conversionRate}
                onValueChange={setConversionRate}
                min={5}
                max={50}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>5%</span>
                <span>50%</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-3">
                <label className="text-sm font-medium text-foreground">Avg Revenue per Admission</label>
                <span className="text-sm font-bold text-primary">${avgRevenuePerAdmission[0].toLocaleString()}</span>
              </div>
              <Slider
                value={avgRevenuePerAdmission}
                onValueChange={setAvgRevenuePerAdmission}
                min={5000}
                max={50000}
                step={1000}
                className="w-full"
              />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>$5K</span>
                <span>$50K</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <span className="text-muted-foreground">Monthly Admissions</span>
              <span className="text-xl font-bold text-foreground">{monthlyAdmissions}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <span className="text-muted-foreground">Monthly Revenue</span>
              <span className="text-xl font-bold text-foreground">${monthlyRevenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <span className="text-muted-foreground">Annual Revenue</span>
              <span className="text-xl font-bold text-accent">${annualRevenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-3 pt-4">
              <span className="text-foreground font-medium">Estimated ROI</span>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-accent" />
                <span className="text-2xl font-bold text-accent">
                  {roi === Infinity ? "∞" : roi > 0 ? `${roi}%` : "N/A"}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-2">
              Based on {planName} plan{planCost > 0 ? ` at $${planCost}/mo` : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Comparison Table Component
const ComparisonTable = () => {
  const [isOpen, setIsOpen] = useState(false);

  const featureCategories = [
    {
      category: "Lead Generation",
      features: [
        { feature: "Qualified Leads", basic: "—", professional: "100/month", featured: "100/month" },
        { feature: "Lead Exclusivity", basic: "—", professional: "Shared (max 2)", featured: "100% Exclusive" },
        { feature: "Email Lead Notifications", basic: false, professional: true, featured: true },
        { feature: "Lead Management Dashboard", basic: false, professional: true, featured: true },
      ],
    },
    {
      category: "Visibility & Placement",
      features: [
        { feature: "Listed in Search Results", basic: true, professional: true, featured: true },
        { feature: "Phone & Website Visible", basic: false, professional: true, featured: true },
        { feature: "Priority Search Placement", basic: false, professional: false, featured: true },
        { feature: "Homepage Featured Section", basic: false, professional: false, featured: true },
        { feature: "Gold Featured Badge", basic: false, professional: false, featured: true },
      ],
    },
    {
      category: "Tools & Analytics",
      features: [
        { feature: "Provider Dashboard", basic: true, professional: true, featured: true },
        { feature: "Views & Clicks Analytics", basic: true, professional: true, featured: true },
        { feature: "Performance Analytics", basic: false, professional: true, featured: true },
        { feature: "Advanced Analytics", basic: false, professional: false, featured: true },
      ],
    },
    {
      category: "Account & Support",
      features: [
        { feature: "Facility Locations", basic: "1", professional: "Up to 3", featured: "Up to 5" },
        { feature: "Standard Support", basic: true, professional: true, featured: true },
        { feature: "Priority Email Support", basic: false, professional: false, featured: true },
      ],
    },
  ];

  return (
    <div className="mt-12 max-w-5xl mx-auto">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-center gap-2 py-4 text-foreground hover:text-primary transition-colors group">
            <span className="text-lg font-semibold">View Complete Feature Comparison</span>
            <ChevronDown className={cn(
              "h-5 w-5 transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="overflow-x-auto pt-4 pb-2">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-4 px-4 text-foreground font-semibold w-[40%]">Feature</th>
                  <th className="text-center py-4 px-4 w-[20%]">
                    <div className="flex flex-col items-center gap-1">
                      <Sparkles className="h-5 w-5 text-slate-500" />
                      <span className="font-semibold text-foreground">Basic</span>
                      <span className="text-xs text-muted-foreground">Free</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 w-[20%] bg-emerald-500/5 border-x-2 border-emerald-500/20 rounded-t-xl">
                    <div className="flex flex-col items-center gap-1">
                      <Star className="h-5 w-5 text-emerald-500" />
                      <span className="font-semibold text-foreground">Professional</span>
                      <span className="text-xs text-emerald-600 font-medium">$399/mo</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 w-[20%]">
                    <div className="flex flex-col items-center gap-1">
                      <Crown className="h-5 w-5 text-amber-500" />
                      <span className="font-semibold text-foreground">Featured</span>
                      <span className="text-xs text-amber-600 font-medium">$1,099/mo</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {featureCategories.map((category, catIndex) => (
                  <>
                    <tr key={`cat-${catIndex}`} className="bg-muted/30">
                      <td colSpan={4} className="py-3 px-4 text-sm font-semibold text-foreground uppercase tracking-wide">
                        {category.category}
                      </td>
                    </tr>
                    {category.features.map((row, index) => (
                      <tr key={`${catIndex}-${index}`} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 text-foreground text-sm">{row.feature}</td>
                        <td className="text-center py-3.5 px-4">
                          {typeof row.basic === "boolean" ? (
                            row.basic ? (
                              <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                            )
                          ) : (
                            <span className="text-muted-foreground text-sm">{row.basic}</span>
                          )}
                        </td>
                        <td className="text-center py-3.5 px-4 bg-emerald-500/5 border-x-2 border-emerald-500/20">
                          {typeof row.professional === "boolean" ? (
                            row.professional ? (
                              <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                            )
                          ) : (
                            <span className="text-emerald-600 font-medium text-sm">{row.professional}</span>
                          )}
                        </td>
                        <td className="text-center py-3.5 px-4">
                          {typeof row.featured === "boolean" ? (
                            row.featured ? (
                              <CheckCircle className="h-5 w-5 text-amber-500 mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                            )
                          ) : (
                            <span className="text-amber-600 font-medium text-sm">{row.featured}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

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
            <div className="flex items-center justify-center gap-2.5 py-2.5 relative">
              <Sparkles className="h-4 w-4 shrink-0 animate-pulse" />
              <p className="text-sm font-medium text-center">
                <span className="font-bold">Limited Time:</span> Get 50% off your first 3 months
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
                Fill Your Beds With
                <span className="text-primary"> Qualified Admissions</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                Join the network trusted by 500+ treatment centers. Connect with families 
                actively seeking treatment—not tire kickers.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-8">
                <Link to="/provider-signup">
                  <Button size="lg" className="gap-2 h-12 px-8 text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all">
                    Start Free Trial
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

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit, index) => (
                <AnimatedCard key={benefit.title} delay={index * 75}>
                  <div className="group h-full rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-accent/30">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20">
                        <benefit.icon className="h-6 w-6 text-accent" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{benefit.stat}</div>
                        <div className="text-xs text-muted-foreground">{benefit.statLabel}</div>
                      </div>
                    </div>
                    <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
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
        <section className="section-padding bg-gradient-to-b from-muted/50 to-background">
          <div className="container">
            <div className="text-center mb-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <Clock className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Get Started in Minutes</span>
              </div>
              <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                Simple 3-Step Process
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Join our network quickly and start receiving qualified leads.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
              {[
                { 
                  step: 1, 
                  title: "Create Your Profile", 
                  description: "Sign up and add your facility details in about 10 minutes.",
                  icon: Building2,
                },
                { 
                  step: 2, 
                  title: "Get Verified", 
                  description: "Our team reviews your credentials within 24 hours.",
                  icon: BadgeCheck,
                },
                { 
                  step: 3, 
                  title: "Receive Leads", 
                  description: "Go live and families start finding you immediately.",
                  icon: MessageSquare,
                },
              ].map((item, index) => (
                <div
                  key={item.step}
                  className="relative rounded-xl border border-border bg-card p-8 shadow-sm text-center animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-accent/30" />
                  )}
                  
                  <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 text-xl font-bold text-accent-foreground shadow-md">
                    {item.step}
                  </div>
                  <div className="mb-4 mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link to="/provider-signup">
                <Button size="lg" className="gap-2 h-12 px-8 text-base font-semibold rounded-xl">
                  Get Started Now
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section with Dashboard Image */}
        <section className="section-padding">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-accent">Full Feature Set</span>
                </div>
                <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                  Everything You Need to Succeed
                </h2>
                <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
                  Our platform gives you the tools to showcase your facility, connect with families, and grow your admissions.
                </p>

                <ul className="space-y-3">
                  {listingFeatures.map((feature, index) => (
                    <li key={feature.text} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                      <div className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                        feature.highlight ? "bg-accent/15" : "bg-primary/10"
                      )}>
                        <Check className={cn(
                          "h-3.5 w-3.5",
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
                <div className="rounded-2xl overflow-hidden border border-border shadow-xl bg-card">
                  <img 
                    src={rehabFacilityHero} 
                    alt="Modern professional rehabilitation treatment center with serene landscaping" 
                    className="w-full h-auto"
                  />
                </div>
                
                {/* Floating badge */}
                <div className="absolute -bottom-4 -left-4 md:-left-6 rounded-xl bg-primary px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-3 text-primary-foreground">
                    <BarChart3 className="h-5 w-5 text-accent" />
                    <div>
                      <div className="text-sm font-bold">Real-Time Analytics</div>
                      <div className="text-xs opacity-80">Track every metric</div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -top-4 -right-4 rounded-xl bg-accent px-4 py-2 shadow-md animate-float">
                  <div className="flex items-center gap-2 text-accent-foreground">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-bold">Live Dashboard</span>
                  </div>
                </div>
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
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                See how our partners are transforming their admissions.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <AnimatedCard key={testimonial.author} delay={index * 100}>
                  <div className="h-full flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <Quote className="h-8 w-8 text-accent/30" />
                      <div className="text-right">
                        <div className="text-2xl font-bold text-accent">{testimonial.metric}</div>
                        <div className="text-xs text-muted-foreground">{testimonial.metricLabel}</div>
                      </div>
                    </div>
                    
                    <blockquote className="flex-1 text-foreground/90 leading-relaxed mb-4">
                      "{testimonial.quote}"
                    </blockquote>
                    
                    <div className="border-t border-border pt-4">
                      <p className="font-semibold text-foreground">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      <p className="text-sm text-primary font-medium mt-0.5">{testimonial.facility}, {testimonial.location}</p>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="section-padding">
          <div className="container">
            <div className="text-center mb-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <Star className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Simple Pricing</span>
              </div>
              <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-foreground">
                Plans That Scale With You
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-4">
                Start free and upgrade as you grow. No hidden fees.
              </p>
              
              {/* Exclusivity Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-5 py-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">No shared leads. No bidding. No race to call.</span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {pricingPlans.map((plan, index) => {
                const PlanIcon = plan.icon;
                return (
                  <AnimatedCard key={plan.name} delay={index * 100}>
                    <div className={cn(
                      "relative h-full flex flex-col rounded-2xl border p-8 transition-all",
                      plan.popular 
                        ? "border-emerald-500/50 bg-gradient-to-b from-emerald-500/5 to-background shadow-lg shadow-emerald-500/10 scale-[1.02]" 
                        : "border-border bg-card hover:border-border/80 hover:shadow-md"
                    )}>
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1 text-sm font-semibold text-white shadow-md">
                            <Sparkles className="h-3.5 w-3.5" />
                            Most Popular
                          </span>
                        </div>
                      )}
                      
                      {/* Plan Header */}
                      <div className="mb-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
                            plan.gradient
                          )}>
                            <PlanIcon className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="font-display text-xl font-bold text-foreground">{plan.name}</h3>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                          <span className="text-lg text-muted-foreground">{plan.period}</span>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm">{plan.description}</p>
                      </div>

                      {/* Exclusivity Badge */}
                      <div className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold mb-5 w-fit",
                        plan.exclusivityColor
                      )}>
                        <Shield className="h-3 w-3" />
                        {plan.exclusivityBadge}
                      </div>
                      
                      {/* Features */}
                      <ul className="flex-1 space-y-2.5 mb-6">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className={cn(
                            "flex items-start gap-2.5",
                            feature.isHeader && "mt-0 mb-1"
                          )}>
                            {feature.isHeader ? (
                              <span className="text-sm font-medium text-muted-foreground">{feature.text}</span>
                            ) : (
                              <>
                                <CheckCircle className={cn(
                                  "h-4.5 w-4.5 shrink-0 mt-0.5",
                                  feature.highlight ? "text-emerald-500" : "text-muted-foreground"
                                )} />
                                <span className={cn(
                                  "text-sm",
                                  feature.highlight ? "text-foreground font-medium" : "text-muted-foreground"
                                )}>{feature.text}</span>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>

                      {/* Limitations */}
                      {plan.limitations.length > 0 && (
                        <div className="mb-5 pt-4 border-t border-border/50">
                          {plan.limitations.map((limitation, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground/70 flex items-center gap-1.5 mb-1">
                              <X className="h-3 w-3" />
                              {limitation}
                            </p>
                          ))}
                        </div>
                      )}
                      
                      <Link to={plan.name === "Featured" ? "/contact" : "/provider-signup"}>
                        <Button 
                          variant={plan.ctaVariant} 
                          size="lg"
                          className={cn(
                            "w-full h-12 text-base font-semibold rounded-xl",
                            plan.popular && "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-0"
                          )}
                        >
                          {plan.cta}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </AnimatedCard>
                );
              })}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              All plans include 14-day free trial • No credit card required • Cancel anytime
            </p>

            {/* ROI Calculator */}
            <ROICalculator />

            {/* Collapsible Comparison Table */}
            <ComparisonTable />
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
                Everything you need to know about partnering with RehabLookup.
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                <AccordionItem value="exclusivity" className="border border-border rounded-xl px-6 bg-card shadow-sm">
                  <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline py-5">
                    Are leads really exclusive? How does that work?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    Yes, 100% exclusive for Featured providers. When a family submits a request for your facility, that lead is delivered only to you—never shared with competitors. Unlike other platforms that sell the same lead to 5-10 centers, we believe in quality over quantity. You get the full opportunity to connect without racing against others.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pricing" className="border border-border rounded-xl px-6 bg-card shadow-sm">
                  <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline py-5">
                    How does pricing work? Are there any hidden fees?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    Our pricing is straightforward with no hidden fees. The Basic plan is free forever with 1 lead (lifetime). Professional is $399/month for up to 100 leads (shared with max 2 providers), and Featured is $1,099/month for up to 100 exclusive leads plus premium placement. All paid plans include a 14-day free trial—no credit card required to start.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="setup" className="border border-border rounded-xl px-6 bg-card shadow-sm">
                  <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline py-5">
                    How long does it take to get started?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    Most providers complete their profile and go live in under 10 minutes. Simply create an account, fill in your facility details, add photos, and you're ready to receive leads. Our onboarding wizard guides you through each step, and our support team is available if you need help.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="quality" className="border border-border rounded-xl px-6 bg-card shadow-sm">
                  <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline py-5">
                    What kind of lead quality can I expect?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    Our leads are high-intent families actively seeking treatment—not cold prospects from purchased lists. Each lead includes verified contact information, insurance details, treatment preferences, and urgency level. We use quality scoring to help you prioritize, and our Professional and Featured plans include advanced filtering to match your ideal patient profile.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cancel" className="border border-border rounded-xl px-6 bg-card shadow-sm">
                  <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline py-5">
                    Can I cancel or change my plan anytime?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    Absolutely. There are no long-term contracts or cancellation fees. You can upgrade, downgrade, or cancel your plan at any time from your dashboard. Changes take effect at your next billing cycle. We're confident in our service and want you to stay because of results, not obligations.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="support" className="border border-border rounded-xl px-6 bg-card shadow-sm">
                  <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline py-5">
                    What kind of support do you offer?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    All plans include email support with same-day responses. Professional and Featured plans get priority support with faster response times. Featured partners also receive a dedicated account manager for strategic guidance. We're here to help you maximize your admissions and get the most from our platform.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="multiple" className="border border-border rounded-xl px-6 bg-card shadow-sm">
                  <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline py-5">
                    Can I list multiple facilities?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    Yes! The Basic plan includes 1 facility location, Professional supports up to 3 locations, and Featured allows up to 5 locations under one account. Each location gets its own profile, lead inbox, and analytics. Need more locations? Contact our sales team for enterprise solutions.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="text-center mt-10">
                <p className="text-muted-foreground mb-4">Still have questions?</p>
                <Link to="/contact">
                  <Button variant="outline" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Contact Our Team
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="section-padding bg-gradient-to-b from-primary/5 to-background">
          <div className="container">
            <div className="mx-auto max-w-2xl rounded-2xl border border-accent/20 bg-gradient-to-br from-primary via-primary to-primary/90 p-10 text-center shadow-xl">
              <div className="mb-4 inline-flex items-center justify-center h-14 w-14 rounded-full bg-white/10 backdrop-blur">
                <HeartHandshake className="h-7 w-7 text-accent" />
              </div>
              <h2 className="mb-4 font-display text-2xl md:text-3xl font-bold text-primary-foreground">
                Ready to Transform Your Admissions?
              </h2>
              <p className="mb-8 text-lg text-primary-foreground/80 max-w-lg mx-auto">
                Join 500+ treatment centers connecting with families who need their help.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/provider-signup">
                  <Button variant="hero-light" size="lg" className="gap-2 h-12 px-8 text-base font-semibold rounded-xl">
                    Start Free Trial
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="lg" className="gap-2 h-12 px-8 text-base font-semibold rounded-xl bg-transparent border-white/30 text-primary-foreground hover:bg-white/10">
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
